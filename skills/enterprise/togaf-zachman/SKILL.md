---
name: enterprise-togaf-zachman
description: >
  Use this skill when applying TOGAF ADM or Zachman Framework for enterprise architecture.
  This skill enforces: ADM phase governance, Zachman cell analysis, architecture content production, stakeholder viewpoint alignment.
  Do NOT use for: solution architecture, implementation coding, infrastructure provisioning.
version: "2.0.0"
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

## Decision Trees

### Framework Selection Decision Tree

1. Does the organization need a structured method for architecture development?
   - YES -> Use TOGAF ADM as primary method. Provides step-by-step process, governance, and deliverable templates.
   - NO -> Use Zachman for classification and gap analysis. Descriptive rather than prescriptive.

2. Is the organization in a highly regulated industry (finance, healthcare, government)?
   - YES -> Use TOGAF. Its governance framework and phase gate reviews align with regulatory compliance requirements. Supplement with Zachman rows for audit trail completeness.
   - NO -> Consider lighter framework. If still need structure: tailored TOGAF (remove heavy deliverables, focus on value-adding artifacts). If need holistic classification: Zachman.

3. Are you documenting current architecture or designing future architecture?
   - Current state: Zachman (6x6 matrix provides comprehensive inventory of what exists). Use interrogatives (What, How, Where, Who, When, Why) to ensure complete coverage.
   - Future state: TOGAF ADM (method drives from vision through implementation). Phases A-F provide structured path from strategy to execution.

4. What is the EA team size and maturity?
   - < 5 architects, low maturity: Zachman first (simple classification, low ceremony). Add TOGAF ADM elements gradually as capability matures.
   - 5-20 architects, medium maturity: TOGAF ADM with Zachman overlay. Use ADM for method, Zachman for classification framework.
   - 20+ architects, high maturity: Full TOGAF + Zachman hybrid. ADM phases driven by EA program, Zachman for taxonomy.

5. Hybrid approach: Use TOGAF ADM as the method and Zachman as the ontology. Map ADM deliverables to Zachman cells. Use Zachman rows (Executive, Business, Architect, Engineer, Technician) as viewpoint templates during ADM phases. This provides both process and structure.

### ADM Phase Entry Decision Tree

1. Is there an approved architecture vision?
   - NO -> Begin at Phase A. Stakeholders not aligned. Scope not defined. Business case not approved.
   - YES -> Proceed to Phase B-D. Vision provides scope and stakeholder alignment.

2. Are baseline and target architectures documented?
   - NO for any domain -> Execute Phase B-D for missing domains. Business first, then data, application, technology.
   - YES for all domains -> Proceed to Phase E. Gap analysis complete. Ready for solutions.

3. Are implementation opportunities identified?
   - NO -> Execute Phase E. Group gaps into work packages. Identify solutions. Estimate costs.
   - YES -> Proceed to Phase F. Create migration plan. Prioritize projects.

4. Is the migration plan approved?
   - NO -> Refine Phase F. Adjust priorities. Validate business case. Resubmit for approval.
   - YES -> Proceed to Phase G. Implementation begins. Governance active.

5. Is the implementation complete?
   - NO -> Continue Phase G. Monitor compliance. Review contracts. Manage changes.
   - YES -> Enter Phase H. Update repository. Plan next ADM cycle. Continuous improvement.

### Zachman Cell Prioritization Decision Tree

1. What perspective (row) does the stakeholder need?
   - Executive (Row 1): Scope contextual. High-level goals, strategy, external factors. Deliverable: business strategy map, value chain.
   - Business Owner (Row 2): Business model conceptual. Processes, organization, locations. Deliverable: process models, org charts.
   - Architect (Row 3): System model logical. Requirements, data models, application logic. Deliverable: architecture specifications.
   - Engineer (Row 4): Technology model physical. Implementation details, platform specs. Deliverable: design documents.
   - Technician (Row 5): Detailed specifications. Configuration, deployment, operation. Deliverable: runbooks, configs.
   - User (Row 6): Functioning system. Runtime view, actual instances. Deliverable: system documentation, dashboards.

2. Which interrogative (column) is the focus?
   - What (Data): Data entities, information architecture. Prioritize for data-intensive initiatives.
   - How (Function): Processes, functions, transformations. Prioritize for business process reengineering.
   - Where (Network): Locations, distribution, connectivity. Prioritize for geographic expansion or cloud migration.
   - Who (People): Roles, responsibilities, organizations. Prioritize for organizational change.
   - When (Time): Events, cycles, schedules. Prioritize for real-time systems or scheduling.
   - Why (Motivation): Goals, strategies, objectives. Prioritize for strategic planning.

