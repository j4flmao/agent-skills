# Vendor Performance Management

## Introduction

Vendor performance management ensures vendors deliver services at agreed quality levels, meet contractual commitments, and continuously improve. Effective performance management combines quantitative metrics with relationship management to drive vendor accountability and partnership value.

## SLAs and KPIs

### KPI Framework

| Category | KPI | Definition | Target | Measurement |
|----------|-----|------------|--------|-------------|
| Availability | Service Uptime | Percentage of time service is available | >= 99.9% | Monitoring tool, monthly average |
| Performance | Response Time | Time for system to respond to user action | < 500ms | APM tool, percentile (P95) |
| Support | Incident Response | Time to acknowledge and respond to incident | P1: <= 15 min | Ticket system, per-incident |
| Support | Incident Resolution | Time to resolve and restore service | P1: <= 4 hours | Ticket system, per-incident |
| Quality | Defect Rate | Percentage of releases with critical defects | < 1% | Release tracking, per-release |
| Timeliness | On-Time Delivery | Percentage of deliverables on schedule | >= 95% | Project tracking, monthly |
| Satisfaction | CSAT Score | Customer satisfaction rating | >= 4.0 / 5.0 | Survey, quarterly |

### Leading vs. Lagging Indicators

| Type | Definition | Examples | Use Case |
|------|------------|----------|----------|
| Leading | Predicts future performance | Training completion, capacity utilization, incident trend | Proactive management |
| Lagging | Measures past performance | SLA compliance, uptime, customer satisfaction | Performance evaluation |

### KPI Target Setting
- Baseline from first 3 months of service
- Improvement targets (e.g., 5% improvement each quarter)
- Stretch targets tied to incentives
- Floor targets (minimum acceptable performance)
- Goals aligned with business outcomes

## Business Reviews

### Review Types

| Review Type | Frequency | Attendees | Duration | Focus |
|-------------|-----------|-----------|----------|-------|
| Operational Review | Weekly or Bi-weekly | Operational teams, vendor delivery leads | 30-60 min | Tactical issues, open tickets, ongoing work |
| Performance Review | Monthly | Service owners, vendor account managers | 60-90 min | KPI performance, SLA compliance, incident trends |
| Business Review (QBR) | Quarterly | Executives, vendor leadership | 2-4 hours | Strategic alignment, performance, roadmap |
| Annual Review | Yearly | Senior executives, vendor executives | 4 hours | Strategic partnership, contract renewal |

### Quarterly Business Review (QBR) Agenda

| Agenda Item | Duration | Owner | Description |
|-------------|----------|-------|-------------|
| Business Update | 15 min | Customer Exec | Organizational changes, strategic priorities |
| Performance Review | 30 min | Vendor AM | KPI dashboard, SLA compliance, trends |
| Major Initiatives | 30 min | Vendor PM | Project status, milestones, deliverables |
| Innovation and Roadmap | 30 min | Vendor Exec | Product roadmap, upcoming features |
| Improvement Plan | 20 min | Both | Corrective actions, improvement initiatives |
| Relationship Health | 15 min | Both | Feedback, satisfaction, concerns |
| Strategic Planning | 30 min | Both | Future requirements, contract planning |
| Action Items | 10 min | Both | Review actions, owners, deadlines |

### QBR Preparation Checklist
- [ ] Compile performance data since last QBR
- [ ] Identify top 3 achievements and top 3 concerns
- [ ] Review SLA compliance and breach analysis
- [ ] Prepare feedback from stakeholders and end users
- [ ] Review outstanding issues and action items
- [ ] Plan strategic discussion points
- [ ] Distribute pre-read materials 1 week in advance
- [ ] Confirm attendance from both parties

## Scorecards

### Vendor Scorecard Template

| Category | Weight | KPI | Target | Actual | Score |
|----------|--------|-----|--------|--------|-------|
| Service Delivery | 30% | Uptime | 99.9% | 99.95% | 5 |
| Service Delivery | | Incident Resolution (P1) | <= 4 hours | 3.5 hours | 5 |
| Quality | 20% | Defect Rate | < 1% | 0.8% | 4 |
| Responsiveness | 20% | Support Response Time | <= 15 min | 12 min | 5 |
| Innovation | 15% | Improvement Suggestions | 4 per QBR | 3 | 3 |
| Relationship | 15% | CSAT Score | >= 4.0 | 4.2 | 4 |

