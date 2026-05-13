const DEFAULT_BACKEND_BASE = '/backend-api'

function trimRightSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}

export function backendBaseUrl() {
  const configured = import.meta.env.VITE_ADMIN_API_BASE_URL
  if (configured) return trimRightSlash(configured)
  if (typeof window !== 'undefined' && window.location.hostname === 'music.xiaojunjunjun.com') {
    return 'https://musicadmin.xiaojunjunjun.com'
  }
  return trimRightSlash(DEFAULT_BACKEND_BASE)
}

export function toBackendMediaUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^blob:|^data:/i.test(raw)) return raw
  if (/^https?:\/\//i.test(raw)) return raw
  const base = backendBaseUrl()
  if (raw.startsWith(`${base}/`)) return raw
  if (raw.startsWith('/api/')) return `${base}${raw}`
  if (raw.startsWith('api/')) return `${base}/${raw}`
  return raw
}

export function toBackendRequestUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const base = backendBaseUrl()
  if (raw.startsWith(`${base}/`)) return raw.slice(base.length)
  if (raw.startsWith('/api/')) return raw
  if (raw.startsWith('api/')) return `/${raw}`
  return raw
}
