use crate::model::{
    clamp01, AudioAnalysis, FeatureConfidence, MixRegion, MusicalKey, SectionSegment, TimedValue,
};

const ANALYSIS_VERSION: u32 = 5;

pub fn analyze_pcm(
    samples: &[f32],
    sample_rate: u32,
    channels: u8,
) -> Result<AudioAnalysis, String> {
    if !(8_000..=192_000).contains(&sample_rate) {
        return Err("sample_rate must be between 8000 and 192000".to_string());
    }
    if !(1..=8).contains(&channels) {
        return Err("channels must be between 1 and 8".to_string());
    }
    let channels_usize = channels as usize;
    if samples.len() < sample_rate as usize * channels_usize / 2 {
        return Err("at least 500ms of PCM is required".to_string());
    }

    let mono = downmix(samples, channels_usize);
    let duration = mono.len() as f64 / sample_rate as f64;
    let frame_size = if sample_rate >= 32_000 { 2048 } else { 1024 };
    let hop_size = frame_size / 4;
    let frame_duration = hop_size as f64 / sample_rate as f64;
    let frames = frame_rms(&mono, frame_size, hop_size);
    if frames.len() < 8 {
        return Err("audio is too short for analysis".to_string());
    }

    let frame_db: Vec<f64> = frames.iter().map(|value| amplitude_db(*value)).collect();
    let mut sorted_db = frame_db.clone();
    sorted_db.sort_by(f64::total_cmp);
    let noise_floor = percentile(&sorted_db, 0.2);
    let active_threshold = (noise_floor + 9.0).clamp(-55.0, -30.0);
    let first_active = first_sustained_active(&frame_db, active_threshold, 3).unwrap_or(0);
    let last_active = last_sustained_active(&frame_db, active_threshold, 3)
        .unwrap_or(frames.len().saturating_sub(1));
    let first_active_time = first_active as f64 * frame_duration;
    let last_active_time = ((last_active + 1) as f64 * frame_duration).min(duration);

    let mean_square = mono
        .iter()
        .map(|value| (*value as f64) * (*value as f64))
        .sum::<f64>()
        / mono.len().max(1) as f64;
    let loudness_lufs = (-0.691 + 10.0 * mean_square.max(1e-12).log10()).clamp(-80.0, 3.0);
    let peak = mono
        .iter()
        .map(|value| value.abs() as f64)
        .fold(0.0, f64::max);
    let peak_dbfs = amplitude_db(peak);

    let mut sorted_rms = frames.clone();
    sorted_rms.sort_by(f64::total_cmp);
    let low_rms = percentile(&sorted_rms, 0.1);
    let high_rms = percentile(&sorted_rms, 0.95).max(low_rms + 1e-6);
    let normalized_energy: Vec<f64> = frames
        .iter()
        .map(|value| clamp01((*value - low_rms) / (high_rms - low_rms)))
        .collect();
    let active_energy: Vec<f64> = normalized_energy
        .iter()
        .enumerate()
        .filter(|(index, _)| frame_db[*index] >= active_threshold)
        .map(|(_, value)| *value)
        .collect();
    let energy = if active_energy.is_empty() {
        None
    } else {
        Some(clamp01(
            active_energy.iter().sum::<f64>() / active_energy.len() as f64,
        ))
    };
    let energy_curve = compress_energy_curve(&normalized_energy, frame_duration, duration);

    let onset = onset_envelope(&frames);
    let tempo = estimate_tempo(&onset, frame_duration, duration);
    let (bpm, beat_positions, downbeat_positions, tempo_confidence, bar_confidence) = match tempo {
        Some(tempo) => (
            Some(tempo.bpm),
            tempo.beats,
            tempo.downbeats,
            tempo.confidence,
            tempo.bar_confidence,
        ),
        None => (None, Vec::new(), Vec::new(), 0.0, 0.0),
    };
    let key_estimate = estimate_key(&mono, sample_rate);
    let key = key_estimate.as_ref().map(|estimate| MusicalKey {
        tonic: Some(estimate.tonic as i16),
        mode: Some(estimate.mode.to_string()),
    });
    let key_confidence = key_estimate
        .as_ref()
        .map(|estimate| estimate.confidence)
        .unwrap_or(0.0);

    let structural_span = bpm
        .map(|value| (32.0 * 60.0 / value).clamp(10.0, 32.0))
        .unwrap_or(18.0);
    let intro_end = (first_active_time + structural_span)
        .min(duration * 0.35)
        .min(duration);
    let outro_start = (last_active_time - structural_span)
        .max(intro_end)
        .min(duration);
    let section_segments = build_sections(duration, intro_end, outro_start);
    let mix_regions = build_mix_regions(duration, first_active_time, intro_end, outro_start);

    let structure_confidence = if duration >= 45.0 {
        0.34 + bar_confidence * 0.18
    } else {
        0.24 + bar_confidence * 0.1
    };
    let beat_confidence = tempo_confidence * (0.76 + bar_confidence * 0.18);
    let overall = [
        tempo_confidence,
        beat_confidence,
        key_confidence,
        0.78,
        0.84,
        structure_confidence,
    ]
    .iter()
    .sum::<f64>()
        / 6.0;

    Ok(AudioAnalysis {
        duration,
        bpm,
        key,
        beat_positions,
        downbeat_positions,
        energy,
        energy_curve,
        loudness_lufs: Some(loudness_lufs),
        peak_dbfs: Some(peak_dbfs),
        intro_end: Some(intro_end),
        outro_start: Some(outro_start),
        section_segments,
        mix_regions,
        vocal_regions: Vec::new(),
        confidence: FeatureConfidence {
            tempo: Some(tempo_confidence),
            beat_grid: Some(beat_confidence),
            key: Some(key_confidence),
            energy: Some(0.78),
            loudness: Some(0.84),
            structure: Some(structure_confidence),
            vocal: Some(0.0),
            overall: Some(overall),
        },
        analysis_version: ANALYSIS_VERSION,
    })
}

