/**
 * playlistFlipHero.js — 兼容层（委托给 heroTransition.js）
 *
 * 保持原有导出 API 不变，内部全部委托 heroTransition.js 的泛化版本，
 * 传入 namespace: 'playlist'。
 * 已接入的 home.vue 和 playlistDetail.vue 零改动。
 */
import {
  setPendingTransition,
  consumePendingTransition,
  consumeLatestPendingTransition,
  peekPendingTransition,
  playHeroEnter,
} from './heroTransition.js'

const NS = 'playlist'

export function setPendingPlaylistHeroTransition(id, payload = {}) {
  return setPendingTransition(NS, id, payload)
}

export function consumeLatestPendingPlaylistHeroTransition(options) {
  return consumeLatestPendingTransition(NS, options)
}

export function peekPendingPlaylistHeroTransition(id, options) {
  return peekPendingTransition(NS, id, options)
}

export function consumePendingPlaylistHeroTransition(id, options) {
  return consumePendingTransition(NS, id, options)
}

/** @deprecated 直接用 playHeroEnter */
export async function playPlaylistHeroEnter(options) {
  return playHeroEnter(options)
}
