use std::f64::consts::FRAC_PI_2;

use crate::model::{
    clamp01, AutomationPoint, EqAutomationPoint, FilterAutomationPoint, PlanContext, Track,
    TransitionPlan, TransitionScore,
};
use crate::scoring::best_tempo_match;

pub fn plan_transition(
    current: &Track,
    next: &Track,
    score: &TransitionScore,
    context: &PlanContext,
) -> TransitionPlan {
    let duration = current.valid_duration().unwrap_or(180.0);
    let vocal_risk = score
        .reason_codes
        .iter()
        .any(|reason| reason == "vocal_overlap_risk");
    let gapless_hint = has_gapless_hint(current, next);
    let beat_confidence = current.beat_confidence().min(next.beat_confidence());
    let structure_confidence = current
        .structure_confidence()
        .min(next.structure_confidence());

    let tempo = match (current.valid_bpm(), next.valid_bpm()) {
        (Some(from), Some(to)) => Some((from, to, best_tempo_match(from, to))),
        _ => None,
    };
    let tempo_compatible = tempo
        .as_ref()
        .is_some_and(|(_, _, (_, delta, _))| *delta <= context.tempo_shift_limit());
    let harmonic_tension = score
        .reason_codes
        .iter()
        .any(|reason| reason == "harmonic_tension");
    let reject_complex_mix = !score.reliable || score.total < 0.48 || score.confidence_score < 0.50;
    let energy_lift = is_energy_lift(current, next);
    let loop_candidate = energy_lift.then(|| loop_bridge_points(current, next));
    let vocal_analysis_known = current.vocal_confidence() > 0.0 && next.vocal_confidence() > 0.0;
    let loop_min_beat_confidence = if vocal_analysis_known { 0.68 } else { 0.74 };
    let loop_min_confidence = if vocal_analysis_known { 0.58 } else { 0.64 };
    let natural_loop_fit = loop_candidate.as_ref().is_some_and(|points| {
        score.reliable
            && score.total >= 0.62
            && score.confidence_score >= loop_min_confidence
            && beat_confidence >= loop_min_beat_confidence
            && structure_confidence >= 0.40
            && score.tempo_ratio_delta <= 0.045
            && points.bar_aligned
            && stable_loop_window(current, points.loop_start, points.loop_end)
            && advanced_vocal_clear(current, next)
            && !harmonic_tension
            && !vocal_risk
    });

    let kind = if gapless_hint {
        "gapless"
    } else if reject_complex_mix {
        "safe_fade"
    } else if natural_loop_fit && tempo_compatible {
        "loop_bridge"
    } else if score.confidence_score >= context.beatmix_threshold()
        && score.reliable
        && score.total >= 0.60
        && beat_confidence >= 0.62
        && structure_confidence >= 0.40
        && tempo_compatible
        && !harmonic_tension
        && !vocal_risk
    {
        "beat_mix"
    } else if beat_confidence >= 0.55
        && score.reliable
        && score.total >= 0.48
        && score.confidence_score >= 0.50
        && structure_confidence >= 0.38
        && score.tempo_ratio_delta <= 0.08
        && !vocal_risk
    {
        "phrase_crossfade"
    } else if vocal_risk && context.avoid_vocals() {
        "vocal_safe_fade"
    } else {
        "safe_fade"
    };

    let loop_bridge =
        (kind == "loop_bridge").then(|| loop_candidate.expect("natural loop candidate"));
    let (mix_out_start, mix_in_start, crossfade_duration, bars, beat_aligned, bar_aligned) =
        match kind {
            "gapless" => ((duration - 0.08).max(0.0), 0.0, 0.08, 0, false, false),
            "beat_mix" => beat_transition_points(current, next, context, true),
            "loop_bridge" => {
                let points = loop_bridge.as_ref().expect("loop bridge points");
                (
                    // Let the selected bar play once so the Web Audio delay line
                    // can capture it, then start the blend on its closing downbeat.
                    points.loop_end,
                    points.mix_in_start,
                    points.duration,
                    points.repetitions,
                    true,
                    points.bar_aligned,
                )
            }
            "echo_filter_out" => echo_filter_points(current, next),
            "phrase_crossfade" => beat_transition_points(current, next, context, false),
            "vocal_safe_fade" => vocal_safe_points(current, next),
            "quick_cut" => quick_cut_points(current, next),
            _ => safe_fade_points(current, next),
        };

    let incoming_rate = if matches!(kind, "beat_mix" | "loop_bridge" | "phrase_crossfade") {
        tempo
            .as_ref()
            .map(|(_, _, (_, delta, rate))| {
                if *delta <= context.tempo_shift_limit() {
                    rate.clamp(0.92, 1.08)
                } else {
                    1.0
                }
            })
            .unwrap_or(1.0)
    } else {
        1.0
    };
    let tempo_adjust_required = (incoming_rate - 1.0).abs() >= 0.002;
    let loudness_gain_db = match (current.valid_loudness(), next.valid_loudness()) {
        (Some(from), Some(to)) => (from - to).clamp(-6.0, 6.0),
        _ => 0.0,
    };

    let strategy_factor = match kind {
        "beat_mix" => 1.0,
        "loop_bridge" => 0.94,
        "echo_filter_out" => 0.88,
        "phrase_crossfade" => 0.9,
        "vocal_safe_fade" => 0.82,
        "quick_cut" => 0.76,
        "gapless" => 0.9,
        _ => 0.68,
    };
    let alignment_confidence = if beat_aligned {
        clamp01((beat_confidence + structure_confidence) * 0.5)
    } else if kind == "safe_fade" {
        0.35
    } else {
        clamp01(structure_confidence * 0.8)
    };

    let mut reason_codes = score.reason_codes.clone();
    reason_codes.push(format!("strategy_{kind}"));
    if tempo_adjust_required {
        reason_codes.push("tempo_adjusted".to_string());
    }
    if loudness_gain_db.abs() >= 0.5 {
        reason_codes.push("loudness_compensated".to_string());
    }
    if reject_complex_mix {
        reason_codes.push("complex_mix_rejected".to_string());
    }
    if energy_lift && kind != "loop_bridge" {
        reason_codes.push("loop_rejected_naturalness_gate".to_string());
    }
    if kind == "safe_fade" {
        reason_codes.push("natural_fallback".to_string());
    }

    let (loop_start, loop_end, loop_repetitions) = loop_bridge
        .as_ref()
        .map(|points| {
            (
                Some(points.loop_start),
                Some(points.loop_end),
                points.repetitions,
            )
        })
        .unwrap_or((None, None, 0));

    TransitionPlan {
        kind: kind.to_string(),
        mix_out_start,
        mix_in_start,
        crossfade_duration,
        beat_aligned,
        bar_aligned,
        bars,
        mix_in_section_label: section_label_at(next, mix_in_start),
        alignment_confidence,
        tempo_adjust_required,
        outgoing_rate: 1.0,
        incoming_rate,
        loudness_gain_db,
        confidence: clamp01(score.confidence_score * strategy_factor),
        outgoing_gain: gain_curve(false, kind),
        incoming_gain: gain_curve(true, kind),
        outgoing_eq: eq_curve(false, kind),
        incoming_eq: eq_curve(true, kind),
        outgoing_filter: filter_curve(false, kind),
        incoming_filter: filter_curve(true, kind),
        outgoing_dry: dry_curve(kind),
        outgoing_echo_wet: echo_wet_curve(kind),
        outgoing_echo_feedback: echo_feedback_curve(kind),
        echo_delay_sec: echo_delay_seconds(current, kind),
        loop_start,
        loop_end,
        loop_repetitions,
        reason_codes,
    }
}

