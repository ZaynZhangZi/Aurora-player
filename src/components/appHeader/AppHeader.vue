<template>
  <header class="aurora-header">
    <div class="aurora-header-inner">
      <button class="aurora-brand" type="button" @click="goHome">
        <span class="aurora-brand-mark" aria-hidden="true">A</span>
        <span>AURORA</span>
      </button>

      <nav class="aurora-nav" aria-label="主导航">
        <button type="button" :class="{ 'is-active': isHome }" @click="goHome">首页</button>
        <button type="button" :class="{ 'is-active': isDiscover }" @click="openDiscover">发现</button>
        <button type="button" :class="{ 'is-active': isProfile }" @click="openProfile">音乐库</button>
      </nav>

      <div class="aurora-header-search">
        <slot name="search">
          <button class="aurora-search-trigger" type="button" @click="openSearch">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span>搜索歌曲、歌手或歌单</span>
            <kbd>⌘ K</kbd>
          </button>
        </slot>
      </div>

      <div ref="profileMenuRef" class="aurora-profile-wrap">
        <button
          class="aurora-profile"
          :class="{ 'is-guest': !userStore.isLoggedIn, 'has-unread': totalMessageBadge > 0 }"
          type="button"
          :aria-expanded="userStore.isLoggedIn ? profileMenuOpen : undefined"
          :aria-label="userStore.isLoggedIn ? '打开个人菜单' : '登录网易云音乐'"
          @click="handleProfileClick"
        >
          <img v-if="userStore.avatarUrl" :src="userStore.avatarUrl" alt="用户头像" />
          <span v-else-if="userStore.isLoggedIn">{{ profileInitial }}</span>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.25" />
            <path d="M5.75 19c.7-3.15 3-5 6.25-5s5.55 1.85 6.25 5" />
          </svg>
        </button>

        <Transition name="profile-menu">
          <div v-if="userStore.isLoggedIn && profileMenuOpen" class="aurora-profile-menu">
            <header>
              <img v-if="userStore.avatarUrl" :src="userStore.avatarUrl" alt="" />
              <span v-else>{{ profileInitial }}</span>
              <div><small>SIGNED IN</small><strong>{{ userStore.nickname || '我的音乐空间' }}</strong></div>
            </header>
            <nav aria-label="个人功能">
              <button type="button" :class="{ 'is-active': isMessages }" @click="openMessages">
                <svg viewBox="0 0 24 24"><path d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h10.5a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25H10l-4.5 3v-3.3a2.25 2.25 0 0 1-1-1.95v-7.5Z"/><path d="M8 9h8M8 12h5"/></svg>
                <span><strong>消息中心</strong><small>通知与私信</small></span>
                <i v-if="totalMessageBadge">{{ badgeText(totalMessageBadge) }}</i><b v-else>→</b>
              </button>
              <button type="button" :class="{ 'is-active': isMoments }" @click="openMoments">
                <svg viewBox="0 0 24 24"><path d="M8 18V6l10-2v12"/><circle cx="5.5" cy="18" r="2.5"/><circle cx="15.5" cy="16" r="2.5"/></svg>
                <span><strong>音乐动态</strong><small>关注与分享</small></span>
                <b>→</b>
              </button>
              <button type="button" :class="{ 'is-active': isProfile }" @click="openProfile">
                <svg viewBox="0 0 24 24"><path d="M5 5.5h14v13H5z"/><path d="M8 9h8M8 12h6M8 15h4"/></svg>
                <span><strong>我的音乐库</strong><small>歌单、云盘与画像</small></span>
                <b>→</b>
              </button>
            </nav>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<script setup>
import {computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useCounterStore} from '@/stores/userStores.js'
import {useMessageCenter} from '@/composables/useMessageCenter.js'
import {openLoginDialog} from '@/utils/loginDialog.js'

