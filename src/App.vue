<template>
	<!-- 🎬 开屏动画 -->
	<AppSplashScreen
		v-if="showSplash"
		:min-duration="280"
		@complete="onSplashComplete"
	/>

	<div
		class="app-shell"
		:inert="showSplash ? '' : null"
		:aria-hidden="showSplash ? 'true' : null"
	>
		<div ref="contentRef" class="app-content">
			<router-view v-slot="{ Component }">
				<keep-alive :include="keepAliveNames">
					<component :is="Component" />
				</keep-alive>
			</router-view>
		</div>
		<globalFooterPlayer />
		<QrLoginDialog />
		<div class="playback-notice-host" aria-live="polite" aria-atomic="true">
			<Transition name="playback-notice">
				<aside
					v-if="playbackNotice.open"
					class="playback-notice-card"
					:class="`is-${playbackNotice.kind}`"
					:style="{ '--notice-duration': `${playbackNotice.duration}ms` }"
					role="status"
				>
					<div class="playback-notice-mark" aria-hidden="true">
						<span class="playback-notice-orbit" />
						<div class="playback-notice-icon">
							<svg v-if="playbackNotice.kind === 'vip'" viewBox="0 0 24 24">
								<circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" stroke-width="1.45" />
								<circle cx="12" cy="12" r="2.25" fill="currentColor" />
								<path d="M12 3.75a8.25 8.25 0 0 1 7.78 5.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.2" />
							</svg>
							<svg v-else-if="playbackNotice.kind === 'trial'" viewBox="0 0 24 24">
								<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.55" />
								<path d="M12 7.5v5l3.2 1.9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
							</svg>
							<svg v-else-if="playbackNotice.kind === 'purchase'" viewBox="0 0 24 24">
								<path d="M5 8.25h14l-1 11H6l-1-11Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.55" />
								<path d="M8.5 9V6.75a3.5 3.5 0 0 1 7 0V9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.55" />
							</svg>
							<svg v-else-if="playbackNotice.kind === 'network'" viewBox="0 0 24 24">
								<path d="M4.25 9.5a11.1 11.1 0 0 1 15.5 0M7.4 12.75a6.7 6.7 0 0 1 9.2 0M10.55 16a2.25 2.25 0 0 1 2.9 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7" />
								<path d="m4 4 16 16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.65" />
							</svg>
							<svg v-else viewBox="0 0 24 24">
								<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.55" />
								<path d="M12 7.75v5.1M12 16.25h.01" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.85" />
							</svg>
						</div>
					</div>
					<div class="playback-notice-copy">
						<div class="playback-notice-meta">
							<span class="playback-notice-signal" aria-hidden="true" />
							<p class="playback-notice-eyebrow">{{ playbackNotice.eyebrow }}</p>
						</div>
						<p class="playback-notice-title">{{ playbackNotice.title }}</p>
						<p class="playback-notice-message">{{ playbackNotice.message }}</p>
					</div>
					<button class="playback-notice-close" type="button" aria-label="关闭播放提示" @click="closePlaybackNotice()">
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="m7.5 7.5 9 9m0-9-9 9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
						</svg>
					</button>
					<span :key="playbackNotice.id" class="playback-notice-timer" aria-hidden="true" />
				</aside>
			</Transition>
		</div>
		<Transition name="restriction-dialog">
			<div
				v-if="restrictionDialog.open"
				class="restriction-dialog-layer"
				role="dialog"
				aria-modal="true"
				aria-labelledby="restriction-dialog-title"
			>
				<div class="restriction-dialog-backdrop" @click="closeRestrictionDialog" />
				<div class="restriction-dialog-panel">
					<div class="restriction-dialog-icon">
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="M12 3.75 2.75 20.25h18.5L12 3.75Z" fill="currentColor" opacity="0.14" />
							<path d="M12 8.25v5.25M12 16.75h.01M2.75 20.25h18.5L12 3.75 2.75 20.25Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
						</svg>
					</div>
					<div class="restriction-dialog-copy">
						<p id="restriction-dialog-title" class="restriction-dialog-title">{{ restrictionDialog.title }}</p>
						<p class="restriction-dialog-message">{{ restrictionDialog.message }}</p>
					</div>
					<button class="restriction-dialog-button" type="button" @click="closeRestrictionDialog">
						我知道了
					</button>
				</div>
			</div>
		</Transition>
	</div>
