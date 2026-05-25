import {ref} from "vue";

const STORE_TIME_SYNC_INTERVAL_MS = 72;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function usePlayerRhythmAnalyzer({
  getHasSong,
  getIsPlaying,
  getPrefersReducedMotion,
  getIsIOSDevice,
  getActiveAudio,
  getPrimaryAudio,
  onSyncCurrentTimeMs,
}) {
  const rhythmLevel = ref(0);
  const beatLevel = ref(0);
  const visualPulse = ref(0);

  let audioContext = null;
  let analyserNode = null;
  let mediaSourceNode = null;
  let analyserFrame = 0;
  let analyserData = null;
  let analyserPrevData = null;
  let analyserLastTs = 0;
  let lastStoreTimeSyncTs = 0;
  let rhythmEnergyEma = 0;
  let rhythmFluxEma = 0;
  let lowBandEma = 0;
  let rhythmGain = 1;

  function resetRhythmVisual() {
    rhythmLevel.value = 0;
    beatLevel.value = 0;
    visualPulse.value = 0;
  }

  function resetRhythmEnergy() {
    rhythmEnergyEma = 0;
    rhythmFluxEma = 0;
    lowBandEma = 0;
    rhythmGain = 1;
    analyserLastTs = 0;
    lastStoreTimeSyncTs = 0;
    if (analyserPrevData) {
      analyserPrevData.fill(0);
    }
  }

  function ensureAnalyser() {
    const primaryAudio = getPrimaryAudio?.();
    if (!primaryAudio || typeof window === "undefined") return false;
    if (getIsIOSDevice?.()) return false;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return false;

    try {
      if (!audioContext) {
        audioContext = new Context();
      }
      if (!analyserNode) {
        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 256;
        analyserNode.smoothingTimeConstant = 0.82;
      }
      if (!mediaSourceNode) {
        mediaSourceNode = audioContext.createMediaElementSource(primaryAudio);
        mediaSourceNode.connect(analyserNode);
        analyserNode.connect(audioContext.destination);
        analyserData = new Uint8Array(analyserNode.frequencyBinCount);
        analyserPrevData = new Uint8Array(analyserNode.frequencyBinCount);
      }
      return true;
    } catch {
      return false;
    }
  }

  function stopRhythmLoop() {
    if (analyserFrame) {
      cancelAnimationFrame(analyserFrame);
      analyserFrame = 0;
    }
  }

  function tickRhythm(now) {
    const active = getActiveAudio?.();
    if (
      active &&
      !active.paused &&
      (now - lastStoreTimeSyncTs > STORE_TIME_SYNC_INTERVAL_MS ||
        !lastStoreTimeSyncTs)
    ) {
      onSyncCurrentTimeMs?.(Math.floor((active.currentTime || 0) * 1000));
      lastStoreTimeSyncTs = now;
    }

    if (!analyserNode || !analyserData || !analyserPrevData) {
      analyserFrame = requestAnimationFrame(tickRhythm);
      return;
    }

    if (now - analyserLastTs > 34) {
      analyserNode.getByteFrequencyData(analyserData);
      let low = 0;
      let mid = 0;
      let high = 0;
      let flux = 0;
      let total = 0;
      const lowCount = Math.max(6, Math.floor(analyserData.length * 0.08));
      const midStart = lowCount;
      const midEnd = Math.max(
        midStart + 1,
        Math.floor(analyserData.length * 0.28),
      );
      const highStart = midEnd;
      const highEnd = Math.max(
        highStart + 1,
        Math.floor(analyserData.length * 0.62),
      );

      for (let i = 0; i < lowCount; i += 1) low += analyserData[i];
      for (let i = midStart; i < midEnd; i += 1) mid += analyserData[i];
      for (let i = highStart; i < highEnd; i += 1) high += analyserData[i];
      for (let i = 0; i < analyserData.length; i += 1) {
        const current = analyserData[i];
        total += current;
        const diff = current - analyserPrevData[i];
        if (diff > 0) flux += diff;
        analyserPrevData[i] = current;
      }

      const lowEnergy = low / (lowCount * 255);
      const midEnergy = mid / ((midEnd - midStart) * 255);
      const highEnergy = high / ((highEnd - highStart) * 255);
      const totalEnergy = total / (analyserData.length * 255);
      const fluxEnergy = flux / (analyserData.length * 255);

      rhythmEnergyEma =
        rhythmEnergyEma > 0
          ? rhythmEnergyEma * 0.88 + totalEnergy * 0.12
          : totalEnergy;
      rhythmFluxEma =
        rhythmFluxEma > 0
          ? rhythmFluxEma * 0.9 + fluxEnergy * 0.1
          : fluxEnergy;

      const energyBoost = clamp(
        (totalEnergy - rhythmEnergyEma * 0.9) * 3.4,
        0,
        1,
      );
      const fluxBoost = clamp((fluxEnergy - rhythmFluxEma * 0.72) * 7.8, 0, 1);
      const fluxRatio = clamp(fluxEnergy / (rhythmFluxEma + 0.016), 0, 2.6);

      lowBandEma =
        lowBandEma > 0 ? lowBandEma * 0.86 + lowEnergy * 0.14 : lowEnergy;
      const lowTransient = clamp((lowEnergy - lowBandEma * 0.9) * 4.6, 0, 1);

      const bodyRaw = clamp(
        totalEnergy * 1.08 +
          lowEnergy * 0.56 +
          midEnergy * 0.38 +
          highEnergy * 0.18,
        0,
        1,
      );
      const targetLevel = 0.42;
      const adaptive = clamp(targetLevel / (bodyRaw + 0.08), 0.9, 2.4);
      rhythmGain = rhythmGain * 0.93 + adaptive * 0.07;

      const bodyLevel = clamp(bodyRaw * rhythmGain, 0, 1);
      const beatKickRaw =
        fluxBoost * 0.78 +
        fluxRatio * 0.22 +
        energyBoost * 0.4 +
        lowTransient * 1.05;
      const beatKick = clamp((beatKickRaw - 0.1) / 0.9, 0, 1) ** 0.78;

      rhythmLevel.value = clamp(
        rhythmLevel.value * 0.5 + bodyLevel * 0.5,
        0,
        1,
      );
      beatLevel.value = clamp(Math.max(beatLevel.value * 0.86, beatKick), 0, 1);

      const targetPulse = clamp(
        rhythmLevel.value * 0.42 + beatLevel.value * 0.78,
        0,
        1,
      );
      if (targetPulse > visualPulse.value) {
        visualPulse.value = clamp(
          visualPulse.value + (targetPulse - visualPulse.value) * 0.24,
          0,
          1,
        );
      } else {
        visualPulse.value = clamp(
          visualPulse.value + (targetPulse - visualPulse.value) * 0.08,
          0,
          1,
        );
      }
      analyserLastTs = now;
    }

    analyserFrame = requestAnimationFrame(tickRhythm);
  }

  async function startRhythmLoop() {
    if (!getHasSong?.()) return;
    if (!getIsPlaying?.()) return;
    if (getPrefersReducedMotion?.()) return;
    if (!ensureAnalyser()) return;

    if (audioContext?.state === "suspended") {
      try {
        await audioContext.resume();
      } catch {
        return;
      }
    }

    if (!analyserFrame) {
      analyserLastTs = 0;
      analyserFrame = requestAnimationFrame(tickRhythm);
    }
  }

  function disposeRhythmAnalyzer() {
    stopRhythmLoop();

    if (mediaSourceNode) {
      try {
        mediaSourceNode.disconnect();
      } catch {
        // noop
      }
      mediaSourceNode = null;
    }

    if (analyserNode) {
      try {
        analyserNode.disconnect();
      } catch {
        // noop
      }
      analyserNode = null;
    }

    if (audioContext) {
      audioContext.close().catch(() => {
      });
      audioContext = null;
    }
  }

  return {
    rhythmLevel,
    beatLevel,
    visualPulse,
    startRhythmLoop,
    stopRhythmLoop,
    resetRhythmVisual,
    resetRhythmEnergy,
    disposeRhythmAnalyzer,
  };
}
