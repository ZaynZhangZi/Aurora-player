<template>
  <div class="relative w-full h-full rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,.15)]">
    <canvas ref="canvasRef" class="block w-full h-full"></canvas>
    <!-- 可选：右上角徽标/插槽（置于 WebGL 之上） -->
    <div class="pointer-events-none absolute inset-0 p-4 flex justify-end items-start">
      <slot name="badge"></slot>
    </div>
    <!-- 可选：左下标题 -->
    <div class="pointer-events-none absolute inset-0 p-5 flex justify-start items-end">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

/**
 * Apple Classical 风格 · WebGL 动态封面
 * - 实时片元着色器：层叠线性/径向渐变 + 大面积弧形遮罩 + 高光蜡面 + 暗角
 * - 轻量域扭曲与屏内缓动：不卡、自然
 * - 通过 palette/params 可高度定制
 */
const props = defineProps({
  // 2~4 色调色板（建议暖×冷×紫/粉组合）
  palette: {
    type: Array,
    default: () => ['#F6CC6C', '#E95A90', '#7A5CFF', '#86DDFB']
  },
  // 动画速度（0.6~1.6）
  speed: { type: Number, default: 1.0 },
  // 高光强度（0~2）
  sheen: { type: Number, default: 1.0 },
  // 暗角强度（0~1）
  vignette: { type: Number, default: 0.18 },
  // 弧形遮罩的“鼓起”程度（0.6~1.4）
  bulge: { type: Number, default: 1.0 },
  // 形变强度（0~0.25）
  warp: { type: Number, default: 0.10 },
  // 是否暂停
  paused: { type: Boolean, default: false },
  // 降采样以省性能（0.6~1）
  resolutionScale: { type: Number, default: 1.0 },
  // 同色多卡的随机微差
  seed: { type: Number, default: 0.0 },
})

const canvasRef = ref(null)
let gl, program, buffer, raf = 0
let start = performance.now()

/* ===== Utils ===== */
const hexToRgb01 = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#000000')
  const to = (x) => parseInt(x,16)/255
  return m ? [to(m[1]), to(m[2]), to(m[3])] : [0,0,0]
}

/* ===== Shaders ===== */
const VERT = `
attribute vec2 a_pos;
void main(){
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

/*
  FRAG 说明（核心）：
  - 背景底色：多段线性渐变（palette[0..2]）
  - 两个大型径向“色团” + 一个连接过渡团（屏幕混合）
  - 大弧面遮罩（右上切入，soft-light）
  - 右上蜡面高光（radial + animated sweep）
  - 边缘暗角（vignette）
  - 轻度域扭曲（sin/cos + 小量 fbm）
*/
const FRAG = `
precision mediump float;

uniform vec2  u_res;
uniform float u_time;
uniform float u_speed;
uniform float u_sheen;
uniform float u_vign;
uniform float u_bulge;
uniform float u_warp;
uniform float u_seed;
uniform vec3  u_c0;
uniform vec3  u_c1;
uniform vec3  u_c2;
uniform vec3  u_c3;

#define TAU 6.2831853

/* --- helpers --- */
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  float a=hash(i);
  float b=hash(i+vec2(1.,0.));
  float c=hash(i+vec2(0.,1.));
  float d=hash(i+vec2(1.,1.));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
  float v=0.0, a=0.5;
  for(int i=0;i<3;i++){
    v+=a*noise(p);
    p*=2.0; a*=0.5;
  }
  return v;
}
mat2 rot(float a){ float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }

vec3 mix3(vec3 a, vec3 b, float t){ return a*(1.0-t)+b*t; }

/* 线性渐变基底：三色 */
vec3 baseGradient(vec2 uv){
  // 竖直 + 斜向叠加，制造深浅层次
  float v = uv.y;
  vec3 g = mix3(u_c0, u_c1, smoothstep(0.0, 1.0, v));
  float d = dot(uv - vec2(0.0,0.0), normalize(vec2(1.0,1.0)));
  g = mix3(g, u_c2, smoothstep(0.25, 1.0, d));
  return g;
}

/* 柔和核（Apple 式“糯”） */
float kernel(vec2 p, float r){
  float d = dot(p,p);
  float k = 1.05 / r;
  return exp(-k*k * d);
}

