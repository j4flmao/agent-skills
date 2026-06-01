---
name: create-tech-spec
description: >
  Use this skill when the user says 'tech spec', 'technical specification', 'implementation plan', 'how should we implement', 'design document', or when PRD and ADRs exist and a feature needs detailed specification before implementation. This skill produces a specification with system context, API contracts, data models, error handling, performance targets, and testing plan. Do NOT use for: high-level product decisions, user stories, or architecture decisions. Those come from PRD and ADRs.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [planning, phase-1, technical, specification]
---

# Create Tech Spec

## Purpose
Produce a detailed, actionable technical specification that a developer can implement without ambiguity. Covers system context, API contracts, data models, error handling, performance targets, and testing plan.

The tech spec is the engineering team's contract. It translates "what the product needs" into "how the system delivers it." A great tech spec is precise enough that a developer can implement without asking clarifying questions, and thorough enough that a reviewer can catch design issues before code is written.

## Architecture/Decision Trees

### Spec Depth Decision Tree
```
Is this a new feature or a change to existing functionality?
  |-- NEW FEATURE --> Full spec: context, API, data model, error handling, performance, testing, migration
  |-- CHANGE TO EXISTING --> Change spec: what changes, what stays the same, migration

Does this feature involve data model changes?
  |-- YES --> Include: new tables/fields, migration plan with rollback, data backfill strategy
  |-- NO --> Focus on: API contracts, business logic

Is this a frontend or backend feature?
  |-- FRONTEND --> Component spec: props, state, events, API integration, loading/error/empty states
  |-- BACKEND --> API spec: endpoints, data models, validation, auth, error handling
  |-- FULL STACK --> Both: API spec + component spec + integration contract

Does this feature involve external integrations?
  |-- YES --> Include: integration contract, retry strategy, circuit breaker, data mapping
  |-- NO --> Focus on: internal API contracts and data flow

Is this a performance-sensitive feature?
  |-- YES --> Include: performance targets, query plans, caching strategy, load test scenarios
  |-- NO --> Standard performance section with baseline targets
```

### API Style Decision Tree
```
What is the primary consumer?
  |-- BROWSER (SPA) --> REST API with JSON responses
  |-- MOBILE APP --> GraphQL or REST with field selection
  |-- THIRD-PARTY DEVELOPERS --> REST API with API keys, rate limiting, documentation
  |-- INTERNAL SERVICE --> gRPC or message queue for high throughput
  |-- REALTIME CLIENT --> WebSocket or SSE for push-based communication

Is the API public-facing?
  |-- YES --> Versioned (v1, v2), documented (OpenAPI), rate-limited, deprecated with notice
  |-- NO --> Internal versioning, minimal documentation, team agreements
```

## Agent Protocol

### Trigger
Exact user phrases: "tech spec", "technical specification", "implementation plan", "how should we implement", "design document", "spec for feature", "write a spec", "details for feature".

### Input Context
Before activating, verify:
- `docs/prd-{YYYY-MM-DD}.md` exists. Read the relevant section.
- `docs/decisions/` exists. Read all ADRs.
- `docs/specs/` directory exists. If not, create it.
- User specifies which feature or epic to spec. If not specified, use the highest-priority epic.

### Output Artifact
Writes to `docs/specs/{feature-name}-spec.md`.

### Response Format
After saving, output exactly:
```
Spec saved to docs/specs/{feature-name}-spec.md
API endpoints: {n}
Data models: {n}
Performance targets: {n}
Next skill: {stack}-architecture (or {framework}-architecture)
```

No preamble. No postamble. No explanations. No filler.

### Completion Criteria
- [ ] System context diagram included (text-based).
- [ ] All API endpoints documented with request/response schemas.
- [ ] All data models documented with field types and constraints.
- [ ] Error handling strategy defined for every endpoint.
- [ ] Performance targets specified numerically.
- [ ] Testing plan with unit, integration, and E2E scope.
- [ ] Migration plan included if schema changes are needed.
- [ ] File saved to docs/specs/{feature-name}-spec.md.

### Max Response Length
Confirmation: 4 lines. Do not echo spec content unless asked.

## Workflow

### Step 1: Gather Inputs
Read `docs/prd.md` for requirements. Read `docs/decisions/` for architecture context.

**Input checklist**:
- PRD requirements for the feature
- All relevant ADRs (architecture decisions that constrain implementation)
- Existing data models and API contracts
- Existing specs for related features
- User stories for the feature (if written)
- Design mockups or wireframes (if available)

