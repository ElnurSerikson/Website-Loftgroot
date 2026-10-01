import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { FILM, beatFrames, frameUrl, proxyUrl } from './film'

/** Фон получает момент фильма и сам решает, какой кадр показать. */
export type Film = { setTime: (seconds: number) => void }

type Props = {
  className?: string
  /**
   * Сколько фильма уже можно показать, 0–1: первый чёткий кадр и прокси на
   * весь фильм. По нему заставка «розжиг» понимает, что камера готова ехать.
   */
  onProgress?: (fraction: number) => void
}

/** Сколько кадров тянем из сети одновременно. */
const CONCURRENCY = 12
/** На сколько кадров вокруг искать прокси, если нужный ещё не пришёл. */
const NEAREST_RADIUS = 60

/**
 * Окно распакованных кадров — механизм «Пёрышка» и Light Engineering.
 *
 * Кадр 1080p в WebP распаковывается около 15мс. Если отдать канвасу
 * картинку как есть, распаковка случается внутри drawImage — на главном
 * потоке, почти на каждом тике пролёта, и камера с текстом идут рывками.
 *
 * Замеры на M1 в Chrome (из «Пёрышка», тот же размер кадра):
 *
 *   drawImage(<img>) свежего кадра                  15.7мс на главном потоке
 *   drawImage(<img>) после img.decode()             16.1мс — канвас этот кэш
 *                                                    не использует
 *   createImageBitmap(<img>)                        13мс, и тоже на главном
 *                                                    потоке
 *   createImageBitmap(Blob)                         вне главного потока;
 *                                                    24 кадра параллельно — 68мс
 *   drawImage(ImageBitmap)                          1–5мс
 *
 * Поэтому чёткие кадры грузятся не картинками, а байтами (Blob), и кадры
 * вокруг камеры распаковываются из них заранее, в фоне: WARM_AHEAD вперёд
 * по ходу прокрутки (1с фильма, около 28vh) и WARM_BEHIND назад на случай
 * разворота. Распакованный кадр — 8 МБ памяти, поэтому окно ограничено
 * MAX_BITMAPS, а дальние битмапы закрываются.
 */
const WARM_AHEAD = 24
const WARM_BEHIND = 8
const MAX_BITMAPS = 40
const BITMAP_CONCURRENCY = 4

type Proxies = Array<HTMLImageElement | undefined>

const order = (extra?: (push: (i: number) => void) => void): number[] => {
  const seen = new Set<number>()
  const list: number[] = []
  const push = (i: number) => {
    if (i >= 0 && i < FILM.count && !seen.has(i)) {
      seen.add(i)
      list.push(i)
    }
  }
  // Сначала остановки: смысловые кадры должны стать резкими раньше всего.
  beatFrames().forEach(push)
  extra?.(push)
  for (let i = 0; i < FILM.count; i += 1) push(i)
  return list
}

/** Прокси: остановки, потом весь фильм подряд — дыр остаться не должно. */
const proxyOrder = () => order()

/** Чёткие: остановки, потом каждый шестой, потом всё остальное. */
const sharpOrder = () =>
  order((push) => {
    for (let i = 0; i < FILM.count; i += 6) push(i)
  })

const readyProxy = (store: Proxies, i: number) => {
  const img = store[i]
  return img && img.complete && img.naturalWidth > 0 ? img : undefined
}

/**
 * Фильм как секвенция кадров на канвасе. Позиция прокрутки отображается
 * прямо в картинку; живой <video> тут не годится — его seek асинхронный и
 * залипает ровно в тот момент, когда человек крутит колесо.
 *
 * Три слоя кадров. Прокси 320×180 на весь фильм грузится первым — после
 * него камера едет из конца в конец сразу. Чёткие 1920×1080 приходят
 * следом байтами, а кадры рядом с камерой распакованы заранее и рисуются
 * мгновенно (см. WARM_AHEAD). Пока чёткий кадр не распакован, стоит
 * распакованный сосед в кадр-два или прокси — и чёткий встаёт следом.
 *
 * Компонент не монтируется в статической раскладке: телефон не качает из
 * секвенции ни байта.
 */
