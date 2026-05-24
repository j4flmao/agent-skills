---
name: enterprise-architecture-governance
description: >
  Use this skill when establishing or operating architecture governance including review boards, decision rights, and architecture principles.
  This skill enforces: ARB charter, architecture reviews, decision rights framework, principle compliance.
  Do NOT use for: enterprise architecture method, solution design, technology implementation.
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

# Architecture Governance Agent

## Purpose
Guides establishment and operation of architecture governance including Architecture Review Board operations, decision rights frameworks, architecture review processes, and architecture principles management.

## Agent Protocol

### Trigger
Exact user phrases: architecture board, ARB, architecture review, architecture governance, decision rights, architecture principles, architecture exception, architecture compliance, review board, architecture standards, architecture oversight.

### Input Context
Before activating, verify:
- What is the organizational structure and existing governance maturity?
- Who are the key architecture stakeholders and decision makers?
- What architecture artifacts and standards currently exist?
- What is the scope of governance (enterprise, domain, project)?

### Output Artifact
Governance charter, review decision, or principle assessment document.

### Response Format
```
## Architecture Governance Artifact
### Context
{scope, stakeholders, governance maturity}

### Decision / Assessment
{review outcome, principle compliance, exception status}

### Rationale
{basis for decision, references}

### Actions / Conditions
{required actions, owners, deadlines}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Architecture Review Board charter defined with membership and decision rights
- [ ] Architecture review process designed with tiers and submission requirements
- [ ] Decision rights framework documented with RACI matrix
- [ ] Architecture principles defined and cataloged
- [ ] Exception process documented with approval paths and time limits
- [ ] Governance escalation path defined
- [ ] Review tracking and follow-up mechanism established
- [ ] Governance metrics defined for effectiveness measurement

### Max Response Length
8000 tokens

## Workflow

### Step 1: Charter Architecture Review Board
Define ARB purpose, scope, and decision authority. Appoint members from architecture, business, security, and operations domains. Establish meeting cadence and quorum requirements. Document charter for executive approval.

### Step 2: Design Review Process
Define review tiers (lightweight, standard, full) based on change impact. Create submission templates and review checklists. Establish decision categories (approve, approve with conditions, return, reject). Design follow-up tracking for conditional approvals.

### Step 3: Establish Decision Rights Framework
Map decision categories to decision authorities. Create RACI matrix for architecture decisions. Define delegation rules for routine decisions. Document escalation path for conflicts and appeals. Establish override process for urgent decisions.

### Step 4: Define Architecture Principles
Develop principle categories (business, data, application, technology, security). Write principles using standard template (name, statement, rationale, implications). Validate principles with stakeholders. Publish principle catalog with governance process.

### Step 5: Operate Governance Processes
Conduct architecture reviews per defined tiers. Manage exception requests with time-limited approvals. Track compliance of implemented solutions. Report governance metrics to leadership. Continuously improve governance processes.

## Rules
- All architecture decisions must be documented with rationale and alternatives considered.
- Review decisions must be recorded within 2 business days of the review meeting.
- Exceptions must have explicit expiration dates and remediation plans.
- Architecture principles may only be changed by the Architecture Board.
- No production deployment without architecture sign-off for significant changes.
- Governance metrics must be reported quarterly to executive leadership.
- ARB membership must include balanced representation across domains.
- Principle violations require formal exception or waiver process.

## References
- `references/architecture-board.md` -- ARB charter, membership, meeting cadence
- `references/architecture-reviews.md` -- Review tiers, process, checklists
- `references/decision-rights.md` -- Decision categories, RACI, delegation
- `references/architecture-principles.md` -- Principle catalog, template, governance

## Handoff
For architecture development method, hand off to `enterprise-togaf-zachman` for ADM phase execution. For vendor technology evaluations, hand off to `enterprise-vendor-management` for procurement alignment.
