<template>
  <Teleport to="body">
    <Transition name="release-notes">
      <div v-if="open" class="notes-layer" @click.self="emit('close')">
        <section class="notes-panel" role="dialog" aria-modal="true" aria-labelledby="release-notes-title">
          <header class="notes-header">
            <div>
              <p class="notes-eyebrow">WHAT'S NEW</p>
              <h2 id="release-notes-title">版本更新</h2>
              <p>展示每个版本的更新亮点与修复记录</p>
            </div>
            <div class="notes-header-actions">
              <span>v{{ latestTag }}</span>
              <button type="button" aria-label="关闭更新日志" @click="emit('close')">×</button>
            </div>
          </header>

          <div class="notes-content">
            <p v-if="loading" class="notes-state">正在整理更新档案...</p>
            <div v-else-if="error" class="notes-state notes-error">
              <p>{{ error }}</p>
              <button type="button" @click="emit('retry')">重新加载</button>
            </div>
            <div v-else-if="notes.length" class="notes-list">
              <article v-for="item in notes" :key="item.id" class="note-card">
                <div class="note-card-title">
                  <div>
                    <span>v{{ item.version || '0.0.0' }}</span>
                    <h3>{{ item.title }}</h3>
                  </div>
                  <time>{{ item.dateText }}</time>
                </div>
                <p v-if="item.content" class="note-content">{{ item.content }}</p>
                <div v-if="asList(item.highlights).length" class="note-block">
                  <h4>更新亮点</h4>
                  <ul><li v-for="(text, index) in asList(item.highlights)" :key="`h-${item.id}-${index}`">{{ text }}</li></ul>
                </div>
                <div v-if="asList(item.bugFixes).length" class="note-block">
                  <h4>修复内容</h4>
                  <ul><li v-for="(text, index) in asList(item.bugFixes)" :key="`b-${item.id}-${index}`">{{ text }}</li></ul>
                </div>
                <div v-if="asList(item.knownIssues).length" class="note-block note-warning">
                  <h4>已知问题</h4>
                  <ul><li v-for="(text, index) in asList(item.knownIssues)" :key="`k-${item.id}-${index}`">{{ text }}</li></ul>
                </div>
              </article>
            </div>
            <p v-else class="notes-state">暂无更新日志</p>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  open: Boolean,
  notes: {
    type: Array,
    default: () => [],
  },
  loading: Boolean,
  error: {
    type: String,
    default: '',
  },
  latestTag: {
    type: String,
    default: 'NEW',
  },
})

const emit = defineEmits(['close', 'retry'])

function asList(value) {
  return Array.isArray(value) ? value : []
}
</script>

<style scoped>
.notes-layer {
  position: fixed;
  inset: 0;
  z-index: 1003;
  display: flex;
  justify-content: end;
  padding: 16px;
  background: rgba(24, 24, 27, 0.15);
  backdrop-filter: blur(18px);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.notes-panel {
  display: grid;
  width: min(100%, 680px);
  height: 100%;
  overflow: hidden;
  grid-template-rows: auto minmax(0, 1fr);
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 30px;
  background: #f5f5f7;
  box-shadow: 0 34px 100px rgba(24, 24, 27, 0.22);
}

.notes-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 26px 28px; border-bottom: 1px solid rgba(24, 24, 27, 0.06); background: rgba(255, 255, 255, 0.72); }
.notes-eyebrow { margin: 0 0 6px !important; color: #e85769 !important; font-size: 9px !important; font-weight: 900 !important; letter-spacing: 0.18em; }
.notes-header h2 { margin: 0; color: #18181b; font-size: 26px; font-weight: 900; letter-spacing: -0.04em; }
.notes-header p { margin: 7px 0 0; color: #a1a1aa; font-size: 12px; font-weight: 600; }
.notes-header-actions { display: flex; align-items: center; gap: 10px; }
.notes-header-actions span { padding: 7px 11px; color: #fff; border-radius: 999px; background: #27272a; font-size: 10px; font-weight: 800; }
.notes-header-actions button { display: grid; width: 34px; aspect-ratio: 1; place-items: center; cursor: pointer; color: #52525b; border: 0; border-radius: 50%; background: #e4e4e7; font-size: 22px; line-height: 1; }
.notes-content { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 28px; }
.notes-list { display: grid; gap: 18px; }
.note-card { padding: 22px; border: 1px solid rgba(24, 24, 27, 0.04); border-radius: 22px; background: #fff; }
.note-card-title { display: flex; align-items: start; justify-content: space-between; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid #f4f4f5; }
.note-card-title span { color: #e85769; font-size: 10px; font-weight: 850; }
.note-card-title h3 { margin: 7px 0 0; color: #27272a; font-size: 17px; font-weight: 850; }
.note-card-title time { color: #a1a1aa; font-size: 11px; font-weight: 650; }
.note-content { color: #71717a; white-space: pre-line; font-size: 13px; line-height: 1.7; }
.note-block { margin-top: 14px; padding: 14px 16px; border-radius: 16px; background: #fafafa; }
.note-block h4 { margin: 0; color: #3f3f46; font-size: 12px; font-weight: 850; }
.note-block ul { display: grid; gap: 6px; margin: 9px 0 0; padding-left: 18px; color: #71717a; font-size: 12px; line-height: 1.55; }
.note-warning h4 { color: #b45309; }
.notes-state { display: grid; min-height: 220px; place-items: center; color: #a1a1aa; font-size: 13px; font-weight: 700; }
.notes-error { align-content: center; gap: 12px; color: #e11d48; }
.notes-error button { padding: 9px 14px; cursor: pointer; color: #fff; border: 0; border-radius: 999px; background: #27272a; font: inherit; }
.release-notes-enter-active,
.release-notes-leave-active { transition: opacity 220ms ease; }
.release-notes-enter-active .notes-panel,
.release-notes-leave-active .notes-panel { transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1); }
.release-notes-enter-from,
.release-notes-leave-to { opacity: 0; }
.release-notes-enter-from .notes-panel,
.release-notes-leave-to .notes-panel { transform: translateX(32px) scale(0.97); }

@media (max-width: 600px) {
  .notes-layer { padding: 0; }
  .notes-panel { border-radius: 0; }
  .notes-header,
  .notes-content { padding: 20px; }
  .notes-header p { display: none; }
}
</style>
