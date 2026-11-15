<template>
  <header ref="headerRef" class="aurora-header" :class="{ 'is-overlay': overlay, 'is-over-hero': overHero }" @pointerover="prefetchNavigation" @focusin="prefetchNavigation" @pointerdown="prefetchNavigation">
    <div class="aurora-header-inner">
      <button class="aurora-brand" type="button" data-route-prefetch="home" @click="goHome">
        <span class="aurora-brand-mark" aria-hidden="true">A</span>
        <span>AURORA</span>
      </button>

      <nav class="aurora-nav" aria-label="主导航">
        <button type="button" data-route-prefetch="home" :class="{ 'is-active': isHome }" @click="goHome">首页</button>
        <button type="button" data-route-prefetch="discover" :class="{ 'is-active': isDiscover }" @click="openDiscover">发现</button>
        <button type="button" data-route-prefetch="profile" :class="{ 'is-active': isProfile || isSmartPlaylists }" @click="openProfile">音乐库</button>
        <button type="button" data-route-prefetch="search" :class="{ 'is-active': isSearch }" @click="openSearch">搜索</button>
      </nav>

      <div class="aurora-header-actions">
        <button class="aurora-settings" type="button" aria-label="打开设置" aria-haspopup="dialog" aria-controls="app-settings" @click="openSettings"><Cog6ToothIcon /><span>设置</span></button>
        <div ref="profileMenuRef" class="aurora-profile-wrap" @focusout="handleProfileMenuFocusOut" @keydown.esc="handleProfileMenuEscape">
          <MembershipBadge v-if="userStore.isLoggedIn" :tier="userStore.membershipTier" />
          <button
            ref="profileTriggerRef"
            class="aurora-profile"
            :class="{ 'is-guest': !userStore.isLoggedIn, 'has-unread': totalMessageBadge > 0 }"
            type="button"
            :aria-expanded="userStore.isLoggedIn ? profileMenuOpen : undefined"
            :aria-controls="profileMenuOpen ? profileMenuId : undefined"
            :aria-label="userStore.isLoggedIn ? '打开个人菜单' : '登录网易云音乐'"
            @click="handleProfileClick"
          >
            <img v-if="userStore.avatarUrl" :src="userStore.avatarUrl" alt="用户头像" />
            <span v-else-if="userStore.isLoggedIn">{{ profileInitial }}</span>
            <AppIcon name="user" v-else aria-hidden="true" />
          </button>

          <Transition name="profile-menu">
            <div v-if="userStore.isLoggedIn && profileMenuOpen" :id="profileMenuId" class="aurora-profile-menu">
              <div class="profile-menu-identity">
                <img v-if="userStore.avatarUrl" :src="userStore.avatarUrl" alt="" />
                <span v-else class="profile-menu-initial" aria-hidden="true">{{ profileInitial }}</span>
                <div><strong>{{ userStore.nickname || '我的账号' }}</strong><span>网易云音乐账号</span></div>
              </div>
              <nav class="profile-menu-links" aria-label="个人功能">
                <button class="profile-menu-row" type="button" data-route-prefetch="profile" :aria-current="isProfile ? 'page' : undefined" @click="openProfile">
                  <AppIcon name="list-music" aria-hidden="true" />
                  <span>我的音乐库</span>
                  <AppIcon class="profile-menu-arrow" name="chevron-right" aria-hidden="true" />
                </button>
                <button class="profile-menu-row" type="button" data-route-prefetch="smartPlaylists" :aria-current="isSmartPlaylists ? 'page' : undefined" @click="openSmartPlaylists">
                  <AppIcon name="sliders-horizontal" aria-hidden="true" />
                  <span>智能歌单</span>
                  <AppIcon class="profile-menu-arrow" name="chevron-right" aria-hidden="true" />
                </button>
                <button class="profile-menu-row" type="button" @click="openRelay">
                  <AppIcon name="monitor-smartphone" aria-hidden="true" />
                  <span>跨设备接力</span>
                  <AppIcon class="profile-menu-arrow" name="chevron-right" aria-hidden="true" />
                </button>
                <button class="profile-menu-row" type="button" data-route-prefetch="messages" :aria-current="isMessages ? 'page' : undefined" @click="openMessages">
                  <AppIcon name="messages-square" aria-hidden="true" />
                  <span>消息中心</span>
                  <span v-if="totalMessageBadge" class="profile-menu-badge" :aria-label="`${totalMessageBadge} 条未读消息`">{{ badgeText(totalMessageBadge) }}</span>
                  <AppIcon v-else class="profile-menu-arrow" name="chevron-right" aria-hidden="true" />
                </button>
                <button class="profile-menu-row" type="button" data-route-prefetch="moments" :aria-current="isMoments ? 'page' : undefined" @click="openMoments">
                  <AppIcon name="music" aria-hidden="true" />
                  <span>音乐动态</span>
                  <AppIcon class="profile-menu-arrow" name="chevron-right" aria-hidden="true" />
                </button>
              </nav>
              <div class="profile-menu-session">
                <button class="profile-menu-row profile-menu-logout" type="button" :disabled="logoutPending" @click="openLogoutDialog">
                  <AppIcon name="log-out" aria-hidden="true" />
                  <span>退出登录</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
    <dialog ref="logoutDialogRef" class="account-logout-dialog" :aria-labelledby="logoutTitleId" :aria-describedby="`${logoutTitleId}-description`" :aria-busy="logoutPending" @cancel.prevent="cancelLogout" @click.self="cancelLogout">
      <div class="account-logout-content">
        <span class="account-logout-icon" aria-hidden="true"><AppIcon name="log-out" /></span>
        <div>
          <h2 :id="logoutTitleId">退出当前账号？</h2>
          <p :id="`${logoutTitleId}-description`">退出后将停止同步歌单与聆听记录。<br />本地收藏会保留。</p>
        </div>
      </div>
      <div class="account-logout-actions">
        <button type="button" autofocus :disabled="logoutPending" @click="cancelLogout">取消</button>
        <button class="account-logout-confirm" type="button" :disabled="logoutPending" @click="confirmLogout">
          {{ logoutPending ? '正在退出…' : '确认退出' }}
        </button>
      </div>
    </dialog>
  </header>
