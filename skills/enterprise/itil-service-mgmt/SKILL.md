---
name: enterprise-itil-service-mgmt
description: >
  Use this skill when applying ITIL 4 framework for IT service management.
  This skill enforces: service lifecycle governance, incident management, change and release management, service level management.
  Do NOT use for: project management, software development methodology, infrastructure operations scheduling.
version: "2.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [enterprise, phase-9]
---

# ITIL Service Management Agent

## Purpose
Guides IT service management practice using the ITIL 4 framework across the full service lifecycle including incident, problem, change, release, and service level management.

## Framework/Methodology

### ITIL 4 Service Value System (SVS)

The ITIL 4 framework centers on the Service Value System, which comprises five components:

Guiding Principles: Seven principles that guide decision-making across all ITIL practices. Focus on value, start where you are, progress iteratively with feedback, collaborate and promote visibility, think and work holistically, keep it simple and practical, optimize and automate.

Governance: The governing body ensures that IT services align with organizational direction and strategy. Defines policies, decision rights, and oversight mechanisms.

Service Value Chain: Six interconnected activities that create value from demand. Plan, Improve, Engage, Design and Transition, Obtain/Build, Deliver and Support. Each activity receives inputs and produces outputs that trigger other activities.

Practices: 34 ITIL management practices organized into three categories: general management practices (14), service management practices (17), and technical management practices (3).

Continual Improvement: A structured approach to identifying and implementing improvements across all SVS components. The continual improvement model defines 7 steps: What is the vision? Where are we now? Where do we want to be? How do we get there? Take action. Did we get there? How do we keep the momentum?

### ITIL 4 Service Management Practices

General Management Practices: Architecture management, continual improvement, information security management, knowledge management, measurement and reporting, organizational change management, portfolio management, project management, relationship management, risk management, service financial management, strategy management, supplier management, workforce and talent management.

Service Management Practices: Availability management, business analysis, capacity and performance management, change enablement, incident management, IT asset management, monitoring and event management, problem management, release management, service catalog management, service configuration management, service continuity management, service design, service desk, service level management, service request management, service validation and testing.

Technical Management Practices: Deployment management, infrastructure and platform management, software development and management.

### Service Management Maturity Model

Level 1 - Initial: Processes are ad hoc and reactive. Success depends on individual heroics. No consistent incident, problem, or change management.

Level 2 - Repeatable: Basic processes documented for incident, problem, and change management. Some consistency but not integrated. Metrics are basic (ticket counts, resolution times).

Level 3 - Defined: All service management processes documented, standardized, and integrated. Clear roles and responsibilities. Metrics measure effectiveness and efficiency. Process automation beginning.

Level 4 - Managed: Processes quantitatively managed with statistical control. KPIs linked to business outcomes. Predictive analytics for capacity and performance. Automation integrated across processes.

Level 5 - Optimizing: Continuous process improvement based on quantitative feedback. IT and business strategy tightly aligned. Innovation-driven rather than incident-driven. Proactive service management culture.

## Architecture / Decision Trees

### Incident Priority Matrix

| Priority | Impact | Urgency | Response Time | Resolution Time | Escalation       |
|----------|--------|---------|---------------|-----------------|------------------|
| P1       | Major  | Critical| 15 min        | 4 hours         | Immediate, exec  |
| P2       | Major  | High    | 30 min        | 8 hours         | Team lead        |
| P3       | Minor  | High    | 2 hours       | 24 hours        | Team lead        |
| P4       | Minor  | Low     | 4 hours       | 5 business days | No escalation    |
| P5       | None   | Low     | 8 hours       | Next release    | No escalation    |

### Change Types and Approval Paths

```
Standard Change: Pre-approved, low risk, documented procedure
  Examples: password reset, server reboot, DNS record change
  Approval: Pre-authorized. Log after execution.

Normal Change: Requires assessment and approval
  Minor: Low risk, documented. Peer review approval. 24h notice.
  Major: Medium-high risk. Change Advisory Board approval. 1 week notice.
  Significant: High risk, broad impact. CAB + executive approval. 2+ weeks.

Emergency Change: Urgent fix for active incident
  Approval: Emergency CAB (ECAB) or designated approvers.
  Review: Retrospective review within 5 business days.
```

