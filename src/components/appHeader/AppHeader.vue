<template>
  <header class="aurora-header">
    <div class="aurora-header-inner">
      <button class="aurora-brand" type="button" @click="goHome('home-top')">
        <span class="aurora-brand-mark" aria-hidden="true">A</span>
        <span>AURORA</span>
      </button>

      <nav class="aurora-nav" aria-label="主导航">
        <button type="button" :class="{ 'is-active': isHome }" @click="goHome('home-top')">首页</button>
        <button type="button" @click="goHome('discovery')">发现</button>
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

      <button
        class="aurora-profile"
        :class="{ 'is-guest': !userStore.isLoggedIn }"
        type="button"
        :aria-label="userStore.isLoggedIn ? '打开个人音乐库' : '登录网易云音乐'"
        @click="openProfile"
      >
        <img v-if="userStore.avatarUrl" :src="userStore.avatarUrl" alt="用户头像" />
        <span v-else-if="userStore.isLoggedIn">{{ profileInitial }}</span>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.75 19c.7-3.15 3-5 6.25-5s5.55 1.85 6.25 5" />
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup>
import {computed, onActivated, onBeforeUnmount, onDeactivated, onMounted} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useCounterStore} from '@/stores/userStores.js'
import {openLoginDialog} from '@/utils/loginDialog.js'

const route = useRoute()
const router = useRouter()
const userStore = useCounterStore()

const isProfile = computed(() => ['profile', 'profilePlaylistDetail'].includes(String(route.name || '')))
const isHome = computed(() => ['home', 'playlistDetail'].includes(String(route.name || '')))
const profileInitial = computed(() => String(userStore.nickname || 'A').trim().slice(0, 1).toUpperCase())

function scrollToHomeSection(sectionId) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({behavior: 'smooth', block: 'start'})
    })
  })
}

async function goHome(sectionId = 'home-top') {
  if (route.name !== 'home') {
    await router.push({name: 'home'})
  }
  scrollToHomeSection(sectionId)
}

function openProfile() {
  if (!userStore.isLoggedIn) {
    openLoginDialog()
    return
  }
  if (isProfile.value) return
  router.push({name: 'profile'})
}

async function openSearch() {
  if (route.name !== 'home') {
    await router.push({name: 'home'})
  }
  requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('aurora:focus-home-search')))
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
  shortcutBound = true
}

function unbindShortcut() {
  if (!shortcutBound) return
  window.removeEventListener('keydown', handleSearchShortcut)
  shortcutBound = false
}

onMounted(bindShortcut)
onActivated(bindShortcut)
onDeactivated(unbindShortcut)
onBeforeUnmount(unbindShortcut)
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

.aurora-profile { display: grid; width: 40px; aspect-ratio: 1; overflow: hidden; place-items: center; color: #fff; border: 2px solid rgba(255, 255, 255, 0.9); border-radius: 50%; background: linear-gradient(135deg, #71717a, #27272a); box-shadow: 0 8px 22px rgba(24, 24, 27, 0.14); font-size: 13px; font-weight: 850; }
.aurora-profile img { width: 100%; height: 100%; object-fit: cover; }
.aurora-profile svg { width: 19px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.7; }
.aurora-profile.is-guest { color: #69666b; border-color: rgba(255, 255, 255, 0.92); background: #e8e6e4; box-shadow: 0 8px 20px rgba(24, 24, 27, 0.08); }
.aurora-profile.is-guest:hover { color: #fff; background: linear-gradient(135deg, #ef7180, #ef9a68); }

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
