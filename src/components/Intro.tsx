import { useEffect, useMemo, useState } from 'react'
import { copy } from '@/content/copy'
import { cn } from '@/lib/cn'

/** Заставка не короче — иначе розжиг не успевает прочитаться. */
const MIN_MS = 2400
/** И не дольше — на медленной сети человек не должен ждать весь прокси. */
const MAX_MS = 7000
/** Сколько фильма должно быть готово: первый чёткий кадр и треть прокси. */
const READY_AT = 0.45
/** Раз за сессию: при переходе назад на сайт второй раз не показываем. */
const SEEN_KEY = 'loftgroot:intro'

/** Искры: позиция, задержка, длительность и снос — свои у каждой. */
const SPARKS = 22

const seen = () => {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

const remember = () => {
  try {
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* хранилище недоступно — покажем ещё раз, не страшно */
  }
}

/**
 * Заставка «розжиг», пока грузится фильм.
 *
 * На графите тлеет уголь: буквы LOFTGROOT разгораются по одной из тёмно-
 * красного в янтарь и белый металл, над ними поднимаются искры, а снизу
 * бежит фитиль — сколько фильма уже готово. Когда первый кадр и треть
 * прокси на месте и прошло не меньше 2.4с, заставка гаснет, и под ней уже
 * стоит первый кадр.
 *
 * Снимается раньше прокруткой, клавишей или кнопкой «Пропустить» —
 * человек, который пришёл крутить, не должен ждать. При
 * prefers-reduced-motion не показывается вовсе.
 */
export function Intro({ loaded }: { loaded: number }) {
  const [state, setState] = useState<'on' | 'leaving' | 'off'>(() =>
    seen() || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : 'on',
  )
  const [minDone, setMinDone] = useState(false)

  const sparks = useMemo(
    () =>
      Array.from({ length: SPARKS }, (_, i) => ({
        x: 8 + ((i * 37) % 84),
        delay: (i * 173) % 2200,
        duration: 1600 + ((i * 97) % 1400),
        drift: ((i * 53) % 60) - 30,
        size: 2 + (i % 3),
      })),
    [],
  )

  const leave = () => setState((s) => (s === 'on' ? 'leaving' : s))

  useEffect(() => {
    if (state !== 'on') return
    const min = window.setTimeout(() => setMinDone(true), MIN_MS)
    const max = window.setTimeout(leave, MAX_MS)
    const onUser = (e: Event) => {
      if (e instanceof KeyboardEvent && !['ArrowDown', 'PageDown', ' ', 'Enter', 'Escape'].includes(e.key)) return
      leave()
    }
    window.addEventListener('wheel', onUser, { passive: true })
    window.addEventListener('touchmove', onUser, { passive: true })
    window.addEventListener('keydown', onUser)
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(min)
      window.clearTimeout(max)
      window.removeEventListener('wheel', onUser)
      window.removeEventListener('touchmove', onUser)
      window.removeEventListener('keydown', onUser)
      document.documentElement.style.overflow = ''
    }
  }, [state])

  useEffect(() => {
    if (minDone && loaded >= READY_AT) leave()
  }, [minDone, loaded])

  useEffect(() => {
    if (state !== 'leaving') return
    remember()
    const done = window.setTimeout(() => setState('off'), 1100)
    return () => window.clearTimeout(done)
  }, [state])

  if (state === 'off') return null

  return (
    <div className={cn('intro', state === 'leaving' && 'is-leaving')} role="status" aria-label="Загрузка">
      <div className="intro-heat" aria-hidden="true" />

      <div className="intro-sparks" aria-hidden="true">
        {sparks.map((spark, i) => (
          <span
            key={i}
            className="intro-spark"
            style={
              {
                left: `${spark.x}%`,
                width: spark.size,
                height: spark.size,
                animationDelay: `${spark.delay}ms`,
                animationDuration: `${spark.duration}ms`,
                '--drift': `${spark.drift}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center">
        <p className="intro-word" aria-hidden="true">
          {[...'LOFTGROOT'].map((letter, i) => (
            <span key={i} style={{ '--l': i } as React.CSSProperties}>
              {letter}
            </span>
          ))}
        </p>
        <p className="intro-caption">{copy.intro.caption}</p>

        <div className="intro-fuse" aria-hidden="true">
          <span className="intro-fuse-fill" style={{ transform: `scaleX(${Math.min(loaded / READY_AT, 1)})` }} />
        </div>
      </div>

      <button type="button" onClick={leave} className="intro-skip">
        {copy.intro.skip}
      </button>
    </div>
  )
}