</template>

<script setup>
import AppIcon from "@/components/icons/AppIcon.vue"
import MembershipBadge from '@/components/membership/MembershipBadge.vue'
import {computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, useId, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useCounterStore} from '@/stores/userStores.js'
import {userApi} from '@/api/userApi/userApi.js'
import {useMessageCenter} from '@/composables/useMessageCenter.js'
import {openLoginDialog} from '@/utils/loginDialog.js'
import {openPlaybackRelay} from '@/composables/playbackRelayState.js'
import {Cog6ToothIcon} from '@/components/icons'
import {openAppSettings} from '@/composables/useAppSettings.js'
import {preloadRouteComponent} from '@/utils/routePerformance.js'
import {lockScroll, unlockScroll} from '@/utils/scrollLock.js'

const props = defineProps({overlay: {type: Boolean, default: false}})
const headerRef = ref(null)
const overHero = ref(false)
const route = useRoute()
const router = useRouter()
const userStore = useCounterStore()
const profileMenuRef = ref(null)
const profileTriggerRef = ref(null)
const profileMenuOpen = ref(false)
const profileMenuId = `profile-menu-${useId()}`
const logoutTitleId = `account-logout-${useId()}`
const logoutDialogRef = ref(null)
const logoutPending = ref(false)
const {noticeBadgeCount, privateBadgeCount, refreshMessageBadges} = useMessageCenter(userStore)

