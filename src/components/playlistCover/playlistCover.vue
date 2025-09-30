<template>
  <div class="gradient-container w-full h-full">
    <canvas ref="canvasRef" class="gradient-bg"></canvas>
    <div class="blur-overlay"></div>
  </div>
</template>

<script setup>
import {ref, onMounted, onUnmounted, watch} from 'vue'

const props = defineProps({
  colors: {
    type: Array,
    default: () => ['#4A90E2', '#9013FE', '#E83283', '#F76B1C', '#FADB5F']
  },
  paused: { type: Boolean, default: false },
  lowPerformance: { type: Boolean, default: false }
})

const canvasRef = ref(null)
let gl = null
let program = null
let animationId = null
let startTime = Date.now()
let lastRenderTime = 0
const targetFPS = props.lowPerformance ? 30 : 60
const frameInterval = 1000 / targetFPS

const hexToRgb = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? {
    r: parseInt(m[1], 16) / 255,
    g: parseInt(m[2], 16) / 255,
    b: parseInt(m[3], 16) / 255
  } : {r: 0, g: 0, b: 0}
}

const createShader = (gl, type, source) => {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

const createProgram = (gl, vertexShader, fragmentShader) => {
  const program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  return program
}

const initWebGL = () => {
  const canvas = canvasRef.value
  const scale = props.lowPerformance ? 0.75 : 1.0
  canvas.width = Math.max(1, Math.floor(window.innerWidth * scale))
  canvas.height = Math.max(1, Math.floor(window.innerHeight * scale))
  canvas.style.width = '100%'
  canvas.style.height = '100%'

  gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false
  })
  if (!gl) { console.error('WebGL not supported'); return false }

  gl.viewport(0, 0, canvas.width, canvas.height)

  // ✅ 平均色作为 clearColor
  let r = 0, g = 0, b = 0
  const cols = props.colors && props.colors.length ? props.colors : ['#000000']
  cols.forEach(c => {
    const rgb = hexToRgb(c)
    r += rgb.r
    g += rgb.g
    b += rgb.b
  })
  r /= cols.length
  g /= cols.length
  b /= cols.length
  gl.clearColor(r, g, b, 1.0)

  const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `

  const fragmentShaderSource = `
    precision mediump float;
    uniform vec2  u_resolution;
    uniform float u_time;
    uniform vec3  u_colors[5];

    mat2 rot(float a){ float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }

    float blobField(vec2 p, vec2 c, float r){
      float d = length(p - c);
      float k = 2.6 / r;
      return exp(-k*k * d*d);
    }

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 p = uv * 2.0 - 1.0;
      p.x *= u_resolution.x / u_resolution.y;

      float t = u_time;
      p *= rot(0.03 * sin(t*0.23));
      p /= (1.0 + 0.025 * sin(t*0.41));

      float hole = exp(-dot(p,p) / (0.42*0.42));
      float holeFactor = 0.35;

      float R = 0.82;
      vec2 c1 = vec2(cos(t*0.33+0.0),  sin(t*0.33+0.0))  * (R * 0.95);
      vec2 c2 = vec2(cos(t*0.47+1.7),  sin(t*0.47+1.7))  * (R * 0.70);
      vec2 c3 = vec2(cos(-t*0.28+3.2), sin(-t*0.28+3.2)) * (R * 0.55);
      vec2 c4 = vec2(cos(t*0.21+2.6),  sin(t*0.21+2.6))  * (R * 1.05);
      vec2 c5 = vec2(cos(-t*0.38+0.9), sin(-t*0.38+0.9)) * (R * 0.40);

      float w1 = blobField(p, c1, 1.00);
      float w2 = blobField(p, c2, 0.85);
      float w3 = blobField(p, c3, 0.70);
      float w4 = blobField(p, c4, 1.15);
      float w5 = blobField(p, c5, 0.60);

      float f = max(0.0, (w1+w2+w3+w4+w5) - hole*holeFactor);

      vec3 mixCol =
          w1*u_colors[0] + w2*u_colors[1] + w3*u_colors[2] +
          w4*u_colors[3] + w5*u_colors[4];

      float sumW = max(1e-4, w1+w2+w3+w4+w5);
      vec3 color = mixCol / sumW;

      // ✅ 计算平均颜色
      vec3 avgCol = (u_colors[0] + u_colors[1] + u_colors[2] + u_colors[3] + u_colors[4]) / 5.0;

      // ✅ 融合平均色，避免边缘掉黑
      float mixFactor = smoothstep(0.0, 0.25, f);
      vec3 finalCol = mix(avgCol, color, mixFactor);

      // 轻微动态处理
      finalCol *= (1.01 + 0.012 * sin(t*0.7));
      finalCol += (hash(gl_FragCoord.xy + t) - 0.5) * 0.012;
      finalCol = pow(finalCol, vec3(0.95));

      gl_FragColor = vec4(finalCol, 1.0);
    }
  `

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
  program = createProgram(gl, vertexShader, fragmentShader)
  if (!program) return false

  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

  const positionLocation = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

  gl.useProgram(program)
  return true
}

const render = (currentTime) => {
  if (!gl || !program || props.paused) {
    if (!props.paused) animationId = requestAnimationFrame(render)
    return
  }
  const elapsed = currentTime - lastRenderTime
  if (elapsed < frameInterval) {
    animationId = requestAnimationFrame(render)
    return
  }
  lastRenderTime = currentTime - (elapsed % frameInterval)

  const time = (Date.now() - startTime) / 1000

  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
  gl.uniform2f(resolutionLocation, canvasRef.value.width, canvasRef.value.height)

  const timeLocation = gl.getUniformLocation(program, 'u_time')
  gl.uniform1f(timeLocation, time)

  const colorLocation = gl.getUniformLocation(program, 'u_colors[0]')
  const colorData = []
  const cols = props.colors && props.colors.length ? props.colors : ['#4A90E2', '#9013FE', '#E83283', '#F76B1C', '#FADB5F']
  for (let i=0;i<5;i++){
    const rgb = hexToRgb(cols[i % cols.length])
    colorData.push(rgb.r, rgb.g, rgb.b)
  }
  gl.uniform3fv(colorLocation, new Float32Array(colorData))

  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  animationId = requestAnimationFrame(render)
}

watch(() => props.paused, (paused) => {
  if (!paused && !animationId) animationId = requestAnimationFrame(render)
})

onMounted(() => {
  if (initWebGL()) {
    animationId = requestAnimationFrame(render)
  }
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (gl) {
    const loseContext = gl.getExtension('WEBGL_lose_context')
    if (loseContext) loseContext.loseContext()
  }
})
</script>

<style scoped>
.gradient-bg {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  will-change: transform;
  transform: translateZ(0);
  image-rendering: auto;
}
.blur-overlay {
  position: absolute;
  inset: 0;
  backdrop-filter: blur(14px) saturate(1.25) contrast(1.06);
  -webkit-backdrop-filter: blur(14px) saturate(1.25) contrast(1.06);
  pointer-events: none;
}
</style>
