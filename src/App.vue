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

async function forceLogoutForRestriction(statusInfo) {
	stopUserStatusPolling();
	try {
		await userApi.logout();
	} catch {
	}
	userStore.logout();
	const reason = statusInfo?.banReason ? `：${statusInfo.banReason}` : "";
	const action = String(statusInfo?.status || "").toUpperCase() === "DISABLED" ? "禁用" : "封禁";
	window.alert(`账号已被${action}${reason}`);
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
