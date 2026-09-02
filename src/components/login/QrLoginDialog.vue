<template>
  <Teleport to="body">
    <div
      class="login-dialog-layer"
      :class="{ 'is-open': opened }"
      :inert="opened ? null : ''"
      :aria-hidden="opened ? 'false' : 'true'"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-dialog-title"
      @keydown.esc="closeDialog"
    >
        <button class="login-dialog-backdrop" type="button" aria-label="关闭登录窗口" @click="closeDialog" />

        <section ref="panelRef" class="login-dialog-panel" tabindex="-1">
          <button class="login-dialog-close" type="button" aria-label="关闭" @click="closeDialog">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m7.5 7.5 9 9m0-9-9 9" />
            </svg>
          </button>

          <div class="login-dialog-copy login-dialog-identity">
            <span class="login-dialog-index">NETEASE ACCOUNT</span>
            <div class="login-dialog-identity-stage" :class="{ 'is-arriving': entryAvatarAnimating, 'is-authorized': qrState === 'success' }">
              <span class="login-dialog-identity-orbit" aria-hidden="true" />
              <div ref="identityAvatarRef" class="login-dialog-identity-face">
                <img v-if="successAvatarUrl" :key="successAvatarUrl" :src="successAvatarUrl" alt="登录账号头像" />
                <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.25" />
                  <path d="M5.75 19c.7-3.15 3-5 6.25-5s5.55 1.85 6.25 5" />
                </svg>
              </div>
              <span v-if="qrState === 'success'" class="login-dialog-identity-check" aria-hidden="true">✓</span>
            </div>

            <div class="login-dialog-identity-copy">
              <p>{{ qrState === 'success' ? '欢迎回来' : 'ACCOUNT PREVIEW' }}</p>
              <h2 id="login-dialog-title">{{ identityDisplayName }}</h2>
              <span>{{ identityDescription }}</span>
            </div>

            <div class="login-dialog-identity-progress" aria-hidden="true">
              <i :class="{ 'is-active': ['loading', 'wait'].includes(qrState) }" />
              <i :class="{ 'is-active': qrState === 'confirm' }" />
              <i :class="{ 'is-active': qrState === 'success' }" />
            </div>
          </div>

          <div class="login-dialog-qr-area">
            <div class="login-dialog-qr-shell" :class="`is-${qrState}`">
              <div v-if="qrImage" class="login-dialog-qr">
                <img :src="qrImage" alt="网易云音乐登录二维码" />

                <span v-if="qrState === 'wait'" class="login-dialog-scan-line" aria-hidden="true" />

                <div v-if="qrState === 'retrying'" class="login-dialog-state-layer is-retrying">
                  <span class="login-dialog-spinner" aria-hidden="true" />
                  <strong>正在重新连接</strong>
                  <small>已自动切换兼容模式</small>
                </div>

                <div v-else-if="qrState === 'confirm'" class="login-dialog-state-layer is-confirm">
                  <span aria-hidden="true">✓</span>
                  <strong>等待手机确认</strong>
                  <small>请在网易云音乐中完成授权</small>
                </div>

                <div v-else-if="qrState === 'success'" class="login-dialog-qr-destroy" aria-hidden="true">
                  <i
                    v-for="tile in qrDestroyTiles"
                    :key="tile.index"
                    :style="getQrDestroyTileStyle(tile)"
                  />
                  <span>
                    <svg viewBox="0 0 24 24"><path d="m7 12.5 3.2 3.2L17.5 8.5" /></svg>
                  </span>
                </div>

                <div v-else-if="qrState === 'expired'" class="login-dialog-state-layer is-expired">
                  <span class="login-dialog-expired-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="M12 7.5v5l3 1.75" /></svg>
                  </span>
                  <strong>二维码已过期</strong>
                  <small>刷新后即可继续</small>
                </div>

                <div v-else-if="qrState === 'error'" class="login-dialog-state-layer is-error">
                  <span class="login-dialog-error-icon" aria-hidden="true">!</span>
                  <strong>连接没有完成</strong>
                  <small>请重新生成二维码</small>
                </div>
              </div>

              <div v-else-if="qrState === 'loading'" class="login-dialog-loading" aria-label="正在生成二维码">
                <span /><span /><span /><span />
              </div>

              <div v-else class="login-dialog-empty">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4.5 4.5h6v6h-6zm9 0h6v6h-6zm-9 9h6v6h-6zm9 0h2.5v2.5h-2.5zm4 0h2v6h-6v-2" />
                </svg>
                <button type="button" @click="refreshQr">重新生成</button>
              </div>
            </div>

            <div class="login-dialog-status" :class="[`is-${qrState}`, { 'has-error': qrState === 'error' }]">
              <span class="login-dialog-status-dot" />
              <div>
                <div class="login-dialog-status-heading">
                  <strong>{{ qrStatusText }}</strong>
                  <em v-if="qrStatusCode && qrStatusCode !== 801">{{ qrStatusCode }}</em>
                </div>
                <p v-if="qrError">{{ qrError }}</p>
                <p v-else-if="qrState === 'confirm' && confirmProfile?.nickname">{{ confirmProfile.nickname }}，请在手机上确认登录</p>
                <p v-else-if="qrState === 'retrying'">接口返回 502，正在使用无 Cookie 模式继续轮询</p>
                <p v-else-if="qrState === 'success'">授权已完成，正在读取你的账号资料</p>
                <p v-else-if="qrState === 'expired'">本次二维码已失效，请刷新后重新扫码</p>
                <p v-else>二维码仅用于本次登录，不会保存你的密码</p>
              </div>
            </div>

            <button
              v-if="qrState === 'expired' || qrState === 'error'"
              class="login-dialog-refresh"
              type="button"
              @click="refreshQr"
            >
              刷新二维码
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useQrLogin } from '@/composables/useQrLogin.js'
import { useCounterStore } from '@/stores/userStores.js'
import { OPEN_LOGIN_DIALOG_EVENT } from '@/utils/loginDialog.js'

