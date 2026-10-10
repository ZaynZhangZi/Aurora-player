import {markRaw, reactive} from 'vue'
import {initialShareLine, normalizeShareLines, normalizeShareSong} from '@/utils/lyricShare.js'

export const lyricShare = reactive({open: false, session: 0, song: null, lines: [], initialId: ''})

export function openLyricShare(song, rawLines, initial = {}) {
  const lines = normalizeShareLines(rawLines)
  if (!lines.length) return false
  Object.assign(lyricShare, {
    open: true, session: lyricShare.session + 1,
    song: markRaw(normalizeShareSong(song)), lines: markRaw(lines), initialId: initialShareLine(lines, initial),
  })
  return true
}

export function closeLyricShare() { lyricShare.open = false }
