# BCM Plan Development

## Overview

This reference provides comprehensive guidance for developing a Business Continuity Management (BCM) plan. It covers the full plan lifecycle: scope definition, business impact analysis, recovery strategy selection, plan documentation, maintenance, and integration with organizational governance.

## BCM Plan Structure

### Plan Document Outline

A complete BCM plan contains the following sections:

1. Executive Summary
2. Plan Scope and Assumptions
3. Roles and Responsibilities
4. Business Impact Analysis
5. Service Tier Classification
6. Recovery Strategies
7. Incident Response Structure
8. Crisis Communication Plan
9. Failure Scenario Playbooks
10. Vendor Fallback Plans
11. IT Disaster Recovery Procedures
12. Plan Testing and Maintenance
13. Appendices

### Section Detail: Executive Summary

Purpose: Provide leadership with a one-page overview of the BCM program.

Contents:
- Business continuity policy statement
- Scope of the BCM program (services, locations, departments covered)
- Key continuity objectives (maximum RTO/RPO by tier)
- Governance structure (BCM committee, plan owners)
- Last review date and next review date
- Compliance with standards (ISO 22301, SOC2, etc.)

### Section Detail: Plan Scope and Assumptions

Define what the BCM plan covers and what it assumes:

Included:
- All business services classified as Tier-1 and Tier-2
- Supporting infrastructure, applications, and data
- Key vendors and third-party dependencies
- All geographic locations (offices, data centers)
- Full-time and critical contract staff

Excluded (explicitly):
- Services classified as Tier-4 (best-effort recovery)
- Non-critical administrative systems
- Vendor BCP (they must maintain their own)

Assumptions:
- Maximum outage duration considered: 72 hours for Tier-1, 2 weeks for Tier-4
- Minimum staffing available: 50% of team during regional event, 100% during localized event
- Alternate facilities: remote work enabled for all roles
- Insurance coverage adequate for recovery costs
- Cloud providers maintain their own BCP per SLA obligations
- Power, internet, and telecom infrastructure resilient in primary region

## Business Impact Analysis (BIA) Methodology

### BIA Data Collection

Collect for each business service through interviews with service owners:

Service Identification:
- Service name, description, owner, users (internal/external)
- Technology stack, hosting location, deployment model
- Dependencies (applications, databases, infrastructure, vendors, people)
- Peak usage periods (time of day, day of week, month of year)

Impact Quantification:
- Revenue impact: $ per hour of downtime (direct + indirect)
- Customer impact: number of customers affected, expected churn rate
- Regulatory impact: fines, penalties, legal costs per hour
- Productivity impact: number of employees unable to work
- Reputational impact: qualitative assessment (none/low/medium/high/critical)

Recovery Requirements:
- Current RTO and RPO (actual, not target)
- Desired RTO and RPO (business requirement)
- MAO (Maximum Acceptable Outage)
- Minimum service level required during recovery (full vs degraded)
- Manual workaround availability and effectiveness

### BIA Calculation Methods

Revenue Impact Calculation:
```
Direct Revenue Loss = (hourly_revenue * outage_hours) * reliability_factor
Indirect Revenue Loss = direct_loss * churn_multiplier
Total Revenue Impact = direct_loss + indirect_loss + recovery_cost

where:
- hourly_revenue = average revenue generated per hour of service operation
- reliability_factor = probability that revenue loss is permanent (0.3-1.0)
- churn_multiplier = estimated customer churn due to outage (typically 0.1-0.5x)
- recovery_cost = overtime, vendor fees, emergency infrastructure, customer credits
```

Employee Productivity Impact:
```
Productivity Loss = affected_employees * blended_hourly_cost * outage_hours * utilization_factor

where:
- affected_employees = number of employees dependent on this service
- blended_hourly_cost = fully loaded cost per employee hour (salary + benefits + overhead)
- utilization_factor = percent of time employee uses this service (0-1.0)
```

