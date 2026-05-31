---
name: enterprise-architecture-governance
description: >
  Use this skill when establishing or operating architecture governance including review boards, decision rights, and architecture principles.
  This skill enforces: ARB charter, architecture reviews, decision rights framework, principle compliance.
  Do NOT use for: enterprise architecture method, solution design, technology implementation.
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

# Architecture Governance Agent

## Purpose
Guides establishment and operation of architecture governance including Architecture Review Board operations, decision rights frameworks, architecture review processes, and architecture principles management.

## Framework/Methodology

### GOVERN-ARCH Framework
A five-pillar framework for architecture governance:

Pillar 1 - Charter: Define the Architecture Review Board purpose, scope, authority, and membership. Establish decision rights and escalation paths. Document in a formal charter approved by executive leadership.

Pillar 2 - Principles: Establish architecture principles that guide all technology decisions. Principles are enduring but not eternal -- they evolve as the business and technology landscape change. Each principle includes name, statement, rationale, and implications.

Pillar 3 - Process: Design multi-tier architecture review process. Define submission requirements, review criteria, decision categories, and follow-up tracking. Match review depth to change impact.

Pillar 4 - Oversight: Monitor compliance with architecture standards and principles. Track architecture decisions and exceptions. Report governance metrics to leadership. Identify emerging risks and trends.

Pillar 5 - Evolution: Continuously improve governance processes. Adapt to organizational changes. Incorporate lessons from past decisions. Update principles and standards as technology evolves.

### Architecture Decision Rights Model

Decision rights define who can make which architecture decisions:

Domain Architects: Authority for decisions within their domain (e.g., payment domain, inventory domain). Decisions must conform to enterprise principles and standards. Can approve standard changes without ARB review.

Enterprise Architects: Authority for cross-domain decisions, technology standards, and principle interpretations. Chair the ARB. Can approve minor exceptions.

Architecture Review Board: Authority for major architecture decisions, exception approvals, and principle changes. Operates by consensus or voting. Escalation path to CTO/CIO for unresolved conflicts.

CTO/CIO: Final authority on architecture decisions. Typically only involved in escalated disagreements, strategic technology shifts, or decisions with significant investment.

Decision rights must be documented in a RACI matrix covering: technology selection, architecture principle changes, exception approvals, standard definition, reference architecture creation, and technology retirement.

### Architecture Review Tiers

Tier 1 - Lightweight (Team-level): For minor changes within existing standards. No ARB submission needed. Documented decision with team lead approval. 2 business day turnaround.

Tier 2 - Standard (Domain-level): For changes affecting a single domain but outside defined standards. Domain architect review and recommendation. ARB notification after decision. 1 week turnaround.

Tier 3 - Major (ARB-level): For cross-domain changes, new technology introduction, significant architecture changes, or principle exceptions. Full ARB review with presentation. 2-4 week turnaround.

Tier 4 - Strategic (Executive-level): For enterprise-wide architecture changes, technology platform shifts, or high-investment decisions. ARB review + CTO approval. 4-8 week turnaround with phased approach.

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

ARB charter components:
- Purpose and scope: What decisions does the ARB make? What is out of scope?
- Membership: Named roles, term limits, appointment process, voting rights
- Meeting cadence: Weekly, bi-weekly, or monthly. Minimum quorum for decisions.
- Decision authority: Approve, approve with conditions, defer, reject, return for more info
- Escalation: Process for disputes and appeals
- Exceptions: How to request, approve, and track architecture exceptions

ARB membership should include: Chief Architect (chair), domain architects (rotating), security architect, operations representative, business stakeholder, and optionally external advisor.

### Step 2: Design Review Process
Define review tiers (lightweight, standard, full) based on change impact. Create submission templates and review checklists. Establish decision categories (approve, approve with conditions, return, reject). Design follow-up tracking for conditional approvals.

Review submission template should require:
- Problem statement and business context
- Proposed solution description
- Alternative solutions considered
- Architecture principle compliance assessment
- Impact analysis (security, cost, operations, other domains)
- Implementation plan and timeline
- Risks and mitigations

Decision documentation: every review produces a decision record with date, attendees, decision, rationale, conditions (if any), and follow-up dates. Store in architecture repository.

### Step 3: Establish Decision Rights Framework
Map decision categories to decision authorities. Create RACI matrix for architecture decisions. Define delegation rules for routine decisions. Document escalation path for conflicts and appeals. Establish override process for urgent decisions.

