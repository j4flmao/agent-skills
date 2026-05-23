# Tech Spec Review Checklist

## Structural Checklist

### System Context
- [ ] Architecture diagram present (text-based or ASCII)
- [ ] All external systems and services identified
- [ ] Communication protocols documented (HTTP, gRPC, WebSocket, message queue)
- [ ] Data stores listed (databases, caches, object storage)
- [ ] Data flow direction shown with arrows

### Data Models
- [ ] Every entity has a table with columns documented
- [ ] Every field includes: type, constraints, nullability, default, description
- [ ] Primary keys defined for every table
- [ ] Foreign key relationships documented
- [ ] Indexes listed with purpose
- [ ] Enums have all values documented
- [ ] Migration SQL is production-ready
- [ ] Rollback script provided

### API Contract
- [ ] Every endpoint documented: method, path, auth requirement
- [ ] Request body schema with field types and constraints
- [ ] Success response schema (status code and body)
- [ ] Every error response documented (status + condition + error code)
- [ ] Query parameters documented (sorting, filtering, pagination)
- [ ] Path parameters documented (IDs, slugs)
- [ ] Headers documented (content-type, auth, idempotency keys)

### Validation Rules
- [ ] Every input field has a validation rule
- [ ] Rules specify: type, range, format, required/optional
- [ ] Error messages are user-friendly
- [ ] Cross-field validation documented (e.g., start_date < end_date)

### Error Handling
- [ ] Every possible error has a status code and error code
- [ ] Error response format is consistent across all endpoints
- [ ] Idempotency strategy documented for mutating endpoints
- [ ] Retry logic documented (which errors are retryable, backoff strategy)

### Performance Targets
- [ ] Latency targets are numeric (P95, P99 in ms)
- [ ] Throughput targets are numeric (req/s)
- [ ] Load test scenarios described (steady state, peak, stress)
- [ ] Availability target specified (percentage)

### Testing Plan
- [ ] Unit test scope defined (domain logic, validation, error mapping)
- [ ] Integration test scope defined (repositories, external API calls)
- [ ] E2E test scope defined (critical user flows)
- [ ] Test environments named (CI, staging, production-like)
- [ ] Testing frameworks specified
- [ ] Performance/load test plan included

### Migration & Rollout
- [ ] Migration steps ordered and sequential
- [ ] Rollback steps provided
- [ ] Zero-downtime deployment strategy described
- [ ] Feature flag or gradual rollout plan (if applicable)
- [ ] Data backfill strategy (if migrating from old schema)
- [ ] Monitoring and alerting plan during rollout
- [ ] Communication plan (who needs to know about the change)

## Quality Checklist

### Completeness
- [ ] Every PRD requirement from the relevant epic maps to a section in the spec
- [ ] Edge cases from the PRD are reflected in the data model or API contract
- [ ] Error states are handled for every operation
- [ ] Auth and permissions are addressed for every endpoint
- [ ] Rate limiting documented

### Clarity
- [ ] A developer unfamiliar with the project can implement from this spec
- [ ] No ambiguous terms ("fast", "optimized", "appropriate")
- [ ] Examples are concrete (real values, not placeholders)
- [ ] JSON request/response examples are complete and valid
- [ ] Edge cases have specific examples

### Consistency
- [ ] Technology choices match existing patterns (same ORM, same framework)
- [ ] API naming conventions match existing endpoints
- [ ] Error code naming convention matches existing codes
- [ ] Database naming conventions match existing schema

### Feasibility
- [ ] Effort estimate is realistic (ask: can 1 dev do this in the estimated time?)
- [ ] No dependency on unavailable third-party services
- [ ] Migration plan accounts for existing data volume
- [ ] Performance targets achievable with the described architecture
- [ ] Rollback plan is truly reversible

## Common Issues and Fixes

| Issue | Example | Fix |
|-------|---------|-----|
| Missing migration step | "Create users table" but no SQL | Add CREATE TABLE with all columns, constraints, indexes |
| No rollback | Only forward migration | Add DROP TABLE IF EXISTS and down script |
| Vague error handling | "Return appropriate error" | Document each error: status, code, condition, response body |
| Missing auth | No mention of authentication | Add auth requirement to every endpoint |
| No pagination | List endpoint returns all records | Add page/limit parameters, total count, default page size |
| Over-engineered | Kubernetes deployment for a cron job | Right-size the architecture for the feature's scale |
| Assumes infrastructure | "Use Redis cache" but no Redis exists | Document setup steps or use existing infrastructure |
| No performance criteria | No latency targets | Add P95/P99 targets, load test scenarios |
| Hidden assumptions | "Assuming < 1000 users" | Document assumptions explicitly in a section |
| Missing rollback for data migration | "Migrate data to new table" | Add reverse migration: copy data back, drop new table |

## Review Scoring

| Category | Weight | Score (1-5) | Notes |
|----------|--------|-------------|-------|
| Completeness | 25% | | |
| Clarity | 20% | | |
| Feasibility | 25% | | |
| Consistency | 15% | | |
| Testability | 15% | | |
| **Total** | **100%** | | |

Score each category 1-5, multiply by weight, sum to get a total
score out of 5. Pass threshold: 4.0. Below 4.0 requires revisions.

## Pre-Implementation Checklist

Before a developer starts implementation:

- [ ] All questions from the review are resolved
- [ ] Dependencies (other PRs, infrastructure, third-party) are identified
- [ ] Feature flag name is decided and created
- [ ] Relevant ADRs are read and understood
- [ ] Testing strategy is agreed with QA
- [ ] Rollback steps are documented and understood
- [ ] Monitoring dashboard is created (if new service/endpoint)
- [ ] Migration runbook is written (if database changes)
