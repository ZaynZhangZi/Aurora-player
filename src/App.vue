<template>
	<div class="app-shell">
		<floatingSearchFab />
		<div ref="contentRef" class="app-content">
			<router-view />
		</div>
		<globalFooterPlayer />
	</div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { animate } from "motion";
import { useRoute, useRouter } from "vue-router";
import FloatingSearchFab from "@/components/floatingSearchFab/floatingSearchFab.vue";
import GlobalFooterPlayer from "@/components/globalFooterPlayer/globalFooterPlayer.vue";

const route = useRoute();
const router = useRouter();
const contentRef = ref(null);
const canGoBack = computed(() => route.path !== "/home");

const swipeState = {
	active: false,
	triggered: false,
	startX: 0,
	startY: 0,
};

const EDGE_START_LIMIT = 28;
const MIN_SWIPE_DISTANCE = 76;
const MAX_VERTICAL_DRIFT = 56;

function goBack() {
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
});

onBeforeUnmount(() => {
	unbindGlobalBackGesture();
});

watch(
	() => route.fullPath,
	async () => {
		await nextTick();
		runRouteEnterMotion();
	},
);
</script>

<style>
::-webkit-scrollbar {
	display: none;
}

.app-shell {
	min-height: 100vh;
}

.app-content {
	padding-bottom: 0;
	background: transparent;
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