### Service Management Process Integration Points
```
Incident -> Problem: recurring incidents trigger problem investigation
Problem -> Known Error: root cause identified, workaround documented
Known Error -> Change: fix requires a change request
Change -> Release: approved changes grouped into releases
Release -> Deployment: release deployed through pipeline
Incident -> Change: emergency change may be needed for incident resolution
Service Level -> Incident: SLA targets define incident priority and response time
```

## Agent Protocol

### Trigger
Exact user phrases: ITIL, service management, incident, problem, change management, release, service level, SLA, service strategy, service design, service transition, service operation, CSI, continual improvement.

### Input Context
Before activating, verify:
- Which ITIL practice or lifecycle stage is in scope?
- What is the current service maturity level?
- What existing service management processes and tools are in use?
- What are the current pain points or service gaps?

### Output Artifact
Service management process design, assessment, or improvement plan.

### Response Format
```
## [ITIL Practice] Artifact
### Context
{service scope, maturity, current processes}

### Process Design
{step-by-step process description with roles, triggers, and outputs}

### KPIs and Metrics
{measurement framework for process effectiveness and efficiency}

### Improvement Recommendations
{identified gaps with prioritized improvements}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Service management process documented with roles and responsibilities
- [ ] Incident priority matrix defined with SLA targets
- [ ] Problem management integrated with known error database
- [ ] Change types classified with appropriate approval paths
- [ ] Release policy defined with rollback procedures
- [ ] Service level agreements negotiated and documented
- [ ] CSI register established with improvement opportunities
- [ ] KPIs defined for all managed processes

### Max Response Length
8000 tokens

## Workflow

### Step 1: Service Strategy
Define service strategy including service portfolio, financial management, demand management, and business relationship management. Establish service provider types and governance model for service investments.

Service strategy answers four key questions:
- What services should we offer and to whom? (Service Portfolio)
- How do we allocate resources across services? (Financial Management)
- How do we understand and influence demand? (Demand Management)
- How do we align IT services with business needs? (Business Relationship Management)

Service portfolio categories: pipeline (proposed), catalog (live), retired. Each service has a business case, ROI calculation, and lifecycle stage.

### Step 2: Service Design
Design services for production environment including availability, capacity, continuity, security, and compliance. Produce service design packages (SDPs). Coordinate with architecture for technology alignment.

The Service Design Package contains:
- Service requirements and specifications
- Architecture design and component specifications
- Process and procedure designs
- Measurement and metrics definitions
- Security and compliance controls
- Acceptance criteria for service transition

Five aspects of service design: new or changed services, service management systems and tools, technology architectures and management, processes and measurement systems, transition and release methods.

### Step 3: Service Transition
Transition new and changed services into production. Manage change, release, and deployment processes. Maintain the service knowledge management system (SKMS). Conduct transition planning and support.

Transition planning: coordinate all teams, environments, and activities required to transition a service. Produce a transition plan that covers schedule, resources, risks, and acceptance criteria.

Service Knowledge Management System (SKMS): the central repository for service knowledge including the CMDB, known error database, service catalog, documentation, and operational procedures.

### Step 4: Service Operation
Operate services to deliver agreed levels of service. Manage incidents, problems, requests, and access. Monitor service performance and respond to events. Resolve service disruptions and restore normal operation.

Service operation functions: service desk (single point of contact), technical management (infrastructure support), IT operations management (daily operational activities), application management (application support).

Event management: classify events as informational (no action needed), warning (threshold approaching), or exception (service degraded). Automate responses where possible.

### Step 5: Continual Service Improvement (CSI)
Identify and prioritize improvement opportunities. Measure and analyze service performance. Create and manage improvement plans. Track CSI register items from identification through implementation and review.

The CSI Approach:
1. What is the vision? - Align with business strategy
2. Where are we now? - Baseline assessment
3. Where do we want to be? - Define measurable targets
4. How do we get there? - Define improvement plan
5. Take action - Execute improvement activities
6. Did we get there? - Evaluate results
7. How do we keep the momentum? - Embed improvements

CSI Register template:
| ID | Opportunity | Source | Priority | Owner | Status | Target Date |
|----|-------------|--------|----------|-------|--------|-------------|

### Step 6: Process Integration
Integrate incident, problem, change, release, and service level processes. Maintain process interfaces and handoffs. Ensure process consistency and tool integration. Conduct periodic process maturity assessments.

## Common Pitfalls

Pitfall 1: ITIL as a project rather than a practice. Implementing ITIL processes and then declaring done leads to process decay. ITIL requires continuous improvement culture, not a one-time implementation project.

Pitfall 2: Over-engineering processes. ITIL describes what to do, not how. Adapt the framework to your organization size and complexity. A 20-person startup does not need the same process rigor as a 10,000-person enterprise.

Pitfall 3: Tool-first implementation. Buying a service management tool before designing processes leads to tool-driven processes that may not fit. Design processes first, then select tools that support them.

Pitfall 4: Incident management without problem management. Fixing incidents without investigating root causes leads to repeat incidents and firefighting culture. Problem management breaks the cycle.

Pitfall 5: Change management as a bottleneck. Too many changes requiring CAB approval slows delivery. Use change models (standard, normal, emergency) with appropriate approval paths. Standard changes are pre-approved.

Pitfall 6: No CMDB maintenance. Configuration management is foundational but often neglected. An inaccurate CMDB is worse than none because it creates false confidence. Invest in automated discovery and CI reconciliation.

Pitfall 7: SLA targets without measurements. Defining SLA targets without systems to measure them is meaningless. Ensure every SLA metric is instrumented before the agreement is signed.

## Best Practices

Practice 1: Start with the highest-pain processes. Assess which ITIL process gaps cause the most operational pain. Fix those first. For most organizations, incident and problem management are the highest impact.

Practice 2: Define clear process owners. Every process needs an owner accountable for design, implementation, and improvement. The owner ensures the process remains effective and current.

Practice 3: Automate low-value activities. Ticket routing, SLA notifications, status updates, approval escalations, report generation -- automate everything that does not require human judgment.

Practice 4: Measure what matters. Link process KPIs to business outcomes. Incident resolution time matters less if the business impact is low. Focus on business-impacting metrics: customer-facing downtime, revenue-impacting incidents, SLA breach rate.

Practice 5: Hold regular process review meetings. Incident review weekly, problem review bi-weekly, change advisory board weekly, CAB/emergency review monthly, CSI review quarterly.

Practice 6: Train and certify teams. ITIL 4 Foundation certification for all service management staff. Practitioner level for process owners and managers. Renew knowledge through ongoing training.

## Templates & Tools

### Key ITIL Metrics Dashboard
| Process          | Metric                        | Target               |
|------------------|-------------------------------|----------------------|
| Incident         | Mean Time to Resolve (MTTR)   | < 4 hours (P1/P2)    |
| Incident         | First Response Time           | < 15 min (P1)        |
| Incident         | SLA Breach Rate               | < 2%                 |
| Problem          | Problem-to-Incident Ratio     | > 1:10               |
| Problem          | Mean Time to Diagnose         | < 5 business days    |
| Change           | Change Success Rate           | > 99%                |
| Change           | Emergency Change Ratio        | < 10% of total       |
| Release          | Release Failure Rate          | < 2%                 |
| Service Level    | Service Availability          | > 99.9% (Tier-1)     |

### ITIL 4 vs ITIL v3 Crosswalk
| ITIL 4 Practice | ITIL v3 Process | Key Differences |
|-----------------|-----------------|-----------------|
| Incident Management | Incident Management | Added AI/automation, shifted to value focus |
| Problem Management | Problem Management | Integrated with knowledge management |
| Change Enablement | Change Management | Reduced bureaucracy, faster approvals |
| Release Management | Release and Deployment Management | DevOps integration, CI/CD focus |
| Service Desk | Service Desk | Multichannel, self-service, AI chatbots |
| Service Level Management | Service Level Management | CX-focused, experience SLAs |

### Tools Reference
- ServiceNow / Jira Service Management for ITSM platform
- Atlassian (Jira + Confluence) for integrated ITIL practices
- PagerDuty / OpsGenie for incident management and escalation
- Microsoft Teams / Slack for collaboration and notifications
- Lucidchart for process documentation
- Grafana / Splunk for monitoring and event management

## Case Studies

### Case Study 1: Incident-to-Problem Transformation
A SaaS company was firefighting 200+ incidents per month with recurring issues accounting for 60% of volume. Implementing ITIL problem management with known error database reduced recurring incidents by 70% over 6 months. Root cause analysis on the top-10 recurring incidents identified 3 systemic issues. Fixing those eliminated 40% of total incident volume. Operational costs reduced by 25%.

### Case Study 2: Change Management Optimization
An enterprise with 500+ weekly changes was bottlenecked by a single weekly CAB meeting. Implementing change models (standard, minor, major, significant) and pre-approving standard changes reduced CAB workload by 60%. Standard changes (40% of total) bypassed CAB entirely. Minor changes (35%) had streamlined peer review. CAB focused on major and significant changes (25%). Change throughput increased 3x.

### Case Study 3: Service Level Management Reset
A managed service provider had 47 different SLAs, most of which could not be measured. Consolidating to 8 meaningful SLAs with automated measurement and reporting transformed customer relationships. Each SLA had a clear metric, measurement source, and reporting cadence. SLA breach rate dropped from 15% to 2% within 3 months. Customer satisfaction scores improved 40%.

## Code Examples

### Incident Priority Calculator (Python)
```python
from enum import Enum
from dataclasses import dataclass
from datetime import datetime, timedelta