struct TempoEstimate {
    bpm: f64,
    confidence: f64,
    beats: Vec<f64>,
    downbeats: Vec<f64>,
    bar_confidence: f64,
}

fn estimate_tempo(onset: &[f64], frame_duration: f64, duration: f64) -> Option<TempoEstimate> {
    if onset.len() < 32 || onset.iter().sum::<f64>() <= 1e-8 {
        return None;
    }

    // Keep the search inside the engine's normalized DJ range. Including lags
    // below 70 BPM makes sparse pop/electronic onsets strongly favor the exact
    // half-tempo autocorrelation peak (for example 120 BPM becoming 60 BPM).
    // Slow material is intentionally represented at double tempo so the beat
    // grid remains useful for phrase-aligned transitions.
    let min_bpm = 70.0;
    let max_bpm = 190.0;
    let min_lag = (60.0 / max_bpm / frame_duration).round().max(1.0) as usize;
    let max_lag = (60.0 / min_bpm / frame_duration)
        .round()
        .max(min_lag as f64) as usize;
    let max_lag = max_lag.min(onset.len().saturating_sub(2));
    if min_lag >= max_lag {
        return None;
    }

    let mut candidates = Vec::new();
    for lag in min_lag..=max_lag {
        let correlation = normalized_autocorrelation(onset, lag);
        let bpm = 60.0 / (lag as f64 * frame_duration);
        let preference = if (88.0..=155.0).contains(&bpm) {
            1.0
        } else {
            0.94
        };
        candidates.push((lag, bpm, correlation * preference));
    }
    candidates.sort_by(|a, b| b.2.total_cmp(&a.2));
    let mut selected = *candidates.first()?;
    if selected.1 < 88.0 {
        let doubled = selected.1 * 2.0;
        if let Some(candidate) = candidates
            .iter()
            .filter(|(_, bpm, _)| (bpm - doubled).abs() <= 4.0)
            .max_by(|left, right| left.2.total_cmp(&right.2))
        {
            if candidate.2 >= selected.2 * 0.7 {
                selected = *candidate;
            }
        }
    } else if selected.1 > 155.0 {
        let halved = selected.1 * 0.5;
        if let Some(candidate) = candidates
            .iter()
            .filter(|(_, bpm, _)| (bpm - halved).abs() <= 4.0)
            .max_by(|left, right| left.2.total_cmp(&right.2))
        {
            if candidate.2 >= selected.2 * 0.82 {
                selected = *candidate;
            }
        }
    }
    let (lag, _, best_correlation) = selected;
    if !best_correlation.is_finite() || best_correlation < 0.08 {
        return None;
    }
    let runner_up = candidates
        .iter()
        .skip(1)
        .find(|(other_lag, _, _)| other_lag.abs_diff(lag) > 2)
        .map(|(_, _, value)| *value)
        .unwrap_or(0.0);
    let separation = (best_correlation - runner_up).max(0.0);
    let confidence = clamp01((best_correlation - 0.07) / 0.42 * 0.75 + separation * 1.8);

    // Integer frame lags are much too coarse at the browser analysis rate
    // (11025 Hz / 256 hop: 120 BPM lies at 21.53 frames). Interpolate the
    // autocorrelation peak so the beat grid does not drift by seconds near the
    // end of a song.
    let left_correlation = lag
        .checked_sub(1)
        .map(|value| normalized_autocorrelation(onset, value))
        .unwrap_or(best_correlation);
    let center_correlation = normalized_autocorrelation(onset, lag);
    let right_correlation = normalized_autocorrelation(onset, lag + 1);
    let denominator = left_correlation - 2.0 * center_correlation + right_correlation;
    let lag_offset = if denominator.abs() > 1e-9 {
        (0.5 * (left_correlation - right_correlation) / denominator).clamp(-0.5, 0.5)
    } else {
        0.0
    };
    let interpolated_lag = (lag as f64 + lag_offset).max(1.0);
    let phase_steps = (interpolated_lag * 4.0).ceil().max(1.0) as usize;
    let initial_phase = (0..phase_steps)
        .map(|index| index as f64 / 4.0)
        .max_by(|left, right| {
            fractional_phase_score(onset, *left, interpolated_lag)
                .total_cmp(&fractional_phase_score(onset, *right, interpolated_lag))
        })
        .unwrap_or(0.0);
    let (phase, refined_lag) = refine_period_from_onsets(onset, initial_phase, interpolated_lag);
    let bpm = 60.0 / (refined_lag * frame_duration);
    let first_beat = phase * frame_duration;
    let beat_period = refined_lag * frame_duration;
    let mut beats = Vec::new();
    let mut cursor = first_beat;
    while cursor <= duration + 0.001 {
        beats.push(cursor);
        cursor += beat_period;
    }
    let bar_scores: Vec<f64> = (0..4)
        .map(|bar_phase| {
            (bar_phase..beats.len())
                .step_by(4)
                .map(|beat_index| {
                    let frame = (beats[beat_index] / frame_duration).round() as usize;
                    onset.get(frame).copied().unwrap_or(0.0)
                })
                .sum()
        })
        .collect();
    let bar_phase = bar_scores
        .iter()
        .enumerate()
        .max_by(|(_, left), (_, right)| left.total_cmp(right))
        .map(|(index, _)| index)
        .unwrap_or(0);
    let mut sorted_bar_scores = bar_scores.clone();
    sorted_bar_scores.sort_by(|left, right| right.total_cmp(left));
    let strongest = sorted_bar_scores.first().copied().unwrap_or(0.0);
    let runner_up_bar = sorted_bar_scores.get(1).copied().unwrap_or(0.0);
    let bar_confidence = if strongest <= 1e-9 {
        0.0
    } else {
        clamp01((strongest - runner_up_bar) / strongest * 2.2)
    };
    let downbeats = beats.iter().skip(bar_phase).step_by(4).copied().collect();

    Some(TempoEstimate {
        bpm,
        confidence,
        beats,
        downbeats,
        bar_confidence,
    })
}

