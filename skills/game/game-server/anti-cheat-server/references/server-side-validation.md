---
title: Server-Side Validation
description: Speed/rotation bounds, line-of-sight, cooldown enforcement, ability verification — the always-on first line of anti-cheat.
---

# Server-Side Validation — Deep Reference

## 1. Where It Sits

Per input command, inside the tick (`input-authority.md`), **before** simulation. Deterministic, always-on, per-player.

```
recv command → validate (this doc) → queue/apply
```

Validation must never be *skippable* — it's part of the sim flow, not optional middleware.

## 2. The Movement Bounds

```cpp
bool ValidateMove(Cxn c, InputCommand cmd, ServerWorld& w) {
    Vec3 expected = w.playerFor(c).pos;
    const float maxMove = PLAYER_SPEED * TICK_MS * 1.25f;  // + slack for prediction
    if (dist2(cmd.wantPos, expected) > maxMove*maxMove) return false;   // speedhack
    // rotation:
    float dAngle = absAngleDelta(cmd.aimDelta, lastAim);
    if (dAngle > MAX_TURN_PER_TICK * 1.25f) return false;  // turn-hack
    return true;
}
```
- Slack factor 1.25 absorbs jitter; too tight = false-speed flag on legit.
- Bounds measured on **server truth** (last authoritative pos), never client-reported.

## 3. Line-of-Sight (Kill/Ability Gate)

```cpp
bool HasLOS(world, shooterId, targetId, tick) {
    // use rewind pose (§ lag-compensation), not current
    return !HasOccluder(shooter.pos, targetPos);
}
```
- For hit-scan: the rewind shot already gates ("would the client's shot have hit at the rewind tick").
- For wallbang (intended through-wall gameplay): an *explicit* flag on the ability; otherwise LOS is mandatory.
- Occluders = collision/raycast on server world.

## 4. Cooldowns & Resource Checks

```cpp
bool CanCast(world, entity, abilityId) {
    return cooldown.ready(tick) && mana >= cost && !cc.blocked;
}
```
The server owns cooldown/mana state — a modded client can flash "no cooldown" UI, but the server enforces. Cooldown ticks fixed-dt deterministic.

## 5. It's ALL Server-Side, Not Client-Trusting

Never gate on a client-claimed value:
- Client PWM values are *hints*, validated.
- Damage always recomputed server-side (a client reporting "I dealt 999" is ignored — the server computes from the ability + context).

## 6. The Special Cases (Legit-Design-Allowed)

| "Cheat" | When it's a feature |
|---------|---------------------|
| Teleport | only via scripted teleport abilities (server-issued) |
| Through-wall fire | only abilities flagged `wallHackable` |
| Instant cooldown | server-issued effect modifiers |
| Speed boost | buff systems with server-owned velocity cap |

Rule: server issues all flags; validation checks only against allowed abilities.

## 7. Determinism & Replay

Validation must be reproducible: same input stream, same world → same valid/invalid results. Keys: fixed tick, fixed world (no wall-clock), deterministic RNG in the validation only as seed-derived.

## 8. Telemetry Out (Feed Anomaly Layer)

For every `false` outcome, push a lightweight event to telemetry:
```
{playerId, tick, kind: SPEEDHACK|TURNHACK|NO_LOS|COOLDOWN, detail}
```
The anomaly layer aggregates (frequency + pattern) — see `anomaly-detection`. A single reject is noise; a burst is a flag.

## 9. Pitfalls

| Pitfall | Result | Fix |
|---------|--------|-----|
| Slack too tight | legit rubber-band flags | 1.25–1.5x |
| LOS checked at current state | misjudges shooters on jitter | rewind pose |
| Validation after sim | cheats apply a tick | before apply |
| Client-trusted cooldown | free mana | server-owned |
| Not telemetry'd | an overwhelmed operator | feed anomalies |

## 10. Checklist

- [ ] Δpos/Δrot bounds always-on, server-owned.
- [ ] LOS via rewind pose (unless ability flagged).
- [ ] Cooldowns/resources server-owned.
- [ ] All results deterministic + replay consistent.
- [ ] Rejects feed the anomaly telemetry.