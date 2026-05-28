---
name: enterprise-togaf-zachman
description: >
  Use this skill when applying TOGAF ADM or Zachman Framework for enterprise architecture.
  This skill enforces: ADM phase governance, Zachman cell analysis, architecture content production, stakeholder viewpoint alignment.
  Do NOT use for: solution architecture, implementation coding, infrastructure provisioning.
version: "1.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [enterprise, phase-9]
---

# TOGAF and Zachman Framework Agent

## Purpose
Guides enterprise architecture practice using TOGAF Architecture Development Method (ADM) and Zachman Framework for holistic architecture representation.

## Agent Protocol

### Trigger
Exact user phrases: TOGAF, Zachman, enterprise architecture, ADM, architecture framework, architecture method, architecture development, EA framework, architecture phase, stakeholder viewpoint, architecture building block.

### Input Context
Before activating, verify:
- Which architecture domain(s) are in scope (business/data/application/technology)?
- What is the current ADM phase or Zachman perspective?
- Who are the stakeholders and what viewpoints are needed?
- What architecture assets exist in the repository?

### Output Artifact
Architecture document, viewpoint model, or ADM phase deliverable.

### Response Format
```
## [Framework/Methodology] Artifact
### Context
{phase/cell, stakeholders, scope}

### Deliverable
{structured architecture content}

### Viewpoints Addressed
{stakeholder-viewpoint mappings}

### Next Phase Inputs
{what this phase produces for the next}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] ADM phase inputs and outputs documented
- [ ] Zachman cells populated for scope rows
- [ ] Viewpoints created for identified stakeholders
- [ ] Architecture building blocks identified and catalogued
- [ ] Architecture repository updated with deliverables
- [ ] Governance review completed for phase gate
- [ ] Requirements impact assessed across all cells/phases

### Max Response Length
8000 tokens

## Workflow

### Step 1: Preliminary Phase and Framework Setup
Establish architecture capability. Define architecture principles. Select framework (TOGAF, Zachman, or hybrid). Set up architecture repository. Identify stakeholders. Tailor ADM for organizational context. Define architecture governance bodies. Select architecture tools (Sparx EA, Archi, LeanIX). Establish architecture board charter.

### Step 2: Phase A -- Architecture Vision
Define scope, constraints, and expectations. Identify stakeholders and their concerns. Develop architecture vision statement. Obtain approval. Create business case for architecture work. Identify key architectural issues. Develop value chain diagrams and capability maps.

### Step 3: Phase B-D -- Business, Data, Application, Technology Architecture
Develop baseline and target architectures for each domain. Perform gap analysis. Identify architecture roadmaps. Map deliverables to Zachman cells. Document architecture views per stakeholder. Phase B (Business): process modeling, organizational structure, business goals. Phase C (Data & Applications): data entities, application portfolio, interfaces. Phase D (Technology): hardware, software, network infrastructure.

### Step 4: Phase E-F -- Opportunities and Solutions, Migration Planning
Identify implementation projects. Group into work packages. Create implementation roadmap. Estimate costs and benefits. Prioritize projects. Confirm architecture roadmap with stakeholders. Phase E: identify solutions and implementation strategy. Phase F: create detailed migration plan with phases and dependencies.

### Step 5: Phase G-H -- Implementation Governance and Change Management
Govern implementation. Conduct architecture compliance reviews. Manage architecture changes. Update architecture repository. Monitor architecture context changes. Operate architecture governance framework. Phase G: architecture contract monitoring. Phase H: architecture change management and continuous improvement.

### Step 6: Requirements Management
Capture, track, and prioritize requirements throughout ADM. Assess requirements impact on all architecture domains. Maintain requirements traceability. Feed requirements back into phases. Requirements repository linked to architecture artifacts.

## Architecture / Decision Trees

### Framework Selection Decision Tree

| Framework | Strengths | Weaknesses | Best For |
|---|---|---|---|
| TOGAF | Comprehensive method, industry standard, governance | Heavyweight, can be slow, requires tailoring | Large enterprise transformation |
| Zachman | Holistic view, cell-based analysis, structured | No method, descriptive not prescriptive | Understanding current architecture |
| Hybrid (TOGAF + Zachman) | Method + structure, best of both | Complex to maintain alignment | Most enterprises |

### ADM Phase Decision Points

| Gate | Criteria | Decision |
|---|---|---|
| Preliminary | Architecture principles defined, governance established | Proceed or scope |
| Phase A | Vision approved, stakeholders identified | Proceed or refine |
| Phase B-D | Baseline and target documented, gap analysis done | Proceed or iterate |
| Phase E | Opportunities identified, solutions proposed | Proceed or replan |
| Phase F | Migration plan approved, business case validated | Proceed or review |
| Phase G | Compliance reviewed, contracts active | Proceed or remediate |
| Phase H | Changes managed, repository updated | Continue cycle |

### Zachman Cell Prioritization

| Row (Perspective) | Priority | Rationale |
|---|---|---|
| Executive (Scope) | High | Sets boundaries, stakeholders |
| Business Owner (Business Model) | High | Core processes, value streams |
| Architect (System Model) | High | Technical blueprint |
| Engineer (Technology Model) | Medium | Implementation detail |
| Technician (Detailed Spec) | Low | Operational configuration |
| User (Functioning System) | Low | Runtime view |

### Architecture Repository Structure

| Component | Content | Purpose |
|---|---|---|
| Architecture Metamodel | Entity-relationship definitions | Standardize representation |
| Architecture Landscape | Baseline + target views | Current and future state |
| Reference Library | Standards, patterns, building blocks | Reusable assets |
| Governance Log | Review decisions, waivers, changes | Audit trail |
| Requirements Repository | Stakeholder requirements, traceability | Impact analysis |

## Common Pitfalls

### Pitfall 1: Architecture Without Business Alignment
EA teams build comprehensive models that nobody uses. Architecture must address real business concerns. Start with stakeholder analysis. Map architecture artifacts to business goals. Show traceability from business strategy to technical decisions. If architecture does not help decision-making, it fails.

### Pitfall 2: Over-Documentation
Creating every ADM deliverable in full detail overwhelms stakeholders and consumes resources. Tailor ADM outputs to organizational context. Create only value-adding deliverables. Use iterative detail: high-level in early phases, detailed only when needed for implementation.

### Pitfall 3: Gap Analysis Without Action
Finding gaps between baseline and target is only useful if it drives a remediation plan. Each gap must have an owner, solution approach, and timeline. Review gap closure progress in governance reviews. Close gaps before moving to next phase.

### Pitfall 4: Zachman Obsession
Filling every Zachman cell perfectly leads to analysis paralysis. Zachman is a framework, not a method. Fill cells that matter for current decisions. One perspective (e.g., Owner's row for business model) can be sufficient for a phase. Expand cells as needed.

### Pitfall 5: Governance Without Enforcement
Architecture review boards that approve everything provide no value. Define clear compliance criteria. Conduct compliance reviews at implementation milestones. Exceptions require documented waivers with expiry. Architecture must have teeth.

### Pitfall 6: Ignoring Architecture Repository
Architecture artifacts stored in documents nobody reads provide no value. Repository must be accessible, searchable, and linked. Use EA tools (Sparx, LeanIX, Archi) for living repository. Link to project management and CMDB tools.

### Pitfall 7: Skipping Phase H (Change Management)
Completing the ADM cycle and stopping changes the organization. Phase H is continuous: monitor architecture context, manage changes, update repository. Without Phase H, architecture becomes stale. Schedule regular architecture review cycles.

## Best Practices

### ADM Implementation
- Tailor ADM to organization size and complexity
- Use iterative approach -- focus on high-value domains first
- Integrate with existing governance processes (PMO, ITIL)
- Maintain architecture repository as living system
- Use ADM as method, not checklist -- adapt phases as needed

### Zachman Utilization
- Use Zachman for holistic understanding (What/How/Where/Who/When/Why)
- Focus on 2-3 rows relevant to current initiative
- Fill cells with pointers to detailed artifacts
- Use Zachman to identify gaps in current representation
- Combine with TOGAF for method guidance

### Stakeholder Management
- Identify all stakeholder groups: C-suite, business leads, architects, engineers, auditors
- Map concerns to viewpoints
- Tailor communication per audience
- Use architecture visualization (not just text)
- Establish feedback loop with stakeholders

### Governance Operation
- Architecture Board meets monthly minimum
- Compliance reviews at key project milestones
- Standard exception process with expiry dates
- Architecture repository as single source of truth
- Regular architecture capability assessments

## Compared With

### TOGAF vs Zachman
TOGAF is a method (how to develop architecture). Zachman is an ontology (what to represent about architecture). TOGAF tells you the process steps; Zachman tells you the dimensions. Most enterprises use TOGAF as the method and Zachman as a reference for completeness. They are complementary, not competing.

### TOGAF vs SAFe (for Enterprise)
TOGAF: comprehensive EA framework covering business, data, application, technology architecture. SAFe: agile scaling framework with built-in architectural guidance. SAFe's Enterprise Architect role maps to TOGAF's Phase B-D. SAFe is lighter and more agile; TOGAF is more thorough. Many organizations use SAFe for delivery and TOGAF for architecture governance.

### TOGAF vs ITIL
TOGAF: architecture practice (what to build, how to plan). ITIL: service management (how to operate, how to support). TOGAF Phase D (Technology Architecture) overlaps with ITIL's service design. They address different lifecycle stages: TOGAF for design and planning, ITIL for operations and support.

### Zachman vs ArchiMate
Zachman: 6x6 matrix ontology for classifying EA artifacts. ArchiMate: visual modeling language for representing EA artifacts. Zachman tells you which cell an artifact belongs to. ArchiMate provides notation to describe the artifact. They are complementary: Zachman provides organization; ArchiMate provides representation.

## Operations & Maintenance

### Architecture Repository Maintenance
- Weekly: review pending change requests, update status
- Monthly: repository health check (completeness, accuracy)
- Quarterly: architecture review, stakeholder feedback, update views
- Annually: full framework review, ADM tailoring assessment, repository cleanup

### Architecture Governance Meetings
- Weekly: EA team standup (active work items, blockers)
- Monthly: Architecture Board (compliance review, exception requests)
- Quarterly: architecture review with stakeholders (progress, priorities)
- Annually: full architecture capability assessment (maturity, resources)

### ADM Cycle Management
1. Complete current ADM cycle
2. Review Phase H (change management) effectiveness
3. Assess architecture context changes
4. Update architecture principles and constraints
5. Plan next ADM cycle scope and priorities
6. Communicate architecture updates to stakeholders

### Architecture Compliance Review
1. Project submits architecture design
2. Architecture team reviews against standards, building blocks, roadmap
3. Classification: conformant, conformant with exceptions, non-conformant
4. Exceptions get documented waiver with expiry
5. Non-conformant projects require re-architecture or board escalation
6. Review artifacts added to governance log

## Rules
- All architecture outputs must be stored in the architecture repository
- Viewpoints must map explicitly to identified stakeholder concerns
- Gap analysis must compare baseline and target before migration planning
- Architecture building blocks must be reusable and composable
- Phase gate reviews required before proceeding to next ADM phase
- Zachman cells document both current and target states where applicable
- Stakeholder communication must use appropriate viewpoints and notation
- Architecture change requests follow the governed exception process
- Architecture repository is single source of truth for EA artifacts
- Compliance reviews mandatory at project initiation, design, and deployment
- Exceptions require documented business justification and expiry date
- Architecture capability assessed annually for improvement areas
- EA team engaged before project initiation for alignment

## References
- references/togaf-zachman-fundamentals.md -- Togaf Zachman Fundamentals
- references/togaf-zachman-advanced.md -- Togaf Zachman Advanced Topics
- references/togaf-framework.md -- TOGAF Architecture Development Method (ADM)
- references/architecture-content.md -- Architecture Content Framework
- references/ea-governance.md -- Enterprise Architecture Governance
- references/zachman-framework.md -- Zachman Framework for Enterprise Architecture
- references/togaf-architecture-development.md -- TOGAF Architecture Development
- references/zachman-framework-implementation.md -- Zachman Framework Implementation

## Handoff
For implementation projects, hand off to `enterprise-architecture-governance` for review board decisions, or `enterprise-vendor-management` for technology procurement alignment.
