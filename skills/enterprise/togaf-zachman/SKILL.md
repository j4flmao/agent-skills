---
name: enterprise-togaf-zachman
description: >
  Use this skill when applying TOGAF ADM or Zachman Framework for enterprise architecture.
  This skill enforces: ADM phase governance, Zachman cell analysis, architecture content production, stakeholder viewpoint alignment.
  Do NOT use for: solution architecture, implementation coding, infrastructure provisioning.
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
Establish architecture capability. Define architecture principles. Select framework (TOGAF, Zachman, or hybrid). Set up architecture repository. Identify stakeholders. Tailor ADM for organizational context. Define architecture governance bodies.

### Step 2: Phase A — Architecture Vision
Define scope, constraints, and expectations. Identify stakeholders and their concerns. Develop architecture vision statement. Obtain approval. Create business case for architecture work. Identify key architectural issues.

### Step 3: Phase B-D — Business, Data, Application, Technology Architecture
Develop baseline and target architectures for each domain. Perform gap analysis. Identify architecture roadmaps. Map deliverables to Zachman cells. Document architecture views per stakeholder.

### Step 4: Phase E-F — Opportunities and Solutions, Migration Planning
Identify implementation projects. Group into work packages. Create implementation roadmap. Estimate costs and benefits. Prioritize projects. Confirm architecture roadmap with stakeholders.

### Step 5: Phase G-H — Implementation Governance and Change Management
Govern implementation. Conduct architecture compliance reviews. Manage architecture changes. Update architecture repository. Monitor architecture context changes. Operate architecture governance framework.

### Step 6: Requirements Management
Capture, track, and prioritize requirements throughout ADM. Assess requirements impact on all architecture domains. Maintain requirements traceability. Feed requirements back into phases.

## Rules
- All architecture outputs must be stored in the architecture repository.
- Viewpoints must map explicitly to identified stakeholder concerns.
- Gap analysis must compare baseline and target before migration planning.
- Architecture building blocks must be reusable and composable.
- Phase gate reviews required before proceeding to next ADM phase.
- Zachman cells document both current and target states where applicable.
- Stakeholder communication must use appropriate viewpoints and notation.
- Architecture change requests follow the governed exception process.

## References
- `references/togaf-framework.md` — TOGAF ADM phases, deliverables, governance
- `references/zachman-framework.md` — Zachman Framework rows, columns, matrix usage
- `references/architecture-content.md` — Architecture content, views, viewpoints, repository
- `references/ea-governance.md` — EA governance, board, principles, maturity models

## Handoff
For implementation projects, hand off to `enterprise-architecture-governance` for review board decisions, or `enterprise-vendor-management` for technology procurement alignment.
