# ADR Fundamentals

## What is an ADR?
An Architecture Decision Record (ADR) is a document that captures a significant architectural decision along with its context, alternatives, rationale, and consequences. ADRs form the institutional memory of a project's technical evolution.

## When to Write an ADR
Every significant technical decision that has lasting impact, has multiple valid alternatives, or whose rationale is non-obvious deserves an ADR. Trivial, obvious, or reversible decisions do not.

## Core Components

### Context
The situation that created the need for a decision. Include:
- Business drivers and constraints
- Technical environment and existing architecture
- Relevant requirements from PRD or brief
- Competing forces (cost, time, quality, risk)

### Decision
A clear, unambiguous statement of what was chosen. Use: "We will use {X} for {purpose} because {primary reason}."

### Rationale
The reasoning behind the decision. This is the most important section. Explain why this option was chosen over alternatives, referencing specific context from your project.

### Consequences
What happens as a result of this decision:
- **Positive**: Benefits the team can expect
- **Negative**: Tradeoffs and risks
- **Mitigation**: How negative consequences will be addressed

### Alternatives
Other options that were considered and rejected, with brief explanations of why each was not chosen. Include "do nothing" as a baseline when applicable.

## ADR Format (MADR)
MADR (Markdown Any Decision Records) is the most widely adopted format. It uses a simple, consistent markdown structure that is readable in source form and rendered form.

## Basic Rules
- One decision per ADR
- ADRs are immutable once accepted
- Write ADRs when decisions are made, not weeks later
- Include compliance/enforcement mechanisms
- Avoid temporal language like "currently" or "at this time"

## Statuses
- **Proposed**: Under review, not yet binding
- **Accepted**: Approved and binding
- **Deprecated**: Still valid but should not be used for new work
- **Superseded**: Replaced by a newer decision
- **Rejected**: Considered and explicitly not chosen

## Common Questions

**How long should an ADR be?**
200-500 words is ideal. Enough to be complete, short enough to read in 5 minutes.

**How many alternatives do I need?**
At minimum 2, including "do nothing" when applicable. 2-4 is typical.

**Can an ADR be changed after acceptance?**
No. ADRs are immutable. If circumstances change, write a new ADR that supersedes the old one.

**Where should ADRs be stored?**
In `docs/decisions/` within the same repository as the code they describe.

**Who writes ADRs?**
Anyone on the team who makes or participates in a significant technical decision.

## Essential Practices
- Write ADRs as soon as a decision is made
- Keep a decision log index for navigation
- Review ADRs as part of code review
- Link ADRs to related stories or tickets
- Review and update the decision log quarterly