class Impact(Enum):
    MAJOR = "major"       # Customer-facing outage, revenue impact
    MINOR = "minor"       # Partial functionality, workaround exists
    NONE = "none"         # Cosmetic, no business impact

class Urgency(Enum):
    CRITICAL = "critical"  # Spreading rapidly, SLA breach imminent
    HIGH = "high"          # Significant, needs fast resolution
    LOW = "low"            # Acceptable delay

@dataclass
class Incident:
    title: str
    impact: Impact
    urgency: Urgency
    affected_users: int
    revenue_impact: float  # $/hour
    created_at: datetime

    def priority(self) -> str:
        matrix = {
            (Impact.MAJOR, Urgency.CRITICAL): "P1",
            (Impact.MAJOR, Urgency.HIGH): "P2",
            (Impact.MAJOR, Urgency.LOW): "P3",
            (Impact.MINOR, Urgency.CRITICAL): "P2",
            (Impact.MINOR, Urgency.HIGH): "P3",
            (Impact.MINOR, Urgency.LOW): "P4",
            (Impact.NONE, Urgency.CRITICAL): "P4",
            (Impact.NONE, Urgency.HIGH): "P5",
            (Impact.NONE, Urgency.LOW): "P5",
        }
        return matrix.get((self.impact, self.urgency), "P5")

    def sla_target(self) -> timedelta:
        sla = {"P1": timedelta(hours=4), "P2": timedelta(hours=8), "P3": timedelta(hours=24),
               "P4": timedelta(days=5), "P5": timedelta(days=30)}
        return sla.get(self.priority(), timedelta(hours=24))

    def response_target(self) -> timedelta:
        response = {"P1": timedelta(minutes=15), "P2": timedelta(minutes=30),
                    "P3": timedelta(hours=2), "P4": timedelta(hours=4), "P5": timedelta(hours=8)}
        return response.get(self.priority(), timedelta(hours=2))

