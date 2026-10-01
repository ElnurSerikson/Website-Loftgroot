/** Один жест — одна глава. Инерционный хвост тачпада не запускает следующую. */
export const SECTION_TRANSITION_MS = 1800
const GESTURE_GAP_MS = 200
const SETTLE_MS = 180

type Options = {
  fullPage: boolean
  onAnimating: (active: boolean) => void
}

export function createSectionScroll(getStops: () => number[], { fullPage, onAnimating }: Options) {
  let frame = 0
  let settleTimer = 0
  let running = false
  let pointerDown = false
  let lastWheel = -Infinity
  let wheelDistance = 0
  let wheelUsed = false
  let touch: { x: number; y: number; used: boolean } | null = null
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  const blocked = () =>
    document.body.style.overflow === 'hidden' ||
    document.documentElement.style.overflow === 'hidden' ||
    !!document.querySelector('[aria-modal="true"]')

  const stops = () => {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    return getStops().map((top) => Math.max(0, Math.min(top, max)))
  }
  const nearest = (positions: number[]) =>
    positions.reduce((best, top, index) =>
      Math.abs(top - window.scrollY) < Math.abs((positions[best] ?? 0) - window.scrollY) ? index : best, 0)

  const cancel = () => {
    cancelAnimationFrame(frame)
    window.clearTimeout(settleTimer)
    running = false
    onAnimating(false)
  }

  const jumpTo = (index: number) => {
    const positions = stops()
    const destination = positions[index]
    if (destination === undefined || blocked()) return
    cancel()
    const from = window.scrollY
    if (reducedMotion.matches || Math.abs(destination - from) < 1) {
      window.scrollTo({ top: destination, behavior: 'instant' })
      return
    }
    running = true
    onAnimating(true)
    const started = performance.now()
    const tick = (now: number) => {
      if (blocked()) return cancel()
      const progress = Math.min((now - started) / SECTION_TRANSITION_MS, 1)
      // Smoothstep: мягкий разгон и остановка без задержки в середине фильма.
      const eased = progress * progress * (3 - 2 * progress)
      window.scrollTo({ top: from + (destination - from) * eased, behavior: 'instant' })
      if (progress < 1) frame = requestAnimationFrame(tick)
      else {
        running = false
        onAnimating(false)
      }
    }
    frame = requestAnimationFrame(tick)
  }

  const step = (direction: number) => {
    const positions = stops()
    const index = nearest(positions)
    jumpTo(Math.max(0, Math.min(index + direction, positions.length - 1)))
  }

  const editable = (target: EventTarget | null) =>
    target instanceof Element && !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')

  const nestedScroll = (target: EventTarget | null, direction: number) => {
    for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
      if (!/(auto|scroll)/.test(getComputedStyle(el).overflowY)) continue
      if (direction > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true
      if (direction < 0 && el.scrollTop > 0) return true
    }
    return false
  }

  const onWheel = (event: WheelEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || blocked() || editable(event.target)) return
    if (!fullPage) {
      if (running) cancel()
      return
    }
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || nestedScroll(event.target, event.deltaY)) return
    event.preventDefault()
    const now = performance.now()
    if (now - lastWheel > GESTURE_GAP_MS) {
      wheelUsed = false
      wheelDistance = 0
    }
    lastWheel = now
    if (running || wheelUsed) {
      wheelUsed = true
      return
    }
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1)
    if (Math.sign(delta) !== Math.sign(wheelDistance)) wheelDistance = 0
    wheelDistance += delta
    if (Math.abs(wheelDistance) < 8) return
    wheelUsed = true
    step(Math.sign(wheelDistance))
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (!fullPage || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || blocked() || editable(event.target)) return
    if (event.key === 'Escape') return cancel()
    if (event.key === ' ' && event.target instanceof Element && event.target.closest('button, a, [role="button"]')) return
    const direction = ['ArrowDown', 'PageDown', ' '].includes(event.key) ? (event.shiftKey ? -1 : 1)
      : ['ArrowUp', 'PageUp'].includes(event.key) ? -1 : 0
    if (!direction && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    if (event.repeat || running) return
    if (event.key === 'Home') jumpTo(0)
    else if (event.key === 'End') jumpTo(stops().length - 1)
    else step(direction)
  }

  // На длинных мобильных секциях контент прокручивается свободно; доводчик
  // включается только рядом с границей, чтобы не пропускать текст и карточки.
  const settle = () => {
    window.clearTimeout(settleTimer)
    if (running || pointerDown || touch || blocked()) return
    settleTimer = window.setTimeout(() => {
      if (running || pointerDown || touch || blocked()) return
      const positions = stops()
      const index = nearest(positions)
      const distance = Math.abs((positions[index] ?? 0) - window.scrollY)
      if (distance > 1 && (fullPage || distance < Math.min(160, window.innerHeight * 0.2))) jumpTo(index)
    }, SETTLE_MS)
  }

  const onTouchStart = (event: TouchEvent) => {
    if (running && !fullPage) cancel()
    const point = event.touches[0]
    touch = point && event.touches.length === 1 && !blocked() && !editable(event.target)
      ? { x: point.clientX, y: point.clientY, used: false } : null
  }
  const onTouchMove = (event: TouchEvent) => {
    if (!fullPage || !touch || event.touches.length !== 1 || blocked()) return
    const point = event.touches[0]
    if (!point) return
    const dy = touch.y - point.clientY
    if (Math.abs(dy) < 16 || Math.abs(dy) <= Math.abs(touch.x - point.clientX) || nestedScroll(event.target, dy)) return
    event.preventDefault()
    if (touch.used) return
    touch.used = true
    if (!running) step(Math.sign(dy))
  }
  const onTouchEnd = () => { touch = null; settle() }
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    pointerDown = true
    cancel()
  }
  const onPointerUp = () => { pointerDown = false; settle() }
  const onResize = () => { cancel(); settle() }
  const onMotionChange = () => { if (reducedMotion.matches) cancel() }

  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('scroll', settle, { passive: true })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
  window.addEventListener('touchcancel', onTouchEnd, { passive: true })
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  window.addEventListener('pointerup', onPointerUp, { passive: true })
  window.addEventListener('pointercancel', onPointerUp, { passive: true })
  window.addEventListener('resize', onResize)
  reducedMotion.addEventListener('change', onMotionChange)

  return {
    jumpTo,
    destroy: () => {
      cancel()
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', settle)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('resize', onResize)
      reducedMotion.removeEventListener('change', onMotionChange)
    },
  }
}
