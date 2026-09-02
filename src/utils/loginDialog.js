export const OPEN_LOGIN_DIALOG_EVENT = 'aurora:open-login-dialog'

export function openLoginDialog() {
  window.dispatchEvent(new CustomEvent(OPEN_LOGIN_DIALOG_EVENT))
}
