---
name: create-adr
description: >
  Use this skill when the user says 'architecture decision', 'ADR', 'document this decision', 'why did we choose', 'record architecture choice', 'tech decision', or when a PRD exists and technology choices need to be documented. This skill records every significant technical decision with context, alternatives considered, rationale, and consequences. Uses MADR format. One ADR per decision. Do NOT use for: implementation details, code reviews, daily notes, or decisions that are already obvious or trivial.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [planning, phase-1, architecture, documentation]
---

# Create ADR

## Purpose
Document significant technical decisions with full context, alternatives considered, rationale, and consequences. One ADR file per decision. ADRs serve as the institutional memory of why the system is built the way it is, preventing repeated debates and providing context for future architects.

## Architecture/Decision Trees

### Should You Write an ADR?
```
Is this a significant technical decision with lasting impact?
  |-- YES --> Does it affect architecture, data model, or system behavior?
  |     |-- YES --> Does it have multiple valid alternatives?
  |     |     |-- YES --> WRITE AN ADR
  |     |     |-- NO  --> Skip (trivial decision)
  |     |-- NO --> Skip (operational detail)
  |-- NO --> Skip (not architecture-relevant)

Is this decision likely to be questioned or revisited later?
  |-- YES --> WRITE AN ADR (preempt future debates)
  |-- NO --> Is the rationale non-obvious?
        |-- YES --> WRITE AN ADR
        |-- NO --> Skip
```

### ADR Status Lifecycle
```
[Proposed] → [Accepted] → [Superseded by ADR-NNN]
    |              |
    |              └→ [Deprecated]
    └→ [Rejected]
```

## Agent Protocol

### Trigger
Exact user phrases: "architecture decision", "ADR", "document this decision", "why did we choose", "record architecture choice", "tech decision", "write an ADR", "record decision".

### Input Context
Before activating, verify:
- docs/decisions/ directory exists. If not, create it.
- Check existing ADRs for numbering: read docs/decisions/ and find the highest NNN number. New ADR is NNN+1.
- If user gives a specific decision to document, use that. If not, read docs/prd.md and docs/brief.md to identify decisions that need recording.

### Output Artifact
Writes to `docs/decisions/ADR-{NNN}-{kebab-case-title}.md`.

### Response Format
After saving, output exactly:
```
ADR-{NNN}: {title}
Status: {Proposed/Accepted}
Saved to docs/decisions/ADR-{NNN}-{kebab-case-title}.md
```

### Completion Criteria
- [ ] At least 2 alternatives considered per decision (including "do nothing" when applicable).
- [ ] Each alternative has pros AND cons evaluated.
- [ ] Chosen option has explicit rationale (2-3 sentences minimum).
- [ ] Consequences documented (positive, negative, and mitigation).
- [ ] File saved with correct auto-incremented NNN.
- [ ] No implementation code in the ADR.

### Max Response Length
Confirmation: 4 lines maximum. ADR content: unlimited in file, do not echo back in chat unless asked.

## Workflow

### Step 1: Identify Decision Scope
If the user gave a specific decision, use it. Otherwise, read docs/prd.md and identify decisions:
- Database technology (PostgreSQL vs MySQL vs MongoDB)
- API style (REST vs GraphQL vs gRPC)
- Authentication method (JWT vs Session vs OAuth)
- Frontend framework (Server Components vs Client Components)
- State management approach
- Deployment model (self-hosted vs cloud)
- Message broker choice
- Caching strategy

### Step 2: List Alternatives
For each decision, list 2-4 realistic alternatives. Always include the "not doing this" option when it is a valid choice.

### Step 3: Evaluate Each Alternative
For each alternative, document:
- Pros (specific strengths, minimum 2)
- Cons (specific weaknesses, minimum 2)
- Key tradeoffs

