// 🔧 性能优化：根据设备性能动态调整参数
function getDevicePerformance() {
  const cores = navigator.hardwareConcurrency || 2;
  const memory = navigator.deviceMemory || 4;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (cores >= 8 && memory >= 8 && !isMobile) return 'high';
  if (cores >= 4 && memory >= 4) return 'medium';
  return 'low';
}

const DEVICE_PERFORMANCE = getDevicePerformance();

// 根据设备性能调整参数
const PERFORMANCE_CONFIG = {
  high: {
    duration: 520,
    particleCount: 52,
    burstCount: 8,
    maxDPR: 1.5,
    maxParticles: 280,
  },
  medium: {
    duration: 360,
    particleCount: 32,
    burstCount: 6,
    maxDPR: 1.2,
    maxParticles: 180,
  },
  low: {
    duration: 240,
    particleCount: 16,
    burstCount: 4,
    maxDPR: 1,
    maxParticles: 100,
  },
};

const CONFIG = PERFORMANCE_CONFIG[DEVICE_PERFORMANCE];

const DEFAULT_DISSOLVE_DURATION = CONFIG.duration;
const DEFAULT_DISSOLVE_PARTICLE_COUNT = CONFIG.particleCount;
const DEFAULT_BURST_DURATION = Math.floor(CONFIG.duration / 2);
const DEFAULT_BURST_PARTICLE_COUNT = CONFIG.burstCount;
const MAX_DPR = CONFIG.maxDPR;
const MAX_CANVAS_PIXELS = 2_200_000;
const MAX_PARTICLE_COUNT = CONFIG.maxParticles;
const IDLE_REMOVE_DELAY = 120;
const DEFAULT_Z_INDEX = 4000;
const HARMONY_ROW_PRESET = "harmony-row";
const HARMONY_BADGE_PRESET = "harmony-badge";
const DEFAULT_CSS_COLOR_VARIABLES = [
  "--particle-color",
  "--player-glow",
  "--player-accent",
  "--player-fg",
];

let sharedCanvas = null;
let sharedContext = null;
let animationFrame = 0;
let wakeTimer = 0;
let idleRemoveTimer = 0;
let pausedAt = 0;
let listenersAttached = false;
let nextEffectId = 1;
let canvasDpr = 1;

const activeEffects = new Map();
const hiddenSourceStates = new WeakMap();
const mistSpriteCache = new Map();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(from, to, progress) {
  return from + (to - from) * progress;
}

function easeOutCubic(progress) {
  return 1 - (1 - progress) ** 3;
}

function smoothstep(from, to, value) {
  const progress = clamp((value - from) / Math.max(0.0001, to - from), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isElement(value) {
  return typeof Element !== "undefined" && value instanceof Element;
}

function getUsableRect(element) {
  if (!isElement(element)) return null;
  const rect = element.getBoundingClientRect();
  if (
    !Number.isFinite(rect.left) ||
    !Number.isFinite(rect.top) ||
    !Number.isFinite(rect.width) ||
    !Number.isFinite(rect.height) ||
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return null;
  }
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function prefersReducedMotion() {
  return Boolean(
    typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
}

function normalizeDirection(value, fallback = "up") {
  if (typeof value === "number" && Number.isFinite(value)) {
    const radians = (value * Math.PI) / 180;
    return {x: Math.cos(radians), y: Math.sin(radians), outward: false};
  }

  if (Array.isArray(value) && value.length >= 2) {
    return normalizeVector(Number(value[0]), Number(value[1]), fallback);
  }

  if (value && typeof value === "object") {
    if (value.outward) return {x: 0, y: 0, outward: true};
    return normalizeVector(Number(value.x), Number(value.y), fallback);
  }

  const key = String(value || fallback).toLowerCase().replace(/_/g, "-");
  const directions = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0],
    "up-left": [-1, -1],
    "up-right": [1, -1],
    "down-left": [-1, 1],
    "down-right": [1, 1],
  };
  if (key === "out" || key === "outward" || key === "radial") {
    return {x: 0, y: 0, outward: true};
  }
  const [x, y] = directions[key] || directions[fallback] || directions.up;
  return normalizeVector(x, y, "up");
}

function normalizeVector(x, y, fallback) {
  const length = Math.hypot(x, y);
  if (!Number.isFinite(length) || length < 0.0001) {
    if (fallback === "outward") return {x: 0, y: 0, outward: true};
    return normalizeDirection(fallback, "up");
  }
  return {x: x / length, y: y / length, outward: false};
}

function normalizeColor(value) {
  const color = String(value || "").trim();
  if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") {
    return "";
  }
  if (/^[-+]?\d+(?:\.\d+)?(?:\s*,\s*|\s+)[-+]?\d+(?:\.\d+)?(?:\s*,\s*|\s+)[-+]?\d+(?:\.\d+)?(?:\s*,\s*[-+]?\d+(?:\.\d+)?)?$/.test(color)) {
    const parts = color.split(/[\s,]+/).filter(Boolean);
    if (parts.length === 3) return `rgb(${parts.join(", ")})`;
    if (parts.length === 4) return `rgba(${parts.join(", ")})`;
  }
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return color;
  return CSS.supports("color", color) ? color : "";
}

function resolveColors(element, options = {}) {
  const supplied = Array.isArray(options.colors)
    ? options.colors
    : options.colors || options.color
      ? [options.colors || options.color]
      : [];
  const colors = supplied.map(normalizeColor).filter(Boolean);
  const computed = window.getComputedStyle(element);
  const cssVariables = Array.isArray(options.cssVariables)
    ? options.cssVariables
    : DEFAULT_CSS_COLOR_VARIABLES;

  for (const variableName of cssVariables) {
    const name = String(variableName || "").trim();
    if (!name) continue;
    const value = normalizeColor(computed.getPropertyValue(name));
    if (value) colors.push(value);
  }

  const computedColors = [computed.color, computed.backgroundColor, computed.borderColor];
  if (element.namespaceURI === "http://www.w3.org/2000/svg") {
    computedColors.push(computed.fill, computed.stroke);
  }
  for (const value of computedColors) {
    const color = normalizeColor(value);
    if (color) colors.push(color);
  }

  const unique = [...new Set(colors)];
  return unique.length ? unique.slice(0, 8) : ["rgba(255, 255, 255, 0.88)"];
}

function stripCloneIdentity(clone) {
  clone.removeAttribute("id");
  clone.removeAttribute("name");
  clone.querySelectorAll("[id]").forEach((child) => child.removeAttribute("id"));
  clone.querySelectorAll("[name]").forEach((child) => child.removeAttribute("name"));
}

function copyCustomProperties(computed, clone) {
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    if (!property.startsWith("--")) continue;
    const value = computed.getPropertyValue(property);
    if (value) clone.style.setProperty(property, value);
  }
}

