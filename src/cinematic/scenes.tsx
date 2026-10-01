import type { ComponentType } from 'react'
import { FRAME_MARGIN, HEADER_H } from '@/lib/layout'
import type { BeatId } from './film'
import type { SceneProps } from './LandingContext'
import type { SceneScrim } from './scrim'
import {
  ContactsBlock,
  FactoryBlock,
  HeroText,
  LegalBar,
  ProductBlock,
  QualityBlock,
  ScrollCue,
  TeamBlock,
} from './blocks'

/**
 * Шесть сцен: где на кадре стоит текст и откуда идёт вуаль.
 *
 * Координаты — проценты от окна. Кадр идёт через object-cover и заполняет
 * окно целиком, поэтому проценты окна и проценты видимой части кадра — одно
 * и то же.
 *
 * Свободные зоны сняты со стоп-кадров (docs/foto1–Foto6):
 *
 *   1  терраса          x 4–46%    комплекс справа (x 47–100%), слева размытый
 *                                  город, горы и небо — зона под текст по ТЗ
 *   2  гриль крупно     x 4–42%    гриль и дым справа (x 50–95%), слева закат
 *                                  и мойка в расфокусе
 *   3  цех              x 62–96%   сварщик слева, мастера по центру, справа
 *                                  окна цеха с горами в расфокусе
 *   4  руки мастера     x 4–42%    руки и фасад справа (x 45–100%), слева
 *                                  цех в расфокусе и окно с солнцем
 *   5  команда          x 66–95%   команда слева и по центру, справа по ТЗ
 *                                  «слегка размытая зона»: окно и горы
 *   6  ночь             x 4–40%    комплекс с подсветкой справа (x 36–100%),
 *                                  слева огни города и размытая зелень
 */

export type SceneColumn = {
  left?: string
  right?: string
  /** Отступ сверху или снизу. Без них колонка встаёт по центру кадра. */
  top?: string
  bottom?: string
  width: string
  /** Пиксели или CSS-выражение. */
  maxWidth?: number | string
  /** Полоса во всю ширину — сбоку не заезжает, движение только вверх. */
  full?: boolean
  /** Только для фильма: в ленте узких экранов колонки нет. */
  cineOnly?: boolean
  Content: ComponentType<SceneProps>
}

export type Scene = {
  id: BeatId
  /** Название главы в ленте сцен справа. */
  chapter: string
  scrim: SceneScrim
  /** Стоп-кадр: public/stills/s_<n>.webp. */
  still: number
  /** Точка фокуса баннера, когда кадр обрезается под узкий экран. */
  focus: string
  columns: SceneColumn[]
}

/** Поле от края кадра до текста. */
const EDGE = '5.5%'