incident = Incident("Payment gateway down", Impact.MAJOR, Urgency.CRITICAL, 50000, 50000, datetime.now())
print(f"Priority: {incident.priority()}, Resolution SLA: {incident.sla_target()}")
```

### Change Advisory Board Workflow (YAML)
```yaml
change_types:
  standard:
    approval: pre-approved
    examples:
      - password reset
      - DNS record update
      - server reboot (non-prod)
    notice_period: 0
    cab_required: false

  normal_minor:
    approval: peer_review
    notice_period: 24h
    cab_required: false
    risk_level: low

  normal_major:
    approval: cab_vote
    notice_period: 1 week
    cab_required: true
    risk_level: medium
    required_approvals: 3

  normal_significant:
    approval: cab_executive
    notice_period: 2 weeks
    cab_required: true
    risk_level: high
    required_approvals: [cab_chair, cto, vp_product]

  emergency:
    approval: ecab_designated
    notice_period: 0
    cab_required: false
    retrospective_review: 5_business_days
    risk_level: any
    documentation: "Post-change within 24h"
```

### Problem Management Workflow (Python)
```python
@dataclass
class KnownError:
    id: str
    symptom: str
    root_cause: str
    workaround: str
    linked_incidents: list[str]
    fix_version: str
    created_at: datetime
    resolved: bool = False

