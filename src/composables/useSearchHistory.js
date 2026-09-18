import { ref } from 'vue'

const STORAGE_KEY = 'aurora:search-history'
const MAX_ITEMS = 8

function canStore() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function read() {
  if (!canStore()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    if (!Array.isArray(list)) return []
    return list
      .filter((item) => typeof item === 'string' && item.trim())
      .map((item) => item.trim())
      .slice(0, MAX_ITEMS)
  } catch {
    return []
  }
}

function persist(list) {
  if (!canStore()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* 隐私模式/配额满：忽略写入失败，历史仅本次会话可用 */
  }
}

export function useSearchHistory() {
  const history = ref(read())

  function add(term) {
    const value = String(term || '').trim()
    if (!value) return
    const next = [
      value,
      ...history.value.filter((item) => item.toLowerCase() !== value.toLowerCase()),
    ].slice(0, MAX_ITEMS)
    history.value = next
    persist(next)
  }

  function remove(term) {
    const next = history.value.filter((item) => item !== term)
    history.value = next
    persist(next)
  }

  function clear() {
    history.value = []
    persist([])
  }

  return { history, add, remove, clear }
}
