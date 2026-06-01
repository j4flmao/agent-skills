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
version: "2.1.0"
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
Define the BCP that keeps the business running through any plausible disruption -- regional outage,
vendor collapse, ransomware, key-person loss, pandemic, supply-chain compromise, data-center loss.
Maps technical DR to business outcomes via BIA and tier classification.

## Framework/Methodology

### RESILIENCE Framework
A six-phase methodology for building organizational resilience:

Phase 1 - Recognize: Identify critical business services, their revenue impact, regulatory obligations, and stakeholder expectations. Conduct Business Impact Analysis for every service. Classify by criticality tier.

Phase 2 - Evaluate: Assess risks across all threat categories. Map dependencies between services, infrastructure, vendors, and people. Identify single points of failure and concentration risks.

Phase 3 - Strategize: Define recovery objectives (RTO, RPO, MAO) per tier. Select recovery strategies (active-active, active-passive, backup-restore, manual workaround). Design vendor fallback plans.

Phase 4 - Implement: Build DR runbooks for every Tier-1 service. Establish crisis communication tree. Set up war-room infrastructure. Deploy backup and replication per strategy. Document holding statements.

Phase 5 - Learn: Conduct drills at scheduled cadence. Tabletop exercises quarterly. Technical failover semi-annually. Full BCP exercise annually. Incorporate lessons learned into plan updates.

Phase 6 - Nurture: Maintain the BCP through regular reviews, audits, and training. Align with insurance coverage and regulatory requirements. Update as architecture changes.

### BIA Methodology

The Business Impact Analysis quantifies the cost of downtime for each service:

Revenue Impact: Lost revenue per hour of downtime. Include direct (transaction-based) and indirect (reputation-driven churn).

Productivity Impact: Internal user hours lost. If 500 employees cannot work at $100/hour blended cost, that is $50,000/hour.

Regulatory Impact: Fines, penalties, legal costs. GDPR fines up to 4% of global revenue. PCI fines per card number exposed.

Recovery Cost: Overtime, vendor emergency fees, expedited shipping, cloud spike costs.

Customer Impact: Churn rate acceleration. Post-outage support volume. SLA credit payouts.

Compute MAO (Maximum Acceptable Outage) as the intersection of financial survivability and stakeholder tolerance.

## Architecture / Decision Trees

### Recovery Strategy Selection
| Strategy | RPO | RTO | Cost | Complexity | Best For |
|----------|-----|-----|------|------------|----------|
| Active-Active | <1s | <1min | 2x-3x | High | Tier-1 revenue-critical |
| Active-Passive | <5min | <15min | 1.5x-2x | Medium | Tier-1 and Tier-2 |
| Backup-Restore | 1-24h | 4-48h | 1x-1.2x | Low | Tier-2 and Tier-3 |
| Manual Workaround | N/A | 24h+ | Minimal | N/A | Tier-4 |

### Service Criticality Tier Decision Tree
1. Is the service customer-facing? → If yes, minimum Tier-2
2. Does it directly process revenue? → If yes, minimum Tier-1
3. Does it handle regulated data (PII, PHI, PCI)? → If yes, minimum Tier-1
4. Is there a manual workaround? → If yes, can be Tier-3 or Tier-4
5. What is the cost-per-hour of downtime? → If >$10K/hr, minimum Tier-2; >$100K/hr, Tier-1

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
- [ ] Dependency map (services x vendors x infra)
- [ ] DR runbook per tier-1 service
- [ ] Crisis comms tree with channels and holding statements
- [ ] Vendor fallback plan (alternative + manual fallback)
- [ ] Drill schedule: tabletop quarterly, full failover >= annual
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
Auth/SSO      $0           500k       -           30m    1
Reporting     $0           5k         -           4h     2
Internal CMS  $0           200        -           24h    3
```

BIA interview questions per service owner:
- What does this service do? Who depends on it?
- What is the financial impact of 1 hour of downtime?
- What is the maximum time the service can be down before the business is in crisis?
- What manual workarounds exist?
- What data loss is acceptable (in time units)?
- What regulatory reporting obligations apply?
- Are there seasonal or time-sensitive periods (quarter-end, tax season)?

### Step 2: Tier Classification
```
Tier-1 (revenue / regulatory critical)
  RTO <= 15m, RPO <= 1m, 24x7 on-call, multi-region active-active, automated failover
