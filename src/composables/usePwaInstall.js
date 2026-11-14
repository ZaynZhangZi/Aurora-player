import {computed, readonly, ref, shallowRef} from 'vue'

const installPrompt = shallowRef(null)
const installed = ref(false)
const installing = ref(false)
const canInstall = computed(() => Boolean(installPrompt.value) && !installed.value)

export function initPwaInstall() {
  const standalone = window.matchMedia('(display-mode: standalone)')
  const syncDisplayMode = () => {
    if (standalone.matches || navigator.standalone === true) {
      installed.value = true
      installPrompt.value = null
    }
  }
  syncDisplayMode()
  standalone.addEventListener('change', syncDisplayMode)

  window.addEventListener('beforeinstallprompt', event => {
    if (installed.value) return
    event.preventDefault()
    installPrompt.value = event
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    installPrompt.value = null
  })
}

async function requestInstall() {
  if (!canInstall.value || installing.value) return
  const event = installPrompt.value
  installPrompt.value = null
  installing.value = true
  try {
    const choice = await event.prompt()
    if ((choice ?? await event.userChoice)?.outcome === 'accepted') {
      installed.value = true
      installPrompt.value = null
    }
  } finally {
    installing.value = false
  }
}

export function usePwaInstall() {
  return {canInstall, installed: readonly(installed), installing: readonly(installing), requestInstall}
}
