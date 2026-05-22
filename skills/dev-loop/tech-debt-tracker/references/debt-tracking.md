# Debt Tracking Reference

## Quadrant Model

| | Intentional | Inadvertent |
|---|---|---|
| **Reckless** | "We have no time for design" | "What's a design pattern?" |
| **Prudent** | "We'll refactor after the launch" | "Now we know how to do it right" |

Priority order: Reckless & Intentional → Reckless & Inadvertent → Prudent & Inadvertent → Prudent & Intentional

## Interest Calculation
```
Interest (hrs/week) = devs_affected × encounters_per_week × time_wasted_per_encounter
Principal (hrs) = fix_effort + test_effort + validation_effort
ROI = Interest / Principal
```

## Backlog Template
| ID | File | Debt Marker | Quadrant | Interest | Principal | ROI | Priority |
|---|---|---|---|---|---|---|---|
| D-001 | src/auth.ts:42 | TODO | Prudent-Inadvertent | 4 hrs/wk | 8 hrs | 0.5 | High |
| D-002 | src/db.ts:15 | HACK | Reckless-Intentional | 8 hrs/wk | 4 hrs | 2.0 | Critical |

## 20% Allocation Rule
- Sprint capacity = 10 days
- Debt reserve = 2 days
- Triage: pick highest ROI items within reserve
- Unused reserve rolls to next sprint

## Severity Definitions
- **Critical**: Blocks development. Workaround exists but is painful.
- **Major**: Slows development. Causes frequent context switches.
- **Minor**: Cosmetic. Code style, naming, legacy comments.