/* 大面积弧形遮罩（右上切入），soft-light 混合时作为亮面 */
float maskShape(vec2 uv){
  // uv: 0~1
  // 控制点大致拟合 Apple 的那种“台面”曲线
  float t = u_bulge; // 鼓起程度
  // 基于二次曲线的阈值，越靠右上越亮
  float cx = smoothstep(0.2, 1.05, uv.x);
  float cy = smoothstep(0.05, 0.95, 1.0-uv.y);
  float curve = pow(cx, 0.75) * pow(cy, 0.45) * (0.8 + 0.2*t);
  return clamp(curve, 0.0, 1.0);
}

/* 蜡面高光（右上），带一条轻微扫光动画 */
float sheen(vec2 uv, float time){
  vec2 c = vec2(0.70, 0.18);
  float r = 0.38;
  float d = distance(uv, c) / r;
  float radial = smoothstep(1.0, 0.0, d);  // 圆形高光

  // 扫光：一条柔和的带状
  float sweep = dot(uv - vec2(0.6, 0.0), normalize(vec2(1.0, 1.3)));
  sweep += 0.45 * sin(time*0.8 + u_seed*3.1415);
  float band = smoothstep(0.15, -0.05, sweep);

  return clamp(radial*0.85 + band*0.35, 0.0, 1.0);
}

/* 屏幕混合（近似） */
vec3 screenBlend(vec3 a, vec3 b){
  return 1.0 - (1.0 - a) * (1.0 - b);
}

void main(){
  vec2 R = u_res;
  vec2 uv = gl_FragCoord.xy / R;
  // 画布比例校正到 -1~1
  vec2 p = uv*2.0 - 1.0;
  p.x *= R.x/R.y;

  float t = u_time * u_speed;

  /* 全局轻缓呼吸与旋转 */
  p *= rot(0.02 * sin(t*0.20 + u_seed));
  p /= (1.0 + 0.02 * sin(t*0.25 + 2.0*u_seed));

  /* 轻量域扭曲（natural） */
  float W = u_warp;
  vec2 wp = p;
  vec2 w1 = W * vec2(
    sin(1.6*wp.y + 0.8*t + 1.7*u_seed),
    cos(1.8*wp.x - 0.7*t + 0.9*u_seed)
  );
  vec2 w2 = (W*0.55) * vec2(
    sin(t + 2.0*wp.y + 0.3*u_seed),
    sin(0.8*t + 2.2*wp.x + 1.1*u_seed)
  );
  float wfbm = fbm(wp*1.1 + t*0.12);
  p += mix(w1, w2, 0.5) * (0.85 + 0.15*wfbm);

  /* 背景渐变 */
  vec3 col = baseGradient(uv);

  /* 三个大型柔和色团（Apple 风味：两大一中，略有交叠） */
  // 中心点（随时间慢速漂移）
  float RING = 0.92;
  vec2 c0 = RING * vec2(cos(t*0.22+0.00+0.2*u_seed), sin(t*0.22+0.00));
  vec2 c1 = RING * vec2(cos(t*0.17+1.70+0.4*u_seed), sin(t*0.17+1.70));
  vec2 c2 = RING * vec2(cos(-t*0.19+3.20+0.6*u_seed), sin(-t*0.19+3.20));

  float r0 = 0.70, r1 = 0.75, r2 = 0.58;

  float k0 = kernel(p - c0, r0);
  float k1 = kernel(p - c1, r1);
  float k2 = kernel(p - c2, r2);

  // 颜色分配：u_c3 为可选第四色；其余用前 3 色
  vec3 b0 = mix3(u_c2, u_c3, 0.5); // 偏紫蓝
  vec3 b1 = mix3(u_c1, u_c2, 0.5); // 偏玫红紫
  vec3 b2 = mix3(u_c0, u_c1, 0.5); // 偏金橙粉

  vec3 layer0 = k0 * b0;
  vec3 layer1 = k1 * b1;
  vec3 layer2 = k2 * b2;

  // 层层“屏幕混合”入底色
  col = screenBlend(col, layer0);
  col = screenBlend(col, layer1);
  col = screenBlend(col, layer2);

  /* 中部连接过渡团（让两侧自然相融） */
  float km = kernel(p - vec2(0.15*sin(t*0.12), 0.12*cos(t*0.10+u_seed)), 0.64);
  vec3 midCol = mix3(u_c1, u_c2, 0.5);
  col = screenBlend(col, km * midCol);

  /* 大面积弧形遮罩（soft-light 效果近似） */
  float m = maskShape(uv);
  vec3 maskTint = mix3(u_c0, u_c1, 0.35); // 偏暖的“台面”色
  // soft-light 近似：根据亮度调和
  col = mix3(col, screenBlend(col, maskTint), 0.35*m);

  /* 右上蜡面高光（带扫光） */
  float s = sheen(uv, t) * u_sheen;
  col = screenBlend(col, vec3(1.0) * (0.35 * s));

  /* 边缘暗角（vignette） */
  float dv = distance(uv, vec2(0.5));
  float vg = smoothstep(0.85, 0.45, dv); // 中心更亮
  col *= (1.0 - u_vign * (1.0 - vg));

  /* 微动态亮度 & 微噪点（避免“死图”） */
  col *= (1.01 + 0.012 * sin(t*0.7 + u_seed));
  col += (hash(gl_FragCoord.xy + t) - 0.5) * 0.008;

  // 轻微 gamma
  col = pow(col, vec3(0.95));

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

/* ===== Init GL ===== */
function createGL() {
  const canvas = canvasRef.value
  const scale = Math.min(Math.max(props.resolutionScale, 0.6), 1.0)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const W = Math.max(1, Math.floor(canvas.clientWidth * dpr * scale))
  const H = Math.max(1, Math.floor(canvas.clientHeight * dpr * scale))
  canvas.width = W
  canvas.height = H

  gl = canvas.getContext('webgl', {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: 'high-performance', preserveDrawingBuffer: false
  })
  if (!gl) throw new Error('WebGL not supported')

  const vs = gl.createShader(gl.VERTEX_SHADER)
  gl.shaderSource(vs, VERT); gl.compileShader(vs)
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(vs))

  const fs = gl.createShader(gl.FRAGMENT_SHADER)
  gl.shaderSource(fs, FRAG); gl.compileShader(fs)
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fs))

  program = gl.createProgram()
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
  gl.useProgram(program)

  // Fullscreen quad
  buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(program, 'a_pos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  gl.viewport(0, 0, W, H)
}