export const SCENES: Scene[] = [
  {
    id: 'hero',
    chapter: 'Терраса',
    still: 1,
    focus: '72% 60%',
    // Под колонкой закатное небо и огни города — самое светлое место кадра
    // на уровне заголовка. Колонка шире остальных: в неё встаёт LOFTGROOT.
    scrim: { side: 'left', strength: 0.6, hold: 38, reach: 62 },
    columns: [
      { left: EDGE, width: '46%', maxWidth: 820, Content: HeroText },
      { full: true, bottom: '3.2%', width: '100%', cineOnly: true, Content: ScrollCue },
    ],
  },
  {
    id: 'product',
    chapter: 'Продукт',
    still: 2,
    focus: '68% 60%',
    // Слева солнце над горами: белое пятно ровно над заголовком. Вуаль
    // плотнее, чем у первого экрана, и сходит раньше гриля.
    scrim: { side: 'left', strength: 0.68, hold: 38, reach: 60 },
    columns: [{ left: EDGE, width: '38%', maxWidth: 660, Content: ProductBlock }],
  },
  {
    id: 'factory',
    chapter: 'Производство',
    still: 3,
    focus: '40% 55%',
    // Справа окна цеха с закатом — светлее всего на кадре. Сварщик и
    // вывеска LOFTGROOT ALMATY слева остаются открытыми.
    scrim: { side: 'right', strength: 0.74, hold: 36, reach: 58 },
    columns: [{ right: EDGE, width: '34%', maxWidth: 600, Content: FactoryBlock }],
  },
  {
    id: 'quality',
    chapter: 'Качество',
    still: 4,
    focus: '70% 50%',
    // Слева цех в расфокусе и окно с солнцем в верхнем углу.
    scrim: { side: 'left', strength: 0.66, hold: 38, reach: 58 },
    columns: [{ left: EDGE, width: '38%', maxWidth: 640, Content: QualityBlock }],
  },
  {
    id: 'team',
    chapter: 'Команда',
    still: 5,
    focus: '34% 55%',
    // Справа окно с горами и размытый передний план — зона под текст по ТЗ.
    // Мастер у правого края комплекса (x 52–65%) остаётся открытым: колонка
    // с 66.5%, заголовок мельче, чем у остальных сцен.
    scrim: { side: 'right', strength: 0.72, hold: 32, reach: 52 },
    columns: [{ right: '4.5%', width: '29%', maxWidth: 540, Content: TeamBlock }],
  },
  {
    id: 'contacts',
    chapter: 'Финал',
    still: 6,
    focus: '68% 55%',
    // Финал: самый атмосферный кадр — комплекс с подсветкой, огонь, горы.
    // Слева огни города и размытая зелень; снизу подвал.
    scrim: [
      { side: 'left', strength: 0.66, hold: 38, reach: 60 },
      { side: 'bottom', strength: 0.5, hold: 4, reach: 16 },
    ],
    columns: [
      { left: EDGE, width: '38%', maxWidth: 640, Content: ContactsBlock },
      { full: true, bottom: '2%', width: '100%', Content: LegalBar },
    ],
  },
]

/** Место колонки на экране. */
export function columnStyle(column: SceneColumn): React.CSSProperties {
  if (column.full) {
    return { left: 0, right: 0, bottom: column.bottom ?? 0, width: '100%' }
  }

  const horizontal: React.CSSProperties = {
    ...(column.left === undefined ? {} : { left: column.left }),
    ...(column.right === undefined ? {} : { right: column.right }),
  }

  // Центр — середина того, что под шапкой, а не всего окна: шапка стоит на
  // кадре всегда, и колонка по центру окна казалась бы прижатой к ней.
  const vertical: React.CSSProperties =
    column.top !== undefined
      ? { top: column.top }
      : column.bottom !== undefined
        ? { bottom: column.bottom }
        : { top: `calc(50% + ${HEADER_H.wide / 2}px)`, translate: '0 -50%' }

  // Точка, к которой колонка сжимается, если не влезает по высоте.
  const originX = column.right !== undefined ? 'right' : 'left'
  const originY = column.top !== undefined ? 'top' : column.bottom !== undefined ? 'bottom' : 'center'

  return {
    ...horizontal,
    ...vertical,
    width: column.width,
    transformOrigin: `${originX} ${originY}`,
    ...(column.maxWidth === undefined ? {} : { maxWidth: column.maxWidth }),
  }
}

/**
 * Сколько высоты окна колонке можно занять, пикселей: от шапки до нижней
 * кромки с зазором. Первому экрану снизу нужно ещё место под «Scroll to
 * discover», финалу — под подвал.
 */
export function columnRoom(column: SceneColumn, viewportHeight: number, reserveBottom = 0): number {
  const offset = (value: string) =>
    value.endsWith('%') ? (parseFloat(value) / 100) * viewportHeight : parseFloat(value)

  if (column.top !== undefined) return viewportHeight - offset(column.top) - FRAME_MARGIN - reserveBottom
  if (column.bottom !== undefined) {
    return viewportHeight - offset(column.bottom) - HEADER_H.wide - FRAME_MARGIN
  }
  return viewportHeight - HEADER_H.wide - FRAME_MARGIN * 2 - reserveBottom * 2
}
