---
name: create-brief
description: >
  Use this skill when the user says 'I want to build', 'new app idea', 'create a brief', 'product brief', 'help me define what I am building', or when no existing brief or PRD exists in the docs/ folder. This skill translates a vague idea into a structured Product Brief. It asks 5 targeted questions one at a time, then produces a brief artifact. Do NOT use for: technical specifications, architecture decisions, or user stories. Those come after the brief.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [planning, phase-1, documentation]
---

# Create Brief

## Purpose
Transform a vague product idea into a structured, one-page Product Brief. This is the first artifact in the planning chain. Every subsequent artifact depends on this one.

## Agent Protocol

### Trigger
Exact user phrases: "I want to build", "new app idea", "create a brief", "product brief", "help me define", "help me figure out what I am building", "start a project".

### Input Context
Before activating, verify:
- master-orchestrator has routed here, OR user has directly asked for a brief.
- No existing brief in docs/ (if one exists, ask: "A brief already exists at {path}. Review or replace?")
- User has at least one sentence describing their idea.

### Output Artifact
Writes to `docs/brief-{YYYY-MM-DD}.md` using the template below. This file is the single source of truth for the project scope.

### Response Format
When asking questions: ask exactly one question. Wait for the user's answer. Do not ask the next question until the current one is answered.

When presenting the draft:
```
## Draft Brief
[insert brief content here]

Does this capture your vision? Reply with changes or 'approved'.
```

When approved:
```
Brief saved to docs/brief-{YYYY-MM-DD}.md
Next skill: create-prd
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanations. No congratulations.

### Completion Criteria
- [ ] All 5 questions asked and answered (or user provided enough detail upfront).
- [ ] Brief follows the template below with all sections populated.
- [ ] User explicitly approved the brief (said "approved", "looks good", "yes").
- [ ] File saved to docs/brief-{YYYY-MM-DD}.md.
- [ ] No technical implementation details appear in the brief.

### Max Response Length
Question: 1 line + 3-4 word options. Draft: unlimited. Approval: 2 lines.

## Workflow

### Step 1: Ask 5 Questions (One at a Time)
Question 1: "Who is the target user? Describe the typical user in one sentence."
Question 2: "What specific problem does this product solve? One sentence."
Question 3: "What makes this different from existing solutions? One sentence."
Question 4: "Scale expectation: how many users in the first 6 months?"
Question 5: "Timeline: when does the MVP need to be ready?"

If the user provides all the information upfront in their first message, skip Q&A and draft directly.

### Step 2: Draft the Brief
```markdown
# Product Brief: {project-name}

## Problem Statement
{3-5 sentences. Who has the problem? Why do existing solutions fail?}

## Target Users
{1-3 sentences describing the primary user persona. Include role, technical level, goals.}

## Core Value Proposition
A {type} that helps {target user} {achieve outcome} by {mechanism}.

## Key Features (MVP)
- {Feature 1}: {one-line description of what it does, not how}
- {Feature 2}: {one-line description}
- {Feature 3}: {one-line description}
- {Feature 4}: {one-line description}
- {Feature 5}: {one-line description}

Aim for 3-5 features. No more than 7.

## Out of Scope
- {What explicitly will NOT be in the MVP}
- {Another excluded feature}

## Success Metrics
| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| {metric} | {number} | {tool or event} |
| {metric} | {number} | {tool or event} |

## Technical Constraints
{Platform requirements, budget, compliance, performance baselines, existing systems to integrate with.}

## Timeline
| Milestone | Date |
|-----------|------|
| MVP Launch | {date} |
```

### Step 3: Present and Iterate
Show the draft to the user. Allow up to 3 rounds of changes. After the third round, state: "I suggest we proceed with the current version. We can refine during the PRD phase."

### Step 4: Save
Write to `docs/brief-{YYYY-MM-DD}.md`.

## Rules
- One question at a time. Never list all 5 questions in a single message.
- Keep the brief to one page (under 40 lines when rendered).
- No technical implementation details. No architecture. No stack choices.
- If the user says "I don't know" to a question, provide a reasonable default and note it.
- If the user provides a very detailed description upfront, skip directly to Step 2.
- Do NOT ask for confirmation before writing the file. Write it and show it.

## References
- `references/brief-examples.md` — Brief Examples
- `references/brief-strategies.md` — Brief Strategies
- `references/brief-template.md` — Brief Template
- `references/brief-templates.md` — Brief Templates

## Handoff
Output: `docs/brief-{YYYY-MM-DD}.md`
Next skill: create-prd
Carry forward: brief content, user's stated problem, target users, MVP features.