// 背景冻结：AppHeader 始终位于主页子树内，route.name 即当前主页名；
// 详情悬浮层打开时背景路由保持不变，导航高亮天然正确。
const isProfile = computed(() => String(route.name || '') === 'profile')
const isSmartPlaylists = computed(() => String(route.name || '') === 'smartPlaylists')
const isHome = computed(() => String(route.name || '') === 'home')
const isDiscover = computed(() => String(route.name || '') === 'discover')
const isSearch = computed(() => String(route.name || '') === 'search')
const isMessages = computed(() => route.name === 'messages')
const isMoments = computed(() => route.name === 'moments')
const profileInitial = computed(() => String(userStore.nickname || 'A').trim().slice(0, 1).toUpperCase())
const totalMessageBadge = computed(() => Number(noticeBadgeCount.value || 0) + Number(privateBadgeCount.value || 0))

function prefetchNavigation(event) {
  const button = event.target.closest?.('[data-route-prefetch]')
  const name = button?.dataset.routePrefetch
  if (!name || name === route.name || !event.currentTarget.contains(button)) return
  if (name === 'profile' && !userStore.isLoggedIn) return
  void preloadRouteComponent(router, {name})
}

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
  if (profileMenuOpen.value) profileTriggerRef.value?.focus({preventScroll: true})
}

function openSettings() {
  profileMenuOpen.value = false
  openAppSettings()
}

function openSmartPlaylists() {
  profileMenuOpen.value = false
  if (!isSmartPlaylists.value) router.push({name: 'smartPlaylists'})
}

function openRelay() {
  profileMenuOpen.value = false
  openPlaybackRelay()
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
  if (!profileMenuOpen.value || event.defaultPrevented) return
  event.preventDefault()
  event.stopPropagation()
  profileMenuOpen.value = false
  profileTriggerRef.value?.focus({preventScroll: true})
}

function handleProfileMenuFocusOut(event) {
  if (!profileMenuRef.value?.contains(event.relatedTarget)) profileMenuOpen.value = false
}

function openLogoutDialog() {
  const dialog = logoutDialogRef.value
  if (!userStore.isLoggedIn || logoutPending.value || !dialog || dialog.open) return
  profileMenuOpen.value = false
  dialog.showModal()
  lockScroll()
}

function closeLogoutDialog() {
  if (!logoutDialogRef.value?.open) return
  logoutDialogRef.value.close()
  unlockScroll()
}

function cancelLogout() {
  if (logoutPending.value) return
  closeLogoutDialog()
  profileTriggerRef.value?.focus({preventScroll: true})
}

async function confirmLogout() {
  if (logoutPending.value || !userStore.isLoggedIn) return
  const {userId, getUserCookie} = userStore
  logoutPending.value = true
  try {
    await userApi.logout()
  } catch {
    // Local sign-out stays available if the remote session is unavailable.
  } finally {
    logoutPending.value = false
  }
  if (userStore.userId !== userId || userStore.getUserCookie !== getUserCookie) return
  closeLogoutDialog()
  userStore.logout()
  profileTriggerRef.value?.focus({preventScroll: true})
  await router.replace({name: 'home'})
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
  if (target instanceof HTMLElement && target.closest('dialog[open]')) return
  if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
  event.preventDefault()
  void openSearch()
}

let shortcutBound = false
function bindShortcut() {
  if (shortcutBound) return
  window.addEventListener('keydown', handleSearchShortcut)
  window.addEventListener('pointerdown', handleProfileMenuPointerDown)
  shortcutBound = true
}

function unbindShortcut() {
  if (!shortcutBound) return
  window.removeEventListener('keydown', handleSearchShortcut)
  window.removeEventListener('pointerdown', handleProfileMenuPointerDown)
  shortcutBound = false
}

function refreshHeaderMessages() {
  if (userStore.isLoggedIn) void refreshMessageBadges()
}

