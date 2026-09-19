---
title: Performance and Voice Budgets
description: Polyphony allocation, voice budgets, crowd compositing, profiling and platform scaling.
---

# Performance & Voice Budgets — Deep Reference

## 1. The Budgets

| Metric | PC/console | Mobile |
|--------|-----------|--------|
| voices / frame | ≤ 256 | ≤ 48 |
| DSP CPU | ~2–6% | ~2–4% |
| decode threads | 2 | 1 |
| streaming bytes/s | 40–100 kB/s total | 10–20 kB/s |
| first-sample latency | < 30 ms | < 30 ms |

The frame budget is *total CPU* — audio must live inside a few % or the game feels sluggish.

## 2. Voice Allocation (The "Best N" Trick)

- A crowd of 300 NPCs: **allocating 300 voices is wasteful** and marginally heard.
- Allocator: `priority = proximity × loudness × importance`; pick top-N voices.
- The far crowd → **composite ambience**: one voice loops a "general murmur" (evolving locality baked) — near voices only spatialize.

```cpp
VoicePool pickAlloc(): // per frame
   rank voices by priority
   allocate budget (maxVoices)
   composite far voices → one ambience Voice
```

## 3. Voice Stealing Priority

| Voice priority | Protect |
|----------------|---------|
| Critical (player sfx, quest) | never steal |
| Important (near NPC voice) | steal after critical |
| Ambient/Filler | always stealable |

Steal = stop + engine returns the voice slot (removes from graph) — never a gap (the graph re-connects sends).

## 4. Distance-Based Voice Culling

- Voices beyond `audibilityDistance` → stop (they were never heard; cheaper than a muffled stream).
- Distance-band budgets: near (full polyphony) vs far (composite) vs beyond (off).

## 5. Platform Scaling

| Platform | Factor |
|----------|--------|
| PC 5.1+/headphones | full HRTF + high voice cap |
| Console | cap ~64–128, HRTF on headphones |
| Mobile | cap 32–48, pan only, limited effects |
| Web | lowest, single-buffer client |

Use a `qualityPreset` that flips: voice cap, HRTF on/off, reverb qual (FDN vs none), decode threads. Never "one setting for all".

## 6. Profiling

```
audio.dsp_ms/frame         → short of budget
audio.voice_count           → vs cap (near cap = leak or crowd)
audio.stream_starvations    → zero expected
audio.bus_rms               → levels sane
audio.first_sample_latency  → < 30 ms
```

## 7. Leak & Drift Checks

- Voice count plateau under sustained storm (footstep spammed) → leak detector: cap + steal must keep it flat.
- Stream starvations rising → disk contention (level loader) → budget banding.

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| 300 voices for a crowd | best-N + composite |
| Steal critical | priority blanket |
| DSP on the main thread | mixer on audio thread |
| One quality for all platforms | preset |
| No voice-count dashboard | meter |

## 9. Checklist

- [ ] Voice cap + priority allocator + composite.
- [ ] Steal protects critical.
- [ ] Distance culling + platform quality preset.
- [ ] `audio.*` profiling metrics dashboarded.
- [ ] Leak/starvation drift checks in tests.