---
name: create-prd
description: >
  Use this skill when the user says 'create PRD', 'product requirements', 'write requirements', 'epics and stories', 'acceptance criteria', or when docs/brief.md exists and needs expansion into a full Product Requirements Document. This skill reads the brief, generates 5-8 epics, and for each epic creates 3-5 user stories with Gherkin acceptance criteria. It also produces non-functional requirements and a Definition of Done. Do NOT use for: recording architecture decisions or writing technical specifications.
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

# Create PRD

## Purpose
Expand a Product Brief into a comprehensive Product Requirements Document with epics, user stories (Gherkin), non-functional requirements, and Definition of Done.

## Agent Protocol

### Trigger
Exact user phrases: "create PRD", "product requirements", "write requirements", "epics and stories", "acceptance criteria", "expand the brief", "write user stories".

### Input Context
Before activating, verify:
- `docs/brief-{YYYY-MM-DD}.md` exists. Read it. If multiple briefs exist, use the most recent.
- If no brief exists, route to create-brief first. Output: "No brief found. Activate create-brief to define the product scope first."

### Output Artifact
Writes to `docs/prd-{YYYY-MM-DD}.md`.

### Response Format
After generation, output exactly:
```
PRD saved to docs/prd-{YYYY-MM-DD}.md
Epics: {n}
Stories: {n}
Non-functional requirements: {n}
Next skill: create-adr
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanations of what a PRD is.

### Completion Criteria
- [ ] Brief read and understood.
- [ ] 5-8 epics generated, each covering a distinct feature area.
- [ ] Each epic has 3-5 user stories with Gherkin acceptance criteria.
- [ ] Non-functional requirements cover: performance, security, scalability, availability.
- [ ] Definition of Done checklist included.
- [ ] File saved to docs/prd-{YYYY-MM-DD}.md.
- [ ] No technical implementation details in user stories.

### Max Response Length
Confirmation: 5 lines exactly. Do not output the full PRD content in the response unless the user explicitly asks to review it.

## Workflow

### Step 1: Read the Brief
Read `docs/brief-{YYYY-MM-DD}.md`. Identify: problem, target users, MVP features, constraints.

### Step 2: Generate Epics
Create 5-8 epics. Each epic covers a logical feature area:
- User authentication and account management
- Core domain feature 1
- Core domain feature 2
- Data management and administration
- User interface and experience
- Notifications and communication
- Analytics and reporting
- Integration and APIs

Each epic must have:
- Name
- Description (2-3 sentences)

### Step 3: Generate User Stories per Epic
For each epic, create 3-5 user stories.

Format:
```markdown
### Story: {Title}
As a {user role}, I want to {action} so that {value}.

**Acceptance Criteria:**
- Given {precondition} When {action} Then {result}
- Given {precondition} When {action} Then {result}
- Given {precondition} When {action} Then {result}

**Complexity:** [XS/S/M/L/XL]
```

Rules for stories:
- Every story must have at least 2 acceptance criteria (1 happy path, 1 edge case).
- Stories must be completable in 1-3 days.
- No technical implementation details in the story or criteria.
- Each story must trace back to an MVP feature from the brief.

### Step 4: Generate Non-Functional Requirements
| Category | Requirement | Target | Verification Method |
|----------|-------------|--------|---------------------|
| Performance | API response time | <200ms p95 | Load testing |
| Performance | Page load time | <3s LCP | Lighthouse |
| Security | Authentication | JWT with refresh rotation | Penetration test |
| Security | Data encryption | AES-256 at rest, TLS 1.3 in transit | Audit |
| Scalability | Concurrent users | 10,000 | Load testing |
| Availability | Uptime | 99.9% | Monitoring |
| Compatibility | Browser support | Last 2 major versions | Automated testing |

### Step 5: Generate Definition of Done
```markdown
## Definition of Done
- [ ] Code complete with unit tests (>80% coverage on new code)
- [ ] Integration tests pass
- [ ] All acceptance criteria met
- [ ] No regressions in existing tests
- [ ] Code reviewed and approved
- [ ] Documentation updated (API docs, README)
- [ ] Deployed to staging environment
- [ ] Smoke tests pass on staging
```

### Step 6: Save
Write to `docs/prd-{YYYY-MM-DD}.md`.

## Rules
- Stories describe WHAT, not HOW. No mention of specific technologies, frameworks, or implementation patterns.
- Every story must have a verifiable acceptance criterion. "Works correctly" is not acceptable.
- Epics should be independent enough to be implemented in any order.
- Do NOT include technical implementation details in the PRD.
- If the brief is very specific (e.g., "build a REST API for orders"), adjust epics accordingly instead of using the template.
- If the brief lacks detail for a section, write "TBD — to be decided during implementation" rather than inventing requirements.

## References
  - references/create-prd-advanced.md — Create Prd Advanced Topics
  - references/create-prd-fundamentals.md — Create Prd Fundamentals
  - references/prd-collaboration.md — PRD Collaboration
  - references/prd-examples.md — PRD Examples
  - references/prd-review-checklist.md — PRD Review Checklist
  - references/prd-template.md — Product Requirements Document: {Project Name}
## Handoff
Output: `docs/prd-{YYYY-MM-DD}.md`
Next skill: create-adr
Carry forward: brief content, epics list, priority order, non-functional requirements.
