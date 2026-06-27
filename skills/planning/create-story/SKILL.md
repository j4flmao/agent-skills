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

Stories are the bridge between product requirements and code. They translate "what the user needs" into "what the developer builds." A great story is small enough to complete quickly, precise enough to avoid ambiguity, and contextual enough to fit the system architecture.

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

Is the story estimated at L or XL?
  |-- YES --> Split into smaller stories before starting
  |-- NO --> Proceed — story is appropriately sized
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

Does the story describe work for multiple user roles?
  |-- YES --> Split by user role — each role gets its own story
  |-- NO --> Does the story contain "and" connecting separate actions?
        |-- YES --> Split into separate stories per action
        |-- NO --> Story scope is appropriate
```

### Story Format Selection Tree
```
What type of work is this?
  |-- USER-FACING FEATURE --> Standard user story: "As a {role}, I want to..."
  |-- TECHNICAL IMPROVEMENT --> Technical story: "As a {developer/system}, I want to..."
  |-- BUG FIX --> Bug story: "Given {context}, when {action}, {unexpected result} occurs"
  |-- RESEARCH/SPIKE --> Spike story: "Research {topic} and recommend {decision}"
  |-- DATA MIGRATION --> Migration story: "Migrate {data} from {source} to {target}"

Is the story for a frontend feature?
  |-- YES --> Include: component tree, state management, API integration, loading/error/empty states
  |-- NO --> Is the story for a backend feature?
        |-- YES --> Include: endpoint contracts, data models, validation, error handling, auth checks
        |-- NO --> Full-stack: include both frontend and backend sections
```

## Agent Protocol

### Trigger
Exact user phrases: "create story", "next story", "implement STORY-XXX", "pick up ticket", "what should I build next", "story from PRD", "next ticket", "what is next".

### Input Context
Before activating, verify:
- `docs/prd-{YYYY-MM-DD}.md` exists. Read it.
- `docs/stories/` directory exists. Read all existing STORY-*.md files to determine the next NNN and which stories are already defined or in progress.
- `docs/specs/` directory may contain relevant specs. Check for the feature matching the next story.
- `docs/decisions/` directory may contain relevant ADRs. Read any that apply to the story.

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

No preamble. No postamble. No explanations. No filler.

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
Read `docs/prd.md` to understand epics and priority. Read `docs/stories/` to see what has been done.

**PRD analysis**:
- Identify the highest-priority epic with incomplete stories
- Check which MVP features from the brief are being addressed
- Note any dependencies between epics
- Review non-functional requirements that may apply

**Existing stories analysis**:
- Find the highest NNN for auto-increment
- Check status of in-progress stories
- Identify blocked stories and their blockers
- Look for related stories (same epic, same feature area)

### Step 2: Select Next Story
Selection order:
1. Stories with "Blocked" status: resolve the dependency first.
2. Highest-priority epic that has incomplete stories.
3. Stories that have no dependencies on other incomplete stories.
4. Stories that build on existing infrastructure (database schema, base services).

**Selection heuristics**:
- Prefer stories that unblock other stories
- Prefer stories that build foundational infrastructure
- Prefer stories with clear acceptance criteria over ambiguous ones
- Avoid selecting stories that depend on incomplete work
- If the next story is too large (L or XL), split it before generating

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
- {UI component references if frontend}
- {API contract references if backend}

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

**Acceptance criteria patterns by type**:
- **Form submission**: Given valid/invalid input When user submits Then success/error
- **Data display**: Given data exists/does not exist When user views page Then data shown/empty state
- **Authentication**: Given authenticated/unauthenticated user When user accesses resource Then access granted/denied
- **Search/filter**: Given search term When user searches Then matching/non-matching results
- **State transition**: Given current state When user performs action Then new state + appropriate feedback
- **Edge case**: Given boundary condition (empty, max length, concurrent access) When user performs action Then graceful handling

### Step 4: Save
Write to `docs/stories/STORY-{NNN}.md`.

**File naming convention**: `STORY-{NNN}.md` with sequential numbering. Use the story title within the file header, not the filename.

## Process Patterns

### Pattern 1: The Vertical Slice Story
**When**: Feature touches all layers (DB, API, UI)
**Process**: Write one story that spans all layers. Acceptance criteria cover the end-to-end behavior. Technical notes specify the changes needed at each layer.
**Benefits**: One story = one complete feature. No integration surprises.

### Pattern 2: The Spike-First Story
**When**: High uncertainty about implementation approach
**Process**: Create a spike story first (timeboxed research). The spike output is a recommendation and implementation notes. Follow with implementation stories based on the spike findings.
**Output**: Spike story + 1-N implementation stories.

### Pattern 3: The Technical Enabler Story
**When**: Infrastructure or refactoring needed before feature work
**Process**: Write stories that deliver value to developers rather than end users. "As a developer, I want a consistent error handling middleware so that API errors are predictable." Acceptance criteria define the developer experience.
**Audience**: Developers, not end users.

### Pattern 4: The Bug Story
**When**: Defect found in production or testing
**Process**: Format acceptance criteria as reproduction steps. Include the expected behavior and actual behavior. Reference the environment and data where the bug was observed. Include regression test requirement.

## Anti-Patterns

### Anti-Pattern 1: The Kitchen Sink Story
A story that tries to do everything at once — multiple user roles, multiple actions, multiple outcomes. Anti-pattern signal: "and" in the story description, > 7 acceptance criteria.

### Anti-Pattern 2: The Prescription Story
Telling developers HOW to implement rather than WHAT to build. "Build a Redis cache" instead of "Pages load in under 2 seconds." Anti-pattern signal: technology names in the story description.

### Anti-Pattern 3: The Ghost Story
A story with no acceptance criteria or with vague criteria like "works correctly." No verifiable definition of done means the story is never truly complete. Anti-pattern signal: 0-1 acceptance criteria.

### Anti-Pattern 4: The Happy-Only Story
Acceptance criteria that only cover success scenarios. No error states, edge cases, or boundary conditions. Anti-pattern signal: all Given/When/Then statements use positive conditions.

### Anti-Pattern 5: The Orphan Story
A story that cannot be traced to an epic or an MVP feature. It exists in isolation without context. Anti-pattern signal: no epic reference, no link to PRD or brief.

### Anti-Pattern 6: The Endless Story
Estimated at XL (1-2 weeks) but not split. These stories are impossible to track progress on — "90% done" for 2 weeks. Anti-pattern signal: complexity "XL" without a split note.

### Anti-Pattern 7: The No-Context Story
Technical notes that say "implement the feature" without referencing files, patterns, ADRs, or existing code. The developer starts from zero every time. Anti-pattern signal: no file references in technical notes.

## Templates

### Standard Story Template
See Step 3 template above.

### Frontend-Specific Story Template
```markdown
# STORY-{NNN}: {Title}