struct LoopBridgePoints {
    loop_start: f64,
    loop_end: f64,
    mix_in_start: f64,
    duration: f64,
    repetitions: u32,
    bar_aligned: bool,
}

fn loop_bridge_points(current: &Track, next: &Track) -> LoopBridgePoints {
    let duration = current.valid_duration().unwrap_or(180.0);
    let bpm = current.valid_bpm().unwrap_or(120.0);
    let expected_bar = (4.0 * 60.0 / bpm).clamp(1.0, 6.0);
    let downbeats = current.normalized_downbeats();
    let beats = current.normalized_beats();
    let grid = if !downbeats.is_empty() {
        &downbeats
    } else {
        &beats
    };
    let desired_end = preferred_out_end(current);
    let intended_transition = expected_bar * 2.0;
    let desired_loop_end = (desired_end - intended_transition)
        .clamp(expected_bar, (duration - expected_bar).max(expected_bar));
    let loop_end = nearest_at_or_before(grid, desired_loop_end)
        .unwrap_or(desired_loop_end)
        .min(duration);
    let desired_loop_start = (loop_end - expected_bar).max(0.0);
    let loop_start = nearest_at_or_before(grid, desired_loop_start + expected_bar * 0.12)
        .filter(|value| *value < loop_end - expected_bar * 0.65)
        .unwrap_or(desired_loop_start);
    let loop_length = (loop_end - loop_start).clamp(0.8, 6.5);
    let transition_duration = (desired_end - loop_end)
        .max(0.4)
        .min((duration - loop_end).max(0.4));
    // Two bars is the unobtrusive default. Only a genuinely long, clean
    // window may become a four-bar bridge; a three-bar phrase sounds arbitrary.
    let repetitions = if transition_duration >= loop_length * 3.5 {
        4
    } else {
        2
    };
    let incoming_grid = next.normalized_downbeats();
    let mix_in_start = nearest_at_or_after(&incoming_grid, preferred_in_start(next))
        .unwrap_or_else(|| preferred_in_start(next));

    LoopBridgePoints {
        loop_start,
        loop_end: loop_start + loop_length,
        mix_in_start,
        duration: transition_duration,
        repetitions,
        bar_aligned: !downbeats.is_empty() && !incoming_grid.is_empty(),
    }
}

