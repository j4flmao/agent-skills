---
title: World State Snapshot Serialization
description: Serializing entity state, deltas, dirty flags, quantization, acking and gap detection for server-to-client sync.
---

# World State Snapshot — Deep Reference

## 1. The Snapshot Contract

A snapshot = "the authoritative state of world X at tick T" — a byte array the client reconstructs. Requirements: deterministic (byte-order fixed), compact, loss-tolerant (each client may get different subsets → interest).

## 2. Full vs Delta

| Mode | Bytes | Pros | Cons |
|------|-------|------|------|
| Full-state (lobby-scale) | big | simple | bandwidth spikes |
| Delta vs last ack | small | efficient | needs ack bookkeeping |
| Interest-gated | smallest | open-world | needs interest (§)

Default: **delta** to each client's last acked snapshot; full snapshot sent periodically (every ~1 s) as a re-sync anchor.

## 3. Entity Serialization Layout

```cpp
// per entity in a snapshot (interest-gated packet):
{
  uint16 entityId;        // 2 bytes
  uint8  flags;           // bit0 pos, bit1 rot, ... (cleanliness of delta)
  if (flags & POS_BIT)  { q15 pos[3];   }      // 16-bit fixed, ~deterministic
  if (flags & ROT_BIT)  { smallest3 rot; }     // canonical, w>=0
  // ... per-type extras: hp, ammo, animIdx, etc.
}
```

Rules:
- Only include *changed* components (dirty flag per member).
- Quantize: positions `int16` (0.7 m resolution at 60 km maps), rotations `smallest three` (3x8bit + sign), hp `uint8` (0–100).
- Determinism: a fixed quantization function (`Q(fixed(x))`) used on every platform — no float deltas in the wire.

## 4. The Ack / Gap Model

- Client acks the last tick it fully received (`ackTick`).
- Server tracks: `lastAck + resendWindow`. If client asks/acks gaps, server re-sends the missing parts (or a full anchor).
- Server's per-client send state: `dirtyEntities` set of ids for that client (recompute each tick via interest + enough delta = small).

### The Re-sync Trigger

If the client falls behind > `resyncThreshold` (e.g., lost > 300 ms of history), server drops the delta channel and sends a full anchor — cheaper than chasing a broken delta.

## 5. Integerization for Determinism & Bandwidth

| Data | Wire format |
|------|-------------|
| position | int16 fixed (mapped range) |
| velocity | int16 (rarely) |
| rotation | 3-byte smallest-three (+1 sign) |
| HP/mana | uint8 |
| animation state | uint8 index + tick |
| timestamps | tick (uint32 relative to matchStart) |

All float→int conversions via a single helper, **rounding fixes** (no `trunc`, use fixed `+0.5` style) so client & server agree.

## 6. Per-Client Snapshot Budget

```
snapshotBytes(cl) = Σ entityBytes(x) ∊ interest(cl)
budget: ≤ 60 kB/s per client (64 players → 4 MB/s)
```
Under budget: coarsen quantization (skip HP updates) or interest-gate harder — never overshoot; an overshoot = GCjank on client decode.

## 7. Encoding & Compression

- Use a light RLE/delta-varint (or a bitpack by per-entity mask).
- + optional LZ4 at the packet layer (if CPU on client allows).
- Order entities in the packet by type (stable), not live order, so bitpack works.

## 8. Loss, Order & Replay

- Packets may arrive out of order: snapshot carries `seq`; client buffers and applies in seq order.
- A dropped packet = the delta re-sync from server (server never waits for the lost packet — it advances ack window).
- Replay: server can store the full serialized tick stream for `demos` — deterministic re-run.

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Per-client full state each tick | delta |
| No ack bookkeeping → growing queue | lastAck + resend |
| Float serialization (MSB order) | fixed int + one serialize func |
| Unbounded snapshot size | interest + budget + quantization |
| Out-of-order client decode | seq-buffer + ack |
| Delta chasing a broken channel | resync anchor at threshold |

## 10. Checklist

- [ ] Delta encoding + periodic full anchor.
- [ ] Per-member dirty flags; only changed bytes.
- [ ] Fixed-point quantization, deterministic.
- [ ] Ack/resend window on server; resync threshold.
- [ ] Tick-stamped, seq-ordered packets.
- [ ] Snapshot budget enforced per client.