</template>

<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { animate } from "motion";
import { useRoute, useRouter } from "vue-router";
import { consumeNavigatingBack, markNavigatingBack } from "@/router/index.js";
import { useCounterStore } from "@/stores/userStores.js";
import { reportApi } from "@/api/reportApi/reportApi.js";
import { userApi } from "@/api/userApi/userApi.js";
import AppSplashScreen from "@/components/AppSplashScreen/AppSplashScreen.vue";
import QrLoginDialog from "@/components/login/QrLoginDialog.vue";
import { PLAYBACK_NOTICE_EVENT } from "@/utils/playbackNotice.js";

const GlobalFooterPlayer = defineAsyncComponent(() => import("@/components/globalFooterPlayer/globalFooterPlayer.vue"));

const route = useRoute();
const router = useRouter();
const userStore = useCounterStore();
const contentRef = ref(null);
const canGoBack = computed(() => route.path !== "/home");

const SPLASH_SESSION_KEY = "aurora-splash-seen";

function shouldShowSplash() {
	try {
		return window.sessionStorage.getItem(SPLASH_SESSION_KEY) !== "1";
	} catch (error) {
		void error;
		return true;
	}
}

// 每个会话只展示一次短开屏；页面主体会在遮罩后正常渲染。
const showSplash = ref(shouldShowSplash());

// 开屏动画完成回调
function onSplashComplete() {
	showSplash.value = false;
	try {
		window.sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
	} catch (error) {
		void error;
	}
	// 动画完成后触发路由进入动画
	nextTick(() => {
		runRouteEnterMotion();
	});
}

// 检测是否需要显示开屏动画（首次访问或刷新）
onMounted(() => {
	// 如果用户禁用动画，跳过开屏
	const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (prefersReducedMotion) {
		showSplash.value = false;
		try {
			window.sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
		} catch (error) {
			void error;
		}
	}
});

// 需要 keepAlive 的组件名（对应 defineOptions({ name })）
const keepAliveNames = computed(() => {
  const names = [];
  for (const record of route.matched) {
    if (record.meta?.keepAlive) {
		names.push(record.meta?.keepAliveName || record.name);
    }
  }
  return names;
});
const restrictionDialog = ref({
	open: false,
	title: "",
	message: "",
	duration: 5200,
});
const playbackNotice = ref({
	open: false,
	id: "",
	kind: "unavailable",
	eyebrow: "PLAYBACK",
	title: "",
	message: "",
});
const swipeState = {
	active: false,
	triggered: false,
	startX: 0,
	startY: 0,
};

const EDGE_START_LIMIT = 28;
const MIN_SWIPE_DISTANCE = 76;
const MAX_VERTICAL_DRIFT = 56;
const USER_STATUS_CHECK_INTERVAL = 60 * 1000;
let userStatusTimer = null;
let checkingUserStatus = false;
let playbackNoticeTimer = null;

function closePlaybackNotice(expectedId = "") {
	if (expectedId && playbackNotice.value.id !== expectedId) return;
	if (playbackNoticeTimer) {
		window.clearTimeout(playbackNoticeTimer);
		playbackNoticeTimer = null;
	}
	playbackNotice.value.open = false;
}

function handlePlaybackNotice(event) {
	const detail = event?.detail || {};
	if (detail.action === "dismiss") {
		closePlaybackNotice();
		return;
	}

	if (playbackNoticeTimer) window.clearTimeout(playbackNoticeTimer);
	const noticeId = detail.id || String(Date.now());

	playbackNotice.value = {
		open: true,
		id: noticeId,
		kind: detail.kind || "unavailable",
		eyebrow: detail.eyebrow || "PLAYBACK",
		title: detail.title || "暂时无法播放",
		message: detail.message || "",
		duration: Number(detail.duration) || 5200,
	};

	playbackNoticeTimer = window.setTimeout(
		() => closePlaybackNotice(noticeId),
		Number(detail.duration) || 5200,
	);
}

