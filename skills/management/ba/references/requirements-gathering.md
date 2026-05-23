# Requirements Gathering

## Elicitation Techniques

| Technique | Best For | Time | Participants |
|-----------|----------|------|-------------|
| Stakeholder interviews | Deep domain understanding | 60 min | 1 stakeholder + BA |
| Focus groups | Multiple perspectives, consensus | 90 min | 5-8 stakeholders |
| Document analysis | Existing system understanding | Varies | BA alone |
| Observation / Job shadowing | Implicit requirements | 2-4 hours | End users |
| Survey / Questionnaire | Broad input, prioritization | N/A | 50-500 respondents |
| Workshop / JAD session | Collaborative requirement definition | 2-4 hours | Cross-functional team |
| Prototyping | Visualizing requirements | Varies | Users + designers |
| User story mapping | End-to-end flow understanding | 2-4 hours | Product team |

## Question Framework

| Category | Questions |
|----------|-----------|
| Problem | What problem are we solving? Who experiences it? How do they work around it now? |
| Users | Who are the users? What are their goals? What is their skill level? |
| Context | When and where is this used? How frequently? What devices/platforms? |
| Constraints | What regulations apply? What technical constraints exist? What budget? |
| Success | How will we measure success? What does done look like? What is the MVP? |
| Integration | What systems does this interact with? What data flows between them? |
| Edge cases | What happens when things go wrong? What is the failure mode? |

## Requirements Types

| Type | Description | Example |
|------|-------------|---------|
| Functional | What the system does | "User can reset password via email link" |
| Non-functional | How the system behaves | "Password reset email arrives within 30 seconds" |
| Business | Organizational needs | "Reduce password reset support tickets by 50%" |
| Stakeholder | Specific user needs | "Admin can reset password for any user" |
| Constraint | Technical or policy limits | "Must use existing SSO provider" |
| Domain | Industry-specific rules | "GDPR requires consent for data processing" |

## Requirements Quality Checklist (SMART)

- Specific: unambiguous, single interpretation
- Measurable: quantified with acceptance criteria
- Achievable: feasible within project constraints
- Relevant: addresses the stated problem
- Testable: verifiable pass/fail condition

## Prioritization Framework (MoSCoW)

| Priority | Definition | % of Effort |
|----------|------------|-------------|
| Must have | Non-negotiable for launch | 60% |
| Should have | Important but can defer | 20% |
| Could have | Nice to have, low cost | 15% |
| Won't have | Explicitly out of scope | 5% |

## Requirements Document Template

```
## BRD: {Feature Name}
### Problem Statement
{what problem are we solving}

### Business Objectives
- {measurable outcome 1}
- {measurable outcome 2}

### Scope
- In scope: {list}
- Out of scope: {list}

### Functional Requirements
FR-1: {description} — Priority: {M/S/C/W}
FR-2: {description} — Priority: {M/S/C/W}

### Non-Functional Requirements
NFR-1: {description} — Acceptance: {metric}

### Assumptions
- {assumption 1}
- {assumption 2}

### Open Questions
- {question 1} — blocks {what}
```

## Validation Techniques

- Walkthrough: present requirements to stakeholders for review
- Prototyping: build visual mockup to validate assumptions
- Scenario testing: walk through use cases step by step
- Acceptance criteria definition: define pass/fail for each requirement
- Peer review: another BA reviews for completeness and clarity

## Common Pitfalls

- Solutionizing: describing HOW instead of WHAT
- Assumption without validation: "users want X" without evidence
- Scope creep: adding requirements during gathering without impact assessment
- Vague language: "fast", "user-friendly", "efficient" — always quantify
- Missing edge cases: only documenting the happy path
- Confirmation bias: seeking evidence for preferred solution