Decision categories:
- Technology selection: New technology adoption, version upgrades, replacement decisions
- Architecture approach: Pattern selection, integration style, deployment model
- Standard conformance: Compliance with defined standards, deviation requests
- Principle interpretation: How principles apply to specific contexts
- Exception requests: Time-limited deviations from standards or principles

RACI example:
| Decision Type | Domain Architect | Enterprise Architect | ARB | CTO |
|---------------|-----------------|--------------------|-----|-----|
| Tech selection (within standards) | A/R | C | I | I |
| Tech selection (new standard) | C | R | A | I |
| Principle exception | C | C | R | A |
| Technology retirement | R | A | C | I |

### Step 4: Define Architecture Principles
Develop principle categories (business, data, application, technology, security). Write principles using standard template (name, statement, rationale, implications). Validate principles with stakeholders. Publish principle catalog with governance process.

Principle template:
- Name: Short, memorable identifier
- Statement: The principle in actionable form. "We prefer managed services over self-hosted infrastructure."
- Rationale: Why this principle exists. Business value, risk reduction, cost optimization.
- Implications: What changes when this principle is applied. What teams must do differently.
- Counter-examples: When the principle might not apply.

Principle categories:
- Business principles: Align IT with business strategy, maximize value, minimize total cost of ownership
- Data principles: Data is an asset, shared, accessible, secured, governed
- Application principles: Loosely coupled, independently deployable, stateless where possible
- Technology principles: Standardize on proven technologies, prefer cloud-native, automate everything
- Security principles: Defense in depth, least privilege, secure by default, privacy by design

### Step 5: Operate Governance Processes
Conduct architecture reviews per defined tiers. Manage exception requests with time-limited approvals. Track compliance of implemented solutions. Report governance metrics to leadership. Continuously improve governance processes.

Exception management: Exceptions are time-limited deviations from architecture standards or principles. Each exception has:
- Reason for deviation
- Risk assessment
- Timeline (maximum 12 months, renewable once)
- Remediation plan (how to return to compliance)
- Owner accountable for remediation
- Review milestones

Track exceptions in a register. Send reminder 60 days before expiration. Escalate expired exceptions.

Governance metrics:
- ARB throughput: reviews completed per month, average time to decision
- Exception metrics: open exceptions, aging, expiration rate
- Compliance rate: percentage of projects meeting architecture standards
- Decision quality: post-implementation review satisfaction, rework rate
- Governance velocity: time from submission to decision

## Common Pitfalls

Pitfall 1: ARB as a rubber stamp. If every submission is approved without discussion, the ARB provides no value. Encourage debate. Challenge assumptions. Require alternatives to be considered.

Pitfall 2: Over-governing small decisions. If every technology choice requires ARB approval, teams become dependent and slow. Delegate routine decisions to domain architects. Reserve ARB for significant changes.

Pitfall 3: Principles without teeth. Principles that are aspirational but not enforced create cynicism. Each principle should have clear implications and be referenced in review criteria.

Pitfall 4: No follow-up on conditionally approved decisions. Approving with conditions but never verifying creates architecture drift. Track conditions to closure. Verify implementation.

Pitfall 5: Governance as a gate rather than a service. If ARB is seen as a blocking function, teams will try to bypass it. Position governance as enabling better decisions through expert review.

Pitfall 6: Stale principles and standards. Technology evolves. Principles written 3 years ago may no longer apply. Annual principle review with update process.

Pitfall 7: No representation from all domains. An ARB composed entirely of one domain's architects makes biased decisions. Ensure balanced representation.

Pitfall 8: Missing the business perspective. Architecture decisions made without business context may optimize for technology at the expense of business outcomes. Include business stakeholders in significant reviews.

## Best Practices

Practice 1: Make the ARB a decision-making body, not a review-only body. The ARB should own specific decisions, not just review and recommend. Clear decision authority speeds up governance.

Practice 2: Use architecture decision records (ADRs). Every architecture decision, whether ARB-reviewed or team-level, should be documented in an ADR. Store in version control alongside code.

Practice 3: Create a self-service reference library. Document approved patterns, reference architectures, and technology standards. Teams can self-serve for standard decisions without ARB involvement.

Practice 4: Implement architecture fitness functions. Automated tests that verify architecture characteristics (coupling, cohesion, compliance with standards). Run in CI/CD pipeline.

Practice 5: Hold ARB office hours. Regular open sessions where teams can ask questions, get early feedback, and navigate governance requirements. Reduces surprises at formal review.

Practice 6: Publish governance metrics transparently. Share ARB decisions, exception trends, and compliance rates with the organization. Transparency builds trust and encourages compliance.

## Templates & Tools