fn echo_filter_points(current: &Track, next: &Track) -> (f64, f64, f64, u32, bool, bool) {
    let duration = current.valid_duration().unwrap_or(180.0);
    let bpm = current.valid_bpm().unwrap_or(120.0);
    let fade = (4.0 * 60.0 / bpm).clamp(2.4, 6.0).min(duration.max(0.4));
    let current_downbeats = current.normalized_downbeats();
    let desired_end = preferred_out_end(current);
    let desired = (desired_end - fade).max(0.0);
    let out = nearest_at_or_before(&current_downbeats, desired).unwrap_or(desired);
    let actual_fade = (desired_end - out).clamp(0.4, 8.0);
    let incoming_downbeats = next.normalized_downbeats();
    let incoming = nearest_at_or_after(&incoming_downbeats, preferred_in_start(next))
        .unwrap_or_else(|| preferred_in_start(next));
    let beat_aligned =
        !current.normalized_beats().is_empty() && !next.normalized_beats().is_empty();
    let bar_aligned = !current_downbeats.is_empty() && !incoming_downbeats.is_empty();
    (out, incoming, actual_fade, 1, beat_aligned, bar_aligned)
}

fn beat_transition_points(
    current: &Track,
    next: &Track,
    context: &PlanContext,
    prefer_long: bool,
) -> (f64, f64, f64, u32, bool, bool) {
    let current_duration = current.valid_duration().unwrap_or(180.0);
    let current_bpm = current.valid_bpm().unwrap_or(120.0);
    let desired_end = preferred_out_end(current);
    let desired_in = preferred_in_start(next);
    let current_beats = current.normalized_beats();
    let current_downbeats = current.normalized_downbeats();
    let next_beats = next.normalized_beats();
    let next_downbeats = next.normalized_downbeats();

    let bar_choices = if prefer_long {
        context.bars()
    } else {
        vec![2, 4]
    };
    let bars = bar_choices
        .into_iter()
        .filter(|bars| prefer_long || *bars <= 8)
        .find(|bars| {
            let seconds = *bars as f64 * 4.0 * 60.0 / current_bpm;
            seconds <= desired_end + 0.25
        })
        .unwrap_or(if prefer_long { 8 } else { 2 });
    let planned_duration = (bars as f64 * 4.0 * 60.0 / current_bpm)
        .clamp(if prefer_long { 6.0 } else { 3.0 }, 36.0)
        .min(current_duration.max(0.4));
    let desired_out = (desired_end - planned_duration).max(0.0);

    let out_grid = if !current_downbeats.is_empty() {
        &current_downbeats
    } else {
        &current_beats
    };
    let in_grid = if !next_downbeats.is_empty() {
        &next_downbeats
    } else {
        &next_beats
    };

    let latest_start = (current_duration - planned_duration).max(0.0);
    let mix_out = nearest_at_or_before(out_grid, desired_out.min(latest_start))
        .unwrap_or(desired_out.min(latest_start));
    let crossfade_duration = (desired_end - mix_out)
        .clamp(
            if prefer_long { 6.0 } else { 2.8 },
            if prefer_long { 36.0 } else { 12.0 },
        )
        .min((current_duration - mix_out).max(0.4));
    let mix_in = nearest_at_or_after(in_grid, desired_in).unwrap_or(desired_in);
    let beat_aligned = !current_beats.is_empty() && !next_beats.is_empty();
    let bar_aligned = !current_downbeats.is_empty() && !next_downbeats.is_empty();

    (
        mix_out.max(0.0),
        mix_in.max(0.0),
        crossfade_duration,
        bars,
        beat_aligned,
        bar_aligned,
    )
}

