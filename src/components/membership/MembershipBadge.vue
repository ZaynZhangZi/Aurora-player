<template>
  <span v-if="label" class="membership-badge" :class="{ 'is-svip': tier === 'svip' }"
    role="img" :aria-label="`黑胶 ${label}`" :title="`黑胶 ${label}`">
    <span class="membership-record" aria-hidden="true" />
    <span class="membership-capsule" aria-hidden="true"><span>{{ label }}</span></span>
  </span>
</template>

<script setup>
import {computed} from 'vue'

const props = defineProps({tier: String})
const label = computed(() => ['vip', 'svip'].includes(props.tier) ? props.tier.toUpperCase() : '')
</script>

<style scoped>
.membership-badge {
  --membership-rim: linear-gradient(135deg, #fff2cf, #a9884d 48%, #e7c98f 82%, #9f8048);
  display: inline-flex;
  flex: none;
  align-items: center;
  color: #f5dfac;
  font: 850 var(--membership-badge-size, 22px) / 1 system-ui, sans-serif;
  letter-spacing: normal;
  white-space: nowrap;
}

.membership-badge.is-svip {
  --membership-rim: linear-gradient(132deg, #f2dfff, #9381b3 39%, #dfeaf7 63%, #a9e5d3 88%, #82b6a7);
  color: #eee7ff;
}

.membership-record {
  position: relative;
  z-index: 1;
  width: 1em;
  height: 1em;
  border: 1px solid transparent;
  border-radius: 50%;
  background:
    radial-gradient(circle, #161518 0 7%, #efd6a0 8% 17%, transparent 18%) padding-box,
    repeating-radial-gradient(circle, transparent 0 18%, #ffffff26 19% 22%, transparent 23% 31%) padding-box,
    conic-gradient(from 30deg, #17171b, #424149 15%, #101014 33%, #33333b 65%, #17171b) padding-box,
    var(--membership-rim) border-box;
  box-shadow: inset 0 0 0 1px #ffffff20, 0 1px 3px #17152230;
}

.is-svip .membership-record::after {
  position: absolute;
  top: .03em;
  right: -.04em;
  width: .27em;
  height: .27em;
  background: #fff;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  content: '';
}

.membership-capsule {
  display: grid;
  height: .74em;
  align-items: center;
  margin-left: -.33em;
  padding: 0 .37em 0 .48em;
  border: 1px solid transparent;
  border-radius: 0 1em 1em 0;
  background: linear-gradient(#303037, #19191e) padding-box, var(--membership-rim) border-box;
}

.membership-capsule span {
  font-size: .55em;
  letter-spacing: .055em;
}

.is-svip .membership-capsule span {
  background: linear-gradient(100deg, #e5cafa, #fbf8ff 48%, #b5e9da);
  background-clip: text;
  color: transparent;
}
</style>