function syncCloneState(source, clone) {
  const sourceInputs = source.matches("input, textarea, select")
    ? [source, ...source.querySelectorAll("input, textarea, select")]
    : [...source.querySelectorAll("input, textarea, select")];
  const cloneInputs = clone.matches("input, textarea, select")
    ? [clone, ...clone.querySelectorAll("input, textarea, select")]
    : [...clone.querySelectorAll("input, textarea, select")];
  cloneInputs.forEach((control, index) => {
    const sourceControl = sourceInputs[index];
    if (!sourceControl) return;
    if ("value" in control) control.value = sourceControl.value;
    if ("checked" in control) control.checked = sourceControl.checked;
  });

  const sourceCanvases = source.matches("canvas")
    ? [source, ...source.querySelectorAll("canvas")]
    : [...source.querySelectorAll("canvas")];
  const cloneCanvases = clone.matches("canvas")
    ? [clone, ...clone.querySelectorAll("canvas")]
    : [...clone.querySelectorAll("canvas")];
  cloneCanvases.forEach((canvas, index) => {
    const sourceCanvas = sourceCanvases[index];
    if (!sourceCanvas) return;
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    try {
      canvas.getContext("2d")?.drawImage(sourceCanvas, 0, 0);
    } catch {
      // A canvas can be unavailable while its renderer is changing frames.
    }
  });

  const sourceVideos = source.matches("video")
    ? [source, ...source.querySelectorAll("video")]
    : [...source.querySelectorAll("video")];
  const cloneVideos = clone.matches("video")
    ? [clone, ...clone.querySelectorAll("video")]
    : [...clone.querySelectorAll("video")];
  cloneVideos.forEach((video, index) => {
    const sourceVideo = sourceVideos[index];
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    if (!sourceVideo) return;
    const syncTime = () => {
      try {
        video.currentTime = sourceVideo.currentTime;
      } catch {
        // Metadata may not be available on the clone yet.
      }
    };
    syncTime();
    if (video.readyState < 1) video.addEventListener("loadedmetadata", syncTime, {once: true});
    if (!sourceVideo.paused) video.play?.().catch?.(() => {});
  });
}

