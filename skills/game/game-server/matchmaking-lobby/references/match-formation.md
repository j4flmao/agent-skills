---
title: Match Formation
description: Search window widening, match quality score, fairness across teams, and search algorithms.
---

# Match Formation — Deep Reference

## 1. The Search Loop

The matchmaker repeatedly tries to form a feasible match. It's a **window-expanding search**, not a "pick first 12 queuers".

```
pool = queuing players (with phi, region, mode)
window = {skill ± sigma(widening), region local, party-requirements}
for t in [0,15,60,120]s: candidates = filter(pool, window expanded)
                        form = pickBest(candidates)   → score()
                        if form.scoredGoodEnough → offer
```

## 2. The Widening Curve

| Wait (s) | Skill sigma | Region | Ping cap |
|----------|-------------|--------|----------|
| 0 | 100 | local region | 60 ms |
| 15 | 200 | local | 80 ms |
| 45 | 350 | regional | 120 ms |
| 120 | 600+ | any | 200 ms (penalty applied) |

Tune parameters per title/mode; rank strict, casual loose. **Never skip the mercy floor** (a LOOOONG queue with wide windows only yields garbage matches — better to new-queue advise than force a 9-vs-11 fluke).

## 3. The Quality Score

```cpp
double MatchQuality(CandidateSet C) {
    skillVar   = variance(rating over C);          // want small
    sideFair   = |avgTeamA - avgTeamB|;            // want small (teams)
    pingCost   = max/large ping penalty(cross-region);
    waitPenalty= monotonic(time each waited);       // reward patience
    roleMatch  = parties honored vs pending?;
    return  w1*skillVar + w2*sideFair + w3*pingCost + w4*(-waitPenalty);
}
```

Formed when `score < threshold` OR `mercy timer expired`. Components are tuned *offline* against real-queue statistics (simulate).

## 4. Fairness Across Teams (The Subtle Bit)

Pooled-only matching is unfair: two 3000s + ten 1000s on one side ≠ fair despite equal averages. Algorithms:
- **Side-valence**: after picking players, assign to maximize `Σ side = 0` (greedy 2-opt swap: move the player minimising side imbalance). This is a classic NP-ish; a greedy + local improvement (2-opt) is fine for 12–20 blocks.
- Team fairness metric: `max |avgA - avgB|` not variance — drift is what players feel.

## 5. Party Handling

- A party enters as an atomic block (when full) or seeds membership (when partial).
- Prefer placing a *full* party intact; split partial parties with a priority to rejoin the same nominative.
- A region/Ping constraint is a simultaneous-constraint: a party's *member ping* must each satisfy the cap.

## 6. Search Cost Control

- Candidate generation is a filter over the pool — O(pool) per attempt. At 100k queuing that's heavy per second; **spatial/skill-index the pool** (KV by rating band + region) → O(window size).
- Recompute windows at most every ~1 s; batch checks.

## 7. Idempotency & State

`doesMatchMakerCrash mid-formation?` — each candidate formation attempt must be atomic: form → offer (state: "offered" with expiry) → accept → create server. If the offer expires, revert the pool state (players back in, wait-clock preserved). Same for server assignment (see `server-handoff`).

## 8. Metrics

| Metric | Use |
|--------|-----|
| P50/P95 queue time / mode | tuning |
| match quality distribution | fairness |
| abandon-after-offer % | dodging / offer UX |
| mercy-fires / hour | if high → pool too thin |

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Greedy pick = worst in 12 ways | score-over-candidates |
| No mercy floor | timer-exit |
| Party treated as individuals | atomic block |
| Skill-only (no side-fairness) | greedy 2-opt |
| Rebuild entire pool per search | indexed pool (band+region) |

## 10. Checklist

- [ ] Search widens (skill/region/ping) over time.
- [ ] Score function weights + mercy.
- [ ] Side-fairness via 2-opt.
- [ ] Parties atomic.
- [ ] Offer/revert idempotent.
- [ ] Queue-time + quality metrics.