<template>
  <Teleport to="body">
    <Transition name="tw-fade" appear>
      <div
        v-show="open"
        class="fixed inset-0 z-[1000] isolate"
        aria-hidden="true"
      >
        <!-- 背景遮罩 -->
        <div
          class="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
          @click="onBackdrop"
        />
      </div>
    </Transition>

    <Transition :name="panelAnim" appear>
      <div
        v-show="open"
        class="fixed inset-x-0 z-[1001] flex justify-center items-center inset-y-0"
        role="dialog"
        aria-modal="true"
        @keydown.esc.prevent.stop="onEsc"
      >
        <!-- 内容主体 -->
        <div
          ref="panel"
          class="relative mx-4 sm:mx-6 w-full max-w-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xl ring-1 ring-black/5 rounded-2xl outline-none"
          tabindex="-1"
        >
          <!-- 关闭按钮 -->
          <button
            v-if="showClose"
            type="button"
            class="absolute right-3 top-3 inline-flex items-center justify-center rounded-full size-9 hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-black/50 dark:focus:ring-white/40"
            @click="close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <!-- Header -->
          <div v-if="title" class="px-6 pt-6 pb-3">
            <h2 class="text-lg font-semibold">{{ title }}</h2>
            <p v-if="desc" class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{{ desc }}</p>
          </div>

          <!-- Body -->
          <div class="px-6 py-4">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="px-6 pb-6 pt-2">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed, nextTick, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  title: String,
  desc: String,
  showClose: { type: Boolean, default: true },
  animation: { type: String, default: 'scale' }, // scale | slide | fade
  closeOnEsc: { type: Boolean, default: true },
  closeOnBackdrop: { type: Boolean, default: true },
  preventScroll: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue', 'open', 'close'])

const open = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const panel = ref(null)
const panelAnim = computed(() => {
  return {
    scale: 'tw-panel-scale',
    slide: 'tw-panel-slide',
    fade: 'tw-panel-fade'
  }[props.animation]
})

function close() {
  if (!open.value) return
  open.value = false
  emit('close')
  restoreScroll()
}

function onEsc() {
  if (props.closeOnEsc) close()
}

function onBackdrop() {
  if (props.closeOnBackdrop) close()
}

function lockScroll() {
  if (props.preventScroll) document.documentElement.classList.add('overflow-hidden')
}
function restoreScroll() {
  if (props.preventScroll) document.documentElement.classList.remove('overflow-hidden')
}

// 监听 open 状态变化
watch(() => open.value, (v) => {
  if (v) {
    emit('open')
    lockScroll()
    focusFirst()
    document.addEventListener('keydown', trapTab)
  } else {
    restoreScroll()
    document.removeEventListener('keydown', trapTab)
  }
})

function focusFirst() {
  nextTick(() => {
    const el = panel.value
    if (!el) return
    const focusable = el.querySelector('button, input, [tabindex]:not([tabindex="-1"])')
    ;(focusable || el).focus()
  })
}

// 焦点锁定（Tab 环）
function trapTab(e) {
  if (e.key !== 'Tab') return
  const els = Array.from(panel.value.querySelectorAll('a,button,input,textarea,select,[tabindex]:not([tabindex=\"-1\"])')).filter(el => !el.disabled)
  const first = els[0]
  const last = els[els.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

onUnmounted(() => restoreScroll())
</script>

<style scoped>
/* Backdrop */
.tw-fade-enter-from, .tw-fade-leave-to { opacity: 0 }
.tw-fade-enter-active, .tw-fade-leave-active { transition: opacity .18s ease }

/* scale 动画 */
.tw-panel-scale-enter-from { opacity: 0; transform: translateY(8px) scale(.97) }
.tw-panel-scale-leave-to { opacity: 0; transform: translateY(8px) scale(.97) }
.tw-panel-scale-enter-active, .tw-panel-scale-leave-active { transition: all .2s cubic-bezier(.2,.7,.2,1) }

/* slide 动画 */
.tw-panel-slide-enter-from { opacity: 0; transform: translateY(16px) }
.tw-panel-slide-leave-to { opacity: 0; transform: translateY(16px) }
.tw-panel-slide-enter-active, .tw-panel-slide-leave-active { transition: all .22s cubic-bezier(.22,.8,.2,1) }

/* fade 动画 */
.tw-panel-fade-enter-from, .tw-panel-fade-leave-to { opacity: 0 }
.tw-panel-fade-enter-active, .tw-panel-fade-leave-active { transition: opacity .18s ease }


</style>
