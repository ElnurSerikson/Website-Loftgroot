import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Header } from '@/components/Header'
import { Intro } from '@/components/Intro'
import { useSectionScroll } from '@/lib/useSectionScroll'
import { ChapterRail } from './ChapterRail'
import { FilmBackdrop, type Film } from './FilmBackdrop'
import { BEATS, activeBeatAt, beatOpacityAt, buildScrollMap, dwellProgressAt, timeAt, type BeatId } from './film'
import { LandingContext, type Landing } from './LandingContext'
import { SCENES, columnRoom, columnStyle } from './scenes'
import { VIGNETTE, scrimLayers, scrimSide } from './scrim'

/**
 * Насколько камера отстаёт от скролла, миллисекунды. Колесо двигает
 * страницу рывками по сотне пикселей; камера идёт за сглаженной позицией, и
 * рывок читается как инерция. Больше 150мс — картинка плетётся за страницей.
 */
const SCRUB_TAU = 110

/** Доля прокрутки, после которой шапка становится сплошной. */
const HEADER_SOLID_AT = 0.012

/** Место снизу под «Scroll to discover» и подвал: колонка в них не заезжает. */
const BOTTOM_RESERVE = 56

/**
 * Камера в «camera push»: на стоянке кадр едва заметно наезжает, а не стоит
 * мёртво. 2.5% за всю стоянку — ощущается, но не мылит кадр.
 */
const PUSH_SCALE = 0.025

/**
 * Киношный лендинг: фильм на весь экран — единственный фон, прокрутка ведёт
 * камеру по шести сценам ТЗ, текст каждой сцены всплывает на своей
 * остановке. Тайминги — в film.ts, раскладка сцен — в scenes.tsx,
 * содержимое — в blocks.tsx.
 *
 * Монтируется от 1200×640 (CINEMATIC_QUERY в film.ts), остальное берёт
 * StaticLanding.
 */
