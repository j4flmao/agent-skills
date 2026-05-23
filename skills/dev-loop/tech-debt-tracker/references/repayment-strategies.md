# Tech Debt Repayment Strategies

## Repayment Approaches

### 1. The Boy Scout Rule

Leave the codebase cleaner than you found it. Make small improvements whenever you touch a file.

```typescript
// While fixing a bug in UserService, you notice:
// Old (before fix): hardcoded, duplicated logic
function calculateDiscount(user: User, total: number) {
  if (user.role === 'premium') return total * 0.2   // Magic number
  if (user.role === 'vip') return total * 0.25       // Magic number
  return 0
}

// While fixing, extract constant
const DISCOUNT_RATES: Record<string, number> = {
  premium: 0.2,
  vip: 0.25,
}

function calculateDiscount(user: User, total: number) {
  return total * (DISCOUNT_RATES[user.role] || 0)
}
```

**Best for:** Dead code, magic numbers, small naming issues
**Cost:** 5-15 minutes per file
**Rule:** Only improve files you're already modifying for other reasons

### 2. Dedicated Debt Sprints

Every 3-4 sprints, allocate a full sprint exclusively for debt reduction.

```markdown
## Debt Sprint Planning

### Sprint Goal: Reduce top 5 debt items by ROI

### Selected Items:
1. D-001: Extract UserService (principal: 6h, ROI: 2.5)
2. D-002: Add missing error handling to payment flow (principal: 4h, ROI: 1.8)
3. D-005: Consolidate duplicate validation logic (principal: 5h, ROI: 1.2)
4. D-008: Replace deprecated ORM queries (principal: 8h, ROI: 0.9)
5. D-012: Fix flaky integration test (principal: 3h, ROI: 0.7)

### Total principal: 26 hours
### Available capacity: 40 hours (5 devs × 1 day each)
### Buffer: 14 hours for unexpected issues
```

**Best for:** Large structural debt, architecture changes
**Frequency:** Every 4-6 sprints
**Output:** Measurable reduction in debt backlog items

### 3. Fix-as-You-Go

Integrate debt repayment into regular feature work. Every story includes debt reduction time.

```typescript
// Feature story breakdown
const STORY = {
  title: 'Add user export feature',
  points: 8,
  breakdown: {
    feature: 6,     // 75% feature work
    cleanup: 1,     // 12.5% incidental cleanup
    buffer: 1,      // 12.5% unexpected issues
  },
  cleanup_tasks: [
    'Rename ambiguous `getData()` method in UserRepository',
    'Remove dead `legacyExport()` function',
    'Add types to config module',
  ],
}
```

**Best for:** Small debt items, ongoing maintenance
**Cost:** 10-20% per story
**Risk:** Low — natural part of development

### 4. Debt Conversion

Convert high-interest debt items into structured spikes or refactoring tasks.

```
D-003: "Fix cache invalidation" → Sp-001: "Design cache strategy"
                                 → Sp-002: "Implement new cache layer"
                                 → Sp-003: "Migrate consumers"
```

**Best for:** Complex debt that needs investigation before action
**Cost:** Spikes are typically 1-3 days
**Output:** Technical design document + clear implementation plan

### 5. Automated Debt Reduction

Use automated tools to fix certain classes of debt at scale.

```json
{
  "automated_fixes": {
    "formatting": "prettier --write src/",
    "imports": "eslint --fix --rule 'unused-imports/no-unused-imports: error'",
    "deprecations": "ts-migrate --plugin deprecations",
    "type_gaps": "typescript --strict src/",
    "security": "npm audit fix"
  },
  "cadence": "weekly"
}
```

```bash
# Run automated fixes
npm run lint:fix
npm run format:fix
npm run remove-unused-exports

# Verify no behavior change
npm test
```

**Best for:** Code style, formatting, lint issues, deprecation warnings
**Cost:** Automated, minimal human time
**Output:** Instant improvement across the entire codebase

## Debt Repayment Workflow

### Step 1: Select Target

Pick debt items by ROI, urgency, or area of the codebase being actively developed.

```typescript
interface DebtSelectionStrategy {
  type: 'highest-roi' | 'area-focused' | 'blocking-only'
  filters: {
    maxPrincipal?: number    // Max hours to fix
    minROI?: number          // Minimum ROI threshold
    area?: string[]          // Focus on specific modules
  }
}
```

### Step 2: Plan the Fix