export const FilmBackdrop = forwardRef<Film, Props>(function FilmBackdrop({ className, onProgress }, ref) {
  const progressRef = useRef(onProgress)
  progressRef.current = onProgress
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const proxy = useRef<Proxies>([])
  const blobs = useRef<Array<Blob | undefined>>([])
  const bitmaps = useRef(new Map<number, ImageBitmap>())
  const decoding = useRef(new Set<number>())
  /** Номер запуска эффекта: колбэки прошлого запуска (StrictMode) не пишут в новый. */
  const generation = useRef(0)
  /** Что уже нарисовано: источник и номер кадра. */
  const drawn = useRef('')
  const wanted = useRef(0)
  /** Куда едет камера: +1 вперёд, −1 назад. От него зависит, что распаковывать. */
  const direction = useRef(1)

  const paint = (source: CanvasImageSource, key: string) => {
    if (key === drawn.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const context = contextRef.current ?? canvas.getContext('2d', { alpha: false })
    if (!context) return
    contextRef.current = context
    // Прокси растягивается вшестеро: без хорошей интерполяции он идёт
    // ступеньками, с ней читается как мягкий кадр не в фокусе.
    context.imageSmoothingQuality = 'high'
    context.drawImage(source, 0, 0, canvas.width, canvas.height)
    drawn.current = key
  }

  const draw = () => {
    const target = wanted.current
    const map = bitmaps.current

    // 1. Точный кадр, уже распакованный.
    const exact = map.get(target)
    if (exact) return paint(exact, `bmp:${target}`)

    // 2. Распакованный сосед в кадр-два: на ходу разница не видна.
    for (let r = 1; r <= 2; r++) {
      for (const i of [target + r * direction.current, target - r * direction.current]) {
        const near = map.get(i)
        if (near) return paint(near, `bmp:${i}`)
      }
    }

    // 3. Прокси этого кадра, затем ближайший прокси.
    for (let r = 0; r <= NEAREST_RADIUS; r++) {
      for (const i of r === 0 ? [target] : [target - r, target + r]) {
        const lo = readyProxy(proxy.current, i)
        if (lo) return paint(lo, `lo:${i}`)
      }
    }

    // 4. Прокси ещё нет (самые первые мгновения): любой распакованный кадр.
    let nearest = -1
    for (const i of map.keys()) {
      if (nearest < 0 || Math.abs(i - target) < Math.abs(nearest - target)) nearest = i
    }
    const fallback = map.get(nearest)
    if (fallback) paint(fallback, `bmp:${nearest}`)
  }

  /** Закрыть дальние битмапы, если окно переполнено. Позади — дешевле. */
  const evict = () => {
    const map = bitmaps.current
    if (map.size <= MAX_BITMAPS) return
    const target = wanted.current
    const cost = (i: number) => {
      const ahead = (i - target) * direction.current
      return ahead >= 0 ? ahead : -ahead * 3
    }
    const byCost = [...map.keys()].sort((a, b) => cost(b) - cost(a))
    for (const i of byCost) {
      if (map.size <= MAX_BITMAPS) break
      map.get(i)?.close()
      map.delete(i)
    }
  }

  /** Распаковать кадры окна вокруг камеры, ближние первыми. */
  const warm = () => {
    if (typeof createImageBitmap !== 'function') return
    const target = wanted.current
    const run = generation.current
    const queue = [target]
    for (let k = 1; k <= WARM_AHEAD; k++) {
      queue.push(target + k * direction.current)
      if (k <= WARM_BEHIND) queue.push(target - k * direction.current)
    }

    for (const i of queue) {
      if (decoding.current.size >= BITMAP_CONCURRENCY) return
      if (i < 0 || i >= FILM.count || bitmaps.current.has(i) || decoding.current.has(i)) continue
      const blob = blobs.current[i]
      if (!blob) continue
      decoding.current.add(i)
      createImageBitmap(blob)
        .then((bitmap) => {
          decoding.current.delete(i)
          if (run !== generation.current) return bitmap.close()
          bitmaps.current.set(i, bitmap)
          evict()
          if (Math.abs(i - wanted.current) <= 2) draw()
          warm()
        })
        .catch(() => {
          decoding.current.delete(i)
        })
    }
  }

  useImperativeHandle(ref, () => ({
    setTime(seconds) {
      const next = Math.min(Math.max(Math.round(seconds * FILM.fps), 0), FILM.count - 1)
      if (next !== wanted.current) direction.current = next > wanted.current ? 1 : -1
      wanted.current = next
      draw()
      warm()
    },
  }))

  useEffect(() => {
    const run = ++generation.current
    proxy.current = new Array(FILM.count)
    blobs.current = new Array(FILM.count)
    drawn.current = ''
    const cancelled = () => run !== generation.current

    /** Очередь с ограничением одновременных запросов. */
    const pumpQueue = (queue: number[], start: (index: number, settle: () => void) => boolean) =>
      new Promise<void>((resolve) => {
        let cursor = 0
        let inFlight = 0
        const pump = () => {
          if (cancelled()) return resolve()
          while (inFlight < CONCURRENCY && cursor < queue.length) {
            const index = queue[cursor++]!
            let settled = false
            const settle = () => {
              if (settled) return
              settled = true
              inFlight--
              pump()
            }
            if (start(index, settle)) inFlight++
          }
          if (cursor >= queue.length && inFlight === 0) resolve()
        }
        pump()
      })

    /** Первый кадр — 15%, прокси на весь фильм — остальное. */
    let firstReady = false
    let proxiesReady = 0
    const report = () => progressRef.current?.((firstReady ? 0.15 : 0) + (0.85 * proxiesReady) / FILM.count)

    const loadProxies = () =>
      pumpQueue(proxyOrder(), (index, settle) => {
        if (proxy.current[index]) return false
        const img = new Image()
        img.decoding = 'async'
        img.setAttribute('fetchpriority', 'high')
        proxy.current[index] = img
        const finish = () => {
          if (!cancelled()) {
            proxiesReady++
            report()
            draw()
          }
          settle()
        }
        img.onload = finish
        img.onerror = () => {
          proxy.current[index] = undefined
          finish()
        }
        img.src = proxyUrl(index)
        return true
      })

    const loadSharp = (queue: number[], priority: RequestPriority) =>
      pumpQueue(queue, (index, settle) => {
        if (blobs.current[index]) return false
        fetch(frameUrl(index), { priority })
          .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(`${response.status}`))))
          .then((blob) => {
            if (cancelled()) return
            blobs.current[index] = blob
            // Пришёл кадр из окна камеры — его можно распаковывать.
            if (Math.abs(index - wanted.current) <= WARM_AHEAD) warm()
          })
          .catch(() => {
            /* кадр не пришёл — останется прокси */
          })
          .finally(settle)
        return true
      })

    void (async () => {
      // Первый кадр — чёткий и сразу: он прогрет предзагрузкой в index.html.
      await loadSharp([0], 'high')
      if (cancelled()) return
      firstReady = true
      report()
      await loadProxies()
      if (!cancelled()) await loadSharp(sharpOrder(), 'low')
    })()

    const map = bitmaps.current
    const pending = decoding.current
    return () => {
      generation.current++
      proxy.current = []
      blobs.current = []
      for (const bitmap of map.values()) bitmap.close()
      map.clear()
      pending.clear()
    }
  }, [])

  return <canvas ref={canvasRef} width={FILM.width} height={FILM.height} aria-hidden="true" className={className} />
})
