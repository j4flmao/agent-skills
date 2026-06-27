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

The PRD is the contract between product and engineering. It defines what needs to be built with enough precision that engineers can estimate, designers can prototype, and QA can verify. A great PRD is unambiguous, testable, and scoped to the MVP.

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

How much user research is available?
  |-- EXTENSIVE (user interviews, usability tests, analytics) --> Detailed stories with specific acceptance criteria
  |-- MODERATE (surveys, support tickets, competitive analysis) --> Standard stories, note assumptions
  |-- MINIMAL (assumptions only) --> Lean stories with explicit assumptions, mark for validation

What is the team's maturity with this domain?
  |-- HIGH (built similar products before) --> Shorter stories, skip obvious details
  |-- MEDIUM (some experience) --> Standard detail level
  |-- LOW (new domain) --> Very detailed stories with examples and context
```

### Epic Granularity Decision Tree
```
Can this epic be completed in 1-2 sprints (2-4 weeks)?
  |-- YES --> Epic is appropriately scoped
  |-- NO  --> Split the epic. Ask: "What is the smallest valuable increment?"
        |-- CORE FUNCTIONALITY --> Create epic for minimum viable version
        |-- ENHANCEMENTS --> Defer to V2 or create separate epic

Does this epic describe HOW or WHAT?
  |-- WHAT (user-facing feature) --> Keep as epic, write stories
  |-- HOW (implementation detail) --> Move to tech spec, not PRD
```

## Agent Protocol

### Trigger
Exact user phrases: "create PRD", "product requirements", "write requirements", "epics and stories", "acceptance criteria", "expand the brief", "write user stories".

### Input Context
Before activating, verify:
- `docs/brief-{YYYY-MM-DD}.md` exists. Read it. If multiple briefs exist, use the most recent.
- If no brief exists, route to create-brief first. Output: "No brief found. Activate create-brief to define the product scope first."
- Check for existing PRDs to avoid duplication.

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

No preamble. No postamble. No explanations. No filler/hedging/transitions.

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
Read `docs/brief-{YYYY-MM-DD}.md`. Identify and extract:
- **Problem statement**: What are we solving?
- **Target users**: Who are we solving it for?
- **MVP features**: What must be in scope?
- **Success metrics**: How will we know it works?
- **Technical constraints**: Platform, budget, compliance, integration requirements

**Brief analysis checklist**:
- If the brief is vague, flag specific gaps before generating epics
- If the brief has conflicting information, resolve with the user
- If the brief has more than 7 MVP features, push for prioritization before PRD
- If the brief mentions technologies, note them as constraints, not requirements

### Step 2: Generate Epics
Create 5-8 epics. Each epic covers a logical feature area:

**Standard epic categories**:
- User authentication and account management
- Core domain feature 1 (the primary value delivery mechanism)
- Core domain feature 2 (secondary value delivery)
- Data management and administration
- User interface and experience
- Notifications and communication
- Analytics and reporting
- Integration and APIs

**Epic structure**:
```markdown
### Epic: {Epic Name}
**Description:** {2-3 sentences explaining what this epic covers and why it matters}
**Priority:** {P0/P1/P2/P3}
**Dependencies:** {List of other epics this depends on}
**MVP Feature Reference:** {Link to the brief MVP feature this epic implements}
```

**Priority definitions**:
- **P0**: Must-have for MVP. Without this, the product does not deliver core value.
- **P1**: Important for MVP. Without this, the product works but has poor experience.
- **P2**: Post-MVP but within first release window. Adds significant value.
- **P3**: Nice-to-have. Defer to V2 if timeline is tight.

**Epic scoping rules**:
- Each epic should be completable in 1-2 sprints (2-4 weeks)
- Epics should be independent enough to be implemented in any order
- If a brief has < 5 MVP features, create fewer epics (3-4) with more stories each
- If a brief has > 7 MVP features, push the user to prioritize before proceeding

### Step 3: Generate User Stories per Epic
For each epic, create 3-5 user stories.

**Story format**:
```markdown
### Story: {Story Title}
**As a** {user role}, **I want to** {action} **so that** {value}.

**Acceptance Criteria:**
- Given {precondition} When {action} Then {result}
- Given {precondition} When {action} Then {result}
- Given {precondition} When {action} Then {result}

