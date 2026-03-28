import {ref} from 'vue'

export const activePlaylistTransitionId = ref(null)

export function setActivePlaylistTransitionId(id) {
  const num = Number(id)
  activePlaylistTransitionId.value = Number.isFinite(num) && num > 0 ? num : null
}

export function runViewTransition(update, {skipIfReduced = true} = {}) {
  let updateResult

  if (typeof window === 'undefined') {
    updateResult = update()
    return Promise.resolve(updateResult)
  }

  const start = document.startViewTransition
  if (typeof start !== 'function') {
    updateResult = update()
    return Promise.resolve(updateResult)
  }

  if (skipIfReduced && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    updateResult = update()
    return Promise.resolve(updateResult)
  }

  try {
    const transition = start(async () => {
      updateResult = await update()
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      })
    })
    const finished = transition?.finished?.catch(() => {}) || Promise.resolve()
    return finished.then(() => updateResult)
  } catch {
    updateResult = update()
    return Promise.resolve(updateResult)
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
