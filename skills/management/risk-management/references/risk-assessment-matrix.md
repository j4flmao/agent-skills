# Risk Assessment Matrix

## 5×5 Probability-Impact Matrix

| Probability ↓ | Impact → 1 (Negligible) | 2 (Minor) | 3 (Moderate) | 4 (Major) | 5 (Critical) |
|---------------|------------------------|------------|--------------|------------|---------------|
| **5** (Almost certain >90%) | 5 Low | 10 Medium | 15 High | 20 High | 25 High |
| **4** (Likely 50-90%) | 4 Low | 8 Medium | 12 Medium | 16 High | 20 High |
| **3** (Possible 25-50%) | 3 Low | 6 Medium | 9 Medium | 12 Medium | 15 High |
| **2** (Unlikely 10-25%) | 2 Low | 4 Low | 6 Medium | 8 Medium | 10 Medium |
| **1** (Rare <10%) | 1 Low | 2 Low | 3 Low | 4 Low | 5 Low |

## Probability Scale

| Score | Label | Definition | Frequency |
|-------|-------|------------|-----------|
| 1 | Rare | May occur only in exceptional circumstances | <10% chance |
| 2 | Unlikely | Could occur at some point | 10-25% chance |
| 3 | Possible | Might occur at some point | 25-50% chance |
| 4 | Likely | Will probably occur in most circumstances | 50-90% chance |
| 5 | Almost certain | Expected to occur in most circumstances | >90% chance |

## Impact Scale

| Score | Label | Schedule | Cost | Quality | Reputation |
|-------|-------|----------|------|---------|------------|
| 1 | Negligible | <1 day slip | <$1K | Barely noticeable | No impact |
| 2 | Minor | 1-5 day slip | $1K-10K | Minor feature affected | Internal awareness |
| 3 | Moderate | 1-2 week slip | $10K-100K | Major feature reduced | Customer complaints |
| 4 | Major | 2-4 week slip | $100K-1M | Critical feature broken | Negative press |
| 5 | Critical | >1 month delay | >$1M | Product failure | Regulatory action |

## Risk Categories

| Category | Examples | Typical Impact |
|----------|----------|---------------|
| Technical | Tech debt, performance, architecture | 3-4 |
| Schedule | Timeline pressure, dependencies | 2-4 |
| Resource | Staffing, skill gaps, turnover | 2-4 |
| Scope | Feature creep, unclear requirements | 2-3 |
| External | Vendor, regulatory, market | 3-5 |
| Security | Vulnerabilities, breaches | 4-5 |
| Operational | Deployment, monitoring, incidents | 3-4 |
| Financial | Budget overrun, cost changes | 3-4 |

## Risk Scoring Rules

- Score = Probability × Impact (1-25)
- High (15-25): Immediate action, weekly monitoring, escalation defined
- Medium (6-14): Assign owner, mitigation plan, monitor at sprint retro
- Low (1-5): Log and accept, review quarterly
- Any risk with Impact 5 (Critical) is automatically escalated regardless of probability
- Any risk with Probability 5 (Almost certain) and Impact 4+ requires contingency plan

## Risk Assessment Template

```
Risk ID: R-{NNN}
Date Identified: {YYYY-MM-DD}
Category: {technical / schedule / resource / scope / external / security / operational / financial}

Description:
{Clear description of the risk event}

Cause:
{What would cause this risk to materialize}

Consequence:
{What happens if the risk materializes}

Assessment:
- Probability: {1-5} — {justification}
- Impact: {1-5} — {justification}
- Score: {P × I}
- Priority: {High / Medium / Low}

Owner: {Name}
Review Date: {YYYY-MM-DD}
Status: {Active / Monitoring / Closed / Archived}
```

## Automated Risk Scoring

For continuous risk assessment, calculate risk scores programmatically:

```python
def calculate_risk_score(probability, impact):
    score = probability * impact
    if score >= 15:
        return "High"
    elif score >= 6:
        return "Medium"
    else:
        return "Low"

def assess_priority(impact, probability, exploit_available):
    if impact >= 4 and exploit_available:
        return "Immediate escalation required"
    return calculate_risk_score(probability, impact)
```

## Risk Trend Analysis

Track risk scores over time to measure mitigation effectiveness:

```
Period     | Total Risks | Total Score | High Count | Trend
-----------|-------------|-------------|------------|------
Q1 2026    | 15          | 156         | 4          | —
Q2 2026    | 14          | 118         | 3          | ↓24%
Q3 2026    | 12          | 92          | 2          | ↓22%
Q4 2026    | 13          | 74          | 1          | ↓20%

Target: <100 total score, <2 high risks
```