**Complexity:** [XS/S/M/L/XL]
```

**Rules for stories**:
- Every story must have at least 2 acceptance criteria (1 happy path, 1 edge case).
- Stories must be completable in 1-3 days.
- No technical implementation details in the story or criteria.
- Each story must trace back to an MVP feature from the brief.
- Use consistent role names across all stories.

**Story writing heuristics**:
- If a story describes "the system should" rather than "the user can," it is probably a technical requirement, not a user story.
- If a story involves multiple user roles, split it into separate stories.
- If a story takes more than 3 days, split it into smaller stories.
- If a story contains "and" connecting two actions, split into two stories.

**Acceptance criteria patterns**:
- Happy path: Given valid input When user performs action Then expected success result
- Edge case 1: Given invalid/empty input When user performs action Then graceful error
- Edge case 2: Given system limit reached When user performs action Then appropriate handling
- Permission check: Given unauthorized user When user performs action Then access denied
- State check: Given specific state When user performs action Then expected state transition

**Complexity estimation guide**:
| Size | Effort | Example |
|------|--------|---------|
| XS | < 2 hours | Text change, simple copy update |
| S | 2-4 hours | Single form, simple API call |
| M | 4-8 hours | Feature with moderate logic, 1-2 new screens |
| L | 1-2 days | Complex feature, multiple screens, new services |
| XL | 2-3 days | Large feature, external integrations, data migration |

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

**Non-functional requirement categories to always include**:
- **Performance**: Response times, throughput, resource usage
- **Security**: Auth, encryption, compliance, audit logging
- **Scalability**: Concurrent users, data volume, growth projections
- **Availability**: Uptime SLAs, disaster recovery, backup strategy
- **Compatibility**: Browser, device, OS, API version requirements
- **Accessibility**: WCAG compliance level, screen reader support
- **Internationalization**: Language support, timezone handling, currency formatting

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

**Customizing the DoD**:
- Add project-specific items (e.g., "Accessibility audit passed," "Security review completed")
- Remove items not applicable (e.g., "Deployed to staging" for infrastructure-only work)
- Add team-specific items (e.g., "Performance benchmark recorded")

### Step 6: Save
Write to `docs/prd-{YYYY-MM-DD}.md`.

**File naming convention**: `docs/prd-{YYYY-MM-DD}.md`. If a PRD already exists for today, append a counter: `docs/prd-{YYYY-MM-DD}-v2.md`.

**PRD structure (full document)**:
```markdown
# Product Requirements Document: {Project Name}

## Overview
{Brief description of the product, 2-3 sentences}

## Goals and Success Metrics
{From brief, restated with measurable targets}

## Scope
### In Scope (MVP)
{List of MVP features}
### Out of Scope
{List of explicitly excluded features}

## Epics
{All epics with stories}

## Non-Functional Requirements
{Table of NFRs}

## Definition of Done
{DoD checklist}

## Changelog
| Date | Change | Author |
|------|--------|--------|
```

## Process Patterns

### Pattern 1: The Lean PRD
**When**: Timeline is aggressive or product category is well-understood
**Process**: 3-4 epics, 2-3 stories per epic, minimal non-functional requirements, brief DoD. Focus on the highest-risk areas with detailed stories; leave well-understood areas as epic-level descriptions.
**Best for**: Internal tools, well-understood domains, 2-month MVP timeline.

### Pattern 2: The Full PRD
**When**: New product category, external stakeholder sign-off required, or distributed team
**Process**: 6-8 epics, 4-5 stories per epic, comprehensive NFRs, detailed DoD, user role definitions, data model sketches, error state catalog, accessibility requirements.
**Best for**: Regulated industries, outsourced development, first-of-its-kind products.

### Pattern 3: The Incremental PRD
**When**: Product is already live and iterating
**Process**: Write only the epics and stories for the current iteration. Reference the original PRD for context. Add a changelog section. Do not rewrite the entire PRD.
**Output**: `docs/prd-v2.md` or `docs/prd-{YYYY-MM-DD}.md` with only changed/added epics.

### Pattern 4: The API PRD
**When**: Product is primarily an API or platform
**Process**: Epics map to API capabilities rather than user-facing features. Stories include consumer personas (third-party developers). Acceptance criteria include request/response examples and error codes. Include rate limiting, versioning, and documentation requirements.

## Anti-Patterns

### Anti-Pattern 1: Implementation in Requirements
Writing "System uses Redis cache" instead of "Pages load in under 2 seconds." The PRD describes WHAT, not HOW. Implementation belongs in the tech spec.

### Anti-Pattern 2: Vague Acceptance Criteria
"Users can search" is not testable. "Given the user types 'blue shoes' When they press Enter Then results containing 'blue' or 'shoes' are displayed" is testable.

### Anti-Pattern 3: Epic-Sized Stories
Stories that take more than 3 days should be split. If a story says "and" it probably should be two stories. If the engineer says "this is too big to estimate," split it.

### Anti-Pattern 4: Missing Negative Test Cases
Acceptance criteria should include what happens when things go wrong, not just happy path. Error states, empty states, loading states, and edge cases.

### Anti-Pattern 5: Inconsistent User Roles
Using "Admin" in one story and "Super Admin" in another without defining the difference. Define all user roles and their permissions in a glossary section.

### Anti-Pattern 6: No Definition of Done
Without explicit quality gates, stories are "done" when the developer says so. The DoD replaces subjective completion with objective criteria.

### Anti-Pattern 7: Orphan Stories
Stories that do not trace back to any MVP feature or goal in the brief. Every story must serve a purpose defined in the brief.

### Anti-Pattern 8: The Kitchen Sink PRD
Including every possible feature, story, and edge case for V1. The PRD should be scoped to the MVP. Defer non-critical items to V2 with explicit "deferred" labels.

## Templates

### Standard PRD Template
See Step 6 full document structure above.

### Lean PRD Template
```markdown
# PRD: {Project Name}

