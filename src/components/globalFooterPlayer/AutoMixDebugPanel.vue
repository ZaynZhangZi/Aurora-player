<template>
  <aside class="automix-debug" aria-label="AutoMix 开发调试信息">
    <header>
      <span>AutoMix</span>
      <b>{{ status }}</b>
    </header>
    <dl>
      <div><dt>Analyzer</dt><dd>{{ debug.analyzerStatus || "idle" }} · {{ debug.analyzerRole || "-" }}</dd></div>
      <div><dt>BPM</dt><dd>{{ number(debug.current?.bpm, 1) }} → {{ number(debug.next?.bpm, 1) }}</dd></div>
      <div><dt>Energy</dt><dd>{{ number(debug.current?.energy, 2) }} → {{ number(debug.next?.energy, 2) }}</dd></div>
      <div><dt>Beat conf.</dt><dd>{{ number(debug.current?.beatConfidence, 2) }} → {{ number(debug.next?.beatConfidence, 2) }}</dd></div>
      <div><dt>Transition</dt><dd>{{ debug.transitionType || "-" }} / {{ debug.transitionFamily || "-" }}</dd></div>
      <div><dt>Score</dt><dd>{{ number(debug.transitionScore, 3) }}</dd></div>
      <div><dt>Rate</dt><dd>{{ number(debug.playbackRate, 4) }}</dd></div>
      <div><dt>Duration</dt><dd>{{ number(debug.duration, 2) }}s</dd></div>
      <div><dt>Worklet</dt><dd>{{ capabilities.audioWorklet ? "supported" : "fallback" }}</dd></div>
      <div v-if="debug.lastFallback"><dt>Fallback</dt><dd>{{ debug.lastFallback }}</dd></div>
      <div v-if="debug.lastError"><dt>Error</dt><dd class="error">{{ debug.lastError }}</dd></div>
    </dl>
  </aside>
</template>

<script setup>
defineProps({
  status: {type: String, default: "IDLE"},
  debug: {type: Object, default: () => ({})},
  capabilities: {type: Object, default: () => ({})},
});

function number(value, digits) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed !== 0 ? parsed.toFixed(digits) : "-";
}
</script>

<style scoped>
.automix-debug {
  position: fixed;
  right: 12px;
  bottom: calc(var(--global-player-height, 76px) + 12px);
  z-index: 1200;
  width: 260px;
  max-height: calc(100dvh - 24px);
  overflow: hidden;
  padding: 10px 12px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 14px;
  color: rgb(244 247 255 / 92%);
  background: rgb(8 12 22 / 88%);
  box-shadow: 0 18px 50px rgb(0 0 0 / 34%);
  backdrop-filter: blur(18px);
  font: 11px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
  pointer-events: none;
}

header,
dl div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

header {
  margin-bottom: 7px;
  color: #b9c8ff;
  letter-spacing: .04em;
}

header b {
  color: #8ef0c7;
  font-size: 10px;
}

dl {
  display: grid;
  gap: 2px;
  margin: 0;
}

dt {
  color: rgb(210 220 244 / 58%);
}

dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: rgb(246 248 255 / 92%);
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error {
  color: #ff9f9f;
}
</style>