### Scoring and Rating

| Score | Rating | Definition |
|-------|--------|------------|
| 4.5 - 5.0 | Exceptional | Consistently exceeds targets |
| 3.5 - 4.4 | Meets Expectations | Consistently meets targets |
| 2.5 - 3.4 | Needs Improvement | Meets most targets, some gaps |
| 1.0 - 2.4 | Below Expectations | Significant gaps, multiple breaches |
| 0.0 - 0.9 | Critical | Persistent failures, escalation required |

### Scorecard Governance
- Scoring methodology agreed at contract signing
- Scorecard reviewed monthly, finalized quarterly
- Vendor can dispute scores with evidence
- Trended scores tracked over rolling 12 months
- Score directly linked to contract renewal decisions

## Issue Escalation

### Escalation Matrix

| Level | Escalation Point | Response Time | Decision Authority |
|-------|------------------|---------------|-------------------|
| L1 -- Operations | Vendor Service Desk | Standard SLA | Ticket resolution |
| L2 -- Management | Vendor Account Manager | Within 4 hours | Operational decisions |
| L3 -- Director | Vendor Delivery Director | Within 24 hours | Resource allocation |
| L4 -- Executive | Vendor VP / GM | Within 48 hours | Strategic decisions |
| L5 -- Senior Executive | Vendor C-level | Within 72 hours | Contractual decisions |

### Escalation Process
1. **Issue Identification**: Operational issue, SLA breach, or stakeholder complaint
2. **Initial Escalation**: Raise to vendor account manager with documented details
3. **Root Cause Analysis**: Vendor provides RCA within agreed timeline
4. **Action Plan**: Corrective actions with owners and deadlines
5. **Status Tracking**: Regular updates until resolution
6. **Closure**: Verify resolution effectiveness, document lessons learned

## Corrective Action Plans (CAPs)

### CAP Triggers
- SLA breach exceeding threshold (>2 consecutive months)
- Critical security finding
- Material breach of contract terms
- Scorecard below specified threshold for 2+ quarters
- Persistent quality issues or customer complaints

### CAP Structure

| Element | Description |
|---------|-------------|
| Issue Description | Clear statement of the problem |
| Root Cause | Vendor's analysis of underlying cause |
| Corrective Actions | Specific steps to resolve the issue |
| Success Criteria | How completion and effectiveness will be measured |
| Timeline | Target dates for each action |
| Owner | Vendor team member responsible |
| Monitoring | How progress will be tracked |
| Escalation | Consequences if CAP is not completed |

### CAP Governance
- CAP formally documented and signed by both parties
- Weekly status calls during CAP period
- CAP completion verified through evidence review
- Failed CAP may trigger service credit or termination
- CAP history maintained in vendor records

## Relationship Management

### Relationship Health Indicators
| Indicator | Positive Signal | Negative Signal |
|-----------|----------------|-----------------|
| Communication | Proactive, transparent, responsive | Reactive, opaque, delayed |
| Issue Resolution | Quick, thorough, systemic fixes | Slow, superficial, repeated same issues |
| Innovation | Brings new ideas, challenges thinking | Wait-and-see, no proactive suggestions |
| Partnership | Seeks win-win outcomes | Transactional, zero-sum approach |
| Governance | Prepared, constructive reviews | Disorganized, defensive reviews |

### Stakeholder Feedback Collection
- Quarterly satisfaction survey to all stakeholders
- Post-incident feedback on support experience
- Annual executive sponsor check-in
- 360-degree feedback (sponsor, users, technical team, procurement)
- Net Promoter Score (NPS) for key vendors

### Relationship Improvement Actions
- Joint business planning sessions
- Executive sponsor program for strategic vendors
- Innovation workshops and hackathons
- Vendor awards and recognition programs
- Collaborative improvement initiatives
- Regular communication cadence and governance forums
