const DB_NAME = 'aurora-automix'
const DB_VERSION = 1
const STORE_NAME = 'track-profiles'
const memoryCache = new Map()

let databasePromise = null

function openDatabase() {
  if (databasePromise) return databasePromise
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)

  databasePromise = new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {keyPath: 'key'})
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
  return databasePromise
}

export function createAutomixProfileCacheKey(songId, quality = 'exhigh', analysisVersion = 2) {
  return `${String(songId || '')}:${String(quality || 'exhigh')}:${Number(analysisVersion || 2)}`
}

export async function getCachedAutomixProfile(key) {
  if (!key) return null
  if (memoryCache.has(key)) return memoryCache.get(key)
  const database = await openDatabase()
  if (!database) return null

  return new Promise((resolve) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(key)
    request.onsuccess = () => {
      const profile = request.result?.result || request.result?.profile || null
      if (profile) memoryCache.set(key, profile)
      resolve(profile)
    }
    request.onerror = () => resolve(null)
  })
}

export async function putCachedAutomixProfile(key, profile) {
  if (!key || !profile) return false
  memoryCache.set(key, profile)
  const database = await openDatabase()
  if (!database) return false

  return new Promise((resolve) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const analyzedAt = Number(profile?.analyzed_at || Date.now())
    transaction.objectStore(STORE_NAME).put({
      key,
      version: Number(profile?.analysis_version || 0),
      analyzedAt,
      result: profile,
      // Keep the previous field for caches created by Automix 2.1/2.2.
      profile,
      cachedAt: analyzedAt,
    })
    transaction.oncomplete = () => resolve(true)
    transaction.onerror = () => resolve(false)
    transaction.onabort = () => resolve(false)
  })
}
