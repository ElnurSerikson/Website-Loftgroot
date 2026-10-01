import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { copy } from '@/content/copy'
import { site } from '@/content/site'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import {
  IconArrow,
  IconArrowDown,
  IconArrowUpRight,
  IconInstagram,
  IconPhone,
  IconPin,
  IconWhatsApp,
} from '@/components/ui/icons'
import { useLanding } from './LandingContext'

/**
 * Содержимое шести экранов ТЗ.
 *
 * Блоки не знают, в какой раскладке стоят. От 1200×640 их выводит киношная
 * вёрстка в координатах кадра, ниже — статическая лента под фото-баннером.
 * Разница выражена вариантом `cine:` (theme.css).
 *
 * Появление по очереди задаётся классами reveal-group / reveal-flow
 * (theme.css): сами блоки про анимацию ничего не знают. Исключение —
 * этапы производства: они загораются по ходу прокрутки, по переменной --p,
 * которую слою сцены ставит CinematicLanding.
 */

/* ------------------------------------------------------------- кирпичи */

/** {…} в тексте — акцент янтарём, \n — перенос строки. */
function accented(text: string): ReactNode[] {
  return text.split(/\{([^}]+)\}/).flatMap((part, index) => {
    const nodes: ReactNode[] = []
    part.split('\n').forEach((line, li) => {
      if (li > 0) nodes.push(<br key={`br-${index}-${li}`} />)
      if (!line) return
      nodes.push(
        index % 2 === 1 ? (
          <span key={`a-${index}-${li}`} className="accent">
            {line}
          </span>
        ) : (
          <span key={`p-${index}-${li}`}>{line}</span>
        ),
      )
    })
    return nodes
  })
}

/** Надзаголовок сцены: номер главы моноширинным, черта, подпись в разрядку. */
const Badge = ({ index, children }: { index?: string; children: string }) => (
  <div className="badge">
    {index && <span className="badge-index">{index}</span>}
    <span className="badge-line" aria-hidden="true" />
    {children}
  </div>
)

const SceneTitle = ({ children, className }: { children: string; className?: string }) => (
  <h2 className={cn('h-scene mt-title', className)}>{accented(children)}</h2>
)

const Lead = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn('lead mt-body', className)}>{children}</p>
)

const Arrow = ({ out = false }: { out?: boolean }) => {
  const Icon = out ? IconArrowUpRight : IconArrow
  return (
    <Icon
      className={cn(
        'size-[1.05em] shrink-0 transition-transform duration-200 ease-out',
        out ? 'group-hover:translate-x-[2px] group-hover:-translate-y-[2px]' : 'group-hover:translate-x-[4px]',
        'motion-reduce:transition-none motion-reduce:group-hover:translate-0',
      )}
      strokeWidth={2}
    />
  )
}

const OutLink = ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={cn('btn-link group', className)}>
    {children}
    <Arrow out />
  </a>
)

/* ------------------------------------------------------------ 1 · HERO */

/**
 * Первый экран. LOFTGROOT собирается по буквам — каждая поднимается из-под
 * невидимой кромки со своей задержкой, под словом прочерчивается янтарная
 * линия, как раскалённый край металла. Ниже — подзаголовок ТЗ, абзац,
 * кнопка WhatsApp и строка «Собственное производство • Индивидуальный проект •
 * Алматы».
 */
