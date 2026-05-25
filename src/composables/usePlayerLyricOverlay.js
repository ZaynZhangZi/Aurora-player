import {ref} from "vue";

const DEFAULT_UNMOUNT_DELAY = 560;

export function usePlayerLyricOverlay({
  hasSong,
  nextTick,
  requestFrame,
  clearTimer,
  setTimer,
  unmountDelay = DEFAULT_UNMOUNT_DELAY,
}) {
  const amllOpened = ref(false);
  const amllMounted = ref(false);
  let amllUnmountTimer = 0;

  function clearUnmountTimer() {
    if (!amllUnmountTimer) return;
    clearTimer(amllUnmountTimer);
    amllUnmountTimer = 0;
  }

  function openLyricPage() {
    if (!hasSong()) return;
    clearUnmountTimer();
    if (!amllMounted.value) {
      amllMounted.value = true;
      nextTick(() => {
        requestFrame(() => {
          amllOpened.value = true;
        });
      });
      return;
    }
    amllOpened.value = true;
  }

  function onAmllOpenedChange(nextOpened) {
    const opened = Boolean(nextOpened);
    if (opened) {
      clearUnmountTimer();
      amllMounted.value = true;
      amllOpened.value = true;
      return;
    }
    amllOpened.value = false;
    clearUnmountTimer();
    amllUnmountTimer = setTimer(() => {
      if (!amllOpened.value) amllMounted.value = false;
      amllUnmountTimer = 0;
    }, unmountDelay);
  }

  function disposeLyricOverlay() {
    clearUnmountTimer();
  }

  return {
    amllOpened,
    amllMounted,
    openLyricPage,
    onAmllOpenedChange,
    disposeLyricOverlay,
  };
}
