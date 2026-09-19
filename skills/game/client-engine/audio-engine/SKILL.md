---
name: audio-engine
description: Expert game audio engine — DSP graph, buses and mixing, spatialization/HRTF, streaming decode, ducking, effects (reverb/delay) and voice/performance budgets.
---

# Audio Engine — Deep Engineering Guide

Audio is half the game feel and a third the frame budget people forget. This skill covers the audio graph (DSP, buses, mixing), 3D spatialization, streaming decode, ducking/mixing-control, effects and the performance/voice budgets that keep audio crisp under load.

## 1. The Audio Pipeline

```
AudioEvent (play a clip at a world position)
  → Voice (instance; owns a decode stream)
  → Effect chain (per-voice: filters, spatial pan, distance)
  → Bus (music/sfx/ui: bus mixing + ducking)
  → Master → Output (platform audio device)
```

Two worlds meet here: **event** (high-level, game-facing) and **dsp** (signal, low-level). The engine must isolate them (a gameplay event is never a mixing decision).

## 2. The DSP Graph & Voice Model

```
Voice = an active playback instance with:
   source: clip or stream
   state: playing/paused/stopped
   effects (per-voice insert chain)
   routing (to which bus, at what pre-fader level)
```
- **Buses**: music, gameplay/sfx, UI, ambience — each with gain+mute+duck parameters. The mixer sums buses into the master.
- Effects are **insert** (on a bus or voice) or **send** (parallel, e.g., global reverb).

## 3. Spatialization (3D Audio)

| Technique | Cost | Use |
|-----------|------|-----|
| Pan + distance (constant power) | trivial | default |
| HRTF (head-related) | higher | headphones (console/PC) |
| Ambisonics | med | positional ambience |
| Reverb-per-position (levels are baked) | reuse | beds, rooms |

Spatialize per-voice: azimuth→pan/HRTF, distance→attenuation (per-source falloff curve), elevation tweaks. Occlusion (a wall in between) → low-pass + duck the direct + increase reverb send.

## 4. Streaming & Decode

| Need | Approach |
|------|----------|
| Music / long ambient | **streamed** from disk (pak) in chunks |
| One-shots (footstep) | decompressed to RAM once |
| Dialogue | streamed + memory pool |

- Decompress in **worker threads** (see job-system): `Vorbis/Opus`/platform-native at ~1–2 ms/2 k samples.
- Chunk size: 10–80 ms ms read-ahead (latency vs memory); a long stream = a ring buffer double-buffered.
- **Latency budget** per voice: < 30 ms added (read-ahead), so sound stays synced.

## 5. Mixing Control & Ducking

| System | What it does |
|--------|--------------|
| Mixing levels | per-bus volume, per-bus priorities |
| **Ducking** | lower a sidechain bus (music→sfx) on event |
| Voice limiting | cap max polyphony (drop/steal voices) |
| Loudness targets | per-bus RMS targets (streaming combat music to 60% when sfx burst) |

A classic duck: dialogue events duck music −12 dB (attack 50 ms, release 400 ms). Voice-stealing: a new urgent sound steals the oldest lowest-priority voice (never the player's own voice).

## 6. Effects (Reverb, Delay, EQ)

| Effect | Typical |
|--------|---------|
| Reverb (convolution/FDN) | per-room bus, or send |
| Delay/echo | one-shots, taunts |
| EQ (high/low-pass) | occlusion filters, "radio" |
| Compressor/limiter | master (anti-clip) |
| Chorus/flanger | incidental |

Reverb = **send** (one FDN per room, many voices route in) — never one reverb per voice per frame. Convolution reverb = author-time bake (impulse responses) not run-time.

## 7. Performance & Voice Budgets

| Metric | Budget |
|--------|--------|
| voices / frame | ≤ 32–256 (by platform) |
| DSP CPU | ~2–6% total (often 5%) |
| decode threads | 1–2 |
| latency (start→sound) | < 30–50 ms |
| streaming bytes/s | 10–20 kB/s per stream |

For a crowd (hundreds of NPCs): voice-allocate by proximity/prioritization — the "best 24 voices" trick (spatialize the near, composite the far with a single room ambience).

## 8. Determinism (Replay & QA)

- The DSP must be **deterministic**: same input → same output (fixed sample rates, fixed filter constants, no nondeterministic effects (random=seeded)).
- QA wants byte-identical audio in replay runs to confirm "the gun sound is in" — this keeps sound *testable*.

## 9. The Event→DSP Boundary (API Design)

```cpp
game → AudioEvent(audio: "sfx/hit_impact", world, volume, pitch)
engine → maps to a Voice + routing decisions (bus, duck context).
```
The game never touches buses/ducks; the audio *designer* owns the bus/duck graph (a .audiograph asset).

## 10. References

- `references/dsp-graph.md` — DSP nodes, buses, voice lifecycle, insert/send routing
- `references/spatial-audio.md` — pan, distance, HRTF, occlusion, ambisonics, velocity pitch
- `references/streaming-and-decode.md` — chunked streams, decode workers, ring buffers, latency budget
- `references/mixing-and-ducking.md` — bus levels, ducking curves, voice stealing, loudness targets
- `references/effects-and-reverb.md` — reverb (convolution/FDN), delay, EQ, master limiter
- `references/performance-and-voice.md` — voice budgets, polyphony allocation, crowd compositing, profiling