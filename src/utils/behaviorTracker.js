import { reportApi } from '@/api/reportApi/reportApi.js'

let installed = false
let currentRoute = null
let routeStartedAt = Date.now()
let maxScrollPercent = 0
let scrollMarks = new Set()
let scrollTimer = 0
let lastSignature = ''
let lastSignatureAt = 0

const CLICK_DEDUP_MS = 800
const SCROLL_MARKS = [25, 50, 75, 90]

function safeString(value, max = 160) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max)
}

function getRouteInfo(route = currentRoute) {
  return {
    name: safeString(route?.name || 'unknown', 80),
    path: safeString(route?.fullPath || route?.path || window.location.pathname, 220),
  }
}

function getScrollPercent() {
  const doc = document.documentElement
  const body = document.body
  const scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0
  const height = Math.max(doc.scrollHeight, body.scrollHeight) - window.innerHeight
  if (height <= 0) return 100
  return Math.min(100, Math.max(0, Math.round((scrollTop / height) * 100)))
}

function findTrackableElement(target) {
  if (!(target instanceof Element)) return null
  const matched = target.closest([
    '[data-track-action]',
    '[data-track-label]',
    '[data-playlist-id]',
    '[data-song-id]',
    '[data-id]',
    'button',
    'a',
    '[role="button"]',
    'input',
    'select',
    'textarea',
  ].join(','))
  if (matched) return matched

  let el = target
  let depth = 0
  while (el && el !== document.body && depth < 8) {
    const style = window.getComputedStyle(el)
    const className = String(el.className || '')
    const looksInteractive =
      style.cursor === 'pointer' ||
      el.getAttribute('tabindex') !== null ||
      className.includes('cursor-pointer') ||
      className.includes('click') ||
      className.includes('playlist') ||
      className.includes('song') ||
      className.includes('card') ||
      Boolean(el._vei?.onClick)
    if (looksInteractive) return el
    el = el.parentElement
    depth += 1
  }

  return target
}

function getText(el) {
  if (!el) return ''
  const inputText = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder')
  const text = inputText || el.innerText || el.textContent || el.value || ''
  return safeString(text, 140)
}

function getArea(el) {
  const area = el?.closest?.('[data-track-section], nav, header, main, aside, footer, section')
  if (!area) return 'page'
  return safeString(
    area.getAttribute('data-track-section') ||
      area.getAttribute('aria-label') ||
      area.id ||
      area.className ||
      area.tagName.toLowerCase(),
    100,
  )
}

function getTarget(el) {
  if (!el) return 'unknown'
  return safeString(
    el.getAttribute('data-track-target') ||
      el.getAttribute('data-track-label') ||
      el.getAttribute('data-song-id') ||
      el.getAttribute('data-playlist-id') ||
      el.getAttribute('data-id') ||
      el.getAttribute('href') ||
      getText(el) ||
      el.id ||
      el.className ||
      el.tagName.toLowerCase(),
    180,
  )
}

function getActionType(el) {
  const custom = el?.getAttribute?.('data-track-action')
  if (custom) return safeString(custom, 60).toUpperCase()
  const tag = el?.tagName?.toLowerCase()
  if (tag === 'a') return 'NAV_CLICK'
  if (tag === 'button' || el?.getAttribute?.('role') === 'button') return 'BUTTON_CLICK'
  if (el?.matches?.('[data-song-id],[data-playlist-id],[data-id]')) return 'CONTENT_CLICK'
  if (['input', 'select', 'textarea'].includes(tag)) return 'FORM_CLICK'
  return 'UI_CLICK'
}

function buildElementDetail(el, event) {
  const route = getRouteInfo()
  return {
    routeName: route.name,
    routePath: route.path,
    area: getArea(el),
    tag: safeString(el?.tagName?.toLowerCase(), 40),
    text: getText(el),
    id: safeString(el?.id, 80),
    classes: safeString(el?.className, 160),
    href: safeString(el?.getAttribute?.('href'), 220),
    x: Math.round(event?.clientX || 0),
    y: Math.round(event?.clientY || 0),
    scrollPercent: getScrollPercent(),
    at: new Date().toISOString(),
  }
}

function sendBehavior(actionType, actionTarget, detail = {}) {
  const payload = JSON.stringify(detail).slice(0, 1800)
  if (import.meta.env.DEV || localStorage.getItem('behavior_debug') === '1') {
    console.debug('[behavior]', actionType, actionTarget, detail)
  }
  reportApi.reportBehavior({
    actionType: safeString(actionType, 60),
    actionTarget: safeString(actionTarget, 240),
    actionDetail: payload,
  })
}

function handleClick(event) {
  const el = findTrackableElement(event.target)
  if (!el) return

  const actionType = getActionType(el)
  const actionTarget = getTarget(el)
  const routePath = getRouteInfo().path
  const signature = `${actionType}:${actionTarget}:${routePath}`
  const now = Date.now()
  if (signature === lastSignature && now - lastSignatureAt < CLICK_DEDUP_MS) return
  lastSignature = signature
  lastSignatureAt = now

  sendBehavior(actionType, actionTarget, buildElementDetail(el, event))
}

function handleChange(event) {
  const el = findTrackableElement(event.target)
  if (!el || !['input', 'select', 'textarea'].includes(el.tagName?.toLowerCase())) return
  sendBehavior('FORM_CHANGE', getTarget(el), {
    ...buildElementDetail(el, event),
    inputType: safeString(el.getAttribute('type') || el.tagName.toLowerCase(), 40),
    hasValue: Boolean(el.value),
  })
}

function resetRouteState(route) {
  currentRoute = route
  routeStartedAt = Date.now()
  maxScrollPercent = getScrollPercent()
  scrollMarks = new Set()
}

function reportDwell(nextRoute = null) {
  const route = getRouteInfo()
  const durationSec = Math.round((Date.now() - routeStartedAt) / 1000)
  if (durationSec < 3) return
  sendBehavior('ROUTE_DWELL', route.path, {
    routeName: route.name,
    routePath: route.path,
    durationSec,
    maxScrollPercent,
    nextPath: nextRoute?.fullPath || nextRoute?.path || '',
    at: new Date().toISOString(),
  })
}

function handleScroll() {
  if (scrollTimer) return
  scrollTimer = window.setTimeout(() => {
    scrollTimer = 0
    const percent = getScrollPercent()
    maxScrollPercent = Math.max(maxScrollPercent, percent)
    for (const mark of SCROLL_MARKS) {
      if (percent >= mark && !scrollMarks.has(mark)) {
        scrollMarks.add(mark)
        const route = getRouteInfo()
        sendBehavior('SCROLL_DEPTH', route.path, {
          routeName: route.name,
          routePath: route.path,
          depth: mark,
          currentPercent: percent,
          at: new Date().toISOString(),
        })
      }
    }
  }, 500)
}

export function installBehaviorTracker(router) {
  if (installed || typeof window === 'undefined') return
  installed = true

  resetRouteState(router?.currentRoute?.value || null)
  router?.afterEach?.((to) => {
    reportDwell(to)
    resetRouteState(to)
  })

  document.addEventListener('click', handleClick, true)
  document.addEventListener('change', handleChange, true)
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('pagehide', () => reportDwell(null))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') reportDwell(null)
  })
}
