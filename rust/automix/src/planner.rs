use crate::model::{
    PathPlan, PathRequest, PathStep, PlanContext, Track, TrackChoice, TransitionScore,
};
use crate::scoring::{energy_target_adjustment, score_transition};
use crate::transition::plan_transition;

#[derive(Clone)]
struct BeamState {
    last: Track,
    used: Vec<usize>,
    steps: Vec<PathStep>,
    weighted_total: f64,
    weight_sum: f64,
}

impl BeamState {
    fn normalized_score(&self) -> f64 {
        if self.weight_sum <= 0.0 {
            0.0
        } else {
            self.weighted_total / self.weight_sum
        }
    }
}

pub fn choose_next_track(
    current: &Track,
    candidates: &[Track],
    context: &PlanContext,
) -> Option<TrackChoice> {
    candidates
        .iter()
        .filter(|candidate| !candidate.id.is_empty() && candidate.id != current.id)
        .map(|candidate| {
            let score = score_transition(current, candidate, context);
            let transition = plan_transition(current, candidate, &score, context);
            let mut reason_codes = score.reason_codes.clone();
            for reason in &transition.reason_codes {
                if !reason_codes.contains(reason) {
                    reason_codes.push(reason.clone());
                }
            }
            TrackChoice {
                track_id: candidate.id.clone(),
                score,
                transition,
                reason_codes,
            }
        })
        .max_by(|a, b| a.score.total.total_cmp(&b.score.total))
}

pub fn plan_path(request: &PathRequest) -> PathPlan {
    let candidates: Vec<Track> = request
        .candidate_tracks
        .iter()
        .filter(|track| !track.id.is_empty() && track.id != request.current.id)
        .cloned()
        .collect();
    if candidates.is_empty() {
        return PathPlan::default();
    }

    let horizon = request
        .horizon
        .unwrap_or(4)
        .clamp(1, 8)
        .min(candidates.len());
    let beam_width = request.beam_width.unwrap_or(6).clamp(1, 32);
    let mut beam = vec![BeamState {
        last: request.current.clone(),
        used: Vec::new(),
        steps: Vec::new(),
        weighted_total: 0.0,
        weight_sum: 0.0,
    }];

    for depth in 0..horizon {
        let mut expanded = Vec::new();
        let discount = 0.92_f64.powi(depth as i32);
        let energy_target = request.context.target_energy_curve.get(depth).copied();

        for state in &beam {
            for (candidate_index, candidate) in candidates.iter().enumerate() {
                if state.used.contains(&candidate_index) {
                    continue;
                }

                let score = score_transition(&state.last, candidate, &request.context);
                let transition = plan_transition(&state.last, candidate, &score, &request.context);
                let target_adjustment = energy_target_adjustment(candidate, energy_target);
                let step_score = (score.total + target_adjustment).clamp(0.0, 1.0);
                let weighted_total = state.weighted_total + step_score * discount;
                let weight_sum = state.weight_sum + discount;
                let cumulative_score = weighted_total / weight_sum;

                let mut reason_codes = score.reason_codes.clone();
                if target_adjustment > 0.04 {
                    reason_codes.push("energy_target_match".to_string());
                } else if target_adjustment < -0.04 {
                    reason_codes.push("energy_target_miss".to_string());
                }

                let mut steps = state.steps.clone();
                steps.push(PathStep {
                    track_id: candidate.id.clone(),
                    step_score,
                    cumulative_score,
                    score,
                    transition,
                    reason_codes,
                });
                let mut used = state.used.clone();
                used.push(candidate_index);
                expanded.push(BeamState {
                    last: candidate.clone(),
                    used,
                    steps,
                    weighted_total,
                    weight_sum,
                });
            }
        }

        expanded.sort_by(|a, b| b.normalized_score().total_cmp(&a.normalized_score()));
        expanded.truncate(beam_width);
        if expanded.is_empty() {
            break;
        }
        beam = expanded;
    }

    let Some(best) = beam
        .into_iter()
        .max_by(|a, b| a.normalized_score().total_cmp(&b.normalized_score()))
    else {
        return PathPlan::default();
    };
    let confidence = if best.steps.is_empty() {
        0.0
    } else {
        best.steps
            .iter()
            .map(|step| step.transition.confidence)
            .sum::<f64>()
            / best.steps.len() as f64
    };

    PathPlan {
        total_score: best.normalized_score(),
        confidence,
        steps: best.steps,
    }
}

pub fn score_pair(current: &Track, next: &Track) -> TransitionScore {
    score_transition(current, next, &PlanContext::default())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::FeatureConfidence;

    fn track(id: &str, bpm: f64, energy: f64) -> Track {
        Track {
            id: id.into(),
            bpm: Some(bpm),
            energy: Some(energy),
            duration: 220.0,
            intro_end: Some(20.0),
            outro_start: Some(190.0),
            confidence: FeatureConfidence {
                tempo: Some(0.8),
                energy: Some(0.8),
                structure: Some(0.7),
                ..FeatureConfidence::default()
            },
            ..Track::default()
        }
    }

    #[test]
    fn planner_honors_energy_direction() {
        let request = PathRequest {
            current: track("start", 120.0, 0.3),
            candidate_tracks: vec![
                track("low", 121.0, 0.32),
                track("medium", 122.0, 0.58),
                track("high", 123.0, 0.82),
            ],
            horizon: Some(2),
            beam_width: Some(6),
            context: PlanContext {
                target_energy_curve: vec![0.58, 0.82],
                ..PlanContext::default()
            },
        };
        let plan = plan_path(&request);
        assert_eq!(plan.steps.len(), 2);
        assert_eq!(plan.steps[0].track_id, "medium");
        assert_eq!(plan.steps[1].track_id, "high");
    }
}
