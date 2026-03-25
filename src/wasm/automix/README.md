# automix

Rust + WebAssembly automix engine for:

- Track compatibility scoring (`mix_score`)
- Next-track recommendation (`choose_next_track`)
- Transition planning (`compute_transition_plan`)
- One-shot pipeline (`run_automix`)

The library supports direct Rust usage and JS/TS usage via wasm-bindgen.

## Build

```bash
wasm-pack build --target web
```

## Exported wasm APIs

- `init_wasm()`
- `mix_score_js(current, next)`
- `choose_next_track_js(current, candidate_tracks)`
- `compute_transition_plan_js(current, next)`
- `run_automix_js(request)`

All wasm functions accept plain JS objects and return plain JS objects.

## Data model

`Track` fields:

- `id: string`
- `bpm: number`
- `key: { tonic: number, mode: "major" | "minor" }`
- `energy: number` (0..1)
- `duration: number` (seconds)
- `intro_end: number` (seconds)
- `outro_start: number` (seconds)
- `beat_positions: number[]` (seconds)
- `section_segments: { start: number, end: number, label: string }[]`

Section labels:

- `intro`
- `verse`
- `chorus`
- `breakdown`
- `build`
- `drop`
- `bridge`
- `outro`
- `other`

## Browser usage example (JS)

```js
import init, {
  init_wasm,
  mix_score_js,
  choose_next_track_js,
  compute_transition_plan_js,
  run_automix_js,
} from "./pkg/automix.js";

await init();
init_wasm();

const current = {
  id: "A",
  bpm: 124,
  key: { tonic: 9, mode: "minor" },
  energy: 0.72,
  duration: 240,
  intro_end: 24,
  outro_start: 208,
  beat_positions: Array.from({ length: 960 }, (_, i) => i * (60 / 124)),
  section_segments: [
    { start: 0, end: 24, label: "intro" },
    { start: 24, end: 80, label: "verse" },
    { start: 80, end: 120, label: "chorus" },
    { start: 208, end: 240, label: "outro" },
  ],
};

const candidateTracks = [
  {
    id: "B",
    bpm: 126,
    key: { tonic: 0, mode: "major" },
    energy: 0.78,
    duration: 230,
    intro_end: 20,
    outro_start: 200,
    beat_positions: Array.from({ length: 920 }, (_, i) => i * (60 / 126)),
    section_segments: [
      { start: 0, end: 20, label: "intro" },
      { start: 20, end: 72, label: "verse" },
      { start: 72, end: 112, label: "chorus" },
    ],
  },
  {
    id: "C",
    bpm: 120,
    key: { tonic: 2, mode: "minor" },
    energy: 0.55,
    duration: 260,
    intro_end: 32,
    outro_start: 220,
    beat_positions: Array.from({ length: 1040 }, (_, i) => i * (60 / 120)),
    section_segments: [{ start: 0, end: 32, label: "intro" }],
  },
];

const scoreAB = mix_score_js(current, candidateTracks[0]);
console.log("mix_score(A->B)", scoreAB);

const best = choose_next_track_js(current, candidateTracks);
console.log("best next track", best);

const transition = compute_transition_plan_js(current, candidateTracks[0]);
console.log("transition(A->B)", transition);

const fullResult = run_automix_js({
  current,
  candidate_tracks: candidateTracks,
});
console.log("run_automix", fullResult);
```

## Example output (shape)

```json
{
  "selected_next": {
    "track_id": "B",
    "score": {
      "total": 0.88,
      "bpm_score": 0.80,
      "key_score": 0.90,
      "energy_score": 0.99,
      "structure_score": 1.0,
      "tempo_ratio_delta": 0.016
    },
    "transition": {
      "mix_out_start": 208.5,
      "mix_in_start": 0.0,
      "crossfade_duration": 30.5,
      "beat_aligned": true,
      "tempo_adjust_required": false
    }
  }
}
```

## Notes

- If no candidate passes filters/threshold, `selected_next` is `null`.
- Field names are snake_case to match Rust struct fields.
- For best beat alignment, provide sorted `beat_positions` in seconds.
