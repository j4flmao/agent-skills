---
title: Observability for Game Servers
description: Metrics, traces, logs, SLOs, dashboards and the cost of telemetry on a game-server fleet.
---

# Observability — Deep Reference

## 1. The Rule

**If you can't see it, you can't fix it.** Every service emits logs, metrics and traces by default. Game ops is a live show — a launch-night outage half-healed is a player exodus.

## 2. The Four Pillars

| Pillar | Shape | Example |
|--------|-------|---------|
| Logs | structured JSON, sampled | `{ts, svc, level, msg, fields}` |
| Metrics | counters + histograms | req/s, latency p50/p95/p99 |
| Traces | distributed spans | matchmaker → lobby → pod → relay |
| Profilers | per-pod internals | tick-time histogram (§ tick-loop) |

**Red metrics** (must be on a dashboard right now): error rate, latency, saturation, queue depth, per-region capacity.

## 3. What to Instrument on a Game Pod

```
tick:        tick_ms (hist), inputQueue depth, per-system ms
net:         bytes_out/player, drop%, rewind coverage, resyncs
sim:         entity count, active players, zone edge band size
world:       snapshot bytes/tick, ack lag, reserved
matchmaker:  formation score, offer→accept latency, available pods
```

All under 1% overhead — the sampler drops the per-event value not the batch structure.

## 4. Metrics + Specs (SLOs → Alert)

| Service | SLO | Alert |
|---------|-----|-------|
| matchmaker | queue→offer p95 < 90 s | > 120 s on |
| game pod | tick p99 < 5 ms | > 10 ms |
| relay | drop% < 0.5, p95 RTT < 60 ms | > 2% |
| persistence | write p95 < 30 ms | > 200 ms |

Budgets: alert on *running burn* (e.g., 4×90-day burn over a week) not just a single blip → fewer on-call pages, more meaning.

## 5. Distributed Tracing Layout

One trace per game action:
```
MATCH_JOIN:
  matchOffered → lobbyState → serverJoin → firstSnapshot
span per hop (relay, pod, auth) — every hop tagged.
```
Use header propagation (a `traceId` in the UDP envelope) — cheap, sampled at 1%.

## 6. Dashboards That Are Usable at 3 AM

| Dashboard | Views |
|-----------|-------|
| Fleet health | regions × error/latency/capacity heatmap |
| Match economy | queue time, abandon rate, match size |
| World health | ticks, desyncs, rewind hits |
| Cost | $ / player-hour (the business one) |

The 3AM test: a fresh page can see "east is saturated + queue climbing → eyes on cross-region relief" in 30 s.

## 7. The Cost of Telemetry

| Item | Cost savoring |
|------|---------------|
| Verbose logs on hot paths | sampled to 1% |
| Full histograms | exact events only for root-CA (alert-driven) |
| Traces | 1% sampling |
| Wire log retention | cold object store (see evidence) |

Telemetry budget guideline: ~1–2% of server CPU; never let observability eat the tick budget.

## 8. Postmortems (The Feedback Loop)

- An incident → artifacts exist (replay log, trace, dashboards) → analyze → add an alert for the *class*, not just the instance.
- Rule: any reproducible failure mode deserves a check + a test, else the fleet repeats the physics.

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| No red metrics on a dashboard | RIG the 4 |
| Logging every packet | sample |
| Alert storms | burn-rate budget |
| No trace across services | propagation |
| Observing at 5% CPU cost | ≤ 1% |

## 10. Checklist

- [ ] Logs/metrics/traces enabled-by-default, sampled.
- [ ] Red metrics + SLO dashboards per service.
- [ ] Alerts on burn-rate, not single blips.
- [ ] Trace propagation through UDP envelope.
- [ ] Cost of telemetry ≤ 1–2% CPU.
- [ ] Postmortem → new check loop.