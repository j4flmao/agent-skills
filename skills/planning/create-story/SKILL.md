---
name: create-story
description: >
  Use this skill when the user says 'create story', 'next story', 'implement STORY-XXX', 'pick up next ticket', 'what should I build next', 'story from PRD', or when the planning phase is done and implementation needs to start. This skill selects the next unimplemented story from the PRD backlog and produces a single, detailed implementation story file with acceptance criteria and technical notes. Do NOT use for: creating epics, writing briefs, technical specs, or recording ADRs.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [planning, phase-1, agile, stories]
---

# Create Story

## Purpose
Generate a single, well-defined implementation story from the PRD backlog, complete with acceptance criteria, technical notes, and complexity estimate. Ready for immediate implementation. A well-crafted story tells a developer exactly what to build, how to verify it, and how it fits into the broader system — while leaving implementation details to the developer's judgment.

## Architecture/Decision Trees

### Story Selection Decision Tree
```
Are there any blocked stories that need resolving?
  |-- YES --> Select the highest-priority blocked story and resolve the blocker
  |-- NO --> Are there stories in the highest-priority epic?
        |-- YES --> Select the first unstarted story from that epic
        |-- NO --> Move to next priority epic

Does the selected story have dependencies on incomplete stories?
  |-- YES --> Can we implement the dependency first?
  |     |-- YES --> Select the dependency story instead
  |     |-- NO  --> Mark as blocked, select next available story
  |-- NO --> Proceed with this story
```

### Story Splitting Decision
```
Can the story be completed in 1-3 days?
  |-- YES --> Good to go
  |-- NO --> Can it be split into vertical slices?
        |-- YES --> Split into 2+ stories, each touching all layers
        |-- NO --> Does it involve significant research?
              |-- YES --> Create a spike story first, then implementation stories
              |-- NO --> Challenge scope assumptions — is everything truly necessary?
```

## Agent Protocol

### Trigger
Exact user phrases: "create story", "next story", "implement STORY-XXX", "pick up ticket", "what should I build next", "story from PRD", "next ticket", "what is next".

### Input Context
Before activating, verify:
- docs/prd-{YYYY-MM-DD}.md exists. Read it.
- docs/stories/ directory exists. Read all existing STORY-*.md files to determine the next NNN and which stories are already defined or in progress.
- docs/specs/ directory may contain relevant specs. Check for the feature matching the next story.
- docs/decisions/ directory may contain relevant ADRs. Read any that apply to the story.

### Output Artifact
Writes to `docs/stories/STORY-{NNN}.md`.

### Response Format
After saving, output exactly:
```
STORY-{NNN}: {title}
Epic: {epic name}
Complexity: {estimate}
Saved to docs/stories/STORY-{NNN}.md
Ready for implementation.
```

No preamble. No postamble. No explanations. No filler. Compress output.

### Completion Criteria
- [ ] PRD read. Next unimplemented story identified from highest-priority epic.
- [ ] Story has a unique NNN (auto-incremented from existing stories).
- [ ] User story format: "As a {user}, I want to {action} so that {value}."
- [ ] Acceptance criteria include happy path AND at least one edge case.
- [ ] Technical notes reference specific files, patterns, and relevant ADRs.
- [ ] Dependencies on other stories documented.
- [ ] Complexity estimated using the defined scale.
- [ ] File saved to docs/stories/STORY-{NNN}.md.

### Max Response Length
Confirmation: exactly 5 lines. Do not output the full story content unless the user explicitly asks.

## Workflow

### Step 1: Read PRD and Existing Stories
Read docs/prd.md to understand epics and priority. Read docs/stories/ to see what has been done.

### Step 2: Select Next Story
Selection order:
1. Stories with "Blocked" status: resolve the dependency first.
2. Highest-priority epic that has incomplete stories.
3. Stories that have no dependencies on other incomplete stories.
4. Stories that build on existing infrastructure (database schema, base services).

