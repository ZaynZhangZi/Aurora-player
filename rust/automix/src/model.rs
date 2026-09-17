use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct MusicalKey {
    #[serde(default)]
    pub tonic: Option<i16>,
    #[serde(default)]
    pub mode: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct FeatureConfidence {
    #[serde(default)]
    pub tempo: Option<f64>,
    #[serde(default)]
    pub beat_grid: Option<f64>,
    #[serde(default)]
    pub key: Option<f64>,
    #[serde(default)]
    pub energy: Option<f64>,
    #[serde(default)]
    pub loudness: Option<f64>,
    #[serde(default)]
    pub structure: Option<f64>,
    #[serde(default)]
    pub vocal: Option<f64>,
    #[serde(default)]
    pub overall: Option<f64>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TimedValue {
    pub time: f64,
    pub value: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TimeRange {
    pub start: f64,
    pub end: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SectionSegment {
    pub start: f64,
    pub end: f64,
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub confidence: Option<f64>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct MixRegion {
    pub start: f64,
    pub end: f64,
    #[serde(default)]
    pub direction: String,
    #[serde(default)]
    pub confidence: Option<f64>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Track {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub bpm: Option<f64>,
    #[serde(default)]
    pub key: Option<MusicalKey>,
    #[serde(default)]
    pub energy: Option<f64>,
    #[serde(default)]
    pub duration: f64,
    #[serde(default)]
    pub intro_end: Option<f64>,
    #[serde(default)]
    pub outro_start: Option<f64>,
    #[serde(default)]
    pub beat_positions: Vec<f64>,
    #[serde(default)]
    pub downbeat_positions: Vec<f64>,
    #[serde(default)]
    pub section_segments: Vec<SectionSegment>,
    #[serde(default)]
    pub energy_curve: Vec<TimedValue>,
    #[serde(default)]
    pub vocal_regions: Vec<TimeRange>,
    #[serde(default)]
    pub mix_regions: Vec<MixRegion>,
    #[serde(default)]
    pub loudness_lufs: Option<f64>,
    #[serde(default)]
    pub peak_dbfs: Option<f64>,
    #[serde(default)]
    pub confidence: FeatureConfidence,
    #[serde(default)]
    pub artist_ids: Vec<String>,
    #[serde(default)]
    pub album_id: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub analysis_version: Option<u32>,
}

impl Track {
    pub fn valid_duration(&self) -> Option<f64> {
        finite_in_range(self.duration, 1.0, 14_400.0)
    }

    pub fn valid_bpm(&self) -> Option<f64> {
        self.bpm
            .and_then(|value| finite_in_range(value, 40.0, 240.0))
    }

    pub fn valid_energy(&self) -> Option<f64> {
        self.energy
            .and_then(|value| finite_in_range(value, 0.0, 1.0))
    }

    pub fn valid_loudness(&self) -> Option<f64> {
        self.loudness_lufs
            .and_then(|value| finite_in_range(value, -80.0, 3.0))
    }

    pub fn valid_key(&self) -> Option<(u8, &str)> {
        let key = self.key.as_ref()?;
        let tonic = key.tonic?;
        if !(0..=11).contains(&tonic) {
            return None;
        }
        let mode = key.mode.as_deref()?.to_ascii_lowercase();
        match mode.as_str() {
            "major" => Some((tonic as u8, "major")),
            "minor" => Some((tonic as u8, "minor")),
            _ => None,
        }
    }

    pub fn tempo_confidence(&self) -> f64 {
        confidence_or(
            self.confidence.tempo,
            if self.valid_bpm().is_some() {
                0.45
            } else {
                0.0
            },
        )
    }

    pub fn beat_confidence(&self) -> f64 {
        confidence_or(
            self.confidence.beat_grid,
            if self.beat_positions.len() >= 8 {
                0.55
            } else {
                0.0
            },
        )
    }

    pub fn key_confidence(&self) -> f64 {
        confidence_or(
            self.confidence.key,
            if self.valid_key().is_some() {
                0.45
            } else {
                0.0
            },
        )
    }

    pub fn energy_confidence(&self) -> f64 {
        confidence_or(
            self.confidence.energy,
            if self.valid_energy().is_some() {
                0.5
            } else {
                0.0
            },
        )
    }

    pub fn loudness_confidence(&self) -> f64 {
        confidence_or(
            self.confidence.loudness,
            if self.valid_loudness().is_some() {
                0.5
            } else {
                0.0
            },
        )
    }

    pub fn structure_confidence(&self) -> f64 {
        confidence_or(
            self.confidence.structure,
            if !self.mix_regions.is_empty() || !self.section_segments.is_empty() {
                0.45
            } else {
                0.0
            },
        )
    }

    pub fn vocal_confidence(&self) -> f64 {
        confidence_or(
            self.confidence.vocal,
            if !self.vocal_regions.is_empty() {
                0.45
            } else {
                0.0
            },
        )
    }

    pub fn overall_confidence(&self) -> f64 {
        if let Some(value) = self.confidence.overall {
            return clamp01(value);
        }

        let values = [
            self.tempo_confidence(),
            self.beat_confidence(),
            self.key_confidence(),
            self.energy_confidence(),
            self.loudness_confidence(),
            self.structure_confidence(),
            self.vocal_confidence(),
        ];
        values.iter().sum::<f64>() / values.len() as f64
    }

    pub fn normalized_beats(&self) -> Vec<f64> {
        normalized_positions(&self.beat_positions, self.duration)
    }

    pub fn normalized_downbeats(&self) -> Vec<f64> {
        normalized_positions(&self.downbeat_positions, self.duration)
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PlanContext {
    #[serde(default)]
    pub max_tempo_shift: Option<f64>,
    #[serde(default)]
    pub avoid_vocal_overlap: Option<bool>,
    #[serde(default)]
    pub target_energy_curve: Vec<f64>,
    #[serde(default)]
    pub recently_played: Vec<String>,
    #[serde(default)]
    pub preferred_bars: Vec<u32>,
    #[serde(default)]
    pub min_beatmix_confidence: Option<f64>,
}

impl PlanContext {
    pub fn tempo_shift_limit(&self) -> f64 {
        self.max_tempo_shift.unwrap_or(0.06).clamp(0.0, 0.16)
    }

    pub fn avoid_vocals(&self) -> bool {
        self.avoid_vocal_overlap.unwrap_or(true)
    }

    pub fn beatmix_threshold(&self) -> f64 {
        self.min_beatmix_confidence
            .unwrap_or(0.72)
            .clamp(0.35, 0.95)
    }

    pub fn bars(&self) -> Vec<u32> {
        let mut bars: Vec<u32> = self
            .preferred_bars
            .iter()
            .copied()
            .filter(|value| matches!(value, 4 | 8 | 16 | 32))
            .collect();
        if bars.is_empty() {
            bars.extend([16, 8, 4]);
        }
        bars
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TransitionScore {
    pub total: f64,
    pub bpm_score: f64,
    pub key_score: f64,
    pub energy_score: f64,
    pub structure_score: f64,
    pub loudness_score: f64,
    pub vocal_score: f64,
    pub confidence_score: f64,
    pub tempo_ratio_delta: f64,
    pub reliable: bool,
    #[serde(default)]
    pub reason_codes: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AutomationPoint {
    pub offset: f64,
    pub value: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EqAutomationPoint {
    pub offset: f64,
    pub low: f64,
    pub mid: f64,
    pub high: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct FilterAutomationPoint {
    pub offset: f64,
    pub lowpass_hz: f64,
    pub highpass_hz: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TransitionPlan {
    pub kind: String,
    pub mix_out_start: f64,
    pub mix_in_start: f64,
    pub crossfade_duration: f64,
    pub beat_aligned: bool,
    pub bar_aligned: bool,
    pub bars: u32,
    #[serde(default)]
    pub mix_in_section_label: Option<String>,
    pub alignment_confidence: f64,
    pub tempo_adjust_required: bool,
    pub outgoing_rate: f64,
    pub incoming_rate: f64,
    pub loudness_gain_db: f64,
    pub confidence: f64,
    #[serde(default)]
    pub outgoing_gain: Vec<AutomationPoint>,
    #[serde(default)]
    pub incoming_gain: Vec<AutomationPoint>,
    #[serde(default)]
    pub outgoing_eq: Vec<EqAutomationPoint>,
    #[serde(default)]
    pub incoming_eq: Vec<EqAutomationPoint>,
    #[serde(default)]
    pub outgoing_filter: Vec<FilterAutomationPoint>,
    #[serde(default)]
    pub incoming_filter: Vec<FilterAutomationPoint>,
    #[serde(default)]
    pub outgoing_dry: Vec<AutomationPoint>,
    #[serde(default)]
    pub outgoing_echo_wet: Vec<AutomationPoint>,
    #[serde(default)]
    pub outgoing_echo_feedback: Vec<AutomationPoint>,
    #[serde(default)]
    pub echo_delay_sec: f64,
    #[serde(default)]
    pub loop_start: Option<f64>,
    #[serde(default)]
    pub loop_end: Option<f64>,
    #[serde(default)]
    pub loop_repetitions: u32,
    #[serde(default)]
    pub reason_codes: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TrackChoice {
    pub track_id: String,
    pub score: TransitionScore,
    pub transition: TransitionPlan,
    #[serde(default)]
    pub reason_codes: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PathRequest {
    pub current: Track,
    #[serde(default)]
    pub candidate_tracks: Vec<Track>,
    #[serde(default)]
    pub horizon: Option<usize>,
    #[serde(default)]
    pub beam_width: Option<usize>,
    #[serde(default)]
    pub context: PlanContext,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PathStep {
    pub track_id: String,
    pub step_score: f64,
    pub cumulative_score: f64,
    pub score: TransitionScore,
    pub transition: TransitionPlan,
    #[serde(default)]
    pub reason_codes: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PathPlan {
    #[serde(default)]
    pub steps: Vec<PathStep>,
    pub total_score: f64,
    pub confidence: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AudioAnalysis {
    pub duration: f64,
    #[serde(default)]
    pub bpm: Option<f64>,
    #[serde(default)]
    pub key: Option<MusicalKey>,
    #[serde(default)]
    pub beat_positions: Vec<f64>,
    #[serde(default)]
    pub downbeat_positions: Vec<f64>,
    #[serde(default)]
    pub energy: Option<f64>,
    #[serde(default)]
    pub energy_curve: Vec<TimedValue>,
    #[serde(default)]
    pub loudness_lufs: Option<f64>,
    #[serde(default)]
    pub peak_dbfs: Option<f64>,
    #[serde(default)]
    pub intro_end: Option<f64>,
    #[serde(default)]
    pub outro_start: Option<f64>,
    #[serde(default)]
    pub section_segments: Vec<SectionSegment>,
    #[serde(default)]
    pub mix_regions: Vec<MixRegion>,
    #[serde(default)]
    pub vocal_regions: Vec<TimeRange>,
    pub confidence: FeatureConfidence,
    pub analysis_version: u32,
}

pub fn clamp01(value: f64) -> f64 {
    if value.is_finite() {
        value.clamp(0.0, 1.0)
    } else {
        0.0
    }
}

fn confidence_or(value: Option<f64>, fallback: f64) -> f64 {
    value.map(clamp01).unwrap_or_else(|| clamp01(fallback))
}

fn finite_in_range(value: f64, min: f64, max: f64) -> Option<f64> {
    (value.is_finite() && value >= min && value <= max).then_some(value)
}

fn normalized_positions(values: &[f64], duration: f64) -> Vec<f64> {
    let upper = if duration.is_finite() && duration > 0.0 {
        duration + 0.25
    } else {
        f64::MAX
    };
    let mut output: Vec<f64> = values
        .iter()
        .copied()
        .filter(|value| value.is_finite() && *value >= 0.0 && *value <= upper)
        .collect();
    output.sort_by(f64::total_cmp);
    output.dedup_by(|a, b| (*a - *b).abs() < 0.001);
    output
}
