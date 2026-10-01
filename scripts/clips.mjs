/**
 * Монтаж фильма: пять роликов подряд. Один список на сборку (build-film) и
 * замер стыков (inspect-seams).
 *
 * Каждый ролик снят от стоп-кадра к стоп-кадру: from / to — имя PNG в docs
 * без расширения. Сцена стоит на каждом стоп-кадре из STOPS.
 *
 * fadeIn / fadeOut — кадров растворения из PNG остановки в видео на старте и
 * из видео в PNG следующей остановки в конце. Длины — по замеру
 * (npm run seams, разница яркости 160×90): см. таблицу в README.
 */
export const CLIPS_DIR = 'docs'

export const CLIPS = [
  { file: 'video1.mp4', from: 'foto1', to: 'foto2', fadeIn: 8, fadeOut: 8 },
  { file: 'video2.mp4', from: 'foto2', to: 'foto3', fadeIn: 8, fadeOut: 8 },
  { file: 'video3.mp4', from: 'foto3', to: 'foto4', fadeIn: 8, fadeOut: 8 },
  { file: 'video4.mp4', from: 'foto4', to: 'foto5', fadeIn: 8, fadeOut: 8 },
  { file: 'video5.mp4', from: 'foto5', to: 'Foto6', fadeIn: 8, fadeOut: 8 },
]

/** Стоп-кадры, на которых стоят сцены, по порядку. */
export const STOPS = ['foto1', 'foto2', 'foto3', 'foto4', 'foto5', 'Foto6']

export const isStop = (still) => STOPS.includes(still)
