# Defect Severity & Priority Matrix

## Severity (Impact on System)

| Severity | Definition | Examples |
|----------|------------|----------|
| **Critical** | System crash, data loss, security breach | Payment processing fails, PII exposed, service down |
| **Major** | Feature broken, no workaround | Login fails, reports generate wrong data |
| **Minor** | Feature works with limitations | UI misalignment, non-critical data in wrong format |
| **Trivial** | Cosmetic, low impact | Typo in tooltip, icon mismatch |

## Priority (Business Urgency)

| Priority | Response | Examples |
|----------|----------|----------|
| **P0** | Stop release, fix immediately | Critical severity, production outage, security breach |
| **P1** | Fix before next release | Major severity, blocks user workflow |
| **P2** | Fix in current sprint or next | Minor severity, has workaround |
| **P3** | Fix when time permits | Trivial, cosmetic only |

## Severity × Priority Matrix

| Severity \ Priority | P0 | P1 | P2 | P3 |
|--------------------|-----|-----|-----|-----|
| **Critical** | Production outage | — | — | — |
| **Major** | Security breach | Feature broken | — | — |
| **Minor** | — | Data issue | UI bug | — |
| **Trivial** | — | — | — | Typo |

## Defect Lifecycle
```
NEW → ASSIGNED → FIXED → VERIFIED → CLOSED
  ↓
REJECTED (not a defect, duplicate, cannot reproduce)
```
