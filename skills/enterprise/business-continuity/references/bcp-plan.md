# BCP Plan — Structure, BIA, Tier Matrix

## BCP Document Structure (standard sections)

```
1. Executive summary + scope
2. Roles + responsibilities (RACI)
3. Business Impact Analysis (BIA)
4. Service tier classification + RTO/RPO matrix
5. Dependency map (services, infra, vendors)
6. Failure scenarios + playbooks
7. Crisis communications plan
8. Vendor fallback inventory
9. Drill schedule + history
10. Insurance + regulatory alignment
11. Appendices (contact lists, account inventory, holding statements)
```

## BIA Template (per service)

| Field                       | Example                                     |
|-----------------------------|---------------------------------------------|
| Service name                | Checkout                                    |
| Owner (eng + business)      | @alice (eng) / @bob (commerce)              |
| Revenue per hour of outage  | $50,000                                     |
| Customers impacted          | 100,000 active                              |
| Regulatory exposure         | PCI-DSS                                     |
| Reputational impact (1–5)   | 5                                           |
| MAO (max acceptable outage) | 15 minutes                                  |
| Current RTO                 | 5 minutes                                   |
| Current RPO                 | 30 seconds                                  |
| Assigned tier               | Tier-1                                      |
| Critical dependencies       | payment-svc, inventory-svc, stripe, db-pay  |

Compute MAO by: `MAO = min(revenue_threshold_minutes, regulatory_max_outage, reputation_threshold)`

## Tier Matrix (template)

| Tier | RTO    | RPO   | Availability | Pattern                              |
|------|--------|-------|--------------|--------------------------------------|
| 1    | 15 min | 1 min | 99.99%       | Multi-region active-active, auto-FO  |
| 2    | 4 h    | 15 min| 99.95%       | Multi-AZ active-passive, semi-auto   |
| 3    | 24 h   | 4 h   | 99.9%        | Single region + hourly backup        |
| 4    | 1 week | 24 h  | 99.0%        | Cold backup restore                  |

## RACI Per Incident Severity

| Role                  | Sev-1 | Sev-2 | Sev-3 |
|-----------------------|-------|-------|-------|
| Incident Commander    | A     | R     | I     |
| Eng on-call           | R     | R     | R     |
| Communications lead   | R     | C     | I     |
| Executive on-call     | A     | C     | I     |
| Legal                 | C     | I     | —     |
| Customer success      | R     | C     | I     |

R = Responsible · A = Accountable · C = Consulted · I = Informed

## Approval + Review Cadence

- Initial sign-off: CTO + COO + CEO
- Quarterly review: incident commander + service owners
- Annual full rewrite: triggered by org change or major architecture change
- Audit trail: all changes in git, PR with 2 approvers

## Common BIA Mistakes

- Counting only direct revenue, ignoring SLA penalties
- Assuming insurance covers everything (most BI policies have 72h waiting period)
- Treating internal tools as Tier-3 when they block revenue-generating teams
- Single-vendor dependencies marked as "low risk" without measured exposure
- MAO chosen by gut instead of revenue × hours math
