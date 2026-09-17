use crate::model::{clamp01, PlanContext, Track, TransitionScore};

const BPM_WEIGHT: f64 = 0.24;
const KEY_WEIGHT: f64 = 0.14;
const ENERGY_WEIGHT: f64 = 0.17;
const STRUCTURE_WEIGHT: f64 = 0.19;
const LOUDNESS_WEIGHT: f64 = 0.10;
const VOCAL_WEIGHT: f64 = 0.16;

pub fn best_tempo_match(current_bpm: f64, next_bpm: f64) -> (f64, f64, f64) {
    let mut best_adjusted = next_bpm;
    let mut best_delta = f64::INFINITY;
    for multiplier in [0.5, 1.0, 2.0] {
        let adjusted = next_bpm * multiplier;
        let delta = ((adjusted - current_bpm) / current_bpm).abs();
        if delta < best_delta {
            best_adjusted = adjusted;
            best_delta = delta;
        }
    }
    let rate = if best_adjusted > 0.0 {
        current_bpm / best_adjusted
    } else {
        1.0
    };
    (best_adjusted, best_delta, rate)
}

pub fn score_transition(current: &Track, next: &Track, context: &PlanContext) -> TransitionScore {
    let mut reasons = Vec::new();

    let (bpm_score, tempo_delta, tempo_confidence) = match (current.valid_bpm(), next.valid_bpm()) {
        (Some(current_bpm), Some(next_bpm)) => {
            let (_, delta, _) = best_tempo_match(current_bpm, next_bpm);
            let score = clamp01(1.0 - delta / 0.14);
            if delta <= context.tempo_shift_limit() {
                reasons.push("tempo_compatible".to_string());
            } else if delta > 0.12 {
                reasons.push("tempo_mismatch".to_string());
            }
            (
                score,
                delta,
                current.tempo_confidence().min(next.tempo_confidence()),
            )
        }
        _ => {
            reasons.push("missing_tempo".to_string());
            (0.48, 1.0, 0.0)
        }
    };

    let (key_score, key_confidence) = match (current.valid_key(), next.valid_key()) {
        (Some((current_tonic, current_mode)), Some((next_tonic, next_mode))) => {
            let score = harmonic_compatibility(current_tonic, current_mode, next_tonic, next_mode);
            if score >= 0.86 {
                reasons.push("harmonic_match".to_string());
            } else if score <= 0.36 {
                reasons.push("harmonic_tension".to_string());
            }
            (score, current.key_confidence().min(next.key_confidence()))
        }
        _ => {
            reasons.push("missing_key".to_string());
            (0.55, 0.0)
        }
    };

    let (energy_score, energy_confidence) = match (current.valid_energy(), next.valid_energy()) {
        (Some(from), Some(to)) => {
            let delta = (from - to).abs();
            if delta <= 0.14 {
                reasons.push("energy_smooth".to_string());
            } else if delta >= 0.42 {
                reasons.push("energy_jump".to_string());
            }
            (
                clamp01(1.0 - delta / 0.65),
                current.energy_confidence().min(next.energy_confidence()),
            )
        }
        _ => {
            reasons.push("missing_energy".to_string());
            (0.58, 0.0)
        }
    };

    let (structure_score, structure_confidence) = structure_compatibility(current, next);
    if structure_score >= 0.8 {
        reasons.push("mix_regions_available".to_string());
    } else if structure_confidence == 0.0 {
        reasons.push("missing_structure".to_string());
    }

    let (loudness_score, loudness_confidence) =
        match (current.valid_loudness(), next.valid_loudness()) {
            (Some(from), Some(to)) => {
                let delta = (from - to).abs();
                if delta <= 2.5 {
                    reasons.push("loudness_matched".to_string());
                } else if delta >= 8.0 {
                    reasons.push("loudness_jump".to_string());
                }
                (
                    clamp01(1.0 - delta / 14.0),
                    current
                        .loudness_confidence()
                        .min(next.loudness_confidence()),
                )
            }
            _ => (0.62, 0.0),
        };

    let current_vocal_density = outgoing_vocal_density(current);
    let next_vocal_density = incoming_vocal_density(next);
    let vocal_overlap = current_vocal_density * next_vocal_density;
    let vocal_confidence = current.vocal_confidence().min(next.vocal_confidence());
    let vocal_score = if vocal_confidence > 0.0 {
        let score = clamp01(1.0 - vocal_overlap * 1.2);
        if vocal_overlap >= 0.36 {
            reasons.push("vocal_overlap_risk".to_string());
        } else {
            reasons.push("vocal_safe".to_string());
        }
        score
    } else {
        0.64
    };

    let confidence_values = [
        tempo_confidence,
        key_confidence,
        energy_confidence,
        structure_confidence,
        loudness_confidence,
        vocal_confidence,
    ];
    let available_confidences: Vec<f64> = confidence_values
        .iter()
        .copied()
        .filter(|value| *value > 0.0)
        .collect();
    let confidence_score = if available_confidences.is_empty() {
        0.0
    } else {
        available_confidences.iter().sum::<f64>() / available_confidences.len() as f64
    };

    let weighted = bpm_score * BPM_WEIGHT
        + key_score * KEY_WEIGHT
        + energy_score * ENERGY_WEIGHT
        + structure_score * STRUCTURE_WEIGHT
        + loudness_score * LOUDNESS_WEIGHT
        + vocal_score * VOCAL_WEIGHT;

    let mut total = weighted * (0.78 + confidence_score * 0.22);
    if shares_artist(current, next) {
        total -= 0.08;
        reasons.push("same_artist_penalty".to_string());
    }
    if context.recently_played.iter().any(|id| id == &next.id) {
        total -= 0.24;
        reasons.push("recently_played_penalty".to_string());
    }

    let reliable =
        confidence_score >= 0.5 && tempo_confidence >= 0.35 && structure_confidence >= 0.3;
    if !reliable {
        reasons.push("low_confidence".to_string());
    }

    TransitionScore {
        total: clamp01(total),
        bpm_score,
        key_score,
        energy_score,
        structure_score,
        loudness_score,
        vocal_score,
        confidence_score,
        tempo_ratio_delta: tempo_delta,
        reliable,
        reason_codes: reasons,
    }
}