function applyCloneRect(clone, rect) {
  if (!clone || !rect) return;
  Object.assign(clone.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
}

function createFixedClone(element, rect, zIndex) {
  const clone = element.cloneNode(true);
  const computed = window.getComputedStyle(element);
  stripCloneIdentity(clone);
  copyCustomProperties(computed, clone);
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("inert", "");
  Object.assign(clone.style, {
    position: "fixed",
    margin: "0",
    boxSizing: "border-box",
    zIndex: String(zIndex),
    pointerEvents: "none",
    userSelect: "none",
    visibility: "visible",
    opacity: computed.opacity || "1",
    transform: "none",
    transformOrigin: "center",
    transition: "none",
    animation: "none",
    willChange: "opacity, transform, filter",
    borderRadius: computed.borderRadius,
    overflow: computed.overflow === "visible" ? "hidden" : computed.overflow,
    color: computed.color,
    font: computed.font,
    lineHeight: computed.lineHeight,
    contain: "paint",
  });
  applyCloneRect(clone, rect);
  syncCloneState(element, clone);
  document.body.appendChild(clone);
  return {
    element: clone,
    baseOpacity: clamp(Number.parseFloat(computed.opacity) || 1, 0, 1),
    baseFilter: computed.filter && computed.filter !== "none" ? computed.filter : "",
  };
}

function acquireSourceVisibility(element) {
  let state = hiddenSourceStates.get(element);
  if (!state) {
    state = {
      count: 0,
      keepHidden: false,
      visibility: element.style.getPropertyValue("visibility"),
      visibilityPriority: element.style.getPropertyPriority("visibility"),
      pointerEvents: element.style.getPropertyValue("pointer-events"),
      pointerEventsPriority: element.style.getPropertyPriority("pointer-events"),
      restore: null,
    };
    state.restore = () => {
      if (state.visibility) {
        element.style.setProperty("visibility", state.visibility, state.visibilityPriority);
      } else {
        element.style.removeProperty("visibility");
      }
      if (state.pointerEvents) {
        element.style.setProperty(
          "pointer-events",
          state.pointerEvents,
          state.pointerEventsPriority,
        );
      } else {
        element.style.removeProperty("pointer-events");
      }
      state.keepHidden = false;
      hiddenSourceStates.delete(element);
    };
    hiddenSourceStates.set(element, state);
  }

  state.count += 1;
  element.style.setProperty("visibility", "hidden", "important");
  element.style.setProperty("pointer-events", "none", "important");
  let released = false;

  return {
    restore: state.restore,
    release(keepHidden) {
      if (released) return;
      released = true;
      state.count = Math.max(0, state.count - 1);
      state.keepHidden ||= Boolean(keepHidden);
      if (state.count === 0 && !state.keepHidden) state.restore();
    },
  };
}

function resolveZIndex(element, value) {
  const supplied = Number(value);
  if (Number.isFinite(supplied)) return Math.round(supplied);
  const computed = Number.parseInt(window.getComputedStyle(element).zIndex, 10);
  return Number.isFinite(computed) ? Math.max(DEFAULT_Z_INDEX, computed + 1) : DEFAULT_Z_INDEX;
}

function ensureCanvas() {
  if (sharedCanvas?.isConnected && sharedContext) return sharedContext;
  sharedCanvas = document.createElement("canvas");
  sharedCanvas.className = "particle-dissolve-canvas";
  sharedCanvas.setAttribute("aria-hidden", "true");
  Object.assign(sharedCanvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    zIndex: String(DEFAULT_Z_INDEX + 1),
    pointerEvents: "none",
    userSelect: "none",
    contain: "strict",
  });
  sharedContext = sharedCanvas.getContext("2d", {alpha: true, desynchronized: true});
  if (!sharedContext) {
    sharedCanvas = null;
    return null;
  }
  document.body.appendChild(sharedCanvas);
  resizeCanvas();
  return sharedContext;
}

function resizeCanvas() {
  if (!sharedCanvas || !sharedContext) return;
  const width = Math.max(1, Math.round(window.innerWidth));
  const height = Math.max(1, Math.round(window.innerHeight));
  const pixelBudgetDpr = Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, width * height));
  canvasDpr = clamp(
    Math.min(window.devicePixelRatio || 1, MAX_DPR, pixelBudgetDpr),
    0.5,
    MAX_DPR,
  );
  const physicalWidth = Math.max(1, Math.round(width * canvasDpr));
  const physicalHeight = Math.max(1, Math.round(height * canvasDpr));
  if (sharedCanvas.width !== physicalWidth) sharedCanvas.width = physicalWidth;
  if (sharedCanvas.height !== physicalHeight) sharedCanvas.height = physicalHeight;
  sharedCanvas.style.width = `${width}px`;
  sharedCanvas.style.height = `${height}px`;
  sharedContext.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
}

function updateCanvasZIndex() {
  if (!sharedCanvas) return;
  let zIndex = DEFAULT_Z_INDEX + 1;
  activeEffects.forEach((effect) => {
    if (effect.particles.length) zIndex = Math.max(zIndex, effect.zIndex + 1);
  });
  sharedCanvas.style.zIndex = String(zIndex);
}

function clearCanvas() {
  if (!sharedCanvas || !sharedContext) return;
  sharedContext.save();
  sharedContext.setTransform(1, 0, 0, 1, 0, 0);
  sharedContext.clearRect(0, 0, sharedCanvas.width, sharedCanvas.height);
  sharedContext.restore();
}

function attachGlobalListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  window.addEventListener("resize", handleResize, {passive: true});
  window.addEventListener("orientationchange", handleResize, {passive: true});
  document.addEventListener("visibilitychange", handleVisibilityChange);
}

function detachGlobalListeners() {
  if (!listenersAttached) return;
  listenersAttached = false;
  window.removeEventListener("resize", handleResize);
  window.removeEventListener("orientationchange", handleResize);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
}

function handleResize() {
  resizeCanvas();
  activeEffects.forEach((effect) => {
    const nextRect = effect.element?.isConnected ? getUsableRect(effect.element) : null;
    if (!nextRect || !effect.rect) return;
    const shiftX = nextRect.left - effect.rect.left;
    const shiftY = nextRect.top - effect.rect.top;
    effect.particles.forEach((particle) => {
      particle.originX += shiftX;
      particle.originY += shiftY;
      particle.targetX += shiftX;
      particle.targetY += shiftY;
    });
    effect.sinkX += shiftX;
    effect.sinkY += shiftY;
    effect.rect = nextRect;
    applyCloneRect(effect.clone?.element, nextRect);
  });
}