Tier-2 (important, recoverable)
  RTO <= 4h, RPO <= 15m, business-hour on-call, multi-AZ, semi-auto promotion
Tier-3 (best effort)
  RTO <= 24h, RPO <= 4h, business-hour, single-region, backup-restore
Tier-4 (deferrable)
  RTO <= 1 week, RPO <= 24h, manual recovery from cold backup
```

Tier granularity: some services have sub-components that need different tiers. Auth service authentication path is Tier-1, profile management is Tier-2. Document per-path RTO if needed.

### Step 3: Dependency Mapping
Build a graph: Business Service -> App -> DB -> Infra -> Vendor.
Find the long pole -- your tier is capped by your weakest dependency.
```
Checkout (Tier-1)
  +- payment-service
  |    +- stripe (vendor: SLA 99.95% -> caps Checkout at 99.95% unless redundant PSP)
  |    +- db-payments (multi-AZ sync)
  +- inventory-service -> db-inventory
  +- notification -> SES (vendor)
```
Action: every Tier-1 vendor needs a documented fallback (secondary PSP, secondary email, etc.).

Map both direct and transitive dependencies. A Tier-1 service may depend on a Tier-3 logging service. The logging service failure should not bring down the Tier-1 service. Design for graceful degradation: the Tier-1 service should function without logs during an outage.

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
- Subsea cable cut (cross-region latency 3x)
- Supply-chain compromise (npm/pypi package backdoor)

Each playbook: detection -> decision authority -> first 30min actions -> escalation -> comms -> recovery -> postmortem.

Playbook structure standard:
1. Detection: What alerts fire? What metric crosses which threshold?
2. Decision: Who decides to declare the incident? What is the criteria?
3. First 30 minutes: Immediate containment actions. Parallel workstreams.
4. Escalation: When to engage executives, legal, PR, vendors.
5. Communications: Internal updates, customer status page, regulatory notification.
6. Recovery: Step-by-step restoration procedure.
7. Postmortem: Timeline, root cause, action items, improvement tracking.

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

Define communication channels per audience: internal (Slack, email), customers (status page, email), partners (direct call), regulatory (registered letter with timeline), press (PR-approved statement).

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

Fallback testing: switch traffic to fallback in staging quarterly. Measure switchover time and degradation. Document any manual steps that cannot be automated.

### Step 7: Drill Cadence
```
Quarterly: tabletop exercise (1 scenario, 2h, exec + eng + comms attend)
Semi-annual: technical failover drill (region failover with real traffic)
Annual: full BCP exercise (multi-team, multi-hour, includes vendor fallback)
On change: re-test affected runbook within 30 days of architectural change
```

Drill documentation: each drill produces an after-action report with timeline, decisions made, gaps identified, and action items. Track action items to closure before next drill.

### Step 8: Insurance + Regulatory Alignment
- Cyber insurance must cover BI (Business Interruption) >= revenue x MAO
- ISO 22301 if certified -- annual audit of BCP
- SOX 404 -- controls documented for financial reporting continuity
- GDPR Art. 32 -- security and continuity of processing

Insurance review cadence: annually during renewal. Verify coverage limits match current MAO. Document any coverage gaps and present to risk committee.

## Common Pitfalls

Pitfall 1: RTO/RPO that match technical capability rather than business need. Setting RTO to 1 hour because you can, when the business needs 4 hours, over-engineers the solution and wastes budget. Set RTO/RPO from BIA, not from infrastructure limitations.

Pitfall 2: Untested backups. A backup that has never been restored is not a backup. Test full restore quarterly. Test partial restore (single file/DB) monthly. Measure restore time against RTO.

Pitfall 3: Single-region dependency in a multi-region architecture. Your app may be multi-region, but if all instances connect to a single-region database or queue, you have no real redundancy.

Pitfall 4: No executive buy-in for drill participation. Tabletop exercises fail when executives are too busy to attend. Schedule drills on the executive calendar 6 months in advance. Make attendance mandatory.

Pitfall 5: Plans that are not updated. A BCP written and never revisited becomes stale within 6 months. Architecture changes, vendor changes, team changes all invalidate the plan.

Pitfall 6: Assuming vendor SLA equals availability. An SLA is a contractual commitment with credits, not a guarantee. Your DR plan must cover vendor outages regardless of SLA.

Pitfall 7: Ignoring people dependencies. Key-person risk is real. Every critical process must have at least two trained operators. Document runbooks so they are not dependent on memory.

Pitfall 8: Holding statements not pre-approved. Writing crisis communications under pressure with legal review creates delays. Pre-approve templates for common scenarios.

## Best Practices

Practice 1: Start with the BIA, not the solution. Understand what the business needs before designing technical DR. The BIA drives RTO/RPO, which drives architecture decisions.

Practice 2: Design for graceful degradation. When a dependency fails, degrade functionality rather than going completely dark. Show cached data. Accept orders but process later. Display a waiting page.

Practice 3: Automate failover testing. Manual failover drills are good. Automated chaos engineering (GameDays) is better. Introduce real failures (kill a region, throttle a vendor) and verify the system recovers.

Practice 4: Keep the BCP as a living document. Store in a wiki or shared drive, not a PDF on one person's laptop. Anyone in the on-call rotation should be able to find and execute the runbook.

Practice 5: Pre-declare war-room channels and tools. Slack channel naming convention (#inc-YYYYMMDD-NNN). Zoom bridge always available. Status page provider configured. Do not configure tools during an incident.

Practice 6: Cross-train for key roles. Incident commander, scribe, comms lead, and technical lead should all have backups. Rotate role assignments in drills so everyone is familiar.

## Standards Alignment

| Standard | Requirement | BCP Mapping |
|----------|-------------|-------------|
| ISO 22301 | Business continuity management system | Full BCP framework |
| ISO 27031 | ICT readiness for business continuity | IT/DR component |
| NIST SP 800-34 | Contingency planning | DR runbooks, testing |
| SOC 2 | Business continuity / disaster recovery | BCP, DR tests, evidence |
| HIPAA | 164.308(a)(7) - Contingency Plan | Emergency mode, backup, DR |
| PCI DSS | Requirement 12 - Information Security Policy | BCP including CDE recovery |

## Templates & Tools

### BCP Document Structure
```
1. Executive Summary
2. Plan Scope and Assumptions
3. Business Impact Analysis
4. Service Tier Classification
5. Recovery Strategies by Tier
6. Dependency Maps
7. Crisis Communication Plan
8. Failure Scenario Playbooks (per scenario)
9. Vendor Fallback Plans
10. Drill Schedule and After-Action Reports
11. Insurance and Regulatory Alignment
12. Plan Maintenance and Review Process
13. Appendices (runbooks, contact lists, system diagrams)
```

### Tools Reference
- PagerDuty / OpsGenie for incident alerting
- Slack for war-room communication
- Statuspage.io / Atlassian Statuspage for customer status
- Confluence / Notion for runbook hosting
- AWS Fault Injection Simulator / Gremlin for chaos engineering
- LastPass / 1Password for credential escrow
- Lucidchart / Draw.io for dependency mapping
- Splunk / DataDog for monitoring and alert correlation

### BIA Calculation Spreadsheet Model
```
Revenue Impact = (Avg Revenue per Hour × Outage Duration) + (Churn Rate × CLV × Affected Users)
Productivity Impact = (Affected Employees × Blended Hourly Rate × Outage Duration)
Regulatory Impact = Base Fine + (Affected Records × Per-Record Penalty)
Recovery Cost = (Overtime Hours × OT Rate) + Emergency Vendor Fees + Cloud Spike Costs
Total Cost of Outage = Revenue + Productivity + Regulatory + Recovery
```

## Code Examples

### BIA Calculator (Python)
```python
class BusinessImpactAnalysis:
    def __init__(self, service_name, revenue_per_hour, affected_users, churn_rate=0.05):
        self.service_name = service_name
        self.revenue_per_hour = revenue_per_hour
        self.affected_users = affected_users
        self.churn_rate = churn_rate

    def revenue_impact(self, hours):
        return self.revenue_per_hour * hours

    def churn_impact(self, clv=500):
        return self.affected_users * self.churn_rate * clv

    def regulatory_fine(self, records_exposed=0, per_record_penalty=0):
        return records_exposed * per_record_penalty

    def mao_hours(self, max_financial_loss=100000):
        return max_financial_loss / (self.revenue_per_hour + (self.affected_users * self.churn_rate * 500 / 8760))

    def tier_classify(self):
        rph = self.revenue_per_hour
        if rph > 100000 or self.affected_users > 1000000:
            return "Tier-1"
        elif rph > 10000 or self.affected_users > 100000:
            return "Tier-2"
        elif rph > 1000:
            return "Tier-3"
        return "Tier-4"

