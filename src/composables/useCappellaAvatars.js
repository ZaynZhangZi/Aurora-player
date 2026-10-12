import {computed, ref, watch} from 'vue'
import {useCounterStore} from '@/stores/userStores.js'
import {artistApi} from '@/api/artistApi/artistApi.js'
import {normalizeMediaUrl} from '@/utils/mediaUrl.js'
import {FOLIA_ARTIST_AVATAR, FOLIA_USER_AVATAR} from '@/utils/player/foliaAvatars.js'

const artistAvatarCache = new Map()
const artistImage = artist => normalizeMediaUrl(artist?.avatar || artist?.avatarUrl || artist?.img1v1Url || artist?.picUrl || artist?.cover || artist?.coverUrl || '')

export function useCappellaAvatars(props) {
  const user = useCounterStore()
  const artist = computed(() => props.musicArtists.find(item => item && typeof item === 'object') || null)
  const fetchedAvatar = ref('')
  const userAvatar = computed(() => normalizeMediaUrl(user.isLoggedIn ? user.avatarUrl : '') || FOLIA_USER_AVATAR)
  const artistAvatar = computed(() => artistImage(artist.value) || fetchedAvatar.value || normalizeMediaUrl(props.cover) || FOLIA_ARTIST_AVATAR)

  watch([() => props.opened && props.mode === 'cappella', () => artist.value?.id || artist.value?.artistId, () => artistImage(artist.value)], ([enabled, id, embedded], _, onCleanup) => {
    fetchedAvatar.value = ''
    if (!enabled || embedded || !id || Number(id) <= 0) return
    const key = String(id)
    if (artistAvatarCache.has(key)) { fetchedAvatar.value = artistAvatarCache.get(key); return }
    const controller = new AbortController()
    let active = true
    onCleanup(() => {active = false; controller.abort()})
    void artistApi.getArtistInfo(id, {signal: controller.signal}).then(response => {
      if (!active) return
      const url = artistImage(response?.data?.data?.artist || response?.data?.artist)
      if (!url) return
      fetchedAvatar.value = url
      artistAvatarCache.set(key, url)
      if (artistAvatarCache.size > 100) artistAvatarCache.delete(artistAvatarCache.keys().next().value)
    }).catch(() => { /* Retain the cover/default avatar when singer metadata is unavailable. */ })
  }, {immediate: true})

  return {userAvatar, artistAvatar}
}
