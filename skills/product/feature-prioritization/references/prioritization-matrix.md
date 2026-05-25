# Prioritization Matrix

## Frameworks Comparison

### RICE Scoring
```
RICE Score = (Reach × Impact × Confidence) / Effort

Reach: Users reached per quarter (absolute number)
Impact: 0.25x, 0.5x, 1x, 2x, 3x
Confidence: 20%, 50%, 80%, 100%
Effort: Person-months
```

### ICE Scoring
```
ICE Score = Impact × Confidence × Ease

Impact: 1-10
Confidence: 1-10
Ease: 1-10 (higher = easier)
```

### Value vs Effort Matrix
```
              High Value          Low Value
Low Effort    Do First            Quick Wins
High Effort   Strategic Invest    Avoid
```

## Weighted Scoring Model

### Template
```typescript
interface PrioritizationWeight {
  userImpact: number  // weight 0-100
  businessValue: number
  effort: number
  risk: number
  strategicAlignment: number
}

interface Feature {
  name: string
  scores: Record<string, number>  // 1-5 per criterion
  weightedScore: number
}
```

### Calculation
```
Weighted Score = (score1 × weight1 + score2 × weight2 + ...) / totalWeight

Example:
  User Impact: 4 × 25 = 100
  Business Value: 5 × 30 = 150
  Effort (inverse): 3 × 20 = 60
  Risk (inverse): 4 × 15 = 60
  Strategic Alignment: 5 × 10 = 50
  Total: 420 / 100 = 4.2
```

## Decision Frameworks

### Kano Model
| Feature Type | User Satisfaction if Present | User Dissatisfaction if Absent |
|-------------|------------------------------|--------------------------------|
| Basic | Neutral | Very dissatisfied |
| Performance | Proportional to quality | Proportional to absence |
| Delight | Very satisfied | Neutral |
| Indifferent | Neutral | Neutral |

### MoSCoW Method
| Priority | Meaning | % of Features |
|----------|---------|---------------|
| Must Have | Critical for launch | ~20% |
| Should Have | Important, not critical | ~30% |
| Could Have | Nice to have | ~30% |
| Won't Have | Explicitly out of scope | ~20% |

### Opportunity Scoring
```
Opportunity Score = Importance - Satisfaction
- Importance: "How important is this feature?" (1-10)
- Satisfaction: "How satisfied are you with current solution?" (1-10)
- Bigger gap = bigger opportunity
```

## Implementation

### Sprint Planning
- Top RICE/weighted features into upcoming sprint
- Ensure mix of Must Have and Should Have
- Reserve capacity for bugs and tech debt

### Quarterly Planning
- Review all scored features
- Align with OKRs and strategic themes
- Balance quick wins with strategic investments
- Communicate priorities to stakeholders
