import { useCallback, useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/Header'
import { LandingContext, type Landing } from '@/cinematic/LandingContext'
import { SCENES, type Scene } from '@/cinematic/scenes'
import { cn } from '@/lib/cn'
import { HEADER_H } from '@/lib/layout'
import { useInView } from '@/lib/useInView'
import { useSectionScroll } from '@/lib/useSectionScroll'

/**
 * Раскладка для узких экранов (ниже 1200×640).
 *
 * Фильма здесь нет: телефон не качает из секвенции ни байта. Вместо камеры
 * шесть секций: сверху фото-баннер из того же стоп-кадра, на котором на
 * десктопе стоит камера, — он «оседает» из лёгкого увеличения, когда
 * секция показалась, — под ним контент на графите.
 *
 * Содержимое общее с киношной раскладкой: секции берут те же блоки из
 * blocks.tsx. Колонки только для фильма (cineOnly) здесь не выводятся.
 */
export function StaticLanding() {
  const [solid, setSolid] = useState(false)
  const getStops = useCallback(() => SCENES.map((scene, index) => {
    if (index === 0) return 0
    const section = document.getElementById(scene.id)
    return section ? section.getBoundingClientRect().top + window.scrollY - HEADER_H.narrow : 0
  }), [])
  const { jumpTo } = useSectionScroll(getStops, false)

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const landing = useMemo<Landing>(
    () => ({
      jumpTo: (id) => jumpTo(SCENES.findIndex((scene) => scene.id === id)),
    }),
    [jumpTo],
  )

  return (
    <LandingContext.Provider value={landing}>
      <main id="top" className="static-landing bg-graphite" style={{ paddingTop: HEADER_H.narrow }}>
        {SCENES.map((scene, index) => (
          <StaticSection key={scene.id} scene={scene} first={index === 0} />
        ))}
      </main>

      <Header solid={solid} compact />
    </LandingContext.Provider>
  )
}

function StaticSection({ scene, first }: { scene: Scene; first: boolean }) {
  const [nearRef, near] = useInView<HTMLElement>('100% 0px 100% 0px')
  const [ref, seen] = useInView<HTMLDivElement>()

  const columns = scene.columns.filter((column) => !column.cineOnly)
  const padded = columns.filter((column) => !column.full)
  const strips = columns.filter((column) => column.full)

  return (
    <section
      ref={nearRef}
      id={scene.id}
      aria-label={scene.chapter}
      className={cn('scroll-mt-[60px] bg-graphite', (seen || first) && 'is-in')}
    >
      {/* Баннер декоративный: пустой alt. Низ растворяется в фон секции. */}
      <div className="relative overflow-hidden">
        <img
          src={`/stills/s_${scene.still}@md.webp`}
          srcSet={`/stills/s_${scene.still}@sm.webp 640w, /stills/s_${scene.still}@md.webp 1024w, /stills/s_${scene.still}@lg.webp 1672w`}
          sizes="100vw"
          alt=""
          aria-hidden="true"
          width={1024}
          height={576}
          loading={first ? 'eager' : 'lazy'}
          fetchPriority={first ? 'high' : 'auto'}
          className="banner-img h-[min(64vw,360px)] w-full object-cover md:h-[440px]"
          style={{ objectPosition: scene.focus }}
        />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-graphite to-transparent" />
        <span aria-hidden="true" className="banner-index">
          {String(scene.still).padStart(2, '0')} / 06
        </span>
      </div>

      <div ref={ref} className="relative -mt-12 flex flex-col gap-12 px-[6vw] pb-16 md:-mt-20 md:px-[8vw]">
        {padded.map((column, index) => (
          <div key={index} className="reveal-group">
            <column.Content active={seen} near={near || first} />
          </div>
        ))}
      </div>

      {strips.length > 0 && (
        <div className="reveal-group border-t border-line-soft px-[6vw] py-6">
          {strips.map((column, index) => (
            <column.Content key={index} active={seen} near={near} />
          ))}
        </div>
      )}
    </section>
  )
}