MAO Calculation:
```
MAO = min(financial_survival_limit, reputational_tolerance, regulatory_deadline, contractual_obligation)

where:
- financial_survival_limit = hours until revenue loss exceeds operating reserves
- reputational_tolerance = hours until customer trust is materially damaged
- regulatory_deadline = hours until regulatory fine exceeds acceptable threshold
- contractual_obligation = hours until customer SLA penalty exceeds contract value
```

### BIA Documentation Template

```yaml
Service: Checkout
Service Owner: jane.doe@company.com
Users: External customers (500k MAU)

Dependencies:
  - payment-gateway (Stripe)
  - inventory-service
  - notification-service (SendGrid)
  - db-payments (RDS PostgreSQL)
  - auth-service

Impact per Hour of Downtime:
  Revenue: $50,000
  Customers: 100k transactions affected
  Regulatory: PCI compliance notification required within 1 hour
  Reputational: Critical - public-facing revenue service
  Productivity: 50 CS agents handling outage calls at $3,750/hr

Recovery Requirements:
  Current RTO: 5 minutes (active-active)
  Current RPO: < 30 seconds (synchronous replication)
  Desired RTO: 15 minutes
  Desired RPO: 1 minute
  MAO: 4 hours
  Degraded Mode: Read-only catalog, no checkout processing

Seasonal Factors:
  Q4 (Nov-Dec): Revenue 5x normal, MAO reduced to 1 hour
  Black Friday: Revenue 20x normal, MAO reduced to 15 minutes
```

## Service Tier Classification Matrix

### Tier Classification Criteria

| Tier | Revenue Impact/hr | MAO | RTO Target | RPO Target | Staffing | Infrastructure |
|------|-------------------|-----|------------|------------|----------|----------------|
| Tier-0 | > $1M | < 5 min | < 1 min | < 5 sec | 24x7 dedicated | Multi-region active-active, auto-failover |
| Tier-1 | $10k-$1M | < 1 hr | < 15 min | < 1 min | 24x7 on-call | Multi-region active-passive, automated DR |
| Tier-2 | $1k-$10k | < 4 hr | < 4 hr | < 15 min | Business-hour on-call | Multi-AZ, semi-automated DR |
| Tier-3 | < $1k | < 24 hr | < 24 hr | < 4 hr | Best effort | Single-region, backup-restore |
| Tier-4 | $0 (internal) | < 1 week | < 1 week | < 24 hr | Manual | Cold backup, manual recovery |

### Service Classification Process

1. List all business services (include revenue, customer count, regulatory status)
2. Compute revenue impact per hour for each service
3. Assign preliminary tier based on revenue impact
4. Adjust tier based on: regulatory requirements (may force higher tier), customer contractual SLA (may force higher tier), executive discretion (strategic services), dependency constraints (tier capped by weakest dependency)
5. Validate tier with service owner and executive sponsor
6. Document tier assignment with rationale
7. Review tiers annually or after significant business change

### Dependency Tier Analysis

A service's effective tier is constrained by its weakest dependency:

```
Service: Checkout (Tier-1)
  - payment-gateway: Tier-1 (SLA 99.95%, redundant)
  - inventory-service: Tier-2 -> Gap! Checkout recovery limited by inventory 4hr RTO
  - db-payments: Tier-1 (multi-AZ, automated failover)
  - notification-service: Tier-2 (alternative SES configured)

Action: Upgrade inventory-service to Tier-1, or accept degraded checkout during inventory recovery
```

Document dependency tiers in a matrix. Flag all constraints. Plan remediation for tier mismatches.

## Recovery Strategy Selection

### Recovery Strategy Options

Active-Active (Multi-Region):
- RTO: Near-zero (automatic failover)
- RPO: Near-zero (synchronous replication)
- Cost: 2x+ infrastructure (full capacity in each region)
- Complexity: High (data consistency, session affinity, DNS routing)
- Best for: Tier-0 and Tier-1 services

