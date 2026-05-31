---
name: create-prd
description: >
  Use this skill when the user says 'create PRD', 'product requirements', 'write requirements', 'epics and stories', 'acceptance criteria', or when docs/brief.md exists and needs expansion into a full Product Requirements Document. This skill reads the brief, generates 5-8 epics, and for each epic creates 3-5 user stories with Gherkin acceptance criteria. It also produces non-functional requirements and a Definition of Done. Do NOT use for: recording architecture decisions or writing technical specifications.
version: "2.0.0"
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
Expand a Product Brief into a comprehensive Product Requirements Document with epics, user stories (Gherkin), non-functional requirements, and Definition of Done. The PRD bridges product strategy and engineering execution by translating business goals into structured, verifiable requirements that the entire team can align on.

## Architecture/Decision Trees

### PRD Depth Decision Tree
```
Is the product category well-understood by the team?
  |-- YES --> Do you have detailed user research?
  |     |-- YES --> Full PRD with 6-8 epics, 4-5 stories per epic
  |     |-- NO  --> Lean PRD with 5-6 epics, 2-3 stories per epic
  |-- NO --> Do you have competitive analysis?
        |-- YES --> Standard PRD with 6-8 epics
        |-- NO  --> Start with create-brief first, then PRD after research

Is the timeline aggressive (< 3 months to MVP)?
  |-- YES --> Focus on 3-4 core epics, defer non-critical to V2
  |-- NO --> Full scope with all identified epics
```

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

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output. No explanations of what a PRD is.

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
- Priority (P0-P3)
- Dependencies on other epics

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
- Each story must trace to a specific goal in the brief — no orphan stories.
- Keep epics at feature level, not system level. "Payment processing" is an epic, "Database optimization" is not.
- Avoid solution-oriented language in requirements. "User can export reports" is a requirement. "User can click button to export CSV" is a design detail.

## Best Practices
- Involve stakeholders in epic prioritization before writing detailed stories.
- Write stories collaboratively with engineers to ensure feasibility.
- Use consistent role names across stories (e.g., "Registered User" not "Customer" in one place and "End User" in another).
- Link stories to measurable outcomes (OKRs or KPIs) when possible.
- Review the PRD with at least one representative from engineering, design, and product before finalizing.
- Version the PRD — use `docs/prd-{YYYY-MM-DD}-v2.md` for updates.
- Keep a changelog section at the bottom of the PRD to track changes.

## Common Pitfalls
- **Writing implementation details as requirements**: "System uses Redis cache" is implementation, not a requirement. The requirement is "pages load in under 2 seconds".
- **Vague acceptance criteria**: "Users can search" is not testable. "Given the user types 'blue shoes' When they press Enter Then results containing 'blue' or 'shoes' are displayed within 2 seconds" is testable.
- **Scope creep in stories**: Stories that take more than 3 days should be split. If a story says "and" it probably should be two stories.
- **Missing negative test cases**: Acceptance criteria should include what happens when things go wrong, not just happy path.
- **Inconsistent user roles**: Using "Admin" in one story and "Super Admin" in another without defining the difference.
- **No Definition of Done**: The team needs explicit quality gates to know when a story is truly done.

## Compared With
| Artifact | Purpose | Audience | Detail Level |
|----------|---------|----------|-------------|
| Product Brief | Define vision and scope | Stakeholders | High |
| PRD | Requirements specification | Product, Design, Engineering | Medium |
| Technical Spec | Implementation details | Engineering | High |
| User Stories | Individual features | Dev + QA | Low-Medium |
| Acceptance Tests | Verification criteria | QA, Automation | Precise |

## Performance
- PRDs should be 10-20 pages for most projects. Longer PRDs are rarely read.
- Each epic should be completable within 1-2 sprints (2-4 weeks).
- Keep stories small enough to be completed in 1-3 days by a single developer.
- The time to write a PRD should not exceed 20% of the estimated build time.
- Review cycles: 2-3 rounds of feedback before finalization.

## Tooling/Methodology
- **PRD collaboration**: Google Docs, Notion, Confluence, Coda.
- **Story tracking**: Jira, Linear, Asana, Trello, GitHub Issues.
- **Gherkin**: Cucumber, SpecFlow, Behat for executable specifications.
- **Version control**: Git-based PRD in `docs/` directory for change tracking.
- **Review process**: PR (pull request) on the PRD document for asynchronous feedback.

## References
  - references/create-prd-advanced.md — Create Prd Advanced Topics
  - references/create-prd-fundamentals.md — Create Prd Fundamentals
  - references/prd-collaboration.md — PRD Collaboration
  - references/prd-examples.md — PRD Examples
  - references/prd-review-checklist.md — PRD Review Checklist
  - references/prd-template.md — Product Requirements Document: {Project Name}
  - references/prd-template-structure.md — PRD Template Structure
  - references/prd-stakeholder-review.md — PRD Stakeholder Review
## Handoff
Output: `docs/prd-{YYYY-MM-DD}.md`
Next skill: create-adr
Carry forward: brief content, epics list, priority order, non-functional requirements.
