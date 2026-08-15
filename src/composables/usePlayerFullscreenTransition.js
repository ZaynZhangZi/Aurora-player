import {ref} from "vue";

const DEFAULT_DURATION = 680;
const DEFAULT_WRAPPER_TIMEOUT = 1600;
const WRAPPER_SELECTOR = ".amll-wrapper";

function prefersReducedMotion() {
  return (
    typeof window === "undefined" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function waitForFrame() {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(fallbackTimer);
      resolve();
    };
    const fallbackTimer = window.setTimeout(finish, 100);
    requestAnimationFrame(finish);
  });
}

async function waitFrames(count = 1) {
  const total = Math.max(1, Number(count) || 1);
  for (let index = 0; index < total; index += 1) await waitForFrame();
}

function isUsableRect(rect) {
  return Boolean(
    rect &&
      rect.width > 0 &&
      rect.height > 0 &&
      Number.isFinite(rect.left) &&
      Number.isFinite(rect.top),
  );
}

function blurFocusWithin(element) {
  const activeElement = document.activeElement;
  if (
    element?.contains(activeElement) &&
    typeof activeElement.blur === "function"
  ) {
    activeElement.blur();
  }
}

function focusElement(element) {
  if (typeof element?.focus !== "function") return;
  try {
    element.focus({preventScroll: true});
  } catch {
    element.focus();
  }
}

function findLatestWrapper(root = document) {
  const wrappers = root?.querySelectorAll?.(WRAPPER_SELECTOR) || [];
  return wrappers.length ? wrappers[wrappers.length - 1] : null;
}

async function waitForWrapper(getOverlayHost, timeout = DEFAULT_WRAPPER_TIMEOUT) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeout) {
    const host = getOverlayHost ? getOverlayHost() : document;
    const wrapper = host ? findLatestWrapper(host) : null;
    if (wrapper?.querySelector(".amll-prebuilt")) return wrapper;
    await waitFrames();
  }
  return null;
}

function getExpectedLayoutClass(wrapper) {
  const rect = wrapper?.getBoundingClientRect();
  const width = isUsableRect(rect) ? rect.width : window.innerWidth;
  const height = isUsableRect(rect) ? rect.height : window.innerHeight;

  if (width <= 900 || height <= 560) return "is-layout-mobile";
  if (
    height > width ||
    width < 1180 ||
    height < 640 ||
    width / height < 1.35
  ) {
    return "is-layout-vertical";
  }
  return "is-layout-horizontal";
}

function findFullscreenCover(wrapper) {
  if (!wrapper) return null;
  const player = wrapper.querySelector(".amll-prebuilt");
  if (!player) return null;

  const selectors = player.classList.contains("is-layout-horizontal")
    ? [".amll-prebuilt__cover-slot .amll-prebuilt__cover"]
    : player.classList.contains("hideLyric")
      ? [
          ".amll-prebuilt__big-cover .amll-prebuilt__cover",
          ".amll-prebuilt__small-cover .amll-prebuilt__cover",
        ]
      : [
          ".amll-prebuilt__small-cover .amll-prebuilt__cover",
          ".amll-prebuilt__big-cover .amll-prebuilt__cover",
        ];

  for (const selector of selectors) {
    const cover = player.querySelector(selector);
    if (cover && isUsableRect(cover.getBoundingClientRect())) return cover;
  }
  return null;
}

async function waitForFullscreenCover(wrapper, timeout = 900) {
  const expectedLayout = getExpectedLayoutClass(wrapper);
  const startedAt = performance.now();
  let previousRect = null;
  let stableFrames = 0;
  let latestCover = null;

  while (performance.now() - startedAt < timeout) {
    const player = wrapper?.querySelector(".amll-prebuilt");
    const cover = findFullscreenCover(wrapper);
    const rect = cover?.getBoundingClientRect();
    const layoutReady = player?.classList.contains(expectedLayout);

    if (cover && isUsableRect(rect)) {
      if (layoutReady) latestCover = cover;
      const stable =
        previousRect &&
        Math.abs(previousRect.left - rect.left) < 0.5 &&
        Math.abs(previousRect.top - rect.top) < 0.5 &&
        Math.abs(previousRect.width - rect.width) < 0.5 &&
        Math.abs(previousRect.height - rect.height) < 0.5;
      stableFrames = layoutReady && stable ? stableFrames + 1 : 0;
      previousRect = rect;
      if (stableFrames >= 1) return cover;
    }

    await waitFrames();
  }

  return latestCover;
}

