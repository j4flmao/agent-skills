---
title: Effects and Reverb
description: Reverb (convolution/FDN), delay, EQ, filters, and the master limiter chain.
---

# Effects & Reverb — Deep Reference

## 1. The Effects Taxonomy

| Effect | Where | Cost |
|--------|-------|------|
| Reverb (convolution / FDN) | room send bus | shared, one per room |
| Delay / echo | sends | cheap |
| EQ (low/high-pass) | per-voice inserts (occlusion, radio) | cheap |
| Compression / limiter | master | cheap |
| Chorus/flanger | incidental | cheap |
| Convolution (impulse) | pre-baked spaces | author-time |

## 2. Reverb: Send, Never Per-Voice

- Voices route a `send` (level) into the room's reverb bus; **one FDN/convolution per room**, reused by all voices in it.
- Room semantics: cook-time "impulse responses" (author walked the room) → convolution for author-fidelity; FDN (feed-back delay network) for cheap dynamic.

```cpp
struct ReverbBus {
    // FDN: 8 × delay lines + feedback matrix; wet/dry mix param
    float process(float* in, float* out, float wet); 
};
voice.route(reverbSends[roomId], level 0..1);
```

## 3. The Occlusion Filter (Per-Voice Insert)

- Same filter used for occlusion: a one-pole low-pass at `cutoff = f(occlusion)` — cheap.
- Radio/voice-chat: a high-pass + distortion (a "phone" filter) — sampled, cheap.

## 4. Delay & Echo

- Sends into a tapped delay line; feedback for repeats (classic echoes).
- Deterministic: fixed delay lengths, seeded modulation if any.

## 5. The Master Chain (Anti-Clip)

```
buses → master → high-pass (DC block) → limiter (−1 dBFS) → output
```
- The limiter catches inter-sample peaks; transparent — never audibly pumping dialogue.
- Optional: a stereo width / LFE send for consoles.

## 6. Reverb Space Cache (Level Augment)

- Rooms bake their reverb settings (send levels, wet/dry, filter) into the audio asset — the engine just loads `room.audio`.
- Cross-fade reverb on room transitions (no snap-slam).

## 7. Determinism

- All effect params fixed per design (no random modulation scales).
- Same input → byte-identical output in QA replay (the "gun sound identical" check).

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Per-voice reverb (10× cost) | room-send |
| No master limiter (clipping) | limiter before out |
| Occlusion = dead silence | muffled low-pass |
| Room-snap on transition | cross-fade |
| Modulation randomness | seeded/deterministic |

## 9. Checklist

- [ ] Reverb via room-send (convolution/FDN).
- [ ] Occlusion/radio filters as cheap inserts.
- [ ] Master limiter chain (DC + limit).
- [ ] Room reverb baked into room.audio + crossfade.
- [ ] All effects deterministic.