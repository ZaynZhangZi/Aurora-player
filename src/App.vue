<template>
  <floatingSearchFab/>
  <router-view/>
  <globalFooterPlayer/>
</template>

<script setup>
import FloatingSearchFab from "@/components/floatingSearchFab/floatingSearchFab.vue";
import GlobalFooterPlayer from "@/components/globalFooterPlayer/globalFooterPlayer.vue";
</script>


<style>
::-webkit-scrollbar {
  display: none;
}
</style>
