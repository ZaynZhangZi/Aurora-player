<template>
	<div class="app-shell">
		<floatingSearchFab />
		<div class="app-content"><router-view /></div>
		<globalFooterPlayer />
	</div>
</template>

<script setup>
import FloatingSearchFab from "@/components/floatingSearchFab/floatingSearchFab.vue";
import GlobalFooterPlayer from "@/components/globalFooterPlayer/globalFooterPlayer.vue";
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
</style>