fn vocal_safe_points(current: &Track, next: &Track) -> (f64, f64, f64, u32, bool, bool) {
    let duration = current.valid_duration().unwrap_or(180.0);
    let desired_end = preferred_out_end(current);
    let desired = (desired_end - 4.2).max(0.0);
    let out = find_non_vocal_start(current, desired, desired_end)
        .unwrap_or(desired)
        .max((desired_end - 6.5).max(0.0))
        .min((desired_end - 0.4).max(0.0));
    let incoming = find_non_vocal_start(next, preferred_in_start(next), 32.0).unwrap_or(0.0);
    let fade = (desired_end - out).clamp(0.4, 6.5).min(duration.max(0.4));
    (out, incoming, fade, 0, false, false)
}

fn quick_cut_points(current: &Track, next: &Track) -> (f64, f64, f64, u32, bool, bool) {
    let beats = current.normalized_downbeats();
    let desired_end = preferred_out_end(current);
    let desired = (desired_end - 1.8).max(0.0);
    let out = nearest_at_or_before(&beats, desired).unwrap_or(desired);
    let incoming_beats = next.normalized_downbeats();
    let incoming = nearest_at_or_after(&incoming_beats, preferred_in_start(next)).unwrap_or(0.0);
    (
        out,
        incoming,
        (desired_end - out).clamp(0.4, 3.2),
        0,
        !beats.is_empty(),
        !beats.is_empty(),
    )
}

fn safe_fade_points(current: &Track, next: &Track) -> (f64, f64, f64, u32, bool, bool) {
    let duration = current.valid_duration().unwrap_or(180.0);
    let desired_end = preferred_out_end(current);
    let fade = (duration * 0.018).clamp(2.8, 4.2).min(desired_end.max(0.4));
    let out = (desired_end - fade).max(0.0);
    let incoming = preferred_in_start(next).clamp(0.0, 3.0);
    (out, incoming, fade, 0, false, false)
}

fn preferred_out_end(track: &Track) -> f64 {
    let duration = track.valid_duration().unwrap_or(180.0);
    track
        .mix_regions
        .iter()
        .filter(|region| {
            region.direction.eq_ignore_ascii_case("out")
                && region.start.is_finite()
                && region.end.is_finite()
                && region.end > region.start
        })
        .max_by(|a, b| {
            a.confidence
                .unwrap_or(0.5)
                .total_cmp(&b.confidence.unwrap_or(0.5))
        })
        .map(|region| region.end.clamp(0.0, duration))
        .unwrap_or(duration)
}

fn preferred_in_start(track: &Track) -> f64 {
    let duration = track.valid_duration().unwrap_or(180.0);
    track
        .mix_regions
        .iter()
        .filter(|region| {
            region.direction.eq_ignore_ascii_case("in")
                && region.start.is_finite()
                && region.end.is_finite()
                && region.end > region.start
        })
        .max_by(|a, b| {
            a.confidence
                .unwrap_or(0.5)
                .total_cmp(&b.confidence.unwrap_or(0.5))
        })
        .map(|region| region.start.clamp(0.0, duration))
        .unwrap_or(0.0)
}

fn find_non_vocal_start(track: &Track, from: f64, until: f64) -> Option<f64> {
    let mut cursor = from.max(0.0);
    let upper = until.max(cursor);
    let mut ranges = track.vocal_regions.clone();
    ranges.sort_by(|a, b| a.start.total_cmp(&b.start));
    for range in ranges {
        if range.end <= cursor || range.start >= upper {
            continue;
        }
        if range.start - cursor >= 1.5 {
            return Some(cursor);
        }
        cursor = cursor.max(range.end);
        if cursor >= upper {
            return None;
        }
    }
    (upper - cursor >= 1.0).then_some(cursor)
}

fn section_label_at(track: &Track, time: f64) -> Option<String> {
    track
        .section_segments
        .iter()
        .find(|section| time >= section.start && time < section.end)
        .map(|section| section.label.clone())
        .filter(|label| !label.is_empty())
}

