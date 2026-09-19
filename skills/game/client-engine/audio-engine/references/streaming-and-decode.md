---
title: Streaming and Decode
description: Chunked stream graphs, decode workers, ring buffers, latency budgets and disk priority.
---

# Streaming & Decode — Deep Reference

## 1. When To Stream

| Content | Strategy |
|---------|----------|
| Music / long ambient | **stream** (disk to buffer continuously) |
| One-shots (footstep, impact) | decode-to-RAM at load |
| Dialogue | stream + small RAM cache |
| Short loops | RAM cache |

A voice with RAM source = `decompressed (ready)`; a stream = `chunked (needs disk + decode)` — allocation differs.

## 2. The Stream Lifecycle

```
Voice.play(stream) →
   chunk ring (e.g., 8× 20-ms chunks)
   IO thread: read chunk (pak, async)
   decode worker: decompress (Opus/Vorbis/platform) into slot
   audio thread: consume next chunk (double-buffer, no lock)
```

- **Read-ahead**: keep ~40–80 ms buffered (safety) — under budget (30 ms added latency).
- **Tear protection**: if the ring starves (disk slow), voice *pauses* (silence) rather than repeat/glitch (log + metrics).

## 3. Decode Threading (Worker, Not Main)

- Decode on **1–2 dedicated audio-worker threads** (see job-system).
- The audio callback (real-time, hard) must never decode synchronously — it pulls from the ring.
- Budget: a stream needs ~1–2 ms CPU/2k samples; a music layer = low.

## 4. Latency Budget (Total)

| Stage | Budget |
|-------|--------|
| start→first sample | < 30 ms |
| buffer added | + read-ahead (~+20 ms) |
| disk seek (rare) | hidden by read-ahead |

Measure: `audio.latency_first_sample` in the profiler.

## 5. Formats & Priority

| Format | Use |
|--------|-----|
| Opus/Vorbis | most content |
| PCM/WAV | one-shots (no decode cost) |
| Platform-native (AT9/...) | console |

Disk reading is **shared** with level streaming — both go through the same throttled IO queue (see asset-pipeline/streaming-throttle): audio streams get a bandwidth slice; never starve a stream in a loading room.

## 6. The Ring Buffer

```cpp
struct Chunks { std::array<Chunk,N> buf; uint32 write, read; };
// producer (IO+decode): fill slot write→advance
// consumer (audio cb): consume read→advance
```
Single-producer/single-consumer → no locks (memory-order relaxed fences). Overflow = drop-oldest with metrics.

## 7. Determinism Side-Note

Streaming timing may vary (disk!); DSP *content* must still be deterministic — the ring only adds latency, not samples (verifiable in QA replay).

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Decode on audio callback | worker threads |
| Stream starved during level load | shared-IO band slice |
| Ring underflow → glitch | pause + metrics |
| No read-ahead (buffer small) | keep 40–80 ms |
| Locking producer/consumer | SPSC ring |

## 9. Checklist

- [ ] Chunked ring, double-buffered, lock-free.
- [ ] 1–2 decode workers off the audio callback.
- [ ] Read-ahead 40–80 ms; latency < 30 ms.
- [ ] IO priority shared with level streaming.
- [ ] Underflow → pause + metric not glitch.