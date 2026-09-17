<template>
  <slot />
</template>

<script setup>
/**
 * BackgroundRouteProvider — 为「冻结的背景页」提供属于它自己的路由上下文。
 *
 * 背景：全局 DetailOverlayHost 方案下，打开详情悬浮层时浏览器地址变成 /playlist/:id，
 * 但底层主页面（home/discover/search...）仍保持挂载。如果这些页面通过 useRoute()
 * 读到的是全局的详情路由，它们的 watch(route.name) / watch(route.query.tab) 会被误触发，
 * 导致 Tab 重置、搜索结果被清空、页面动画乱跳。
 *
 * vue-router 的 useRoute() = inject(routeLocationKey)。这里在背景子树内覆盖该注入，
 * 让背景页始终读到「它自己被冻结时的路由快照」，从而：
 *  - 悬浮层开/关期间背景页的路由完全稳定，状态（Tab/查询/滚动）天然保留；
 *  - onBeforeRouteLeave 需要的 matchedRouteKey 也一并提供（整页详情作为背景时可用）。
 *
 * 传入的 route 是一个「就地变更」的 reactive 快照对象（引用不变，字段更新），
 * 因此 provide 一次即可，字段变化对消费者是响应式的。
 */
import { computed, provide } from 'vue'
import {
  matchedRouteKey,
  routeLocationKey,
  routerViewLocationKey,
  viewDepthKey,
} from 'vue-router'

const props = defineProps({
  // reactive 路由快照对象（App.vue 就地 Object.assign 更新）
  route: { type: Object, required: true },
  // 背景对应的路由记录（整页详情时供 onBeforeRouteLeave 注册守卫）
  record: { type: Object, default: null },
})

provide(routeLocationKey, props.route)
provide(routerViewLocationKey, computed(() => props.route))
provide(matchedRouteKey, computed(() => props.record))
provide(viewDepthKey, 0)
</script>