3. Fill cells in priority order: start with Row 1-2 for stakeholder alignment, then Row 3 for architecture specification. Fill Row 4-5 only when preparing for implementation. Skip Row 6 cells (system already exists).

## Architecture / Decision Tables

### Framework Selection Decision Table

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

## Governance Framework

### Architecture Governance Board Structure
- Executive Sponsor: C-level accountable for EA program. Approves major architecture decisions. Resolves escalated conflicts.
- Chief Architect: Leads EA team. Manages ADM cycle. Owns architecture repository. Reports to executive sponsor.
- Domain Architects: Business, data, application, technology architects. Develop domain architectures. Perform gap analysis.
- Architecture Review Board: Cross-functional team (architecture, security, operations, business). Reviews compliance. Approves exceptions.
- Stakeholder Representatives: Business unit leads. Provide requirements. Validate architecture against business needs.

### Phase Gate Review Process

Preliminary Gate: Architecture principles documented. Governance bodies established. Tools selected. Repository initialized. Decision: proceed to Phase A or refine framework setup.

Phase A Gate: Architecture vision approved by stakeholders. Business case validated. Scope and constraints documented. Decision: proceed to Phase B-D or refine vision.

Phase B-D Gate: Baseline and target architectures documented per domain. Gap analysis complete. Roadmaps defined. Decision: proceed to Phase E or iterate on architecture domains.

Phase E Gate: Implementation opportunities identified. Work packages defined. Solutions evaluated. Decision: proceed to Phase F or replan opportunities.

Phase F Gate: Migration plan approved. Projects prioritized. Business case confirmed. Decision: proceed to Phase G or review priorities.

Phase G Gate: Implementation compliance reviewed. Architecture contracts active. Changes managed. Decision: continue monitoring or remediate.

Phase H Gate: Architecture repository updated. Context changes assessed. Next cycle planned. Decision: continue to next ADM iteration or close program.

### Architecture Compliance Classification
- Conformant: Implementation fully aligns with target architecture. No issues. Standard approval.
- Conformant with Exceptions: Minor deviations with documented justification. Time-limited waiver required. Review at next phase gate.
- Non-Conformant: Material deviation from target architecture. Requires re-architecture or board escalation. Architecture board decides: approve deviation, mandate re-architecture, or update target architecture.

### Architecture Maturity Assessment
Use the following dimensions to assess EA maturity annually:
- Process Maturity: Are ADM phases followed consistently? Are phase gates enforced? Is tailoring documented?
- People Maturity: Are architects trained and certified? Is there a career path? Are business stakeholders engaged?
- Technology Maturity: Is the architecture repository active? Are EA tools integrated with other systems? Is automation in place?
- Governance Maturity: Does the architecture board have authority? Are compliance reviews effective? Are exceptions tracked?
- Value Maturity: Is architecture driving business decisions? Are cost savings measured? Is time-to-market improving?

Rate each dimension 1-5 (1=Initial, 2=Managed, 3=Defined, 4=Quantitatively Managed, 5=Optimizing). Target score: 3+ for all dimensions. Improvement plan for any dimension scoring below 3.

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

### Pitfall 8: Waterfall ADM Execution
Running ADM as a rigid sequential process ignores the reality that architecture domains evolve at different speeds. Run ADM iteratively: focus on high-value domains first, revisit others in subsequent cycles. Use agile EA approaches for faster delivery.

### Pitfall 9: Architecture Repository Tool as Silver Bullet
Buying an EA tool (Sparx, LeanIX) and expecting it to solve architecture problems. Tools enable, they do not create architecture. The method (ADM), the people (architects), and the governance (review board) are what create value. Tool is infrastructure, not solution.

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

### ADM Tailoring for Different Contexts
- Startup/Scale-up: Use ADM Phases A, B-D, E only. Skip Preliminary, G-H until maturity increases. Focus on application and technology architecture.
- Mid-market: Use full ADM but reduce deliverable count. Combine Phase B-D into single iteration. Phase E-F combined into migration roadmap.
- Large Enterprise: Full ADM with all phases. Separate domain architects for B-D. Architecture board with business representation.
- Digital Transformation: Heavy on Phase A (vision) and Phase E (solutions). Light on documentation. Prioritize speed over completeness.

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