fn normalized_autocorrelation(onset: &[f64], lag: usize) -> f64 {
    if lag == 0 || lag >= onset.len() {
        return 0.0;
    }
    let mut numerator = 0.0;
    let mut left_power = 0.0;
    let mut right_power = 0.0;
    for index in lag..onset.len() {
        let left = onset[index];
        let right = onset[index - lag];
        numerator += left * right;
        left_power += left * left;
        right_power += right * right;
    }
    numerator / (left_power * right_power).sqrt().max(1e-9)
}

fn sample_envelope(values: &[f64], position: f64) -> f64 {
    if values.is_empty() || !position.is_finite() || position < 0.0 {
        return 0.0;
    }
    let left = position.floor() as usize;
    if left >= values.len() {
        return 0.0;
    }
    let right = (left + 1).min(values.len() - 1);
    let fraction = position - left as f64;
    values[left] + (values[right] - values[left]) * fraction
}

fn fractional_phase_score(onset: &[f64], phase: f64, period: f64) -> f64 {
    if period <= 0.0 {
        return 0.0;
    }
    let mut score = 0.0;
    let mut cursor = phase;
    while cursor < onset.len() as f64 {
        score += sample_envelope(onset, cursor);
        cursor += period;
    }
    score
}

fn refine_period_from_onsets(onset: &[f64], phase: f64, period: f64) -> (f64, f64) {
    if onset.len() < 8 || period <= 1.0 {
        return (phase, period);
    }
    let mean = onset.iter().sum::<f64>() / onset.len() as f64;
    let radius = (period * 0.18).ceil().clamp(1.0, 8.0) as usize;
    let mut observations = Vec::new();
    let mut beat_index = 0_usize;
    let mut predicted = phase;

    while predicted < onset.len() as f64 {
        let center = predicted.round() as usize;
        let start = center.saturating_sub(radius);
        let end = (center + radius).min(onset.len() - 1);
        let peak = (start..=end)
            .max_by(|left, right| onset[*left].total_cmp(&onset[*right]))
            .unwrap_or(center.min(onset.len() - 1));
        if onset[peak] >= mean * 0.45 {
            observations.push((beat_index as f64, peak as f64));
            // Follow the observed onset rather than a grid extrapolated from
            // the beginning; this prevents small tempo errors accumulating.
            predicted = peak as f64 + period;
        } else {
            predicted += period;
        }
        beat_index += 1;
    }

    if observations.len() < 6 {
        return (phase, period);
    }
    let count = observations.len() as f64;
    let mean_index = observations.iter().map(|(index, _)| *index).sum::<f64>() / count;
    let mean_frame = observations.iter().map(|(_, frame)| *frame).sum::<f64>() / count;
    let covariance = observations
        .iter()
        .map(|(index, frame)| (*index - mean_index) * (*frame - mean_frame))
        .sum::<f64>();
    let variance = observations
        .iter()
        .map(|(index, _)| (*index - mean_index).powi(2))
        .sum::<f64>();
    if variance <= 1e-9 {
        return (phase, period);
    }
    let fitted_period = covariance / variance;
    if !fitted_period.is_finite() || (fitted_period / period - 1.0).abs() > 0.06 {
        return (phase, period);
    }
    let mut fitted_phase = mean_frame - fitted_period * mean_index;
    while fitted_phase < 0.0 {
        fitted_phase += fitted_period;
    }
    while fitted_phase >= fitted_period {
        fitted_phase -= fitted_period;
    }
    (fitted_phase, fitted_period)
}

