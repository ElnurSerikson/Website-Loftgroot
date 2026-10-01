import { cn } from '@/lib/cn'
import { SCENES } from './scenes'

/**
 * Лента глав у правой кромки: шесть меток 01–06, как на монтажном столе.
 * Текущая — янтарная и длиннее, название главы проявляется рядом. По клику
 * камера едет к сцене. Колонки текста стоят в 5.5% от края — лента уже
 * этого поля и их не задевает.
 */
export function ChapterRail({ active, onJump }: { active: number; onJump: (index: number) => void }) {
  return (
    <nav aria-label="Главы фильма" className="chapter-rail">
      <ol>
        {SCENES.map((scene, index) => {
          const current = index === active
          return (
            <li key={scene.id}>
              <button
                type="button"
                onClick={() => onJump(index)}
                aria-current={current || undefined}
                aria-label={`${String(index + 1).padStart(2, '0')} — ${scene.chapter}`}
                className={cn('chapter-tick group', current && 'is-current')}
              >
                <span className="chapter-name">{scene.chapter}</span>
                <span className="chapter-n">{String(index + 1).padStart(2, '0')}</span>
                <span className="chapter-bar" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
