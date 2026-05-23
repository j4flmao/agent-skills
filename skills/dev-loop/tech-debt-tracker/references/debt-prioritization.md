# Tech Debt Prioritization

## Prioritization Models

### ROI-Based Prioritization

The primary model for prioritizing tech debt items.

```
ROI = Weekly Interest (hours) / Principal (hours)

Weekly Interest = Devs_Affected × Encounters_Per_Week × Hours_Wasted_Per_Encounter
Principal = Code_Changes + Test_Updates + Dependent_Refactors + Review + Deploy
```

| ROI Range | Priority | Action |
|-----------|----------|--------|
| > 2.0 | Emergency | Schedule immediately — ROI < 3 days |
| 1.0 - 2.0 | High | Next sprint — pays for itself in 1-2 weeks |
| 0.33 - 1.0 | Medium | Schedule within 1-2 sprints |
| 0.1 - 0.33 | Low | Backlog — review quarterly |
| < 0.1 | Accept | Not worth fixing — document decision |

### Example Calculation

```
Item: "Refactor UserService — 500 lines, 11 responsibilities"
Devs affected: 6 (entire backend team)
Encounters per week: 5 (touched in most feature work)
Hours wasted per encounter: 0.5 (30 min to find the right method)

Interest = 6 × 5 × 0.5 = 15 hours/week
Principal = 16h (code) + 4h (tests) + 2h (review) = 22 hours
ROI = 15 / 22 = 0.68

Decision: Medium priority. Fix in the next sprint.
```

## Quadrant Prioritization

### Cunningham's Debt Quadrant

```
                     Intentional                  Inadvertent
     ┌───────────────────────────────┬───────────────────────────────┐
     │                               │                               │
Reck │  Priority: High              │  Priority: Critical           │
less │  "We cut corners knowingly"  │  "We didn't know better"      │
     │  ROI: 1.0 - 2.0             │  ROI: > 2.0                   │
     │  Action: Fix this sprint     │  Action: Fix immediately      │
     │                               │                               │
     ├───────────────────────────────┼───────────────────────────────┤
     │                               │                               │
 Pru  │  Priority: Low               │  Priority: Medium             │
dent │  "We'll fix it later"        │  "Now we know better"         │
     │  ROI: 0.1 - 0.33            │  ROI: 0.33 - 1.0              │
     │  Action: Document, defer     │  Action: Schedule in 1-2 spr  │
     │                               │                               │
     └───────────────────────────────┴───────────────────────────────┘
```

### Triage Order

1. **Reckless & Inadvertent** (Critical) — Most dangerous: team doesn't even know they're creating debt
2. **Reckless & Intentional** (High) — Expensive shortcuts the team knowingly took
3. **Prudent & Inadvertent** (Medium) — Code that was correct but became wrong as understanding evolved
4. **Prudent & Intentional** (Low) — Deliberate deferrals with known plans to revisit

## Multi-Factor Scoring

For more nuanced prioritization, combine multiple factors:

### Scorecard (1-5 scale per factor)

| Factor | Weight | Description |
|--------|--------|-------------|
| Developer Impact | 3x | How many developers does this affect daily? |
| User Impact | 3x | Does this debt affect end-user experience? |
| Business Risk | 4x | Could this debt cause a production incident? |
| Fix Difficulty | 1x | How hard is the fix? (inverse: easier = better) |
| Strategic Fit | 2x | Does the fix align with upcoming work? |
| Time Sensitivity | 2x | Is this blocking feature work right now? |

### Scoring Template

```typescript
// Score each item
interface DebtScore {
  developerImpact: 1 | 2 | 3 | 4 | 5  // 5 = affects entire team daily
  userImpact: 1 | 2 | 3 | 4 | 5        // 5 = visible performance/UX problem
  businessRisk: 1 | 2 | 3 | 4 | 5       // 5 = likely to cause P0 incident
  fixDifficulty: 1 | 2 | 3 | 4 | 5      // 5 = takes weeks to fix (inverse)
  strategicFit: 1 | 2 | 3 | 4 | 5       // 5 = aligns with current roadmap
  timeSensitivity: 1 | 2 | 3 | 4 | 5    // 5 = blocking feature work now
}

function calculatePriority(score: DebtScore): number {
  return (
    score.developerImpact * 3 +
    score.userImpact * 3 +
    score.businessRisk * 4 +
    (6 - score.fixDifficulty) * 1 +  // Inverse: easier = higher score
    score.strategicFit * 2 +
    score.timeSensitivity * 2
  ) / 15  // Normalized to 1-10 scale
}
```