const userStore = useCounterStore()
const opened = ref(false)
const panelRef = ref(null)
const identityAvatarRef = ref(null)
const entryAvatarAnimating = ref(false)
const successAvatarUrl = computed(() => confirmProfile.value?.avatarUrl || userStore.avatarUrl || '')
const identityDisplayName = computed(() => {
  const name = String(confirmProfile.value?.nickname || userStore.nickname || '').trim()
  if (!name) return '等待扫码'
  if (name.length <= 13) return name
  return `${name.slice(0, 8)}…${name.slice(-3)}`
})
const identityDescription = computed(() => {
  const rawId = String(userStore.userId || '').trim()
  if (rawId) {
    const maskedId = rawId.length > 12 ? `${rawId.slice(0, 6)}…${rawId.slice(-4)}` : rawId
    return `UID ${maskedId}`
  }
  if (qrState.value === 'success') return '欢迎回来'
  if (qrState.value === 'confirm') return '请在手机上确认登录'
  return '登录后将在这里显示你的账号'
})
const qrDestroyTiles = Array.from({ length: 16 }, (_, index) => ({
  index,
  row: Math.floor(index / 4),
  column: index % 4,
  x: ((index % 4) - 1.5) * 19 + (index % 2 ? 9 : -7),
  y: (Math.floor(index / 4) - 1.5) * 22 + (index % 3 ? 7 : -9),
  rotate: ((index * 37) % 96) - 48,
  delay: (index % 5) * 34,
}))
let previousOverflow = ''
let successExitAnimating = false
let headerAvatarElement = null
let entryFlightAnimation = null
let entryFlightClone = null
let entryFlightReturning = false

const {
  confirmProfile,
  qrImage,
  qrState,
  qrError,
  qrStatusCode,
  qrStatusText,
  startQrLogin,
  refreshQr,
  cleanup,
  resetQrState,
} = useQrLogin(userStore, handleSignIn, closeDialog)

function handleSignIn() {
  // 登录状态由 useQrLogin 写入，当前页面保持不变。
}

function getQrDestroyTileStyle(tile) {
  return {
    '--tile-row': tile.row,
    '--tile-column': tile.column,
    '--tile-x': `${tile.x}px`,
    '--tile-y': `${tile.y}px`,
    '--tile-rotate': `${tile.rotate}deg`,
    '--tile-delay': `${tile.delay}ms`,
    top: `${tile.row * 25}%`,
    left: `${tile.column * 25}%`,
    backgroundPosition: `${tile.column * 33.333}% ${tile.row * 33.333}%`,
    backgroundImage: `url("${qrImage.value}")`,
  }
}

function styleFlyingAvatar(clone, rect) {
  Object.assign(clone.style, {
    position: 'fixed',
    zIndex: '1700',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    padding: '0',
    pointerEvents: 'none',
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'grid',
    placeItems: 'center',
    borderRadius: '50%',
    boxShadow: '0 14px 34px rgba(117, 78, 78, 0.22)',
    animation: 'none',
    transition: 'none',
  })
  clone.querySelectorAll('img').forEach(image => {
    Object.assign(image.style, { width: '100%', height: '100%', objectFit: 'cover' })
  })
  clone.querySelectorAll('svg').forEach(icon => {
    Object.assign(icon.style, { width: '34%', height: '34%' })
  })
  clone.removeAttribute('ref')
}

