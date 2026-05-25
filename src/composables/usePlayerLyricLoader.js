import { songsApi } from '@/api/songsApi/songsApi.js'

export function usePlayerLyricLoader(options) {
  const {
    getSongName,
    getFirstArtistName,
    getCurrentSong,
    hasLyricText,
    extractLyricPayloadFromSearchResult,
    normalizeLyricPayloadToAmll,
    collectLyricRowsForTranslate,
    attachAiTranslationIfNeeded,
    isLyricTranslateEnabled,
    setLyricLines,
  } = options

  let lyricLoadToken = 0

  async function tryLoadLyricFromSearch(songId, title = '', artist = '') {
    if (!title) title = String(getSongName() || '').trim()
    if (!artist) artist = String(getFirstArtistName() || '').trim()
    const keyword = [title, artist].filter(Boolean).join('-')

    try {
      const response = await songsApi.getLyricSearch({
        keyword,
        id: songId,
        name: title,
        artist,
      })
      const payload = extractLyricPayloadFromSearchResult(response?.data ?? response)
      return hasLyricText(payload || {}) ? payload : null
    } catch {
      return null
    }
  }

  async function loadCurrentSongLyric(songId) {
    const requestToken = ++lyricLoadToken
    const id = Number(songId)
    if (!Number.isFinite(id) || id <= 0) {
      if (requestToken === lyricLoadToken) setLyricLines([])
      return
    }

    const currentSong = getCurrentSong()
    const snapshotTitle = String(currentSong?.name || '').trim()
    const snapshotArtist = String((currentSong?.artists || [])[0]?.name || '').trim()

    let lyricPayload = await tryLoadLyricFromSearch(id, snapshotTitle, snapshotArtist)
    if (requestToken !== lyricLoadToken) return

    if (!hasLyricText(lyricPayload || {})) {
      if (requestToken !== lyricLoadToken) return
      try {
        const { data: newData } = await songsApi.getLyricNew(id)
        if (requestToken !== lyricLoadToken) return
        const hasWordByWord = /\[\d+,\d+\]\(\d+,\d+,\d+\)/.test(String(newData?.yrc?.lyric || ''))
        if (hasWordByWord && hasLyricText(newData || {})) {
          lyricPayload = newData || {}
        } else {
          const { data: normalData } = await songsApi.getLyric(id)
          if (requestToken !== lyricLoadToken) return
          lyricPayload = normalData || {}
        }
      } catch {
        if (requestToken !== lyricLoadToken) return
        try {
          const { data: normalData } = await songsApi.getLyric(id)
          if (requestToken !== lyricLoadToken) return
          lyricPayload = normalData || {}
        } catch {
          lyricPayload = null
        }
      }
    }

    if (!lyricPayload) {
      if (requestToken === lyricLoadToken) setLyricLines([])
      return
    }

    const baseLines = normalizeLyricPayloadToAmll(lyricPayload)
    if (requestToken !== lyricLoadToken) return
    setLyricLines(baseLines)

    if (!isLyricTranslateEnabled()) return

    const hasMissingTranslation = baseLines.some(
      (line) => line.words?.some((w) => w.word?.trim()) && !line.translatedLyric?.trim(),
    )
    if (!hasMissingTranslation) return

    const rows = collectLyricRowsForTranslate(lyricPayload)
    const sourceText = rows.map((row) => row.text).join('\n')
    const needsTranslation = rows.length > 0 && sourceText
    if (!needsTranslation) return

    setLyricLines(
      baseLines.map((line) => {
        if (line.translatedLyric?.trim()) return line
        if (!line.words?.some((w) => w.word?.trim())) return line
        return { ...line, translatedLyric: '正在翻译...' }
      }),
    )

    Promise.resolve().then(async () => {
      const translatedPayload = await attachAiTranslationIfNeeded(
        lyricPayload,
        id,
        isLyricTranslateEnabled(),
      )
      if (requestToken !== lyricLoadToken) return
      if (translatedPayload === lyricPayload) {
        setLyricLines(baseLines)
        return
      }

      const translatedLines = normalizeLyricPayloadToAmll(translatedPayload)
      if (!translatedLines.length) return
      setLyricLines(translatedLines)
    })
  }

  return {
    loadCurrentSongLyric,
  }
}
