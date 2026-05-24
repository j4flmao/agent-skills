---
name: enterprise-business-continuity
description: >
  Use this skill when designing Business Continuity Plans (BCP) and Disaster Recovery (DR) at the
  business-service level: ranking services by criticality, mapping RPO/RTO per service, planning for
  regional outage, vendor failure, ransomware, key-person loss, supply-chain attack, and pandemic/site
  loss. This skill enforces: BIA (Business Impact Analysis), service-tier classification, dependency
  mapping, DR runbook structure, communication tree, executive crisis comms, vendor-lock fallback, and
  scheduled drill cadence. Do NOT use for: technical replication topology (see enterprise-high-availability),
  infrastructure DR setup (see devops-backup-dr), or incident-response paging (see devops-incident-response).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [enterprise, business-continuity, bcp, dr, risk, phase-8]
---

# Enterprise Business Continuity

## Purpose
Define the BCP that keeps the business running through any plausible disruption — regional outage,
vendor collapse, ransomware, key-person loss, pandemic, supply-chain compromise, data-center loss.
Maps technical DR to business outcomes via BIA and tier classification.

## Agent Protocol

### Trigger
Exact user phrases: "business continuity", "BCP", "BIA", "business impact analysis", "disaster
recovery plan", "DR plan", "crisis management", "ransomware response", "vendor lock-in", "vendor
failure", "key person risk", "site loss", "pandemic plan", "regional outage", "tabletop exercise",
"continuity drill", "RPO", "RTO" (when at business level).

### Input Context
- List of business services and their revenue contribution
- Current per-service RTO/RPO assumptions
- Vendor dependencies and SLA terms
- Regulatory continuity obligations (SOX, ISO 22301, HIPAA, PCI-DSS)
- Insurance coverage (cyber, business interruption)
- Existing incident/crisis comms plan
- Geographic exposure (single-region, multi-region, single-DC)

### Output Artifact
BCP document with BIA, tier matrix, DR runbooks per tier, comms tree, drill schedule.

### Response Format
```
Tier-1 services: {list, RTO, RPO, MAO, dependencies}
Tier-2 services: {...}
Tier-3 services: {...}
Crisis comms: {chain, channels, holding statement template}
Drill cadence: {tabletop quarterly, full failover annual}
```
```yaml
# Runbook entries
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] BIA completed: service criticality, revenue impact per hour, MAO computed
- [ ] Service tier matrix with RTO/RPO per tier
- [ ] Dependency map (services × vendors × infra)
- [ ] DR runbook per tier-1 service
- [ ] Crisis comms tree with channels and holding statements
- [ ] Vendor fallback plan (alternative + manual fallback)
- [ ] Drill schedule: tabletop quarterly, full failover ≥ annual
- [ ] Insurance review aligned with MAO
- [ ] Regulatory continuity controls mapped (ISO 22301 if applicable)

### Max Response Length
350 lines.

## Workflow

### Step 1: Business Impact Analysis (BIA)
For each business service, compute:
- Revenue per hour of downtime
- Customer-facing? Internal-only?
- Regulatory exposure if down
- Reputational impact
- MAO (Maximum Acceptable Outage) = the point past which the business cannot recover
```
Service       Revenue/hr   Customers  Regulatory  MAO    Tier
Checkout      $50,000      100k       PCI         15m    1
Auth/SSO      $0           500k       —           30m    1
Reporting     $0           5k         —           4h     2
Internal CMS  $0           200        —           24h    3
```

### Step 2: Tier Classification
```
Tier-1 (revenue / regulatory critical)
  RTO ≤ 15m, RPO ≤ 1m, 24×7 on-call, multi-region active-active, automated failover
Tier-2 (important, recoverable)
  RTO ≤ 4h, RPO ≤ 15m, business-hour on-call, multi-AZ, semi-auto promotion
Tier-3 (best effort)
  RTO ≤ 24h, RPO ≤ 4h, business-hour, single-region, backup-restore
Tier-4 (deferrable)
  RTO ≤ 1 week, RPO ≤ 24h, manual recovery from cold backup
