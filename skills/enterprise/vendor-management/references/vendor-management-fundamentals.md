# Vendor Management Fundamentals

Vendor (third-party / supplier) management is the discipline of selecting, contracting, onboarding, governing and exiting external providers so they deliver value at acceptable risk and cost. This reference covers the lifecycle, vendor segmentation, roles, core documents and governance cadence. Selection, contract negotiation, performance and risk each have detailed sibling references.

## Vendor Lifecycle

```
Need identified -> Sourcing & selection -> Due diligence (risk, security, financial)
  -> Contracting -> Onboarding -> Operate & govern (performance, risk, relationship)
  -> Renewal / renegotiation -> Exit & offboarding
```

| Stage | Key outputs |
|---|---|
| Need | Business case, requirements, budget, build-vs-buy decision |
| Sourcing | Longlist/shortlist, RFI/RFP, scoring |
| Due diligence | Security questionnaire, certifications (ISO 27001, SOC 2), financial checks, sanctions screening |
| Contracting | MSA, SOW/order form, SLA, DPA, security schedule, exit clauses |
| Onboarding | Vendor record, access provisioning, integration, contacts, kickoff |
| Operate | KPIs/SLA reports, QBRs, issue/escalation log, invoices vs. contract |
| Renewal | Usage and value review, benchmark, negotiate or replace |
| Exit | Data return/deletion certificate, access revocation, knowledge transfer, final invoices |

## Segmentation (Tiering)

Not all vendors need the same effort. Tier by **criticality** and **risk**:

| Tier | Criteria | Governance |
|---|---|---|
| Tier 1 – Critical/strategic | Supports critical business services, handles sensitive data, hard to replace, high spend | Executive sponsor, monthly ops + quarterly business reviews, annual risk reassessment, exit plan tested |
| Tier 2 – Important | Moderate impact or data access | Quarterly reviews, risk reassessment every 1–2 years |
| Tier 3 – Low | Commodity, no sensitive data, easily replaced | Light-touch, review at renewal |

The Kraljic matrix (supply risk vs. profit impact) is a common lens for procurement strategy:
| Quadrant | Strategy |
|---|---|
| Strategic (high risk, high impact) | Partnership, long-term agreements, joint planning |
| Leverage (low risk, high impact) | Competitive bidding, volume leverage |
| Bottleneck (high risk, low impact) | Secure supply, find alternatives, buffer |
| Non-critical (low risk, low impact) | Simplify and automate purchasing |

## Roles and Responsibilities

| Role | Responsibility |
|---|---|
| Business owner | Defines need, owns value delivered and the relationship |
| Vendor manager | Runs governance cadence, tracks KPIs, issues, renewals |
| Procurement | Sourcing process, commercial negotiation, purchase orders |
| Legal | Contract terms, liability, IP, compliance |
| Security / privacy | Due diligence, DPA, ongoing security monitoring |
| Finance | Budgets, invoice validation, spend analysis |
| IT / architecture | Integration, technical fit, exit feasibility |

A RACI per lifecycle stage avoids gaps (e.g. nobody revoking access at exit).

## Core Documents

| Document | Purpose |
|---|---|
| Master Services Agreement (MSA) | Legal framework: liability, indemnity, IP, confidentiality, termination |
| Statement of Work (SOW) / order form | Specific scope, deliverables, milestones, fees |
| Service Level Agreement (SLA) | Measurable service commitments, measurement method, credits |
| Data Processing Agreement (DPA) | GDPR Art. 28 processor terms, sub-processors, transfers (SCCs) |
| Security schedule | Controls, audit rights, breach notification timelines |
| Business continuity / exit plan | Continuity commitments, transition assistance, data return |

## Vendor Inventory (minimum fields)

| Field | Example |
|---|---|
| Vendor, service, business owner | "Acme CRM", "Sales CRM", Head of Sales Ops |
| Tier | 1 |
| Contract dates, renewal notice period | Ends 2027-03-31, 90-day notice |
| Annual spend | From finance system |
| Data processed | Customer PII, EU residents |
| Critical services supported | Order intake |
| Certifications and last assessment | SOC 2 Type II, assessed 2026-05 |
| Sub-processors / fourth parties | Hosting provider |
| Exit strategy | Export API + alternate vendor identified |

Without a reliable inventory, renewals auto-renew unnoticed and risk assessments miss vendors ("shadow IT").

## Governance Cadence

| Meeting | Frequency | Content |
|---|---|---|
| Operational review | Weekly/monthly (Tier 1) | Incidents, tickets, SLA performance, upcoming changes |
| Quarterly business review (QBR) | Quarterly | KPIs, value delivered, roadmap, improvement plans, commercial topics |
| Executive review | Annually | Strategic alignment, relationship health, renewal strategy |
| Risk reassessment | Annually or on trigger (breach, M&A, scope change) | Updated questionnaires, certifications, financial health |

## Key Metrics
- SLA attainment and service credits.
- Incident count and severity attributable to the vendor.
- Spend vs. budget; invoice accuracy.
- Contract coverage (spend under contract), renewals handled before notice dates.
- Risk assessment currency (percent of Tier 1/2 vendors assessed on time).

## Common Pitfalls
- Auto-renewals missed because notice periods are not tracked.
- Contracts without measurable SLAs or exit assistance.
- Business teams buying SaaS outside procurement.
- Treating vendors adversarially, which reduces cooperation during incidents.
- No offboarding: accounts and data left with former vendors.

## Checklist
- [ ] Central vendor inventory with tier, owner, dates and data processed
- [ ] Tier-based due diligence and governance cadence
- [ ] RACI across the lifecycle
- [ ] MSA/SOW/SLA/DPA templates and security schedule
- [ ] Renewal calendar with notice-period alerts
- [ ] Exit and offboarding checklist used for every termination