struct KeyEstimate {
    tonic: u8,
    mode: &'static str,
    confidence: f64,
}

fn estimate_key(samples: &[f32], sample_rate: u32) -> Option<KeyEstimate> {
    const MAJOR_PROFILE: [f64; 12] = [
        6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
    ];
    const MINOR_PROFILE: [f64; 12] = [
        6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
    ];

    let frame_size = if sample_rate >= 32_000 { 8192 } else { 4096 };
    if samples.len() < frame_size {
        return None;
    }
    let available_span = samples.len().saturating_sub(frame_size).max(1);
    let hop = (sample_rate as usize).max(available_span / 180).max(1);
    let window: Vec<f64> = (0..frame_size)
        .map(|index| {
            0.5 - 0.5 * (std::f64::consts::TAU * index as f64 / (frame_size - 1) as f64).cos()
        })
        .collect();
    let mut chroma = [0.0_f64; 12];
    let mut accepted_frames = 0_u32;

    for start in (0..=samples.len() - frame_size).step_by(hop) {
        let frame = &samples[start..start + frame_size];
        let rms = (frame
            .iter()
            .map(|sample| (*sample as f64) * (*sample as f64))
            .sum::<f64>()
            / frame_size as f64)
            .sqrt();
        if rms < 0.004 {
            continue;
        }
        let sustained_ratio = frame
            .iter()
            .filter(|sample| sample.abs() as f64 >= rms * 0.35)
            .count() as f64
            / frame_size as f64;
        if sustained_ratio < 0.14 {
            continue;
        }

        let mut frame_chroma = [0.0_f64; 12];
        for midi in 36..=95 {
            let frequency = 440.0 * 2.0_f64.powf((midi as f64 - 69.0) / 12.0);
            if frequency >= sample_rate as f64 * 0.46 {
                continue;
            }
            let omega = std::f64::consts::TAU * frequency / sample_rate as f64;
            let coefficient = 2.0 * omega.cos();
            let mut previous = 0.0;
            let mut previous_two = 0.0;
            for (sample, weight) in frame.iter().zip(window.iter()) {
                let value = *sample as f64 * weight + coefficient * previous - previous_two;
                previous_two = previous;
                previous = value;
            }
            let power = (previous_two * previous_two + previous * previous
                - coefficient * previous * previous_two)
                .max(0.0)
                .sqrt();
            frame_chroma[(midi % 12) as usize] += power;
        }
        let total = frame_chroma.iter().sum::<f64>();
        if total <= 1e-8 {
            continue;
        }
        for (target, value) in chroma.iter_mut().zip(frame_chroma.iter()) {
            *target += *value / total;
        }
        accepted_frames += 1;
    }

    if accepted_frames < 4 {
        return None;
    }
    let chroma_total = chroma.iter().sum::<f64>().max(1e-9);
    for value in &mut chroma {
        *value /= chroma_total;
    }
    let active_pitch_classes = chroma.iter().filter(|value| **value >= 0.035).count();
    let chroma_entropy = -chroma
        .iter()
        .filter(|value| **value > 1e-12)
        .map(|value| value * value.ln())
        .sum::<f64>()
        / 12.0_f64.ln();
    if active_pitch_classes < 3 || chroma_entropy < 0.42 {
        return None;
    }

    let mut candidates = Vec::with_capacity(24);
    for tonic in 0..12_u8 {
        candidates.push((
            tonic,
            "major",
            key_profile_similarity(&chroma, &MAJOR_PROFILE, tonic as usize),
        ));
        candidates.push((
            tonic,
            "minor",
            key_profile_similarity(&chroma, &MINOR_PROFILE, tonic as usize),
        ));
    }
    candidates.sort_by(|left, right| right.2.total_cmp(&left.2));
    let best = candidates.first().copied()?;
    let runner_up = candidates
        .get(1)
        .map(|candidate| candidate.2)
        .unwrap_or(0.0);
    let separation = (best.2 - runner_up).max(0.0);
    let harmonic_richness = clamp01((chroma_entropy - 0.42) / 0.36);
    let confidence = clamp01(((best.2 - 0.58) * 1.7 + separation * 7.5) * harmonic_richness);
    (confidence >= 0.18).then_some(KeyEstimate {
        tonic: best.0,
        mode: best.1,
        confidence,
    })
}