## User Story
As a {user role}, I want to {action} so that {value}.

## Acceptance Criteria
- Given {state} When user {interacts} Then {UI response}
- Given {state} When user {interacts} Then {UI response}

## Component Tree
```
{ParentComponent}
  └── {ChildComponent}
       └── {ChildComponent}
```

## State Management
- {State slice}: {description of what is stored}
- {State slice}: {description of what is stored}

## API Integration
- {Endpoint}: {what it returns}
- {Endpoint}: {what it returns}

## UI States
- Loading: {what user sees}
- Empty: {what user sees}
- Error: {what user sees}
- Success: {what user sees}
```

### Backend-Specific Story Template
```markdown
# STORY-{NNN}: {Title}

## User Story
As a {user role}, I want to {action} so that {value}.

## Acceptance Criteria
- Given {state} When {action} Then {response}
- Given {state} When {action} Then {response}

## API Contract
**Endpoint:** {method} {path}
**Auth required:** {yes/no}
**Request body:** {schema reference}
**Response 200:** {schema reference}
**Error responses:** {status codes and conditions}

## Data Model Changes
- {Table/collection}: {new fields or modifications}
- {Table/collection}: {new fields or modifications}

## Validation Rules
- {Field}: {validation rule}
- {Field}: {validation rule}

## Audit Logging
- {Event}: {what to log}
```

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Story generation time | < 15 minutes | From trigger to save |
| Story size compliance | > 80% are S or M | Count stories by size |
| Acceptance criteria count | > 75% have 3+ criteria | Audit |
| Rework rate | < 10% require changes after implementation | Post-implementation review |
| Blocked story rate | < 15% blocked due to missing dependencies | Track weekly |

## Rules
- One story = one vertical slice of functionality. A story touches all layers (DB, API, UI) for a single feature.
- Stories must be completable in 1-3 days. If it would take longer, split it.
- Every story must have at least 3 acceptance criteria (happy + edge + error).
- Technical notes must reference specific files, not just "implement the feature."
- If the story depends on an ADR, include the ADR number in technical notes.
- Do not create stories for work that is already in progress (Status: "In Progress").
- Use standard user role names consistently across all stories.
- Do not prescribe technology or implementation approach in stories.
- Every story must trace to a specific epic and MVP feature.
- Stories should be written at most 1 sprint ahead to avoid waste from changing priorities.

## Best Practices
- Write stories from the user's perspective, not the system's. "User can export report" not "System generates CSV."
- Include acceptance criteria for non-functional aspects when relevant (performance, accessibility).
- Reference design files (Figma, Sketch) in technical notes when available.
- Tag related stories (epic, feature area) for filtering in project management tools.
- Update story status as it progresses through the workflow.
- Include edge case criteria that challenge the implementation — not just happy path.
- Use consistent "Given/When/Then" language across all acceptance criteria.
- Estimate complexity based on comparable completed stories, not gut feel.

## Common Pitfalls

### 1. Stories That Are Too Large
A story that takes more than 3 days should be split. If you find yourself writing "and" in the description, it is likely multiple stories.

### 2. Missing Technical Context
Developers need to know which files to touch, which patterns to follow, and which ADRs apply. Leaving this out causes rework.

### 3. Vague Acceptance Criteria
"It works" is not testable. Every criterion must be verifiable by a human or automated test.

### 4. Technology Prescriptions in Stories
"Add a Redis cache" tells the developer HOW, not WHAT. The requirement is "Pages load in under 2 seconds."

### 5. No Error Scenarios
Stories that only define happy path miss important implementation detail about error handling.

### 6. Over-Specifying
Telling developers exactly how to implement (specific libraries, line-by-line instructions) defeats the purpose of a story.

### 7. Inconsistent Role Names
Using "Admin" in one story and "Super Admin" in another without defining the difference.

### 8. No Dependencies Documentation
Starting a story without knowing what it depends on leads to blocked developers and wasted context switching.

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
  - references/create-story-fundamentals.md — Story Fundamentals
  - references/create-story-advanced.md — Story Advanced Topics
  - references/acceptance-criteria.md — Acceptance Criteria Guide
  - references/story-examples.md — Story Examples
  - references/story-refinement.md — Story Refinement
  - references/story-template.md — Story Template
  - references/user-story-splitting.md — User Story Splitting
  - references/user-story-acceptance-criteria.md — User Story Acceptance Criteria

## Handoff
Output: `docs/stories/STORY-{NNN}.md`
Next skill: stack-specific implementation skill
Carry forward: story content, acceptance criteria, technical notes, relevant ADRs and specs.
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