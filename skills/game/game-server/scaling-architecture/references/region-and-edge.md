---
title: Region and Edge Routing
description: Region routing, edge relays, bandwidth management, jitter absorption, and relay fleet health.
---

# Region & Edge — Deep Reference

## 1. The Region Cloud

- **Region** = a data center locale (aws-east, aws-central, eu-west, ap-south...).
- Each region hosts: a pool of game pods, an edge-relay fleet, a stateless-service copy.
- Players route to the *nearest measured region* (see `regions-and-ping`): measured, not claimed.

## 2. The Edge Relay Geometry

```
 client ── UDP ──► edge relay (region local)
                     │  (terminates client; absorbs jitter)
                     ▼
                 game pod (authoritative)

 pod ──(scheduled snapshots)──► relay ──► client
```

- The relay **forwards** (stateless): it doesn't decode game data, it just moves UDP.
- Spread the client connect across the fleet; the pod is *also* region-local (fast path), so relay adds only a few ms even on the critical fast path.

### 2.1 Why Bother With a Relay at All

| Benefit | Detail |
|---------|--------|
| Breaks client↔pod coupling | pod can move (migration) without client re-path |
| Absorbs jitter | the relay's NIC absorbs the wireless spikes; pod sees smoother window |
| Rate-limit/loss on the edge | can burst-sm to the pod instead of thin client |
| DDoS tarpit | edge fleet (cheap, stateless) eats floods; pod stays safe |

## 3. The Two Bandwidth Paths

```
 client → relay → pod:  input (small, ~4–16 B/event @ 60 Hz)
 pod → relay → client:  snapshots (interest-gated, 4–60 kB/s)
```

Cost model per player-seconds is IM-gated; relays only cost bytes *transmitted*, so IM budget (see interest management) is the real cost lever.

## 4. Bandwidth Throttling on the Edge

- The relay enforces the *wire budget* per connection (a hard cap ~2× the pod's send rate). A machine sending more than physical = DDoS-ish; kill/throttle.
- Per-client burst caps + uniform pacing (avoid micro-burst `bump` jank).
- Relief valve on emergency: edge waves phase-down (drops cosmetic channels) before the pod OOMs (measure: relay drop%).

## 5. Region Capacity & Routing Health

- The matchmaker already scored region/ping at formation (`regions-and-ping`).
- Pods route today's load: relay health check (drop%, J, p95 RTT) → LB routes new matches away from sick regions.
- **Cross-region relief** (an east region saturated): matchmaker permits a west pod with a *penalty* (metrics show it happened) — never automatic (see regions-and-ping optional-accept rule).

## 6. Relay Compact (DDoS / Abuse)

- Cheap stateless edge = the shock absorber. Mitigation doesn't touch the pod:
  - per-IP caps, connect-rate limit,
  - token handshake to the *relay* before session (reuse session token flow),
  - L4 SYN/amplifier filtering at the edge.

## 7. Metrics

| Metric | Watch |
|--------|-------|
| relay p95 RTT | health |
| relay drop % | seat |
| pod↔relay path bytes | IM efficiency |
| region capacity % | autoscale |
| cross-region matches | relief events |

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| No relay (client↔pod sticky) | migration/scale stuck |
| Relay decodes game data | stateless forward only |
| No per-conn wire cap | abuse floods pod |
| Cross-region auto | penalty-gated + optional |
| Region saturation headaches | relay health in LB routing |

## 9. Checklist

- [ ] Edge relay fleet per region, stateless.
- [ ] Client routed to measured-nearest region.
- [ ] Wire caps per connection at the edge.
- [ ] Region health feeds LB/matchmaker routing.
- [ ] Cross-region relief penalty-gated + measured.
- [ ] DDoS mitigations at the edge (token, caps).