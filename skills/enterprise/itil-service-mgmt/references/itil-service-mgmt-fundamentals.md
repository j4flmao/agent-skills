# ITIL Service Management Fundamentals

## Overview
ITIL 4 provides a framework for managing IT services throughout their lifecycle. This covers the Service Value System, incident and problem management, change enablement, service level management, and continual improvement.

## Core Concepts

### ITIL 4 Service Value System (SVS)
Five components: Guiding Principles (7 principles), Governance (direction and oversight), Service Value Chain (6 activities), Practices (34 management practices), Continual Improvement (structured approach).

### Guiding Principles
1. Focus on value: Everything the organization does must map to stakeholder value
2. Start where you are: Assess current state before defining desired state
3. Progress iteratively with feedback: Use feedback loops for continuous improvement
4. Collaborate and promote visibility: Work across silos with shared visibility
5. Think and work holistically: No practice operates in isolation
6. Keep it simple and practical: Avoid over-engineering processes
7. Optimize and automate: Use technology to improve efficiency

### Four Dimensions of Service Management
| Dimension | Focus | Examples |
|-----------|-------|----------|
| Organizations & People | Culture, skills, roles | Team structure, training |
| Information & Technology | Systems, data, tools | ITSM platform, monitoring |
| Partners & Suppliers | Vendors, outsourcing | Service desk provider, cloud vendors |
| Value Streams & Processes | Workflows, procedures | Incident management process, change workflow |

### Service Value Chain Activities
| Activity | Purpose |
|----------|---------|
| Plan | Align strategy and direction |
| Improve | Identify and implement improvements |
| Engage | Understand stakeholder needs |
| Design & Transition | Design services for production |
| Obtain/Build | Acquire or build service components |
| Deliver & Support | Operate and support live services |

## Incident Management

### Incident Priority Matrix
| Priority | Impact | Urgency | Response | Resolution | Escalation |
|----------|--------|---------|----------|------------|------------|
| P1 | Major | Critical | 15min | 4h | Immediate, exec |
| P2 | Major | High | 30min | 8h | Team lead |
| P3 | Minor | High | 2h | 24h | Team lead |
| P4 | Minor | Low | 4h | 5 days | None |
| P5 | None | Low | 8h | Next release | None |

### Incident Lifecycle
1. Detection: User report or monitoring alert
2. Logging: Record with timestamp, description, priority
3. Categorization: Assign category (application, infrastructure, network)
4. Initial diagnosis: Tier 1 attempts resolution
5. Escalation: Functional (to expert team) or hierarchical (to management)
6. Investigation and diagnosis: Tier 2/3 root cause analysis
7. Resolution and recovery: Apply fix or workaround
8. Closure: Verify with user, document resolution

## Problem Management

### Problem vs Incident
Incident: Unplanned interruption or reduction in quality. Fix the symptom, restore service.

Problem: Root cause of one or more incidents. Fix the cause, prevent recurrence.

### Known Error Database (KEDB)
Records: symptom, root cause, workaround, permanent fix, affected CIs, linked incidents. KEDB enables faster incident resolution through known error matching.

### RCA Techniques
- 5 Whys: Iterative questioning to find root cause. Simple, fast, but may not find systemic issues.
- Fishbone (Ishikawa): Categories of potential causes (people, process, technology, environment). Structured, comprehensive.
- Kepner-Tregoe: Problem analysis, decision analysis, potential problem analysis. Rigorous, evidence-based.

## Change Enablement

### Change Types
| Type | Risk | Approval | Notice |
|------|------|----------|--------|
| Standard | Low | Pre-approved | None (post-log) |
| Normal - Minor | Low | Peer review | 24h |
| Normal - Major | Medium | CAB vote | 1 week |
| Normal - Significant | High | CAB + Exec | 2 weeks |
| Emergency | Any | ECAB | Retrospective review |

### Change Advisory Board (CAB)
Representation: Change manager (chair), service owners, technical leads, security, risk/compliance. Meets weekly for major changes. CAB reviews: risk assessment, implementation plan, rollback plan, test results.

## Service Level Management

### SLA Components
- Service description: What is in scope
- Availability targets: Uptime percentage
- Performance targets: Response time, throughput
- Support hours: When support is available
- Response times: Per priority
- Exclusions: Planned maintenance, force majeure
- Credits: Financial penalties for breach

### SLI / SLO / SLA
- SLI (Service Level Indicator): What you measure (e.g., request latency)
- SLO (Service Level Objective): Target value (e.g., 99.9% of requests < 200ms)
- SLA (Service Level Agreement): Contractual commitment (e.g., 99.9% availability, with credits)

## Continual Service Improvement (CSI)

### CSI Approach
1. What is the vision? Align with business strategy
2. Where are we now? Baseline assessment
3. Where do we want to be? Define measurable targets
4. How do we get there? Define improvement plan
5. Take action: Execute improvements
6. Did we get there? Evaluate results
7. How do we keep the momentum? Embed improvements

### CSI Register
Track improvement opportunities: source (incident review, problem RCA, customer feedback), priority, owner, status, target date. Review monthly in CSI meeting.

## Common Pitfalls

### ITIL as a One-Time Project
Implementing all processes and declaring done. ITIL requires continuous improvement culture, not a project with an end date.

### Over-Engineering Processes
Adapt ITIL to your organization size. A 20-person startup does not need the same process rigor as a 10,000-person enterprise.

### Incident Management Without Problem Management
Fixing incidents without investigating root causes leads to repeat incidents and firefighting culture.

### Tool-First Implementation
Buying a service management tool before designing processes leads to tool-driven processes that may not fit.

## Key Points
- ITIL is a framework, not a prescriptive rulebook — adapt to your context
- Incident management restores service; problem management prevents recurrence
- Change types with appropriate approval paths prevent bottlenecks
- SLA, SLO, and SLI must be defined with measurable targets and automated monitoring
- CSI register tracks improvement opportunities from all sources
- CMDB accuracy is foundational — invest in automated discovery
- Start with incident and problem management (highest pain) and expand iteratively
- Process documentation must be versioned and reviewed within 12 months