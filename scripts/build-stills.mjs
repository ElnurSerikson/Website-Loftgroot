/**
 * Готовит стоп-кадры для ленты узких экранов и галереи проектов.
 *
 * Источник: docs/foto1.png … Foto6.png (1672×941) — кадры шести сцен. Ниже
 * 1200×640 фильма нет: каждая секция открывается баннером из того же кадра,
 * на котором в фильме стоит камера. Те же файлы показывает галерея.
 *
 *   s_N@lg.webp   1672×941  полное разрешение: галерея и плотные экраны
 *   s_N@md.webp   1024×576  телефон с плотностью 2
 *   s_N@sm.webp    640×360  телефон с плотностью 1
 *
 * Запуск: npm run stills
 */
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { CLIPS_DIR, STOPS } from './clips.mjs'

const OUT = 'public/stills'

const SIZES = [
  { suffix: '@lg', width: 1672, height: 941, quality: 82 },
  { suffix: '@md', width: 1024, height: 576, quality: 78 },
  { suffix: '@sm', width: 640, height: 360, quality: 74 },
]

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

let bytes = 0
for (const [index, name] of STOPS.entries()) {
  for (const size of SIZES) {
    const file = `s_${index + 1}${size.suffix}.webp`
    const info = await sharp(join(CLIPS_DIR, `${name}.png`))
      .resize(size.width, size.height, { fit: 'cover' })
      .webp({ quality: size.quality, effort: 5, smartSubsample: true })
      .toFile(join(OUT, file))
    bytes += info.size
    console.log(`  ${file}  ${(info.size / 1024).toFixed(0)} КБ`)
  }
}

// Картинка для соцсетей — финальный кадр.
await sharp(join(CLIPS_DIR, `${STOPS.at(-1)}.png`))
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile('public/og.jpg')

console.log(`готово: ${STOPS.length * SIZES.length} файлов, ${(bytes / 1024).toFixed(0)} КБ + og.jpg`)