Active-Passive (Pilot Light / Warm Standby):
- RTO: Minutes to hours (depends on promotion automation)
- RPO: Minutes (asynchronous replication)
- Cost: 1.2-1.5x infrastructure (active region at full capacity, passive at reduced)
- Complexity: Medium (automated promotion tested regularly)
- Best for: Tier-1 and Tier-2 services

Backup and Restore:
- RTO: Hours to days (depends on data volume and restore automation)
- RPO: Hours (depends on backup frequency)
- Cost: 1.1x (backup storage + compute for restore testing)
- Complexity: Low
- Best for: Tier-3 and Tier-4 services

### Strategy Selection Matrix

| Factor | Active-Active | Active-Passive | Backup-Restore |
|--------|---------------|----------------|----------------|
| RTO requirement | < 5 minutes | 5 min - 4 hours | > 4 hours |
| RPO requirement | < 1 minute | 1 min - 1 hour | > 1 hour |
| Budget | High | Medium | Low |
| Team capability | Advanced | Intermediate | Basic |
| Data consistency requirement | Strong | Eventual | N/A |
| Geographic distance | > 500 km | > 100 km | Any |

### Component-Level Recovery Strategy

Different components may need different strategies:

```yaml
service: ecommerce-platform
components:
  web-tier:
    strategy: active-active
    detail: Deployed to us-east-1 and eu-west-1. Route53 latency-based routing.
    automation: Kubernetes HPA + cluster-autoscaler per region.

  api-tier:
    strategy: active-active
    detail: Same as web-tier. Stateless, no session affinity needed.
    automation: Identical deployment in both regions.

  database-tier:
    strategy: active-passive
    detail: Primary in us-east-1, read-replica in eu-west-1. Manual promotion.
    automation: Automated failover script tested quarterly.
    rto: 15 minutes
    rpo: < 30 seconds (synchronous within region, async cross-region)

  cache-tier:
    strategy: active-passive
    detail: Redis primary in us-east-1, replica in eu-west-1.
    automation: Automated replica promotion.
    rto: 5 minutes

  queue-tier:
    strategy: active-active
    detail: SQS queues available in both regions. Producers write to both.
    automation: Automatic (AWS managed).
```

## Incident Response Structure

### Incident Management Team Roles

Incident Commander (IC):
- Owns the incident response end-to-end
- Makes decisions about escalation, communication, and recovery
- Does not perform technical troubleshooting (stays at strategic level)
- Transitions to recovery after incident containment

Technical Lead:
- Coordinates the technical response team
- Diagnoses the problem and determines recovery actions
- Reports to IC on technical status and options
- Rotates for extended incidents (handover every 8 hours)

Scribe:
- Records all actions, decisions, and timeline
- Maintains the incident timeline
- Documents what was tried, what worked, what did not
- Prepares post-incident review materials

Communications Lead:
- Manages internal and external communications
- Updates status page with IC-approved messages
- Coordinates with PR/legal for sensitive communications
- Handles stakeholder inquiries

Deputy (for extended incidents):
- Shadows the IC to understand context
- Takes over after shift rotation
- Maintains continuity during handovers

### Incident Severity Classification

| Severity | Definition | Examples | Response SLA |
|----------|------------|----------|-------------|
| Sev-1 | Critical customer-facing outage | Full site down, payment failure, data breach | 15 min response, continuous work |
| Sev-2 | Major feature impairment | Checkout slow, search broken, login delays | 30 min response, continuous work |
| Sev-3 | Minor impairment, no work stoppage | Admin UI slow, reporting delay, cosmetic bugs | 2 hr response, next-day resolution |
| Sev-4 | Informational | Monitoring gap, documentation error, low disk space | Next business day |

## Crisis Communication Plan

### Communication Protocols

Internal Communications:
- Slack channel: #inc-YYYYMMDD-NNN
- Email distribution: incident-team@company.com
- War room: Zoom/Teams bridge (recorded for post-incident review)
- Status updates: Every 30 minutes for Sev-1, hourly for Sev-2