### Step 3: Generate Story File
```markdown
# STORY-{NNN}: {Title}

## Status
Ready

## Epic
{parent epic name}

## User Story
As a {user role}, I want to {specific action} so that {specific value}.

## Acceptance Criteria
Happy path:
- Given {initial state} When {action} Then {expected result}
- Given {initial state} When {action} Then {expected result}

Edge cases:
- Given {edge condition} When {action} Then {expected handling}
- Given {edge condition} When {action} Then {expected handling}

Error cases:
- Given {error condition} When {action} Then {error response}

## Technical Notes
- {Specific files to create or modify}
- {Relevant patterns to follow, from stack-specific skills}
- {Database migrations needed, if any}
- {Auth/permissions requirements}
- {Performance considerations}
- Relevant ADRs: ADR-{NNN}, ADR-{NNN}

## Dependencies
- STORY-{NNN}: {description of what must be done first}
- STORY-{NNN}: {optional dependency}

## Complexity
[XS | S | M | L | XL]

| Size | Effort | Example |
|------|--------|---------|
| XS | <2 hours | Config change, simple bug fix |
| S | 2-4 hours | Single endpoint, one component |
| M | 1-2 days | Full feature with DB changes |
| L | 3-5 days | Complex multi-step feature |
| XL | 1-2 weeks | Needs breakdown into multiple stories |
```

### Step 4: Save
Write to `docs/stories/STORY-{NNN}.md`.

## Rules
- One story = one vertical slice of functionality. A story touches all layers (DB, API, UI) for a single feature.
- Stories must be completable in 1-3 days. If it would take longer, split it.
- Every story must have at least 3 acceptance criteria (happy + edge + error).
- Technical notes must reference specific files, not just "implement the feature."
- If the story depends on an ADR, include the ADR number in technical notes.
- Do not create stories for work that is already in progress (Status: "In Progress" in existing stories).
- Use standard user role names consistently across all stories.

## Best Practices
- Write stories from the user's perspective, not the system's. "User can export report" not "System generates CSV".
- Include acceptance criteria for non-functional aspects when relevant (performance, accessibility).
- Reference design files (Figma, Sketch) in technical notes when available.
- Tag related stories (epic, feature area) for filtering in project management tools.
- Update story status as it progresses through the workflow.
- Include edge case criteria that challenge the implementation — not just happy path.

## Common Pitfalls
- **Stories that are too large**: A story that takes more than 3 days should be split. If you find yourself writing "and" in the description, it is likely multiple stories.
- **Missing technical context**: Developers need to know which files to touch, which patterns to follow, and which ADRs apply. Leaving this out causes rework.
- **Vague acceptance criteria**: "It works" is not testable. Every criterion must be verifiable by a human or automated test.
- **Technology prescriptions in stories**: "Add a Redis cache" tells the developer HOW, not WHAT. The requirement is "Pages load in under 2 seconds."
- **No error scenarios**: Stories that only define happy path miss important implementation detail about error handling.
- **Over-specifying**: Telling developers exactly how to implement (specific libraries, line-by-line instructions) defeats the purpose of a story.

## Compared With
| Artifact | Purpose | Detail Level | Audience |
|----------|---------|-------------|----------|
| Epic | Feature area, multiple stories | High | Product, Stakeholders |
| Story | Single vertical slice of functionality | Medium | Dev, QA |
| Task | Implementation breakdown of a story | High | Developer |
| Bug | Defect report | Varies | Dev, QA |
| Spike | Research or exploration | Medium | Developer |
| Technical Spec | Full implementation plan | Very High | Developer, Architect |

## Performance
- A well-written story takes 15-30 minutes to generate.
- Stories should be written at most 1 sprint ahead to avoid waste from changing priorities.
- A team of 4-6 engineers typically completes 8-12 stories per 2-week sprint.
- Story refinement (backlog grooming) should take 2-4 hours per week.

## Tooling/Methodology
- **Project management**: Jira, Linear, Asana, GitHub Issues, Shortcut.
- **Story format**: Confluence, Notion, markdown files in repo.
- **Gherkin**: Cucumber, SpecFlow for executable acceptance criteria.
- **Estimation**: Planning poker, t-shirt sizing, dot voting.
- **Workflow**: Todo -> In Progress -> Review -> Done (or similar Kanban states).

## References
  - references/acceptance-criteria.md — Acceptance Criteria Guide
  - references/create-story-advanced.md — Create Story Advanced Topics
  - references/create-story-fundamentals.md — Create Story Fundamentals
  - references/story-examples.md — Story Examples
  - references/story-refinement.md — Story Refinement
  - references/story-template.md — Story Template
  - references/user-story-splitting.md — User Story Splitting
  - references/user-story-acceptance-criteria.md — User Story Acceptance Criteria
## Handoff
Output: `docs/stories/STORY-{NNN}.md`
Next skill: stack-specific implementation skill (backend or frontend depending on the story)
Carry forward: story content, acceptance criteria, technical notes, relevant ADRs and specs.
