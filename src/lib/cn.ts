/** Склейка классов: пропускает false, null и undefined. */
export const cn = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ')
