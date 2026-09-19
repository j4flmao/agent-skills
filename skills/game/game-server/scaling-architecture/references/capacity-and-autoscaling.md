---
title: Capacity Planning and Autoscaling
description: Capacity math, prediction, prewarm, autoscale signals, pod pools and the "headroom beats launch rush" rule.
---

# Capacity & Autoscaling — Deep Reference

## 1. The Capacity Equation

```
pods_region = ceil( ccu_peak / players_per_pod )
players_per_pod = f(cpu/tick, bandwidth, zone caps)
```
For a session game: `ccu` = concurrent matches × avg players.

Worked: 40k CCU, 24 players/match, 4 matches/pod (64) → 40k/64 ≈ **625 pods**.

## 2. The Load Signals (Autoscale Inputs)

| Signal | Uses |
|--------|------|
| queue→match latency | match pressure (up = add pods) |
| pod CPU/tick p99 | sim headroom |
| relay RTT/drop | network |
| boats region capacity % | regional balancing |
| **queue depth** | PENDING (not formed) matches |

Autoscale = service decides *how many pods*; takes the *queue latency* (real pressure) not raw CPU (CPU can idle while full).

## 3. Predictive Capacity (Prewarm)

Games peak at predictable times (launch, sale, evening, season start). Prewarm from telemetry:

```
capacityPlanner:
  forecast ccu(t) = seasonal × daily (from history + promo events)
  pods(t) = ceil(peak forecast×1.2 headroom / pods_per_ALU)
  → pre-scale 30–60 min before (pod spin-up ~ minutes)
```

Never "scale on first miss": a 30-min prewarm buffer is the difference between a clean launch and a red dash.

## 4. Headroom Rule (The $ Argument)

- Costs of *over*: idle pods (few dollars/hour).
- Cost of *under*: queue-time explosion, bugs, player churn, angry influencer tweet storm on launch.

**Erring high is always cheaper than going Saiy ver jank.** Headroom: 20% steady-state, 100% maybe at launch.

## 5. The Pod Pool Pattern

- Pods are ephemeral VMs; **turn around fast** = a scrubbed AMI that boots into a "ready" state.
- Prewarm pod = spun, loaded with the level/map (minutes), registered to the LB.
- Pool manager: `freePods(region)` — the matchmaker *reserves* a pod when forming (`server-handoff`); release on failure.
- Health: a pod marked sick before a match is handed to it = instant reoffer (safe).

## 6. Scale-Down (The WMF Safe)

- Don't kill pods mid-match. Drain: stop receiving new matches; finish in-flight at their natural end; then reclaim.
- Match → end → report outcome → pod → drain-eligible.
- Metrics: `draining` queue; alert on a pod stuck draining (a finished match whose player never left = leak).

## 7. Burst & Fault Tolerance

- Burst (a 10× player spike): spin beyond prewarm = the *tuag response*: raise pod budget + degrade cross-region (see region-and-edge), never "roll queue".
- Two metrics that prevent storms: "available pods" per region on the dashboard + "queue→matcher SLO breach" as the trigger.

## 8. Testing the Autoscaler

- **Load-test the autoscaler itself**: synthesize CCU from a simulator (bots with synthetic input), assert: pods provision in time, no SLO breach, no thundering herd of pod-spins.
- **Chaos**: kill 10% of pods mid-prime-time; assert queue stays bounded + no player data loss.

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Scale on CPU only | latency + queue |
| First-tick autoscale | prewarm forecast |
| Kill match pods | drain protocol |
| Idle pod farms (cost) | seasonal + prewarm not blanket |
| Spinning too many at once | coated stagger |

## 10. Checklist

- [ ] Capacity model equals ccu→pod math.
- [ ] Signals: queue lat + queue depth.
- [ ] 30–60 min predictive prewarm + headroom.
- [ ] Drain (not kill) scale-down.
- [ ] Autoscaler load/chaos-tested.
- [ ] Pod pool reservation + release safe.