export function HeroText() {
  const t = copy.hero
  return (
    <>
      <h1 className="h-hero" aria-label={t.title}>
        <span className="hero-word" aria-hidden="true">
          {[...t.title].map((letter, i) => (
            <span key={i} className="hero-letter" style={{ '--l': i } as React.CSSProperties}>
              {letter}
            </span>
          ))}
        </span>
        <span className="hero-rule" aria-hidden="true" />
      </h1>

      <p className="h-sub mt-title max-w-[22ch]">{accented(t.subtitle)}</p>
      <Lead className="lead-hero max-w-[42ch]">{t.body}</Lead>

      <div className="mt-actions flex flex-wrap items-center gap-[clamp(10px,calc(var(--fw)*0.009),16px)]">
        <WhatsAppButton className="btn-hero" />
      </div>

      <ul className="facts mt-actions" aria-label="Коротко о LOFTGROOT">
        {t.facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
    </>
  )
}

/** «SCROLL TO DISCOVER ↓» внизу первого экрана: по нити бежит искра. */
export function ScrollCue() {
  const { jumpTo } = useLanding()
  return (
    <button type="button" onClick={() => jumpTo('product')} className="scroll-cue group">
      <span className="scroll-cue-text">{copy.hero.scroll}</span>
      <span className="scroll-cue-thread" aria-hidden="true">
        <span className="scroll-cue-spark" />
      </span>
      <IconArrowDown className="size-3.5 opacity-70 transition-transform duration-300 group-hover:translate-y-0.5" />
    </button>
  )
}

/* ----------------------------------------------- 2 · ПРОДУКТ КРУПНЫМ ПЛАНОМ */

/**
 * Три преимущества — строками техпаспорта: номер, название, пояснение.
 * Над каждой прочерчивается волосяная линия, когда камера встаёт на кадр.
 */
export function ProductBlock() {
  const t = copy.product
  return (
    <>
      <Badge index={t.index}>{t.badge}</Badge>
      <SceneTitle className="h-large">{t.title}</SceneTitle>
      <Lead className="max-w-[46ch]">{t.body}</Lead>

      <ol className="spec-list mt-list reveal-flow reveal-group [--d:180ms]">
        {t.points.map((point, i) => (
          <li key={point.title} className="spec-row">
            <span className="spec-n">{String(i + 1).padStart(2, '0')}</span>
            <span>
              <span className="h-row block">{point.title}</span>
              <span className="item mt-1 block">{point.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-actions">
        <WhatsAppButton />
      </div>
    </>
  )
}

/* ------------------------------------------- 3 · СОБСТВЕННОЕ ПРОИЗВОДСТВО */

/**
 * Этапы 01–04. На кадре они загораются по ходу стоянки: слой сцены получает
 * --p от 0 до 1, каждый этап — свой порог (theme.css, .steps). Металлическая
 * нить слева заполняется янтарём, как шов под сваркой. В ленте узких
 * экранов --p ставится в 1, когда секция показалась.
 */
export function FactoryBlock() {
  const t = copy.factory
  return (
    <>
      <Badge index={t.index}>{t.badge}</Badge>
      <SceneTitle className="h-large">{t.title}</SceneTitle>
      <p className="h-sub mt-body">{t.subtitle}</p>
      <Lead className="max-w-[46ch]">{t.body}</Lead>

      <ol className="steps mt-list" aria-label="Этапы производства">
        <span className="steps-rail" aria-hidden="true">
          <span className="steps-rail-fill" />
        </span>
        {t.steps.map((step, i) => (
          <li key={step.n} className="step" style={{ '--k': i } as React.CSSProperties}>
            <span className="step-dot" aria-hidden="true" />
            <span className="step-n">{step.n} —</span>
            <span className="step-label">{step.label}</span>
          </li>
        ))}
      </ol>
    </>
  )
}

/* ------------------------------------------------ 4 · КАЧЕСТВО В ДЕТАЛЯХ */

/**
 * Четыре преимущества в сетке 2×2. «При наведении каждый пункт может слегка
 * подсвечиваться тёплым светом» — свет идёт за курсором: позицию ставит
 * pointermove в переменные --mx / --my, янтарное пятно — radial-gradient.
 * Уголки ячейки — как метки на чертеже.
 */
export function QualityBlock() {
  const t = copy.quality
  const track = (e: React.PointerEvent<HTMLLIElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }
  return (
    <>
      <Badge index={t.index}>{t.badge}</Badge>
      <SceneTitle className="h-large">{t.title}</SceneTitle>
      <Lead className="max-w-[48ch]">{t.body}</Lead>

      <ul className="detail-grid mt-list reveal-flow reveal-group [--d:180ms]">
        {t.points.map((point, i) => (
          <li key={point} className="detail" onPointerMove={track}>
            <span className="detail-corners" aria-hidden="true" />
            <span className="detail-n">{String(i + 1).padStart(2, '0')}</span>
            <span className="detail-label">{point}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

/* -------------------------------------------------- 5 · КОМАНДА LOFTGROOT */

export function TeamBlock() {
  const t = copy.team
  return (
    <>
      <Badge index={t.index}>{t.badge}</Badge>
      <SceneTitle className="h-team">{t.title}</SceneTitle>
      {t.body.map((paragraph) => (
        <Lead key={paragraph} className="max-w-[44ch]">
          {paragraph}
        </Lead>
      ))}

      <figure className="quote mt-list">
        <span className="quote-mark" aria-hidden="true">
          “
        </span>
        <blockquote className="quote-text">{t.quote}</blockquote>
        <figcaption className="quote-by">— {t.quoteBy}</figcaption>
      </figure>

      <p className="mono-caption mt-actions">{t.caption}</p>
    </>
  )
}

/* ------------------------------------------------- 6 · ФИНАЛ / КОНТАКТЫ */

const ContactCell = ({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) => (
  <li className="contact-cell">
    <span className="contact-label">
      <span aria-hidden="true" className="text-amber">
        {icon}
      </span>
      {label}
    </span>
    <span className="contact-value">{children}</span>
  </li>
)

export function ContactsBlock() {
  const t = copy.contacts
  const icon = 'size-[15px]'
  return (
    <>
      <Badge index={t.index}>{t.badge}</Badge>
      <SceneTitle className="h-large">{t.title}</SceneTitle>
      <Lead className="max-w-[44ch]">{t.body}</Lead>

      <div className="mt-actions flex flex-wrap items-center gap-[clamp(10px,calc(var(--fw)*0.009),16px)]">
        <WhatsAppButton />
      </div>

      <ul className="contact-grid mt-list">
        <ContactCell icon={<IconPin className={icon} />} label={t.cityLabel}>
          {site.city}
        </ContactCell>
        <ContactCell icon={<IconInstagram className={icon} />} label={t.instagramLabel}>
          <a href={site.instagramHref} target="_blank" rel="noopener noreferrer" className="hover:text-amber">
            {site.instagram}
          </a>
        </ContactCell>
        <ContactCell icon={<IconPhone className={icon} />} label={t.phoneLabel}>
          <a href={site.phoneHref} className="hover:text-amber">
            {site.phone}
          </a>
        </ContactCell>
        <ContactCell icon={<IconWhatsApp className={icon} />} label={t.whatsappLabel}>
          <a href={site.whatsappHref} target="_blank" rel="noopener noreferrer" className="hover:text-amber">
            {site.whatsapp}
          </a>
        </ContactCell>
      </ul>

      <div className="mt-actions">
        <OutLink href={site.instagramHref}>{t.instagram}</OutLink>
      </div>
    </>
  )
}

/** Подвал ТЗ: «LOFTGROOT © 2026» и «Мангальные комплексы в стиле LOFT». */
export function LegalBar() {
  return (
    <div className="flex flex-col items-center justify-center gap-x-6 gap-y-1 px-[4vw] sm:flex-row">
      <p className="legal">
        {site.name} © {site.year}
      </p>
      <span aria-hidden="true" className="legal hidden sm:inline">
        ·
      </span>
      <p className="legal">{copy.contacts.footer}</p>
    </div>
  )
}