pub fn energy_target_adjustment(track: &Track, target: Option<f64>) -> f64 {
    match (
        track.valid_energy(),
        target.filter(|value| value.is_finite()),
    ) {
        (Some(energy), Some(target)) => {
            let distance = (energy - target.clamp(0.0, 1.0)).abs();
            (0.12 * (1.0 - distance / 0.7)).clamp(-0.08, 0.12)
        }
        _ => 0.0,
    }
}

fn harmonic_compatibility(
    current_tonic: u8,
    current_mode: &str,
    next_tonic: u8,
    next_mode: &str,
) -> f64 {
    let interval = (12 + next_tonic as i16 - current_tonic as i16) % 12;
    if interval == 0 && current_mode == next_mode {
        return 1.0;
    }

    let relative = (current_mode == "major" && next_mode == "minor" && interval == 9)
        || (current_mode == "minor" && next_mode == "major" && interval == 3);
    if relative {
        return 0.96;
    }

    if current_mode == next_mode && matches!(interval, 5 | 7) {
        return 0.9;
    }
    if current_mode != next_mode && interval == 0 {
        return 0.76;
    }
    if matches!(interval, 2 | 10) {
        return 0.62;
    }
    if matches!(interval, 1 | 11) {
        return 0.38;
    }
    0.28
}

fn structure_compatibility(current: &Track, next: &Track) -> (f64, f64) {
    let current_has_out = current
        .mix_regions
        .iter()
        .any(|region| region.direction.eq_ignore_ascii_case("out"))
        || current.outro_start.is_some();
    let next_has_in = next
        .mix_regions
        .iter()
        .any(|region| region.direction.eq_ignore_ascii_case("in"))
        || next.intro_end.is_some();

    let score = match (current_has_out, next_has_in) {
        (true, true) => 1.0,
        (true, false) | (false, true) => 0.72,
        (false, false) => 0.5,
    };
    let confidence = current
        .structure_confidence()
        .min(next.structure_confidence());
    (score, confidence)
}

fn shares_artist(current: &Track, next: &Track) -> bool {
    !current.artist_ids.is_empty()
        && current
            .artist_ids
            .iter()
            .any(|artist| next.artist_ids.iter().any(|candidate| candidate == artist))
}

fn outgoing_vocal_density(track: &Track) -> f64 {
    let Some(duration) = track.valid_duration() else {
        return 0.0;
    };
    let window_start = track
        .outro_start
        .filter(|value| value.is_finite())
        .unwrap_or((duration - 24.0).max(0.0));
    range_density(&track.vocal_regions, window_start, duration)
}

fn incoming_vocal_density(track: &Track) -> f64 {
    let Some(duration) = track.valid_duration() else {
        return 0.0;
    };
    let window_end = track
        .intro_end
        .filter(|value| value.is_finite() && *value > 0.0)
        .unwrap_or(duration.min(24.0));
    range_density(&track.vocal_regions, 0.0, window_end.max(1.0))
}

fn range_density(ranges: &[crate::model::TimeRange], start: f64, end: f64) -> f64 {
    let window = (end - start).max(0.001);
    let occupied = ranges
        .iter()
        .map(|range| (range.end.min(end) - range.start.max(start)).max(0.0))
        .sum::<f64>();
    clamp01(occupied / window)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{FeatureConfidence, MusicalKey};

    fn track(id: &str, bpm: f64, tonic: i16, mode: &str) -> Track {
        Track {
            id: id.to_string(),
            bpm: Some(bpm),
            key: Some(MusicalKey {
                tonic: Some(tonic),
                mode: Some(mode.to_string()),
            }),
            energy: Some(0.7),
            duration: 240.0,
            intro_end: Some(24.0),
            outro_start: Some(208.0),
            confidence: FeatureConfidence {
                tempo: Some(0.9),
                key: Some(0.9),
                energy: Some(0.8),
                structure: Some(0.8),
                ..FeatureConfidence::default()
            },
            ..Track::default()
        }
    }

    #[test]
    fn relative_key_scores_highly() {
        let c_major = track("a", 124.0, 0, "major");
        let a_minor = track("b", 126.0, 9, "minor");
        let score = score_transition(&c_major, &a_minor, &PlanContext::default());
        assert!(score.key_score > 0.9);
        assert!(score.total > 0.7);
    }

    #[test]
    fn half_time_tempo_is_supported() {
        let (_, delta, rate) = best_tempo_match(72.0, 144.0);
        assert!(delta < 0.001);
        assert!((rate - 1.0).abs() < 0.001);
    }
}
