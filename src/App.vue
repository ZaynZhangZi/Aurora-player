<template>
  <floatingSearchFab/>
  <router-view/>
</template>

<script setup>
import FloatingSearchFab from "@/components/floatingSearchFab/floatingSearchFab.vue";
</script>


<style>
::-webkit-scrollbar {
  display: none;
}
</style>