## Overview
{2-3 sentences}

## MVP Features
- {Feature 1}
- {Feature 2}
- {Feature 3}

## Epics
### Epic 1: {Name}
{Description}

**Story 1: {Title}**
As a... I want to... so that...
- Given... When... Then...
- Given... When... Then...

### Epic 2: {Name}
...
```

### Story Splitting Template
When a story is too large, split using these patterns:
- **By operation**: Create vs Read vs Update vs Delete
- **By user role**: Admin view vs User view
- **By device**: Desktop vs Mobile vs API
- **By complexity**: Basic version vs Enhanced version
- **By scenario**: Happy path vs Error handling vs Edge cases

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Stories per epic | 3-5 | Count |
| Story completion time | 1-3 days | Developer estimate |
| Acceptance criteria per story | 2-5 | Count |
| Epic-to-brief traceability | 100% | Every epic maps to a brief feature |
| PRD-to-implementation deviation | < 20% | Implemented stories vs planned stories |

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
- Include error states, empty states, and loading states in acceptance criteria.
- Define all user roles and their permissions in a glossary section.
- Use consistent "As a... I want to... so that..." format for all stories.

## Common Pitfalls

### 1. Writing Implementation Details as Requirements
"System uses Redis cache" is implementation, not a requirement. The requirement is "pages load in under 2 seconds." The PRD describes WHAT, the tech spec describes HOW.

### 2. Vague Acceptance Criteria
"Users can search" is not testable. "Given the user types 'blue shoes' When they press Enter Then results containing 'blue' or 'shoes' are displayed within 2 seconds" is testable.

### 3. Scope Creep in Stories
Stories that take more than 3 days should be split. If a story says "and" it probably should be two stories.

### 4. Missing Negative Test Cases
Acceptance criteria should include what happens when things go wrong, not just happy path. Always include at least one error/edge case scenario.

### 5. Inconsistent User Roles
Using "Admin" in one story and "Super Admin" in another without defining the difference. Define all roles upfront.

### 6. No Definition of Done
The team needs explicit quality gates to know when a story is truly done. The DoD should be agreed upon before the first sprint.

### 7. Orphan Stories
Stories without connection to the brief or business goals. Every story should answer: "Which brief feature does this serve?"

### 8. Story Avalanche
40+ stories for a 3-month MVP. Too many stories means they are too granular or scope is too large. Consolidate or trim.

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
- **PRD collaboration**: Google Docs, Notion, Confluence, Coda, GitBook.
- **Story tracking**: Jira, Linear, Asana, Trello, GitHub Issues, Shortcut.
- **Gherkin**: Cucumber, SpecFlow, Behat for executable specifications.
- **Version control**: Git-based PRD in `docs/` directory for change tracking.
- **Review process**: PR (pull request) on the PRD document for asynchronous feedback.
- **Visual modeling**: Miro, FigJam, Lucidchart for epic dependency mapping.

## References
  - references/create-prd-fundamentals.md — PRD Fundamentals
  - references/create-prd-advanced.md — PRD Advanced Topics
  - references/prd-collaboration.md — PRD Collaboration
  - references/prd-examples.md — PRD Examples
  - references/prd-review-checklist.md — PRD Review Checklist
  - references/prd-template.md — Product Requirements Document Template
  - references/prd-template-structure.md — PRD Template Structure
  - references/prd-stakeholder-review.md — PRD Stakeholder Review

## Handoff
Output: `docs/prd-{YYYY-MM-DD}.md`
Next skill: create-adr
Carry forward: brief content, epics list, priority order, non-functional requirements.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.