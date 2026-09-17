mod analysis;
mod model;
mod planner;
mod scoring;
mod transition;
mod utils;

use model::{PathPlan, PathRequest, PlanContext, Track, TrackChoice};
use serde::Serialize;
use wasm_bindgen::prelude::*;

pub use analysis::analyze_pcm;
pub use planner::{choose_next_track, plan_path, score_pair};
pub use scoring::score_transition;
pub use transition::plan_transition;

#[derive(Serialize)]
struct RunResult {
    selected_next: Option<TrackChoice>,
    path: PathPlan,
}

#[wasm_bindgen]
pub fn init_wasm() {
    utils::set_panic_hook();
}

#[wasm_bindgen]
pub fn engine_version_js() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[wasm_bindgen]
pub fn mix_score_js(current: JsValue, next: JsValue) -> Result<JsValue, JsValue> {
    let current: Track = from_js(current, "current track")?;
    let next: Track = from_js(next, "next track")?;
    to_js(&score_pair(&current, &next))
}

#[wasm_bindgen]
pub fn choose_next_track_js(
    current: JsValue,
    candidate_tracks: JsValue,
) -> Result<JsValue, JsValue> {
    let current: Track = from_js(current, "current track")?;
    let candidates: Vec<Track> = from_js(candidate_tracks, "candidate tracks")?;
    to_js(&choose_next_track(
        &current,
        &candidates,
        &PlanContext::default(),
    ))
}

#[wasm_bindgen]
pub fn compute_transition_plan_js(current: JsValue, next: JsValue) -> Result<JsValue, JsValue> {
    compute_transition_plan_v2_js(current, next)
}

#[wasm_bindgen]
pub fn compute_transition_plan_v2_js(current: JsValue, next: JsValue) -> Result<JsValue, JsValue> {
    let current: Track = from_js(current, "current track")?;
    let next: Track = from_js(next, "next track")?;
    let context = PlanContext::default();
    let score = score_transition(&current, &next, &context);
    to_js(&plan_transition(&current, &next, &score, &context))
}

#[wasm_bindgen]
pub fn plan_track_path_js(request: JsValue) -> Result<JsValue, JsValue> {
    let request: PathRequest = from_js(request, "path request")?;
    to_js(&plan_path(&request))
}

#[wasm_bindgen]
pub fn run_automix_js(request: JsValue) -> Result<JsValue, JsValue> {
    let request: PathRequest = from_js(request, "automix request")?;
    let selected_next = choose_next_track(
        &request.current,
        &request.candidate_tracks,
        &request.context,
    );
    let path = plan_path(&request);
    to_js(&RunResult {
        selected_next,
        path,
    })
}

#[wasm_bindgen]
pub fn analyze_pcm_js(samples: &[f32], sample_rate: u32, channels: u8) -> Result<JsValue, JsValue> {
    let analysis = analyze_pcm(samples, sample_rate, channels).map_err(js_error)?;
    to_js(&analysis)
}

fn from_js<T>(value: JsValue, label: &str) -> Result<T, JsValue>
where
    T: serde::de::DeserializeOwned,
{
    serde_wasm_bindgen::from_value(value)
        .map_err(|error| js_error(format!("invalid {label}: {error}")))
}

fn to_js<T>(value: &T) -> Result<JsValue, JsValue>
where
    T: Serialize + ?Sized,
{
    serde_wasm_bindgen::to_value(value)
        .map_err(|error| js_error(format!("could not serialize automix result: {error}")))
}

fn js_error(message: impl ToString) -> JsValue {
    js_sys_error(message.to_string())
}

#[cfg(target_arch = "wasm32")]
fn js_sys_error(message: String) -> JsValue {
    js_sys::Error::new(&message).into()
}

#[cfg(not(target_arch = "wasm32"))]
fn js_sys_error(message: String) -> JsValue {
    JsValue::from_str(&message)
}
