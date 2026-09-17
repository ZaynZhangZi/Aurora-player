/* tslint:disable */
/* eslint-disable */

export function analyze_pcm_js(samples: Float32Array, sample_rate: number, channels: number): any;

export function choose_next_track_js(current: any, candidate_tracks: any): any;

export function compute_transition_plan_js(current: any, next: any): any;

export function compute_transition_plan_v2_js(current: any, next: any): any;

export function engine_version_js(): string;

export function init_wasm(): void;

export function mix_score_js(current: any, next: any): any;

export function plan_track_path_js(request: any): any;

export function run_automix_js(request: any): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly analyze_pcm_js: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly choose_next_track_js: (a: number, b: number, c: number) => void;
    readonly compute_transition_plan_js: (a: number, b: number, c: number) => void;
    readonly compute_transition_plan_v2_js: (a: number, b: number, c: number) => void;
    readonly engine_version_js: (a: number) => void;
    readonly init_wasm: () => void;
    readonly mix_score_js: (a: number, b: number, c: number) => void;
    readonly plan_track_path_js: (a: number, b: number) => void;
    readonly run_automix_js: (a: number, b: number) => void;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number) => void;
    readonly __wbindgen_export4: (a: number, b: number, c: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