const route = useRoute()
const router = useRouter()
const userStore = useCounterStore()
const profileMenuRef = ref(null)
const profileMenuOpen = ref(false)
const {noticeBadgeCount, privateBadgeCount, refreshMessageBadges} = useMessageCenter(userStore)

const isProfile = computed(() => ['profile', 'profilePlaylistDetail'].includes(String(route.name || '')))
const isHome = computed(() => ['home', 'playlistDetail'].includes(String(route.name || '')))
const isDiscover = computed(() => ['discover', 'discoverPlaylistDetail', 'discoverAlbumDetail', 'discoverArtistDetail'].includes(String(route.name || '')))
const isMessages = computed(() => route.name === 'messages')
const isMoments = computed(() => route.name === 'moments')
const profileInitial = computed(() => String(userStore.nickname || 'A').trim().slice(0, 1).toUpperCase())
const totalMessageBadge = computed(() => Number(noticeBadgeCount.value || 0) + Number(privateBadgeCount.value || 0))

function scrollToPageTop(behavior = 'auto') {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({left: 0, top: 0, behavior})
    })
  })
}

async function goHome() {
  const changingPage = route.name !== 'home'
  if (changingPage) {
    await router.push({name: 'home'})
  }
  scrollToPageTop(changingPage ? 'auto' : 'smooth')
}

function openDiscover() {
  if (isDiscover.value) return
  router.push({name: 'discover'})
}

function openProfile() {
  profileMenuOpen.value = false
  if (!userStore.isLoggedIn) {
    openLoginDialog()
    return
  }
  if (isProfile.value) return
  router.push({name: 'profile'})
}

function handleProfileClick() {
  if (!userStore.isLoggedIn) {
    openLoginDialog()
    return
  }
  profileMenuOpen.value = !profileMenuOpen.value
}

function openMessages() {
  profileMenuOpen.value = false
  if (!isMessages.value) router.push({name: 'messages'})
}

function openMoments() {
  profileMenuOpen.value = false
  if (!isMoments.value) router.push({name: 'moments'})
}

function badgeText(value) {
  const count = Number(value || 0)
  return count > 99 ? '99+' : count
}

function handleProfileMenuPointerDown(event) {
  if (!profileMenuOpen.value || profileMenuRef.value?.contains(event.target)) return
  profileMenuOpen.value = false
}

function handleProfileMenuEscape(event) {
  if (event.key === 'Escape') profileMenuOpen.value = false
}

async function openSearch() {
  if (route.name === 'search') {
    window.dispatchEvent(new CustomEvent('aurora:focus-search-page'))
    return
  }
  await router.push({name: 'search'})
}

function handleSearchShortcut(event) {
  if (!(event.metaKey || event.ctrlKey) || String(event.key).toLowerCase() !== 'k') return
  const target = event.target
  if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
  event.preventDefault()
  void openSearch()
}

let shortcutBound = false
function bindShortcut() {
  if (shortcutBound) return
  window.addEventListener('keydown', handleSearchShortcut)
  window.addEventListener('keydown', handleProfileMenuEscape)
  window.addEventListener('pointerdown', handleProfileMenuPointerDown)
  shortcutBound = true
}

function unbindShortcut() {
  if (!shortcutBound) return
  window.removeEventListener('keydown', handleSearchShortcut)
  window.removeEventListener('keydown', handleProfileMenuEscape)
  window.removeEventListener('pointerdown', handleProfileMenuPointerDown)
  shortcutBound = false
}

function refreshHeaderMessages() {
  if (userStore.isLoggedIn) void refreshMessageBadges()
}

onMounted(() => {
  bindShortcut()
  refreshHeaderMessages()
})
onActivated(() => {
  bindShortcut()
  refreshHeaderMessages()
})
onDeactivated(unbindShortcut)
onBeforeUnmount(unbindShortcut)

watch(() => [userStore.isLoggedIn, userStore.userId], ([loggedIn]) => {
  profileMenuOpen.value = false
  if (loggedIn) refreshHeaderMessages()
})