External Communications:
- Status page: status.company.com (update within 15 min of Sev-1 declaration)
- Customer email: For Sev-1 incidents exceeding 30 minutes
- Social media: Only if incident is widely reported (PR-approved messaging)
- Regulatory: Per compliance obligations timeline

### Holding Statement Templates

Service Degradation (Sev-2/3):
"We are currently investigating reports of [issue description] affecting [affected service]. Our team is working to resolve this as quickly as possible. We will provide updates every [frequency] on our status page."

Service Outage (Sev-1):
"We are currently experiencing a [service outage / major incident] affecting [service name]. Our engineering team has been engaged and is actively working on restoration. We apologize for the disruption and will provide the next update within [timeframe]. For urgent inquiries, please contact [emergency contact]."

Data Incident (Sev-1 with data implications):
"We have identified a potential security incident involving [brief, non-technical description]. We have activated our incident response protocol and engaged our security team. Affected parties will be notified directly in accordance with our regulatory obligations. We recommend affected users [action, e.g., reset passwords] as a precaution."

### Communication Approval Matrix

| Communication Type | IC | PR | Legal | Exec | Customer-facing? |
|-------------------|-----|-----|-------|------|-----------------|
| Status page update | Approve | Inform | - | - | Yes |
| Internal Slack | Author | - | - | - | No |
| Customer email | Draft | Review | Review | Approve | Yes |
| Press statement | Draft | Approve | Approve | Approve | Yes |
| Regulatory notification | Draft | - | Approve | Approve | Yes |
| Social media | - | Approve | - | Inform | Yes |

## Plan Maintenance

### Review Cadence

- Full BCM plan review: Annually (or within 30 days of major architecture change)
- Service tier classification: Annually (or after acquisition/divestiture)
- Contact lists: Quarterly
- Vendor fallback plans: Semi-annually (or when vendor changes)
- DR runbooks: Semi-annually (or within 30 days of infrastructure change)
- BIA: Annually
- Insurance coverage: Annually (during renewal)

### Change Management for BCM

Any architectural change that affects recovery strategy must trigger a BCM review:

Changes that trigger review:
- New service deployment (Tier-1 or Tier-2)
- Cloud provider migration
- Data center move or closure
- Core infrastructure component replacement (database, message queue, cache)
- Significant traffic growth (>50% increase)
- New regulatory requirement
- Vendor primary/fallback change
- Team reorganization affecting incident response roles

### Version Control

- BCM plan stored in version-controlled repository (alongside infrastructure-as-code)
- Each version tracked with date, author, change summary
- Prior versions archived for compliance reference
- Approved annually by executive management
- Distribution list maintained for all changes

## Compliance and Audit Alignment

### ISO 22301 Mapping

| BCM Plan Component | ISO 22301 Clause |
|-------------------|------------------|
| Policy and scope | Clause 4 - Context of the Organization |
| Leadership and commitment | Clause 5 - Leadership |
| BIA | Clause 8.2.2 - Business Impact Analysis |
| Risk assessment | Clause 8.2.3 - Risk Assessment |
| Recovery strategies | Clause 8.3 - Business Continuity Strategies |
| Plan documentation | Clause 8.4 - Business Continuity Procedures |
| Exercise program | Clause 8.5 - Exercise Program |
| Performance evaluation | Clause 9 - Performance Evaluation |
| Improvement | Clause 10 - Improvement |

### SOC2 Mapping (CC7.5 - Recovery Plan Testing)

- Plan documented and communicated
- Plan tested at least annually
- Test results documented and reviewed
- Remediation actions tracked to closure
- Plan updated based on test results and environmental changes

### Audit Evidence Requirements

For each BCM control, maintain:
- Current plan document (version controlled)
- BIA results with last review date
- Test/exercise records (date, participants, scenarios, results, action items)
- Action item tracking (open/closed with dates)
- Annual executive review approval
- Plan distribution records
- Training attendance records
- Insurance certificates
- Vendor BCP verification (SOC2 reports, ISO certificates)
