/**
 * useDetailNavigation.js — 统一的「实体详情」导航入口
 *
 * 目标：把散落在各页面里的 router.push({ name: 'playlistDetailPage' | 'discoverPlaylistDetail' | ... })
 * 收敛成一个 helper，页面组件不再关心「该弹窗还是该整页」。
 *
 * 规则（由 App.vue 的背景状态机 + DetailOverlayHost 落地）：
 *  - 歌单/专辑/歌手详情统一 URL：/playlist/:id、/album/:id、/artist/:id
 *  - 应用内点击歌单/专辑 -> push 详情 URL -> 以悬浮层打开（保留底层页面）
 *  - 应用内点击歌手 -> push /artist/:id -> 普通整页路由跳转（不做悬浮层）
 *  - 直接访问 / 刷新详情 URL -> 无底层背景 -> 以完整页面展示
 *  - 关闭悬浮层用 router.back()（消耗一条历史），不用 router.push(parent) 污染历史
 */
import { computed, inject, unref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/** 详情类型配置：规范路由名 + 标题。 */
export const DETAIL_TYPES = {
  playlist: { routeName: 'playlist', title: '歌单' },
  album: { routeName: 'album', title: '专辑' },
  artist: { routeName: 'artist', title: '歌手' },
}

/** 所有详情路由名集合。 */
export const DETAIL_ROUTE_NAMES = new Set(
  Object.values(DETAIL_TYPES).map((type) => type.routeName),
)

/**
 * 允许以「悬浮层（模态框）」方式打开的详情类型。
 * 歌手详情不在其中：/artist/:id 固定按普通路由跳转整页展示。
 */
export const OVERLAY_DETAIL_TYPES = new Set(['playlist', 'album'])

/** 该详情路由是否允许以悬浮层方式打开（否则走整页路由跳转）。 */
export function supportsDetailOverlay(route) {
  const type = normalizeDetailType(route?.meta?.type || route?.name)
  return Boolean(type) && OVERLAY_DETAIL_TYPES.has(type)
}

/** DetailOverlayHost 向详情组件注入「当前处于悬浮模式」的 key。 */
export const DETAIL_OVERLAY_MODE_KEY = Symbol('detailOverlayMode')

/** 悬浮层关闭后派发的全局事件名，供背景页触发封面 Hero 返回动画。 */
export const DETAIL_CLOSE_EVENT = 'aurora:detail-closed'

/** 兜底页面：直接访问详情且无历史可回退时前往。 */
export const DETAIL_FALLBACK_ROUTE = { name: 'home' }

const LEGACY_TYPE_ALIASES = {
  playlist: 'playlist',
  playlistdetail: 'playlist',
  album: 'album',
  albumdetail: 'album',
  artist: 'artist',
  artistdetail: 'artist',
  artistdetial: 'artist', // 兼容历史拼写
}

/** 归一化详情类型，兼容历史拼写与命名。 */
export function normalizeDetailType(type) {
  const key = String(type || '').toLowerCase()
  return LEGACY_TYPE_ALIASES[key] || null
}

/** 构造详情路由 location；非法输入返回 null。 */
export function buildDetailLocation(type, id, query) {
  const normalized = normalizeDetailType(type)
  const config = normalized ? DETAIL_TYPES[normalized] : null
  const rawId = String(id ?? '').trim()
  if (!config || !rawId) return null
  return {
    name: config.routeName,
    params: { id: rawId },
    query: query && Object.keys(query).length ? { ...query } : undefined,
  }
}

/** 判断一个路由是否为实体详情路由。 */
export function isDetailRoute(route) {
  return Boolean(route?.meta?.detail) || DETAIL_ROUTE_NAMES.has(String(route?.name || ''))
}

/**
 * 统一详情导航 composable。
 * 页面组件里：const { openPlaylist, openAlbum, openArtist, openDetail, closeDetail } = useDetailNavigation()
 */
export function useDetailNavigation() {
  const router = useRouter()
  const route = useRoute()

  // 详情组件内部注入为 true；普通页面/整页详情为 false。
  const overlayMode = inject(DETAIL_OVERLAY_MODE_KEY, false)
  const isDetailOverlay = computed(() => Boolean(unref(overlayMode)))

  /**
   * 打开详情。默认以「应用内导航」方式 push，触发悬浮层；
   * 直接访问 URL 的场景由浏览器地址栏/刷新自然进入整页模式。
   *
   * @param {'playlist'|'album'|'artist'} type
   * @param {string|number} id
   * @param {{ query?: object, replace?: boolean }} [options]
   */
  function openDetail(type, id, options = {}) {
    const location = buildDetailLocation(type, id, options.query)
    if (!location) return Promise.resolve()
    return options.replace ? router.replace(location) : router.push(location)
  }

  const openPlaylist = (id, options) => openDetail('playlist', id, options)
  const openAlbum = (id, options) => openDetail('album', id, options)
  const openArtist = (id, options) => openDetail('artist', id, options)

  /**
   * 关闭当前详情：
   *  - 有可回退的应用内历史（悬浮层 or 应用内进入的整页）-> router.back()，只消耗一条历史
   *  - 直接访问详情 URL、无历史 -> 前往兜底页（首页），replace 避免污染
   */
  function closeDetail() {
    if (!isDetailRoute(route)) return Promise.resolve()
    const canGoBackInApp = Boolean(window.history.state?.back)
    if (canGoBackInApp) {
      router.back()
      return Promise.resolve()
    }
    return router.replace(DETAIL_FALLBACK_ROUTE)
  }

  /** 从详情路由读取 id：优先 params（规范 URL），回退 query（旧地址）。 */
  function currentDetailId() {
    return String(route.params?.id || route.query?.id || '')
  }

  return {
    openDetail,
    openPlaylist,
    openAlbum,
    openArtist,
    closeDetail,
    currentDetailId,
    isDetailOverlay,
  }
}