### Step 4: State Decision and Rationale
```markdown
# ADR-{NNN}: {Decision Title}

## Status
Accepted

## Context
{Describe the problem, background, and forces that led to this decision. Include relevant constraints, business context, and technical environment. 3-5 sentences.}

## Decision
{State the decision clearly and precisely. "We will use {X} for {purpose} because {primary reason}."}

## Rationale
{2-3 sentences explaining why this is the best choice given the context. Reference specific pros/cons.}

## Consequences

### Positive
- {specific benefit}
- {specific benefit}

### Negative
- {specific tradeoff}
- {specific risk}

### Mitigation
- {how we address the negative consequences}

## Compliance
{How we ensure this decision is followed: code review checks, lint rules, architecture tests, etc.}

## Alternatives Considered

### {Alternative 1}
**Pros:** {list}
**Cons:** {list}
**Why not chosen:** {1 sentence}

### {Alternative 2}
**Pros:** {list}
**Cons:** {list}
**Why not chosen:** {1 sentence}
```

### Step 5: Save
Write to `docs/decisions/ADR-{NNN}-{kebab-case-title}.md`.

## Rules
- One ADR per decision. Do not combine multiple decisions into one file.
- Be impartial when listing alternatives. Do not write pros/cons that favor the chosen option.
- ADRs are immutable once accepted. If a decision changes, write a new ADR that supersedes the old one. Update old ADR status to "Superseded by ADR-NNN."
- If the decision is obvious (e.g., "use HTTPS"), do not create an ADR. Reserve ADRs for non-trivial decisions.
- Include compliance mechanism for every decision. If you cannot enforce it, it is not a real decision.
- Keep context concise but complete — a future team member should understand the situation without external references.
- Avoid temporal language like "currently" or "at this time" — ADRs should remain valid indefinitely.

## Best Practices
- Write ADRs as soon as a decision is made, not weeks later when context is lost.
- Include the decision's relationship to other ADRs (supersedes, extends, conflicts with).
- Use diagrams (C4, decision trees) to illustrate complex trade-offs.
- Review ADRs in the same PR as the implementation code.
- Link ADRs to relevant stories or tickets for traceability.
- Keep a decision log index (README in docs/decisions/) for navigation.

## Common Pitfalls
- **Documenting obvious decisions**: Not every choice needs an ADR — reserve for non-trivial, consequential decisions with alternatives worth recording.
- **Biased alternatives**: Writing pros/cons that clearly favor the chosen option undermines the ADR's value as an objective record.
- **Missing rationale**: Stating the decision without explaining why it was made. The rationale is the most important part.
- **No compliance mechanism**: Without enforcement, an ADR is a wish rather than a decision.
- **Combining multiple decisions**: One ADR per decision keeps the decision log clean and referenceable.
- **Stale ADRs**: ADRs that are superseded or rejected must have their status updated.

## Compared With
| Artifact | Purpose | Immutability | Granularity |
|----------|---------|-------------|-------------|
| ADR | Decision rationale | Immutable | One decision per ADR |
| RFC | Proposal for discussion | Mutable during review | One proposal per RFC |
| Tech spec | Implementation details | Mutable | Feature-level |
| Wiki page | General knowledge | Mutable | Unbounded |
| Code comment | Local rationale | Mutable | Line-level |

## Performance
- ADRs should be readable in under 5 minutes. Keep them concise.
- Decision log should be reviewed quarterly for superseded decisions.
- A team of 10 engineers typically produces 1-2 ADRs per sprint.
- ADR review should be part of code review, not a separate process.

## Tooling/Methodology
- **ADR tools**: adr-tools (command line), Log4bra, adr-log.
- **Storage**: `docs/decisions/` in the repository alongside code.
- **Templates**: MADR (Markdown Any Decision Records), Y-Statements.
- **Review**: Include ADR in the PR for the implementing code changes.
- **Index**: Maintain a README.md in `docs/decisions/` listing all ADRs with status.

## References
  - references/adr-best-practices.md — ADR Best Practices
  - references/adr-examples.md — ADR Examples
  - references/adr-template.md — ADR Template
  - references/adr-workflow.md — ADR Workflow
  - references/create-adr-advanced.md — Create Adr Advanced Topics
  - references/create-adr-fundamentals.md — Create Adr Fundamentals
  - references/adr-decision-capture.md — ADR Decision Capture
  - references/adr-architecture-evolution.md — ADR and Architecture Evolution
## Handoff
Output: ADR files in docs/decisions/
Next skill: create-tech-spec
Carry forward: all ADR files created, key decisions with rationale.
