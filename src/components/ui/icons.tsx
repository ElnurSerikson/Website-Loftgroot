import type { SVGProps } from 'react'

/**
 * Значки сайта. Один набор на всё: контурные, сетка 24, обводка 1.8,
 * скруглённые концы. Цвет и размер приходят снаружи — stroke="currentColor"
 * и размер классом. Полтора десятка контуров дешевле целой библиотеки.
 *
 * Знаки соцсетей — заливкой: их узнают по силуэту, а не по линии.
 */

type Props = SVGProps<SVGSVGElement> & { strokeWidth?: number }

const Icon = ({ strokeWidth = 1.8, children, ...props }: Props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
)

const Filled = ({ children, ...props }: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    {children}
  </svg>
)

/* ------------------------------------------------------------ интерфейс */

/** Стрелка в конце подписи — единственный значок на кнопках сайта. */
export const IconArrow = (p: Props) => (
  <Icon {...p}>
    <path d="M4 12h15" />
    <path d="m13 6 6 6-6 6" />
  </Icon>
)

/** Стрелка наружу — у ссылок, которые уводят на другой сайт. */
export const IconArrowUpRight = (p: Props) => (
  <Icon {...p}>
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </Icon>
)

export const IconCheck = (p: Props) => (
  <Icon {...p}>
    <path d="m4.5 12.5 4.5 4.5L19.5 6.5" />
  </Icon>
)

export const IconClose = (p: Props) => (
  <Icon {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
)

/* ------------------------------------------------------------ контакты */

export const IconPhone = (p: Props) => (
  <Icon {...p}>
    <path d="M15.8 21A13.8 13.8 0 0 1 3 8.2 3 3 0 0 1 6 5h2.2l1.4 3.8-2 1.4a11.4 11.4 0 0 0 6.2 6.2l1.4-2 3.8 1.4V18a3 3 0 0 1-3.2 3Z" />
  </Icon>
)

export const IconPin = (p: Props) => (
  <Icon {...p}>
    <path d="M12 21.5s7-6.4 7-11.3A7 7 0 1 0 5 10.2c0 4.9 7 11.3 7 11.3Z" />
    <circle cx="12" cy="10" r="2.5" />
  </Icon>
)

/* -------------------------------------------------------------- соцсети */

export const IconWhatsApp = (p: SVGProps<SVGSVGElement>) => (
  <Filled {...p}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.17h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.39c0-4.54 3.7-8.24 8.24-8.24a8.18 8.18 0 0 1 5.82 2.42 8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.69 8.24-8.24 8.24Zm4.52-6.17c-.25-.13-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.78.97-.14.16-.29.18-.53.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.14.17-.25.25-.41.09-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.55-.43h-.48c-.16 0-.43.06-.65.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.54c.13.17 1.74 2.65 4.21 3.72.59.25 1.05.4 1.4.52.59.18 1.13.16 1.55.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.29Z" />
  </Filled>
)

export const IconInstagram = (p: Props) => (
  <Icon {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5.2" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
)

/* ------------------------------------------------------------ навигация */

export const IconChevronLeft = (p: Props) => (
  <Icon {...p}>
    <path d="m15 5-7 7 7 7" />
  </Icon>
)

export const IconChevronRight = (p: Props) => (
  <Icon {...p}>
    <path d="m9 5 7 7-7 7" />
  </Icon>
)

export const IconArrowDown = (p: Props) => (
  <Icon {...p}>
    <path d="M12 4v15" />
    <path d="m6 13 6 6 6-6" />
  </Icon>
)
