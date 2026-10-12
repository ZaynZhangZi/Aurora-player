import {readonly, ref} from 'vue'

const settingsOpen = ref(false)

export function openAppSettings() { settingsOpen.value = true }
export function closeAppSettings() { settingsOpen.value = false }
export function useAppSettings() {
  return {settingsOpen: readonly(settingsOpen), openAppSettings, closeAppSettings}
}
