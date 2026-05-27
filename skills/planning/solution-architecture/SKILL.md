---
name: solution-architecture
description: >
  Make architecture decisions, evaluate trade-offs, select patterns, and document ADRs.
  Use when the user asks about architecture, system design, pattern selection, architecture decision, trade-off analysis, or ADR.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [planning, architecture, phase-1]
---

# Solution Architecture

## Purpose
Guide architecture decisions using ADRs, pattern selection, trade-off analysis, and cross-domain architecture design.

## Agent Protocol

### Trigger
- "architecture decision", "ADR", "system design", "architecture pattern", "architecture review"
- "trade-off", "architecture evaluation", "technology choice", "architecture comparison"
- "non-functional requirements", "NFR", "architecture characteristics"
- "high-level design", "HLD", "solution design"
- "architecture proposal", "architecture document"

### Input Context
- Known requirements, constraints, and context from the user
- If not provided, ask: "What are the key requirements, constraints, and context?"

### Output Artifact
- `docs/decisions/ADR-{number}-{kebab-title}.md` for ADRs
- Architecture diagrams, pattern recommendations, trade-off analysis

### Response Format
```
## Context
{Summary of the requirements, constraints, and current state}

## Analysis
{Options considered, trade-offs evaluated}

## Recommendation
{Selected pattern/decision with rationale}

## ADR
{Link to or inline ADR content}
```

### Completion Criteria
- [ ] Architecture decision(s) documented as ADR(s)
- [ ] Trade-offs explicitly stated
- [ ] Selected pattern justified with context-driven reasoning
- [ ] Rejected alternatives documented with reasons
- [ ] Consequences documented (positive + negative)

### Max Response Length
Unlimited — architecture requires thorough analysis.

## References
  - references/adr-template.md — ADR-{number}: {title}
  - references/architecture-decision-framework.md — Architecture Decision Framework
  - references/architecture-patterns-catalog.md — Architecture Patterns Catalog
  - references/architecture-review-checklist.md — Architecture Review Checklist
  - references/domain-modeling-guide.md — Domain Modeling Guide for Solution Architects
  - references/solution-arch-templates.md — Solution Architecture Templates
  - references/solution-architecture-advanced.md — Solution Architecture Advanced Topics
  - references/solution-architecture-fundamentals.md — Solution Architecture Fundamentals
  - references/system-design-methodology.md — System Design Methodology for Solution Architects
  - references/c4-model-visualization.md — C4 Model for Architecture Visualization
  - references/architecture-evaluation-methods.md — Architecture Evaluation Methods
  - references/architecture-fitness-functions.md — Architecture Fitness Functions
  - references/reference-architectures.md — Reference Architectures for Solution Architects
  - references/architecture-modernization.md — Architecture Modernization
  - references/technology-radar.md — Technology Radar for Solution Architects
  - references/architecture-debt-management.md — Architecture Debt Management
  - references/architecture-leadership.md — Architecture Leadership
  - references/architecture-metrics.md — Architecture Metrics
  - references/architecture-risk-quantification.md — Architecture Risk Quantification
  - references/api-architecture-strategy.md — API Architecture Strategy
  - references/security-architecture-guide.md — Security Architecture Guide
  - references/startup-vs-enterprise-architecture.md — Startup vs Enterprise Architecture
## Handoff
Carry forward: ADR numbers used, decisions made, key trade-offs, outstanding decisions.
