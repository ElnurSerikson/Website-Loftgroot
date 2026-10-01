/**
 * Собирает из пяти роликов секвенцию кадров для скролл-скраба — в полном
 * разрешении исходника. Механика — как в Rulit и «Пёрышке».
 *
 * Источник: docs/video1.mp4 … video5.mp4 (1916×1080, 24 fps, по 5.08с) и
 * стоп-кадры сцен docs/foto1.png … Foto6.png (1672×941). Порядок и
 * растворения — scripts/clips.mjs.
 * Результат: public/film/f_0000.webp … и прокси public/film/lo/…
 *
 *   разрешение  1920×1080 — полный кадр (1916 растягиваются на 4px);
 *   частота     24 fps — каждый кадр видео;
 *   сжатие      WebP q92 — на увеличении 200% неотличимо от кадра видео.
 *
 * ОСТАНОВКИ — СТОП-КАДРЫ, А НЕ КАДРЫ ВИДЕО. PNG резче видео, а на остановке
 * человек смотрит на кадр дольше всего. Кадр остановки — сам PNG, увеличенный
 * ланцошем до 1080p, а видео в него перетекает:
 *
 *   ролик:  [PNG] → растворение в видео → видео → растворение в следующий PNG
 *
 * СКЛЕЙКА ПОКАДРОВАЯ: последний кадр ролика совпадает с первым кадром
 * следующего и выбрасывается. Номера остановок скрипт печатает в конце — их
 * нужно перенести в BEATS (src/cinematic/film.ts) вместе с FILM.count.
 *
 * Запуск: npm run film (около десяти минут)
 */
