import { copy } from '@/content/copy'
import { site } from '@/content/site'
import { cn } from '@/lib/cn'
import { IconArrow } from './icons'

/** Все основные действия ведут прямо в чат компании с одним приветствием. */
export function WhatsAppButton({ className }: { className?: string }) {
  return (
    <a href={site.whatsappHref} target="_blank" rel="noopener noreferrer" className={cn('btn btn-primary group', className)}>
      <span className="btn-glow" aria-hidden="true" />
      {copy.actions.whatsapp}
      <IconArrow
        className="size-[1.05em] shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-[3px] motion-reduce:transition-none"
        strokeWidth={2}
      />
    </a>
  )
}