function handleVisibilityChange() {
  if (document.hidden) {
    if (!pausedAt) pausedAt = performance.now();
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    if (wakeTimer) window.clearTimeout(wakeTimer);
    wakeTimer = 0;
    return;
  }

  if (pausedAt) {
    const now = performance.now();
    activeEffects.forEach((effect) => {
      effect.startedAt += now - Math.max(pausedAt, effect.createdAt);
    });
    pausedAt = 0;
  }
  scheduleFrame();
}

function getActiveParticleCount() {
  let count = 0;
  activeEffects.forEach((effect) => {
    count += effect.particles.length;
  });
  return count;
}

function resolvePreset(options, mode, rect) {
  const requested = String(options.preset || "").trim().toLowerCase();
  if (requested === HARMONY_ROW_PRESET || requested === HARMONY_BADGE_PRESET) {
    return requested;
  }
  if (mode === "burst" || (rect.width <= 72 && rect.height <= 56)) {
    return HARMONY_BADGE_PRESET;
  }
  return HARMONY_ROW_PRESET;
}

function resolveEffectDirection(options, preset) {
  const direction = normalizeDirection(
    options.direction,
    preset === HARMONY_BADGE_PRESET ? "up-right" : "right",
  );
  if (!direction.outward) return direction;
  return preset === HARMONY_BADGE_PRESET
    ? normalizeVector(0.82, -0.38, "up-right")
    : normalizeVector(1, 0, "right");
}

function resolveSinkPoint(rect, direction, options, preset) {
  const targetElement = options.targetElement || options.target;
  if (isElement(targetElement)) {
    const targetRect = getUsableRect(targetElement);
    if (targetRect) {
      return {
        x: targetRect.left + targetRect.width / 2,
        y: targetRect.top + targetRect.height / 2,
      };
    }
  }
  if (
    targetElement &&
    Number.isFinite(Number(targetElement.x)) &&
    Number.isFinite(Number(targetElement.y))
  ) {
    return {x: Number(targetElement.x), y: Number(targetElement.y)};
  }

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const edgeDistance = Math.abs(direction.x) * rect.width / 2 +
    Math.abs(direction.y) * rect.height / 2;
  const fallbackDistance = preset === HARMONY_BADGE_PRESET
    ? clamp(Math.max(rect.width, rect.height) * 0.82, 18, 38)
    : clamp(Math.max(rect.width, rect.height) * 0.28, 34, 92);
  const distance = Math.max(1, finiteOr(options.distance, fallbackDistance));
  return {
    x: centerX + direction.x * (edgeDistance + distance),
    y: centerY + direction.y * (edgeDistance + distance),
  };
}

function resolveParticleCounts(options, mode, preset) {
  const fallback = mode === "burst"
    ? DEFAULT_BURST_PARTICLE_COUNT
    : DEFAULT_DISSOLVE_PARTICLE_COUNT;
  const supplied = Number(options.particleCount);
  if (Number.isFinite(supplied) && supplied <= 0) return {dust: 0, mist: 0};

  let dust = 0;
  let mist = 0;
  if (preset === HARMONY_BADGE_PRESET) {
    dust = clamp(Math.round(Number.isFinite(supplied) ? supplied : fallback), 6, 10);
    mist = dust >= 8 ? 2 : 1;
  } else {
    const requested = clamp(
      Math.round(Number.isFinite(supplied) ? supplied : fallback),
      12,
      84,
    );
    mist = Math.max(4, Math.round(requested * 0.23));
    dust = Math.max(1, requested - mist);
  }

  const available = Math.max(0, MAX_PARTICLE_COUNT - getActiveParticleCount());
  const requestedTotal = dust + mist;
  const total = Math.min(available, requestedTotal);
  if (!total) return {dust: 0, mist: 0};
  const mistRatio = requestedTotal ? mist / requestedTotal : 0;
  const allocatedMist = Math.min(mist, Math.round(total * mistRatio));
  return {dust: total - allocatedMist, mist: allocatedMist};
}