function goBack() {
	markNavigatingBack();
	const matched = route.matched || [];
	if (matched.length > 1) {
		const parent = matched[matched.length - 2];
		if (parent?.name) {
			router.push({ name: parent.name });
			return;
		}
		if (parent?.path) {
			router.push(parent.path);
			return;
		}
	}

	if (window.history.length > 1) {
		router.back();
		return;
	}

	router.push("/home");
}

function handleKeydown(event) {
	if (!canGoBack.value) return;
	const target = event.target;
	const editable =
		target instanceof HTMLElement &&
		(target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
	if (editable) return;

	const isAltArrowLeft = event.altKey && event.key === "ArrowLeft";
	const isMacBracketBack = event.metaKey && event.key === "[";
	const isCtrlBracketBack = event.ctrlKey && event.key === "[";
	const isBackspace = event.key === "Backspace";
	const isBrowserBackKey = event.key === "BrowserBack";

	if (isAltArrowLeft || isMacBracketBack || isCtrlBracketBack || isBackspace || isBrowserBackKey) {
		event.preventDefault();
		goBack();
	}
}

function handleMouseup(event) {
	if (!canGoBack.value) return;
	if (event.button === 3) {
		event.preventDefault();
		goBack();
	}
}

function onTouchStart(event) {
	if (!canGoBack.value || event.touches.length !== 1) return;
	const touch = event.touches[0];
	if (touch.clientX > EDGE_START_LIMIT) return;

	swipeState.active = true;
	swipeState.triggered = false;
	swipeState.startX = touch.clientX;
	swipeState.startY = touch.clientY;
}

function onTouchMove(event) {
	if (!swipeState.active || swipeState.triggered || event.touches.length !== 1) return;
	const touch = event.touches[0];
	const deltaX = touch.clientX - swipeState.startX;
	const deltaY = Math.abs(touch.clientY - swipeState.startY);

	if (deltaX > MIN_SWIPE_DISTANCE && deltaY < MAX_VERTICAL_DRIFT) {
		swipeState.triggered = true;
		swipeState.active = false;
		goBack();
	}
}

function onTouchEnd() {
	swipeState.active = false;
	swipeState.triggered = false;
}

function bindGlobalBackGesture() {
	window.addEventListener("keydown", handleKeydown);
	window.addEventListener("mouseup", handleMouseup);
	window.addEventListener("touchstart", onTouchStart, { passive: true });
	window.addEventListener("touchmove", onTouchMove, { passive: true });
	window.addEventListener("touchend", onTouchEnd, { passive: true });
	window.addEventListener("touchcancel", onTouchEnd, { passive: true });
}

function unbindGlobalBackGesture() {
	window.removeEventListener("keydown", handleKeydown);
	window.removeEventListener("mouseup", handleMouseup);
	window.removeEventListener("touchstart", onTouchStart);
	window.removeEventListener("touchmove", onTouchMove);
	window.removeEventListener("touchend", onTouchEnd);
	window.removeEventListener("touchcancel", onTouchEnd);
}

function isRestrictedStatus(status) {
	const normalized = String(status || "").toUpperCase();
	return normalized === "BANNED" || normalized === "DISABLED";
}

function closeRestrictionDialog() {
	restrictionDialog.value.open = false;
}

function showRestrictionDialog(statusInfo) {
	const action = String(statusInfo?.status || "").toUpperCase() === "DISABLED" ? "禁用" : "封禁";
	restrictionDialog.value = {
		open: true,
		title: `账号已被${action}`,
		message: statusInfo?.banReason ? `原因：${statusInfo.banReason}` : "该账号暂时无法继续使用，请联系管理员处理。",
	};
}

async function forceLogoutForRestriction(statusInfo) {
	stopUserStatusPolling();
	try {
		await userApi.logout();
	} catch (error) {
		void error;
	}
	userStore.logout();
	showRestrictionDialog(statusInfo);
	if (route.path !== "/home") {
		router.push("/home");
	}
}

async function checkCurrentUserStatus() {
	if (checkingUserStatus || !userStore.isLoggedIn || !userStore.userId) return;
	checkingUserStatus = true;
	try {
		const statusInfo = await reportApi.getNeteaseUserStatus(userStore.userId);
		if (isRestrictedStatus(statusInfo?.status)) {
			await forceLogoutForRestriction(statusInfo);
		}
	} catch (error) {
		void error;
	} finally {
		checkingUserStatus = false;
	}
}

function startUserStatusPolling() {
	stopUserStatusPolling();
	if (!userStore.isLoggedIn || !userStore.userId) return;
	void checkCurrentUserStatus();
	userStatusTimer = window.setInterval(checkCurrentUserStatus, USER_STATUS_CHECK_INTERVAL);
}

function stopUserStatusPolling() {
	if (userStatusTimer) {
		clearInterval(userStatusTimer);
		userStatusTimer = null;
	}
}

function runRouteEnterMotion() {
  if (!contentRef.value) return;
  const routeMotionTarget = contentRef.value.querySelector("[data-route-motion-root]") || contentRef.value;
  animate(
    routeMotionTarget,
    { opacity: [0, 1], y: [16, -2, 0], scale: [0.992, 1.004, 1] },
		{ type: "spring", stiffness: 240, damping: 28, mass: 0.68 },
	);
}

onMounted(() => {
	runRouteEnterMotion();
	bindGlobalBackGesture();
	startUserStatusPolling();
	window.addEventListener(PLAYBACK_NOTICE_EVENT, handlePlaybackNotice);
});

onBeforeUnmount(() => {
	unbindGlobalBackGesture();
	stopUserStatusPolling();
	window.removeEventListener(PLAYBACK_NOTICE_EVENT, handlePlaybackNotice);
	if (playbackNoticeTimer) window.clearTimeout(playbackNoticeTimer);
});

watch(
	() => [userStore.isLoggedIn, userStore.userId],
	() => {
		startUserStatusPolling();
	},
);

watch(
	() => route.path,
	async () => {
		await nextTick();
		if (!consumeNavigatingBack()) {
			runRouteEnterMotion();
		}
	},
);
</script>

<style>
::-webkit-scrollbar {
	display: none;
}

.app-shell {
	min-height: 100vh;
	position: relative;
}

.app-content {
	padding-bottom: 0;
	background: transparent;
	position: relative;
	z-index: 1;
}

::view-transition-old(root),
::view-transition-new(root) {
	animation-duration: 460ms;
	animation-timing-function: cubic-bezier(0.34, 1.22, 0.64, 1);
}

::view-transition-old(*),
::view-transition-new(*) {
	animation-duration: 560ms;
	animation-timing-function: cubic-bezier(0.34, 1.18, 0.64, 1);
}

@media (prefers-reduced-motion: reduce) {
	::view-transition-old(root),
	::view-transition-new(root),
	::view-transition-old(*),
	::view-transition-new(*) {
		animation-duration: 1ms;
	}
}
</style>

<style scoped>
.playback-notice-host {
	position: fixed;
	right: clamp(16px, 3vw, 40px);
	bottom: calc(var(--global-player-space, 92px) + 18px);
	z-index: 1500;
	width: min(408px, calc(100vw - 28px));
	pointer-events: none;
}

.playback-notice-card {
	--notice-rgb: 112, 99, 91;
	--notice-accent: rgb(var(--notice-rgb));
	--notice-soft: rgba(var(--notice-rgb), 0.105);
	position: relative;
	display: grid;
	grid-template-columns: 54px minmax(0, 1fr) 28px;
	gap: 14px;
	align-items: center;
	isolation: isolate;
	overflow: hidden;
	border: 1px solid rgba(var(--notice-rgb), 0.13);
	border-radius: 26px;
	background:
		radial-gradient(circle at 7% 15%, rgba(var(--notice-rgb), 0.09), transparent 34%),
		rgba(253, 252, 250, 0.94);
	padding: 16px 13px 18px 16px;
	box-shadow:
		0 24px 64px rgba(46, 39, 35, 0.15),
		0 3px 12px rgba(46, 39, 35, 0.055),
		inset 0 1px 0 rgba(255, 255, 255, 0.8);
	color: rgb(41, 37, 36);
	backdrop-filter: blur(26px) saturate(1.16);
	-webkit-backdrop-filter: blur(26px) saturate(1.16);
	pointer-events: auto;
}

.playback-notice-card::before {
	position: absolute;
	top: -36px;
	left: -32px;
	z-index: -1;
	height: 112px;
	width: 112px;
	border: 1px solid rgba(var(--notice-rgb), 0.08);
	border-radius: 50%;
	box-shadow: 0 0 0 18px rgba(var(--notice-rgb), 0.025);
	content: "";
}

.playback-notice-card.is-vip {
	--notice-rgb: 43, 40, 38;
}

.playback-notice-card.is-trial {
	--notice-rgb: 225, 91, 103;
}

.playback-notice-card.is-purchase {
	--notice-rgb: 181, 128, 49;
}

.playback-notice-card.is-copyright,
.playback-notice-card.is-unavailable {
	--notice-rgb: 174, 80, 88;
}

.playback-notice-card.is-network,
.playback-notice-card.is-account {
	--notice-rgb: 62, 116, 140;
}

.playback-notice-mark {
	position: relative;
	display: grid;
	height: 54px;
	width: 54px;
	place-items: center;
}

.playback-notice-orbit {
	position: absolute;
	inset: 1px;
	border: 1px solid rgba(var(--notice-rgb), 0.16);
	border-radius: 50%;
}

.playback-notice-orbit::after {
	position: absolute;
	top: 2px;
	right: 6px;
	height: 5px;
	width: 5px;
	border-radius: 50%;
	background: var(--notice-accent);
	box-shadow: 0 0 0 4px rgba(var(--notice-rgb), 0.09);
	content: "";
}

.playback-notice-icon {
	display: grid;
	height: 44px;
	width: 44px;
	place-items: center;
	border: 1px solid rgba(255, 255, 255, 0.8);
	border-radius: 50%;
	background: var(--notice-soft);
	box-shadow: inset 0 0 0 1px rgba(var(--notice-rgb), 0.035);
	color: var(--notice-accent);
}

.playback-notice-icon svg {
	height: 24px;
	width: 24px;
}

.playback-notice-copy {
	min-width: 0;
}

.playback-notice-meta {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 3px;
}

.playback-notice-signal {
	height: 5px;
	width: 5px;
	flex: 0 0 auto;
	border-radius: 50%;
	background: var(--notice-accent);
	box-shadow: 0 0 0 3px rgba(var(--notice-rgb), 0.09);
}

.playback-notice-eyebrow {
	margin: 0;
	font-size: 8.5px;
	font-weight: 800;
	letter-spacing: 0.18em;
	line-height: 1.2;
	color: var(--notice-accent);
}

.playback-notice-title {
	margin: 0;
	font-size: 15.5px;
	font-weight: 800;
	letter-spacing: -0.02em;
	line-height: 1.35;
}

.playback-notice-message {
	margin: 3px 0 0;
	font-size: 12.5px;
	line-height: 1.48;
	color: rgb(112, 104, 98);
	overflow-wrap: anywhere;
}

.playback-notice-close {
	display: grid;
	height: 28px;
	width: 28px;
	place-items: center;
	align-self: start;
	border-radius: 999px;
	color: rgb(120, 113, 108);
	transition: background-color 180ms ease, color 180ms ease, transform 180ms ease;
}

.playback-notice-close:hover {
	background: rgba(41, 37, 36, 0.07);
	color: rgb(41, 37, 36);
}

.playback-notice-close:active {
	transform: scale(0.92);
}

.playback-notice-close svg {
	height: 17px;
	width: 17px;
}

.playback-notice-timer {
	position: absolute;
	right: 18px;
	bottom: 7px;
	left: 18px;
	height: 2px;
	overflow: hidden;
	border-radius: 999px;
	background: rgba(var(--notice-rgb), 0.08);
}

.playback-notice-timer::after {
	display: block;
	height: 100%;
	width: 100%;
	border-radius: inherit;
	background: rgba(var(--notice-rgb), 0.62);
	content: "";
	transform-origin: left center;
	animation: playback-notice-countdown var(--notice-duration, 5200ms) linear forwards;
}

.playback-notice-enter-active,
.playback-notice-leave-active {
	transition:
		opacity 220ms ease,
		transform 480ms cubic-bezier(0.22, 1.22, 0.36, 1),
		filter 280ms ease;
}

.playback-notice-enter-from,
.playback-notice-leave-to {
	opacity: 0;
	filter: blur(5px);
	transform: translate3d(20px, 9px, 0) scale(0.95);
}

@keyframes playback-notice-countdown {
	from {
		transform: scaleX(1);
	}
	to {
		transform: scaleX(0);
	}
}

.restriction-dialog-layer {
	position: fixed;
	inset: 0;
	z-index: 1600;
	display: grid;
	place-items: center;
	padding: 24px;
}

.restriction-dialog-backdrop {
	position: absolute;
	inset: 0;
	background: rgba(15, 23, 42, 0.42);
	backdrop-filter: blur(10px);
	-webkit-backdrop-filter: blur(10px);
}

.restriction-dialog-panel {
	position: relative;
	display: flex;
	width: min(400px, 100%);
	flex-direction: column;
	align-items: center;
	border-radius: 24px;
	border: 1px solid rgba(255, 255, 255, 0.7);
	background: rgba(255, 255, 255, 0.94);
	padding: 28px 24px 24px;
	box-shadow: 0 28px 80px rgba(15, 23, 42, 0.28);
	color: rgb(28, 25, 23);
	text-align: center;
}

.restriction-dialog-icon {
	display: grid;
	height: 48px;
	width: 48px;
	place-items: center;
	border-radius: 16px;
	background: rgb(255, 241, 242);
	color: rgb(225, 29, 72);
}

.restriction-dialog-icon svg {
	height: 30px;
	width: 30px;
}

.restriction-dialog-copy {
	width: 100%;
}

.restriction-dialog-title {
	margin-top: 16px;
	font-size: 20px;
	font-weight: 800;
	letter-spacing: 0;
	line-height: 1.25;
}

.restriction-dialog-message {
	margin-top: 8px;
	font-size: 14px;
	line-height: 1.7;
	color: rgb(87, 83, 78);
	overflow-wrap: anywhere;
}

.restriction-dialog-button {
	margin-top: 22px;
	width: 100%;
	max-width: 280px;
	border-radius: 999px;
	background: rgb(28, 25, 23);
	padding: 11px 16px;
	font-size: 14px;
	font-weight: 700;
	color: white;
	transition: transform 240ms cubic-bezier(0.34, 1.35, 0.64, 1), background-color 180ms ease;
}

.restriction-dialog-button:hover {
	background: rgb(68, 64, 60);
}

.restriction-dialog-button:active {
	transform: scale(0.98);
}

.restriction-dialog-enter-active,
.restriction-dialog-leave-active {
	transition: opacity 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

.restriction-dialog-enter-from,
.restriction-dialog-leave-to {
	opacity: 0;
}

.restriction-dialog-enter-active .restriction-dialog-panel,
.restriction-dialog-leave-active .restriction-dialog-panel {
	transition:
		transform 520ms cubic-bezier(0.34, 1.25, 0.64, 1),
		opacity 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

.restriction-dialog-enter-from .restriction-dialog-panel,
.restriction-dialog-leave-to .restriction-dialog-panel {
	opacity: 0;
	transform: translateY(10px) scale(0.96);
}

@media (max-width: 640px) {
	.playback-notice-host {
		right: 12px;
		bottom: calc(var(--global-player-space, 82px) + 12px);
		left: 12px;
		width: auto;
	}

	.playback-notice-card {
		grid-template-columns: 48px minmax(0, 1fr) 26px;
		gap: 11px;
		border-radius: 22px;
		padding: 13px 10px 16px 13px;
	}

	.playback-notice-mark {
		height: 48px;
		width: 48px;
	}

	.playback-notice-icon {
		height: 39px;
		width: 39px;
	}

	.playback-notice-message {
		font-size: 12px;
	}
}

@media (prefers-reduced-motion: reduce) {
	.playback-notice-enter-active,
	.playback-notice-leave-active {
		transition-duration: 1ms;
	}
}

</style>
