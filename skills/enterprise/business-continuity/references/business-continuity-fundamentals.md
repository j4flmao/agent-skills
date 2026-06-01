# Business Continuity Fundamentals

## Overview
Business Continuity ensures critical business services survive disruptions. This covers the BIA, service tiering, RPO/RTO definition, dependency mapping, and crisis comms that form the foundation of any BCP.

## Core Concepts

### Business Impact Analysis (BIA)
The BIA quantifies downtime cost for every business service. It answers: What revenue is lost per hour? How many employees are affected? What regulatory fines apply? What is the maximum acceptable outage (MAO)?

BIA outputs per service:
- Revenue impact per hour of downtime
- Employee productivity impact
- Regulatory penalties (GDPR: 4% of revenue, PCI: per-record fines)
- Customer churn acceleration
- Recovery cost (overtime, vendor emergency fees)
- MAO: the point past which the business cannot recover

### Service Tier Classification
- Tier-1 (Revenue/Regulatory Critical): RTO < 15min, RPO < 1min, 24x7 on-call, multi-region active-active
- Tier-2 (Important): RTO < 4h, RPO < 15min, business-hour on-call, multi-AZ
- Tier-3 (Best Effort): RTO < 24h, RPO < 4h, business-hour, backup-restore
- Tier-4 (Deferrable): RTO < 1 week, RPO < 24h, manual recovery from cold backup

Tier classification decision tree: Customer-facing? -> min Tier-2. Direct revenue? -> min Tier-1. Regulated data? -> min Tier-1. Cost/hr > $100K? -> Tier-1.

### RPO and RTO Definitions
- Recovery Point Objective (RPO): Maximum acceptable data loss measured in time. "How much data can we lose?"
- Recovery Time Objective (RTO): Maximum acceptable downtime. "How fast must we recover?"
- RPO drives backup frequency and replication strategy
- RTO drives architecture redundancy and automation level
- Both are derived from BIA, not from technical capability

### Dependency Mapping
Every business service depends on applications, databases, infrastructure, and vendors. The service tier is capped by the weakest dependency. A Tier-1 checkout service with a Tier-3 payment vendor dependency is effectively Tier-3.

Map dependencies: Business Service -> App -> DB -> Infra -> Vendor. Document fallback for each Tier-1 dependency.

### Crisis Communication
Define communication channels per audience: internal (Slack, email), customers (status page, email), partners (direct call), regulatory (registered letter), press (approved statement). Pre-approve holding statement templates with legal and PR.

Communication timeline for Severity-1:
- T+0: on-call paged
- T+5min: incident commander declared, war room opened
- T+10min: exec on-call notified
- T+15min: status page updated
- T+30min: key accounts contacted
- T+1h: external comms if user-visible

## BIA Methodology

### Data Collection
Interview every service owner. Questions:
- What does this service do? Who depends on it?
- Financial impact of 1 hour of downtime?
- Maximum acceptable outage before business crisis?
- What manual workarounds exist?
- What data loss is acceptable (in time units)?
- What regulatory reporting obligations apply?
- Are there seasonal periods (quarter-end, tax season)?

### Cost Calculation
Revenue Impact = Avg Revenue per Hour x Outage Duration + (Churn Rate x CLV x Affected Users)
Productivity Impact = Affected Employees x Blended Hourly Rate x Outage Duration
Regulatory Impact = Base Fine + (Affected Records x Per-Record Penalty)
Recovery Cost = Overtime Hours x OT Rate + Emergency Vendor Fees + Cloud Spike
Total Cost of Outage = Revenue + Productivity + Regulatory + Recovery

### MAO Computation
MAO is the intersection of financial survivability and stakeholder tolerance. Compute the point where cumulative outage cost exceeds the business's ability to absorb loss. This becomes the hard ceiling for RTO.

## Recovery Strategies

### Strategy Selection
| Strategy | RPO | RTO | Cost | Complexity | Best For |
|----------|-----|-----|------|------------|----------|
| Active-Active | <1s | <1min | 2x-3x | High | Tier-1 revenue-critical |
| Active-Passive | <5min | <15min | 1.5x-2x | Medium | Tier-1 and Tier-2 |
| Backup-Restore | 1-24h | 4-48h | 1x-1.2x | Low | Tier-2 and Tier-3 |
| Manual Workaround | N/A | 24h+ | Minimal | N/A | Tier-4 |

### Graceful Degradation
When a dependency fails, degrade functionality rather than going completely dark. Show cached data. Accept orders but process later. Display a waiting page. Design every Tier-1 service to survive failure of its Tier-3 dependencies.

## BCP Document Structure
1. Executive Summary
2. Plan Scope and Assumptions
3. Business Impact Analysis
4. Service Tier Classification
5. Recovery Strategies by Tier
6. Dependency Maps (services x vendors x infra)
7. Crisis Communication Plan
8. Failure Scenario Playbooks (per scenario)
9. Vendor Fallback Plans
10. Drill Schedule and After-Action Reports
11. Insurance and Regulatory Alignment
12. Plan Maintenance and Review Process
13. Appendices (runbooks, contact lists, system diagrams)

## Common Pitfalls

### RTO/RPO from Tech, Not Business
Setting RTO to 1 hour because you can, when the business needs 4 hours, over-engineers the solution. Set RTO/RPO from BIA, not from infrastructure capability.

### Untested Backups
A backup that has never been restored is not a backup. Test full restore quarterly. Test partial restore monthly. Measure restore time against RTO.

### Single-Region Dependency
Your app may be multi-region, but if all instances connect to a single-region database, you have no real redundancy.

### Stale Plans
A BCP written and never revisited becomes stale within 6 months. Architecture changes, vendor changes, team changes all invalidate the plan.

### Holding Statements Not Pre-Approved
Writing crisis communications under pressure with legal review creates delays. Pre-approve templates for common scenarios.

## Key Points
- BIA drives all continuity decisions — start with business requirements, not technical solutions
- Service tier classification sets RPO/RTO, which sets architecture and budget
- Dependency mapping reveals hidden single points of failure
- Every Tier-1 vendor needs a documented and tested fallback
- War-room channels, IC role, and holding statements must be ready before any incident
- Drills must test failure scenarios, not just happy path
- Backups must be validated by restore test, not just existence
- BCP must be a living document, stored accessibly, reviewed quarterly
- Every critical process needs at least two trained operators
- Insurance coverage must be reviewed annually against current MAO