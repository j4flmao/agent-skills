# SLA Management Fundamentals

Service Level Agreements (SLAs) are commitments to customers with consequences; SLOs are internal targets; SLIs are the measurements. This reference covers the vocabulary, the anatomy of an SLA, availability math, measurement rules, and the basic management lifecycle. Detailed definition, negotiation, monitoring, and error-budget topics have their own references in this directory.

## 1. Vocabulary

| Term | Definition | Owner |
|---|---|---|
| SLI (indicator) | Measured ratio of good events to valid events (e.g. successful requests / all requests) | Engineering |
| SLO (objective) | Target for an SLI over a window (e.g. 99.9% over 30 days) | Engineering + product |
| SLA (agreement) | Contractual commitment, usually looser than the SLO, with remedies such as service credits | Business, legal, customer |
| OLA (operational level agreement) | Commitment between internal teams supporting a service | Internal teams |
| UC (underpinning contract) | Commitment from an external supplier the service depends on | Vendor management |
| Error budget | 1 − SLO: allowed unreliability in the window | Engineering + product |

Set the SLA below the SLO (e.g. SLO 99.95%, SLA 99.9%) so the team acts on SLO breaches before contractual breaches occur.

## 2. Anatomy of an SLA

| Section | Content |
|---|---|
| Service description | What is covered: components, regions, plans/tiers |
| Metrics | Precise definitions: availability, latency, support response, RPO/RTO where relevant |
| Measurement | Data source, measurement point (server-side, synthetic, client), aggregation window, time zone |
| Targets | Thresholds per metric and tier |
| Exclusions | Scheduled maintenance (with notice period), force majeure, customer-caused issues, beta features, third-party failures outside provider control |
| Remedies | Service credits table, claim process, deadline to claim, credit caps |
| Reporting | Frequency and format of SLA reports, access to status page |
| Support | Severity definitions, response and update times, escalation contacts |
| Responsibilities | Customer obligations (supported configurations, timely reporting) |
| Review and change | How SLA terms change, notice periods |

## 3. Availability Math

Allowed downtime:

| Target | Per 30-day month | Per year (365 days) |
|---|---|---|
| 99% | 7 h 12 min | 3.65 days |
| 99.5% | 3 h 36 min | 43.8 h |
| 99.9% | 43.2 min | 8.76 h |
| 99.95% | 21.6 min | 4.38 h |
| 99.99% | 4.32 min | 52.6 min |
| 99.999% | 25.9 s | 5.26 min |

Each extra nine is roughly ten times harder and usually much more expensive; commit only to what the architecture and operations can sustain.

## 4. Composite Availability

Serial dependencies multiply:

```
API (99.95%) → database (99.99%) → payment provider (99.9%)
Composite ≈ 0.9995 × 0.9999 × 0.999 = 0.9984  (≈ 99.84%)
```

Redundant components in parallel (independent failures):

```
Two regions each 99.9%: 1 − (0.001 × 0.001) = 0.999999 (theoretical)
```

The parallel result assumes independent failures and perfect failover; real systems share failure modes (deployments, DNS, control planes), so treat it as an upper bound. A service cannot promise more than its critical serial dependencies allow unless it has fallbacks for them.

## 5. Measurement Rules

Write these into the SLA, not just the dashboards:
- **Unit**: request-based (good requests / total) or time-based (minutes in which the service was available). Request-based reflects user experience under partial outages; time-based is easier to explain.
- **Definition of "down"**: e.g. a minute is unavailable if the error rate exceeds 5% or synthetic checks from two or more regions fail.
- **Window**: calendar month is common for SLAs; rolling 28/30 days for SLOs.
- **Source of truth**: provider monitoring, third-party synthetic monitoring, or both; how disputes are resolved.
- **Exclusions**: scheduled maintenance windows announced at least N days in advance, limited to a stated duration.

## 6. Service Credits

| Monthly availability | Credit (% of monthly fee for the affected service) |
|---|---|
| < 99.9% and ≥ 99.0% | 10% |
| < 99.0% and ≥ 95.0% | 25% |
| < 95.0% | 100% |

Values are an example structure; actual tiers are a commercial decision. Typical terms: customer must claim within a set number of days, credits apply to future invoices, credits are the sole remedy, and total credits are capped.

## 7. Lifecycle

```
Define (SLIs, SLOs, draft SLA) → Agree (negotiate, legal review) → Implement (monitoring, reporting)
      ↑                                                                        │
      └──────── Review (quarterly: performance, breaches, customer feedback) ◄──┘
```

| Activity | Cadence |
|---|---|
| SLO/SLA performance review | Monthly |
| Customer SLA reports | Monthly or per contract |
| Breach analysis and credit processing | Per breach |
| SLA catalogue review (targets, exclusions, dependencies) | Quarterly or annually |

## 8. Roles

| Role | Responsibility |
|---|---|
| Service owner | Accountable for meeting SLAs |
| SRE / operations | SLIs, monitoring, incident response |
| Service level manager | SLA catalogue, reporting, reviews (ITIL practice) |
| Legal / commercial | Contract terms, credits, liability |
| Vendor manager | Underpinning contracts aligned with customer SLAs |

## Pitfalls

- SLA equal to SLO: no warning before contractual breach.
- Vague metric definitions ("the service will be available") leading to disputes.
- Promising more nines than dependencies support.
- Measuring only from inside the data center, missing DNS/CDN/network failures customers see.

## Checklist

- [ ] SLIs precisely defined with data source and measurement point.
- [ ] SLOs stricter than SLAs.
- [ ] SLA document includes exclusions, credits, claim process, and reporting.
- [ ] Composite availability checked against dependencies and underpinning contracts.
- [ ] Review cadence and owners assigned.
