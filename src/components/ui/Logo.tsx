import { cn } from '@/lib/cn'

/**
 * Логотип LOFTGROOT.
 *
 * Файла логотипа в материалах нет — есть надпись на комплексах и стене цеха
 * в самих кадрах: жирный геометрический гротеск заглавными. Здесь он набран
 * шрифтом заголовков сайта того же склада. Янтарная черта под «LOFT» —
 * раскалённая кромка металла, тот же знак, что подчёркивает LOFTGROOT на
 * первом экране.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('logo', className)}>
      <span className="relative">
        LOFT
        <span aria-hidden="true" className="logo-rule" />
      </span>
      GROOT
    </span>
  )
}