### Architecture Decision Record (ADR) Template
```
# ADR-{NNN}: {Title}

## Status
{Proposed / Accepted / Deprecated / Superseded}

## Context
{Problem description, business drivers, constraints}

## Decision
{What was decided}

## Alternatives Considered
{Alternative 1}: {why not selected}
{Alternative 2}: {why not selected}

## Consequences
{Positive and negative implications}

## Compliance
{How compliance will be verified}

## References
{Related ADRs, standards, documents}
```

### Architecture Review Submission Template
```
## Architecture Review Submission

### Request Information
- Submitter: {name}, {team}
- Date: {date}
- Review Tier: {Lightweight / Standard / Major / Strategic}

### Change Description
{What is being proposed? Why?}

### Business Context
{Business driver, expected outcomes, timeline}

### Solution Overview
{Architecture diagram, key components, integration points}

### Alternatives Considered
{At least 2 alternatives with rationale for rejection}

### Principle Compliance
{For each applicable principle: Compliant / Exception Requested}

### Impact Analysis
- Security: {impact}
- Performance: {impact}
- Cost: {impact}
- Operations: {impact}
- Other Domains: {impact}

### Risks and Mitigations
{Risk 1} | {Mitigation 1}
{Risk 2} | {Mitigation 2}

### Attachments
{Diagrams, references, supporting documents}
```

### Tools Reference
- ADR tools: adr-tools, log4brains, markdown-architecture-records
- Architecture modeling: Structurizr, ArchiMate tools, C4 model tools
- Governance tracking: Jira with architecture workflows, Notion, custom ADR database
- Documentation: Confluence, Backstage, Hugo/static site for architecture catalog
- Fitness functions: ArchUnit (Java), NetArchTest (.NET), custom linters
- Diagramming: Draw.io, Lucidchart, Mermaid, PlantUML

## Case Studies

### Case Study 1: ARB Transformation from Gate to Enabler
A large enterprise ARB was viewed as a bottleneck, with 6-week average review times and 80% of submissions returned for insufficient information. The transformation: introduced tiered review (lightweight/standard/major), published submission templates and reference architectures, held weekly office hours. Average review time dropped to 5 days. Team satisfaction with governance improved from 2.1 to 4.3 out of 5.

### Case Study 2: Architecture Exception Proliferation
A company accumulated 47 open architecture exceptions over 3 years, most without expiration dates. A cleanup initiative found that 30 exceptions were no longer relevant (technology had evolved). 12 were extended with new remediation plans. 5 required executive escalation. The exception register was reset with mandatory expiration dates, quarterly review, and automated reminders.

### Case Study 3: Principles-Based Decision Making
A technology company used its architecture principles to make a difficult build-vs-buy decision for a critical platform component. The principle "Prefer managed services over custom infrastructure" guided the decision to use a SaaS solution over building in-house. The decision was documented in an ADR with alternatives considered, cost analysis, and risk assessment. Post-implementation review confirmed the decision was correct, saving an estimated 18 months of development time and $2M in build costs.

## Rules
- All architecture decisions must be documented with rationale and alternatives considered.
- Review decisions must be recorded within 2 business days of the review meeting.
- Exceptions must have explicit expiration dates and remediation plans.
- Architecture principles may only be changed by the Architecture Board.
- No production deployment without architecture sign-off for significant changes.
- Governance metrics must be reported quarterly to executive leadership.
- ARB membership must include balanced representation across domains.
- Principle violations require formal exception or waiver process.
- ADRs stored in version control alongside code for traceability.
- Architecture review tiers applied consistently with clear escalation paths.
- Exception register maintained with automated expiration tracking.
- Architecture principles reviewed annually for continued relevance.
- Fitness functions implemented for automated compliance verification.
- Post-implementation review conducted for all major architecture decisions.
- Governance process reviewed annually for effectiveness and efficiency.

## References
  - references/architecture-board.md -- Architecture Review Board (ARB)
  - references/architecture-governance-advanced.md -- Architecture Governance Advanced Topics
  - references/architecture-governance-board.md -- Architecture Governance Board Reference
  - references/architecture-governance-review.md -- Architecture Governance Review Process
  - references/architecture-governance-fundamentals.md -- Architecture Governance Fundamentals
  - references/architecture-principles.md -- Architecture Principles
  - references/architecture-reviews.md -- Architecture Review Process
  - references/decision-rights.md -- Architecture Decision Rights
## Handoff
For architecture development method, hand off to `enterprise-togaf-zachman` for ADM phase execution. For vendor technology evaluations, hand off to `enterprise-vendor-management` for procurement alignment.
