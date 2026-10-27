import {readonly, ref} from 'vue'
import {requireFeature} from '../utils/maintenanceAccess.js'
import {normalizePlayerAppearance, PLAYER_APPEARANCE_STORAGE_KEY} from '@/utils/player/playerAppearance.js'
import {normalizeFoliaBackground, FOLIA_BACKGROUND_STORAGE_KEY} from '@/utils/player/foliaBackground.js'

function readPreference() {
  try {
    return normalizePlayerAppearance(globalThis.localStorage?.getItem(PLAYER_APPEARANCE_STORAGE_KEY))
  } catch {
    return 'amll'
  }
}

const playerAppearance = ref(readPreference())
const foliaBackground = ref((() => {
  try { return normalizeFoliaBackground(globalThis.localStorage?.getItem(FOLIA_BACKGROUND_STORAGE_KEY)) }
  catch { return 'reference' }
})())

export function usePlayerAppearance() {
  function setPlayerAppearance(value) {
    if (!requireFeature('feature.settings')) return
    playerAppearance.value = normalizePlayerAppearance(value)
    try {
      globalThis.localStorage?.setItem(PLAYER_APPEARANCE_STORAGE_KEY, playerAppearance.value)
    } catch {
      // The choice still applies when browser storage is unavailable.
    }
  }

  function setFoliaBackground(value) {
    if (!requireFeature('feature.settings')) return
    foliaBackground.value = normalizeFoliaBackground(value)
    try { globalThis.localStorage?.setItem(FOLIA_BACKGROUND_STORAGE_KEY, foliaBackground.value) }
    catch { /* Keep the current choice when storage is unavailable. */ }
  }

  return {playerAppearance: readonly(playerAppearance), setPlayerAppearance,
    foliaBackground: readonly(foliaBackground), setFoliaBackground}
}