function buildAvatarFlightFrames(sourceRect, targetRect) {
  const middleTop = sourceRect.top + (targetRect.top - sourceRect.top) * 0.7 - 10
  const middleLeft = sourceRect.left + (targetRect.left - sourceRect.left) * 0.7
  const middleWidth = sourceRect.width + (targetRect.width - sourceRect.width) * 0.7
  const middleHeight = sourceRect.height + (targetRect.height - sourceRect.height) * 0.7

  return [
    {
      top: `${sourceRect.top}px`,
      left: `${sourceRect.left}px`,
      width: `${sourceRect.width}px`,
      height: `${sourceRect.height}px`,
      opacity: 1,
      offset: 0,
    },
    {
      top: `${middleTop}px`,
      left: `${middleLeft}px`,
      width: `${middleWidth}px`,
      height: `${middleHeight}px`,
      opacity: 1,
      offset: 0.7,
    },
    {
      top: `${targetRect.top}px`,
      left: `${targetRect.left}px`,
      width: `${targetRect.width}px`,
      height: `${targetRect.height}px`,
      opacity: 1,
      offset: 1,
    },
  ]
}

async function animateHeaderAvatarIntoDialog(source) {
  if (!opened.value) {
    entryAvatarAnimating.value = false
    return
  }

  const target = identityAvatarRef.value
  if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement)) {
    entryAvatarAnimating.value = false
    return
  }

  const sourceRect = source.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  if (!sourceRect.width || !targetRect.width) {
    entryAvatarAnimating.value = false
    return
  }

  headerAvatarElement = source
  source.style.opacity = '0'
  const clone = source.cloneNode(true)
  styleFlyingAvatar(clone, sourceRect)
  document.body.appendChild(clone)

  const animation = clone.animate(
    buildAvatarFlightFrames(sourceRect, targetRect),
    { duration: 620, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
  )
  entryFlightAnimation = animation
  entryFlightClone = clone
  entryFlightReturning = false

  await animation.finished.catch(() => {})
  if (entryFlightReturning) return
  entryAvatarAnimating.value = false
  await nextTick()
  await new Promise(resolve => requestAnimationFrame(resolve))
  const handoff = clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, easing: 'ease-out', fill: 'forwards' })
  await handoff.finished.catch(() => {})
  clone.remove()
  entryFlightAnimation = null
  entryFlightClone = null
}

async function openDialog() {
  if (userStore.isLoggedIn || opened.value) return
  const sourceAvatar = document.querySelector('.aurora-profile')
  entryAvatarAnimating.value = sourceAvatar instanceof HTMLElement
  opened.value = true
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  await nextTick()
  panelRef.value?.focus()
  if (sourceAvatar instanceof HTMLElement) void animateHeaderAvatarIntoDialog(sourceAvatar)
  startQrLogin()
}

function revealHeaderAvatar() {
  if (headerAvatarElement instanceof HTMLElement) headerAvatarElement.style.opacity = ''
  headerAvatarElement = null
}

function finishCloseDialog({ revealHeader = true } = {}) {
  if (!opened.value) return
  opened.value = false
  cleanup()
  resetQrState()
  document.body.style.overflow = previousOverflow
  entryAvatarAnimating.value = false
  if (revealHeader) revealHeaderAvatar()
}

function animateAvatarToHeader() {
  const source = identityAvatarRef.value
  const target = headerAvatarElement || document.querySelector('.aurora-profile')
  if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement)) {
    finishCloseDialog()
    return
  }

  const sourceRect = source.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  if (!sourceRect.width || !targetRect.width) {
    finishCloseDialog()
    return
  }

  successExitAnimating = true
  const clone = source.cloneNode(true)
  styleFlyingAvatar(clone, sourceRect)
  document.body.appendChild(clone)

  finishCloseDialog({ revealHeader: false })

  const animation = clone.animate(
    buildAvatarFlightFrames(sourceRect, targetRect),
    { duration: 640, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
  )

  animation.finished
    .catch(() => {})
    .finally(async () => {
      successExitAnimating = false
      revealHeaderAvatar()
      const handoff = clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'ease-out', fill: 'forwards' })
      await handoff.finished.catch(() => {})
      clone.remove()
      target.animate(
        [
          { transform: 'scale(0.9)' },
          { transform: 'scale(1.12)' },
          { transform: 'scale(1)' },
        ],
        { duration: 360, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
      )
    })
}