class ProblemManager:
    def __init__(self):
        self.known_errors: dict[str, KnownError] = {}
        self.problem_records = []

    def create_from_incidents(self, incidents: list[Incident]):
        if len(incidents) >= 3:
            problem = KnownError(
                id=f"KE-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
                symptom=incidents[0].title,
                root_cause="Under investigation",
                workaround="",
                linked_incidents=[i.title for i in incidents],
                fix_version="TBD",
                created_at=datetime.now()
            )
            self.known_errors[problem.id] = problem
            return problem
        return None

    def get_recurring_incidents(self, all_incidents: list[Incident]) -> dict:
        from collections import Counter
        titles = [i.title for i in all_incidents]
        return {k: v for k, v in Counter(titles).items() if v >= 3}
```

### SLA Compliance Calculator (Python)
```python
@dataclass
class SLAMetric:
    name: str
    target_pct: float
    numerator: int
    denominator: int

    def compliance(self) -> float:
        return (self.numerator / self.denominator * 100) if self.denominator > 0 else 100.0

    def breached(self) -> bool:
        return self.compliance() < self.target_pct

class SLAReport:
    def __init__(self, service_name: str, period: str):
        self.service = service_name
        self.period = period
        self.metrics: list[SLAMetric] = []

    def add_metric(self, name: str, target: float, good: int, total: int):
        self.metrics.append(SLAMetric(name, target, good, total))

    def generate(self) -> str:
        lines = [f"# SLA Report: {self.service} ({self.period})", ""]
        for m in self.metrics:
            status = "BREACHED" if m.breached() else "OK"
            lines.append(f"| {m.name} | {m.compliance():.2f}% | {m.target_pct}% | {status} |")
        return "\n".join(lines)

report = SLAReport("Payment Service", "2026-05")
report.add_metric("Availability", 99.95, 44640, 44650)
report.add_metric("Response Time (P1)", 95.0, 28, 30)
print(report.generate())
```

## Anti-Patterns

### Anti-Pattern 1: ITIL as a Waterfall Project
Implementing all ITIL processes in one massive project with a 12-month timeline. By month 8, the business needs have changed and the implemented processes are already outdated. Adopt ITIL iteratively: start with incident + problem management (highest pain), then add change, then release, then service level.

### Anti-Pattern 2: Process Without Automation
Designing elaborate workflows that require manual ticket routing, manual SLA tracking, and manual escalation. The process collapses under volume. Automate routing, SLA monitoring, notification, and escalation. People should only intervene for judgment decisions.

### Anti-Pattern 3: Change Board as a Gate
Every change, including P4 standard changes, requires CAB approval. CAB meetings become a rubber-stamp session of 50 changes, with no meaningful review. Use change models with pre-approval for standard changes. CAB should only review high-risk, complex changes.

### Anti-Pattern 4: Incident-Myopic Culture
Tracking incident metrics but ignoring problem management. The team becomes great at firefighting but never reduces the fire load. Every P1 and recurring P2 incident must trigger a problem record. Track problem-to-incident ratio as a KPI.

### Anti-Pattern 5: CMDB as a Shelf-Ware Project
Investing heavily in CMDB setup but no ongoing maintenance. The CMDB is 40% accurate within 3 months. Teams stop trusting it and bypass change impact analysis. Use automated discovery tools that continuously update CI relationships.

## Rules
- All incidents must be logged with priority classification and SLA timestamp.
- Major incidents require immediate escalation to incident manager and CAB.
- Known errors must be documented with workaround and linked to related incidents.
- Change requests must follow classification-based approval routing.
- Emergency changes require retrospective review within 5 business days.
- Release units must be defined with rollback and back-out procedures.
- Service level targets must be measurable, attainable, and regularly reviewed.
- CSI register items must have assigned owners and target dates.
- Incident response time measured from ticket creation to first responder assignment.
- Problem management conducted for all P1 and recurring P2 incidents.
- CMDB accuracy validated monthly through automated discovery.
- Service level reviews conducted quarterly with service owners.
- Standard change models reviewed and updated annually.
- Release pipeline includes automated testing and rollback capability.
- Service management processes audited annually for effectiveness.
- Process documentation versioned and reviewed within 12 months.

### Service Management Process Templates
```yaml
# Incident Management Process Definition
incident_management:
  process_owner: incident-manager@example.com
  triggers:
    - "User reports service disruption"
    - "Monitoring alert fires"
    - "Automated health check failure"
    - "Vendor reports incident"
  process_flow:
    1: { step: "Log and categorize", owner: "service-desk", target_sla: "5min" }
    2: { step: "Initial diagnosis", owner: "l1-support", target_sla: "15min" }
    3: { step: "Priority assignment", owner: "incident-manager", target_sla: "10min" }
    4: { step: "P1/P2 escalation", owner: "incident-manager", target_sla: "5min", channel: "pagerduty" }
    5: { step: "Investigation and diagnosis", owner: "l2-support", target_sla: "2h" }
    6: { step: "Resolution and recovery", owner: "technical-team", target_sla: "varies-by-priority" }
    7: { step: "Incident closure", owner: "service-desk", criteria: "user-confirms-resolution" }
    8: { step: "Post-incident review", owner: "incident-manager", trigger: "P1-and-P2", timeline: "5-business-days" }
  escalation_rules:
    p1_breach_15min: { esc_to: "service-delivery-manager", channel: "phone" }
    p1_breach_30min: { esc_to: "cto", channel: "phone + email" }
    p2_breach_1h: { esc_to: "service-delivery-manager", channel: "phone" }
    no_response_10min: { esc_to: "on-call-manager", channel: "auto-escalate" }

