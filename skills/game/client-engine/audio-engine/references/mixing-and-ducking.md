---
title: Mixing and Ducking
description: Bus levels, ducking curves, voice stealing, loudness targets and the dynamic mixer.
---

# Mixing & Ducking — Deep Reference

## 1. The Level Mixer

| Bus | dB role |
|-----|---------|
| Music | −14 to −8 dB bed |
| SFX | priority sounds punch through |
| UI | quiet, always-on |
| Ambience | −12 to −8 |

The mixer holds **per-bus gain + mute + duckGroup + sends**. Mixing work is: get the bed right, then let *events* duck (pull out) rather than adding loud on top.

## 2. Ducking (The Dynamic Tool)

```
music_ducks = events (dialogue, big-sfx) → when active: 
   music bus gains: (attack 50 ms → −12 dB) → (release 400 ms → back)
```
- Duck = a **curve on the bus**, triggered by a duckGroup event count.
- Selectivity: duck music hard for dialogue, slight for a burst; never duck the player's own voice.

```cpp
struct Duck { BusId bus; float gainDb; float attackMs, releaseMs; };
// mix bus on: runningDucks.sum() → gain ramp (smoothed)
```

## 3. Voice Limiting & Stealing

- Cap total voices (`maxVoices=32`); beyond → **steal** the lowest-priority oldest voice (a new footstep > an idle ambient).
- Priority inversion rule: never steal a critical voice (the player's own sfx, a quest-beeps cue).
- The "best N" allocator: distant/crowd voices composite into one ambience voice (see performance-and-voice).

## 4. Loudness Targets (FemaleQuiet Rule)

- Per-bus RMS targets (e.g., SFX burst → 60% during music) — the "why is it so loud" complaints go away.
- **Measure** RMS/actual-loudness (a metering stage), not mix by guess. Personalization: master volume + sfx + music sliders implement *breathing* not blunt mute.

## 5. The Master Chain

```
bus sum → master → soft limiter (anti-clip) → output
```
- Limit *after* summing (inter-sample clipping). A transparent peak limiter at −1 dBFS.
- The limiter must never distort dialogue (rated first).

## 6. The Game-Event Mixer Interface

```
mixer.SetBusGain("music", -12);     // designers + code
mixer.TriggerDuckGroup("dialogue");  // game-side event
mixer.StealIfNeeded();               // engine policy
```
Game code never mutates individual gains; it *triggers* duck groups + priority tags. The designer's `.audiograph` defines the graph.

## 7. Determinism & Metering

- Mixing steps are deterministic (fixed gains, fixed smoothing kernels) → QA replay reproducible.
- Meter: per-bus momentary + RMS in the profiler (audio.duck_active, audio.peak_gain).

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Add loud on top instead of duck | duck |
| Duck w/o attack/release | curve ramps |
| Steal critical voice | priority blanket |
| Mix by guess (no meter) | RMS meters |
| Limiter after clip | peak limit before output |
| Game code nudges bus gains | duck-group API |

## 9. Checklist

- [ ] Bus levels + duck groups + sends (designer-owned).
- [ ] Ducking curves (attack/release) per group.
- [ ] Voice steal with critical-priority protection.
- [ ] RMS/loudness metering, limiter before output.
- [ ] Duck API for game events; no raw bus fiddling.