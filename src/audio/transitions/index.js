import {TRANSITION_FAMILY} from '@/audio/constants.js'
import {TransitionRegistry} from '@/audio/transitions/TransitionRegistry.js'

export const transitionRegistry = new TransitionRegistry()

transitionRegistry
  .register('gapless', {family: TRANSITION_FAMILY.DIRECT, fallback: 'safe_fade'})
  .register('quick_cut', {family: TRANSITION_FAMILY.DIRECT, fallback: 'safe_fade'})
  .register('safe_fade', {family: TRANSITION_FAMILY.CROSSFADE})
  .register('vocal_safe_fade', {family: TRANSITION_FAMILY.CROSSFADE, fallback: 'safe_fade'})
  .register('phrase_crossfade', {
    family: TRANSITION_FAMILY.CROSSFADE,
    requiresWebAudio: true,
    fallback: 'safe_fade',
  })
  .register('beat_mix', {
    family: TRANSITION_FAMILY.BEAT_MATCH,
    requiresWebAudio: true,
    requiresAudioWorklet: true,
    requiresBeatGrid: true,
    fallback: 'phrase_crossfade',
  })
  .register('echo_filter_out', {
    family: TRANSITION_FAMILY.FILTER,
    requiresWebAudio: true,
    requiresAudioWorklet: true,
    fallback: 'safe_fade',
  })
  .register('loop_bridge', {
    family: TRANSITION_FAMILY.LOOP,
    requiresWebAudio: true,
    requiresBeatGrid: true,
    requiresSampleAccurateLoop: true,
    fallback: 'safe_fade',
  })

export function resolveTransitionExecution(transition, capabilities) {
  return transitionRegistry.resolveExecution(transition, capabilities)
}
