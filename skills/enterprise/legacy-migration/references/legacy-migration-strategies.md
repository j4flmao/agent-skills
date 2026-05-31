# Legacy Migration Strategies Reference

## Overview

This reference provides comprehensive coverage of legacy migration strategies, including detailed analysis of the three primary approaches (Strangler Fig, Parallel Run, Big Bang), their variations, selection criteria, and implementation patterns. It also covers hybrid strategies, phased approaches, and migration patterns for specific technology stacks.

## Primary Migration Strategies

### Strangler Fig Pattern

The Strangler Fig is the recommended default strategy for most legacy migrations. Named after tropical fig trees that grow around host trees, gradually replacing them.

Core concept: Incrementally replace legacy system functionality with new implementations while maintaining the legacy system as the system of record until migration is complete.

#### When to Use

- Large, complex systems with multiple interconnected modules
- Systems where zero downtime is required during migration
- Teams that need to deliver value incrementally (not wait for a big bang)
- Limited test coverage on legacy system
- High regulatory or compliance risk if migration fails
- Business cannot accept a complete system outage
- Multiple teams need to work on migration in parallel

#### Architecture Components

**Routing Tier**: Determines whether each request goes to legacy or new system.

Implementation options:
- API Gateway (Kong, APIGateway): Route by URL path, header, or query parameter
- Service Mesh (Istio, Linkerd): Route by HTTP header or traffic weight
- Custom Proxy: Nginx/HAProxy with Lua scripting for routing logic
- Feature Flag System (LaunchDarkly, Flagsmith): Route by user cohort or flag evaluation

**Anti-Corruption Layer**: Translates between legacy and new domain models.

Implementation:
- Facade: Wraps legacy with new interface
- Adapter: Translates between models
- Gateway: Routes and transforms at network boundary

**Strangulation Points**: Where to incrementally replace.

