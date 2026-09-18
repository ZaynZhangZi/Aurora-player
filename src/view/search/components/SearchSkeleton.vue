<template>
  <div class="sk" aria-hidden="true">
    <div class="sk-songs">
      <div v-for="n in 5" :key="n" class="sk-song">
        <div class="sk-idx shimmer" />
        <div class="sk-thumb shimmer" />
        <div class="sk-song-lines">
          <div class="sk-line shimmer" style="width: 54%" />
          <div class="sk-line shimmer" style="width: 34%" />
        </div>
      </div>
    </div>
    <div class="sk-covers">
      <div v-for="n in 5" :key="n" class="sk-covercell">
        <div class="sk-square shimmer" />
        <div class="sk-line shimmer" style="width: 70%" />
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.sk { display: grid; gap: 44px; }

.sk-songs { display: grid; gap: 6px; }
.sk-song { display: grid; grid-template-columns: 24px 48px minmax(0, 1fr); gap: 14px; align-items: center; padding: 8px 4px; }
.sk-idx { width: 20px; height: 12px; border-radius: 6px; }
.sk-thumb { width: 48px; aspect-ratio: 1; border-radius: 12px; }
.sk-song-lines { display: grid; gap: 8px; }

.sk-covers { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 26px 18px; }
.sk-covercell { display: grid; gap: 10px; }
.sk-square { aspect-ratio: 1; border-radius: 17px; }

.sk-line { height: 12px; border-radius: 6px; }

.shimmer {
  background: linear-gradient(100deg, #e9e9ec 40%, #f4f4f6 50%, #e9e9ec 60%);
  background-size: 200% 100%;
  animation: sk-shimmer 1.4s ease-in-out infinite;
}
@keyframes sk-shimmer { 0% { background-position: 120% 0; } 100% { background-position: -20% 0; } }

@media (max-width: 820px) {
  .sk-covers { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 560px) {
  .sk-covers { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (prefers-reduced-motion: reduce) {
  .shimmer { animation: none; opacity: 0.6; }
}
</style>
