import { useCallback, useEffect, useRef } from 'react'
import { createSectionScroll } from './sectionScroll'

export function useSectionScroll(getStops: () => number[], fullPage = true) {
  const controller = useRef<ReturnType<typeof createSectionScroll> | null>(null)
  const animating = useRef(false)

  useEffect(() => {
    const scroll = createSectionScroll(getStops, {
      fullPage,
      onAnimating: (active) => { animating.current = active },
    })
    controller.current = scroll
    return () => {
      scroll.destroy()
      controller.current = null
    }
  }, [getStops, fullPage])

  const jumpTo = useCallback((index: number) => controller.current?.jumpTo(index), [])
  return { jumpTo, animating }
}
