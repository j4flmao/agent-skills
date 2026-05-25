# Technical Debt Management

## Debt Categorization

### Types of Technical Debt
| Type | Description | Example |
|------|-------------|---------|
| Code Debt | Poor code quality | Duplicated code, long methods |
| Architecture Debt | Structural issues | Missing abstraction layers, tight coupling |
| Test Debt | Insufficient test coverage | Missing unit tests, flaky tests |
| Documentation Debt | Outdated or missing docs | No API docs, stale README |
| Infrastructure Debt | Tech stack issues | Outdated dependencies, manual deployments |
| Knowledge Debt | Tribal knowledge | Undocumented processes, single points of failure |

## Measurement Framework

### Debt Quantification
```typescript
interface DebtItem {
  id: string
  type: DebtType
  severity: 'low' | 'medium' | 'high' | 'critical'
  estimatedEffort: number  // hours
  businessImpact: string
  technicalImpact: string
  discoveredAt: Date
  resolvedBy?: Date
}

interface DebtMetrics {
  totalItems: number
  totalEffort: number
  criticalCount: number
  debtRatio: number  // debt hours / feature hours
  trendDirection: 'improving' | 'worsening' | 'stable'
}
```

### Key Metrics
- Debt ratio: < 20% healthy, 20-40% concerning, > 40% critical
- Resolution rate: items resolved per sprint
- Aging: average age of unresolved debt
- Impact score: severity x business impact

## Prioritization Matrix

### Effort vs Impact
```
              High Impact          Low Impact
High Effort   Strategic (Plan)     Deprioritize
Low Effort    Quick Wins (Do Now)  Delegate
```

### Rules of Thumb
- Fix critical security debt immediately
- Address quick wins within current sprint
- Plan strategic items for dedicated debt sprints
- Deprioritize low-impact items indefinitely

## Repayment Strategies

### Dedicated Debt Sprints
- Allocate 20% of each sprint to debt reduction
- Run quarterly debt-focused sprints (hackathons)
- Track debt repayment velocity

### Boy Scout Rule
- Leave code cleaner than you found it
- Small improvements compound over time
- Enforce for touched files during feature work

### Strangler Fig Pattern
- Gradually replace legacy components
- Route around old code incrementally
- Remove old code when new is validated

## Tracking Dashboard

```yaml
# .github/debt-metrics.yml
metrics:
  - name: debt_ratio
    target: < 20%
    current: 35%
    trend: worsening
  - name: critical_items
    target: 0
    current: 12
    trend: improving
  - name: avg_resolution_time
    target: 5 days
    current: 12 days
    trend: stable
```

## Team Culture

### Practices
- Include debt in sprint planning
- Review debt metrics in retrospectives
- Celebrate debt repayment wins
- Pair experienced devs with juniors for legacy code
- Document architectural decisions with ADRs
