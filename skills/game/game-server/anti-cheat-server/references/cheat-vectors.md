---
title: Cheat Vector Catalog
description: The known cheat catalog — aimbot, triggerbot, wallhack, ESP, speedhack, dupe, memory mods — and which detection layer beats each.
---
# Cheat Vector Catalog — Deep Reference

## 1. The Catalog as a Living Doc

Anti-cheat design == knowing the adversary. Maintain a **catalog per title**: each cheat + the layer that kills it (authority/validation/anomaly/integrity). Update with every new exploit reported by players (the fastest source of novel cheats is your own player base).

## 2. The Core Vectors

| Vector | What it does | Killed by | Detection surfaction |
|--------|--------------|-----------|----------------------|
| **Aimbot** (external mouse hook) | drives aim to target | validation + anomaly | aim-lock stats (zero crosshair vel at head), oversized hit% |
| **Triggerbot** (line on target | fires when crosshair on | anomaly | missing reaction jitter; instant-fire on target entry |
| **Wallhack/ESP** (esp overlay) | see enemy through walls | anomaly/LOS | kills without LOS; predictive dodging |
| **Speedhack** (modify velocity) | move faster | authority+validation | Δpos bound |
| **Teleport** (set position) | jump ahead | authority | Δpos bound |
| **Item dupe** (state exploit) | duplicate inventory | authority | server-owned inventory |
| **God-mode / damage mod** | ignore damage | authority | server recompute |
| **Memory-write mods** (client) | change values client-side | integrity + authority | attest drift; server authority ignores |
| **Input macro/script** | perfect bunnyhop | anomaly | input shape (too consistent) |
| **Client-prediction exploit** | false claim | authority | server never trusts |

## 3. The Esp Surface (Wallhack) Deep-Dive

Because the client *renders* the world, an ESP overlay can't be beaten by authority. Detection angles:
- **Triggers**: kills where the shooter lacked LOS *in every frame* of the input window (LOS function), or approach paths that require seeing through a wall.
- **Behavioral**: reaction latency under the human floor for the cohort (pure wallhack = faster than possible).
- **Telemetry**: the kill/crosshair path anomaly score (see anomaly-detection).

This is why the anomaly + evidence layer matters — it's the only real counter to esp/wall-hacks on an unhookable client.

## 4. Input-Macro (ScriptX) — The Shaping Signal

Pure software that makes a player *look* perfect:
- reaction/pulse clipping: human inputs have jitter; scripts are too uniform (variance approaching 0 over long spans).
- Per-position delta follows the *allowed* shape (velocity-bound look), but is too smooth for a mouse.

Signal: **entropy of input** — a near-zero-entropy aim history over thousands of samples is suspicious regardless of skill.

## 5. Ranked-Specific Stakes

The catalog splits between *casual* (high tolerance) and *ranked/comp* (monetized, sponsor-visible):
- Casual flags: shadowban only.
- Ranked: escalation to temporary/permanent + MMR rollback.

## 6. Measuring the Unknown (0-days)

- Player-reported exploit logs → the catalog seeding feed.
- Procedurally: fuzzy-match new reports against catalog *shape* (e.g., "new dupe" = an inventory-state anomaly the authority filter didn't catch) → add a validation rule after the incident (document as a runbook).

## 7. The Catalog Table Build

For each vector file a row:
```markdown
## Aimbot
- surfaced: 2024-01 · observed via ...
- bypass layer: authority (blocked), anomaly (caught at high conf.)
- evidence artifacts: aim-lock stats, cohort z-scores, replay
- status: ACTIVE | HONED | CLOSED
```

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Catalog allowed to go stale | player-log feed + incident runboогда |
| Design "anti-all" but flesh only 3 vectors | catalog review in milestones |
| Ignore esp (can't beat it in game) | anomaly/evidence is the real tool |
| Metrics only look at bans | review precision + appeal |

## 9. Checklist

- [ ] Catalog doc up-to-date with player reports.
- [ ] Each vector has a clear *killer layer*.
- [ ] Detections produce evidence artifacts.
- [ ] Casual/ranked response split.
- [ ] Incident → rule/nunbook loop.