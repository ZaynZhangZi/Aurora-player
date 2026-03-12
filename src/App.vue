<template>
	<div class="app-shell">
		<floatingSearchFab />
		<button
			v-if="showGlobalBack"
			class="global-back-btn"
			type="button"
			aria-label="返回上一级"
			@click="goBack"
		>
			<svg viewBox="0 0 24 24" aria-hidden="true" class="global-back-icon">
				<path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			<span class="global-back-text">返回</span>
		</button>
		<div ref="contentRef" class="app-content">
			<router-view />
		</div>
		<globalFooterPlayer />
	</div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { animate } from "motion";
import { useRoute, useRouter } from "vue-router";
import FloatingSearchFab from "@/components/floatingSearchFab/floatingSearchFab.vue";
import GlobalFooterPlayer from "@/components/globalFooterPlayer/globalFooterPlayer.vue";

const route = useRoute();
const router = useRouter();
const contentRef = ref(null);
const showGlobalBack = computed(() => route.path !== "/home");

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

.global-back-btn {
	position: fixed;
	left: 14px;
	top: calc(env(safe-area-inset-top, 0px) + 14px);
	z-index: 55;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	height: 38px;
	padding: 0 12px 0 10px;
	border-radius: 9999px;
	border: 1px solid rgba(148, 163, 184, 0.36);
	background: rgba(248, 250, 252, 0.88);
	color: rgb(51, 65, 85);
	box-shadow: 0 6px 14px rgba(15, 23, 42, 0.1);
	backdrop-filter: blur(10px);
	transition: transform 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
}

.global-back-btn:hover {
	background: rgba(255, 255, 255, 0.96);
	transform: translateY(-1px);
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.14);
}

.global-back-icon {
	height: 16px;
	width: 16px;
}

.global-back-text {
	font-size: 12px;
	font-weight: 600;
	letter-spacing: 0.01em;
}

@media (max-width: 640px) {
	.global-back-btn {
		display: none;
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