watch(() => route.fullPath, () => {
  profileMenuOpen.value = false
})
</script>

<style scoped>
.aurora-header {
  position: sticky;
  top: 0;
  z-index: 80;
  border-bottom: 1px solid rgba(24, 24, 27, 0.065);
  background: rgba(247, 247, 248, 0.92);
  backdrop-filter: blur(22px) saturate(1.2);
}

.aurora-header-inner {
  box-sizing: border-box;
  display: grid;
  width: min(100%, 1376px);
  min-height: 76px;
  align-items: center;
  grid-template-columns: auto auto minmax(260px, 1fr) auto;
  gap: 28px;
  margin: 0 auto;
  padding: 10px 28px;
}

.aurora-brand,
.aurora-nav button,
.aurora-profile,
.aurora-search-trigger {
  cursor: pointer;
  border: 0;
  background: transparent;
  font-family: inherit;
}

.aurora-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  color: #18181b;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.22em;
}

.aurora-brand-mark {
  display: grid;
  width: 28px;
  aspect-ratio: 1;
  place-items: center;
  color: #fff;
  border-radius: 9px;
  background: linear-gradient(135deg, #f4707e, #ef9a68);
  box-shadow: 0 8px 18px rgba(232, 87, 105, 0.22);
  font-size: 12px;
  letter-spacing: 0;
}

.aurora-nav { display: flex; align-items: center; gap: 6px; }
.aurora-nav button { position: relative; padding: 11px 14px; color: #626269; font-size: 13px; font-weight: 740; }
.aurora-nav button::after { position: absolute; right: 14px; bottom: 3px; left: 14px; height: 2px; border-radius: 99px; background: #ed7180; content: ''; opacity: 0; transform: scaleX(0.45); transition: 180ms ease; }
.aurora-nav button:hover,
.aurora-nav button.is-active { color: #27272a; }
.aurora-nav button.is-active::after { opacity: 1; transform: scaleX(1); }

.aurora-header-search { min-width: 0; width: min(100%, 520px); justify-self: center; }
.aurora-header-search :slotted(.home-search) { width: 100%; }
.aurora-search-trigger { box-sizing: border-box; display: grid; width: 100%; height: 44px; align-items: center; grid-template-columns: 18px minmax(0, 1fr) auto; gap: 10px; padding: 0 15px; color: #85858d; text-align: left; border: 1px solid rgba(24, 24, 27, 0.05); border-radius: 16px; background: rgba(228, 228, 231, 0.76); transition: 180ms ease; }
.aurora-search-trigger:hover { border-color: rgba(232, 87, 105, 0.13); background: rgba(255, 255, 255, 0.94); box-shadow: 0 12px 30px rgba(24, 24, 27, 0.08); transform: translateY(-1px); }
.aurora-search-trigger svg { width: 18px; height: 18px; }
.aurora-search-trigger span { overflow: hidden; font-size: 12px; font-weight: 620; text-overflow: ellipsis; white-space: nowrap; }
.aurora-search-trigger kbd { padding: 3px 6px; color: #a1a1aa; border: 1px solid rgba(24, 24, 27, 0.06); border-radius: 6px; background: rgba(255, 255, 255, 0.7); font-size: 9px; }

.aurora-profile-wrap { position: relative; }
.aurora-profile { position: relative; display: grid; width: 40px; aspect-ratio: 1; overflow: visible; place-items: center; color: #fff; border: 2px solid rgba(255, 255, 255, 0.9); border-radius: 50%; background: linear-gradient(135deg, #71717a, #27272a); box-shadow: 0 8px 22px rgba(24, 24, 27, 0.14); font-size: 13px; font-weight: 850; }
.aurora-profile.has-unread::after { position: absolute; top: -2px; right: -1px; width: 8px; height: 8px; border: 2px solid #f7f7f8; border-radius: 50%; background: #ef5267; content: ''; }
.aurora-profile img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.aurora-profile svg { width: 19px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.7; }
.aurora-profile.is-guest { color: #69666b; border-color: rgba(255, 255, 255, 0.92); background: #e8e6e4; box-shadow: 0 8px 20px rgba(24, 24, 27, 0.08); }
.aurora-profile.is-guest:hover { color: #fff; background: linear-gradient(135deg, #ef7180, #ef9a68); }
.aurora-profile-menu { position: absolute; top: calc(100% + 14px); right: -4px; z-index: 120; width: 286px; overflow: hidden; padding: 8px; border: 1px solid rgba(24, 24, 27, .08); border-radius: 22px; background: rgba(255, 255, 255, .97); box-shadow: 0 24px 64px rgba(24, 24, 27, .16); backdrop-filter: blur(24px); }
.aurora-profile-menu > header { display: grid; grid-template-columns: 38px minmax(0, 1fr); gap: 10px; align-items: center; padding: 9px 10px 13px; border-bottom: 1px solid #ececef; }
.aurora-profile-menu > header > img,
.aurora-profile-menu > header > span { display: grid; width: 38px; height: 38px; overflow: hidden; place-items: center; color: #fff; border-radius: 50%; background: #313134; object-fit: cover; font-size: 11px; font-weight: 820; }
.aurora-profile-menu header div { min-width: 0; }
.aurora-profile-menu header small,
.aurora-profile-menu header strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.aurora-profile-menu header small { color: #e35c6c; font-size: 7px; font-weight: 850; letter-spacing: .14em; }
.aurora-profile-menu header strong { margin-top: 4px; color: #333337; font-size: 11px; }
.aurora-profile-menu nav { display: grid; gap: 2px; padding-top: 6px; }
.aurora-profile-menu nav button { display: grid; width: 100%; grid-template-columns: 31px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 9px 10px; text-align: left; border: 0; border-radius: 13px; background: transparent; }
.aurora-profile-menu nav button:hover,
.aurora-profile-menu nav button.is-active { background: #f2f2f3; }
.aurora-profile-menu nav svg { width: 20px; fill: none; stroke: #6f6f76; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.55; }
.aurora-profile-menu nav span { min-width: 0; }
.aurora-profile-menu nav strong,
.aurora-profile-menu nav small { display: block; }
.aurora-profile-menu nav strong { color: #39393d; font-size: 10px; }
.aurora-profile-menu nav small { margin-top: 3px; color: #9999a0; font-size: 8px; }
.aurora-profile-menu nav b { color: #aaaab0; font-size: 10px; font-weight: 500; }
.aurora-profile-menu nav i { display: grid; min-width: 19px; height: 19px; place-items: center; padding: 0 3px; color: #fff; border-radius: 10px; background: #ee5668; font-size: 8px; font-style: normal; }
.profile-menu-enter-active, .profile-menu-leave-active { transition: opacity 150ms ease, transform 180ms ease; transform-origin: top right; }
.profile-menu-enter-from, .profile-menu-leave-to { opacity: 0; transform: translateY(-5px) scale(.97); }

@media (max-width: 1080px) {
  .aurora-header-inner { grid-template-columns: auto minmax(230px, 1fr) auto; }
  .aurora-nav { display: none; }
}

@media (max-width: 820px) {
  .aurora-header-inner { min-height: 68px; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; padding: 8px 18px; }
  .aurora-header-search { justify-self: end; }
  .aurora-search-trigger { width: 42px; height: 42px; grid-template-columns: 1fr; place-items: center; justify-self: end; padding: 0; border-radius: 50%; }
  .aurora-search-trigger span,
  .aurora-search-trigger kbd { display: none; }
}

@media (max-width: 560px) {
  .aurora-brand { font-size: 12px; }
  .aurora-brand-mark { display: none; }
  .aurora-profile { width: 36px; }
}
</style>
