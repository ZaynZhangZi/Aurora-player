<template>
  <Teleport to="body">
    <Transition name="home-modal">
      <div v-if="open" class="mv-layer" @click.self="emit('close')">
        <section class="mv-dialog" role="dialog" aria-modal="true" aria-labelledby="home-mv-title">
          <header class="mv-header">
            <div class="mv-heading">
              <p class="mv-eyebrow">NOW SHOWING</p>
              <h2 id="home-mv-title">{{ mv?.name || 'MV 播放' }}</h2>
            </div>
            <div class="mv-actions">
              <select
                v-if="resolutions.length"
                :value="resolution"
                aria-label="MV 清晰度"
                @change="updateResolution"
              >
                <option v-for="item in resolutions" :key="item" :value="item">{{ item }}P</option>
              </select>
              <button type="button" @click="emit('close')">关闭</button>
            </div>
          </header>
          <div class="mv-stage">
            <div v-if="loading" class="mv-message">影音就绪中...</div>
            <div v-else-if="error" class="mv-message mv-error">{{ error }}</div>
            <video
              v-else-if="url"
              :src="url"
              :poster="mv?.cover || ''"
              controls
              autoplay
              playsinline
            />
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  open: Boolean,
  loading: Boolean,
  error: {
    type: String,
    default: '',
  },
  mv: {
    type: Object,
    default: null,
  },
  url: {
    type: String,
    default: '',
  },
  resolutions: {
    type: Array,
    default: () => [],
  },
  resolution: {
    type: Number,
    default: 1080,
  },
})

const emit = defineEmits(['close', 'update:resolution', 'change-resolution'])

function updateResolution(event) {
  const value = Number(event.target.value || 1080)
  emit('update:resolution', value)
  emit('change-resolution', value)
}
</script>

<style scoped>
.mv-layer {
  position: fixed;
  inset: 0;
  z-index: 1002;
  display: grid;
  padding: 20px;
  place-items: center;
  background: rgba(24, 24, 27, 0.42);
  backdrop-filter: blur(24px);
}

.mv-dialog {
  width: min(100%, 1040px);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 30px;
  background: #fff;
  box-shadow: 0 40px 110px rgba(0, 0, 0, 0.34);
}

.mv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 24px;
}

.mv-eyebrow { margin: 0 0 4px; color: #e85769; font-size: 9px; font-weight: 900; letter-spacing: 0.18em; }
.mv-heading h2 { max-width: 650px; margin: 0; overflow: hidden; color: #27272a; font-size: 16px; font-weight: 850; text-overflow: ellipsis; white-space: nowrap; }
.mv-actions { display: flex; align-items: center; gap: 10px; }
.mv-actions select,
.mv-actions button { height: 36px; padding: 0 15px; cursor: pointer; border: 1px solid rgba(24, 24, 27, 0.08); border-radius: 999px; font: inherit; font-size: 12px; font-weight: 760; }
.mv-actions select { color: #52525b; background: #f4f4f5; }
.mv-actions button { color: #fff; background: #27272a; }
.mv-stage { position: relative; aspect-ratio: 16 / 9; background: #09090b; }
.mv-stage video { width: 100%; height: 100%; outline: none; }
.mv-message { position: absolute; inset: 0; display: grid; place-items: center; color: #a1a1aa; font-size: 13px; font-weight: 700; }
.mv-error { color: #fb7185; }
.home-modal-enter-active,
.home-modal-leave-active { transition: opacity 220ms ease; }
.home-modal-enter-active .mv-dialog,
.home-modal-leave-active .mv-dialog { transition: transform 340ms cubic-bezier(0.22, 1, 0.36, 1); }
.home-modal-enter-from,
.home-modal-leave-to { opacity: 0; }
.home-modal-enter-from .mv-dialog,
.home-modal-leave-to .mv-dialog { transform: translateY(20px) scale(0.97); }

@media (max-width: 600px) {
  .mv-layer { padding: 10px; }
  .mv-dialog { border-radius: 22px; }
  .mv-header { align-items: start; padding: 16px; }
  .mv-actions select { display: none; }
}
</style>
