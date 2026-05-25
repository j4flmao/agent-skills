---
name: create-adr
description: >
  Use this skill when the user says 'architecture decision', 'ADR', 'document this decision', 'why did we choose', 'record architecture choice', 'tech decision', or when a PRD exists and technology choices need to be documented. This skill records every significant technical decision with context, alternatives considered, rationale, and consequences. Uses MADR format. One ADR per decision. Do NOT use for: implementation details, code reviews, daily notes, or decisions that are already obvious or trivial (e.g., "use tabs over spaces").
version: "1.0.0"
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
Document significant technical decisions with full context, alternatives considered, rationale, and consequences. One ADR file per decision.

## Agent Protocol

### Trigger
Exact user phrases: "architecture decision", "ADR", "document this decision", "why did we choose", "record architecture choice", "tech decision", "write an ADR", "record decision".

### Input Context
Before activating, verify:
- docs/decisions/ directory exists. If not, create it.
- Check existing ADRs for numbering: read `docs/decisions/` and find the highest NNN number. New ADR is NNN+1.
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

If multiple decisions are needed:
```
Decisions documented:
1. ADR-{NNN}: {title} — docs/decisions/ADR-{NNN}-{title}.md
2. ADR-{NNN}: {title} — docs/decisions/ADR-{NNN}-{title}.md
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanations of what an ADR is.

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
For each decision, list 2-4 realistic alternatives. Always include the "not doing this" option when it's a valid choice.

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

## References
- `references/adr-best-practices.md` — Adr Best Practices
- `references/adr-examples.md` — Adr Examples
- `references/adr-template.md` — Adr Template
- `references/adr-workflow.md` — Adr Workflow

## Handoff
Output: ADR files in docs/decisions/
Next skill: create-tech-spec
Carry forward: all ADR files created, key decisions with rationale.
