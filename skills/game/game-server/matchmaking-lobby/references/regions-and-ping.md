---
title: Regions and Ping Routing
description: Ping measurement, region selection, cross-region penalties, multi-region scoring.
---

# Regions & Ping — Deep Reference

## 1. Why Regions Exist

Latency to a far server ruins play (a 200 ms round-trip in an FPS = unplayable). Place players in **regions** (latency clouds) so matches happen where pings are acceptable.

## 2. Measuring Ping (At Queue Time)

- Compute per candidate-region latency at enqueue:
  - Client has a lightweight "ping probes" endpoint (small ICMP-like or HTTP HEAD per regional edge, a few per minute).
  - Client sends `{region: {ms}}` to the queue.
- Server-side re-probe whenever the candidate is about to be scored (a candidate whose last measure > 5 min old re-probes — "expiry").

Important: **measured, never claimed** (a VPN claim = fake; see §8).

## 3. Scoring the Region In the Matchmaker

```cpp
enum Region { east, west, eu, apac, ... };
double RegionCost(candidate, matchCosider) {
    int  worst  = max(candidate.ping[matchRegion], ...);   // all members
    int  meanP  = average(pings);
    if (worst > 200) return HUGE;
    return (meanP - bestPossiblePing) * REGION_WEIGHT;
}
```
The match score function includes this — a match across two regions is *possible* (mercy) but expensive. **Region = a hard constraint or soft weight?** Soft (weighted) ramp; hard cap at ping fatal.

## 4. Multi-Region (Main + Fallback)

- Primary = the region with best mean.
- Secondary candidates: regional cloud-adjacent (NA-east + NA-central + eu-west).
- The queue keeps "secondary slots" so a party can include a far player by placing them in the fallback.

## 5. The Cross-Region Fallback Path

When local pool is empty, matchmaker:
- Prepares remote formation with ping penalty (score).
- Notifies the few players involved (the client shows "your ping will be higher" before offering).
- A cross-region offer should be *optional-accept* (player can reject → back to pool, no penalty) — a "match requested", not forced.

## 6. Streaming / Spec Region Consistency

Spectators connect from any region (watch-cost tolerant). The **play region is the host's**. If spectators exceed a region's bandwidth, drop to the regional CDN relay (fallback endpoint), never the play host.

## 7. Infrastructure Notes

- A region = multiple availability zones; the match server pool per region.
- Route via edge relays: the local player's nav + regional anchor.
- Latency is to the *server pool*, not the DNS physcl — keep a service measuring each pod's ping (see scaling-architecture).

## 8. Anti-Abuse (VPN / Latency Faking)

| Trick | Detection |
|-------|-----------|
| VPN for "weak region" | probe to the actual server region (not the VPN's); mismatch |
| Claim low ping | we measure; the claim is ignored in scoring |
| Region-hopping for queue | one active search; region is sticky once offered |

Measure; never trust the client's ping claim for *scoring* (can still display it to the player as feedback).

## 9. Metrics

| Metric | Use |
|--------|-----|
| mean/worst in-match ping / player | health |
| cross-region matches / hour | mercy-rate |
| re-probe failures | infra |
| ping > 120 within match (alarm) | region juggling |

## 10. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Polling ping per query | probes at enqueue + expiry |
| Trust client ping claim | we measure |
| Region as hard static countries | region = latency clouds |
| No fallback for far player | secondary slots |
| Cross-region forced | optional accept |

## 11. Checklist

- [ ] Probe endpoints per region; measure, don't trust claims.
- [ ] Ping expiry re-probe.
- [ ] Region cost in match score (worst/max ping).
- [ ] Secondary-region fallback slots.
- [ ] Optional accept for cross-region.
- [ ] Match-ping/rats metrics.