# Prioritization Models for Roadmapping

## Overview
Prioritization is the discipline of ordering initiatives by their expected value given constraints (capacity, dependencies, strategic alignment). No single model fits all situations — the right model depends on data availability, decision frequency, and organizational maturity.

## Model Selection Guide

| Model | Data Required | Effort | Best For | Limitations |
|-------|--------------|--------|----------|-------------|
| RICE | Quantitative estimates | Medium | Feature prioritization | Confidence can be gamed |
| WSJF | Relative comparisons | Medium | SAFe, value-per-unit-time | Abstract factors hard to estimate |
| MoSCoW | Expert judgment | Low | Timeboxed releases | Subjective, no ranking within buckets |
| Kano Model | User research | High | Customer satisfaction features | Requires survey data |
| ICE | Rough 1-10 scores | Very low | Rapid triage | Imprecise |
| Opportunity Scoring | User research | High | Product gaps | Requires user interviews |
| Effort-Impact Matrix | Relative estimates | Low | Quick alignment | Binary categories lose nuance |

## RICE Framework (Detailed)

### Scoring Formula
```
RICE Score = (Reach × Impact × Confidence) / Effort
```

### Factor Calibration

#### Reach (number of users/consumers per time period)
| Score | Definition | Examples |
|-------|------------|----------|
| Mass (10) | Affects all or most users | 10,000+ consumers |
| Large (7) | Affects a significant segment | 1,000-10,000 consumers |
| Medium (5) | Affects a moderate segment | 100-1,000 consumers |
| Small (3) | Affects a small segment | 10-100 consumers |
| Tiny (1) | Affects very few | 1-10 consumers |

#### Impact (how much this moves the needle)
| Score | Definition | Example |
|-------|------------|---------|
| Massive (3x) | Transformative effect | New revenue stream |
| High (2x) | Significant improvement | 50% reduction in error rate |
| Medium (1x) | Moderate improvement | 20% faster load time |
| Low (0.5x) | Minor improvement | Cosmetic change |
| Minimal (0.25x) | Negligible | Internal tooling polish |

#### Confidence (how sure we are about our estimates)
| Score | Definition | Example |
|-------|------------|---------|
| High (100%) | Supported by data | A/B test results |
| Medium (80%) | Supported by strong proxy | Similar feature's metrics |
| Low (50%) | Expert opinion only | Team estimation |
| Wild guess (20%) | Pure speculation | "We think it might help" |

#### Effort (person-months or story points)
Use a consistent unit. If using relative sizing (story points), normalize across teams.

### RICE Calculator
```python
class RICEScorer:
    def score(self, initiative: dict) -> dict:
        reach = initiative["reach"]
        impact = initiative["impact"]    # 0.25 to 3.0
        confidence = initiative["confidence"]  # 0.2 to 1.0
        effort = initiative["effort"]     # person-months

        raw_score = (reach * impact * confidence) / max(effort, 0.5)
        normalized = round(raw_score, 1)

        return {
            "initiative": initiative["name"],
            "score": normalized,
            "breakdown": {
                "reach": f"{reach} users/mo",
                "impact": f"{impact}x",
                "confidence": f"{confidence*100:.0f}%",
                "effort": f"{effort} person-months",
            },
        }

    def rank(self, initiatives: list[dict]) -> list[dict]:
        scored = [self.score(i) for i in initiatives]
        return sorted(scored, key=lambda x: x["score"], reverse=True)
```

### RICE Example
```yaml
initiative_a:
  name: "TypeScript SDK v2"
  reach: 5000   # developers/month
  impact: 2.0   # high — reduces integration time significantly
  confidence: 0.80  # medium-high — validated by dev interviews
  effort: 3     # person-months
  score: (5000 × 2.0 × 0.80) / 3 = 2667

initiative_b:
  name: "Multi-region deployment"
  reach: 2000   # active consumers
  impact: 1.5   # medium-high — improves reliability
  confidence: 0.60  # medium — need validation of revenue impact
  effort: 6     # person-months
  score: (2000 × 1.5 × 0.60) / 6 = 300

initiative_c:
  name: "Developer portal redesign"
  reach: 500    # new developers/month
  impact: 1.0   # medium — nice improvement
  confidence: 0.50  # low — unclear ROI
  effort: 8     # person-months
  score: (500 × 1.0 × 0.50) / 8 = 31

# Ranked: A (2667) > B (300) > C (31)
```

## WSJF Framework (Detailed)

### WSJF Formula
```
WSJF = (Business Value + Time Criticality + Risk Reduction/Opportunity Enablement) / Job Size
```

### Factor Definitions (SAFe Standard)

#### Business Value
| Score | Definition |
|-------|------------|
| 1 | Minimal business value |
| 2 | Marginal improvement to existing capability |
| 3 | Noticeable improvement or cost savings |
| 5 | Significant revenue increase or cost reduction |
| 8 | Major new revenue stream or competitive advantage |
| 13 | Transformative business impact |

