export const AUTOMIX_STATE = Object.freeze({
  IDLE: 'IDLE',
  PLAYING: 'PLAYING',
  PREPARING: 'PREPARING',
  READY: 'READY',
  TRANSITIONING: 'TRANSITIONING',
  PAUSED: 'PAUSED',
  ERROR: 'ERROR',
})

export const ANALYZER_STATUS = Object.freeze({
  IDLE: 'idle',
  CACHE: 'cache',
  LOADING: 'loading',
  DECODING: 'decoding',
  ANALYZING: 'analyzing',
  CACHING: 'caching',
  COMPLETE: 'complete',
  ERROR: 'error',
  ABORTED: 'aborted',
})

export const MAX_ANALYSIS_LOOKAHEAD = 2
export const AUTOMIX_MAX_TEMPO_SHIFT = 0.06

export const TRANSITION_FAMILY = Object.freeze({
  DIRECT: 'direct',
  CROSSFADE: 'crossfade',
  BEAT_MATCH: 'beatMatch',
  FILTER: 'filter',
  LOOP: 'loop',
})
