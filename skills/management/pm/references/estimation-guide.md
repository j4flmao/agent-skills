# Estimation Guide

## Planning Poker
- Each estimator holds cards: 0, 1, 2, 3, 5, 8, 13, 21, ?, ∞
- Discuss story, everyone reveals simultaneously
- Wide variance → discuss rationale → re-vote
- Consensus = final estimate

## T-shirt Sizing

| Size | Story Points | Effort Range | Example |
|------|-------------|--------------|---------|
| XS | 1 | < 1 day | Bug fix, typo, config change |
| S | 2-3 | 1-2 days | Simple CRUD endpoint |
| M | 5-8 | 3-5 days | New feature with UI + API |
| L | 13 | 1-2 weeks | Complex feature, multiple screens |
| XL | 21 | 2-4 weeks | Epic, needs splitting |
| XXL | > 21 | > 1 month | Must split before sprint |

## Three-Point Estimation
```
Expected effort = (Optimistic + 4 × Most Likely + Pessimistic) / 6
Example:
  Optimistic: 2d, Most Likely: 4d, Pessimistic: 8d
  E = (2 + 16 + 8) / 6 = 4.33d
  SD = (8 - 2) / 6 = 1d
  P(95%) = 4.33 + 1.645 × 1 = 5.97d
```

## Velocity Tracking
- Average of last 3 sprints
- Use for capacity planning, not performance evaluation
- Recalculate when team composition changes