fn has_gapless_hint(current: &Track, next: &Track) -> bool {
    let tagged = current
        .tags
        .iter()
        .chain(next.tags.iter())
        .any(|tag| matches!(tag.to_ascii_lowercase().as_str(), "gapless" | "continuous"));
    let same_album = current.album_id.is_some()
        && current.album_id == next.album_id
        && current
            .tags
            .iter()
            .any(|tag| tag.eq_ignore_ascii_case("live"));
    tagged || same_album
}

fn is_energy_lift(current: &Track, next: &Track) -> bool {
    let normalized_lift = matches!(
        (current.valid_energy(), next.valid_energy()),
        (Some(from), Some(to)) if to - from >= 0.3
    );
    let measured_loudness_lift = matches!(
        (current.valid_loudness(), next.valid_loudness()),
        (Some(from), Some(to)) if to - from >= 1.5
    );
    normalized_lift
        && measured_loudness_lift
        && current.energy_confidence().min(next.energy_confidence()) >= 0.70
        && current
            .loudness_confidence()
            .min(next.loudness_confidence())
            >= 0.65
}

fn stable_loop_window(track: &Track, start: f64, end: f64) -> bool {
    if end <= start || track.energy_curve.len() < 3 {
        return false;
    }

    let values: Vec<f64> = (0..=8)
        .filter_map(|index| {
            let progress = index as f64 / 8.0;
            energy_at(track, start + (end - start) * progress)
        })
        .collect();
    if values.len() < 4 {
        return true;
    }
    let minimum = values.iter().copied().fold(f64::INFINITY, f64::min);
    let maximum = values.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let mean = values.iter().sum::<f64>() / values.len() as f64;
    mean >= 0.06 && maximum - minimum <= 0.40
}

fn energy_at(track: &Track, time: f64) -> Option<f64> {
    let mut points: Vec<&crate::model::TimedValue> = track
        .energy_curve
        .iter()
        .filter(|point| point.time.is_finite() && point.value.is_finite())
        .collect();
    points.sort_by(|left, right| left.time.total_cmp(&right.time));
    let first = *points.first()?;
    if time <= first.time {
        return Some(clamp01(first.value));
    }
    for pair in points.windows(2) {
        let left = pair[0];
        let right = pair[1];
        if time > right.time {
            continue;
        }
        let span = (right.time - left.time).max(0.001);
        let progress = ((time - left.time) / span).clamp(0.0, 1.0);
        return Some(clamp01(left.value + (right.value - left.value) * progress));
    }
    points.last().map(|point| clamp01(point.value))
}

fn advanced_vocal_clear(current: &Track, next: &Track) -> bool {
    if current.vocal_confidence() <= 0.0 || next.vocal_confidence() <= 0.0 {
        return true;
    }
    let current_duration = current.valid_duration().unwrap_or(180.0);
    let next_duration = next.valid_duration().unwrap_or(180.0);
    let outgoing_start = current
        .outro_start
        .unwrap_or((current_duration - 24.0).max(0.0));
    let incoming_end = next.intro_end.unwrap_or(next_duration.min(24.0));
    range_density(&current.vocal_regions, outgoing_start, current_duration) <= 0.45
        && range_density(&next.vocal_regions, 0.0, incoming_end.max(1.0)) <= 0.45
}

fn range_density(ranges: &[crate::model::TimeRange], start: f64, end: f64) -> f64 {
    let window = (end - start).max(0.001);
    let occupied = ranges
        .iter()
        .map(|range| (range.end.min(end) - range.start.max(start)).max(0.0))
        .sum::<f64>();
    clamp01(occupied / window)
}

fn nearest_at_or_before(values: &[f64], target: f64) -> Option<f64> {
    values
        .iter()
        .copied()
        .filter(|value| *value <= target + 0.001)
        .max_by(f64::total_cmp)
}

fn nearest_at_or_after(values: &[f64], target: f64) -> Option<f64> {
    values
        .iter()
        .copied()
        .filter(|value| *value + 0.001 >= target)
        .min_by(f64::total_cmp)
}

fn equal_power_curve(incoming: bool) -> Vec<AutomationPoint> {
    (0..=8)
        .map(|index| {
            let offset = index as f64 / 8.0;
            let value = if incoming {
                (offset * FRAC_PI_2).sin()
            } else {
                (offset * FRAC_PI_2).cos()
            };
            AutomationPoint { offset, value }
        })
        .collect()
}

