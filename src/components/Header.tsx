import { cn } from '@/lib/cn'
import { copy } from '@/content/copy'
import { site } from '@/content/site'
import { Logo } from '@/components/ui/Logo'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { HEADER_SCRIM } from '@/cinematic/scrim'
import { SCENES } from '@/cinematic/scenes'
import { HEADER_H } from '@/lib/layout'

/**
 * Шапка. Прозрачная над первым экраном, графитовое стекло после первой
 * прокрутки. Логотип слева, разделы по центру (только с фильмом — в ленте
 * узкого экрана их некуда ставить), справа телефон и кнопка WhatsApp.
 */
export function Header({
  solid,
  compact,
  activeBeat,
  onJump,
}: {
  solid: boolean
  compact: boolean
  /** Индекс сцены, на которой стоит камера, — для подсветки пункта меню. */
  activeBeat?: number
  /** Переход к сцене. В статической ленте ссылок нет. */
  onJump?: (index: number) => void
}) {
  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 flex items-center justify-between px-[4vw]',
        compact ? 'gap-3' : 'gap-6',
        'transition-[background-color,backdrop-filter,border-color] duration-500 ease-brand',
        solid ? 'border-b border-line-soft bg-graphite/72 backdrop-blur-[14px]' : 'border-b border-transparent',
      )}
      style={{ height: compact ? HEADER_H.narrow : HEADER_H.wide }}
    >
      {!solid && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-1 h-[190%]"
          style={{ backgroundImage: HEADER_SCRIM }}
        />
      )}

      <a
        href="#top"
        onClick={(e) => {
          if (!onJump) return
          e.preventDefault()
          onJump(0)
        }}
        aria-label={`${site.name} — на главный экран`}
        className="text-[clamp(15px,1.1vw,18px)] text-white transition-opacity hover:opacity-85"
      >
        <Logo />
      </a>

      {onJump && (
        <nav aria-label={copy.header.sections} className="flex items-center gap-[clamp(14px,1.9vw,38px)]">
          {copy.header.nav.map((item) => {
            const index = SCENES.findIndex((scene) => scene.id === item.beat)
            const current = activeBeat === index
            return (
              <button
                key={item.beat}
                type="button"
                onClick={() => onJump(index)}
                aria-current={current || undefined}
                className={cn(
                  'nav-link relative py-2 whitespace-nowrap transition-colors duration-200',
                  current ? 'text-amber' : 'text-white/70 hover:text-white',
                )}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-0 -bottom-px h-px origin-left bg-amber transition-transform duration-300 ease-brand',
                    current ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </button>
            )
          })}
        </nav>
      )}

      <div className="flex items-center gap-2.5">
        <a
          href={site.phoneHref}
          className="hidden flex-col items-end leading-none whitespace-nowrap text-white transition-colors hover:text-amber min-[1440px]:flex"
        >
          <span className="font-display text-[15px] font-semibold tracking-[0.02em] tabular-nums">{site.phone}</span>
          <span className="mt-1 font-mono text-[10.5px] tracking-[0.14em] text-white/45 uppercase">
            {copy.header.phoneCaption}
          </span>
        </a>

        <WhatsAppButton className={compact ? 'h-10 px-3 text-[12px] min-[375px]:px-4 min-[375px]:text-[13px]' : 'h-11 px-5 text-[13.5px]'} />
      </div>
    </header>
  )
}