function createParticles(rect, options, mode, preset, direction, sink) {
  const counts = resolveParticleCounts(options, mode, preset);
  if (!counts.dust && !counts.mist) return [];

  const colors = resolveColors(options.colorSource || options.element, options);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const axisRange = Math.max(
    1,
    Math.abs(direction.x) * rect.width + Math.abs(direction.y) * rect.height,
  );
  const perpendicularX = -direction.y;
  const perpendicularY = direction.x;
  const sizeScale = clamp(Math.min(rect.width, rect.height) / 72, 0.48, 1.65);
  const particles = [];

  const addParticle = (kind, index) => {
    const badge = preset === HARMONY_BADGE_PRESET;
    const normalizedX = badge
      ? clamp(0.5 + randomBetween(-0.22, 0.22), 0, 1)
      : Math.random();
    const normalizedY = badge
      ? clamp(0.5 + randomBetween(-0.28, 0.28), 0, 1)
      : Math.random();
    const originX = rect.left + rect.width * normalizedX;
    const originY = rect.top + rect.height * normalizedY;
    const closenessToExit = clamp(
      0.5 +
        ((originX - centerX) * direction.x + (originY - centerY) * direction.y) /
          axisRange,
      0,
      1,
    );
    const spawn = badge
      ? randomBetween(0.02, 0.12)
      : clamp((1 - closenessToExit) * 0.54 + randomBetween(-0.025, 0.035), 0, 0.58);
    const spread = kind === "mist" ? 14 : 8;
    const targetX = sink.x + perpendicularX * randomBetween(-spread, spread) +
      direction.x * randomBetween(-3, 12);
    const targetY = sink.y + perpendicularY * randomBetween(-spread, spread) +
      direction.y * randomBetween(-3, 12);
    const bend = (kind === "mist" ? 13 : 8) * sizeScale;
    const controlX = lerp(originX, targetX, randomBetween(0.42, 0.58)) +
      perpendicularX * randomBetween(-bend, bend);
    const controlY = lerp(originY, targetY, randomBetween(0.42, 0.58)) +
      perpendicularY * randomBetween(-bend, bend);

    particles.push({
      kind,
      originX,
      originY,
      controlX,
      controlY,
      targetX,
      targetY,
      spawn,
      curl: randomBetween(2.5, kind === "mist" ? 10 : 6) * sizeScale,
      phase: randomBetween(0, Math.PI * 2),
      radius: kind === "mist"
        ? randomBetween(8, 21) * sizeScale
        : randomBetween(0.65, 1.75) * sizeScale,
      opacity: kind === "mist" ? randomBetween(0.08, 0.16) : randomBetween(0.46, 0.82),
      color: colors[index % colors.length],
    });
  };

  for (let index = 0; index < counts.mist; index += 1) addParticle("mist", index);
  for (let index = 0; index < counts.dust; index += 1) {
    addParticle("dust", index + counts.mist);
  }
  return particles;
}