## Cost of Delay

### Weighted Shortest Job First (WSJF)

```
WSJF = Cost of Delay / Job Size

Cost of Delay = Business Value + Time Criticality + Risk Reduction
Job Size = Estimated effort in ideal days
```

```typescript
interface WSJFInput {
  businessValue: 1 | 2 | 3 | 4 | 5     // Revenue, user satisfaction
  timeCriticality: 1 | 2 | 3 | 4 | 5    // Deadline, window of opportunity
  riskReduction: 1 | 2 | 3 | 4 | 5       // Error reduction, compliance
  jobSize: number                        // Ideal days to fix
}

function calculateWSJF(input: WSJFInput): number {
  const costOfDelay = input.businessValue + input.timeCriticality + input.riskReduction
  return costOfDelay / input.jobSize
}
```

## Sprint Allocation

### 20% Rule

Reserve 20% of sprint capacity for tech debt:

```
Sprint: 2 weeks × 5 devs = 50 person-days
Debt reserve: 10 person-days (20%)
Feature work: 40 person-days (80%)
```

### Capacity Calculator

```typescript
interface SprintAllocation {
  totalDevDays: number
  debtPercentage: number  // Typically 20%
  carryover: number       // Unused debt time from previous sprint
}

function allocateDebtCapacity(allocation: SprintAllocation): number {
  return Math.floor(allocation.totalDevDays * (allocation.debtPercentage / 100)) + allocation.carryover
}

// Example: 5 devs × 10 days = 50 days, 20% = 10 days for debt
```

## Backlog Management

### Debt Backlog Template

| ID | Title | Quadrant | ROI | Interest (hrs/wk) | Principal (hrs) | WSJF | Status |
|----|-------|----------|-----|-------------------|-----------------|------|--------|
| D-001 | Extract UserService | R-I | 2.5 | 15 | 6 | 4.2 | Scheduled |
| D-002 | Fix cache eviction | R-V | 1.8 | 8 | 4.5 | 3.1 | In progress |
| D-003 | Remove dead code paths | P-I | 0.4 | 2 | 5 | 0.8 | Backlog |
| D-004 | Add type safety to config | P-V | 0.1 | 0.5 | 6 | 0.2 | Accepted |

### Debt Sprints

Every Nth sprint is a dedicated "debt sprint" (typically every 4th sprint):

```markdown
## Sprint 12: Debt Reduction Sprint

### Goal: Reduce technical debt by 40 hours

### Selected Items (by ROI):
1. D-001: Extract UserService (6h)
2. D-002: Fix cache eviction (4.5h)
3. D-005: Add request validation middleware (3h)
4. D-008: Remove deprecated API v1 code (8h)

### Don't touch:
- D-003 (ROI too low)
- D-004 (too risky, schedule separate spike)
```

## Governance

### Debt Review Cadence

| Frequency | Activity | Participants |
|-----------|----------|-------------|
| Weekly (15 min) | Triage new debt items | Tech lead + senior devs |
| Monthly (30 min) | Review debt backlog, adjust priorities | Full team |
| Quarterly (1 hour) | Deep review: trends, new categories, strategy | Engineering leadership |

### Debt Policies

- **New feature debt allowance**: Every feature story allocates 10% for incidental cleanup
- **Boy Scout rule**: Leave the code cleaner than you found it (make small improvements while working in an area)
- **No-go zones**: Security, data integrity, and payment-related debt is always critical priority
- **Acceptance criteria**: Debt items below 0.1 ROI are formally accepted and documented
- **Blocking debt**: Items that block feature work automatically get expedited priority
