<template>
  <div class="w-full h-full blur-3xl">
    <div ref="container" class="w-full h-full">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';

const props = defineProps({
  imageUrl: {
    type: String,
    required: true
  }
});

const container = ref(null);

// --- 非响应式变量 ---
let scene, camera, renderer, material, mesh, textureLoader;
let rafId = null;
const uniforms = {
  uTexture: { value: null },
  uTime: { value: 0 },
  uResolution: { value: new THREE.Vector2() },
  uTextureAspect: { value: 1.0 }
};

// 顶点着色器 (标准)
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// --- 核心：火力全开的 Apple Music 风格片段着色器 ---
const fragmentShader = `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uTextureAspect;
  varying vec2 vUv;

  // 基础 Simplex Noise
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 d = vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw));
    vec3 m = max(0.5 - d, 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 a0 = x - floor(x + 0.5);
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    // 1. UV 修正 (居中)
    vec2 uv = vUv;
    float screenAspect = uResolution.x / uResolution.y;
    if (screenAspect > uTextureAspect) {
        uv.y = (uv.y - 0.5) * (screenAspect / uTextureAspect) + 0.5;
    } else {
        uv.x = (uv.x - 0.5) * (uTextureAspect / screenAspect) + 0.5;
    }

    // 2. 极慢流动
    float time = uTime * 0.1;

    // 3. 【关键修改】超低频噪声
    // 之前是 uv * 2.5 (太密了)，现在改成 uv * 0.3 (巨大色块)
    // 这样屏幕上只有 1-2 个大的颜色团在动，不会有细纹
    vec2 movement = vec2(time * 0.1, time * 0.2);

    // 生成两个巨大的流动波形
    float n1 = snoise(uv * 0.5 - movement);
    float n2 = snoise(uv * 0.5 + movement * 1.5);

    // 4. 简单的坐标偏移，而不是剧烈的 Domain Warping
    // 这种偏移更柔和，像水面的倒影，而不是油漆拉丝
    vec2 distortedUV = uv + vec2(n1, n2) * 0.4;

    // 5. 【关键修改】超级模糊采样 (Zoom Blur 模拟)
    // 模拟那种大光圈失焦的感觉
    vec4 color = vec4(0.0);
    float totalWeight = 0.0;

    // 随机采样 8 个点，范围很大 (0.1)，制造那种"化开"的感觉
    for(float i = 0.0; i < 8.0; i++) {
        float weight = 1.0 - i / 8.0;
        float offsetScale = 0.1 * weight; // 0.1 是巨大的模糊半径
        vec2 offset = vec2(
            snoise(uv + i + time * 0.1),
            snoise(uv + i + 10.0 - time * 0.1)
        ) * offsetScale;

        color += texture2D(uTexture, distortedUV + offset) * weight;
        totalWeight += weight;
    }
    color /= totalWeight;

    // 6. 后处理：模仿 Apple Music 的暗调高级感
    // 增加对比度，压暗暗部，提亮亮部
    color.rgb = color.rgb * 1.3 - 0.1;

    // 稍微降低饱和度防止颜色溢出，然后混合
    // 这一步能去掉那些生硬的白色杂质
    vec3 gray = vec3(dot(color.rgb, vec3(0.299, 0.587, 0.114)));
    color.rgb = mix(color.rgb, gray, 0.2); // 混合一点灰度让颜色更深沉

    // 最终加一个暖色调的微调 (可选，模拟图2的暖光)
    // color.rgb *= vec3(1.1, 1.05, 1.0);

    gl_FragColor = vec4(color.rgb, 1.0);
  }
`;

const init = () => {
  if (!container.value) return;
  const { clientWidth: width, clientHeight: height } = container.value;

  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // 使用 alpha: true 可以让背景在某些情况下更融合
  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  renderer.setSize(width, height);
  // 限制像素比，保证在 4K 屏上的性能，同时低分辨率有助于增加模糊感
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  container.value.appendChild(renderer.domElement);

  uniforms.uResolution.value.set(width, height);
  material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  textureLoader = new THREE.TextureLoader();
  textureLoader.setCrossOrigin('anonymous');
  loadTexture(props.imageUrl);

  animate();
};

const loadTexture = (url) => {
  if (!url) return;
  textureLoader.load(url, (tex) => {
    // 关键：使用镜像重复，保证大范围扭曲时的边缘平滑过渡
    tex.wrapS = THREE.MirroredRepeatWrapping;
    tex.wrapT = THREE.MirroredRepeatWrapping;
    // 关键：使用线性滤波，这是产生“模糊”感的基石
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    // 启用 mipmap 可以增加更自然的模糊感
    tex.generateMipmaps = true;

    uniforms.uTexture.value = tex;
    if (tex.image) {
      uniforms.uTextureAspect.value = tex.image.width / tex.image.height;
    }
  }, undefined, (err) => {
    console.error("纹理加载失败，请检查跨域或路径:", err);
  });
};

const animate = () => {
  // 极慢的时间流逝
  uniforms.uTime.value += 0.002;
  renderer.render(scene, camera);
  rafId = requestAnimationFrame(animate);
};

watch(() => props.imageUrl, loadTexture);

const handleResize = () => {
  if (!container.value || !renderer) return;
  const { clientWidth: width, clientHeight: height } = container.value;
  renderer.setSize(width, height);
  uniforms.uResolution.value.set(width, height);
};

onMounted(() => {
  init();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  cancelAnimationFrame(rafId);
  renderer && renderer.dispose();
  material && material.dispose();
  if (uniforms.uTexture.value) uniforms.uTexture.value.dispose();
});
</script>

<style scoped>
.fluid-canvas-container {
  width: 100%;
  height: 100%; /* 确保占满父容器 */
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  background-color: #000;
  z-index: -1; /* 确保背景在最底层 */
}
</style>