fn key_profile_similarity(chroma: &[f64; 12], profile: &[f64; 12], tonic: usize) -> f64 {
    let profile_norm = profile
        .iter()
        .map(|value| value * value)
        .sum::<f64>()
        .sqrt();
    let chroma_norm = chroma.iter().map(|value| value * value).sum::<f64>().sqrt();
    let dot = chroma
        .iter()
        .enumerate()
        .map(|(pitch_class, value)| {
            let relative = (pitch_class + 12 - tonic) % 12;
            value * profile[relative]
        })
        .sum::<f64>();
    dot / (profile_norm * chroma_norm).max(1e-9)
}

fn onset_envelope(frames: &[f64]) -> Vec<f64> {
    let mut previous = frames.first().copied().unwrap_or(0.0);
    frames
        .iter()
        .map(|value| {
            let onset = (*value - previous).max(0.0);
            previous = *value;
            onset
        })
        .collect()
}

fn downmix(samples: &[f32], channels: usize) -> Vec<f32> {
    if channels == 1 {
        return samples.to_vec();
    }
    samples
        .chunks_exact(channels)
        .map(|frame| frame.iter().copied().sum::<f32>() / channels as f32)
        .collect()
}

fn frame_rms(samples: &[f32], frame_size: usize, hop_size: usize) -> Vec<f64> {
    if samples.len() < frame_size {
        let square = samples
            .iter()
            .map(|value| (*value as f64) * (*value as f64))
            .sum::<f64>();
        return vec![(square / samples.len().max(1) as f64).sqrt()];
    }
    (0..=samples.len() - frame_size)
        .step_by(hop_size)
        .map(|start| {
            let square = samples[start..start + frame_size]
                .iter()
                .map(|value| (*value as f64) * (*value as f64))
                .sum::<f64>();
            (square / frame_size as f64).sqrt()
        })
        .collect()
}

