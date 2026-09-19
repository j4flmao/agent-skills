---
title: DSP Graph and Voice Model
description: DSP nodes, buses, voice lifecycle, insert vs send routing and the event-to-graph boundary.
---

# DSP Graph & Voice Model — Deep Reference

## 1. The Two Worlds

```
event world:  game API → AudioEvent(clip, world, vol, pitch)
dsp world:    graph of DSP nodes processing sample buffers
```
The graph is a **node graph**:
```
[Voice]→[per-voice effect chain]→[Bus (gain/duck)]→[Master]→Output
```
Game code can't touch buses; designers own a `.audiograph` asset.

## 2. Voices

```cpp
struct Voice {
    AudioSource source;      // clip or stream
    int framePos;
    VoiceState state;        // playing/paused/stopped
    float gain, pitchBend;
    vector<Effect*> inserts; // per-voice (spatial, filter)
    Bus*   bus;
    Priority prio;          // for stealing
    float  distance;        // for falloff (fast path)
};
```

Lifecycle: `Start(alloc voices) → Update(pos/pitch/gain) → Stop(release)`.
- Voice **allocation** = the polyphony controller (a fixed cap; steal by priority).

## 3. Buses

| Bus | Content | Owns |
|-----|---------|------|
| Music | soundtrack | gain, fade, duck |
| Gameplay SFX | shots, footsteps | gain, duck group |
| UI | clicks | gain |
| Ambience | room/streams | gain |

- Each bus has: gain (dB), mute, `duckGroup` membership, a send (to reverb), a limiter (optional).
- Sum buses → master (with a final limiter — anti-clip).

## 4. Insert vs Send

| Routing | Use | Cost |
|---------|-----|------|
| Insert (series) | per-voice filter/pan | per voice |
| Send (parallel) | shared reverb/delay | one FDN shared |

**Never per-voice reverb** — a shared reverb send; each voice routes a level into it.

## 5. The Sample Buffer Contract

- Process in fixed-size blocks (e.g., 256–512 samples) aligned to the output callback.
- Double-buffer the output: the audio callback pulls the next block while the game thread gives the new DSP parameters (lock-free param exchange).
- All parameter changes (gain, pans) are **ramped/smoothed**: the DSP interpolates over a few ms (no zipper noise).

## 6. The Event Boundary (Threading)

- Game thread: pushes `AudioEvent`s into a queue.
- Audio thread  (or deferred DSP bl}), reads the queue, maps to Voices.
- Never lock the game thread on the audio callback; the queue is lock-free (SPSC ring).

## 7. Determinism (Replay-Faithful)

- Fixed sample rate; filters with fixed coefficients (no runtime FFT wobbles).
- Random sources (e.g., a synthesized crackle) use a **seeded** RNG per voice — replay reproduces it.
- All `float` math, same op order — byte compares in QA.

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Per-voice reverb | send routing |
| Game thread touches buses | .audiograph asset |
| Zipper pops on gain jump | ramped params |
| Voice allocation unbounded | polyphony cap + stealing |
| Non-deterministic DSP | seeded RNG + fixed math |

## 9. Checklist

- [ ] Nodes: Voice → inserts → bus → master.
- [ ] Polyphony cap with priority-steal.
- [ ] Lock-free event queue; ramped params.
- [ ] Shared reverb/delay via send.
- [ ] Deterministic DSP (replay byte-parity).