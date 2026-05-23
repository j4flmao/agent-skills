# Estimation Techniques

## Planning Poker

### Process
1. Each estimator holds cards: 0, 1, 2, 3, 5, 8, 13, 21, ?, ∞
2. Product owner presents story and answers clarifying questions
3. Each estimator selects a card privately
4. All cards revealed simultaneously
5. Wide variance (range > 3 steps) → high and low estimators explain rationale
6. Re-vote after discussion
7. Consensus reached when variance is within acceptable range

### Card Meanings
| Card | Meaning | Story Size |
|------|---------|------------|
| 0 | Already done, trivial config change | No effort |
| 1 | Simple change, well-understood | < 2 hours |
| 2 | Straightforward, similar to past work | 2-4 hours |
| 3 | Moderate complexity | 4-8 hours |
| 5 | New territory but scoped | 1-2 days |
| 8 | Complex, unknowns present | 2-3 days |
| 13 | Very complex, multiple subsystems | 3-5 days |
| 21 | Epic — must split | > 1 week |
| ? | Need more information | Insufficient clarity |
| ∞ | Too large, unestimatable | Must decompose |

### When to Re-vote
- Range spans > 3 consecutive card values (e.g., 2 to 13)
- Estimator with domain expertise votes differently from rest
- Key assumption was uncovered during discussion
- Team composition changed since last estimate

## T-Shirt Sizing

| Size | Points | Effort | Time Range | Example |
|------|--------|--------|------------|---------|
| XS | 1 | Trivial | < 4 hours | Bug fix, typo, config change |
| S | 2-3 | Small | 1-2 days | Single CRUD endpoint |
| M | 5-8 | Medium | 3-5 days | New feature with UI + API |
| L | 13 | Large | 1-2 weeks | Complex feature integration |
| XL | 21 | Very Large | 2-4 weeks | Multi-service feature |
| XXL | 40+ | Epic | > 1 month | Must split before sprint |

Best for: backlog triage, roadmap planning, initial estimates before refinement.

## Three-Point Estimation

```
Expected = (Optimistic + 4 × Most Likely + Pessimistic) / 6
Standard Deviation = (Pessimistic - Optimistic) / 6

Example:
  Optimistic (O): 2 days — everything goes perfectly
  Most Likely (M): 4 days — normal issues
  Pessimistic (P): 10 days — everything goes wrong

  E = (2 + 4×4 + 10) / 6 = 4.67 days
  SD = (10 - 2) / 6 = 1.33 days

  P(95%) = 4.67 + 1.645 × 1.33 = 6.86 days
```

Best for: high-accuracy estimates, critical tasks, individual assignments.

## Affinity Mapping

1. Write each story on a card
2. Team silently sorts cards into size groups
3. Groups are labeled with relative sizes (XS, S, M, L, XL)
4. Assign point values to each group
5. Review and adjust outliers

Best for: large backlogs (20+ stories), initial estimation session.

## Estimation Confidence Scale

| Level | Meaning | Variance |
|-------|---------|----------|
| High | Team has done this before, clear requirements | ±10% |
| Medium | New territory but scoped, some unknowns | ±25% |
| Low | Many unknowns, first time | ±50% |
| None | Cannot estimate | N/A — need spike |

## Velocity-Based Planning

```
Average velocity = sum of last 3 sprints / 3
Sprint capacity = average velocity × focus factor (0.6-0.8)

Example:
  Sprint 1: 42 points
  Sprint 2: 38 points
  Sprint 3: 45 points
  Average: 41.7 points
  Focus factor: 0.75
  Capacity: 41.7 × 0.75 = 31.3 points (commit to 30-32)
```

## Estimation Rules

- Estimates are ranges, not commitments — never treat as deadlines
- Velocity is a planning tool, not a performance metric
- If a story takes > 3 minutes to estimate, split it
- Re-estimate only when scope changes significantly
- Same team, same scale — do not compare point values across teams
- Include all work: development, testing, documentation, deployment
- Account for meetings, code review, and context switching in capacity