function getMistSprite(color) {
  const key = String(color || "rgba(255, 255, 255, 0.8)");
  if (mistSpriteCache.has(key)) return mistSpriteCache.get(key);
  const size = 64;
  let sprite = null;
  try {
    sprite = typeof OffscreenCanvas === "function"
      ? new OffscreenCanvas(size, size)
      : document.createElement("canvas");
    sprite.width = size;
    sprite.height = size;
    const context = sprite.getContext("2d");
    if (!context) return null;
    context.fillStyle = key;
    context.fillRect(0, 0, size, size);
    context.globalCompositeOperation = "destination-in";
    const gradient = context.createRadialGradient(32, 32, 1, 32, 32, 31);
    gradient.addColorStop(0, "rgba(255,255,255,0.82)");
    gradient.addColorStop(0.36, "rgba(255,255,255,0.38)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  } catch {
    return null;
  }
  if (mistSpriteCache.size >= 16) {
    mistSpriteCache.delete(mistSpriteCache.keys().next().value);
  }
  mistSpriteCache.set(key, sprite);
  return sprite;
}

function getParticlePosition(particle, progress, effect) {
  const travel = smoothstep(0, 1, progress);
  const inverse = 1 - travel;
  let x = inverse * inverse * particle.originX +
    2 * inverse * travel * particle.controlX +
    travel * travel * particle.targetX;
  let y = inverse * inverse * particle.originY +
    2 * inverse * travel * particle.controlY +
    travel * travel * particle.targetY;
  const curl = Math.sin(particle.phase + travel * Math.PI * 2.2) *
    Math.sin(travel * Math.PI) * particle.curl;
  x += -effect.direction.y * curl;
  y += effect.direction.x * curl;
  return {x, y};
}

function drawParticle(context, particle, effectProgress, effect) {
  const available = Math.max(0.05, 1 - particle.spawn);
  const localProgress = clamp((effectProgress - particle.spawn) / available, 0, 1);
  if (localProgress <= 0 || localProgress >= 1) return;
  const {x, y} = getParticlePosition(particle, localProgress, effect);
  const birth = smoothstep(0, particle.kind === "mist" ? 0.12 : 0.07, localProgress);
  const fade = 1 - smoothstep(
    particle.kind === "mist" ? 0.48 : 0.56,
    1,
    localProgress,
  );
  const alpha = birth * fade * particle.opacity * effect.particleOpacity;
  if (alpha <= 0.003) return;

  context.globalAlpha = alpha;
  if (particle.kind === "mist") {
    const sprite = getMistSprite(particle.color);
    const radius = particle.radius * lerp(0.72, 1.34, localProgress);
    if (sprite) {
      context.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
      return;
    }
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    return;
  }

  const radius = particle.radius * lerp(1, 0.32, localProgress);
  context.fillStyle = particle.color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function setCloneMask(clone, mask) {
  if (!clone?.element) return;
  clone.element.style.maskImage = mask;
  clone.element.style.webkitMaskImage = mask;
  clone.element.style.maskRepeat = "no-repeat";
  clone.element.style.webkitMaskRepeat = "no-repeat";
  clone.element.style.maskSize = "100% 100%";
  clone.element.style.webkitMaskSize = "100% 100%";
}

function updateHarmonyRowMask(effect, progress) {
  if (progress <= 0.001) {
    setCloneMask(effect.clone, "linear-gradient(#000, #000)");
    return;
  }
  const horizontal = Math.abs(effect.direction.x) >= Math.abs(effect.direction.y);
  const axis = horizontal
    ? effect.direction.x >= 0 ? "to right" : "to left"
    : effect.direction.y >= 0 ? "to bottom" : "to top";
  const axisSize = horizontal ? effect.rect.width : effect.rect.height;
  const feather = clamp(1800 / Math.max(1, axisSize), 4, 15);
  const front = 100 * (1 - progress);
  const solid = clamp(front - feather, 0, 100);
  const soft = clamp(front + feather, 0, 100);
  setCloneMask(
    effect.clone,
    `linear-gradient(${axis}, #000 0%, #000 ${solid}%, rgba(0,0,0,0.42) ${front}%, transparent ${soft}%, transparent 100%)`,
  );
}

function updateHarmonyBadgeMask(effect, progress) {
  if (progress <= 0.001) {
    setCloneMask(effect.clone, "linear-gradient(#000, #000)");
    return;
  }
  const radius = Math.max(0, 116 * (1 - progress));
  const inner = Math.max(0, radius - 14);
  setCloneMask(
    effect.clone,
    `radial-gradient(ellipse at center, #000 0%, #000 ${inner}%, rgba(0,0,0,0.38) ${radius}%, transparent ${Math.min(130, radius + 12)}%)`,
  );
}

function updateClone(effect, progress, elapsed) {
  const clone = effect.clone;
  if (!clone?.element) return;
  if (effect.mode === "burst") {
    const alpha = (1 - smoothstep(0, 1, progress)) * 0.18;
    clone.element.style.opacity = String(clone.baseOpacity * alpha);
    clone.element.style.transform = `scale(${1 + progress * 0.018})`;
    return;
  }

  if (effect.reduced) {
    const alpha = 1 - smoothstep(0, 1, progress);
    const travel = easeOutCubic(progress);
    setCloneMask(clone, "linear-gradient(#000, #000)");
    clone.element.style.opacity = String(clone.baseOpacity * alpha);
    clone.element.style.transform = `translate3d(${effect.direction.x * 3 * travel}px, ${effect.direction.y * 3 * travel}px, 0) scale(${1 - progress * 0.025})`;
    return;
  }

  if (effect.preset === HARMONY_BADGE_PRESET) {
    const gather = smoothstep(0, Math.min(70, effect.duration * 0.32), elapsed);
    const dissolve = smoothstep(22, effect.duration * 0.82, elapsed);
    const alpha = 1 - smoothstep(0.48, 1, progress);
    updateHarmonyBadgeMask(effect, dissolve);
    clone.element.style.opacity = String(clone.baseOpacity * alpha);
    clone.element.style.transform = `translate3d(${effect.direction.x * effect.cloneTravel * 0.45 * gather}px, ${effect.direction.y * effect.cloneTravel * 0.45 * gather}px, 0) scale(${1 - gather * 0.075})`;
    return;
  }

  const anticipation = smoothstep(0, Math.min(70, effect.duration * 0.22), elapsed);
  const collapse = smoothstep(70, Math.max(130, effect.duration * 0.72), elapsed);
  const dissolve = smoothstep(58, effect.duration * 0.84, elapsed);
  const tail = smoothstep(0.66, 1, progress);
  const translate = effect.cloneTravel * (anticipation * 0.18 + collapse * 0.82);
  const scaleX = 1 - anticipation * 0.012 - collapse * 0.038;
  const scaleY = 1 - anticipation * 0.035 - collapse * 0.035;
  const blur = effect.blur * smoothstep(0.52, 1, progress);
  updateHarmonyRowMask(effect, dissolve);
  clone.element.style.opacity = String(clone.baseOpacity * (1 - tail));
  clone.element.style.transform = `translate3d(${effect.direction.x * translate}px, ${effect.direction.y * translate}px, 0) scale(${scaleX}, ${scaleY})`;
  clone.element.style.filter = `${clone.baseFilter} blur(${blur}px)`.trim();
}

function resolveLayoutReady(effect, status = "ready") {
  if (!effect || effect.layoutSettled) return;
  effect.layoutSettled = true;
  effect.resolveLayout({status});
}

function completeEffect(effect, status = "finished") {
  if (!effect || effect.finished) return;
  effect.finished = true;
  resolveLayoutReady(effect, status === "finished" ? "ready" : status);
  activeEffects.delete(effect.id);
  effect.abortCleanup?.();
  effect.clone?.element?.remove();
  effect.sourceVisibility?.release(effect.keepSourceHidden);
  effect.resolve({
    status,
    restoreSource: effect.sourceVisibility?.restore || (() => {}),
  });
  updateCanvasZIndex();
  if (activeEffects.size) scheduleFrame();
  else {
    clearCanvas();
    scheduleIdleRemoval();
  }
}

function failEffect(effect, error) {
  if (!effect || effect.finished) return;
  effect.finished = true;
  resolveLayoutReady(effect, "failed");
  activeEffects.delete(effect.id);
  effect.abortCleanup?.();
  effect.clone?.element?.remove();
  effect.sourceVisibility?.release(false);
  effect.reject(error);
  updateCanvasZIndex();
}

function renderFrameUnsafe(now) {
  animationFrame = 0;
  if (!activeEffects.size) {
    scheduleIdleRemoval();
    return;
  }

  if (document.hidden) {
    if (!pausedAt) pausedAt = now;
    return;
  }

  let hasParticles = false;
  activeEffects.forEach((effect) => {
    if (effect.particles.length) hasParticles = true;
  });
  const context = hasParticles ? ensureCanvas() : null;
  if (context) updateCanvasZIndex();
  if (context && sharedCanvas) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, sharedCanvas.width, sharedCanvas.height);
    context.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
  }

  const completed = [];
  activeEffects.forEach((effect) => {
    const elapsed = Math.max(0, now - effect.startedAt);
    const progress = clamp(elapsed / effect.duration, 0, 1);
    if (elapsed >= effect.layoutAt) resolveLayoutReady(effect);
    updateClone(effect, progress, elapsed);
    if (context && effect.particles.length) {
      context.globalCompositeOperation = effect.blendMode;
      effect.particles.forEach((particle) => {
        drawParticle(context, particle, progress, effect);
      });
    }
    if (progress >= 1) completed.push(effect);
  });
  if (context) {
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  }
  completed.forEach((effect) => completeEffect(effect));

  if (activeEffects.size) scheduleFrame();
  else scheduleIdleRemoval();
}