let heroObserver, heroBackdropBound = false
function observeHero() {
  heroObserver?.disconnect()
  heroObserver = null
  overHero.value = false
  const header = headerRef.value
  const hero = header?.parentElement?.querySelector('.home-banner-card')
  if (!props.overlay || !hero) return
  const center = header.getBoundingClientRect().height / 2
  const bounds = hero.getBoundingClientRect()
  overHero.value = bounds.top <= center && bounds.bottom > center
  const observer = new IntersectionObserver(([entry]) => {
    if (heroObserver === observer) overHero.value = entry.isIntersecting
  }, {rootMargin: `-${center}px 0px -${Math.max(0, window.innerHeight - center - 1)}px 0px`})
  heroObserver = observer
  observer.observe(hero)
}
function bindHeroBackdrop() {
  if (heroBackdropBound) return
  heroBackdropBound = true
  window.addEventListener('resize', observeHero, {passive: true})
  observeHero()
}
function unbindHeroBackdrop() {
  heroObserver?.disconnect()
  heroObserver = null
  window.removeEventListener('resize', observeHero)
  heroBackdropBound = false
  overHero.value = false
}
watch(() => props.overlay, () => nextTick(observeHero))

onMounted(() => {
  bindShortcut()
  bindHeroBackdrop()
  refreshHeaderMessages()
})
onActivated(() => {
  bindShortcut()
  bindHeroBackdrop()
  refreshHeaderMessages()
})
onDeactivated(unbindShortcut)
onBeforeUnmount(unbindShortcut)
onDeactivated(unbindHeroBackdrop)
onBeforeUnmount(unbindHeroBackdrop)
onDeactivated(() => {
  profileMenuOpen.value = false
  closeLogoutDialog()
})
onBeforeUnmount(closeLogoutDialog)

watch(() => [userStore.getUserCookie, userStore.userId], ([cookie]) => {
  profileMenuOpen.value = false
  closeLogoutDialog()
  if (cookie) refreshHeaderMessages()
})

watch(() => route.fullPath, () => {
  profileMenuOpen.value = false
  closeLogoutDialog()
})
</script>

<style scoped>
.aurora-header {
  --header-height: 68px;
  --header-fade-height: 32px;
  position: sticky;
  top: 0;
  z-index: 80;
  background: transparent;
}

/* Fade only the backdrop so navigation and the profile menu stay crisp. */
.aurora-header::before {
  position: absolute;
  inset: 0 0 calc(-1 * var(--header-fade-height));
  z-index: -1;
  -webkit-backdrop-filter: blur(22px) saturate(1.2);
  backdrop-filter: blur(22px) saturate(1.2);
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 calc(100% - var(--header-fade-height)), rgba(0, 0, 0, 0.65) calc(100% - var(--header-fade-height) * 0.45), transparent 100%);
  mask-image: linear-gradient(to bottom, #000 0%, #000 calc(100% - var(--header-fade-height)), rgba(0, 0, 0, 0.65) calc(100% - var(--header-fade-height) * 0.45), transparent 100%);
  pointer-events: none;
  content: '';
}

.aurora-header-inner {
  box-sizing: border-box;
  display: grid;
  width: min(100%, 1376px);
  min-height: var(--header-height);
  align-items: center;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 28px;
  margin: 0 auto;
  padding: 8px 28px;
}