fn compress_energy_curve(values: &[f64], frame_duration: f64, duration: f64) -> Vec<TimedValue> {
    let frames_per_bucket = (1.0 / frame_duration).round().max(1.0) as usize;
    values
        .chunks(frames_per_bucket)
        .enumerate()
        .map(|(index, chunk)| TimedValue {
            time: (index as f64).min(duration),
            value: clamp01(chunk.iter().sum::<f64>() / chunk.len().max(1) as f64),
        })
        .collect()
}

fn build_sections(duration: f64, intro_end: f64, outro_start: f64) -> Vec<SectionSegment> {
    let mut sections = Vec::new();
    if intro_end > 0.1 {
        sections.push(SectionSegment {
            start: 0.0,
            end: intro_end,
            label: "intro".to_string(),
            confidence: Some(0.42),
        });
    }
    if outro_start - intro_end > 0.1 {
        sections.push(SectionSegment {
            start: intro_end,
            end: outro_start,
            label: "body".to_string(),
            confidence: Some(0.3),
        });
    }
    if duration - outro_start > 0.1 {
        sections.push(SectionSegment {
            start: outro_start,
            end: duration,
            label: "outro".to_string(),
            confidence: Some(0.42),
        });
    }
    sections
}

fn build_mix_regions(
    duration: f64,
    first_active: f64,
    intro_end: f64,
    outro_start: f64,
) -> Vec<MixRegion> {
    let mut regions = Vec::new();
    if intro_end - first_active >= 2.0 {
        regions.push(MixRegion {
            start: first_active,
            end: intro_end,
            direction: "in".to_string(),
            confidence: Some(0.42),
        });
    }
    if duration - outro_start >= 2.0 {
        regions.push(MixRegion {
            start: outro_start,
            end: duration,
            direction: "out".to_string(),
            confidence: Some(0.42),
        });
    }
    regions
}

fn first_sustained_active(values: &[f64], threshold: f64, run: usize) -> Option<usize> {
    values
        .windows(run)
        .position(|window| window.iter().all(|value| *value >= threshold))
}

fn last_sustained_active(values: &[f64], threshold: f64, run: usize) -> Option<usize> {
    values
        .windows(run)
        .rposition(|window| window.iter().all(|value| *value >= threshold))
        .map(|index| index + run - 1)
}

fn percentile(sorted: &[f64], percentile: f64) -> f64 {
    if sorted.is_empty() {
        return 0.0;
    }
    let index = ((sorted.len() - 1) as f64 * percentile.clamp(0.0, 1.0)).round() as usize;
    sorted[index]
}

