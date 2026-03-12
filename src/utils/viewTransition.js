import {ref} from 'vue'

export const activePlaylistTransitionId = ref(null)

export function setActivePlaylistTransitionId(id) {
  const num = Number(id)
  activePlaylistTransitionId.value = Number.isFinite(num) && num > 0 ? num : null
}

export function runViewTransition(update, {skipIfReduced = true} = {}) {
  if (typeof window === 'undefined') {
    update()
    return Promise.resolve()
  }

  const start = document.startViewTransition
  if (typeof start !== 'function') {
    update()
    return Promise.resolve()
  }

  if (skipIfReduced && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update()
    return Promise.resolve()
  }

  try {
    const transition = start(async () => {
      await update()
      await new Promise((resolve) => {
        requestAnimationFrame(() => resolve())
      })
    })
    return transition?.finished?.catch(() => {}) || Promise.resolve()
  } catch {
    update()
    return Promise.resolve()
  }
}

function sanitizeTransitionId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_')
}

export function buildPlaylistTransitionName(id, part = 'card') {
  const safeId = sanitizeTransitionId(id)
  if (!safeId) return ''
  return `playlist-${part}-${safeId}`
}