fn automation_curve(points: &[(f64, f64)]) -> Vec<AutomationPoint> {
    points
        .iter()
        .map(|(offset, value)| AutomationPoint {
            offset: *offset,
            value: *value,
        })
        .collect()
}

fn gain_curve(incoming: bool, kind: &str) -> Vec<AutomationPoint> {
    match (kind, incoming) {
        ("loop_bridge", false) => automation_curve(&[
            (0.0, 1.0),
            (0.35, 0.98),
            (0.55, 0.82),
            (0.75, 0.45),
            (1.0, 0.0),
        ]),
        ("loop_bridge", true) => automation_curve(&[
            (0.0, 0.0),
            (0.18, 0.08),
            (0.42, 0.45),
            (0.68, 0.88),
            (1.0, 1.0),
        ]),
        ("echo_filter_out", false) => automation_curve(&[
            (0.0, 1.0),
            (0.48, 0.98),
            (0.68, 0.86),
            (0.84, 0.46),
            (1.0, 0.0),
        ]),
        ("echo_filter_out", true) => automation_curve(&[
            (0.0, 0.0),
            (0.22, 0.05),
            (0.5, 0.4),
            (0.76, 0.86),
            (1.0, 1.0),
        ]),
        _ => equal_power_curve(incoming),
    }
}

fn eq_point(offset: f64, low: f64, mid: f64, high: f64) -> EqAutomationPoint {
    EqAutomationPoint {
        offset,
        low,
        mid,
        high,
    }
}

fn eq_curve(incoming: bool, kind: &str) -> Vec<EqAutomationPoint> {
    match (kind, incoming) {
        ("beat_mix", true) => vec![
            eq_point(0.0, -18.0, -3.0, -1.0),
            eq_point(0.46, -18.0, -1.5, 0.0),
            eq_point(0.58, -7.0, 0.0, 0.0),
            eq_point(0.68, 0.0, 0.0, 0.0),
        ],
        ("beat_mix", false) => vec![
            eq_point(0.0, 0.0, 0.0, 0.0),
            eq_point(0.5, 0.0, 0.0, 0.0),
            eq_point(0.62, -16.0, -2.0, -1.0),
            eq_point(1.0, -24.0, -8.0, -5.0),
        ],
        ("loop_bridge", true) => vec![
            eq_point(0.0, -20.0, -4.0, -2.0),
            eq_point(0.48, -18.0, -2.0, 0.0),
            eq_point(0.62, -6.0, 0.0, 0.0),
            eq_point(0.72, 0.0, 0.0, 0.0),
        ],
        ("loop_bridge", false) => vec![
            eq_point(0.0, 0.0, 0.0, 0.0),
            eq_point(0.3, 0.0, 0.0, 0.0),
            eq_point(0.48, -17.0, -2.5, -1.0),
            eq_point(1.0, -24.0, -7.0, -4.0),
        ],
        ("phrase_crossfade", true) => vec![
            eq_point(0.0, -9.0, -1.5, -1.0),
            eq_point(0.52, 0.0, 0.0, 0.0),
            eq_point(1.0, 0.0, 0.0, 0.0),
        ],
        ("phrase_crossfade", false) => vec![
            eq_point(0.0, 0.0, 0.0, 0.0),
            eq_point(0.5, 0.0, 0.0, 0.0),
            eq_point(1.0, -10.0, -2.0, -1.0),
        ],
        ("echo_filter_out", true) => vec![
            eq_point(0.0, -11.0, -2.0, -1.0),
            eq_point(0.55, 0.0, 0.0, 0.0),
            eq_point(1.0, 0.0, 0.0, 0.0),
        ],
        ("echo_filter_out", false) => vec![
            eq_point(0.0, 0.0, 0.0, 0.0),
            eq_point(0.48, -3.0, -1.0, -1.0),
            eq_point(0.76, -15.0, -5.0, -7.0),
            eq_point(1.0, -24.0, -10.0, -14.0),
        ],
        _ => Vec::new(),
    }
}

fn filter_point(offset: f64, lowpass_hz: f64, highpass_hz: f64) -> FilterAutomationPoint {
    FilterAutomationPoint {
        offset,
        lowpass_hz,
        highpass_hz,
    }
}