fn amplitude_db(value: f64) -> f64 {
    (20.0 * value.max(1e-12).log10()).clamp(-120.0, 6.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f64::consts::PI;

    #[test]
    fn analyzes_click_track_without_inventing_key() {
        let sample_rate = 8_000;
        let duration = 12.0;
        let mut samples = vec![0.0_f32; (sample_rate as f64 * duration) as usize];
        let beat_period = 0.5;
        let click_length = 120;
        let mut beat = 0.0;
        while beat < duration {
            let start = (beat * sample_rate as f64) as usize;
            for index in 0..click_length {
                if start + index < samples.len() {
                    let envelope = 1.0 - index as f64 / click_length as f64;
                    samples[start + index] =
                        ((2.0 * PI * 440.0 * index as f64 / sample_rate as f64).sin() * envelope)
                            as f32;
                }
            }
            beat += beat_period;
        }

        let analysis = analyze_pcm(&samples, sample_rate, 1).expect("analysis");
        assert!(analysis.bpm.is_some_and(|bpm| (bpm - 120.0).abs() <= 8.0));
        assert!(!analysis.beat_positions.is_empty());
        assert!(analysis.loudness_lufs.is_some());
        assert_eq!(analysis.confidence.key, Some(0.0));
    }

    #[test]
    fn normalizes_half_tempo_at_browser_analysis_rate() {
        let sample_rate = 11_025;
        let duration = 12.0;
        let mut samples = vec![0.0_f32; (sample_rate as f64 * duration) as usize];
        let click_length = 165;
        let mut beat = 0.0;
        while beat < duration {
            let start = (beat * sample_rate as f64) as usize;
            for index in 0..click_length {
                if start + index < samples.len() {
                    let envelope = 1.0 - index as f64 / click_length as f64;
                    samples[start + index] =
                        ((2.0 * PI * 440.0 * index as f64 / sample_rate as f64).sin() * envelope)
                            as f32;
                }
            }
            beat += 0.5;
        }

        let analysis = analyze_pcm(&samples, sample_rate, 1).expect("analysis");
        assert!(
            analysis.bpm.is_some_and(|bpm| (bpm - 120.0).abs() <= 0.35),
            "bpm={:?}",
            analysis.bpm
        );
        assert!(analysis.beat_positions.len() >= 20);
        let last_beat = analysis.beat_positions.last().copied().unwrap_or(0.0);
        let nearest_click = (last_beat / 0.5).round() * 0.5;
        assert!(
            (last_beat - nearest_click).abs() <= 0.08,
            "bpm={:?}, last_beat={last_beat}, nearest_click={nearest_click}",
            analysis.bpm
        );
    }

    #[test]
    fn long_browser_grid_does_not_accumulate_integer_lag_drift() {
        let frame_duration: f64 = 256.0 / 11_025.0;
        let duration: f64 = 180.0;
        let mut onset = vec![0.0; (duration / frame_duration).ceil() as usize + 2];
        let mut beat: f64 = 0.0;
        let mut beat_index = 0_usize;
        while beat <= duration {
            let frame = (beat / frame_duration).round() as usize;
            if frame < onset.len() {
                onset[frame] = if beat_index.is_multiple_of(4) {
                    1.0
                } else {
                    0.72
                };
            }
            beat += 0.5;
            beat_index += 1;
        }

        let estimate = estimate_tempo(&onset, frame_duration, duration).expect("tempo");
        assert!((estimate.bpm - 120.0).abs() <= 0.2, "bpm={}", estimate.bpm);
        let last_beat = estimate.beats.last().copied().unwrap_or(0.0);
        let nearest_click = (last_beat / 0.5).round() * 0.5;
        assert!(
            (last_beat - nearest_click).abs() <= 0.06,
            "last_beat={last_beat}, nearest_click={nearest_click}"
        );
    }

    #[test]
    fn detects_harmonically_rich_minor_key() {
        let sample_rate = 8_000;
        let duration = 10.0;
        let notes = [
            (220.00, 0.30),
            (246.94, 0.10),
            (261.63, 0.24),
            (293.66, 0.12),
            (329.63, 0.22),
            (349.23, 0.13),
            (392.00, 0.20),
        ];
        let samples: Vec<f32> = (0..(sample_rate as f64 * duration) as usize)
            .map(|index| {
                let time = index as f64 / sample_rate as f64;
                let slow_envelope = 0.72 + 0.28 * (2.0 * PI * 2.0 * time).sin().abs();
                (notes
                    .iter()
                    .map(|(frequency, weight)| weight * (2.0 * PI * frequency * time).sin())
                    .sum::<f64>()
                    * slow_envelope) as f32
            })
            .collect();

        let analysis = analyze_pcm(&samples, sample_rate, 1).expect("analysis");
        let key = analysis.key.expect("key");
        assert_eq!(key.tonic, Some(9));
        assert_eq!(key.mode.as_deref(), Some("minor"));
        assert!(analysis.confidence.key.unwrap_or_default() >= 0.18);
    }
}
