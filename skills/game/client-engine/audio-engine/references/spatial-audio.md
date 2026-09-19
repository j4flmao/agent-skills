---
title: Spatial Audio
description: Pan, distance attenuation, HRTF, occlusion, ambisonics and velocity pitch for 3D sound.
---

# Spatial Audio — Deep Reference

## 1. The 3D Position Pipeline

```
world pos (source) + listener (camera) → relative vector
  → azimuth/elevation (pan/HRTF)
  → distance (attenuation curve)
  → occlusion (wall between → low-pass + reduced direct)
  → velocity diff (fill pitch change / doppler)
```

## 2. Pan & Attenuation

| Field | Standard |
|-------|----------|
| azimuth → pan | equal-power pan (constant power), HRTF for phones |
| distance → gain | linear / inverse / log falloff per source `falloff` asset |
| min/max distance | `nearDistance` (full), `farDistance` (cut) |

```cpp
pan = (azimuth in [-90,90]) → [L,R] gains (equal-power: pan = cos/sin halves)
gain = clamp( (far - d)/(far - near) ) with a curve (choose per asset)
```

## 3. HRTF (Headphones Sprout)

- HRTF adds inter-aural cues (ITD + low-freq ILD) for believable front/back/up/down.
- **Cost**: a selected batch of transfer-function filters — cheap per voice if a small HRTF set is used (e.g., 8–16 filters pre-split).
- When headphones: enable; speakers: plain pan.
- Fallback: distance-only pan when voice count high (see performance-and-voice).

## 4. Occlusion (The Wall)

```
raycast listener→source (collision/visibility)
occluded: 
  direct gain *= k    (e.g., 0.3)
  low-pass filter at ~1.5–2 kHz   (muffled)
  reverb send init level up (the "enclosed" feel)
```
Never block entirely — muffled is the read. Cache the occlusion test per voice per ~100 ms (don't raycast every frame).

## 5. Velocity / Doppler

- Pitch shift by relative velocity (the classic "brrrrr" whoosh when a vehicle passes).
- `pitchFactor = clamp(1 + (srcVel - listenerVel)·direction / speedOfSound, 0.5..1.5)`
- Reduced for most content (pitch-bend reserved for vehicles/projectiles) — full doppler on everything = nausea.

## 6. Ambisonics (Ambience Positioning)

- First/second-order ambience (a wave field) can place an ambient bed, then *pan the direct sources* inside it.
- Costlier than stereo-two-pan; used for "the city hum" layered.

## 7. The Listener State

Per frame, the audio system caches `{pos, rotation, velocity}` of the listener (camera) — sample it once, feed all voices (consistency + determinism).

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Per-voice crackling on fast pan | ramped pan |
| Occlusion raycast every frame × voices | cache per 100 ms |
| Full doppler on everything | selective |
| HRTF when on speakers | hardware-speak check |
| Listener sampled per voice | one snapshot |

## 9. Checklist

- [ ] Listener snapshot once per frame.
- [ ] Equal-power pan + per-source falloff.
- [ ] HRTF on headphones; fallback when many voices.
- [ ] Occlusion = muffled + cached raycast.
- [ ] Velocity pitch selectable per source.