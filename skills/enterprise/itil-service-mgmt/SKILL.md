---
name: enterprise-itil-service-mgmt
description: >
  Use this skill when applying ITIL 4 framework for IT service management.
  This skill enforces: service lifecycle governance, incident management, change and release management, service level management.
  Do NOT use for: project management, software development methodology, infrastructure operations scheduling.
version: "1.0.0"
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

### Step 2: Service Design
Design services for production environment including availability, capacity, continuity, security, and compliance. Produce service design packages (SDPs). Coordinate with architecture for technology alignment.

### Step 3: Service Transition
Transition new and changed services into production. Manage change, release, and deployment processes. Maintain the service knowledge management system (SKMS). Conduct transition planning and support.

### Step 4: Service Operation
Operate services to deliver agreed levels of service. Manage incidents, problems, requests, and access. Monitor service performance and respond to events. Resolve service disruptions and restore normal operation.

### Step 5: Continual Service Improvement (CSI)
Identify and prioritize improvement opportunities. Measure and analyze service performance. Create and manage improvement plans. Track CSI register items from identification through implementation and review.

### Step 6: Process Integration
Integrate incident, problem, change, release, and service level processes. Maintain process interfaces and handoffs. Ensure process consistency and tool integration. Conduct periodic process maturity assessments.

## Rules
- All incidents must be logged with priority classification and SLA timestamp.
- Major incidents require immediate escalation to incident manager and CAB.
- Known errors must be documented with workaround and linked to related incidents.
- Change requests must follow classification-based approval routing.
- Emergency changes require retrospective review within 5 business days.
- Release units must be defined with rollback and back-out procedures.
- Service level targets must be measurable, attainable, and regularly reviewed.
- CSI register items must have assigned owners and target dates.

## References
  - references/change-release-mgmt.md — Change and Release Management
  - references/incident-problem-mgmt.md — Incident and Problem Management
  - references/itil-service-mgmt-advanced.md — Itil Service Mgmt Advanced Topics
  - references/itil-service-mgmt-fundamentals.md — Itil Service Mgmt Fundamentals
  - references/service-level-mgmt.md — Service Level Management
  - references/service-lifecycle.md — ITIL Service Lifecycle
## Handoff
For compliance alignment, hand off to `enterprise-compliance-audit` for regulatory control mapping. For architecture decisions, hand off to `enterprise-architecture-governance` for review board approvals.
