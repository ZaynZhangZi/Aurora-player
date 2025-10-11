<template>
  <div class="smart-cover" :style="wrapperStyle">
    <!-- 背景渐变层 -->
    <div class="bg-gradient" :style="{ background: gradient }"></div>

    <!-- 背景模糊层 -->
    <div
      class="bg-blur"
      :style="{ backgroundImage: `url(${src})` }"
    ></div>

    <!-- 封面图（主内容） -->
    <img
      ref="imgEl"
      :src="src"
      class="cover"
      crossorigin="anonymous"
      @load="extractColors"
      alt="cover"
    />

    <!-- 信息层（可选） -->
    <div v-if="title" class="info">
      <h3 class="title">{{ title }}</h3>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ColorThief from 'colorthief'
import chroma from 'chroma-js'

const props = defineProps({
  src: { type: String, required: true }, // 封面图片
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  radius: { type: Number, default: 20 }, // 圆角
  blur: { type: Number, default: 60 }, // 模糊强度
})

const imgEl = ref(null)
const gradient = ref('linear-gradient(135deg, #333, #000)')
const wrapperStyle = reactive({
  borderRadius: `${props.radius}px`,
  overflow: 'hidden',
  position: 'relative',
})

/**
 * 提取主色 + 生成渐变背景
 */
function extractColors() {
  const img = imgEl.value
  if (!img) return
  const thief = new ColorThief()

  try {
    const palette = thief.getPalette(img, 3)
    const colA = chroma.rgb(palette[0]).brighten(0.3)
    const colB = chroma.rgb(palette[1]).darken(0.6)
    const colC = chroma.rgb(palette[2]).saturate(0.5)
    gradient.value = `linear-gradient(135deg, ${colA.hex()}, ${colB.hex()} 70%, ${colC.hex()})`
  } catch (e) {
    console.warn('🎨 提取主色失败，使用默认渐变', e)
  }
}
</script>

<style scoped>
.smart-cover {
  position: relative;
  width: 100%;
  height: 103%;
  aspect-ratio: 1/1;
  display: flex;
  align-items: center;
  justify-content: center;
  isolation: isolate;
}

/* 背景渐变层 */
.bg-gradient {
  position: absolute;
  inset: 0;
  z-index: 0;
  transition: background 0.8s ease;
}

/* 背景模糊层（用 GPU 加速） */
.bg-blur {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(60px) brightness(0.9);
  transform: scale(1.1);
  z-index: 1;
  opacity: 0.85;
  transition: opacity 0.6s ease;
}

/* 封面图 */
.cover {
  position: relative;
  z-index: 2;
  width: 80%;
  height: 80%;
  object-fit: cover;
  border-radius: inherit;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  transition: transform 0.4s cubic-bezier(.3,.7,.4,1);
}

.smart-cover:hover .cover {
  transform: scale(1.05);
}

/* 文字信息层 */
.info {
  position: absolute;
  bottom: 12px;
  left: 16px;
  right: 16px;
  z-index: 3;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
}

.title {
  font-weight: 600;
  font-size: 1.2rem;
  margin: 0;
}

.subtitle {
  opacity: 0.8;
  margin-top: 4px;
  font-size: 0.9rem;
}
</style>
