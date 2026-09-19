---
title: Anomaly Detection
description: Telemetry signals, confidence scoring, statistical baselines, and when to use ML — anomaly detection on server ground truth.
---

# Anomaly Detection — Deep Reference

## 1. Why Server Ground Truth

The client is a liar by default (it's an adversarial context). Anomaly detection must run on **server-side truth**: positions, damage, LOS, timings the server *computed* — not anything the client reports about the world.

## 2. The Signal Set

| Signal | Sourced where | Anomaly |
|--------|---------------|---------|
| Δpos / Δrot | server validation | bounds exceeded |
| aim trajectory | server pos stream | lock-on precision (crosshair velocity = 0 at target) |
| fire timing | server events | triggerbot (no human jitter, < 100 ms react) |
| reaction latency | server timestamps | below human floor consistently |
| LOS at kill | server LOS checks | fired through occluder (wallhack) |
| predictive movement | server | dodges before a LOS event is possible |
| inter-event priority pattern | server | script-X (input shape) |

Every signal = a *distribution* over the population (see §4); a player at the far tail across many signals = strong cheat likelihood.

## 3. Compute: Heuristics First, ML Late

**Start heuristic, deterministic, explainable** (humans can see *why*):

```
confidence += w_k * anomalyLevel(signal_k)
thresholds tuned to 1e-4 false-positive budget from the real fleet.
```

Reasons heuristics beat ML here, early:
- Explainability for appeals (a human/auto-reply must say why).
- Determinism (evidence replay).
- Small-team surface (no silent model sway).
- ML adds value *later*, to *reduce manual review load* (filter the top-N that warrant attention), never as the sole arbiter.

## 4. Statistical Baselines per Cohort

"human floor" isn't one number — it depends on tier and input device:
- mouse 1k Hz vs 125 Hz polling → different perfect-headlock profiles.
- higher-MRR players legitimately have faster reactions (limit).
- Build a per-cohort profile (elo band × input device × region) of: reaction mean/σ, aim smoothness percentiles, etc.

A flag = `score(profile) -> z-score beyond threshold`, not a hard global rule.

## 5. Confidence Accumulation Over Sessions

Single incidents are noise (a lag spike looks like a teleport; a lucky flick looks like perfect aim). Accumulate:

```cpp
class ConfidenceProfile {
    float acc = 0;
    void Observe(Signal s, float z) {
        // exponential smoothing, time-decay:
        acc = acc * decay + max(0, z - LOOK_THRESH) * w;   // ignore mild
    }
    bool Flagged() { return acc > FLAG_TOTAL && Events(N) > MIN_EVENTS; }
};
```
Require: N (≥ 5) independent events AND sustained score. Kills-false-positive economy without gate-keeping on single spikes.

## 6. The "Shadowplay" Corroboration

The strongest confirmation: **replay** the suspicious window deterministically and measure the same anomalies *offline* (this is the evidence for a human reviewer). Anticheat flagging without reproducible evidence = support ticket bleeding.

## 7. Operating the Dashboard

| Metric | Use |
|--------|-----|
| flags/session | threshold health |
| flag→real-cheater rate (review stack) | detector precision |
| cohort drift | recalibrate baselines |
| appeal success rate | false-positive audit |

A detector whose flag→real rate drops = threshold drift or a pattern shift — tune windows, not bans.

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Global human floor | per-cohort profiles |
| Single-spike flag | conf. accumulation + N events |
| Client-claimed signals | server ground truth only |
| ML black-box "because model" | heuristic base + explainable |
| Threshold tuned on test data | fleet-real windows |
| Replay impossible | keep raw wire events |

## 9. Checklist

- [ ] All signals from server truth.
- [ ] Heuristics first, explainable, deterministic.
- [ ] Per-cohort baselines (tier × device).
- [ ] Confidence accumulation (time-decay, N events).
- [ ] Replay corroboration for human review.
- [ ] Operate precision ≤ 1e-4 FP budget.