import { useEffect, useState } from 'react'
import { CinematicLanding } from '@/cinematic/CinematicLanding'
import { CINEMATIC_QUERY } from '@/cinematic/film'
import { StaticLanding } from '@/static/StaticLanding'

/**
 * Выбор раскладки. Запрос один на весь проект — CINEMATIC_QUERY из film.ts,
 * он же стоит на предзагрузке первого кадра в index.html: разъехавшись, они
 * дали бы телефон, качающий секвенцию, или широкий экран без неё.
 *
 * Решение принимается до первого рендера, синхронно: смонтировать киношную
 * раскладку и тут же снести её на телефоне — значит успеть запустить
 * загрузку прокси-копии фильма по сотовой сети.
 */
export function App() {
  const [cinematic, setCinematic] = useState(() => window.matchMedia(CINEMATIC_QUERY).matches)

  useEffect(() => {
    const query = window.matchMedia(CINEMATIC_QUERY)
    const apply = () => {
      setCinematic((previous) => {
        // Раскладки разной длины, и позиция прокрутки одной ничего не значит
        // для другой: при смене начинаем сверху.
        if (previous !== query.matches) window.scrollTo(0, 0)
        return query.matches
      })
    }
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  return cinematic ? <CinematicLanding /> : <StaticLanding />
}