### Step 2: System Context
```markdown
## System Context

{Describe how this feature fits into the existing system}

[Client] --HTTP--> [API Gateway] --HTTP--> [Service] --SQL--> [Database]
                                                |
                                           [Message Queue] --events--> [Worker]
```

**Context diagram elements**:
- External systems (third-party APIs, client applications)
- Internal services (monolith modules, microservices)
- Data stores (databases, caches, file storage)
- Communication protocols (HTTP, gRPC, message queues, WebSocket)
- Data flow direction (request/response, push/pull)

### Step 3: API Contract
For each endpoint, document:

```markdown
### POST /api/v1/{resources}
Create a new {resource}.

**Auth required:** {role or permission}
**Idempotent:** {yes/no}

**Request Body:**
```json
{
  "field_name": "type — description — required/optional — constraints"
}
```

**Response 201:**
```json
{
  "data": { "id": "uuid", "field": "value" },
  "meta": { "requestId": "uuid" }
}
```

**Error Responses:**
| Status | Condition | Error Code |
|--------|-----------|------------|
| 400 | Validation failure | VALIDATION_ERROR |
| 401 | Missing/invalid auth | UNAUTHORIZED |
| 404 | Resource not found | NOT_FOUND |
| 409 | State conflict | CONFLICT |
| 422 | Semantic error | UNPROCESSABLE |
| 429 | Rate limit exceeded | RATE_LIMITED |
| 500 | Unexpected error | INTERNAL_ERROR |
```

**API contract completeness checklist**:
- Method and path defined
- Authentication and authorization requirements
- Request body schema with all fields (type, constraints, required/optional)
- Success response schema (200/201)
- Error response codes with conditions
- Pagination strategy (if listing endpoint)
- Rate limiting information
- Idempotency key support (if mutating)

### Step 4: Data Models
```markdown
## Data Model: {Entity}

| Field | Type | Constraints | Default | Notes |
|-------|------|-------------|---------|-------|
| id | UUID | PK, immutable, indexed | auto | v7 time-sortable |
| name | varchar(255) | NOT NULL, unique | — | |
| status | enum | active/inactive/archived | active | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | auto-update |

### Indexes
| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| idx_{entity}_status | (status) | B-tree | Filter by status |
| idx_{entity}_created | (created_at DESC) | B-tree | Sort by recency |

### Migration
```sql
CREATE TABLE {entity} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_{entity}_status ON {entity}(status);
```

### Rollback
```sql
DROP TABLE IF EXISTS {entity};
```
```

**Data model completeness checklist**:
- Every field has type, constraints, default, and description
- Primary key defined
- Indexes specified with column lists and index type
- Foreign key relationships documented
- Migration DDL provided
- Rollback DDL provided
- Data migration strategy for existing records
- Audit fields included (created_at, updated_at, created_by)

### Step 5: Performance Targets
| Metric | Target | Measurement | Load Test Scenario |
|--------|--------|-------------|-------------------|
| P95 latency | <200ms | Distributed tracing | 100 req/s steady |
| P99 latency | <500ms | Distributed tracing | 100 req/s steady |
| Throughput | 1000 req/s | Load testing | Peak traffic |
| Availability | 99.95% | Uptime monitoring | 30d rolling window |

**Performance target categories**:
- **Latency**: P50, P95, P99 response times
- **Throughput**: Requests per second, concurrent connections
- **Data volume**: Storage growth, query result sizes
- **Availability**: Uptime percentage, error budget
- **Recovery**: RPO, RTO for disaster scenarios

### Step 6: Testing Plan
| Layer | Scope | Framework | Environment |
|-------|-------|-----------|-------------|
| Unit | Domain logic, validation | {stack-specific} | CI |
| Integration | Repository, API adapter | {stack-specific} | CI + test DB |
| E2E | Critical user flow | {stack-specific} | Staging |

**Testing plan categories**:
- **Unit tests**: Business logic, validation rules, edge cases
- **Integration tests**: Database operations, API endpoint behavior, message queue interaction
- **E2E tests**: Critical user journeys, cross-service flows
- **Performance tests**: Load test scenarios, stress test scenarios, endurance test
- **Security tests**: Auth bypass, injection, rate limiting, data exposure

### Step 7: Save
Write to `docs/specs/{feature-name}-spec.md`.

**File naming convention**: Use kebab-case with the feature name. Example: `docs/specs/user-onboarding-spec.md`.

## Process Patterns

### Pattern 1: Full Feature Spec
**When**: New feature with database changes, API endpoints, and business logic
**Process**: Cover all 7 sections — context, API, data model, error handling, performance, testing, migration
**Output**: Complete spec ready for implementation

