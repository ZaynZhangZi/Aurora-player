import { requireFeature } from './maintenanceAccess.js'
export const OPEN_LOGIN_DIALOG_EVENT = 'aurora:open-login-dialog'

export function openLoginDialog() {
  if (!requireFeature('feature.login')) return
  window.dispatchEvent(new CustomEvent(OPEN_LOGIN_DIALOG_EVENT))
}