#### Time Criticality
| Score | Definition |
|-------|------------|
| 1 | No time sensitivity |
| 2 | Can wait indefinitely |
| 3 | Moderate window — delay reduces value slowly |
| 5 | Time-limited window — delay significantly reduces value |
| 8 | Fixed deadline approaching — delay has major cost |
| 13 | Critical deadline past — delay has severe consequences |

#### Risk Reduction / Opportunity Enablement
| Score | Definition |
|-------|------------|
| 1 | No risk reduction or opportunity enablement |
| 2 | Minor risk reduction |
| 3 | Moderate risk reduction |
| 5 | Significant risk reduction or new capability unlocked |
| 8 | Major obstacle removed or major opportunity created |
| 13 | Critical risk removed or transformative opportunity |

#### Job Size (effort — inverse scale)
| Score | Effort |
|-------|--------|
| 1 | > 6 months |
| 2 | 3-6 months |
| 3 | 1-3 months |
| 5 | 2-4 weeks |
| 8 | 1-2 weeks |
| 13 | < 1 week |

### WSJF Calculation Example
```yaml
initiative: "API version v3 migration"
  business_value: 8   (major DX improvement, unblocks SDK work)
  time_criticality: 6 (v2 sunset deadline in 2 quarters)
  risk_reduction: 5   (security improvements, tech debt removal)
  job_size: 5   (5 sprints / 2.5 months)
  wsjf: (8 + 6 + 5) / 5 = 3.8

initiative: "Developer portal redesign"
  business_value: 5   (nice-to-have)
  time_criticality: 2 (no deadline)
  risk_reduction: 2   (cosmetic improvements)
  job_size: 8   (8 sprints / 4 months)
  wsjf: (5 + 2 + 2) / 8 = 1.125

initiative: "Security audit remediation"
  business_value: 5   (compliance requirement)
  time_criticality: 8 (audit deadline next quarter)
  risk_reduction: 13  (critical security findings)
  job_size: 3   (3 weeks)
  wsjf: (5 + 8 + 13) / 3 = 8.67
```

## MoSCoW Framework (Detailed)

### Allocation Guidelines
```yaml
moscow_allocation:
  must_have:
    allocation: 60% of effort
    criteria:
      - Legal or compliance requirement
      - Security vulnerability fix
      - Core functionality with no workaround
      - Blocking dependency for other initiatives
    validation:
      - "Without this, the release has no value"
      - "Without this, we cannot deliver on our OKR commitment"

  should_have:
    allocation: 20% of effort
    criteria:
      - Significant value but workaround exists
      - Important for user satisfaction
      - Non-critical feature requests
    validation:
      - "Without this, the release still has value"
      - "Would cause moderate dissatisfaction if missing"

  could_have:
    allocation: 20% of effort
    criteria:
      - Nice-to-have improvements
      - Low-effort enhancements
      - Cosmetic or polish items
    validation:
      - "Without this, release is still valuable"
      - "Easy to include if scope allows"

  wont_have:
    allocation: 0% (explicitly out of scope)
    criteria:
      - Deliberately deferred to next cycle
      - Important but lower priority than everything above
    validation:
      - Explicitly communicated as out of scope
      - No resources allocated
```

## Kano Model

### Satisfaction Dimensions
```
                        Satisfied
                            ↑
                            │
        Performance         │  Delighters
        (linear)            │  (excitement)
            ┌───────────────┼───────────────┐
            │               │               │
◄───────────┴───────────────┴───────────────┴───►
Not             │           │               Fully
Implemented     │           │               Implemented
            ┌───┴───────────┼───────────────┘
            │   Basic       │
            │   (expected)  │
            │               │
            ↓               │
        Dissatisfied        │
```

| Category | Definition | Customer Reaction If Missing | Customer Reaction If Present | Strategy |
|----------|------------|------------------------------|------------------------------|----------|
| Basic (Must-be) | Expected by default | Very dissatisfied | Neutral | Table stakes — must have |
| Performance (Linear) | More is better | Dissatisfied | Satisfied | Competitive differentiation |
| Delighter (Attractive) | Unexpected surprise | Neutral | Very satisfied | Competitive advantage |
| Indifferent | Not noticed | Neutral | Neutral | Skip |
| Reverse | Some users want, others don't | Varies | Varies | Segment-specific |

### Kano Survey Template
```
For each feature, ask two questions:
1. How would you feel if this feature IS present?
   (Like it / Expect it / Neutral / Tolerate / Dislike)
2. How would you feel if this feature is NOT present?
   (Like it / Expect it / Neutral / Tolerate / Dislike)

Classification Table:
                    | Dislike | Tolerate | Neutral | Expect | Like |
Not present ────────┼────────┼─────────┼─────────┼────────┼──────┤
Like it             │   ?    |    D    |    D    |   D    |  D   |
Expect it           │   B    |    ?    |    B    |   B    |  B   |
Neutral             │   B    |    ?    |    ?    |   ?    |  ?   |
Tolerate            │   B    |    ?    |    ?    |   ?    |  ?   |
Dislike             │   ?    |    B    |    P    |   P    |  P   |

D = Delighter, B = Basic, P = Performance, ? = Questionable/Indifferent
```

