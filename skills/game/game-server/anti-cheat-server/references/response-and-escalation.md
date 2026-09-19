---
title: Response and Escalation
description: Bans, shadowbans, MMR rollback, review pipeline, appeals — the decision layer of anti-cheat.
---
# Response & Escalation — Deep Reference

## 1. The Decision Taxonomy

| Response | When | Effect |
|----------|------|--------|
| `score adjust` | low-confidence, borderline | MMR rollback, no account change |
| `shadowban` | suspected-but-unproven | play only with other suspected |
| `temporary ban` | mid-confidence repeat | 3 days → 30 → permanent |
| `permanent ban` | high-confidence + repeated | account closed |

Always escalate from lowest severity unless the evidence is slam-dunk; the funnel keeps false positives low and the economy protected (see §5).

## 2. Shadowban — The Economy Killer

- A suspected cheater is **moved to their own pool** silently: matchmaking only pairs them with other shadowed players (and, rarely, bots).
- Effect: cheaters ruin each other's games; the clean pool never plays them; negative-reinforcement without a ban appeal storm.
- Metrics: shadow-pool wait times should not look broken (or cheaters learn to dodge); a shadowed player's *own* play continues (they don't know).
- Escalation path: continued cheating in shadow → permanent; silent *recovery* (playing clean for N matches) → back to the clean pool. **Give suspected players a fair recovery path** — otherwise it's just a hidden permanent ban (which is permissible but less defensible).

## 3. Temporary → Permanent Escalation Ladder

```
1st high-conf: temp 3 days (evidence attached)
2nd (resets temp counter): temp 30
3rd (or severe single event): permanent + MMR wipe
```
Severe single events (bought rating, boxed cheats, held hostage games) skip the ladder.

## 4. The Review Pipeline

| Tier | Role | Elapsed |
|------|------|---------|
| Auto-rule | deterministic replay + threshold | < 1 s |
| Auto with confidence≥C | auto-apply (shadow/temp) | < 1 s |
| Human review | ambiguous, appeals, brand-visible | < 24 h |

The endpoint is a **verdict object** (evidence + decision), persisted for appeal/audit. Everything a human sees is the replay + artifact (not vibes).

## 5. MMR Rollback

When a cheater is confirmed & removed, repair their victims:
- Recompute each cheated match outcome *as if the cheater never participated* (remove the entity + their contribution).
- Reapply rating deltas to the survivors (small, batched — the async rating pipeline).
- Victims get a "score corrected +X" notice (transparent, not silent).

Rollback must be **deterministic** — the same input stream re-simulates the removal identically.

## 6. Appeals & Audit

```
appeal request → re-run verdict (deterministic replay) → either uphold or reverse
```
- Every verdict is appealable; a human can review the artifact.
- Audit: appeal grant-rate is a health metric (if high, the auto-rules are too aggressive).
- The verdict record = the wire data + detector outputs + human note — tamper-evident (append-only log).

## 7. Reporting to Players

- Ban notice: plain-language, "based on AI detection," no code dump (keeps the cheater from learning the exact thresholds).
- Rollback notice: transparent "score corrected."
- Never disclose detector internals (thresholds, signals) in publicist asks.

## 8. Metrics

| Metric | Watch |
|--------|-------|
| verdict latency | triage |
| appeal grant-rate | false-positive health |
| shadow recovery rate | shadow economy health |
| ban-to-appeal ratio | detector explainability |
| support tickets per ban | UX |

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Instant-permanent on single spike | escalation ladder |
| Shadow without recovery path | fair recovery |
| Rollback not deterministic | re-sim from wire |
| Black-box verdict (no artifact) | evidence-first |
| Public threshold disclosure | opaque notices |

## 10. Checklist

- [ ] Escalation ladder (adjust→shadow→temp→perm).
- [ ] Shadowban pool isolated + recovery path.
- [ ] Deterministic rollback after removal.
- [ ] Auto + human review tiers; verdict object.
- [ ] Appeals re-run deterministically; audit log.
- [ ] Opaque notices; metrics dashboarded.