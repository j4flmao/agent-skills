---
title: Evidence and Audit Trails
description: Immutable wire artifacts, deterministic replay, tamper-evidence, appeals and the audit log for anti-cheat verdicts.
---
# Evidence & Audit — Deep Reference

## 1. The Evidence Principle

**The raw wire stream is the artifact.** Everything a verdict rests on must be reconstructable from *immutable server data* — not from a client's memory, not from a reconstructed "what we think happened."

Rule: anti-cheat without evidence is a spectator sport; with evidence it's a legal system.

## 2. What We Preserve

- Pre-start: handshake, attestation reports.
- In-match: every validated + rejected input command, LOS checks, ability events, damage totals.
- Post: final state hash + scoreboard.

Format: per-match **wire log** (append-only): `{seq, tick, type, payload}` — deterministic (it's the exact bytes already exchanged), small (a 30-min match ≈ 2–4 MB compressed).

## 3. Deterministic Replay

The superpower: a flagged window re-simulated *identically offline* produces the same anomalies:

```cpp
// server has SimulateTick deterministic (§ tick-loop)
Replay(match, from=flagTick-40, to=flagTick+40) → newEventLog
assert(newEventLog[flagTick]===originalThing that fired)
```

- If replay diverges → the anomaly was a fluke/environment, not a cheat → no flag.
- This is the "shadowplay" corroboration (§ anomaly-detection).

## 4. Tamper-Evidence

- Append-only log (WAL) signed (HMAC per chunk) on the *dedicated* log store (not the game server).
- Server restart never rewrites history (the log is side-effected to a store/object).
- The wire artifacts can't be forged by a client — they originated at the server.

## 5. The Verdict Object

```cpp
struct Verdict {
    ID matchId; timestamp;
    vector<EvidenceRef> refs;    // wire log offsets
    vector<AnomalyScore> scores; // per-signal z-scores
    Decision decision;           // adjust/shadow/temp/perm
    HumanNote note?;
    hash(EvidenceRefs) — tamper chain
};
```
Persisted in an **append-only ledger**. Appeal = re-run Replay + recalc scores against the SAME verifiers (version-pinned, so a code upgrade doesn't silently change history).

## 6. Version-Pinning the Verifier

Detector versioning matters: old matches judged by old rules. Store `{detectorGitRev}` in the verdict; when detector rules change, re-validate only *new* incidents — not history (else a "ban wave" retroactively re-judges people who never cheated under the new normal).

## 7. Appeals & the Audit Ledger

```
appeal → Replay(evidence) → score → comparison with verdict scores
grant = version-pinned sameness OR an explicit human override (logged)
```
- Ledger: every verdict + appeal + override is an immutable row → full auditability ("why was that player banned?" answered by a replay, not a shrug).

## 8. Storage & Retention

| Artifact | Retention | Location |
|----------|-----------|----------|
| wire log (in-match) | 90 days | object store (cold after 7) |
| verdict ledger | forever | append-only DB |
| replay-derived stats | 30 days | cache |

Sized: matches ≈ 100 GB/day for a 1M-DAU title — cheap to keep cold.

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Evidence from client memory | wire only |
| Replay diverges → still ban | assert green |
| Retroactive re-judgment on rule change | version-pin |
| Verdict without artifact | evidence-ref required |
| Tamperable store | append-only + HMAC chunks |

## 10. Checklist

- [ ] Wire log per match (append-only).
- [ ] Deterministic Replay corroborates flags.
- [ ] Verifier version-pinned in ledger.
- [ ] Verdict object with evidence refs + hashes.
- [ ] Append-only audit ledger; appeals replayable.
- [ ] Retention policy defined.