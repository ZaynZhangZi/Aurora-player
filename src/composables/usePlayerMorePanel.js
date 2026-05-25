import {ref} from "vue";

export function usePlayerMorePanel() {
  const moreMenuButtonRef = ref(null);
  const morePanelOpen = ref(false);
  const morePanelStyle = ref({right: "18px", bottom: "110px"});

  function updateMorePanelPosition() {
    if (!moreMenuButtonRef.value || typeof window === "undefined") return;
    const rect = moreMenuButtonRef.value.getBoundingClientRect();
    const right = Math.max(12, window.innerWidth - rect.right);
    const bottom = Math.max(14, window.innerHeight - rect.top + 10);
    morePanelStyle.value = {
      right: `${right}px`,
      bottom: `${bottom}px`,
    };
  }

  function openMorePanel() {
    updateMorePanelPosition();
    morePanelOpen.value = true;
  }

  function closeMorePanel() {
    morePanelOpen.value = false;
  }

  function toggleMorePanel() {
    if (morePanelOpen.value) {
      closeMorePanel();
      return;
    }
    openMorePanel();
  }

  return {
    moreMenuButtonRef,
    morePanelOpen,
    morePanelStyle,
    updateMorePanelPosition,
    openMorePanel,
    closeMorePanel,
    toggleMorePanel,
  };
}