function preserveInlineStyles(element, properties) {
  if (!element) return () => {};
  const previous = properties.map((property) => ({
    property,
    value: element.style.getPropertyValue(property),
    priority: element.style.getPropertyPriority(property),
  }));

  return () => {
    previous.forEach(({property, value, priority}) => {
      if (value) element.style.setProperty(property, value, priority);
      else element.style.removeProperty(property);
    });
  };
}

function stripCloneIds(element) {
  if (!(element instanceof Element)) return;
  element.removeAttribute("id");
  element.querySelectorAll("[id]").forEach((child) => {
    child.removeAttribute("id");
  });
}

function collectVideos(element) {
  if (!(element instanceof Element)) return [];
  return [
    ...(element.matches("video") ? [element] : []),
    ...element.querySelectorAll("video"),
  ];
}

function syncMediaVideos(
  source,
  target,
  {forceMuted = false, forcePlayback = false} = {},
) {
  const sourceVideos = collectVideos(source);
  const targetVideos = collectVideos(target);

  targetVideos.forEach((targetVideo, index) => {
    const sourceVideo = sourceVideos[index];
    if (forceMuted) targetVideo.muted = true;
    targetVideo.playsInline = true;

    const syncCurrentTime = () => {
      if (!sourceVideo || !Number.isFinite(sourceVideo.currentTime)) return;
      try {
        targetVideo.currentTime = sourceVideo.currentTime;
      } catch {
        // Metadata can arrive after the clone/target enters the document.
      }
    };

    syncCurrentTime();
    if (targetVideo.readyState < 1) {
      targetVideo.addEventListener("loadedmetadata", syncCurrentTime, {
        once: true,
      });
    }

    if (forcePlayback || (sourceVideo && !sourceVideo.paused)) {
      const playback = targetVideo.play?.();
      playback?.catch?.(() => {});
    }
  });
}

function syncClonedVideos(source, clone) {
  syncMediaVideos(source, clone, {forceMuted: true, forcePlayback: true});
}

function cloneTransitionElement(source, rect, zIndex) {
  const clone = source.cloneNode(true);
  stripCloneIds(clone);
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("inert", "");
  Object.assign(clone.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
    zIndex: String(zIndex),
    opacity: "1",
    visibility: "visible",
    overflow: "hidden",
    pointerEvents: "none",
    animation: "none",
    transition: "none",
    transformOrigin: "center",
  });
  syncClonedVideos(source, clone);
  return clone;
}

function createTransitionStage(shell, shellRect) {
  const stage = document.createElement("div");
  stage.className = "player-fullscreen-transition-stage";
  stage.setAttribute("aria-hidden", "true");
  Object.assign(stage.style, {
    position: "fixed",
    inset: "0",
    zIndex: "3200",
    overflow: "hidden",
    pointerEvents: "none",
    isolation: "isolate",
  });

  const computed = window.getComputedStyle(shell);
  const surface = document.createElement("div");
  surface.className = "player-fullscreen-transition-surface";
  Object.assign(surface.style, {
    position: "absolute",
    inset: "0",
    zIndex: "1",
    backgroundColor: computed.backgroundColor,
    backgroundImage: computed.backgroundImage,
    backgroundPosition: computed.backgroundPosition,
    backgroundSize: computed.backgroundSize,
    backgroundRepeat: computed.backgroundRepeat,
    borderColor: computed.borderColor,
    borderStyle: computed.borderStyle,
    borderWidth: computed.borderWidth,
    boxShadow: computed.boxShadow,
    filter: computed.filter,
    willChange: "clip-path, opacity",
  });

  const shellClone = cloneTransitionElement(shell, shellRect, 2);
  shellClone
    .querySelectorAll("[data-player-transition-cover]")
    .forEach((cover) => {
      cover.style.opacity = "0";
    });
  stage.append(surface, shellClone);
  document.body.appendChild(stage);

  return {
    stage,
    surface,
    shellClone,
    shellRadius: computed.borderTopLeftRadius || "24px",
  };
}

function clipPathForRect(rect, radius) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const right = Math.max(0, viewportWidth - rect.right);
  const bottom = Math.max(0, viewportHeight - rect.bottom);
  return `inset(${Math.max(0, rect.top)}px ${right}px ${bottom}px ${Math.max(0, rect.left)}px round ${radius})`;
}

