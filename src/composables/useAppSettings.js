import {readonly, ref} from 'vue'
import { requireFeature } from '../utils/maintenanceAccess.js'

const settingsOpen = ref(false)

export function openAppSettings() { if (requireFeature('feature.settings')) settingsOpen.value = true }
export function closeAppSettings() { settingsOpen.value = false }
export function useAppSettings() {
  return {settingsOpen: readonly(settingsOpen), openAppSettings, closeAppSettings}
}