fn filter_curve(incoming: bool, kind: &str) -> Vec<FilterAutomationPoint> {
    match (kind, incoming) {
        ("loop_bridge", true) => vec![
            filter_point(0.0, 8_500.0, 28.0),
            filter_point(0.48, 14_000.0, 22.0),
            filter_point(0.7, 20_000.0, 20.0),
        ],
        ("loop_bridge", false) => vec![
            filter_point(0.0, 20_000.0, 20.0),
            filter_point(0.65, 16_000.0, 24.0),
            filter_point(1.0, 10_000.0, 40.0),
        ],
        ("echo_filter_out", true) => vec![
            filter_point(0.0, 5_500.0, 35.0),
            filter_point(0.55, 20_000.0, 20.0),
            filter_point(1.0, 20_000.0, 20.0),
        ],
        ("echo_filter_out", false) => vec![
            filter_point(0.0, 20_000.0, 20.0),
            filter_point(0.45, 20_000.0, 20.0),
            filter_point(0.65, 4_200.0, 55.0),
            filter_point(0.85, 950.0, 150.0),
            filter_point(1.0, 520.0, 240.0),
        ],
        _ => Vec::new(),
    }
}

fn dry_curve(kind: &str) -> Vec<AutomationPoint> {
    if kind != "echo_filter_out" {
        return Vec::new();
    }
    automation_curve(&[
        (0.0, 1.0),
        (0.5, 1.0),
        (0.68, 0.28),
        (0.76, 0.0),
        (1.0, 0.0),
    ])
}

fn echo_wet_curve(kind: &str) -> Vec<AutomationPoint> {
    if kind != "echo_filter_out" {
        return Vec::new();
    }
    automation_curve(&[
        (0.0, 0.0),
        (0.46, 0.0),
        (0.62, 0.3),
        (0.78, 0.52),
        (0.94, 0.32),
        (1.0, 0.0),
    ])
}

fn echo_feedback_curve(kind: &str) -> Vec<AutomationPoint> {
    if kind != "echo_filter_out" {
        return Vec::new();
    }
    automation_curve(&[
        (0.0, 0.0),
        (0.5, 0.0),
        (0.66, 0.36),
        (0.82, 0.52),
        (0.95, 0.22),
        (1.0, 0.0),
    ])
}