function renderFrame(now) {
  try {
    renderFrameUnsafe(now);
  } catch (error) {
    animationFrame = 0;
    const failedEffects = [...activeEffects.values()];
    failedEffects.forEach((effect) => failEffect(effect, error));
    try {
      clearCanvas();
    } catch {
      // Cleanup must not strand a failed visual transaction.
    }
    scheduleIdleRemoval();
  }
}

function scheduleFrame() {
  if (animationFrame || !activeEffects.size) return;
  if (document.hidden) {
    if (!pausedAt) pausedAt = performance.now();
    return;
  }
  if (wakeTimer) window.clearTimeout(wakeTimer);
  wakeTimer = 0;
  const now = performance.now();
  let earliestStart = Number.POSITIVE_INFINITY;
  let hasStartedEffect = false;
  activeEffects.forEach((effect) => {
    earliestStart = Math.min(earliestStart, effect.startedAt);
    if (effect.startedAt <= now) hasStartedEffect = true;
  });
  if (!hasStartedEffect) {
    wakeTimer = window.setTimeout(() => {
      wakeTimer = 0;
      scheduleFrame();
    }, Math.max(0, earliestStart - now));
    return;
  }
  animationFrame = requestAnimationFrame(renderFrame);
}

function cancelIdleRemoval() {
  if (!idleRemoveTimer) return;
  window.clearTimeout(idleRemoveTimer);
  idleRemoveTimer = 0;
}

function scheduleIdleRemoval() {
  if (activeEffects.size || idleRemoveTimer) return;
  idleRemoveTimer = window.setTimeout(() => {
    idleRemoveTimer = 0;
    if (activeEffects.size) return;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    if (wakeTimer) window.clearTimeout(wakeTimer);
    wakeTimer = 0;
    sharedCanvas?.remove();
    sharedCanvas = null;
    sharedContext = null;
    canvasDpr = 1;
    pausedAt = 0;
    mistSpriteCache.clear();
    detachGlobalListeners();
  }, IDLE_REMOVE_DELAY);
}

function attachLayoutReady(task, layoutReady) {
  Object.defineProperty(task, "layoutReady", {
    configurable: false,
    enumerable: true,
    writable: false,
    value: layoutReady,
  });
  return task;
}

function createImmediateTask(status) {
  const result = {status, restoreSource: () => {}};
  return attachLayoutReady(
    Promise.resolve(result),
    Promise.resolve({status}),
  );
}

function createRejectedTask(error) {
  return attachLayoutReady(
    Promise.reject(error),
    Promise.resolve({status: "failed"}),
  );
}

function setCloneTransformOrigin(clone, direction, preset) {
  if (!clone?.element) return;
  if (preset === HARMONY_BADGE_PRESET) {
    clone.element.style.transformOrigin = "50% 50%";
    return;
  }
  const horizontal = Math.abs(direction.x) >= Math.abs(direction.y);
  clone.element.style.transformOrigin = horizontal
    ? direction.x >= 0 ? "100% 50%" : "0% 50%"
    : direction.y >= 0 ? "50% 100%" : "50% 0%";
}

