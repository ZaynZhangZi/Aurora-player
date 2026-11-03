<template>
  <MorphIcon
    v-bind="$attrs"
    :icon="icon || iconData(name, filled)"
    :size="size"
    :stroke-width="strokeWidth"
    :label="label"
    :data-icon="name"
    class="app-icon"
    spring="smooth"
    reduced-motion="user"
  />
</template>

<script setup lang="ts">
import {MorphIcon, type IconNode} from 'morphicons/vue'
import {iconData} from './iconRegistry'

defineOptions({inheritAttrs: false})
withDefaults(defineProps<{
  name?: string
  icon?: IconNode
  size?: number | string
  strokeWidth?: number | string
  filled?: boolean
  label?: string
}>(), {name:'circle-help',size:20,strokeWidth:1.75,filled:false})
</script>

<style>
.app-icon { display: inline-block; flex-shrink: 0; vertical-align: middle; }
</style>