/* ===== Render Loop ===== */
function render(now) {
  if (!gl || !program) return
  if (props.paused) { raf = requestAnimationFrame(render); return }

  const t = (now - start) / 1000

  // Uniforms
  const set1f = (n,v)=> gl.uniform1f(gl.getUniformLocation(program,n), v)
  const set2f = (n,a,b)=> gl.uniform2f(gl.getUniformLocation(program,n), a,b)
  const set3f = (n,a,b,c)=> gl.uniform3f(gl.getUniformLocation(program,n), a,b,c)

  set2f('u_res', gl.drawingBufferWidth, gl.drawingBufferHeight)
  set1f('u_time', t)
  set1f('u_speed', props.speed)
  set1f('u_sheen', props.sheen)
  set1f('u_vign', props.vignette)
  set1f('u_bulge', props.bulge)
  set1f('u_warp', props.warp)
  set1f('u_seed', props.seed)

  const [r0,g0,b0] = hexToRgb01(props.palette[0])
  const [r1,g1,b1] = hexToRgb01(props.palette[1] || props.palette[0])
  const [r2,g2,b2] = hexToRgb01(props.palette[2] || props.palette[1] || props.palette[0])
  const [r3,g3,b3] = hexToRgb01(props.palette[3] || props.palette[2] || props.palette[1] || props.palette[0])
  set3f('u_c0', r0,g0,b0)
  set3f('u_c1', r1,g1,b1)
  set3f('u_c2', r2,g2,b2)
  set3f('u_c3', r3,g3,b3)

  gl.clearColor(r0, g0, b0, 1) // 背景兜底接近主色
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  raf = requestAnimationFrame(render)
}

/* ===== Lifecycle ===== */
function resize() {
  if (!gl) return
  const canvas = canvasRef.value
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const scale = Math.min(Math.max(props.resolutionScale, 0.6), 1.0)
  const W = Math.max(1, Math.floor(canvas.clientWidth * dpr * scale))
  const H = Math.max(1, Math.floor(canvas.clientHeight * dpr * scale))
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W; canvas.height = H
    gl.viewport(0, 0, W, H)
  }
}

onMounted(() => {
  createGL()
  window.addEventListener('resize', resize, { passive: true })
  raf = requestAnimationFrame(render)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
  if (gl) {
    const lose = gl.getExtension('WEBGL_lose_context')
    if (lose) lose.loseContext()
  }
})

/* 参数变化时，无需重建，下一帧自动生效 */
watch(() => [props.palette, props.speed, props.sheen, props.vignette, props.bulge, props.warp, props.seed], () => {}, { deep: true })
watch(() => props.resolutionScale, () => { resize() })
watch(() => props.paused, () => {})
</script>

<style scoped>
/* 圆角已由容器控制；Canvas 填满容器 */
canvas { display: block; width: 100%; height: 100%; }
</style>