### Pattern 2: Change Spec
**When**: Modifying existing functionality
**Process**: Focus on what changes. Use "Before" and "After" sections. Document migration strategy. Include backward compatibility plan.
**Output**: Minimal spec covering only the delta

### Pattern 3: Integration Spec
**When**: Connecting to external system or third-party API
**Process**: Cover authentication method, request/response format, retry strategy, circuit breaker, rate limiting, error mapping, data transformation
**Output**: Integration contract spec

### Pattern 4: Frontend Component Spec
**When**: UI feature requiring component specification
**Process**: Cover component tree, props/state/events, API integration, loading/error/empty states, accessibility, responsive behavior, performance (bundle size, render count)
**Output**: Component spec with all states documented

## Anti-Patterns

### Anti-Pattern 1: Spec as Code
Writing the spec with so much detail that it duplicates the implementation. The spec should define WHAT and HOW at a design level, not provide line-by-line instructions. Anti-pattern signal: spec is longer than the implementation will be.

### Anti-Pattern 2: Missing Error Handling
Every endpoint, data model, and integration path needs error handling. "Standard errors" is not specific enough. Anti-pattern signal: error section has only "400/500" with no conditions.

### Anti-Pattern 3: No Migration or Rollback
Schema changes without migration plans are dangerous. Schema changes without rollback plans are irresponsible. Anti-pattern signal: migration SQL without corresponding rollback SQL.

### Anti-Pattern 4: Ambiguous Performance Targets
"Fast" and "responsive" are not performance targets. Every target must be numeric and measurable. Anti-pattern signal: qualitative performance descriptions.

### Anti-Pattern 5: Ignoring Non-Functional Requirements
The spec focuses only on functional behavior and ignores security, observability, and operability. Anti-pattern signal: no auth section, no logging section, no monitoring section.

### Anti-Pattern 6: Spec Without Context
The spec describes the solution without explaining the problem it solves. A new team member should understand WHY this feature exists from reading the context section. Anti-pattern signal: no context section or copy-pasted PRD.

## Templates

### Full Feature Spec Template
See workflow steps 2-7 combined.

### Change Spec Template
```markdown
# Tech Spec: {Feature} — Changes

## Current Behavior
{What the system does today}

## Desired Behavior
{What the system should do after changes}

## Changes

### API Changes
{Endpoints modified, added, or removed}

### Data Model Changes
{Fields modified, added, or removed}

### Business Logic Changes
{Validation rules, state machines, calculations changed}

## Migration
{Steps to migrate existing data, if any}

## Rollback
{Steps to revert changes}

## Testing
{What needs re-testing, what is new testing}
```

### Frontend Component Spec Template
```markdown
# Component Spec: {Component Name}

## Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|

## State
{State management approach, state shape}

## Events
{Events emitted, event handlers}

## API Integration
{Endpoints called, data transformation}

## States
- Loading: {what user sees}
- Empty: {what user sees}
- Error: {what user sees}
- Success: {what user sees}
- Edge cases: {boundary conditions}

## Accessibility
{ARIA labels, keyboard navigation, screen reader behavior}

## Performance
{Bundle size budget, render optimization, memo strategy}
```

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Implementation without questions | > 80% of specs | Developer survey |
| Spec review time | < 2 business days | PR-to-approval time |
| Design issues caught in review | > 50% of issues | Review feedback analysis |
| Implementation deviation from spec | < 15% of specs | Post-implementation review |
| Rollback rate | < 5% of migrations | Migration tracking |

## Rules
- Every field in every model must include: type, constraints, nullability, default, description.
- Every endpoint must specify: method, path, auth requirement, request schema, response schema, error codes.
- Performance targets must be numeric. "Fast" and "responsive" are not acceptable.
- Error codes must be documented explicitly. "Standard HTTP errors" is not sufficient.
- Migration plans must include rollback steps. No exceptions.
- If the spec is for a frontend feature, replace API contract with component props/events/state spec.
- Every spec must include a context section explaining the problem being solved.
- Include security considerations for every endpoint and data model.

## References
  - references/create-tech-spec-fundamentals.md — Tech Spec Fundamentals
  - references/create-tech-spec-advanced.md — Tech Spec Advanced Topics
  - references/tech-spec-examples.md — Tech Spec Examples
  - references/tech-spec-review-checklist.md — Tech Spec Review Checklist
  - references/tech-spec-template.md — Technical Specification Template
  - references/tech-spec-templates.md — Technical Specification Templates

## Handoff
Output: `docs/specs/{feature-name}-spec.md`
Next skill: stack-specific implementation skill
Carry forward: feature scope, API contracts, data models, performance targets, ADR references.