function createEffect(element, options, mode) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return createImmediateTask("skipped");
  }
  const rect = getUsableRect(element);
  if (!rect) {
    return createImmediateTask("skipped");
  }

  if (options.signal?.aborted) {
    return createImmediateTask("aborted");
  }

  const preset = resolvePreset(options, mode, rect);
  let reduced = false;
  let duration = 0;
  let delay = 0;
  let layoutAt = 0;
  let zIndex = DEFAULT_Z_INDEX;
  let direction = null;
  let sink = null;
  let sourceVisibility = null;
  let clone = null;
  let resolveLayout = null;
  const layoutReady = new Promise((resolve) => {
    resolveLayout = resolve;
  });
  try {
    cancelIdleRemoval();
    attachGlobalListeners();
    reduced = options.reducedMotion ?? prefersReducedMotion();
    const defaultDuration = preset === HARMONY_BADGE_PRESET
      ? 260
      : mode === "burst" ? DEFAULT_BURST_DURATION : DEFAULT_DISSOLVE_DURATION;
    duration = reduced
      ? clamp(Number(options.reducedDuration) || 110, 60, 180)
      : clamp(Number(options.duration) || defaultDuration, 80, 4000);
    delay = clamp(finiteOr(options.delay, 0), 0, 30000);
    const suppliedLayoutAt = Number(options.layoutAt);
    layoutAt = mode === "burst"
      ? 0
      : reduced
        ? Math.min(duration, Math.max(40, duration * 0.55))
        : clamp(
            Number.isFinite(suppliedLayoutAt)
              ? suppliedLayoutAt
              : preset === HARMONY_ROW_PRESET ? 190 : 92,
            0,
            duration,
          );
    zIndex = resolveZIndex(element, options.zIndex);
    direction = resolveEffectDirection(options, preset);
    sink = resolveSinkPoint(rect, direction, options, preset);
    sourceVisibility = mode === "dissolve"
      ? acquireSourceVisibility(element)
      : null;
    const shouldCreateClone = mode === "dissolve" || reduced;
    clone = shouldCreateClone ? createFixedClone(element, rect, zIndex) : null;
    setCloneTransformOrigin(clone, direction, preset);
  } catch (error) {
    clone?.element?.remove();
    sourceVisibility?.release(false);
    resolveLayout({status: "failed"});
    scheduleIdleRemoval();
    return createRejectedTask(error);
  }
  const createdAt = performance.now();

  const task = new Promise((resolve, reject) => {
    let effect = null;
    try {
      effect = {
        id: nextEffectId,
        mode,
        element,
        rect,
        zIndex,
        direction,
        sinkX: sink.x,
        sinkY: sink.y,
        preset,
        reduced,
        duration,
        layoutAt,
        createdAt,
        startedAt: createdAt + delay,
        particles: reduced
          ? []
          : createParticles(
              rect,
              {...options, element},
              mode,
              preset,
              direction,
              sink,
            ),
        particleOpacity: clamp(
          finiteOr(options.particleOpacity, preset === HARMONY_BADGE_PRESET ? 0.5 : 0.58),
          0,
          1,
        ),
        blendMode: options.blendMode === "lighter" ? "lighter" : "source-over",
        blur: clamp(
          finiteOr(options.blur, preset === HARMONY_BADGE_PRESET ? 0.35 : 0.8),
          0,
          12,
        ),
        cloneTravel: clamp(
          finiteOr(options.cloneTravel, preset === HARMONY_BADGE_PRESET ? 6 : 12),
          0,
          80,
        ),
        clone,
        sourceVisibility,
        keepSourceHidden: Boolean(options.keepSourceHidden),
        resolve,
        reject,
        resolveLayout,
        layoutSettled: false,
        finished: false,
        abortCleanup: null,
      };
      nextEffectId += 1;
      activeEffects.set(effect.id, effect);

      if (options.signal) {
        const handleAbort = () => completeEffect(effect, "aborted");
        options.signal.addEventListener("abort", handleAbort, {once: true});
        effect.abortCleanup = () => options.signal.removeEventListener("abort", handleAbort);
        if (options.signal.aborted) handleAbort();
      }

      if (!effect.finished) {
        if (layoutAt <= 0) resolveLayoutReady(effect);
        updateCanvasZIndex();
        scheduleFrame();
      }
    } catch (error) {
      if (effect) activeEffects.delete(effect.id);
      effect?.abortCleanup?.();
      clone?.element?.remove();
      sourceVisibility?.release(false);
      if (effect) resolveLayoutReady(effect, "failed");
      else resolveLayout({status: "failed"});
      if (activeEffects.size) scheduleFrame();
      else scheduleIdleRemoval();
      reject(error);
    }
  });
  return attachLayoutReady(task, layoutReady);
}

/**
 * Replaces an element visually with a fixed clone, hides the source while the
 * clone dissolves, and resolves after the shared particle renderer is done.
 * When keepSourceHidden is true, call the resolved restoreSource function when
 * the real element should become visible again.
 */
export function dissolveElement(element, options = {}) {
  if (!isElement(element)) {
    return createImmediateTask("skipped");
  }
  return createEffect(element, options || {}, "dissolve");
}

/**
 * Emits particles around an element without changing its visibility. This is
 * suitable for badges, counters, success marks, and other persistent UI.
 */
export function burstElement(element, options = {}) {
  if (!isElement(element)) {
    return createImmediateTask("skipped");
  }
  return createEffect(element, options || {}, "burst");
}
