import { useEffect, useRef, useState } from 'react'

/**
 * Один раз сообщает, что элемент показался в окне.
 *
 * Нужен только статической раскладке: там блоки всплывают при появлении
 * секции. В киношной раскладке слои висят на месте и меняют прозрачность,
 * поэтому триггером служит сцена, на которой стоит камера.
 */
export function useInView<T extends HTMLElement>(rootMargin = '-12% 0px -12% 0px') {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [seen, rootMargin])

  return [ref, seen] as const
}