## Case Studies

### Case Study 1: TOGAF ADM for Financial Services Transformation
A large bank with 40+ legacy systems needed to modernize their customer onboarding process. Using TOGAF ADM, the EA team started with Phase A (Architecture Vision) to align stakeholders across retail banking, compliance, and IT. Phase B documented the as-is business process requiring 14 system touchpoints and 3-day onboarding time. Phase C mapped data entities (customer, KYC documents, account products) and identified 7 redundant data stores. Phase D designed the target technology architecture with an API gateway, event-driven microservices, and a customer data platform.

Gap analysis revealed 23 capability gaps between baseline and target. Phase E grouped these into 4 work packages: customer portal, KYC automation, account opening engine, and integration layer. Phase F created a 3-phase migration plan progressing from quick wins (portal UX) through core transformation (KYC automation) to full platform. Architecture governance through Phase G ensured each work package maintained compliance with the target architecture. Phase H established quarterly architecture reviews.

Results: Onboarding time reduced from 3 days to 15 minutes. System touchpoints reduced from 14 to 3. Regulatory compliance improved with automated KYC checks. The ADM cycle completed in 9 months for the first iteration.

### Case Study 2: Zachman Framework for Healthcare Data Architecture
A healthcare organization needed to understand their complete data landscape for HIPAA compliance and interoperability planning. They used the Zachman Framework's What column (Data) across all six rows to inventory their information architecture.

Row 1 (Executive): Identified 5 key data domains — patient records, billing, clinical research, operational, regulatory reporting. Row 2 (Business Owner): Mapped 34 business entities with their lifecycle and ownership. Row 3 (Architect): Created logical data model with entity relationships, cardinality, and data flows. Row 4 (Engineer): Documented physical database schemas across 12 systems including EHR, billing, and lab systems. Row 5 (Technician): Detailed configuration of database servers, backup policies, and data retention rules. Row 6 (User): Catalogued actual data instances, volumes, and growth rates.

The Zachman analysis revealed: 3 data entities with no clear owner (governance gap), 2 systems storing duplicate patient demographic data (redundancy), and 1 critical data flow with no backup path (resiliency gap). Remediation: assigned data owners, consolidated patient data into master data management system, and added failover for the critical data flow. Passed HIPAA audit with zero findings related to data governance.

### Case Study 3: Hybrid TOGAF-Zachman for Cloud Migration
A retail company with 200+ applications planned a 3-year cloud migration. The EA team used TOGAF ADM for the migration method and Zachman for architecture completeness. Phase A (Vision) established the cloud strategy and stakeholder alignment. Phase B-D used Zachman's What/How/Where columns to document the current application portfolio (What applications exist, How they integrate, Where they run). This revealed 35 applications with unknown dependencies and 12 applications running on unsupported OS versions.

Phase E prioritized migration waves: low-hanging fruit (15 standalone apps), medium complexity (42 apps with simple dependencies), high complexity (28 apps with complex integrations), and retain on-premise (5 apps with hardware dependencies). Phase F created a detailed migration roadmap with quarterly milestones. Phase G governed migration compliance with cloud architecture standards.

The hybrid approach ensured both method (ADM phases kept migration on track) and completeness (Zachman cells identified gaps that pure ADM would have missed). Migration completed 6 months ahead of schedule because the Zachman analysis uncovered hidden dependencies early.

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
- ADM tailored to organizational maturity — not all deliverables required for every cycle
- Architecture decisions must be traceable to business strategy and stakeholder concerns
- Repository health checked monthly for completeness, accuracy, and currency
- Architecture capability assessments include people, process, and technology dimensions
- ADM cycle reviews incorporate lessons learned from previous cycle for continuous improvement
- Zachman cell analysis includes both current and target states to identify transformation scope

## Implementation Patterns

### Pattern: ADM Phase Checklist Automation

```yaml
# adm-phase-automation.yaml
phases:
  preliminary:
    deliverables:
      - "Architecture Principles Document"
      - "Architecture Governance Charter"
      - "EA Tool Selection"
      - "Repository Setup"
    gates: "Principles approved, governance body active"
    automation:
      - "Template repository initialized from EA tool"
      - "ADR tool configured in repo"
      - "Governance calendar created"

  phase_a:
    deliverables:
      - "Architecture Vision Document"
      - "Stakeholder Map"
      - "Business Case"
      - "Value Chain Diagram"
    gates: "Vision approved by stakeholders"
    automation:
      - "Stakeholder analysis questionnaire sent"
      - "Business case template pre-filled from strategy"

  phase_b_d:
    deliverables:
      - "Baseline Architecture (per domain)"
      - "Target Architecture (per domain)"
      - "Gap Analysis Report"
      - "Architecture Roadmap"
    gates: "Gap analysis complete, roadmap approved"
    automation:
      - "Architecture survey tool deployed for as-is capture"
      - "Gap analysis template auto-populated"
```

