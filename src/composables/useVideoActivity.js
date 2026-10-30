import {onScopeDispose, watch} from 'vue'

// Preserve manual pauses, and queue explicit play requests while offscreen.
export function useVideoActivity(videoRef, active, autoplay) {
  let element = null
  let resume = false
  let attemptedAutoplay = false

  function play() {
    resume = true
    if (!element || !active.value) return Promise.resolve()
    resume = false
    attemptedAutoplay = true
    return element.play()
  }

  function pause() {
    resume = false
    element?.pause()
  }

  const stop = watch([videoRef, active, autoplay], ([video, visible]) => {
    if (element !== video) {
      element?.pause()
      element = video
      resume = false
      attemptedAutoplay = false
    }
    if (!element) return
    if (!visible) {
      resume = resume || !element.paused
      element.pause()
    } else if (resume || (autoplay.value && !attemptedAutoplay)) {
      void play()?.catch(() => {})
    }
  }, {immediate: true, flush: 'post'})

  onScopeDispose(() => { stop(); element?.pause(); element = null })
  return {play, pause}
}