```markdown
# Debt Item: D-002 (Fix cache eviction)

## Current State
Cache has no TTL or eviction — grows unbounded, causes OOM after 2 weeks

## Target State
Cache uses LRU eviction with configurable max size and TTL per entry

## Implementation Plan
1. Add lru-cache dependency (npm install lru-cache)
2. Create CacheService wrapper with LRU + TTL
3. Replace all direct Map usage with CacheService
4. Add cache metrics (hit rate, size, eviction count)
5. Write tests for eviction behavior

## Effort
- Implementation: 3h
- Tests: 1h
- Review: 0.5h
- Total: 4.5h

## Risk Assessment
- Low: LRU cache is a well-understood pattern
- No schema or data changes
- All existing cache consumers have the same interface
```

### Step 3: Execute Small, Merge Fast

```bash
# One commit per logical step
git checkout -b fix/cache-eviction

# Step 1: Add dependency and wrapper
git commit -m "feat(cache): add LRU cache service with TTL support"

# Step 2: Replace consumers one module at a time
git commit -m "refactor(auth): use new CacheService for session storage"
git commit -m "refactor(api): use new CacheService for rate limiter"
git commit -m "refactor(payments): use new CacheService for idempotency keys"

# Step 3: Add metrics
git commit -m "feat(monitoring): add cache hit rate metrics"

# Keep PRs small (< 200 lines)
# Review and merge quickly to avoid merge conflicts
```

### Step 4: Verify

```typescript
// Before deployment
describe('CacheService', () => {
  it('evicts oldest entries when at capacity', () => {
    const cache = new CacheService({ maxSize: 3 })
    cache.set('a', 1); cache.set('b', 2); cache.set('c', 3)
    cache.set('d', 4)  // Should evict 'a'
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('d')).toBe(4)
  })

  it('expires entries after TTL', async () => {
    const cache = new CacheService({ ttlMs: 10 })
    cache.set('key', 'value')
    await sleep(20)
    expect(cache.get('key')).toBeUndefined()
  })
})

// Production verification
// 1. Deploy to staging, run load test
// 2. Check cache hit rate metric > 80%
// 3. Check memory usage stays bounded
// 4. Deploy to production with feature flag
```

### Step 5: Document

```markdown
## Debt Repayment Record

- **Item**: D-002 (Fix cache eviction)
- **Date**: 2026-05-14
- **Author**: @alice
- **PR**: #456
- **Before**: Unbounded Map cache, OOM after 2 weeks
- **After**: LRU cache with 1000-entry max, 5-minute TTL
- **Metrics**: Cache hit rate increased from 60% to 92%
- **ROI Realized**: 15 hours/week → 2 hours/week (saved 13h)
- **Principal Spent**: 4.5 hours
- **Net Benefit**: 13 hours/week saved for the team
```

## Debt Reduction Strategies by Type

| Debt Type | Best Strategy | Automation | Timeframe |
|-----------|--------------|------------|-----------|
| Code style violations | Automated fix | High | Minutes |
| Dead code | Boy Scout + automation | Medium | Inline with features |
| Missing types | Automated (ts-migrate) | High | Hours |
| Duplicate code | Refactoring sprint | Low | Days |
| Architecture violations | Strangler fig | Low | Weeks |
| Outdated dependencies | Dependabot + audit | High | Hours |
| Insufficient tests | Fix-as-you-go | Medium | Continuous |
| Performance debt | Dedicated sprint | Medium | Days |
| Security debt | Immediate fix | Low | Hours |
| Configuration drift | Infrastructure as code | High | Hours |

## Trajectory Tracking

```typescript
interface DebtSnapshot {
  date: string
  totalItems: number
  totalInterest: number  // hrs/week
  byQuadrant: {
    recklessInadvertent: number
    recklessIntentional: number
    prudentInadvertent: number
    prudentIntentional: number
  }
  topItems: string[]  // Top 5 by ROI
}

// Track quarterly:
// Q1 2026: 45 items, 120 hrs/week interest
// Q2 2026: 38 items, 95 hrs/week interest  (↓ 16%)
// Q3 2026: 32 items, 78 hrs/week interest  (↓ 18%)
// Target: < 20 items, < 50 hrs/week by Q4 2026
```

## Common Pitfalls

| Pitfall | Why It Fails | Better Approach |
|---------|-------------|-----------------|
| Allocating 0% for debt | Debt compounds, slows velocity | Always reserve 20% |
| Trying to fix everything | Burnout, never shipped | Use ROI to pick the best items |
| Big rewrite | Highest risk, longest feedback loop | Strangler fig, incremental |
| Only debt, no features | Product stagnation | 80/20 split: 80% features, 20% debt |
| No metrics | Cannot prove impact of debt reduction | Track interest hours/week quarterly |
| Developer-only priority | Misalignment with business goals | Include business risk in prioritization |
