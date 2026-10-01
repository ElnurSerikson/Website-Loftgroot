/**
 * Карта фильма для скролл-скраба.
 *
 * Фильм собран скриптом scripts/build-film.mjs из пяти роликов
 * (docs/video1.mp4 … video5.mp4) в полном разрешении: 1920×1080, 24 fps —
 * каждый кадр исходника, WebP q92. Остановки — границы роликов, скрипт
 * кладёт их на кадры с известными номерами. Кадр остановки — сам PNG
 * стоп-кадра, он резче видео; видео растворяется в него за треть секунды.
 *
 *   кадр   0    0с       foto1  терраса на закате, комплекс справа
 *   кадр 121    5.04с    foto2  гриль крупно, мясо, дым       ← video1
 *   кадр 242   10.08с    foto3  цех, сварка, сборка            ← video2
 *   кадр 363   15.13с    foto4  руки мастера, фасад из дерева  ← video3
 *   кадр 484   20.17с    foto5  команда у комплекса            ← video4
 *   кадр 605   25.21с    Foto6  ночь, подсветка, огонь, горы   ← video5
 *
 * Логика ТЗ: готовый комплекс → приближение к мангалу → завод → деталь →
 * люди → готовый продукт вечером.
 */

export type BeatId = 'hero' | 'product' | 'factory' | 'quality' | 'team' | 'contacts'

export type Beat = {
  id: BeatId
  /** Рабочее название сцены. */
  scene: string
  /** Кадр секвенции, на котором стоит сцена. */
  frame: number
}

export const FILM = {
  dir: '/film',
  prefix: 'f_',
  fps: 24,
  count: 606,
  width: 1920,
  height: 1080,
} as const

export const BEATS: Beat[] = [
  { id: 'hero', scene: 'Терраса на закате', frame: 0 },
  { id: 'product', scene: 'Гриль крупным планом', frame: 121 },
  { id: 'factory', scene: 'Цех, сварка и сборка', frame: 242 },
  { id: 'quality', scene: 'Руки мастера, фасад', frame: 363 },
  { id: 'team', scene: 'Команда у комплекса', frame: 484 },
  { id: 'contacts', scene: 'Ночь, подсветка, горы', frame: 605 },
]

/**
 * Порог киношной раскладки: 1200×640, как в Rulit и «Пёрышке». Ниже — лента
 * на стоп-кадрах: фильм в 1080p весит больше 100 МБ.
 *
 * Тот же запрос стоит на предзагрузке первого кадра в index.html.
 */
export const CINEMATIC_QUERY = '(min-width: 1200px) and (min-height: 640px)'

const frameName = (index: number) => `${FILM.prefix}${String(index).padStart(4, '0')}.webp`

/** Полный кадр 1920×1080. */
export const frameUrl = (index: number) => `${FILM.dir}/${frameName(index)}`

/** Тот же кадр в прокси 320×180: грузится первым и целиком. */
export const proxyUrl = (index: number) => `${FILM.dir}/lo/${frameName(index)}`

/** Момент фильма, на котором стоит сцена. */
export const beatTime = (beat: Beat) => beat.frame / FILM.fps

/** Кадры сцен — их грузим первыми. */
export const beatFrames = (): number[] => BEATS.map((beat) => beat.frame)

/* ---------------------------------------------------------------------------
   Раскладка прокрутки.
   Каждой сцене даётся «стоянка» — отрезок скролла, на котором кадр замер и
   читается текст. Между стоянками — пролёт, длина которого пропорциональна
   длительности перехода, чтобы камера летела с ровной скоростью.
   Первой сцене стоянка почти не нужна: скролл должен трогать камеру сразу.
--------------------------------------------------------------------------- */

/** Стоянка сцены: кадр стоит, текст читается. */
const DWELL_VH = 64
const HERO_DWELL_VH = 12

/**
 * Производство стоит дольше: этапы 01–04 проявляются по ходу стоянки, как
 * просит ТЗ, — каждому нужен свой отрезок колеса.
 */
const FACTORY_DWELL_VH = 110

/** Финал: кнопки и контакты должны стоять под курсором, а не ускользать. */
const FINAL_DWELL_VH = 80

/**
 * Сколько прокрутки приходится на секунду фильма.
 *
 * 28 vh/с — скорость камеры, проверенная на прошлых проектах: пролёт не
 * проскакивает от одного щелчка колеса и не тянется. При 24 fps это 1.17vh
 * на кадр. Пролёт из пяти секунд — 141vh.
 */
const TRANSITION_VH_PER_SEC = 28

/**
 * Когда текст сцены появляется и уходит — в секундах фильма, а не в долях
 * пролёта. Полторы секунды на появление: камера уже тормозит к кадру сцены
 * (замер стыков: последние полсекунды роликов почти стоят). Уходит текст
 * быстрее, за 1.2с, пока камера только трогается.
 */