import { execFileSync } from 'node:child_process'
import { availableParallelism } from 'node:os'
import { mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import ffmpeg from 'ffmpeg-static'
import sharp from 'sharp'
import { CLIPS, CLIPS_DIR, STOPS, isStop } from './clips.mjs'

const OUT = 'public/film'
const LO_DIR = 'public/film/lo'
const TMP = 'node_modules/.tmp/film'

const WIDTH = 1920
const HEIGHT = 1080
const FPS = 24
const QUALITY = 92

/** Прокси 320×180: грузится первым и целиком, пока чёткие кадры в пути. */
const LO_WIDTH = 320
const LO_HEIGHT = 180
const LO_QUALITY = 52

/** Сколько кадров кодируем одновременно. */
const CONCURRENCY = Math.max(2, Math.min(6, availableParallelism() - 2))

console.log('раскладываю ролики на кадры 1080p…')
await rm(TMP, { recursive: true, force: true })
await mkdir(TMP, { recursive: true })
await rm(OUT, { recursive: true, force: true })
await mkdir(LO_DIR, { recursive: true })

const clipFrames = []
for (const clip of CLIPS) {
  const dir = join(TMP, clip.file)
  await mkdir(dir, { recursive: true })
  execFileSync(
    ffmpeg,
    ['-v', 'error', '-i', join(CLIPS_DIR, clip.file), '-vf', `fps=${FPS},scale=${WIDTH}:${HEIGHT}:flags=lanczos`, join(dir, 'r_%04d.png')],
    { stdio: 'inherit' },
  )
  const files = (await readdir(dir)).filter((f) => f.endsWith('.png')).sort()
  clipFrames.push(files.map((f) => join(dir, f)))
  console.log(`  ${clip.file} → ${files.length} кадров`)
}

/** Кадр в сыром RGB 1920×1080 — смешивать удобнее без повторного декодирования. */
const raw = async (input) =>
  sharp(input).removeAlpha().resize(WIDTH, HEIGHT, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer()

console.log('готовлю стоп-кадры остановок…')
const stills = Object.fromEntries(
  await Promise.all(STOPS.map(async (name) => [name, await raw(join(CLIPS_DIR, `${name}.png`))])),
)

/** a·(1−w) + b·w */
function mix(a, b, w) {
  const out = Buffer.allocUnsafe(a.length)
  for (let i = 0; i < a.length; i++) out[i] = (a[i] * (1 - w) + b[i] * w + 0.5) | 0
  return out
}

/**
 * Лента кадров. У каждого — кадр видео и/или стоп-кадр, с которым он
 * смешивается, и вес стоп-кадра.
 */
const timeline = []
/** Номер кадра ленты для каждой остановки. */
const stopFrames = {}

for (const [k, clip] of CLIPS.entries()) {
  const frames = clipFrames[k]
  const last = k === CLIPS.length - 1
  const startsOnStop = isStop(clip.from)
  const endsOnStop = isStop(clip.to)

  // Позиции по исходнику: подряд, а с rampFrom — с шагом, который линейно
  // растёт от 1 до 2. Дробная позиция — смесь двух соседних кадров.
  // Последний кадр ролика должен остаться в списке: в нём ролик встречается
  // со следующим.
  const order = []
  const lastIndex = frames.length - 1
  const rampFrom = Math.min(clip.rampFrom ?? lastIndex, lastIndex)
  for (let i = 0; i < rampFrom; i++) order.push(i)
  const span = lastIndex - rampFrom
  if (span > 0) {
    // n шагов от 1 до 2 дают в сумме 1.5·n — столько, сколько кадров в хвосте.
    const steps = Math.round(span / 1.5)
    let position = rampFrom
    order.push(position)
    for (let s = 0; s < steps; s++) {
      position += 1 + s / Math.max(steps - 1, 1)
      order.push(s === steps - 1 ? lastIndex : Math.min(position, lastIndex))
    }
  } else {
    order.push(lastIndex)
  }

  const end = order.length - 1
  const take = last ? order.length : end

  if (startsOnStop) stopFrames[clip.from] = timeline.length

  for (let p = 0; p < take; p++) {
    const base = Math.floor(order[p])
    const frac = order[p] - base
    const video = { file: frames[base], ...(frac > 0.01 ? { next: frames[base + 1], t: frac } : {}) }
    const toEnd = end - p

    if (startsOnStop && p === 0) {
      timeline.push({ still: clip.from, w: 1 })
    } else if (last && endsOnStop && p === end) {
      timeline.push({ still: clip.to, w: 1 })
    } else if (startsOnStop && p <= clip.fadeIn) {
      timeline.push({ ...video, still: clip.from, w: 1 - p / (clip.fadeIn + 1) })
    } else if (endsOnStop && toEnd <= clip.fadeOut) {
      timeline.push({ ...video, still: clip.to, w: 1 - toEnd / (clip.fadeOut + 1) })
    } else {
      timeline.push(video)
    }
  }

  if (last && endsOnStop) stopFrames[clip.to] = timeline.length - 1
  console.log(`  ${clip.file}: кадры ленты ${timeline.length - take}…${timeline.length - 1}`)
}

console.log(`кодирую ${timeline.length} кадров, по ${CONCURRENCY} одновременно…`)
let bytes = 0
let loBytes = 0
let done = 0

async function encode(index) {
  const frame = timeline[index]
  const name = `f_${String(index).padStart(4, '0')}.webp`

  let pixels
  if (frame.file) {
    pixels = await raw(frame.file)
    // Дробная позиция на разгоне: смесь двух соседних кадров видео.
    if (frame.next) pixels = mix(pixels, await raw(frame.next), frame.t)
  }
  if (frame.still !== undefined) {
    pixels = pixels ? mix(pixels, stills[frame.still], frame.w) : stills[frame.still]
  }
  const image = sharp(pixels, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } })

  const info = await image.webp({ quality: QUALITY, effort: 5, smartSubsample: true }).toFile(join(OUT, name))
  bytes += info.size

  const loInfo = await sharp(join(OUT, name))
    .resize(LO_WIDTH, LO_HEIGHT)
    .webp({ quality: LO_QUALITY, effort: 5 })
    .toFile(join(LO_DIR, name))
  loBytes += loInfo.size

  done++
  if (done % 60 === 0) console.log(`  ${done} / ${timeline.length}`)
}

let cursor = 0
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < timeline.length) await encode(cursor++)
  }),
)

await rm(TMP, { recursive: true, force: true })

const count = timeline.length
console.log(
  `готово: ${count} кадров ${WIDTH}×${HEIGHT}, ${(bytes / 1024 / 1024).toFixed(1)} МБ, ` +
    `${(bytes / count / 1024).toFixed(0)} КБ в среднем`,
)
console.log(`прокси: ${(loBytes / 1024 / 1024).toFixed(2)} МБ, ${(loBytes / count / 1024).toFixed(1)} КБ в среднем`)
console.log('остановки (кадр → секунда фильма):')
STOPS.forEach((name) =>
  console.log(`  ${`${name}.png`.padEnd(8)} ${String(stopFrames[name]).padStart(4)} → ${(stopFrames[name] / FPS).toFixed(3)}с`),
)
console.log(`не забудь синхронизировать FILM.count = ${count} и кадры остановок в src/cinematic/film.ts`)