checkout = BusinessImpactAnalysis("Checkout", 50000, 100000)
print(checkout.mao_hours())  # Max hours before $100K loss
```

### Dependency Graph Builder (YAML)
```yaml
services:
  checkout:
    tier: 1
    rto: 15m
    rpo: 1m
    dependencies:
      - payment-service
      - inventory-service
      - auth-service
    vendors:
      stripe: { sla: "99.95%", fallback: adyen }
    dr_runbook: runbooks/checkout-dr.md

  payment-service:
    tier: 1
    rto: 15m
    rpo: 1m
    dependencies:
      - db-payments
    vendors:
      stripe: { sla: "99.95%", fallback: adyen }
```

### DR Runbook Template (Markdown)
```markdown
# DR Runbook: {Service Name}
## Tier: {1-4} | RTO: {time} | RPO: {time}

### Detection
- Alert: {metric} crosses {threshold}
- Monitoring: {dashboard URL}

### Decision
- Declare incident when: {criteria}
- Decision authority: {role}

### First 30 Minutes
1. {immediate action}
2. {parallel workstream}
3. {containment step}

### Recovery Procedure
1. {step 1}
2. {step 2}
3. {verification step}

### Rollback
- Trigger if: {condition}
- Procedure: {steps}

### Communication
- Internal: {Slack channel}
- Status page: {URL}
- Executive: {contact}
- Regulatory: {notification timeline}
```

### Chaos Engineering Scenario (Python/Gremlin)
```python
# Example: Kill a region to test failover
scenario = {
    "name": "us-east-1-region-failure",
    "target": "checkout-service",
    "attack": {
        "type": "blackhole",
        "target": "us-east-1",
        "duration": 3600
    },
    "hypothesis": "Traffic routes to us-west-2 within 30s with <1% error rate",
    "probes": [
        "http_get https://checkout.example.com/health",
        "metric_query 'aws_alb_target_response_time'",
        "metric_query 'aws_alb_error_rate_5xx'"
    ],
    "rollback": "dns_failover_to_us_west_2"
}
```

## Anti-Patterns

### Anti-Pattern 1: Bypassing the BIA
Skipping the Business Impact Analysis and guessing RTO/RPO leads to either over-engineered (waste) or inadequate (risk) DR. Teams set RTO=1h because "that sounds right" without knowing the actual MAO. This results in spending $50K/month on multi-region replication for a service that could tolerate 24h of downtime.

### Anti-Pattern 2: Single-Threaded Runbook Ownership
One person writes and maintains all runbooks. When that person leaves or is unavailable, no one knows how to execute DR. Runbooks become stale because the single owner is a bottleneck. Every runbook must have a secondary owner and be reviewed quarterly.

### Anti-Pattern 3: DR Plan That Requires the DR Team
If executing the runbook requires SSH access to production, database credentials, and intimate knowledge of the architecture, the plan will fail when the primary engineers are unavailable. Runbooks must be executable by any on-call engineer with standard access.

### Anti-Pattern 4: Testing Only Happy Path
Every drill succeeds because everyone knows the scenario in advance and prepares. The real value is in testing failure modes: partial failure, cascading failure, network partition, corrupted data. Test with chaos engineering in production.

### Anti-Pattern 5: BCP Written for the Last Disaster
Plans reflect the last outage rather than anticipating future threats. If the last disaster was a cloud region failure, the plan focuses on multi-region. Meanwhile, a ransomware or supply-chain attack would bypass those defenses. Use threat modeling to identify current risks, not historical ones.

## Case Studies

### Case Study 1: Regional Cloud Outage Survival
A mid-stage SaaS company with active-active multi-region architecture survived a 6-hour AWS us-east-1 outage with zero revenue impact. Key factors: all Tier-1 services deployed in us-west-2 and eu-west-1 with traffic routing via Route53 health checks. Database was multi-region with asynchronous replication. Failover was fully automated. The BCP called for a quarterly failover drill, which had been executed 3 weeks before the actual outage.

### Case Study 2: Ransomware Recovery
A healthcare company suffered a ransomware attack that encrypted their primary database and all online backups. Because immutable backups (write-once-read-many storage) were part of their BCP, they recovered from a clean snapshot taken 4 hours before the attack. Data loss was limited to 4 hours of transactions (within RPO). The DR runbook, tested semi-annually, guided recovery in 6 hours (within RTO). Total cost: $2M in recovery and security hardening vs. potential $50M ransom demand.

### Case Study 3: Key-Person Loss Crisis
A fintech startup lost their only infrastructure engineer with root access to all production systems. Root credentials were in a password manager with multi-person access (pre-configured per BCP), so the remaining team could access systems. Runbooks documented deployment, monitoring, and incident response procedures. Within 48 hours, two contractors were onboarded and productive. The BCP was updated to require minimum two operators per critical function.

## Rules
- Every Tier-1 service has a tested DR runbook, refreshed within 12 months.
- Every Tier-1 vendor has a documented + tested fallback.
- War-room channel + IC role defined before incident, not during.
- Decision authority (who can declare full failover) named per service.
- Tabletop quarterly minimum; failover drill >= annually for Tier-1.
- Comms templates pre-approved by legal + PR (never write under pressure).
- Backups validated by restore test >= monthly (untested backup = no backup).
- Ransomware playbook assumes backups also compromised; document immutable backup location.
- BIA must be reviewed and updated annually or after major business change.
- Every critical process must have at least two trained operators.
- Holding statements pre-approved for all Severity-1 scenarios.
- BCP stored in accessible, redundant location (not a single laptop).
- Runbook changes tested within 30 days of architectural change.
- Insurance coverage limits reviewed annually against current MAO.
- Third-party dependencies mapped and risk-assessed at vendor onboarding.
- Post-drill action items tracked to closure with assigned owners.

## References
  - references/bcp-plan.md -- BCP Plan -- Structure, BIA, Tier Matrix
  - references/bcm-plan-development.md -- BCM Plan Development
  - references/bcm-testing-exercising.md -- BCM Testing and Exercising
  - references/business-continuity-advanced.md -- Business Continuity Advanced Topics
  - references/business-continuity-fundamentals.md -- Business Continuity Fundamentals
  - references/holding-statements.md -- Holding Statement Templates
  - references/ransomware-playbook.md -- Ransomware Playbook
  - references/regional-failure.md -- Regional Failure -- Multi-Region Playbook
  - references/vendor-risk.md -- Vendor Risk -- Classification, Fallback, SLA Monitoring
  - references/third-party-continuity.md -- Third Party and Supply Chain Continuity
## Handoff
- `enterprise-high-availability` for technical replication / failover design.
- `enterprise-sla-management` for customer SLA structure and credit calculations.
- `devops-backup-dr` for backup tooling, retention, immutability config.
- `devops-incident-response` for paging, on-call rotation, postmortem template.
- `management-risk-management` for enterprise risk register integration.
- `security-*` for ransomware forensics and breach response coordination.