.aurora-brand { grid-column: 1; }
.aurora-nav { grid-column: 2; }
.aurora-header-actions { grid-column: 3; display: flex; align-items: center; gap: 16px; }
.aurora-settings { display: flex; min-height: 40px; min-width: 40px; align-items: center; justify-content: center; gap: 7px; padding: 8px 10px; border: 0; border-radius: 12px; color: #73737d; background: transparent; font: inherit; font-size: 12px; cursor: pointer; transition: background 150ms, color 150ms; }
.aurora-settings:hover { color: #3c3c45; background: #eaeaf0; }
.aurora-settings:focus-visible { outline: 2px solid #ee8493; outline-offset: 3px; }
.aurora-settings svg { width: 20px; height: 20px; }

.aurora-brand,
.aurora-nav button,
.aurora-profile {
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

.aurora-profile-wrap { position: relative; display: flex; align-items: center; gap: 8px; }
.aurora-profile { position: relative; display: grid; width: 40px; aspect-ratio: 1; overflow: visible; place-items: center; color: #fff; border: 2px solid rgba(255, 255, 255, 0.9); border-radius: 50%; background: linear-gradient(135deg, #71717a, #27272a); box-shadow: 0 8px 22px rgba(24, 24, 27, 0.14); font-size: 13px; font-weight: 850; }
.aurora-profile.has-unread::after { position: absolute; top: -2px; right: -1px; width: 8px; height: 8px; border: 2px solid #f7f7f8; border-radius: 50%; background: #ef5267; content: ''; }
.aurora-profile img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.aurora-profile svg { width: 19px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.7; }
.aurora-profile.is-guest { color: #69666b; border-color: rgba(255, 255, 255, 0.92); background: #e8e6e4; box-shadow: 0 8px 20px rgba(24, 24, 27, 0.08); }
.aurora-profile.is-guest:hover { color: #fff; background: linear-gradient(135deg, #ef7180, #ef9a68); }
.aurora-header.is-over-hero .aurora-brand,
.aurora-header.is-over-hero .aurora-nav button:hover,
.aurora-header.is-over-hero .aurora-nav button.is-active { color: #fff; }
.aurora-header.is-over-hero .aurora-nav button,
.aurora-header.is-over-hero .aurora-settings { color: rgba(255, 255, 255, 0.8); }
.aurora-header.is-over-hero .aurora-settings:hover { color: #fff; background: rgba(255, 255, 255, 0.12); }
.aurora-header.is-over-hero .aurora-profile.is-guest { color: #fff; border-color: rgba(255, 255, 255, 0.32); background: rgba(255, 255, 255, 0.12); }
.aurora-profile:focus-visible,
.profile-menu-row:focus-visible,
.account-logout-actions button:focus-visible { outline: 2px solid #b54e6b; outline-offset: 2px; }
.aurora-profile-menu {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  z-index: 120;
  width: min(328px, calc(100vw - 36px));
  max-height: calc(100dvh - var(--header-height) - var(--global-player-space, 92px) - 16px);
  overflow: auto;
  overscroll-behavior: contain;
  padding: 10px;
  border: 1px solid #e9e3e9;
  border-radius: 24px;
  background: #fefdfd;
  box-shadow: 0 22px 40px -16px rgb(45 29 48 / .27), 0 4px 12px rgb(45 29 48 / .06);
}
.profile-menu-identity {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 13px 12px;
  border: 1px solid #efe5ee;
  border-radius: 15px;
  background: linear-gradient(125deg, #f9f2f6, #f7f4f9);
}
.profile-menu-identity img,
.profile-menu-initial {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: #594759;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px #e8dce8, 0 3px 8px rgb(64 42 66 / .1);
  object-fit: cover;
  font-size: 18px;
  font-weight: 700;
}
.profile-menu-identity strong {
  display: block;
  overflow: hidden;
  color: #29242d;
  font-size: 17px;
  font-weight: 750;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.profile-menu-identity div > span { display: block; margin-top: 3px; color: #6a606e; font-size: 13px; line-height: 1.4; }
.profile-menu-links { display: grid; gap: 2px; margin-block: 8px; }
.profile-menu-row {
  display: grid;
  width: 100%;
  min-height: 46px;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 9px 13px;
  border: 0;
  border-radius: 10px;
  color: #302b34;
  background: transparent;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  transition: background-color 140ms ease, color 140ms ease;
}
.profile-menu-row:hover { background: #f5f2f5; }
.profile-menu-row[aria-current='page'] { color: #8a3955; background: #f8edf2; box-shadow: inset 0 0 0 1px #f0e1e9; }
.profile-menu-row > svg { color: #74677a; }
.profile-menu-row .profile-menu-arrow { width: 16px; height: 16px; color: #8a7d90; transition: transform 140ms ease; }
.profile-menu-row:hover .profile-menu-arrow { transform: translateX(2px); }
.profile-menu-badge {
  min-width: 24px;
  padding: 2px 6px;
  border-radius: 999px;
  color: #9f2947;
  background: #fbe5eb;
  font-size: 12px;
  text-align: center;
}
.profile-menu-session { position: relative; padding-top: 8px; }
.profile-menu-session::before { position: absolute; inset: 0 10px auto; height: 1px; background: #eee7ed; content: ''; }
.profile-menu-logout,
.profile-menu-logout > svg { color: #a5344c; }
.profile-menu-logout:hover { background: #fdf0f3; }
.profile-menu-logout:disabled, .account-logout-actions button:disabled { cursor: wait; opacity: .65; }
.profile-menu-enter-active, .profile-menu-leave-active { transition: opacity 150ms ease, transform 180ms cubic-bezier(.22, 1, .36, 1); transform-origin: top right; }
.profile-menu-enter-from, .profile-menu-leave-to { opacity: 0; transform: translateY(-4px) scale(.985); }
.profile-menu-leave-active { pointer-events: none; }

.account-logout-dialog {
  width: min(408px, calc(100vw - 36px));
  max-height: calc(100dvh - 36px);
  margin: auto;
  padding: 0;
  overflow: auto;
  overscroll-behavior: contain;
  border: 1px solid #eae5e8;
  border-radius: 24px;
  color: #29242d;
  background: #fff;
  box-shadow: 0 26px 70px -12px rgb(39 29 48 / .33), 0 4px 16px rgb(39 29 48 / .07);
}
.account-logout-dialog[open] { animation: account-logout-in 180ms cubic-bezier(.22, 1, .36, 1) both; }
.account-logout-dialog::backdrop { background: rgb(32 23 36 / .32); backdrop-filter: blur(4px); }
.account-logout-content {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 14px;
  padding: clamp(18px, 5vw, 26px);
}
.account-logout-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid #f4dce4;
  border-radius: 14px;
  color: #a5344c;
  background: linear-gradient(145deg, #fff4f7, #fae6ed);
}
.account-logout-content h2 { margin: 0 0 7px; font-size: 19px; font-weight: 750; line-height: 1.3; }
.account-logout-content p { margin: 0; color: #665d6b; font-size: 14px; line-height: 1.7; }
.account-logout-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 14px clamp(18px, 5vw, 26px) 16px;
  border-top: 1px solid #f0eaf0;
  background: #faf7fa;
}
.account-logout-actions button {
  min-height: 44px;
  padding: 8px;
  border: 1px solid #e7dfe8;
  border-radius: 11px;
  color: #38323c;
  background: #fff;
  font: inherit;
  font-size: 14px;
  font-weight: 650;
  cursor: pointer;
}
.account-logout-actions button:hover:not(:disabled) { background: #f2ecf3; }
.account-logout-actions .account-logout-confirm {
  border-color: #a33551;
  color: #fff;
  background: linear-gradient(145deg, #ad3a58, #9c304a);
  box-shadow: 0 2px 4px rgb(113 28 52 / .14);
}
.account-logout-actions .account-logout-confirm:hover:not(:disabled) { background: #902a43; }

@keyframes account-logout-in {
  from { opacity: 0; transform: translateY(6px) scale(.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .profile-menu-enter-active, .profile-menu-leave-active, .profile-menu-row, .profile-menu-row .profile-menu-arrow { transition: none; }
  .profile-menu-row:hover .profile-menu-arrow { transform: none; }
  .account-logout-dialog[open] { animation: none; }
}

@media (min-width: 821px) {
  .aurora-header.is-overlay { margin-bottom: calc(-1 * var(--header-height)); }
}

@media (max-width: 1080px) {
  .aurora-nav { display: none; }
}

@media (max-width: 820px) {
  .aurora-header { --header-height: 60px; --header-fade-height: 22px; }
  .aurora-header-inner { gap: 12px; padding: 8px 18px; }
}

@media (max-width: 560px) {
  .aurora-header-actions { gap: 8px; }
  .aurora-settings span { display: none; }
  .aurora-brand { font-size: 12px; }
  .aurora-brand-mark { display: none; }
  .aurora-profile { width: 36px; }
}
</style>
