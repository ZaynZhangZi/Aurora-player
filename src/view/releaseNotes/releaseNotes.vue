<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <main class="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <section class="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Release Notes</p>
            <h1 class="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">更新日志</h1>
            <p class="mt-2 text-sm text-slate-500">这里展示版本变化、修复说明和已知问题。</p>
          </div>
          <router-link
            to="/home"
            class="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-500 hover:bg-slate-100"
          >
            返回首页
          </router-link>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p v-if="loading" class="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">正在加载版本日志...</p>
        <p v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-500">{{ error }}</p>

        <div v-else-if="releaseNotes.length" class="space-y-4">
          <article
            v-for="item in releaseNotes"
            :key="item.id"
            class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
          >
            <div class="mb-3 flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">{{ item.version || '版本更新' }}</span>
              <span class="text-xs text-slate-500">{{ item.dateText }}</span>
            </div>
            <h2 class="text-base font-semibold text-slate-900">{{ item.title }}</h2>
            <p v-if="item.content" class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{{ item.content }}</p>

            <div v-if="item.highlights.length" class="mt-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">亮点</p>
              <ul class="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li v-for="line in item.highlights" :key="`${item.id}-h-${line}`">{{ line }}</li>
              </ul>
            </div>

            <div v-if="item.bugFixes.length" class="mt-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">修复</p>
              <ul class="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li v-for="line in item.bugFixes" :key="`${item.id}-b-${line}`">{{ line }}</li>
              </ul>
            </div>

            <div v-if="item.knownIssues.length" class="mt-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">已知问题</p>
              <ul class="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li v-for="line in item.knownIssues" :key="`${item.id}-k-${line}`">{{ line }}</li>
              </ul>
            </div>
          </article>
        </div>

        <p v-else class="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">暂无更新日志</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import {onMounted, ref} from 'vue'
import {homeIndexApi} from '@/api/home/homeIndexApi.js'

const loading = ref(true)
const error = ref('')
const releaseNotes = ref([])

function toPlainText(value) {
  if (Array.isArray(value)) return value.map(v => toPlainText(v)).filter(Boolean).join('\n')
  if (value && typeof value === 'object') return toPlainText(value.content || value.text || value.message || '')
  return String(value || '').trim()
}

function normalizeReleaseNoteItem(item, index = 0) {
  const timeSource = item?.createdAt || item?.updatedAt || item?.time || item?.date || 0
  const ts = Number.isFinite(Number(timeSource)) ? Number(timeSource) : Date.parse(String(timeSource || ''))

  const title = String(item?.title || item?.name || `更新 ${index + 1}`).trim()
  const highlights = Array.isArray(item?.highlights) ? item.highlights.map(toPlainText).filter(Boolean) : []
  const bugFixes = Array.isArray(item?.bugFixes) ? item.bugFixes.map(toPlainText).filter(Boolean) : []
  const knownIssues = Array.isArray(item?.knownIssues) ? item.knownIssues.map(toPlainText).filter(Boolean) : []

  const explicitContent = toPlainText(item?.content || item?.description || item?.body)
  const mergedBlocks = [
    highlights.length ? `亮点：${highlights.join('；')}` : '',
    bugFixes.length ? `修复：${bugFixes.join('；')}` : '',
    knownIssues.length ? `已知问题：${knownIssues.join('；')}` : '',
  ].filter(Boolean)

  return {
    id: item?.id || `${title}-${index}`,
    title,
    content: explicitContent || mergedBlocks.join('\n'),
    version: String(item?.version || item?.tag || item?.release || '').trim(),
    highlights,
    bugFixes,
    knownIssues,
    dateText: Number.isFinite(ts) && ts > 0 ? new Date(ts).toLocaleDateString() : '-',
  }
}

async function loadReleaseNotes() {
  loading.value = true
  error.value = ''
  try {
    const res = await homeIndexApi.getReleaseNotes({limit: 50})
    const raw = res?.list || res?.data?.list || res?.data?.data?.list || res?.data?.data || res?.data || res || []
    releaseNotes.value = Array.isArray(raw) ? raw.map(normalizeReleaseNoteItem) : []
  } catch (err) {
    error.value = err?.message || '更新日志加载失败'
    releaseNotes.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadReleaseNotes()
})
</script>
