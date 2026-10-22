<template>
  <span hidden data-startup-loading aria-hidden="true" />
</template>

<script setup>
import {onBeforeUnmount, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {runAppBootstrap} from '@/utils/appBootstrap.js'

const props = defineProps({minDuration: {type: Number, default: 280}})
const emit = defineEmits(['complete'])
const router = useRouter()
const controller = new AbortController()
let finishTimer = null
let screen = null

onMounted(async () => {
  // The independent loading screen is already interactive while Vue downloads.
  screen = document.getElementById('aurora-boot')
  try {
    await runAppBootstrap({
      router,
      signal: controller.signal,
      onProgress: (value, label) => screen?.setProgress?.(value, label),
    })
  } finally {
    if (!controller.signal.aborted) {
      // Count time since navigation, including the initial bundle download.
      const remaining = Math.max(0, props.minDuration - performance.now())
      finishTimer = setTimeout(async () => {
        if (controller.signal.aborted) return
        const restoreFocus = Boolean(screen?.interactionFocused || screen?.shadowRoot?.activeElement)
        if (typeof screen?.finish === 'function') await screen.finish()
        else screen?.remove()
        if (controller.signal.aborted) return
        emit('complete', {restoreFocus})
      }, remaining)
    }
  }
})

onBeforeUnmount(() => {
  controller.abort()
  clearTimeout(finishTimer)
  screen?.remove()
})
</script>