const FADE_IN_SEC = 1.5
const FADE_OUT_SEC = 1.2

export type Segment = {
  kind: 'dwell' | 'transition'
  beatIndex?: number
  vh: number
  from: number
  to: number
  timeFrom: number
  timeTo: number
}

export type ScrollMap = {
  segments: Segment[]
  totalVh: number
  /** Доля прокрутки, на которой бит закреплён. */
  dwellCenters: number[]
}

export function buildScrollMap(): ScrollMap {
  const segments: Segment[] = []
  const last = BEATS.length - 1

  BEATS.forEach((beat, index) => {
    const at = beatTime(beat)
    segments.push({
      kind: 'dwell',
      beatIndex: index,
      vh:
        index === 0
          ? HERO_DWELL_VH
          : index === last
            ? FINAL_DWELL_VH
            : beat.id === 'factory'
              ? FACTORY_DWELL_VH
              : DWELL_VH,
      from: 0,
      to: 0,
      timeFrom: at,
      timeTo: at,
    })

    const next = BEATS[index + 1]
    if (next) {
      segments.push({
        kind: 'transition',
        vh: (beatTime(next) - at) * TRANSITION_VH_PER_SEC,
        from: 0,
        to: 0,
        timeFrom: at,
        timeTo: beatTime(next),
      })
    }
  })

  const totalVh = segments.reduce((sum, segment) => sum + segment.vh, 0)
  let acc = 0
  for (const segment of segments) {
    segment.from = acc / totalVh
    acc += segment.vh
    segment.to = acc / totalVh
  }

  const dwellCenters = segments
    .filter((segment) => segment.kind === 'dwell')
    .map((segment, index, list) =>
      // Первая сцена стоит в самом начале страницы, последняя — в самом
      // конце: переход к ним должен приводить на край, а не в середину
      // стоянки, иначе у главного экрана виден уже тронувшийся кадр.
      index === 0 ? 0 : index === list.length - 1 ? 1 : (segment.from + segment.to) / 2,
    )

  return { segments, totalVh, dwellCenters }
}

/** Момент фильма, который должен стоять на экране при данной прокрутке. */
export function timeAt(segments: Segment[], progress: number): number {
  const p = Math.min(Math.max(progress, 0), 1)
  const segment = segments.find((s) => p <= s.to) ?? segments[segments.length - 1]!
  if (segment.to === segment.from) return segment.timeFrom
  const local = (p - segment.from) / (segment.to - segment.from)
  return segment.timeFrom + (segment.timeTo - segment.timeFrom) * local
}

/** Прозрачность текстового слоя бита при данной прокрутке. */
export function beatOpacityAt(segments: Segment[], beatIndex: number, progress: number): number {
  const index = segments.findIndex((s) => s.kind === 'dwell' && s.beatIndex === beatIndex)
  const dwell = segments[index]
  if (!dwell) return 0
  const prev = segments[index - 1]
  const next = segments[index + 1]

  /** Отрезок прокрутки, соответствующий `seconds` фильма на пролёте, но не длиннее самого пролёта. */
  const span = (segment: Segment | undefined, seconds: number) => {
    if (!segment) return 0
    const length = segment.to - segment.from
    const duration = segment.timeTo - segment.timeFrom
    return duration > 0 ? length * Math.min(seconds / duration, 1) : 0
  }

  const fadeIn = span(prev, FADE_IN_SEC)
  const fadeOut = span(next, FADE_OUT_SEC)
  const inStart = dwell.from - fadeIn
  const outEnd = dwell.to + fadeOut

  if (progress < inStart || progress > outEnd) return 0
  if (progress < dwell.from) return fadeIn > 0 ? (progress - inStart) / fadeIn : 1
  if (progress <= dwell.to) return 1
  return fadeOut > 0 ? 1 - (progress - dwell.to) / fadeOut : 1
}

/** Ближайший по прокрутке бит — для подсветки пункта в навигации. */
export function activeBeatAt(dwellCenters: number[], progress: number): number {
  let best = 0
  let bestDistance = Infinity
  dwellCenters.forEach((center, index) => {
    const distance = Math.abs(progress - center)
    if (distance < bestDistance) {
      bestDistance = distance
      best = index
    }
  })
  return best
}

/**
 * Где человек внутри стоянки сцены: 0 — камера только встала, 1 — сейчас
 * тронется. По ней этапы производства загораются по одному.
 */
export function dwellProgressAt(segments: Segment[], beatIndex: number, progress: number): number {
  const dwell = segments.find((s) => s.kind === 'dwell' && s.beatIndex === beatIndex)
  if (!dwell || dwell.to === dwell.from) return progress >= (dwell?.to ?? 0) ? 1 : 0
  return Math.min(Math.max((progress - dwell.from) / (dwell.to - dwell.from), 0), 1)
}
