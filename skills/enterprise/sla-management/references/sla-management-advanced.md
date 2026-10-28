# SLA Management Advanced: Portfolios, Dependency Alignment, Credits, Regulation

Managing SLAs across many services, customers, and suppliers: tiered SLA portfolios, aligning OLAs and underpinning contracts with customer commitments, automated credit calculation, breach governance, regulatory requirements, and experience-level agreements. Basics are in `sla-management-fundamentals.md`.

## 1. Tiered SLA Portfolio

| Tier | Availability SLA | Support (Sev 1 response) | RPO / RTO | Price driver |
|---|---|---|---|---|
| Standard | 99.5% | Next business day | 24 h / 24 h | Single region, business-hours support |
| Business | 99.9% | 1 h, 24×7 | 1 h / 4 h | Multi-AZ, 24×7 on-call |
| Enterprise | 99.95% | 15 min, 24×7, named contacts | 15 min / 1 h | Multi-region, dedicated support |

Each tier maps to concrete architecture and staffing; a sales exception that promises Enterprise terms on Standard infrastructure is a risk to log and approve explicitly.

Maintain an SLA catalogue (service, tier, metrics, exclusions, dependencies, owner, contract references) as the single source for sales, support, and engineering.

## 2. Aligning the Dependency Chain

```
Customer SLA 99.9%
  └── Service SLO 99.95%
        ├── OLA: platform team (Kubernetes) 99.97%
        ├── OLA: database team 99.98%
        ├── UC: cloud provider compute SLA (per provider terms)
        └── UC: payment provider 99.95% + documented fallback
```

Rules:
- Every critical dependency has an OLA or UC at least as strict as the share of error budget allocated to it.
- Where a supplier's SLA is weaker than needed, add architecture mitigations (redundancy, fallback provider, queueing) rather than accepting the gap silently.
- Supplier credits rarely cover your losses or your customer credits; treat supplier SLAs as signals of expected reliability, not insurance.

Error budget allocation example (99.95% service SLO = 21.6 min per 30 days):

| Source | Allocation |
|---|---|
| Own deployments and bugs | 40% |
| Platform dependencies | 30% |
| External providers | 20% |
| Unallocated reserve | 10% |

## 3. Automated SLA Calculation and Credits

```python
from __future__ import annotations
from dataclasses import dataclass
from decimal import Decimal

@dataclass(frozen=True, slots=True)
class CreditTier:
    below: Decimal      # availability strictly below this value
    credit_pct: Decimal

TIERS = (CreditTier(Decimal("95.0"), Decimal("100")),
         CreditTier(Decimal("99.0"), Decimal("25")),
         CreditTier(Decimal("99.9"), Decimal("10")))

def monthly_availability(total_minutes: int, bad_minutes: int, excluded_minutes: int) -> Decimal:
    eligible = total_minutes - excluded_minutes
    if eligible <= 0:
        raise ValueError(f"no eligible minutes: total={total_minutes} excluded={excluded_minutes}")
    return (Decimal(eligible - bad_minutes) / Decimal(eligible) * 100).quantize(Decimal("0.001"))

def credit_percent(availability: Decimal) -> Decimal:
    for tier in TIERS:                          # ordered from most severe
        if availability < tier.below:
            return tier.credit_pct
    return Decimal("0")

def credit_amount(fee: Decimal, availability: Decimal, cap_pct: Decimal = Decimal("100")) -> Decimal:
    pct = min(credit_percent(availability), cap_pct)
    return (fee * pct / 100).quantize(Decimal("0.01"))
```

Unit tests must cover boundary values (exactly 99.9%, exactly 95.0%), zero eligible minutes, and full-month exclusions. Use `Decimal`, not floats, for contractual calculations.

Data pipeline: SLI measurements → per-customer, per-service minute/request ledgers → monthly availability → credit calculation → finance system. Keep the raw measurements for the contractual dispute period.

## 4. Proactive vs Claim-Based Credits

| Model | Pros | Cons |
|---|---|---|
| Customer must claim | Lower payout, standard in cloud contracts | Customer frustration; reputational cost |
| Automatic credits | Trust, simpler support | Higher payout; requires accurate per-customer measurement |

Enterprise contracts increasingly request automatic credits and reporting; price that in.

## 5. Breach Governance

1. Detect: SLO burn alerts fire well before SLA thresholds.
2. Incident management with customer communication per the SLA's update cadence.
3. Determine SLA impact per affected customer and tier.
4. Post-incident review with corrective actions and owners.
5. Credit processing and customer report.
6. Track repeated breaches: many contracts give termination rights after N breaches in a period; flag accounts at risk to account management.

## 6. Contract Clauses to Watch

| Clause | Risk |
|---|---|
| Uncapped credits or credits beyond the affected service | Financial exposure exceeding revenue |
| Liquidated damages / penalties instead of credits | Larger, harder-to-predict liability |
| Termination for chronic SLA failure | Revenue loss |
| Customer-chosen measurement source | Disputes over data |
| Maintenance exclusions without limits | Customer pushback; may be unenforceable as written |
| RPO/RTO commitments | Require tested DR, not just backups |

Legal and engineering review together; engineers confirm the architecture can meet each number.

## 7. Regulatory Context

- Financial sector in the EU: the Digital Operational Resilience Act (DORA, applicable since January 2025) requires contractual provisions with ICT third-party providers, including service level descriptions with precise quantitative and qualitative performance targets, incident support, and exit strategies.
- Outsourcing guidelines from financial regulators (e.g. EBA guidelines on outsourcing) require measurable service levels and monitoring for critical functions.
- Healthcare, public sector, and telecom regulations may impose availability or incident-reporting obligations.

Map regulated customers' requirements into the SLA catalogue so commitments and evidence (reports, audit logs) exist.

## 8. Experience-Level Agreements (XLAs)

XLAs supplement technical SLAs with user-experience outcomes (task success, satisfaction, digital experience scores). Use them internally or with customers where uptime is met but users still suffer (slow pages, failed workflows). Measure via real-user monitoring and surveys, and keep definitions as precise as SLA metrics.

## 9. Reporting at Scale

- Per-customer monthly reports generated from the same ledger used for credits.
- Internal portfolio dashboard: SLA attainment by service/tier, breaches, credits paid, at-risk accounts.
- Status page history linked to SLA reports for transparency.

## Pitfalls

- Sales promising custom SLAs without engineering sign-off or a catalogue entry.
- Credit calculation in spreadsheets with float arithmetic and no audit trail.
- Supplier SLAs weaker than customer commitments with no mitigation.
- Regulatory requirements discovered during an audit instead of at contract time.

## Checklist

- [ ] Tiered SLA catalogue with architecture and staffing mapped to each tier.
- [ ] OLAs/UCs aligned with allocated error budgets; gaps mitigated.
- [ ] Automated, tested credit calculation from auditable measurements.
- [ ] Breach governance and at-risk account tracking.
- [ ] Contract clause review by legal and engineering.
- [ ] Regulatory requirements (e.g. DORA) mapped per customer segment.
