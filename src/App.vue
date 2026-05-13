<template>
	<div class="app-shell">
		<div class="top-blur-gradient" :style="topBlurStyle" aria-hidden="true" />
		<floatingSearchFab />
		<div ref="contentRef" class="app-content">
			<router-view v-slot="{ Component, route: currentRoute }">
				<keep-alive>
					<component :is="Component" v-if="currentRoute.meta.keepAlive" />
				</keep-alive>
				<component :is="Component" v-if="!currentRoute.meta.keepAlive" />
			</router-view>
		</div>
		<globalFooterPlayer />
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

const FloatingSearchFab = defineAsyncComponent(() => import("@/components/floatingSearchFab/floatingSearchFab.vue"));
const GlobalFooterPlayer = defineAsyncComponent(() => import("@/components/globalFooterPlayer/globalFooterPlayer.vue"));

const route = useRoute();
const router = useRouter();
const userStore = useCounterStore();
const contentRef = ref(null);
const canGoBack = computed(() => route.path !== "/home");
const restrictionDialog = ref({
	open: false,
	title: "",
	message: "",
});
const topBlurStyle = {
	backdropFilter: "blur(var(--top-blur-size, 22px))",
	WebkitBackdropFilter: "blur(var(--top-blur-size, 22px))",
};

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
	} catch {
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
	} catch {
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
  animate(
    contentRef.value,
    { opacity: [0, 1], y: [10, 0], filter: ["blur(6px)", "blur(0px)"] },
		{ duration: 0.28, easing: [0.22, 1, 0.36, 1] },
	);
}

onMounted(() => {
	runRouteEnterMotion();
	bindGlobalBackGesture();
	startUserStatusPolling();
});

onBeforeUnmount(() => {
	unbindGlobalBackGesture();
	stopUserStatusPolling();
});

watch(
	() => [userStore.isLoggedIn, userStore.userId],
	() => {
		startUserStatusPolling();
	},
);

watch(
	() => route.fullPath,
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

.top-blur-gradient {
	--top-blur-size: 22px;
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	height: clamp(84px, 18vh, 180px);
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.06) 58%, rgba(255, 255, 255, 0) 100%);
	mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.55) 56%, rgba(0, 0, 0, 0) 100%);
	-webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.55) 56%, rgba(0, 0, 0, 0) 100%);
	pointer-events: none;
	z-index: 2;
}

@media (max-width: 768px) {
	.top-blur-gradient {
		--top-blur-size: 14px;
	}
}

@supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
	.top-blur-gradient {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 100%);
	}
}

::view-transition-old(root),
::view-transition-new(root) {
	animation-duration: 360ms;
	animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

::view-transition-old(*),
::view-transition-new(*) {
	animation-duration: 460ms;
	animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
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
	transition: transform 160ms ease, background-color 160ms ease;
}

.restriction-dialog-button:hover {
	background: rgb(68, 64, 60);
}

.restriction-dialog-button:active {
	transform: scale(0.98);
}

.restriction-dialog-enter-active,
.restriction-dialog-leave-active {
	transition: opacity 180ms ease;
}

.restriction-dialog-enter-from,
.restriction-dialog-leave-to {
	opacity: 0;
}

.restriction-dialog-enter-active .restriction-dialog-panel,
.restriction-dialog-leave-active .restriction-dialog-panel {
	transition: transform 220ms ease, opacity 180ms ease;
}

.restriction-dialog-enter-from .restriction-dialog-panel,
.restriction-dialog-leave-to .restriction-dialog-panel {
	opacity: 0;
	transform: translateY(10px) scale(0.96);
}
</style>
