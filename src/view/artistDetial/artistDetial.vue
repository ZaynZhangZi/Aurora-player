\<template>
  <div class="px-4 sm:px-6 lg:px-8 py-10">
    <div
      class="relative overflow-hidden w-full h-[420px] md:h-[calc(100vh-176px)] rounded-2xl bg-gray-100 dark:bg-neutral-800">

      <!-- 背景图（img） -->
      <SmartMedia
        :src="meadiaSrc"
        alt="banner"
        class="absolute inset-0 w-full h-full object-cover"
      />

      <!-- 半透明遮罩 -->
      <div class="absolute inset-0 bg-black/30"></div>

      <!-- 文案 -->
      <div class="absolute bottom-10 left-10 md:left-14 md:bottom-14 w-2/3 md:max-w-lg">
        <span class="block text-white text-4xl font-black md:text-4xl leading-snug">
          {{ name }}
        </span>

<!--        <div class="mt-5">-->
<!--          <span-->
<!--            class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-xl bg-white text-black hover:bg-gray-100 transition"-->
<!--          >-->
<!--            {{ buttonText }}-->
<!--          </span>-->
<!--        </div>-->
      </div>

    </div>
  </div>
</template>

<script setup>
import {onMounted, ref} from "vue";
import {artistApi} from "@/api/artistApi/artistApi.js";
import {useRoute, useRouter} from "vue-router";
import SmartMedia from "@/components/smartMedia/smartMedia.vue";
const route = useRoute()

let meadiaSrc=ref();
let name=route.query.name;

function getArtistVideo(){
  let name=route.query.name;
  artistApi.getArtistVideo(name).then( (res)=>{
    console.log(res)
    meadiaSrc.value=res.videoUrl
  })
}
onMounted(()=>{
  getArtistVideo()
})

</script>
