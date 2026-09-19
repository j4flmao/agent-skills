---
name: anti-cheat-server
description: Expert server-side anti-cheat — server-side validation, client integrity, anomaly detection, cheat vectors and response/escalation systems for online games.
---

# Anti-Cheat (Server) — Deep Engineering Guide

The server is the only place that can *prove* cheating. Client-side checks lie; server-side checks, telemetry and escalation decide. This skill covers server-side validation, client integrity/attestation, anomaly detection, a cheat-vector catalog and the ban/escalation pipeline.

## 1. The Core Principle

**Server authority is the anti-cheat.** A correctly authoritative server (see `authoritative-server`) already prevents the biggest cheats by construction (teleport, item duplication, god-mode) — because the client never sets state. Everything else (aim helpers, wallhacks) must be caught by *validation + anomaly detection*.

```
authority kills:  teleport, dupe, god-mode, speedhack (partially)
validation kills: speedhack (velocity bounds), aim-bot burst abuse, script-driven input
anomaly detects:  wallhack (firing through walls), impossible awareness
```

## 2. Server-Side Validation (The First Line)

Applied to every input command, every tick:

| Check | Blocks |
|-------|--------|
| Δpos ≤ speed·dt + tolerance | speedhack, teleport |
| Δrot ≤ turnRate·dt | turn-hack |
| Shot requires line-of-sight at rewind time | wallhack, wallbang |
| Cooldown/ammo/resources enforced | cooldown/dupe |
| Ability effects checked server-side | god-mode mods |
| Server recomputes damage | DP Shots |

Details in `server-side-validation.md`. Cheap, always-on, deterministic — **never optional per player**.

## 3. Client Integrity (Attestation Layer)

Client sends periodic **integrity attestation** — the server probes what the client *could have done*:

- **Hardware-attested** (where platform supports): signed reads of memory maps / module lists (kernel-mode providers; but keep it optional, privacy-careful).
- **Client-reports with server cross-check** (always): the client reports its own executable checksum, module list, command line. The server *compares across sessions* and flags drift (a modified client ≠ same checksum as its siblings).
- Rate: attest at join + every 30–60 s + on load (minimum intrusion).

Design goal: *raise cost to cheat*, not to make cheating impossible (impossible). § `client-integrity`.

## 4. Anomaly Detection (Server-Only Telemetry)

Never trust a client's "I saw the enemy." Use server state as ground truth to find *behavioral* impossibilities:

| Anomaly | Signal |
|---------|--------|
| Precognitive dodge | player dodges an un-visible attack (enemy not in LOS/awareness) |
| Aim-lock | crosshair on target skulls beyond human speed/smoothness bands |
| Impossible reaction | reaction latency below human floor over a window |
| Wall-sighted kills | kill where shooter had no LOS in 100% of the input window |
| Input impossible | mouse delta > driver max / button sequence impossibly fast |

Scored via **confidence accumulation** (see `anomaly-detection.md`) — single incidents are noise; patterns are evidence.

## 5. The Cheat Vector Catalog

| Cheat | Survives authority? | Detection |
|-------|--------------------|-----------|
| Aimbot | yes (input position) | trajectory/aim-lock stats |
| Triggerbot | yes | fire-delay missing + hit ratio |
| Wallhack | yes | LOS-based kill/fire analysis |
| ESP | yes | reaction/predictive movement diffs |
| Speedhack | partial | Δpos/Δrot checks |
| Dupe/pickup | no | authority |
| Memory-write mods | partial | integrity attestation + drift |
| Input macro | no | skewed command shape |

Catalog drives the detection rules — keep it in a doc (this is the "known adversary" register).

## 6. Response & Escalation

The server never decides alone (fair-trial rule): escalate to a **central anti-cheat service** with evidence:

```
server flags player (confidence + evidence packet)
  → central service reviews (auto-rules + optional human review)
  → verdict: CLEAR / SANCTION(ban, shadowban, MMR reset) / ESCALATE
```

| Response | When |
|----------|------|
| `score adjustment` (MMR rollback) | low-confidence, borderline |
| `shadowban` (sever pool) | suspected-but-unproven — the best "kill the cheating economy" tool |
| `temporary ban` | mid-confidence repeat |
| `permanent ban` | high-confidence + repeated |

Shadowban = send suspected cheaters only with other suspected cheaters (they ruin each other's lobbies, never the clean pool). See `response-and-escalation.md`.

## 7. The Evidence Packet

Every flag carries an audit trail (seen by the review human or auto-rule):
```cpp
struct Evidence {
    metadata;      // session, region, build
    suspiciousSeqs; // the raw inputs/wire records that fired
    anomalyScores; // per-vector confidence
    telemetry refs
}
```
Be **deterministic & tamper-evident**: the raw wire data (immutable) IS the artifact; don't reconstruct "what happened" later.

## 8. False Positive & Fair-Trial Design

- Human floor: never auto-game over on a single high-confidence spike.
- Reviewer must be able to replay the suspicious window (deterministic re-sim from wire data).
- Appeal path: a player can request review; the artifact is the wire log (not the client's say).
- Budget: 99% of flags should be *right* — the anomaly thresholds tune to that, not to "catch everyone".

## 9. Metrics & Ownership

| Metric | Watch |
|--------|-------|
| cheat rate / 10k matches | trend |
| flag→verdict latency | triage |
| false-positive rate | the most important anti-ban-health metric |
| shadowban pool size | pool health |
| appeal success rate | fairness audit |

## 10. References

- `references/server-side-validation.md` — Δpos/Δrot, LOS, cooldowns, ability verification, determinism
- `references/client-integrity.md` — attestation, checksums, drift detection, platform attestation, optionality
- `references/anomaly-detection.md` — telemetry signals, confidence scoring, statistical vs ML
- `references/cheat-vectors.md` — the catalog, each cheat + detection surfaction
- `references/response-and-escalation.md` — bans, shadowban, MMR rollback, review pipeline
- `references/evidence-and-audit.md` — artifacts, replay, determinism, appeals, tamper-evidence