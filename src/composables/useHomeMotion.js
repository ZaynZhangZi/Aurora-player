import { animate, hover, inView, press } from 'motion'

export function useHomeMotion() {
  const motionCleanups = []

  function setupMotionEffects() {
    if (typeof window === 'undefined') return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const sections = document.querySelectorAll('.motion-section')
    sections.forEach((el) => {
      const stop = inView(
        el,
        () => {
          animate(
            el,
            { opacity: [0, 1], y: [24, -3, 0], scale: [0.985, 1.01, 1], filter: ['blur(10px)', 'blur(1px)', 'blur(0px)'] },
            { type: 'spring', stiffness: 210, damping: 25, mass: 0.72 },
          )
        },
        { amount: 0.2 },
      )
      motionCleanups.push(stop)
    })

    const canUsePointerMotion = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!canUsePointerMotion) return

    const cards = document.querySelectorAll('.motion-card')
    cards.forEach((el) => {
      const stopHover = hover(el, () => {
        const ctrl = animate(el, { y: -6, scale: 1.012 }, { type: 'spring', stiffness: 420, damping: 30, mass: 0.42 })
        return () => ctrl.stop()
      })
      const stopPress = press(el, () => {
        const down = animate(el, { scale: 0.978 }, { type: 'spring', stiffness: 560, damping: 32, mass: 0.28 })
        return () => {
          down.stop()
          animate(el, { scale: 1 }, { type: 'spring', stiffness: 420, damping: 24, mass: 0.34 })
        }
      })
      motionCleanups.push(stopHover)
      motionCleanups.push(stopPress)
    })
  }

  function cleanupMotionEffects() {
    motionCleanups.splice(0).forEach((stop) => {
      if (typeof stop === 'function') stop()
    })
  }

  return {
    setupMotionEffects,
    cleanupMotionEffects,
  }
}