## ICE Framework

### Formula
```
ICE Score = Impact × Confidence × Ease
```

### Rapid Scoring (1-10 each)
```yaml
ice_scoring:
  impact:
    10: "Game-changing — massive improvement"
    7-9: "Significant improvement"
    4-6: "Moderate improvement"
    1-3: "Minor improvement"

  confidence:
    10: "Backed by data"
    7-9: "Strong evidence"
    4-6: "Some evidence or strong opinion"
    1-3: "Pure guess"

  ease:
    10: "Trivial — days, not weeks"
    7-9: "Straightforward — 1-2 weeks"
    4-6: "Moderate effort — 2-6 weeks"
    1-3: "Complex — 6+ weeks"
```

## Effort-Impact Matrix (2×2)

```
                   HIGH IMPACT
                   ┌─────────────────────┬─────────────────────┐
                   │   BIG BETS          │   QUICK WINS        │
                   │   • Multi-region    │   • Add sort param  │
                   │   • AI features     │   • Error msg fix   │
                   │   • New SDK         │   • Doc update      │
  HIGH EFFORT      ├─────────────────────┼─────────────────────┤  LOW EFFORT
                   │   MONEY PIT         │   FILL-INS          │
                   │   • Vaporware       │   • Logging fix     │
                   │   • Premature opt   │   • Rename endpoint │
                   │   • Over-engineer   │   • Add metric      │
                   └─────────────────────┴─────────────────────┘
                   LOW IMPACT
```

**Decision rules**:
- Quick wins: Do first — high impact, low effort
- Big bets: Plan carefully — high impact, high effort (validate assumptions first)
- Fill-ins: Do when capacity allows — low impact, low effort
- Money pits: Avoid or descope — low impact, high effort

## Combining Models

### Hybrid Approach: RICE + WSJF + Effort-Impact
```python
class HybridPrioritizer:
    def evaluate(self, initiatives: list[dict]) -> list[dict]:
        """
        Uses RICE for quantitative scoring,
        WSJF factors for strategic alignment,
        Effort-Impact matrix for visual communication.
        """
        results = []
        for initiative in initiatives:
            rice = self.compute_rice(initiative)
            wsjf = self.compute_wsjf(initiative)

            composite = {
                "name": initiative["name"],
                "rice_score": rice["score"],
                "wsjf_score": wsjf["score"],
                "composite_score": round(rice["score"] * 0.4 + wsjf["score"] * 0.6, 1),
                "effort_impact_quadrant": self.classify_quadrant(initiative),
                "risk_level": initiative.get("risk", "medium"),
                "dependency_count": len(initiative.get("dependencies", [])),
            }
            results.append(composite)

        return sorted(results, key=lambda x: x["composite_score"], reverse=True)

    def classify_quadrant(self, initiative: dict) -> str:
        effort = initiative.get("effort", 5)
        impact = initiative.get("impact_rating", 5)
        if effort >= 5 and impact >= 5:
            return "big_bet"
        if effort < 5 and impact >= 5:
            return "quick_win"
        if effort >= 5 and impact < 5:
            return "money_pit"
        return "fill_in"
```

## Prioritization Anti-Patterns

| Anti-Pattern | Symptom | Fix |
|-------------|---------|-----|
| HiPPO effect | Loudest voice decides | Use structured scoring models |
| All must-haves | Everything is P0 | Forced ranking with limited "must have" budget |
| Recency bias | Latest request jumps the queue | Queue-based triage, review cadence |
| Confirmation bias | Cherry-picking data for favored projects | Blind scoring, cross-functional review |
| Planning fallacy | Underestimating effort | Reference class forecasting, confidence scoring |
| Scope creep | Initiatives grow during execution | Freeze scope at planning, change request process |

## Key Points
- RICE combines reach, impact, confidence, and effort for quantitative prioritization
- WSJF maximizes value-per-unit-time using business value, time criticality, risk reduction ÷ job size
- MoSCoW allocates effort: 60% must-have, 20% should-have, 20% could-have, 0% won't-have
- Kano Model categorizes features: basic (expected), performance (linear), delighter (surprise)
- ICE (Impact × Confidence × Ease) enables rapid triage with 1-10 scores
- Effort-Impact 2x2 matrix classifies: quick wins, big bets, fill-ins, money pits
- Hybrid prioritization combines quantitative scores with qualitative judgment
- Anti-patterns (HiPPO, recency bias, confirmation bias) undermine prioritization rigor
- Model selection depends on data availability, decision frequency, and organizational maturity
- All models require calibration: anchor scores with concrete examples to reduce bias