- By URL path: /api/v1/* -> legacy, /api/v2/* -> new
- By feature: checkout -> new, browse -> legacy
- By user cohort: internal users -> new, external -> legacy
- By data entity: orders -> new, inventory -> legacy

#### Implementation Notes

Start with read-only functionality to validate the new system under real traffic before moving to write paths. Replace simple, isolated modules first to build team confidence. For each module: extract, build adapter, route, test, decommission old path.

Keep strangulation window to 12-18 months maximum. Longer windows create operational complexity (running both systems) and team fatigue.

#### Migration Sequence Example

```
Month 1-2: API gateway routing layer deployed. Read-models for products served from new.
Month 3-4: Product browsing migrated. Catalog service deprecated on legacy.
Month 5-6: Cart operations migrated. Cart service deprecated.
Month 7-8: Checkout flow migrated. Payment processing moved to new.
Month 9-10: Order history migrated. Reporting pipelines updated.
Month 11-12: Admin functions migrated. Last legacy consumers updated.
Month 13-14: Legacy decommissioned. Anti-corruption layer removed.
```

#### Common Patterns

**Route-by-Prefix**: API gateway matches URL path prefix and routes to legacy or new.

```
/api/v1/products -> legacy-api
/api/v2/products -> new-api
```

**Route-by-Header**: Custom HTTP header determines routing target.

```nginx
location /api/ {
    if ($http_x_migration_target = "new") {
        proxy_pass http://new-api;
    }
    proxy_pass http://legacy-api;
}
```

**Canary Route**: Gradually shift traffic percentage to new system.

```yaml
# Istio VirtualService
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - headers:
        x-canary:
          exact: "enabled"
    route:
    - destination:
        host: new-api
  - route:
    - destination:
        host: legacy-api
      weight: 95
    - destination:
        host: new-api
      weight: 5
```

### Parallel Run Pattern

Both legacy and new systems process identical inputs simultaneously. Outputs are compared to validate correctness. After validation period, traffic is switched to new system.

#### When to Use

- Financial or healthcare systems where data accuracy is critical
- Systems where business rules are complex and poorly documented
- Regulatory environment requiring audit trail of migration correctness
- Moderate tolerance for operational cost (2x compute during run period)
- New system can process identical inputs as legacy

#### Architecture Components

**Input Replicator**: Duplicates all write operations to both systems.

Options:
- Application-level: Service sends to both systems
- Database-level: CDC from legacy DB to new DB
- Message queue: Publish to topic consumed by both systems

**Output Comparator**: Compares outputs from both systems and reports discrepancies.

Comparison dimensions:
- Response content (JSON/XML diff)
- Database state (row counts, checksums, business metrics)
- Side effects (emails sent, external API calls, queue messages)
- Performance characteristics (latency, throughput)

**Reconciliation Engine**: Periodic job that verifies data consistency.

- Runs every 15 minutes during parallel run
- Compares key business metrics between systems
- Alerts on any discrepancy
- Auto-reconciles for known acceptable differences (e.g., timestamps, formatting)

#### Comparison Tolerance Configuration

```python
comparison_config = {
    "strict_fields": ["transaction_id", "amount", "user_id", "status"],
    "tolerant_fields": ["created_at", "updated_at", "version"],
    "ignored_fields": ["internal_id", "trace_id", "request_id"],
    "tolerance": {
        "timestamp_mismatch_ms": 5000,  # 5 second tolerance for timestamps
        "decimal_precision": 2,         # Round to 2 decimal places for money
        "null_equals_empty": True,       # Treat null and empty string as equal
    },
    "alerts": {
        "strict_mismatch": "IMMEDIATE_PAGE",
        "tolerant_mismatch": "WARNING_EMAIL",
        "reconciliation_failure": "PAGE_ESCALATE",
    }
}
```

#### Parallel Run Period Duration

- Minimum 1 week for simple systems with straightforward business logic
- Minimum 2-4 weeks for systems with complex business rules
- Minimum 4-8 weeks for financial systems with month-end processes
- Minimum 8-12 weeks for systems with quarterly/annual processes

Must cover at least one complete business cycle (e.g., one month-end close for financial systems).

### Big Bang Pattern

Cut over from legacy to new system instantaneously (or within a scheduled downtime window). All functionality migrates at once.

#### When to Use

- Small, simple systems with clear boundaries
- Systems with no external consumers (internal-only tool)
- Systems where legacy data can be easily transformed and validated
- Greenfield replacement with exact functional parity
- Strong test coverage on both legacy and new systems
- Tolerance for extended downtime (planned maintenance window)

#### When to Avoid

- Large complex systems with unknown dependencies
- Systems with limited test coverage
- Business cannot tolerate extended downtime
- Regulatory requirements for parallel run validation
- No rollback plan or complex rollback process

#### Execution Steps

1. Pre-cutover (T-8 weeks): Full system testing in staging environment
2. Pre-cutover (T-4 weeks): Data migration dry run with production-sized data
3. Pre-cutover (T-2 weeks): Cutover rehearsal in staging with full team
4. Pre-cutover (T-24h): Final data sync from legacy to new
5. Cutover (T-0): Stop legacy writes, run final sync, verify data, redirect traffic
6. Post-cutover (T+0 to T+48h): Monitor validation period
7. Rollback (if needed): Reverse data sync, redirect traffic to legacy

#### Risk Mitigation for Big Bang

1. **Multiple dry runs**: Practice the cutover at least 3 times in staging
2. **Reversible data transformation**: Legacy data preserved in case of rollback
3. **Rollback playbook**: Document and practice rollback procedure
4. **Parallel read-only**: New system runs read-only for 1 week before write cutover
5. **Feature flags**: Critical features can be toggled back to legacy if issues detected
6. **Rolling by region**: If multi-region, cut over one region at a time

## Strategy Selection Framework

### Decision Matrix

| Factor | Strangler Fig | Parallel Run | Big Bang |
|--------|---------------|--------------|----------|
| System size | Large | Medium | Small |
| Complexity | High | Medium-High | Low-Medium |
| Risk tolerance | Low | Low-Medium | Medium-High |
| Test coverage | Low | Medium | High |
| Downtime tolerance | Zero | Minimal | Planned window |
| Business cycle dependency | Low | Medium-High | Low |
| Operational cost during migration | Medium | High | Low |
| Timeline | 6-24 months | 3-12 months | 1-6 months |
| Team size required | Large | Medium | Small |

### Scorecard Evaluation

Score each strategy against weighted criteria:

```python
def score_strategies(context):
    weights = {
        "system_complexity": 20,
        "risk_tolerance": 25,
        "test_coverage": 15,
        "downtime_limit": 20,
        "team_capacity": 10,
        "timeline": 10,
    }

    strategies = {
        "strangler_fig": {
            "system_complexity": 9,   # best for complex systems
            "risk_tolerance": 10,      # lowest risk
            "test_coverage": 10,       # works with low coverage
            "downtime_limit": 10,      # zero downtime
            "team_capacity": 5,        # needs larger team
            "timeline": 4,             # longest timeline
        },
        "parallel_run": {
            "system_complexity": 7,
            "risk_tolerance": 7,
            "test_coverage": 8,
            "downtime_limit": 8,
            "team_capacity": 5,
            "timeline": 5,
        },
        "big_bang": {
            "system_complexity": 3,
            "risk_tolerance": 3,
            "test_coverage": 4,
            "downtime_limit": 3,
            "team_capacity": 8,
            "timeline": 9,
        },
    }

    scores = {}
    for strategy, criteria in strategies.items():
        scores[strategy] = sum(criteria[factor] * weights[factor] / 100 for factor in weights)

    return sorted(scores.items(), key=lambda x: x[1], reverse=True)
```

### Selection by System Archetype

**Internal CRUD Application**: Big Bang or Strangler Fig. Low risk tolerance if internal users can tolerate brief downtime. Big Bang if the system is small and well-tested.

**Customer-Facing E-Commerce**: Strangler Fig. Zero downtime acceptance. Gradual feature migration with feature flags.

**Financial Core System**: Parallel Run. Data accuracy is paramount. Regulatory requirement for validation. May extend to 3-6 months parallel operation.

**Legacy Monolith**: Strangler Fig by domain. Extract bounded contexts one at a time. Each extraction is a mini-migration.

**Data Warehouse**: Big Bang with ETL switch. Complex data transformations make strangler fig impractical. Thorough dry runs essential.

**Third-Party System Replacement**: Strangler Fig with anti-corruption layer. External system boundaries make strangler ideal.

## Hybrid and Composite Strategies

### Strangler Fig + Parallel Run

Use strangler fig for piece-by-piece replacement of functionality. For each replaced piece, run in parallel for a validation period before retiring the legacy equivalent.

Benefits: Incremental delivery with validation of each piece. Each module gets parallel run before final cutover.

Cost: Highest operational complexity (both patterns simultaneously).

### Big Bang with Canary Cutover

Execute Big Bang migration region-by-region or tenant-by-tenant:

```
Phase 1: Migrate internal users (lowest risk)
Phase 2: Migrate 5% of customers
Phase 3: Migrate 25% of customers
Phase 4: Migrate remaining customers
Phase 5: Decommission legacy
```

Each phase is a mini Big Bang. Rollback is scoped to the affected segment.

### Strangler Fig with Eventual Big Bang

Use strangler fig for most functionality. For the final remaining piece (often the core domain or the database), execute a Big Bang with scheduled downtime.

Common in monolith-to-microservices migrations: extract 80% of services via strangler, then Big Bang the remaining core monolith.

## Specialized Migration Patterns

### Database Migration Patterns

**Schema-per-tenant to Shared Schema**: When migrating from isolated to shared DB, use ETL with backfill. Requires careful tenant_id validation.

**Relational to Document Store**: Use CDC to replicate from relational DB to document store. Validate denormalized documents against source data. Roll out read queries first, then writes.

**SQL to NoSQL**: Migrate query patterns gradually. Use CQRS: legacy DB handles writes, new DB handles reads. Migrate writes after reads are validated.

### Message Queue Migration

Pattern: Dual-publish to both queues during transition.

1. Add QoS (quality of service) to ensure at-least-once delivery to both queues
2. Consumers on legacy queue process as before
3. New consumers on new queue process in parallel
4. Compare processing results
5. Migrate consumers one at a time
6. Retire legacy queue

### Monolith to Microservices Extraction

Step-by-step extraction pattern:

1. Identify bounded context (using Domain-Driven Design)
2. Define service boundary and API contract
3. Implement anti-corruption layer in monolith
4. Build new microservice
5. Dual-write: data flows to both monolith and new service
6. Verify data consistency
7. Route traffic to new service
8. Remove code from monolith
9. Remove anti-corruption layer
10. Repeat for next bounded context

Each extraction is 4-8 weeks for a well-defined domain. Total project: 12-24 months for a large monolith.

### API Migration

Pattern: API versioning at gateway.

1. New API deployed alongside legacy (new version)
2. Gateway routes consumers to appropriate version
3. Migrate consumers to new version
4. Deprecate old version with sunset header
5. Remove old version after all consumers migrated

```http
# Deprecation notification
HTTP/1.1 200 OK
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Deprecation: true
Link: <https://api.example.com/v2/products>; rel="successor-version"
```

## Legacy Integration During Migration

### Coexistence Architecture

During a strangler fig migration, both systems must coexist:

Data synchronization: Keep data consistent between legacy and new systems during migration. Use CDC, dual-write, or periodic batch sync.

Session state: If users switch between systems mid-session, session state must be shared or recreated. Use token-based auth (JWT) that works across both systems.

Reporting and analytics: Maintain unified reporting during migration. Both systems must feed the same reporting pipeline, or reports must be merged.

Monitoring: Both systems must be monitored with the same tools and alerting thresholds. One dashboard showing health of both.

### Strangler Fig Data Synchronization

For a strangler fig migration, the new system often needs access to legacy data:

- Read-only access to legacy DB for the new services
- CDC from legacy DB to new DB for data that changes in legacy
- Dual-write for data that changes in new system but is needed by legacy

Synchronization topology:
```
Legacy System <----- CDC -----> New System
                          \
                           \--> Sync Comparison Job
```

The comparison job runs periodically and alerts on inconsistencies. Manual reconciliation for unresolvable differences.

## Migration Success Metrics

### Pre-Migration Baseline

Measure before migration starts:
- Response time (p50, p95, p99)
- Throughput (requests per second)
- Error rate (5xx, timeouts, business errors)
- Business metrics (conversion rate, order completion, revenue per session)
- Infrastructure cost

### During Migration

- Traffic percentage migrated
- Error rate vs baseline (should be equal or better)
- Data consistency score (% of records matching between systems)
- Rollback rate (how many changes were rolled back)
- Feature parity completion (percentage of legacy features replaced)

### Post-Migration

- Performance delta (new vs legacy)
- Reliability delta (uptime, MTTR)
- Cost delta (infrastructure, operations)
- Team velocity delta (feature delivery rate)
- Customer satisfaction impact

## Migration Anti-Patterns

### Big Bang without Rehearsal

Attempting a big bang migration without practicing the cutover. The first operation becomes the test. Rehearse at least 3 times in a staging environment that mirrors production.

### Migrating Data without Validation

ETL pipeline runs but output is not validated against source. Row counts matched, data content differs. Always validate at both count and content level with reconciliation reports.

### Underestimating Data Transformation Complexity

Legacy data is messy: null values, inconsistent formats, duplicate records, orphaned references. Budget 2-3x the estimated data transformation effort.

### Migrating All Data Before Validating Business Logic

Migration should validate business logic against a subset of data before migrating everything. Migrate 5% of customers first, validate, then migrate the rest.

### Keeping Both Systems Alive Too Long

Strangler fig migrations that drag beyond 18 months create operational burnout. Two systems to maintain, two codebases to understand, two sets of infrastructure. Set a firm decommission date.

### Not Planning for Legacy Decommission

The last 10% of a migration takes 50% of the effort. Decommissioning requires: verifying zero dependencies, archiving data, updating documentation, removing DNS/routing, shutting down infrastructure, canceling vendor contracts.