export function CinematicLanding() {
  const filmRef = useRef<Film>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const beatRefs = useRef<Array<HTMLElement | null>>([])
  const columnRefs = useRef(new Map<string, HTMLDivElement>())
  const [activeBeat, setActiveBeat] = useState(0)
  const [solidHeader, setSolidHeader] = useState(false)
  const [reach, setReach] = useState(0)
  /** Сколько фильма уже можно показать — для заставки. Квантуется по 2%. */
  const [loaded, setLoaded] = useState(0)

  const scrollMap = useMemo(() => buildScrollMap(), [])

  const getStops = useCallback(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    return scrollMap.dwellCenters.map((position) => position * max)
  }, [scrollMap])
  const { jumpTo: jumpToBeat, animating } = useSectionScroll(getStops)

  const landing = useMemo<Landing>(
    () => ({
      jumpTo: (id: BeatId) => jumpToBeat(SCENES.findIndex((scene) => scene.id === id)),
    }),
    [jumpToBeat],
  )

  const onFilmProgress = useCallback((fraction: number) => {
    setLoaded((previous) => {
      const next = Math.floor(fraction * 50) / 50
      return next > previous ? next : previous
    })
  }, [])

  /**
   * Колонка вписывается в кадр по высоте: на низких окнах (1366×768 с
   * панелями браузера) плотная сцена целиком уменьшается к своей опорной
   * точке ровно настолько, чтобы встать между шапкой и кромкой.
   */
  useEffect(() => {
    const fit = () => {
      const viewportHeight = window.innerHeight
      SCENES.forEach((scene) => {
        const reserve = scene.columns.some((c) => c.full) ? BOTTOM_RESERVE : 0
        scene.columns.forEach((column, ci) => {
          const el = columnRefs.current.get(`${scene.id}:${ci}`)
          if (!el || column.full) return
          const room = columnRoom(column, viewportHeight, reserve)
          const scale = el.offsetHeight > room ? Math.max(room / el.offsetHeight, 0.62) : 1
          el.style.scale = scale === 1 ? '' : scale.toFixed(4)
        })
      })
    }

    const observer = new ResizeObserver(fit)
    columnRefs.current.forEach((el) => observer.observe(el))
    window.addEventListener('resize', fit)
    void document.fonts.ready.then(fit)
    fit()

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [])

  useEffect(() => {
    const { segments, dwellCenters } = scrollMap
    let frame = 0
    let lastActive = -1
    let lastSolid = false
    let lastReach = 0
    let shown = -1
    let lastTick = 0

    /** Скраб — не анимация, а вот инерция, наезд и подъём слоёв — украшения. */
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const target = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      return max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0
    }

    const render = (progress: number) => {
      filmRef.current?.setTime(timeAt(segments, progress))

      let push = 0
      BEATS.forEach((_, index) => {
        const el = beatRefs.current[index]
        if (!el) return
        const opacity = beatOpacityAt(segments, index, progress)
        const dwell = dwellProgressAt(segments, index, progress)
        const direction = progress < (dwellCenters[index] ?? 0) ? 1 : -1
        const rise = reduced ? 0 : (1 - opacity) * 26 * direction
        el.style.opacity = opacity.toFixed(3)
        el.style.transform = `translate3d(0, ${rise.toFixed(1)}px, 0)`
        el.style.visibility = opacity <= 0.001 ? 'hidden' : 'visible'
        el.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none'
        el.style.setProperty('--p', dwell.toFixed(3))
        el.classList.toggle('is-in', opacity > 0.55)
        // Наезд камеры только внутри стоянки: на пролёте едет сам фильм.
        if (dwell > 0 && dwell < 1) push = Math.sin(dwell * Math.PI) * PUSH_SCALE
      })

      const wrap = canvasWrapRef.current
      if (wrap && !reduced) wrap.style.transform = `scale(${(1 + push).toFixed(4)})`

      const active = activeBeatAt(dwellCenters, progress)
      if (active !== lastActive) {
        lastActive = active
        setActiveBeat(active)
      }

      const solid = progress > HEADER_SOLID_AT
      if (solid !== lastSolid) {
        lastSolid = solid
        setSolidHeader(solid)
      }

      const wantReach = solid ? Math.min(active + 1, BEATS.length - 1) : 0
      if (wantReach > lastReach) {
        lastReach = wantReach
        setReach(wantReach)
      }
    }

    const tick = (now: number) => {
      const wanted = target()
      const dt = lastTick ? Math.min(now - lastTick, 120) : 16
      lastTick = now

      if (shown < 0 || reduced || animating.current) {
        shown = wanted
      } else {
        // Сглаживание от прошедшего времени: на 60 и 120 Гц одинаково.
        shown += (wanted - shown) * (1 - Math.exp(-dt / SCRUB_TAU))
        if (Math.abs(wanted - shown) < 0.00002) shown = wanted
      }

      render(shown)
      frame = requestAnimationFrame(tick)
    }

    /** Подстраховка, когда rAF придушен системой: ставим позицию как есть. */
    const onScroll = () => {
      if (performance.now() - lastTick < 250) return
      shown = target()
      render(shown)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    frame = requestAnimationFrame(tick)
    render(target())

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [scrollMap, animating])

  return (
    <LandingContext.Provider value={landing}>
      <div id="top" className="cinematic relative" style={{ height: `${scrollMap.totalVh}vh` }}>
        <div className="fixed inset-0 overflow-hidden bg-graphite-void">
          <div ref={canvasWrapRef} className="h-full w-full will-change-transform">
            <FilmBackdrop ref={filmRef} onProgress={onFilmProgress} className="h-full w-full object-cover" />
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: VIGNETTE }} />
          <div aria-hidden="true" className="film-grain" />
        </div>

        <main className="fixed inset-0 z-10">
          {SCENES.map((scene, index) => (
            <section
              key={scene.id}
              id={scene.id}
              aria-label={scene.chapter}
              ref={(el) => {
                beatRefs.current[index] = el
              }}
              className="absolute inset-0 overflow-hidden will-change-[opacity,transform]"
              style={
                {
                  opacity: 0,
                  visibility: 'hidden',
                  pointerEvents: 'none',
                  // Откуда приезжают блоки: со стороны своей колонки.
                  '--rx': { left: '-22px', right: '22px', top: '0px', bottom: '0px' }[scrimSide(scene.scrim)],
                } as React.CSSProperties
              }
            >
              {scrimLayers(scene.scrim).map((image, li) => (
                <div key={li} aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: image }} />
              ))}

              {scene.columns.map((column, ci) => (
                <div
                  key={ci}
                  ref={(el) => {
                    if (el) columnRefs.current.set(`${scene.id}:${ci}`, el)
                    else columnRefs.current.delete(`${scene.id}:${ci}`)
                  }}
                  className="reveal-group absolute"
                  style={column.full ? ({ ...columnStyle(column), '--rx': '0px' } as React.CSSProperties) : columnStyle(column)}
                >
                  <column.Content active={activeBeat === index} near={index <= reach} />
                </div>
              ))}
            </section>
          ))}
        </main>
      </div>

      <ChapterRail active={activeBeat} onJump={jumpToBeat} />

      <Header
        solid={solidHeader}
        compact={false}
        activeBeat={activeBeat}
        onJump={jumpToBeat}
      />

      <Intro loaded={loaded} />
    </LandingContext.Provider>
  )
}
