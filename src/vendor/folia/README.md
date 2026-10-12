# Folia native visualizers

Source: https://github.com/chthollyphile/folia-major
Pinned commit: d79fa951dfa631fa9b4b7ebb0b4f58bd3e2c1fa8 (v0.7.17). License: AGPL-3.0; see LICENSE.

The eight renderer entry points and their layout, camera, canvas, WebGL, typography, timing and animation helpers are copied from upstream. upstream.json records the original SHA-256 digests and explicitly lists adapted files.

Host adapters include VisualizerShell (remove Folium mod/video slots), VisualizerBackgroundRenderer (original Common and Latent render paths, with lazy shader loading), usePlayerBottomBarBottomPx (original baseline/spring with host presence), and ProgressBar (remove Folium mod slots; add accessible label). Additional navigation and Cappella sizing adaptations are documented below. Aurora's folia bridge supplies seconds-based lyrics, the existing media clock/audio analyser, navigation and controls. It never creates a second audio player.

FoliaControls.tsx reproduces the upstream floating capsule markup, dimensions, hover delays and motion spring with host callbacks. The theme switcher is Aurora's addition. Keep this provenance and license with distributions of the port; modified source remains available in this directory and the host bridge.

TrackTitleNavigator uses the native hover default in place of the upstream app setting store. Aurora supplies its own activity-controlled Folia exit button. Cappella uses the native custom-avatar path with the current user on the right and the primary singer on the left; the bridge arranges the pair using the original seeded selection. Missing avatars use a neutral user icon or the current cover. Pendolo keeps the full cover watch face; camera and layout engines retain upstream defaults. Colors are selected from the linked previews; exact screenshot pixels also depend on lyrics, playback position, seed, font availability, viewport and audio energy.

CappellaBubbleParts keeps width animation but lets actual wrapped text establish bubble height, animating minimum height rather than clipping to a precomputed height. cappellaBubbleMetrics reserves two pixels for browser shaping/rounding and keys cached sizes by lyric text and word timing, so overlapping lines or replacement lyrics cannot reuse unrelated metrics. These two local adaptations address persistent clipping while long words/lines reveal.

The audio adapter preserves the upstream 0–255 frequency range, five frequency windows, response exponents, 2048-point FFT and 0.6 smoothing. Its analyser is a silent branch of Aurora's existing mixed output and is detached on close; it does not replace Aurora's rhythm analyser or reconnect media sources. Frequency bin width follows the active context's sample rate.

After native children mount, the bridge re-emits the existing clock value through MotionValue.dirty(). This initializes the original waiting/active/passed subscribers when changing themes while paused, without changing playback time or editing the native word components.

The bridge uses the original attachInterludes preprocessor, preserving the native intro/interlude dots and Cappella emoji handling. Its latest active line selection also retains Folia's inclusive end-time and overlapping duet behavior.

Background presets explicitly select Common for the linked screenshots (theme-colored geometry, Lucide theme icons, accent particles and vignette), with Tilt's flat background and Pendolo's disabled geometry. Fume retains its separate native canvas/parallax scene. The picker also exposes the original cover-fluid Common option and v0.7.17's default Latent background. LatentBackground, cover palette extraction and Paper shader uniform updates remain byte-identical to upstream. The development demo uses upstream playground preview band amplitudes; real playback keeps the native 0–255 FFT signals.