function reverseEntryAvatarToHeader() {
  const animation = entryFlightAnimation
  const clone = entryFlightClone
  const target = headerAvatarElement
  if (!animation || !(clone instanceof HTMLElement) || !(target instanceof HTMLElement)) return false

  entryFlightReturning = true
  successExitAnimating = true
  finishCloseDialog({ revealHeader: false })
  animation.reverse()
  animation.finished
    .catch(() => {})
    .finally(async () => {
      revealHeaderAvatar()
      const handoff = clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 100, easing: 'ease-out', fill: 'forwards' })
      await handoff.finished.catch(() => {})
      clone.remove()
      entryFlightAnimation = null
      entryFlightClone = null
      entryFlightReturning = false
      successExitAnimating = false
      target.animate(
        [{ transform: 'scale(0.94)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }],
        { duration: 260, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
      )
    })
  return true
}

function closeDialog() {
  if (!opened.value || successExitAnimating) return
  if (entryAvatarAnimating.value && reverseEntryAvatarToHeader()) return
  animateAvatarToHeader()
}

onMounted(() => {
  window.addEventListener(OPEN_LOGIN_DIALOG_EVENT, openDialog)
})

onBeforeUnmount(() => {
  window.removeEventListener(OPEN_LOGIN_DIALOG_EVENT, openDialog)
  cleanup()
  revealHeaderAvatar()
  if (opened.value) document.body.style.overflow = previousOverflow
})

watch(qrState, async (state) => {
  if (!['confirm', 'success'].includes(state)) return
  await nextTick()
  const avatar = identityAvatarRef.value
  if (!(avatar instanceof HTMLElement)) return
  avatar.animate(
    state === 'success'
      ? [
          { transform: 'scale(0.68)', opacity: 0.35 },
          { transform: 'scale(1.12)', opacity: 1, offset: 0.72 },
          { transform: 'scale(1)', opacity: 1 },
        ]
      : [
          { transform: 'scale(0.86)', opacity: 0.55 },
          { transform: 'scale(1.04)', opacity: 1, offset: 0.76 },
          { transform: 'scale(1)', opacity: 1 },
        ],
    { duration: state === 'success' ? 760 : 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  )
})

watch(successAvatarUrl, async (avatarUrl, previousAvatarUrl) => {
  if (!opened.value || !avatarUrl || avatarUrl === previousAvatarUrl) return
  await nextTick()
  const avatar = identityAvatarRef.value
  if (!(avatar instanceof HTMLElement)) return
  avatar.animate(
    [
      { transform: 'scale(0.7)', opacity: 0.25, filter: 'blur(5px)' },
      { transform: 'scale(1.1)', opacity: 1, filter: 'blur(0)', offset: 0.72 },
      { transform: 'scale(1)', opacity: 1, filter: 'blur(0)' },
    ],
    { duration: 720, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  )
})
</script>

<style scoped>
.login-dialog-layer {
  position: fixed;
  inset: 0;
  z-index: 1580;
  display: grid;
  place-items: center;
  padding: 24px;
  visibility: hidden;
  pointer-events: none;
  transition: visibility 0s linear 220ms;
}

.login-dialog-layer.is-open {
  visibility: visible;
  pointer-events: auto;
  transition-delay: 0s;
}

.login-dialog-backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: default;
  border: 0;
  background: rgba(247, 242, 239, 0.34);
  backdrop-filter: blur(16px) saturate(0.88);
  will-change: backdrop-filter;
}

.login-dialog-panel {
  position: relative;
  display: grid;
  box-sizing: border-box;
  width: min(820px, 100%);
  min-height: 500px;
  overflow: hidden;
  grid-template-columns: minmax(0, 1fr) 330px;
  outline: none;
  border: 1px solid rgba(255, 255, 255, 0.94);
  border-radius: 34px;
  background: #fbf9f7;
  box-shadow: 0 38px 110px rgba(82, 66, 63, 0.16);
  opacity: 0;
  filter: blur(5px);
  transition: opacity 180ms ease, filter 240ms ease;
}

.login-dialog-layer.is-open .login-dialog-panel {
  opacity: 1;
  filter: blur(0);
}

.login-dialog-panel::before {
  position: absolute;
  top: -190px;
  left: -150px;
  width: 470px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(244, 157, 139, 0.28), transparent 68%);
  content: '';
  pointer-events: none;
}

.login-dialog-copy {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  padding: 58px 28px 45px 52px;
}

.login-dialog-index {
  color: #e65f70;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.18em;
}

.login-dialog-copy h2 {
  margin: 26px 0 18px;
  color: #27262a;
  font-size: clamp(42px, 5vw, 60px);
  font-weight: 920;
  letter-spacing: -0.07em;
  line-height: 0.98;
}

.login-dialog-copy > p {
  max-width: 330px;
  margin: 0;
  color: #858187;
  font-size: 13px;
  font-weight: 560;
  line-height: 1.8;
}

.login-dialog-benefits {
  display: grid;
  gap: 13px;
  margin-top: auto;
  padding-top: 38px;
  color: #5f5b61;
  font-size: 11px;
  font-weight: 720;
}

.login-dialog-benefits span { display: flex; align-items: center; gap: 10px; }
.login-dialog-benefits i { width: 5px; aspect-ratio: 1; border-radius: 50%; background: #ef7180; box-shadow: 0 0 0 5px rgba(239, 113, 128, 0.1); }

.login-dialog-identity { align-items: center; justify-content: center; text-align: center; }
.login-dialog-identity > .login-dialog-index { position: absolute; top: 42px; left: 52px; }
.login-dialog-identity-stage { position: relative; display: grid; width: 178px; aspect-ratio: 1; place-items: center; margin-inline: auto; }
.login-dialog-identity-orbit { position: absolute; inset: 5px; border: 1px solid rgba(231, 113, 128, 0.15); border-radius: 50%; animation: login-identity-orbit 8s linear infinite; }
.login-dialog-identity-orbit::before,
.login-dialog-identity-orbit::after { position: absolute; border-radius: 50%; content: ''; }
.login-dialog-identity-orbit::before { top: 15px; right: 15px; width: 8px; aspect-ratio: 1; background: #ec7885; box-shadow: 0 0 0 6px rgba(236, 120, 133, 0.08); }
.login-dialog-identity-orbit::after { bottom: 23px; left: 4px; width: 5px; aspect-ratio: 1; background: #efad82; }
.login-dialog-identity-face { position: relative; display: grid; width: 122px; aspect-ratio: 1; overflow: hidden; place-items: center; color: #746e73; border: 5px solid rgba(255, 255, 255, 0.94); border-radius: 50%; background: linear-gradient(145deg, #eee9e6, #dfd9d7); box-shadow: 0 22px 45px rgba(103, 79, 75, 0.16), 0 0 0 9px rgba(255, 255, 255, 0.4); transition: opacity 120ms ease, box-shadow 260ms ease; }
.login-dialog-identity-face img { width: 100%; height: 100%; object-fit: cover; }
.login-dialog-identity-face svg { width: 44px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.35; }
.login-dialog-identity-stage.is-arriving .login-dialog-identity-face { opacity: 0; }
.login-dialog-identity-stage.is-authorized .login-dialog-identity-face { box-shadow: 0 24px 52px rgba(91, 151, 119, 0.18), 0 0 0 9px rgba(113, 197, 153, 0.1); }
.login-dialog-identity-check { position: absolute; right: 17px; bottom: 25px; display: grid; width: 34px; aspect-ratio: 1; place-items: center; color: #fff; border: 4px solid #f9f7f4; border-radius: 50%; background: #6fc392; box-shadow: 0 8px 18px rgba(83, 166, 121, 0.22); font-size: 14px; font-weight: 900; animation: login-success-pop 520ms 180ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.login-dialog-identity-copy { margin-top: 20px; }
.login-dialog-identity-copy > p { margin: 0; color: #df6978; font-size: 8px; font-weight: 850; letter-spacing: 0.2em; }
.login-dialog-identity-copy h2 { max-width: 330px; margin: 10px 0 8px; overflow: hidden; color: #302d31; font-size: 30px; font-weight: 880; letter-spacing: -0.045em; line-height: 1.12; text-overflow: ellipsis; white-space: nowrap; }
.login-dialog-identity-copy > span { display: block; max-width: 280px; overflow: hidden; color: #969095; font-size: 10px; font-weight: 620; text-overflow: ellipsis; white-space: nowrap; }
.login-dialog-identity-progress { display: flex; gap: 7px; margin-top: 34px; }
.login-dialog-identity-progress i { width: 22px; height: 3px; overflow: hidden; border-radius: 99px; background: rgba(87, 75, 77, 0.1); }
.login-dialog-identity-progress i::after { display: block; width: 100%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #e86f7e, #efaa7f); content: ''; transform: scaleX(0); transform-origin: left; transition: transform 360ms ease; }
.login-dialog-identity-progress i.is-active::after { transform: scaleX(1); }

.login-dialog-qr-area {
  position: relative;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  padding: 48px 36px 38px;
  border-left: 1px solid rgba(91, 72, 69, 0.055);
  background:
    radial-gradient(circle at 82% 15%, rgba(244, 161, 144, 0.2), transparent 34%),
    linear-gradient(145deg, #f5efeb, #eee8e5);
}

.login-dialog-qr-shell {
  display: grid;
  box-sizing: border-box;
  width: 230px;
  aspect-ratio: 1;
  place-items: center;
  padding: 13px;
  border-radius: 27px;
  border: 1px solid rgba(255, 255, 255, 0.96);
  background: #fff;
  box-shadow: 0 22px 48px rgba(87, 67, 63, 0.13), 0 0 0 7px rgba(255, 255, 255, 0.34);
  transition: border-color 260ms ease, box-shadow 260ms ease, transform 260ms ease;
}

.login-dialog-qr-shell.is-wait { border-color: rgba(235, 119, 131, 0.2); box-shadow: 0 22px 48px rgba(87, 67, 63, 0.13), 0 0 0 7px rgba(239, 113, 128, 0.08); }
.login-dialog-qr-shell.is-confirm { transform: scale(1.025); box-shadow: 0 24px 52px rgba(91, 74, 68, 0.16), 0 0 0 8px rgba(241, 160, 132, 0.12); }
.login-dialog-qr-shell.is-success { border-color: rgba(91, 180, 133, 0.28); box-shadow: 0 24px 54px rgba(80, 147, 113, 0.15), 0 0 0 8px rgba(104, 199, 148, 0.1); }
.login-dialog-qr-shell.is-error,
.login-dialog-qr-shell.is-expired { box-shadow: 0 20px 44px rgba(87, 67, 63, 0.1), 0 0 0 7px rgba(145, 134, 130, 0.08); }

.login-dialog-qr { position: relative; width: 100%; height: 100%; overflow: hidden; border-radius: 18px; }
.login-dialog-qr > img { display: block; width: 100%; height: 100%; object-fit: contain; }
.login-dialog-qr-shell.is-success .login-dialog-qr > img { animation: login-qr-base-destroy 520ms 80ms ease-in forwards; }
.login-dialog-qr-destroy { position: absolute; inset: 0; z-index: 2; overflow: visible; }
.login-dialog-qr-destroy > i { position: absolute; width: 25%; height: 25%; background-size: 400% 400%; opacity: 0; animation: login-qr-tile-destroy 720ms var(--tile-delay) cubic-bezier(0.34, 0.05, 0.42, 1) forwards; }
.login-dialog-qr-destroy > span { position: absolute; inset: 50% auto auto 50%; display: grid; width: 58px; aspect-ratio: 1; place-items: center; color: #fff; border-radius: 50%; background: #70c596; box-shadow: 0 13px 28px rgba(83, 166, 121, 0.2); opacity: 0; transform: translate(-50%, -50%) scale(0.45); animation: login-qr-destroy-check 500ms 470ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
.login-dialog-qr-destroy > span svg { width: 31px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2; }

.login-dialog-scan-line {
  position: absolute;
  right: 8px;
  left: 8px;
  z-index: 1;
  height: 2px;
  border-radius: 99px;
  background: linear-gradient(90deg, transparent, #ed7180 22%, #f29b78 78%, transparent);
  box-shadow: 0 0 14px rgba(237, 113, 128, 0.65);
  animation: login-scan 2.2s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

.login-dialog-state-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  color: #343034;
  border-radius: 18px;
  background: rgba(250, 247, 244, 0.9);
  backdrop-filter: blur(9px);
  animation: login-state-arrive 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.login-dialog-state-layer > img,
.login-dialog-state-layer.is-confirm > span { display: grid; width: 62px; aspect-ratio: 1; place-items: center; overflow: hidden; color: #fff; border: 4px solid rgba(255, 255, 255, 0.9); border-radius: 50%; background: linear-gradient(135deg, #ee7785, #f1a078); box-shadow: 0 10px 26px rgba(214, 111, 116, 0.2); font-size: 25px; animation: login-avatar-arrive 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.login-dialog-state-layer > img { object-fit: cover; }
.login-dialog-state-layer strong { font-size: 12px; font-weight: 830; letter-spacing: 0.04em; }
.login-dialog-state-layer small { color: #969095; font-size: 9px; font-weight: 620; }

.login-dialog-spinner { width: 43px; aspect-ratio: 1; margin-bottom: 5px; border: 3px solid rgba(231, 113, 128, 0.16); border-top-color: #e77180; border-radius: 50%; animation: login-spin 800ms linear infinite; }
.login-dialog-success-icon,
.login-dialog-expired-icon,
.login-dialog-error-icon { display: grid; width: 62px; aspect-ratio: 1; place-items: center; margin-bottom: 4px; border-radius: 50%; }
.login-dialog-success-icon { color: #fff; background: linear-gradient(135deg, #74ca9e, #a7ddba); box-shadow: 0 12px 28px rgba(84, 172, 126, 0.2); animation: login-success-pop 620ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.login-dialog-success-icon svg { width: 34px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2.2; }
.login-dialog-success-icon path { stroke-dasharray: 24; stroke-dashoffset: 24; animation: login-check-draw 480ms 220ms ease forwards; }
.login-dialog-state-layer.is-success .login-dialog-success-avatar { width: 84px; height: 84px; margin-bottom: 5px; border-width: 5px; box-shadow: 0 15px 34px rgba(117, 78, 78, 0.2), 0 0 0 8px rgba(255, 255, 255, 0.42); animation: login-success-avatar-grow 760ms cubic-bezier(0.16, 1, 0.3, 1) both; }
.login-dialog-state-layer.is-success > strong { margin-top: 2px; font-size: 15px; letter-spacing: -0.01em; animation: login-success-copy 420ms 230ms ease both; }
.login-dialog-success-id { display: block; max-width: 150px; overflow: hidden; padding: 3px 7px; color: #91898f !important; border-radius: 999px; background: rgba(255, 255, 255, 0.58); text-overflow: ellipsis; white-space: nowrap; animation: login-success-copy 420ms 330ms ease both; }
.login-dialog-expired-icon { color: #777177; background: #e9e5e2; }
.login-dialog-expired-icon svg { width: 31px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.6; animation: login-clock 720ms ease both; }
.login-dialog-error-icon { color: #c25f6b; background: #f4dedf; font-size: 26px; font-weight: 850; animation: login-error-shake 480ms ease both; }
.login-dialog-confetti { --confetti-x: 35px; --confetti-y: -72px; position: absolute; top: 50%; left: 50%; width: 5px; height: 12px; border-radius: 99px; background: #f08a8c; opacity: 0; animation: login-confetti 700ms 130ms ease-out both; }
.login-dialog-confetti:nth-of-type(2) { --confetti-x: 72px; --confetti-y: -54px; background: #f2b177; transform: rotate(35deg); }
.login-dialog-confetti:nth-of-type(3) { --confetti-x: 83px; --confetti-y: 8px; background: #7ecda1; transform: rotate(75deg); }
.login-dialog-confetti:nth-of-type(4) { --confetti-x: 50px; --confetti-y: 63px; background: #95b9dc; transform: rotate(125deg); }
.login-dialog-confetti:nth-of-type(5) { --confetti-x: -67px; --confetti-y: 48px; background: #f0a68b; transform: rotate(155deg); }
.login-dialog-confetti:nth-of-type(6) { --confetti-x: -82px; --confetti-y: -18px; background: #96cfb0; transform: rotate(210deg); }
.login-dialog-confetti:nth-of-type(7) { --confetti-x: -42px; --confetti-y: -68px; background: #dda1bd; transform: rotate(250deg); }

.login-dialog-loading { display: grid; width: 120px; aspect-ratio: 1; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.login-dialog-loading span { border-radius: 10px; background: #e7e4e2; animation: login-pulse 1.15s ease-in-out infinite alternate; }
.login-dialog-loading span:nth-child(2) { animation-delay: 180ms; }
.login-dialog-loading span:nth-child(3) { animation-delay: 360ms; }
.login-dialog-loading span:nth-child(4) { animation-delay: 540ms; }

.login-dialog-empty { display: grid; justify-items: center; gap: 18px; color: #89858a; }
.login-dialog-empty svg { width: 72px; fill: none; stroke: currentColor; stroke-linejoin: round; stroke-width: 1.3; }
.login-dialog-empty button,
.login-dialog-refresh { cursor: pointer; border: 0; font-family: inherit; }
.login-dialog-empty button { padding: 8px 12px; color: #575359; border-radius: 999px; background: #f0eeeb; font-size: 10px; font-weight: 760; }

.login-dialog-status { display: flex; width: 230px; align-items: flex-start; gap: 11px; margin-top: 24px; color: #4c484d; }
.login-dialog-status-dot { width: 7px; aspect-ratio: 1; flex: none; margin-top: 5px; border-radius: 50%; background: #e97886; box-shadow: 0 0 0 5px rgba(233, 120, 134, 0.09); animation: login-status-pulse 1.8s ease-in-out infinite; }
.login-dialog-status.is-confirm .login-dialog-status-dot { background: #eda06f; box-shadow: 0 0 0 5px rgba(237, 160, 111, 0.1); }
.login-dialog-status.is-success .login-dialog-status-dot { background: #69bf90; box-shadow: 0 0 0 5px rgba(105, 191, 144, 0.1); animation: none; }
.login-dialog-status.is-expired .login-dialog-status-dot { background: #9a9498; box-shadow: 0 0 0 5px rgba(154, 148, 152, 0.09); animation: none; }
.login-dialog-status.has-error .login-dialog-status-dot { background: #d96875; box-shadow: 0 0 0 5px rgba(217, 104, 117, 0.1); animation: none; }
.login-dialog-status > div { min-width: 0; flex: 1; }
.login-dialog-status-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.login-dialog-status strong { display: block; font-size: 11px; font-weight: 800; }
.login-dialog-status em { padding: 2px 5px; color: #a28f8e; border-radius: 6px; background: rgba(255, 255, 255, 0.64); font-size: 8px; font-style: normal; font-weight: 820; }
.login-dialog-status p { margin: 6px 0 0; color: #999297; font-size: 9px; font-weight: 560; line-height: 1.55; }

.login-dialog-refresh { display: flex; align-items: center; gap: 9px; margin-top: 22px; padding: 10px 14px; color: #fff; border-radius: 999px; background: #3f3a3e; box-shadow: 0 9px 20px rgba(71, 58, 61, 0.12); font-size: 10px; font-weight: 800; }
.login-dialog-refresh span { color: #e65f70; }

.login-dialog-close {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 2;
  display: grid;
  width: 36px;
  aspect-ratio: 1;
  cursor: pointer;
  place-items: center;
  color: #756f74;
  border: 1px solid rgba(54, 48, 53, 0.07);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.68);
}
.login-dialog-close svg { width: 16px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.8; }

@keyframes login-pulse { to { opacity: 0.35; transform: scale(0.92); } }
@keyframes login-scan {
  0% { top: 8px; opacity: 0; }
  12%, 88% { opacity: 1; }
  100% { top: calc(100% - 10px); opacity: 0; }
}
@keyframes login-spin { to { transform: rotate(360deg); } }
@keyframes login-state-arrive { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: none; } }
@keyframes login-avatar-arrive { from { opacity: 0; transform: scale(0.55) rotate(-8deg); } to { opacity: 1; transform: none; } }
@keyframes login-success-pop { 0% { opacity: 0; transform: scale(0.35) rotate(-18deg); } 70% { transform: scale(1.12) rotate(3deg); } 100% { opacity: 1; transform: none; } }
@keyframes login-success-avatar-grow { 0% { opacity: 0; transform: scale(0.34); filter: blur(4px); } 68% { opacity: 1; transform: scale(1.08); filter: blur(0); } 100% { opacity: 1; transform: scale(1); filter: blur(0); } }
@keyframes login-success-copy { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: none; } }
@keyframes login-check-draw { to { stroke-dashoffset: 0; } }
@keyframes login-clock { from { opacity: 0; transform: rotate(-35deg) scale(0.72); } to { opacity: 1; transform: none; } }
@keyframes login-error-shake { 0% { opacity: 0; transform: scale(0.7); } 45% { opacity: 1; transform: translateX(-5px); } 65% { transform: translateX(4px); } 82% { transform: translateX(-2px); } 100% { transform: none; } }
@keyframes login-confetti { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); } 22% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--confetti-x), var(--confetti-y)) scale(1) rotate(160deg); } }
@keyframes login-status-pulse { 50% { box-shadow: 0 0 0 8px rgba(233, 120, 134, 0); transform: scale(0.88); } }
@keyframes login-identity-orbit { to { transform: rotate(360deg); } }
@keyframes login-qr-base-destroy { 0% { opacity: 1; filter: blur(0); transform: scale(1); } 100% { opacity: 0; filter: blur(7px); transform: scale(0.86); } }
@keyframes login-qr-tile-destroy { 0% { opacity: 1; filter: blur(0); transform: translate3d(0, 0, 0) rotate(0) scale(1); } 72% { opacity: 0.78; } 100% { opacity: 0; filter: blur(2px); transform: translate3d(var(--tile-x), var(--tile-y), 0) rotate(var(--tile-rotate)) scale(0.48); } }
@keyframes login-qr-destroy-check { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.45) rotate(-12deg); } 68% { opacity: 1; transform: translate(-50%, -50%) scale(1.12) rotate(2deg); } 100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0); } }

@media (max-width: 680px) {
  .login-dialog-layer { align-items: end; padding: 10px; }
  .login-dialog-panel { min-height: 0; grid-template-columns: 1fr; border-radius: 28px; }
  .login-dialog-copy { display: block; padding: 28px 28px 22px; }
  .login-dialog-copy h2 { margin: 15px 0 10px; font-size: 36px; }
  .login-dialog-copy > p { font-size: 11px; line-height: 1.65; }
  .login-dialog-benefits { display: none; }
  .login-dialog-identity { padding: 24px 24px 20px; }
  .login-dialog-identity > .login-dialog-index { position: static; display: block; margin-bottom: 10px; text-align: left; }
  .login-dialog-identity-stage { width: 112px; }
  .login-dialog-identity-face { width: 78px; border-width: 4px; box-shadow: 0 14px 28px rgba(103, 79, 75, 0.14), 0 0 0 6px rgba(255, 255, 255, 0.38); }
  .login-dialog-identity-face svg { width: 30px; }
  .login-dialog-identity-check { right: 7px; bottom: 12px; width: 27px; border-width: 3px; }
  .login-dialog-identity-copy { margin-top: 8px; }
  .login-dialog-identity-copy h2 { margin: 7px auto 5px; font-size: 23px; }
  .login-dialog-identity-progress { justify-content: center; margin-top: 15px; }
  .login-dialog-qr-area { padding: 26px 24px 28px; }
  .login-dialog-qr-shell { width: 190px; border-radius: 23px; }
  .login-dialog-status { width: 190px; margin-top: 18px; }
  .login-dialog-close { top: 15px; right: 15px; }
}

@media (prefers-reduced-motion: reduce) {
  .login-dialog-layer,
  .login-dialog-panel { transition-duration: 1ms; }
  .login-dialog-layer * { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
}
</style>
