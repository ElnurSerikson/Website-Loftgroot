/**
 * Проверка исходников фильма: насколько ролики попадают в свои стоп-кадры,
 * как стыкуются друг с другом и как движется камера на краях роликов.
 *
 * Остановки известны заранее — это границы роликов. Вопрос в другом:
 * насколько точно ролик начинается со своего PNG и кончается следующим. От
 * ответа зависят длины растворений в scripts/clips.mjs.
 *
 * Метод: маленькие серые кадры 160×90, средняя разница яркости на пиксель
 * (0–255). Меньше 1.5 глазом не отличить, 3–4 — видна ступенька. Разница
 * около 2–4 между PNG и крайним кадром — это резкость (видео мягче), а не
 * другой кадр.
 *
 * Запуск: npm run seams
 */
import { execFileSync } from 'node:child_process'
import { mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import ffmpeg from 'ffmpeg-static'
import sharp from 'sharp'
import { CLIPS, CLIPS_DIR } from './clips.mjs'

const TMP = 'node_modules/.tmp/seams'

const grey = async (input) => sharp(input).resize(160, 90, { fit: 'fill' }).greyscale().raw().toBuffer()

const diff = (a, b) => {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i])
  return sum / a.length
}

await rm(TMP, { recursive: true, force: true })

const frames = {}
for (const clip of CLIPS) {
  const dir = join(TMP, clip.file)
  await mkdir(dir, { recursive: true })
  execFileSync(ffmpeg, ['-v', 'error', '-i', join(CLIPS_DIR, clip.file), '-vf', 'scale=160:90', join(dir, 'p_%04d.png')])
  const files = (await readdir(dir)).filter((f) => f.endsWith('.png')).sort()
  frames[clip.file] = await Promise.all(files.map((f) => grey(join(dir, f))))
}

const stills = {}
for (const clip of CLIPS) {
  for (const name of [clip.from, clip.to]) stills[name] ??= await grey(join(CLIPS_DIR, `${name}.png`))
}

console.log('\nпопадание в стоп-кадры (первый кадр ролика / последний):')
for (const clip of CLIPS) {
  const list = frames[clip.file]
  console.log(
    `  ${clip.file.padEnd(6)} ${String(list.length).padStart(3)} кадров   начало ↔ ${clip.from.padEnd(5)} ${diff(list[0], stills[clip.from]).toFixed(1).padStart(4)}` +
      `   конец ↔ ${clip.to.padEnd(5)} ${diff(list.at(-1), stills[clip.to]).toFixed(1).padStart(4)}`,
  )
}

console.log('\nстыки роликов (последний кадр → первый кадр следующего):')
for (let k = 0; k < CLIPS.length - 1; k++) {
  const a = CLIPS[k].file
  const b = CLIPS[k + 1].file
  console.log(`  ${a} → ${b}   ${diff(frames[a].at(-1), frames[b][0]).toFixed(1)}`)
}

console.log('\nдвижение: разница соседних кадров, первые и последние 12 кадров ролика')
for (const clip of CLIPS) {
  const list = frames[clip.file]
  const d = list.slice(1).map((f, i) => diff(list[i], f))
  console.log(`  ${clip.file.padEnd(6)} старт ${d.slice(0, 12).map((x) => x.toFixed(1)).join(' ')}`)
  console.log(`  ${''.padEnd(6)} финиш ${d.slice(-12).map((x) => x.toFixed(1)).join(' ')}`)
  console.log(`  ${''.padEnd(6)} пик   ${Math.max(...d).toFixed(1)}`)
}

await rm(TMP, { recursive: true, force: true })
