<template>
  <slot v-if="available" />
  <div v-else class="maintenance-feature-unavailable" :data-unavailable-target="target" role="status">
    <strong>{{ targetLabel(target) }}暂时不可用</strong>
    <p>该功能正在维护，恢复后即可继续使用。</p>
    <button type="button" @click="requireFeature(target)">查看维护说明</button>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useMaintenanceAccess } from '@/composables/useMaintenanceAccess.js';
import { isTargetAvailable, requireFeature, targetLabel } from '@/utils/maintenanceAccess.js';

const props = defineProps({ target: { type: String, default: '' } });
const emit = defineEmits(['restored']);
const access = useMaintenanceAccess();
const available = computed(() => isTargetAvailable(access.value.settings, props.target));
watch(available, (value, previous) => { if (value && !previous) emit('restored'); });
</script>

<style scoped>
.maintenance-feature-unavailable { box-sizing: border-box; display: grid; min-height: 180px; align-content: center; justify-items: center; gap: 12px; padding: 28px; border: 1px solid #e9e9ed; border-radius: 20px; background: #fafafb; color: #51515b; text-align: center; }
.maintenance-feature-unavailable strong { font-size: 16px; }
.maintenance-feature-unavailable p { margin: 0; color: #85858f; font-size: 13px; }
.maintenance-feature-unavailable button { padding: 9px 16px; border: 1px solid #dedee5; border-radius: 9px; background: white; color: inherit; cursor: pointer; font: inherit; font-size: 12px; }
</style>
