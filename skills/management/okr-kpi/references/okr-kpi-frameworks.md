# OKR vs KPI Frameworks

## Core Distinction

OKRs (Objectives and Key Results) and KPIs (Key Performance Indicators) serve different purposes and should never be conflated. OKRs are time-bound change targets for a specific quarter. KPIs are ongoing health metrics with no end date.

| Dimension | OKR | KPI |
|-----------|-----|-----|
| Purpose | Drive change | Monitor health |
| Timeframe | Quarterly | Ongoing |
| Target | Specific target value | Threshold range |
| Score | 0.0 to 1.0 | Green/Yellow/Red |
| Review | Weekly check, quarterly score | Monthly review |
| Cadence | Resets every quarter | Persistent |
| Ownership | One owner per KR | Shared ownership |

## OKR Setup Templates

### Company-Level OKR Template
```
Objective: {Inspirational qualitative goal}

KR 1: {Metric} from {baseline} to {target}
  Owner: {name} | Type: {committed/aspirational}
  Baseline: {current value} | Target: {quarter-end value}

KR 2: {Metric} from {baseline} to {target}
  Owner: {name} | Type: {committed/aspirational}

KR 3: {Metric} from {baseline} to {target}
  Owner: {name} | Type: {committed/aspirational}
```

### Team-Level OKR Derivation
```
Company KR: "Reduce P95 latency from 400ms to 150ms"

Team Objective: "Achieve industry-leading API response times"

KR 1: Reduce P95 API latency from 400ms to 150ms (platform)
KR 2: Increase cache hit rate from 70% to 95% (infra)
KR 3: Reduce database query time p99 from 200ms to 50ms (backend)
```

### Individual OKR Template
```
Objective: {team objective alignment statement}

KR 1: {personal contribution metric}
  Tracking: {tool/link}
  Confidence: {high/medium/low}

KR 2: {personal contribution metric}
  Tracking: {tool/link}
  Confidence: {high/medium/low}
```

## KPI Setup Templates

### KPI Definition Sheet
```
| KPI Name | Type | Baseline | Target | Frequency | Owner |
|----------|------|----------|--------|-----------|-------|
| Active Users | Leading | 10,000 | 12,000 | Daily | Product |
| Revenue | Lagging | $500K | $550K | Monthly | Finance |
| Uptime | Lagging | 99.9% | 99.95% | Real-time | Ops |
| NPS | Lagging | 42 | 50 | Quarterly | Product |
| Deployment Freq | Leading | 10/week | 15/week | Weekly | Eng |
```

### Leading vs Lagging Classification
```
Leading Indicators (predict future outcomes):
- Sign-ups per week
- Feature adoption rate
- Code review turnaround time
- P1 bugs opened
- Test coverage percentage

Lagging Indicators (measure past results):
- Quarterly revenue
- Customer retention rate
- Monthly churn
- Annual NPS
- Gross margin
```

## Tracking Tools and Cadence

### Weekly Check-in Template
```
| KR Name | Progress | Confidence | Blockers | Notes |
|---------|----------|------------|----------|-------|
| KR 1    | 65/100   | High       | None     | On track |
| KR 2    | 30/100   | Medium     | API delay| Mitigating |
| KR 3    | 10/100   | Low        | Need data| Blocked |
```

### Quarterly Scoring Rubric
```
Score 0.7-1.0 Green: Achieved — KR delivered as planned
Score 0.4-0.6 Yellow: Progress — partial achievement
Score 0.0-0.3 Red: At risk — minimal progress

Committed OKRs: target 1.0 across all KRs
Aspirational OKRs: target ~0.6 average across KRs
```

### Recommended Tools
```
OKR Tracking: Workboard, Gtmhub, Ally, Perdoo
KPI Dashboards: Tableau, Metabase, Grafana, Looker
Weekly Tracking: Google Sheets, Notion, Airtable
CI/CD Metrics: Datadog, Honeycomb, New Relic

Tool selection criteria:
- Team size (spreadsheets for <10, dedicated tools for 10+)
- Integration with existing stack
- Reporting automation needs
- Budget per seat
```

## Common Anti-Patterns

1. **KPI as OKR**: "Maintain 99.9% uptime" is a KPI, not an OKR. An OKR would be "Improve uptime from 99.9% to 99.99%".
2. **No baseline**: Every KR needs a measured starting point. Guessing the baseline invalidates the target.
3. **Too many objectives**: 3-4 objectives max per level. More than 5 dilutes focus.
4. **Copy-paste cascade**: Team KRs must translate, not copy company KRs. Same direction, different execution.
5. **Weekly scoring**: Scores are for quarterly review only. Weekly is about confidence and blockers.
6. **No retrospective**: Skipping the retro means repeating mistakes. Always document what enabled or blocked each KR.
7. **No KPI separation**: Mixing KPIs into the OKR sheet causes confusion. Keep them in separate documents.
