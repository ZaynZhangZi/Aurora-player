<template>
  <div class="bg-white">
    <div class="relative bg-gray-900 overflow-hidden">
      <div ref="heroBgLayerEl" class="absolute inset-0 will-change-transform ">
        <div aria-hidden="true" class="absolute inset-0 overflow-hidden">
          <SmartMedia :src="bannerMeadiasrc"/>
        </div>
        <div aria-hidden="true" class="absolute inset-0 bg-gray-900 opacity-50"/>
      </div>

      <div
        class="relative mx-auto flex max-w-3xl flex-col items-center justify-center px-6 text-center lg:px-0 min-h-[70vh] sm:min-h-[90vh]"
      >
        <div ref="heroTextEl" class="flex flex-col items-center justify-center">
          <p ref="subtitleEl" class="text-xl text-white">{{ copy.hero.subtitle }}</p>
          <h1 ref="titleEl" class="mt-8 tracking-widest text-4xl font-bold text-white lg:text-6xl">
            <span>{{ tittle }}</span>
          </h1>
        </div>
      </div>
    </div>
  </div>

  <div>
    <UniversalDisplay :title="getLikeArtistdata.title" :items="getLikeArtistItems"/>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onUnmounted } from 'vue'
import gsap from 'gsap'
import { homeIndexApi } from '@/api/home/homeIndexApi.js'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import UniversalDisplay from '@/components/UniversalDisplay/UniversalDisplay.vue'
import {playListsApi} from "@/api/playListsApi/playListsApi.js";
import {artistApi} from "@/api/artistApi/artistApi.js";

const copy = {
  brand: { name: '你的品牌' },
  common: { shopNow: '立即选购', search: '搜索', help: '帮助' },
  auth: { signIn: '登录', signUp: null },
  hero: { title: 'The &nbsp; Weeknd', subtitle: '今日推荐' },
}

const tittle = ref('')
const bannerMeadiasrc = ref('')

const subtitleEl = ref(null)
const titleEl = ref(null)

let tl // gsap timeline

function getBanner () {
  homeIndexApi.getBanner().then(res => {
    tittle.value = res[0]?.title || ''
    bannerMeadiasrc.value = res[0]?.mediaUrl || ''
    nextTick(runTitleAnim) // 等 DOM 更新后执行动画
  })
}

/** 把标题里的 span 文本拆成多个 <span>，用于逐字动画 */
function splitTextToSpans (h1El) {
  if (!h1El) return []
  const target = h1El.querySelector('span') || h1El
  const text = target.textContent || ''
  target.textContent = ''
  const spans = []
  for (const ch of text) {
    const s = document.createElement('span')
    s.textContent = ch
    s.style.display = 'inline-block'
    s.style.willChange = 'opacity, transform, filter'
    target.appendChild(s)
    spans.push(s)
  }
  return spans
}

/** 逐字顺滑渐入动画：opacity + y + blur（无弹性） */
function runTitleAnim () {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  if (reduce) return

  // 副标题先整体淡入
  gsap.set(subtitleEl.value, { opacity: 0, y: 10, filter: 'blur(6px)' })
  const letters = splitTextToSpans(titleEl.value) // 逐字
  gsap.set(letters, { opacity: 0, y: 12, filter: 'blur(6px)' })

  tl?.kill()
  tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
    .to(subtitleEl.value, {
      opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8
    }, 0)
    .to(letters, {
      opacity: 1, y: 0, filter: 'blur(0px)',
      duration: 0.6, stagger: 0.035   // 越小越顺滑
    }, 0.15)
}

onMounted(() => {
  getBanner()
})

onUnmounted(() => {
  tl?.kill()
})

let getRecommendPlayListdata = ref();
let getRecommendPlayList = () => {
  playListsApi.getRecommendPlayList().then(res => {
    console.log(res.data.result);
    getRecommendPlayListdata.value = res.data.result
  })
}

let getLikeArtistdata = ref();
let getLikeArtistItems = ref();
let getLikeArtist = () => {
  artistApi.getLikeArtist().then(res => {
    console.log(res[0]);
    getLikeArtistdata.value = res[0];
    getLikeArtistItems.value = res[0].subItems.map(r => ({
      name: r.name,
      imageSrc: r.mediaUrl,
    }))
  })
}

getLikeArtist();
getRecommendPlayList();




</script>

<style scoped>
h1 span { text-shadow: 0 1px 8px rgba(255,255,255,.15); }
button, svg { backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: translateZ(0); }
</style>
