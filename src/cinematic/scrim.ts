/**
 * Слой читаемости между кадром и текстом.
 *
 * Стеклянных плашек под абзацами нет: кадры — главное, что есть на сайте.
 * Читаемость держит вуаль — ровное плато плотности по ширине колонки и
 * мягкий сход после неё — плюс двухслойная тень под буквами (theme.css).
 *
 * Цвет — не нейтральный чёрный, а тёплый графит: все шесть кадров сняты в
 * янтарном свете заката, ламп цеха и подсветки комплекса. Синеватая или
 * холодная чёрная вуаль рядом с ним читалась бы грязью, тёплая уходит в те
 * же тени, что на картинке, — металл и обугленное дерево.
 *
 * Плотности подобраны под самые светлые места под колонкой: закатное небо
 * (1, 2, 6), окна цеха с горами (3, 5) и солнце в окне (4).
 */

export type Scrim = {
  /** С какой стороны кадра лежит текст — оттуда и идёт вуаль. */
  side: 'left' | 'right' | 'top' | 'bottom'
  /** Плотность плато. */
  strength?: number
  /** Докуда держится ровная плотность, % ширины (или высоты для top и bottom). */
  hold?: number
  /** Где вуаль сходит в ноль, %. */
  reach?: number
}

/** Графит: тени металла на кадрах. */
const GRAPHITE = '12,10,8'
const GRAPHITE_DEEP = '7,6,5'

/** Одна вуаль или несколько — например, сбоку под колонку и снизу под подвал. */
export type SceneScrim = Scrim | readonly Scrim[]

/** Сторона, откуда приезжают блоки сцены: по первой вуали. */
export function scrimSide(scrim: SceneScrim): Scrim['side'] {
  return (Array.isArray(scrim) ? scrim[0] : (scrim as Scrim))?.side ?? 'bottom'
}

export function scrimLayers(scrim: SceneScrim): string[] {
  return (Array.isArray(scrim) ? scrim : [scrim as Scrim]).map(layerOf)
}

function layerOf(scrim: Scrim): string {
  const s = scrim.strength ?? 0.5
  const hold = scrim.hold ?? 44
  const reach = scrim.reach ?? 68
  /** Промежуточный стоп: без него сход от плато к нулю идёт полосой. */
  const mid = hold + (reach - hold) * 0.45

  const angle = { left: '90deg', right: '270deg', top: '180deg', bottom: '0deg' }[scrim.side]

  return (
    `linear-gradient(${angle}, ` +
    `rgba(${GRAPHITE},${s}) 0%, ` +
    `rgba(${GRAPHITE},${s}) ${hold}%, ` +
    `rgba(${GRAPHITE},${(s * 0.5).toFixed(3)}) ${mid.toFixed(1)}%, ` +
    `rgba(${GRAPHITE},0) ${reach}%)`
  )
}

/**
 * Вуаль под шапкой. Логотип и навигация стоят на кадре с первого пикселя, а
 * под ними закатное небо и лампы цеха.
 */
export const HEADER_SCRIM = `linear-gradient(180deg, rgba(${GRAPHITE_DEEP},.66) 0%, rgba(${GRAPHITE_DEEP},.28) 55%, rgba(${GRAPHITE_DEEP},0) 100%)`

/**
 * Кинематографическая виньетка поверх всего фильма: края кадра темнее
 * центра, как у объектива. Держит шапку и ленту глав на любом кадре.
 */
export const VIGNETTE = `radial-gradient(120% 90% at 50% 45%, rgba(${GRAPHITE_DEEP},0) 55%, rgba(${GRAPHITE_DEEP},.42) 100%)`
