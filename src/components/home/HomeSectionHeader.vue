<template>
  <header class="section-header">
    <div class="section-copy">
      <p v-if="eyebrow" class="section-eyebrow">{{ eyebrow }}</p>
      <h2>{{ title }}</h2>
      <p v-if="description" class="section-description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="section-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup>
defineProps({
  eyebrow: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
})
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.section-copy { min-width: 0; }

.section-eyebrow {
  margin: 0 0 8px;
  color: #e85769;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  color: #18181b;
  font-size: clamp(26px, 3.2vw, 38px);
  font-weight: 900;
  letter-spacing: -0.045em;
  line-height: 1.08;
}

.section-description {
  max-width: 570px;
  margin: 9px 0 0;
  color: #71717a;
  font-size: 13px;
  font-weight: 560;
  line-height: 1.6;
}

.section-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
}

@media (max-width: 640px) {
  .section-header {
    align-items: start;
    flex-direction: column;
    margin-bottom: 20px;
  }
  .section-actions { width: 100%; overflow-x: auto; }
}
</style>