# Problem Management Process
problem_management:
  triggers:
    - "3+ similar incidents in 7 days"
    - "Any P1 incident requiring root cause"
    - "Vendor advisory about known issue"
    - "Proactive trend analysis"
  process_flow:
    1: { step: "Problem record creation", trigger: "recurring-incidents", owner: "problem-manager" }
    2: { step: "Categorization and prioritization", owner: "problem-manager" }
    3: { step: "Root cause analysis", methods: ["5-whys", "fishbone", "Kepner-Tregoe"], target: "5-business-days" }
    4: { step: "Known error record", fields: ["symptom", "root_cause", "workaround", "affected_cis"] }
    5: { step: "Workaround documentation", owner: "technical-team", target: "1-business-day" }
    6: { step: "Change request for permanent fix", ref: "change-enablement" }
    7: { step: "Closure criteria", conditions: ["rca_accepted", "fix_deployed", "workaround_documented"] }

# CSI Register and Improvement Tracking
| ID | Opportunity | Source | Priority | Owner | Status | Target Date |
|----|-------------|--------|----------|-------|--------|-------------|
| CSI-001 | Automate incident categorization | Incident Review | High | Platform Team | In Progress | 2026-07-15 |
| CSI-002 | Reduce P1 MTTR by 20% | Q2 Metrics | High | SRE Team | Planned | 2026-09-01 |
| CSI-003 | Implement SLI dashboard | Customer Feedback | Medium | Monitoring Team | Not Started | 2026-08-01 |
| CSI-004 | Automate CAB agenda generation | CAB Retrospective | Low | ITSM Team | Done | 2026-05-01 |
```

## References
  - references/change-release-mgmt.md -- Change and Release Management
  - references/incident-problem-mgmt.md -- Incident and Problem Management
  - references/itil-service-mgmt-advanced.md -- ITIL Service Management Advanced Topics
  - references/itil-service-mgmt-fundamentals.md -- ITIL Service Management Fundamentals
  - references/itil-service-transition.md -- ITIL Service Transition Reference
  - references/itil-service-operation.md -- ITIL Service Operation Reference
  - references/service-level-mgmt.md -- Service Level Management
  - references/service-lifecycle.md -- ITIL Service Lifecycle
  - references/capacity-availability-management.md -- Capacity and Availability Management
## Handoff
For compliance alignment, hand off to `enterprise-compliance-audit` for regulatory control mapping. For architecture decisions, hand off to `enterprise-architecture-governance` for review board approvals.