```

### Step 3: Dependency Mapping
Build a graph: Business Service → App → DB → Infra → Vendor.
Find the long pole — your tier is capped by your weakest dependency.
```
Checkout (Tier-1)
  ├─ payment-service
  │    ├─ stripe (vendor: SLA 99.95% → caps Checkout at 99.95% unless redundant PSP)
  │    └─ db-payments (multi-AZ sync)
  ├─ inventory-service → db-inventory
  └─ notification → SES (vendor)
```
Action: every Tier-1 vendor needs a documented fallback (secondary PSP, secondary email, etc.).

### Step 4: Failure Scenario Playbooks
Mandatory scenarios to cover:
- Regional cloud outage (AWS us-east-1 down for 6h)
- Vendor outage (Stripe, Auth0, Cloudflare, DataDog)
- Ransomware encrypting prod DB + backups
- Key-person loss (sole holder of root credentials hit by bus)
- DDoS exceeding cloud capacity
- Insider data exfiltration
- Pandemic / site loss (office unavailable, staff remote-only)
- Long power outage at on-prem DC (UPS + generator fuel exhausted)
- Subsea cable cut (cross-region latency 3×)
- Supply-chain compromise (npm/pypi package backdoor)

Each playbook: detection → decision authority → first 30min actions → escalation → comms → recovery → postmortem.

### Step 5: Crisis Comms Tree
```
Severity 1 (full outage of Tier-1)
  T+0       on-call engineer pages
  T+5min    incident commander declared, war room opened (Slack #inc-YYYYMMDD-NNN)
  T+10min   exec on-call notified (CTO + COO)
  T+15min   status page updated with holding statement
  T+30min   customer success team briefed; key accounts contacted
  T+1h      external comms (twitter/email) if user-visible
  T+2h      executive update; legal/PR engaged if data involved
  Hourly    status page updates until resolved
```
Holding statement template stored in `references/holding-statements.md`.

### Step 6: Vendor Fallback Strategy
```
Tier-1 vendor      Primary       Fallback                Switchover time
Payments           Stripe        Adyen (pre-integrated)  manual flip, 30m
Email transactional SendGrid     SES (pre-configured)    DNS swap, 15m
DNS                Route53       Cloudflare DNS          15m TTL
CDN                Cloudflare    Fastly                  DNS swap, 30m
Auth               Auth0         in-house SAML fallback  4h (degraded)
Observability      DataDog       Grafana Cloud           manual cutover, 4h
```
Rule: if a vendor outage would breach Tier-1 MAO, you MUST have a tested fallback.

### Step 7: Drill Cadence
```
Quarterly: tabletop exercise (1 scenario, 2h, exec + eng + comms attend)
Semi-annual: technical failover drill (region failover with real traffic)
Annual: full BCP exercise (multi-team, multi-hour, includes vendor fallback)
On change: re-test affected runbook within 30 days of architectural change
```

### Step 8: Insurance + Regulatory Alignment
- Cyber insurance must cover BI (Business Interruption) ≥ revenue × MAO
- ISO 22301 if certified — annual audit of BCP
- SOX 404 — controls documented for financial reporting continuity
- GDPR Art. 32 — security and continuity of processing

## Rules
- Every Tier-1 service has a tested DR runbook, refreshed within 12 months.
- Every Tier-1 vendor has a documented + tested fallback.
- War-room channel + IC role defined before incident, not during.
- Decision authority (who can declare full failover) named per service.
- Tabletop quarterly minimum; failover drill ≥ annually for Tier-1.
- Comms templates pre-approved by legal + PR (never write under pressure).
- Backups validated by restore test ≥ monthly (untested backup = no backup).
- Ransomware playbook assumes backups also compromised; document immutable backup location.

## References
- `references/bcp-plan.md` — BCP document structure, BIA template, tier matrix
- `references/vendor-risk.md` — Vendor classification, fallback patterns, SLA monitoring
- `references/regional-failure.md` — Multi-region playbook, GeoDNS cutover, data reconciliation
- `references/ransomware-playbook.md` — Detection, isolation, immutable backup, negotiation policy

## Handoff
- `enterprise-high-availability` for technical replication / failover design.
- `enterprise-sla-management` for customer SLA structure and credit calculations.
- `devops-backup-dr` for backup tooling, retention, immutability config.
- `devops-incident-response` for paging, on-call rotation, postmortem template.
- `management-risk-management` for enterprise risk register integration.
- `security-*` for ransomware forensics and breach response coordination.