### Pattern: Zachman Cell Mapping to ADM Deliverables

```yaml
zachman_adm_mapping:
  row_1_executive:
    what: "Business Strategy Map → Phase A"
    how: "Value Chain → Phase B"
    where: "Geographic Coverage → Phase D"
    who: "Organization Chart → Phase B"
    when: "Strategic Timeline → Phase A"
    why: "Business Goals → Phase A"

  row_2_business_owner:
    what: "Data Entity List → Phase C"
    how: "Business Process Model → Phase B"
    where: "Business Locations → Phase B"
    who: "Role Hierarchy → Phase B"
    when: "Process Schedule → Phase B"
    why: "Business Rules → Phase B"

  row_3_architect:
    what: "Logical Data Model → Phase C"
    how: "Application Architecture → Phase C"
    where: "Logical Network → Phase D"
    who: "Access Rights → Phase B"
    when: "Event Model → Phase C"
    why: "Architecture Principles → Preliminary"

  row_4_engineer:
    what: "Physical Data Model → Phase D"
    how: "System Design → Phase D"
    where: "Physical Network → Phase D"
    who: "Security Model → Phase D"
    when: "Processing Schedule → Phase D"
    why: "Design Constraints → Phase D"
```

## Production Considerations

### EA Tool Integration
- ArchiMate models stored in EA repository (Sparx, LeanIX). Linked to ADM phases.
- ADR tool integrated with repository. Every architecture decision traceable to ADM phase.
- Stakeholder viewpoints generated from repository. One-click report generation.
- Governance dashboard: compliance status per project, exception aging, ADM phase progress.

### ADM Cycle Management
- Full ADM cycle duration: 6-12 months for enterprise transformation. 3-6 months for domain-specific.
- Phase gate reviews scheduled at minimum monthly during active phases.
- Architecture repository review: quarterly completeness and accuracy check.
- ADM tailoring document: updated annually. Reflects organizational maturity and process improvements.

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Fix |
|---|---|---|
| Architecture without business alignment | EA team builds models nobody uses. | Map artifacts to business goals. Show traceability. |
| Over-documentation | 200-page architecture documents nobody reads. | Tailor ADM outputs. Create only value-adding deliverables. |
| Gap analysis without action | Finding gaps without remediation plans. | Every gap has owner, solution, timeline. |
| Zachman obsession | Filling all 36 cells perfectly. Analysis paralysis. | Fill cells that matter for current decisions. Expand as needed. |
| Skipping Phase H | Architecture becomes stale. No continuous improvement. | Schedule regular architecture review cycles. |
| Waterfall ADM execution | Rigid sequential process ignores reality. | Iterative: focus on high-value domains first. |

## Performance Optimization

- EA tool API: automate artifact creation. Scripted generation of stakeholder viewpoints.
- Repository search: full-text index on all architecture artifacts. Cross-reference linking.
- Template library: reusable ADR templates, phase deliverable templates, viewpoint templates.
- Visualization automation: C4 model diagrams generated from architecture repository data.
- Impact analysis: automated dependency graph. Identify affected systems before changes.
- Metrics dashboard: phase completion rate, gate approval velocity, exception resolution time.
- Documentation generation: Markdown export from repository. Published as static site for stakeholders.

## Security Considerations

- Architecture repository access: role-based (viewer, contributor, architect, admin).
- Phase gate approvals: recorded with digital signature. Non-repudiation for audit.
- Security architecture artifacts: classified as internal confidential. Restricted distribution.
- Third-party architecture sharing: sanitized viewpoints only. No internal network details.
- Compliance tracking: all phase gates include security architecture review checklist.
- Repository backup: encrypted. Point-in-time recovery. 90-day retention for daily, 7-year for annual.
- Architecture decision audit: all ADM phase decisions logged with timestamp, author, rationale.

## Handoff
For implementation projects, hand off to `enterprise-architecture-governance` for review board decisions, or `enterprise-vendor-management` for technology procurement alignment.
