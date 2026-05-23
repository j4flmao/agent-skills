# Roadmap Planning

## Roadmap Horizons

| Horizon | Timeframe | Certainty | Level of Detail | Review Cadence |
|---------|-----------|-----------|-----------------|----------------|
| Now | Current quarter | High | Detailed specs | Weekly |
| Next | 1 quarter ahead | Medium | Themes, epics | Monthly |
| Future | 2-4 quarters ahead | Low | Bets, objectives | Quarterly |
| Vision | 2+ years | Very Low | Direction, principles | Annually |

## Roadmap Structure

### Theme-Based Roadmap
```yaml
quarter: "Q2 2026"
themes:
  - name: "Onboarding Improvement"
    objective: "Reduce time-to-activation from 7 days to 2 days"
    bets:
      - "Guided setup wizard will increase activation"
      - "Sample data templates reduce time to value"
    epics:
      - "Build interactive onboarding wizard"
      - "Create industry-specific data templates"
      - "Add progress tracking for setup steps"
    metrics: ["activation_rate", "time_to_activation", "onboarding_completion"]
    
  - name: "AI Features"
    objective: "Ship 3 AI-powered features for competitive advantage"
    bets:
      - "AI search will improve user productivity"
      - "Smart recommendations will increase engagement"
    epics:
      - "Implement semantic search across all content"
      - "Build personalized recommendation engine"
    metrics: ["search_usage", "recommendation_click_rate"]
```

## Prioritization for Roadmap

### Quadrant Framework
```
High Impact, Low Effort: DO FIRST (Quick wins)
High Impact, High Effort: PLAN (Major initiatives)
Low Impact, Low Effort: DELEGATE (Chores, automation)
Low Impact, High Effort: DROP (Avoid)
```

### Scoring for Roadmap Selection
```python
def score_initiative(impact_score, effort_score, confidence, strategic_alignment):
    """Score an initiative for roadmap placement.
    
    impact_score: 1-10 (user value + business value)
    effort_score: 1-10 (higher = less effort)
    confidence: 0-1 (how sure we are about estimates)
    strategic_alignment: 1-10 (fits product strategy)
    """
    return (impact_score * 0.4 + effort_score * 0.2 + strategic_alignment * 0.4) * confidence
```

## Communication

### Roadmap Formats
```
Internal: Detailed board (Jira/Linear) with themes, epics, and owners
External: Simplified view (public) — themes and quarters only
Executive: One-pager with top 3 initiatives per quarter
Team: Detailed sprint breakdown from current horizon items
```

### Internal Roadmap Board
```yaml
columns:
  - "Now (Q2 2026)"
    items:
      - "Onboarding wizard"
      - "AI search"
      - "Performance optimization"
      
  - "Next (Q3 2026)"
    items:
      - "Mobile app"
      - "API marketplace"
      - "Enterprise SSO"
      
  - "Future (Q4 2026+)"
    items:
      - "Internationalization"
      - "Marketplace"
      - "Platform API"
```

## Review Process

### Monthly Review
```
1. Ship status: What shipped last month, what slipped
2. Metrics review: Are we moving the right numbers?
3. Market check: Any competitor moves, customer feedback?
4. Re-prioritize: Do any initiatives need to move between horizons?
5. Resource check: Do we have the right team capacity?
```

## Stakeholder Management

### Stakeholder Input Cadence
```
Weekly: Engineering leads (capacity, technical feasibility)
Monthly: Product team (prioritization, customer feedback)
Quarterly: Leadership (strategy, budget, major bets)
As needed: Customers (validation, pain points)
```

### Handling Requests
```
Incoming request → Triage → Score → Add to backlog → Prioritize → Schedule
    │                              │
    ▼                              ▼
  Auto-reply                     Roadmap slot
  (3 day SLA)                   (next quarter)
```