fn echo_delay_seconds(track: &Track, kind: &str) -> f64 {
    if kind != "echo_filter_out" {
        return 0.0;
    }
    track
        .valid_bpm()
        .map(|bpm| (60.0 / bpm * 0.75).clamp(0.14, 0.85))
        .unwrap_or(0.36)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{FeatureConfidence, PlanContext};
    use crate::scoring::score_transition;

    #[test]
    fn missing_analysis_uses_safe_fade() {
        let current = Track {
            id: "a".into(),
            duration: 200.0,
            ..Track::default()
        };
        let next = Track {
            id: "b".into(),
            duration: 180.0,
            ..Track::default()
        };
        let context = PlanContext::default();
        let score = score_transition(&current, &next, &context);
        let transition = plan_transition(&current, &next, &score, &context);
        assert_eq!(transition.kind, "safe_fade");
        assert!((2.8..=4.2).contains(&transition.crossfade_duration));
        assert!((transition.mix_out_start + transition.crossfade_duration - 200.0).abs() < 0.001);
    }

    #[test]
    fn reliable_grid_uses_beat_mix() {
        let beats: Vec<f64> = (0..480).map(|index| index as f64 * 0.5).collect();
        let downbeats: Vec<f64> = beats.iter().step_by(4).copied().collect();
        let profile = FeatureConfidence {
            tempo: Some(0.95),
            beat_grid: Some(0.95),
            energy: Some(0.8),
            structure: Some(0.85),
            overall: Some(0.85),
            ..FeatureConfidence::default()
        };
        let current = Track {
            id: "a".into(),
            bpm: Some(120.0),
            energy: Some(0.7),
            duration: 240.0,
            outro_start: Some(208.0),
            beat_positions: beats.clone(),
            downbeat_positions: downbeats.clone(),
            confidence: profile.clone(),
            ..Track::default()
        };
        let next = Track {
            id: "b".into(),
            bpm: Some(122.0),
            energy: Some(0.72),
            duration: 220.0,
            intro_end: Some(24.0),
            beat_positions: beats,
            downbeat_positions: downbeats,
            confidence: profile,
            ..Track::default()
        };
        let context = PlanContext::default();
        let score = score_transition(&current, &next, &context);
        let transition = plan_transition(&current, &next, &score, &context);
        assert_eq!(transition.kind, "beat_mix");
        assert!(transition.bar_aligned);
        // `outro_start` marks where the outro begins, not where playback should
        // be cut. The transition must still finish at the natural track end.
        assert!((transition.mix_out_start + transition.crossfade_duration - 240.0).abs() < 0.001);
    }

    #[test]
    fn energy_lift_uses_bar_loop_bridge() {
        let beats: Vec<f64> = (0..480).map(|index| index as f64 * 0.5).collect();
        let downbeats: Vec<f64> = beats.iter().step_by(4).copied().collect();
        let profile = FeatureConfidence {
            tempo: Some(0.94),
            beat_grid: Some(0.92),
            energy: Some(0.85),
            loudness: Some(0.9),
            structure: Some(0.72),
            overall: Some(0.82),
            ..FeatureConfidence::default()
        };
        let current = Track {
            id: "low".into(),
            bpm: Some(120.0),
            energy: Some(0.32),
            loudness_lufs: Some(-18.0),
            duration: 240.0,
            outro_start: Some(208.0),
            beat_positions: beats.clone(),
            downbeat_positions: downbeats.clone(),
            energy_curve: (0..=24)
                .map(|index| crate::model::TimedValue {
                    time: index as f64 * 10.0,
                    value: 0.34,
                })
                .collect(),
            confidence: profile.clone(),
            ..Track::default()
        };
        let next = Track {
            id: "lift".into(),
            bpm: Some(122.0),
            energy: Some(0.74),
            loudness_lufs: Some(-14.0),
            duration: 220.0,
            intro_end: Some(24.0),
            beat_positions: beats,
            downbeat_positions: downbeats,
            confidence: profile,
            ..Track::default()
        };
        let context = PlanContext::default();
        let score = score_transition(&current, &next, &context);
        let transition = plan_transition(&current, &next, &score, &context);
        assert_eq!(transition.kind, "loop_bridge");
        assert_eq!(transition.loop_repetitions, 2);
        assert!(transition.loop_end.unwrap() > transition.loop_start.unwrap());
        assert!((transition.mix_out_start - transition.loop_end.unwrap()).abs() < 0.001);
        assert!((transition.mix_out_start + transition.crossfade_duration - 240.0).abs() < 0.001);
        assert!(!transition.incoming_eq.is_empty());
    }

    #[test]
    fn normalized_energy_without_loudness_is_not_a_loop_signal() {
        let confidence = FeatureConfidence {
            energy: Some(0.9),
            loudness: Some(0.9),
            ..FeatureConfidence::default()
        };
        let current = Track {
            energy: Some(0.2),
            confidence: confidence.clone(),
            ..Track::default()
        };
        let next = Track {
            energy: Some(0.8),
            confidence,
            ..Track::default()
        };

        assert!(!is_energy_lift(&current, &next));
    }

    #[test]
    fn incompatible_tempo_avoids_forced_effect() {
        let current_beats: Vec<f64> = (0..480).map(|index| index as f64 * 0.5).collect();
        let next_beats: Vec<f64> = (0..400).map(|index| index as f64 * 0.6).collect();
        let profile = FeatureConfidence {
            tempo: Some(0.9),
            beat_grid: Some(0.88),
            energy: Some(0.8),
            structure: Some(0.7),
            overall: Some(0.8),
            ..FeatureConfidence::default()
        };
        let current = Track {
            id: "fast".into(),
            bpm: Some(120.0),
            energy: Some(0.62),
            duration: 240.0,
            outro_start: Some(208.0),
            downbeat_positions: current_beats.iter().step_by(4).copied().collect(),
            beat_positions: current_beats,
            confidence: profile.clone(),
            ..Track::default()
        };
        let next = Track {
            id: "slow".into(),
            bpm: Some(100.0),
            energy: Some(0.64),
            duration: 240.0,
            intro_end: Some(24.0),
            downbeat_positions: next_beats.iter().step_by(4).copied().collect(),
            beat_positions: next_beats,
            confidence: profile,
            ..Track::default()
        };
        let context = PlanContext::default();
        let score = score_transition(&current, &next, &context);
        let transition = plan_transition(&current, &next, &score, &context);
        assert_eq!(transition.kind, "safe_fade");
        assert!(transition.outgoing_filter.is_empty());
        assert!(transition.outgoing_echo_wet.is_empty());
    }
}
