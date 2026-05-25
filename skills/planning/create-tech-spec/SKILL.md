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

## Agent Protocol

### Trigger
Exact user phrases: "tech spec", "technical specification", "implementation plan", "how should we implement", "design document", "spec for feature", "write a spec", "details for feature".

### Input Context
Before activating, verify:
- docs/prd-{YYYY-MM-DD}.md exists. Read the relevant section.
- docs/decisions/ exists. Read all ADRs.
- docs/specs/ directory exists. If not, create it.
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

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanations.

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
Read docs/prd.md for requirements. Read docs/decisions/ for architecture context.

### Step 2: System Context
```markdown
## System Context

[Client] --HTTP--> [API Gateway] --HTTP--> [Service] --SQL--> [Database]
                                                |
                                           [Message Queue] --events--> [Worker]
```

Include external systems, internal services, data stores, and communication protocols.

### Step 3: API Contract
For each endpoint, document:

```markdown
### POST /api/v1/{resources}
Create a new {resource}.

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
| 500 | Unexpected error | INTERNAL_ERROR |
```

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

### Step 5: Performance Targets
| Metric | Target | Measurement | Load Test Scenario |
|--------|--------|-------------|-------------------|
| P95 latency | <200ms | Distributed tracing | 100 req/s steady |
| P99 latency | <500ms | Distributed tracing | 100 req/s steady |
| Throughput | 1000 req/s | Load testing | Peak traffic |
| Availability | 99.95% | Uptime monitoring | 30d rolling window |

### Step 6: Testing Plan
| Layer | Scope | Framework | Environment |
|-------|-------|-----------|-------------|
| Unit | Domain logic, validation | {stack-specific} | CI |
| Integration | Repository, API adapter | {stack-specific} | CI + test DB |
| E2E | Critical user flow | {stack-specific} | Staging |

### Step 7: Save
Write to `docs/specs/{feature-name}-spec.md`.

## Rules
- Every field in every model must include: type, constraints, nullability, default, description.
- Every endpoint must specify: method, path, auth requirement, request schema, response schema, error codes.
- Performance targets must be numeric. "Fast" and "responsive" are not acceptable.
- Error codes must be documented explicitly. "Standard HTTP errors" is not sufficient.
- Migration plans must include rollback steps. No exceptions.
- If the spec is for a frontend feature, replace API contract with component props/events/state spec.

## References
- `references/tech-spec-examples.md` — Tech Spec Examples
- `references/tech-spec-review-checklist.md` — Tech Spec Review Checklist
- `references/tech-spec-template.md` — Tech Spec Template
- `references/tech-spec-templates.md` — Tech Spec Templates

## Handoff
Output: `docs/specs/{feature-name}-spec.md`
Next skill: stack-specific implementation skill (e.g., nestjs-architecture, react-architecture)
Carry forward: feature scope, API contracts, data models, performance targets, ADR references.