function animateCover(
  clone,
  fromRect,
  toRect,
  fromRadius,
  toRadius,
  fromShadow,
  toShadow,
  duration,
) {
  return clone.animate(
    [
      {
        left: `${fromRect.left}px`,
        top: `${fromRect.top}px`,
        width: `${fromRect.width}px`,
        height: `${fromRect.height}px`,
        borderRadius: fromRadius,
        boxShadow: fromShadow,
      },
      {
        left: `${toRect.left}px`,
        top: `${toRect.top}px`,
        width: `${toRect.width}px`,
        height: `${toRect.height}px`,
        borderRadius: toRadius,
        boxShadow: toShadow,
      },
    ],
    {
      duration,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "both",
    },
  );
}

async function waitForAnimations(animations) {
  await Promise.all(
    animations.map((animation) => animation.finished.catch(() => {})),
  );
}

export function usePlayerFullscreenTransition({
  nextTick,
  prepareOverlay,
  commitOverlayOpened,
  getOverlayOpened,
  getOverlayHost,
  getMiniShell,
  getMiniCover,
  duration = DEFAULT_DURATION,
}) {
  const transitioning = ref(false);
  let activeRun = null;
  let pendingWrapperLock = null;
  let disposed = false;

  function cleanupRun(run, {restoreWrapper = true} = {}) {
    if (!run || run.cleaned) return;
    run.cleaned = true;
    run.removeViewportListeners?.();
    run.animations.forEach((animation) => animation.cancel());
    run.restoreTargetCover?.();
    run.restoreMiniShell?.();
    if (restoreWrapper) run.restoreWrapper?.();
    if (run.stage?.parentNode) run.stage.parentNode.removeChild(run.stage);
    if (activeRun === run) activeRun = null;
    transitioning.value = false;
  }

  function watchViewportDuringRun(run, onViewportChange) {
    const handleViewportChange = () => {
      if (!run.cleaned) onViewportChange();
    };
    const listenerOptions = {passive: true};
    window.addEventListener("resize", handleViewportChange, listenerOptions);
    window.addEventListener(
      "orientationchange",
      handleViewportChange,
      listenerOptions,
    );
    run.removeViewportListeners = () => {
      window.removeEventListener(
        "resize",
        handleViewportChange,
        listenerOptions,
      );
      window.removeEventListener(
        "orientationchange",
        handleViewportChange,
        listenerOptions,
      );
    };
  }

  function clearPendingWrapperTimer() {
    if (!pendingWrapperLock?.timer) return;
    window.clearTimeout(pendingWrapperLock.timer);
    pendingWrapperLock.timer = 0;
  }

  function releasePendingWrapperLock() {
    if (!pendingWrapperLock) return;
    clearPendingWrapperTimer();
    pendingWrapperLock.restore?.();
    pendingWrapperLock = null;
  }

  function claimWrapperRestore(wrapper) {
    if (pendingWrapperLock?.wrapper !== wrapper) {
      return preserveInlineStyles(wrapper, [
        "transition",
        "transform",
        "opacity",
        "pointer-events",
        "border-radius",
        "will-change",
      ]);
    }

    clearPendingWrapperTimer();
    const restore = pendingWrapperLock.restore;
    pendingWrapperLock = null;
    return restore;
  }

  function holdWrapperHiddenUntilUnmounted(wrapper, restore) {
    releasePendingWrapperLock();
    pendingWrapperLock = {wrapper, restore, timer: 0};

    const releaseWhenDetached = () => {
      if (!pendingWrapperLock || pendingWrapperLock.wrapper !== wrapper) return;
      if (!wrapper.isConnected) {
        releasePendingWrapperLock();
        return;
      }
      pendingWrapperLock.timer = window.setTimeout(releaseWhenDetached, 80);
    };

    pendingWrapperLock.timer = window.setTimeout(releaseWhenDetached, 80);
  }

  function canAnimate(shell, cover) {
    return Boolean(
      !prefersReducedMotion() &&
        shell &&
        cover &&
        typeof shell.animate === "function" &&
        typeof document !== "undefined",
    );
  }

  async function openFullscreen() {
    if (transitioning.value || getOverlayOpened()) return false;
    if (!prepareOverlay()) return false;

    const miniShell = getMiniShell();
    const miniCover = getMiniCover();
    blurFocusWithin(miniShell);
    if (!canAnimate(miniShell, miniCover)) {
      commitOverlayOpened(true);
      return true;
    }

    const shellRect = miniShell.getBoundingClientRect();
    const sourceCoverRect = miniCover.getBoundingClientRect();
    if (!isUsableRect(shellRect) || !isUsableRect(sourceCoverRect)) {
      commitOverlayOpened(true);
      return true;
    }

    transitioning.value = true;
    let run = null;
    try {
      await nextTick();
      const wrapper = await waitForWrapper(getOverlayHost);

      if (disposed) {
        transitioning.value = false;
        return false;
      }
      if (!wrapper) {
        transitioning.value = false;
        commitOverlayOpened(true);
        return true;
      }

      run = {
        animations: [],
        cleaned: false,
        stage: null,
        restoreWrapper: claimWrapperRestore(wrapper),
        restoreMiniShell: preserveInlineStyles(miniShell, [
          "opacity",
          "pointer-events",
        ]),
        restoreTargetCover: null,
      };
      activeRun = run;

      Object.assign(wrapper.style, {
        transition: "none",
        transform: "translateY(0)",
        opacity: "0",
        pointerEvents: "none",
        borderRadius: "0",
        willChange: "opacity",
      });

      commitOverlayOpened(true);
      await nextTick();

      const fullscreenCover = await waitForFullscreenCover(wrapper);
      const targetCoverRect = fullscreenCover?.getBoundingClientRect();
      if (disposed) {
        cleanupRun(run);
        return false;
      }
      if (!fullscreenCover || !isUsableRect(targetCoverRect)) {
        cleanupRun(run);
        commitOverlayOpened(true);
        return true;
      }

      run.restoreTargetCover = preserveInlineStyles(fullscreenCover, [
        "opacity",
        "visibility",
        "will-change",
      ]);
      syncMediaVideos(miniCover, fullscreenCover);
      fullscreenCover.style.opacity = "0";
      fullscreenCover.style.willChange = "opacity";
      miniShell.style.opacity = "0";
      miniShell.style.pointerEvents = "none";

      const stageParts = createTransitionStage(miniShell, shellRect);
      run.stage = stageParts.stage;
      const coverClone = cloneTransitionElement(miniCover, sourceCoverRect, 4);
      stageParts.stage.appendChild(coverClone);

      const sourceCoverStyle = window.getComputedStyle(miniCover);
      const targetCoverStyle = window.getComputedStyle(fullscreenCover);
      const sourceRadius = sourceCoverStyle.borderTopLeftRadius || "8px";
      const targetRadius = targetCoverStyle.borderTopLeftRadius || "18px";
      const cardClip = clipPathForRect(shellRect, stageParts.shellRadius);
      const fullClip = "inset(0px 0px 0px 0px round 0px)";

      run.animations.push(
        stageParts.surface.animate(
          [
            {clipPath: cardClip, opacity: 1},
            {clipPath: fullClip, opacity: 0.9, offset: 0.74},
            {clipPath: fullClip, opacity: 0},
          ],
          {
            duration,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "both",
          },
        ),
        stageParts.shellClone.animate(
          [
            {opacity: 1, transform: "scale(1)"},
            {
              opacity: 0,
              transform: "scale(1.025)",
              offset: 0.36,
            },
            {opacity: 0, transform: "scale(1.025)"},
          ],
          {duration, easing: "ease-out", fill: "both"},
        ),
        wrapper.animate(
          [{opacity: 0}, {opacity: 1}],
          {
            duration: Math.round(duration * 0.76),
            delay: Math.round(duration * 0.14),
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "both",
          },
        ),
        animateCover(
          coverClone,
          sourceCoverRect,
          targetCoverRect,
          sourceRadius,
          targetRadius,
          sourceCoverStyle.boxShadow,
          targetCoverStyle.boxShadow,
          duration,
        ),
      );
      watchViewportDuringRun(run, () => {
        cleanupRun(run);
        focusElement(wrapper.querySelector(".amll-prebuilt__thumbButton"));
      });

      await waitForAnimations(run.animations);
      if (disposed) {
        cleanupRun(run);
        return false;
      }
      if (run.cleaned) return true;

      cleanupRun(run);
      focusElement(wrapper.querySelector(".amll-prebuilt__thumbButton"));
      return true;
    } catch {
      cleanupRun(run);
      transitioning.value = false;
      if (!disposed) commitOverlayOpened(true);
      return !disposed;
    }
  }

  async function closeFullscreen() {
    if (transitioning.value || !getOverlayOpened()) return false;

    const wrapper = findLatestWrapper(getOverlayHost?.());
    const miniShell = getMiniShell();
    const miniCover = getMiniCover();
    const fullscreenCover = findFullscreenCover(wrapper);

    if (!canAnimate(miniShell, miniCover) || !wrapper || !fullscreenCover) {
      commitOverlayOpened(false);
      return true;
    }

    const shellRect = miniShell.getBoundingClientRect();
    const targetCoverRect = miniCover.getBoundingClientRect();
    const sourceCoverRect = fullscreenCover.getBoundingClientRect();
    if (
      !isUsableRect(shellRect) ||
      !isUsableRect(targetCoverRect) ||
      !isUsableRect(sourceCoverRect)
    ) {
      commitOverlayOpened(false);
      return true;
    }

    transitioning.value = true;
    let run = null;
    try {
      run = {
        animations: [],
        cleaned: false,
        stage: null,
        restoreWrapper: claimWrapperRestore(wrapper),
        restoreMiniShell: preserveInlineStyles(miniShell, [
          "opacity",
          "pointer-events",
        ]),
        restoreTargetCover: preserveInlineStyles(fullscreenCover, [
          "opacity",
          "visibility",
          "will-change",
        ]),
      };
      activeRun = run;

      Object.assign(wrapper.style, {
        transition: "none",
        transform: "translateY(0)",
        opacity: "1",
        pointerEvents: "none",
        borderRadius: "0",
        willChange: "opacity",
      });
      syncMediaVideos(fullscreenCover, miniCover);
      fullscreenCover.style.opacity = "0";
      miniShell.style.opacity = "0";
      miniShell.style.pointerEvents = "none";

      const stageParts = createTransitionStage(miniShell, shellRect);
      run.stage = stageParts.stage;
      const coverClone = cloneTransitionElement(
        fullscreenCover,
        sourceCoverRect,
        4,
      );
      stageParts.stage.appendChild(coverClone);

      const sourceCoverStyle = window.getComputedStyle(fullscreenCover);
      const targetCoverStyle = window.getComputedStyle(miniCover);
      const sourceRadius = sourceCoverStyle.borderTopLeftRadius || "18px";
      const targetRadius = targetCoverStyle.borderTopLeftRadius || "8px";
      const cardClip = clipPathForRect(shellRect, stageParts.shellRadius);
      const fullClip = "inset(0px 0px 0px 0px round 0px)";

      run.animations.push(
        stageParts.surface.animate(
          [
            {clipPath: fullClip, opacity: 0},
            {clipPath: fullClip, opacity: 0.32, offset: 0.18},
            {clipPath: cardClip, opacity: 1},
          ],
          {
            duration,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "both",
          },
        ),
        stageParts.shellClone.animate(
          [
            {opacity: 0, transform: "translateY(8px) scale(0.985)"},
            {
              opacity: 0,
              transform: "translateY(8px) scale(0.985)",
              offset: 0.6,
            },
            {opacity: 1, transform: "translateY(0) scale(1)"},
          ],
          {
            duration,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "both",
          },
        ),
        wrapper.animate(
          [{opacity: 1}, {opacity: 0}],
          {
            duration: Math.round(duration * 0.78),
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            fill: "both",
          },
        ),
        animateCover(
          coverClone,
          sourceCoverRect,
          targetCoverRect,
          sourceRadius,
          targetRadius,
          sourceCoverStyle.boxShadow,
          targetCoverStyle.boxShadow,
          duration,
        ),
      );
      watchViewportDuringRun(run, () => {
        const restoreWrapper = run.restoreWrapper;
        Object.assign(wrapper.style, {
          transition: "none",
          transform: "translateY(0)",
          opacity: "0",
          pointerEvents: "none",
          borderRadius: "0",
        });
        commitOverlayOpened(false);
        cleanupRun(run, {restoreWrapper: false});
        holdWrapperHiddenUntilUnmounted(wrapper, restoreWrapper);
        void nextTick(() => focusElement(miniCover));
      });

      await waitForAnimations(run.animations);
      if (disposed) {
        cleanupRun(run);
        return false;
      }
      if (run.cleaned) return true;

      wrapper.style.opacity = "0";
      commitOverlayOpened(false);
      await nextTick();
      const restoreWrapper = run.restoreWrapper;
      Object.assign(wrapper.style, {
        transition: "none",
        transform: "translateY(0)",
        opacity: "0",
        pointerEvents: "none",
        borderRadius: "0",
      });
      cleanupRun(run, {restoreWrapper: false});
      holdWrapperHiddenUntilUnmounted(wrapper, restoreWrapper);
      focusElement(miniCover);
      return true;
    } catch {
      cleanupRun(run);
      transitioning.value = false;
      if (!disposed) commitOverlayOpened(false);
      return !disposed;
    }
  }

  function disposeFullscreenTransition() {
    disposed = true;
    cleanupRun(activeRun);
    releasePendingWrapperLock();
  }

  return {
    transitioning,
    openFullscreen,
    closeFullscreen,
    disposeFullscreenTransition,
  };
}
