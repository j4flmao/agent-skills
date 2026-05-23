# OKR Examples

## Company-Level OKRs

### Objective: Dominate the mid-market CRM space
| KR | Metric | Baseline | Target |
|----|--------|----------|--------|
| KR 1 | New MRR from mid-market | $500K | $1.2M |
| KR 2 | Mid-market customer count | 120 | 250 |
| KR 3 | Net Revenue Retention | 95% | 110% |
| KR 4 | Time-to-value (days) | 45 | 14 |

### Objective: Achieve industry-leading platform reliability
| KR | Metric | Baseline | Target |
|----|--------|----------|--------|
| KR 1 | Platform uptime (SLA) | 99.5% | 99.99% |
| KR 2 | P0 incident count per quarter | 6 | 0 |
| KR 3 | P95 API latency | 800ms | 200ms |
| KR 4 | Error budget burn rate | 30% | <10% |

## Engineering Team OKRs

### Objective: Ship the payment platform v2 on schedule
| KR | Metric | Baseline | Target |
|----|--------|----------|--------|
| KR 1 | Feature completion (% of scope) | 0% | 100% |
| KR 2 | Integration test coverage | 20% | 90% |
| KR 3 | P99 payment latency | 2s | 500ms |
| KR 4 | Payment success rate | 97% | 99.9% |

### Objective: Reduce engineering toil by 30%
| KR | Metric | Baseline | Target |
|----|--------|----------|--------|
| KR 1 | Manual deployments per week | 8 | 0 |
| KR 2 | Alert noise (daily alerts) | 200 | <20 |
| KR 3 | CI pipeline duration | 45 min | 10 min |
| KR 4 | PR merge time (p50) | 24h | 4h |

## Product Team OKRs

### Objective: Make onboarding delightful
| KR | Metric | Baseline | Target |
|----|--------|----------|--------|
| KR 1 | Time to first "aha moment" | 14 days | 3 days |
| KR 2 | Onboarding completion rate | 40% | 70% |
| KR 3 | User NPS (week 1) | 25 | 50 |
| KR 4 | Support tickets from new users | 200/month | <50/month |

### Objective: Launch mobile app with strong retention
| KR | Metric | Baseline | Target |
|----|--------|----------|--------|
| KR 1 | App Store rating | N/A | 4.5+ |
| KR 2 | D1 retention | N/A | 60% |
| KR 3 | D7 retention | N/A | 40% |
| KR 4 | Core action completion rate | N/A | 70% |

## OKR Writing Patterns

| Good KR | Bad KR | Why |
|---------|--------|-----|
| Increase NPS from 30 to 50 | Improve customer satisfaction | Second is not measurable |
| Reduce p95 latency from 800ms to 200ms | Make the app faster | Second has no target |
| Launch beta with 1000 active users | Launch beta | Missing success metric |
| Achieve 80% coverage on new code | Improve testing | Missing measurable target |
| Ship 3 partner integrations by end of Q2 | Integrate with partners | Missing number and deadline |

## Quarterly Scoring Retrospective

After each quarter, score KRs and write retro notes:

```
Objective: Ship the payment platform v2 on schedule
KR 1: Feature completion — 95% (score: 0.95)
  What went well: Core payment flow complete, 2 edge cases deferred
  What blocked: Third-party compliance review took 2 extra weeks
  Next time: Start compliance review in parallel with development

KR 2: Integration test coverage — 85% (score: 0.85)
  What went well: Strong coverage on critical payment paths
  What blocked: Setting up test environment for external provider
  Next time: Include test environment setup in sprint 1

KR 3: P99 payment latency — 450ms (score: 1.0)
  What went well: Query optimization and caching worked as designed
  What blocked: Nothing — this exceeded target

KR 4: Payment success rate — 99.5% (score: 0.5)
  What went well: Retry mechanism works for transient failures
  What blocked: Edge case with expired cards not handled
  Next time: Add card expiry webhook and pre-expiry notification
```

## OKR Cascade Example

```
Company: Dominate mid-market CRM space
  └─ Product: Make onboarding delightful
       └─ KR: Onboarding completion from 40% to 70%
  └─ Engineering: Ship payment platform v2
       └─ KR: Payment success rate from 97% to 99.9%
  └─ Sales: Close 130 new mid-market accounts
       └─ KR: Demo-to-close conversion from 20% to 35%
  └─ Marketing: Generate 1000 qualified leads
       └─ KR: MQL-to-SQL conversion from 10% to 25%
```
