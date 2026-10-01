import { createContext, useContext } from 'react'
import type { BeatId } from './film'

/**
 * Блоки сцен могут попросить раскладку перейти к другой сцене.
 * В киношной раскладке переход — прокрутка
 * к стоянке сцены, в статической — к секции. Блоки разницы не знают.
 */
export type Landing = {
  jumpTo: (id: BeatId) => void
}

export const LandingContext = createContext<Landing>({
  jumpTo: () => {},
})

export const useLanding = () => useContext(LandingContext)

/**
 * Состояние сцены для её содержимого.
 *
 * active — камера стоит на этой сцене. near — сцена рядом: пора грузить её
 * картинки (слои всех сцен всё время лежат в окне, и ленивая загрузка
 * браузера тут не срабатывает).
 */
export type SceneProps = { active: boolean; near: boolean }
