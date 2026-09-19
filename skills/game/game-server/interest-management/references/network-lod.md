---
title: Network LOD and Rate Control
description: Per-channel update rates, distance-based detail scaling, quantization coarsening and bandwidth shaping.
---

# Network LOD — Deep Reference

## 1. The Idea

Same distance concept as render LOD, mapped to the network: **the farther from an observer, the less frequently and less precisely** state replicates. A player at 20 m needs 60 Hz transforms; at 300 m they need "stale is fine."

## 2. The Rate/Precision Grid

| Distance | Movement rate | HP/items rate | Quantization |
|----------|---------------|---------------|--------------|
| 0–40 m | 30–60 Hz | 10–20 Hz | int16 precise |
| 40–150 m | 10–20 Hz | 4 Hz | int12 |
| 150–500 m | 4 Hz | 1 Hz | int8 coarse, no inventory |
| > 500 m (shout range) | 1 Hz | none/only if alwaysReplicated | coarse pos only |

Each channel reads a table like this — decide *in the interest builder*, not in the serializer.

## 3. Implementation

```cpp
struct RateDOD { float near; float far; uint8 hzNear; uint8 hzFar; };
uint8 SendRateFor(O, E, Channel ch) {
    float dist = dist(O.pos, E.pos);
    RateDOD r = channelRates[ch];
    if (dist <= r.near) return r.hzNear;
    if (dist >= r.far)  return r.hzFar;
    float t = (dist - r.near) / (r.far - r.near);
    return (uint8)lerp(hzNear, hzFar, t);
}
```
Send if `lastSentVersion[ch] + 1000/rate < now`.

## 4. Coarsening the Quantization (Not Just the Rate)

Precision drop is a triple win: fewer bytes, fewer sends, simpler bits.

| Data | Near | Far |
|------|------|-----|
| position | int16 (±0.01 m-ish) | int8 (±10 m) |
| rotation | smallestThree (3B+1) | euler 3×8-bit |
| aim | 16-bit | 8-bit |

Keep *one quantization function per band* (deterministic, same on both ends).

## 5. Adding Channels at Distance

Bandwidth = Σ channels × their rates. The LOD grid decides *which* channels exist at each band:
- Chamber (near): all channels.
- Corridor (mid): movement + HP.
- Far: movement coarse only.

This dually limits *entity count* per observer (interest radius caps it — see visibility) and *per-entity bytes*.

## 6. Measuring & Tuning

| Metric | Action |
|--------|--------|
| bytes/s per observer | per-channel breakdown in dashboard |
| "just barely playable" rate | floor per title type (strategy 10 Hz, shooter 30 Hz) |
| distance band hit-rate | tune near/far |

Rule: never go below the playability floor for a channel tied to gameplay-critical intent (movement in shooters). "Visibility" is fine to be stale; "can I shoot them" is not.

## 7. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Same rate for all distances | LOD table |
| Over-frequent cosmetics | emote channel at 1–4 Hz |
| Sending int16 when int8 suffices | band-based quantization |
| Band switches cause pop-in | lerp across band change (leave bias) |
| Floor too low for critical channel | title-specific floor override |

## 8. Checklist

- [ ] Per-channel distance table (near/far + rates).
- [ ] Band-based quantization (deterministic).
- [ ] Channels present only where useful.
- [ ] Playability floors per channel.
- [ ] Dashboard per-channel bytes/observer.