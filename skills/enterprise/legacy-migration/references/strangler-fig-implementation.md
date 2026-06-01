# Strangler Fig Implementation Patterns

## Overview
The Strangler Fig pattern incrementally replaces a legacy system by building a new system alongside it, routing features one by one until the legacy system is fully replaced. This reference covers routing interception, interception proxies, feature extraction, testing, and monitoring.

## Interception Strategies

### Reverse Proxy (Gateway) Interception
Place a reverse proxy (Nginx, Envoy, API Gateway) in front of the legacy system. Route requests based on URL path, header, or cookie to either legacy or new system.

```
Client → Reverse Proxy → [Legacy / New System]
```

| Proxy | Pros | Cons |
|-------|------|------|
| Nginx | Simple config, fast | Limited routing logic |
| Envoy | Rich routing, observability | Complex config (xDS) |
| AWS ALB | Managed, native header routing | Route rules per listener (100 max) |
| Kong | Plugin ecosystem, easy mgmt | Operational overhead |

### In-Code Interception
Use a routing layer within the application code. Request hits the legacy code, which delegates to new system if feature is migrated.

```
Client → Legacy App → [LegacyFeature / NewServiceProxy]
```

| Approach | Pros | Cons |
|----------|------|------|
| Config flag | Simple, no infra change | Requires code change per feature |
| DI container | Clean separation | Requires framework support |
| Feature flag SDK | Centralized control, gradual rollout | SDK dependency |

### Database-Level Interception
Intercept at the database connection layer. Route reads/writes to new or old schema based on migration status.

```
Legacy App → [DB Proxy / Dual-Write Shim] → [Old DB / New DB]
```

| Approach | Pros | Cons |
|----------|------|------|
| View/ synonym | No app changes | Limited to same DB engine |
| Proxy (e.g., ProxySQL) | DB-agnostic, routing rules | Adds latency |
| CDC pipeline | Async, no app coupling | Eventual consistency |

## Routing Rules

### Header-Based Routing
```
X-Migration-Phase: legacy       → route to legacy
X-Migration-Phase: new          → route to new
X-Migration-Phase: shadow       → route to both, serve from legacy
X-User-Cohort: canary           → route canary users to new
```

### Cookie-Based Routing
```
Cookie: migration_cohort=a      → route to legacy
Cookie: migration_cohort=b      → route to new
Cookie: migration_shadow=true   → shadow mode
```

### Percentage-Based Routing
```
5% → New, 95% → Legacy    (initial validation)
25% → New, 75% → Legacy   (confidence growing)
50% → New, 50% → Legacy   (balanced)
100% → New, 0% → Legacy   (full cutover)
```

## Feature Extraction Process

### Phase 1: Prepare
1. Identify feature boundary (what makes this feature self-contained?)
2. Map data ownership (what tables/records does this feature own?)
3. Define API contract (request/response shapes for new service)
4. Build ACL in legacy code for the extracted feature
5. Write characterization tests for feature behavior

### Phase 2: Extract
1. Build new service with identical API contract
2. Implement dual-write for data (write to both systems)
3. Add interception rule for feature (route to new)
4. Verify dual-write consistency
5. Run in shadow mode for 1 week

### Phase 3: Cutover
1. Route 5% of production traffic to new service
2. Monitor: error rate, latency, data consistency for 24h
3. Ramp to 25%, 50%, 100% in 24h increments
4. Keep rollback capability at every step

### Phase 4: Clean
1. Remove extracted code from legacy
2. Stop dual-write to legacy tables
3. Archive legacy resources for 90 days
4. Update documentation and runbooks
5. Close the extraction tracking ticket

## Testing the Strangler Fig

### Dual-Response Comparison
Send each request to both systems simultaneously. Compare responses. Alert on mismatch. This catches behavioral differences before users are affected.

Implementation:
- Shadow handler: calls both systems, returns new system response if matching, falls back to legacy on error
- Async comparison: log both responses, compare offline
- Traffic replay: record production traffic, replay against new system

### Characterization Test Automation
```
Record production responses → save as test fixtures
Replay against new system   → compare response shapes, status codes, data
Auto-generate assertion tests from recorded responses
Run in CI pipeline on every new build
```

### Regression Detection
| Signal | What It Detects | Alert |
|--------|-----------------|-------|
| Error rate delta | New system errors | > 1% deviation |
| Latency delta | Performance regression | > 2x legacy latency |
| Response size delta | Unexpected data changes | > 10% deviation |
| Status code delta | Missing endpoints | Any 404 on migrated routes |
| Data mismatch | Data loss or corruption | Any mismatch in dual-read |

## Monitoring the Strangler Fig

### Migration Dashboard
| Panel | Metric | Source |
|-------|--------|--------|
| Traffic Split | % to legacy vs new by route | Proxy metrics |
| Error Rate | Errors per second by system | Application metrics |
| Latency | p50/p95/p99 by system | Application metrics |
| Data Consistency | Dual-write match rate | Reconciliation job |
| Extraction Progress | # features migrated / total | Project tracker |
| Rollback Health | Legacy system readiness | Deployment status |

### Alerting Thresholds
| Alert | Condition | Severity |
|-------|-----------|----------|
| High Error Rate | > 1% error on new system | P1 |
| Data Divergence | > 0.01% dual-write mismatch | P1 |
| Rollback Needed | > 5 min latency degradation | P2 |
| Sync Lag | CDC lag > 5 minutes | P2 |
| Extraction Stalled | No progress in 2 weeks | P3 |

## Common Implementation Mistakes

### Routing Decisions Too Late
If routing logic is deep in the codebase instead of at the entry point, every request pays latency penalty for routing. Intercept at the earliest point possible (proxy, API gateway, middleware).

### Extracting at Wrong Granularity
Too small (single field) creates too many routing rules. Too large (entire module) creates too much risk. Extract at bounded context / API endpoint granularity.

### Neglecting Async Flows
Only UI routes are intercepted, but batch jobs, message handlers, and scheduled tasks still hit legacy code. Map all entry points including async and scheduled flows.

### Skipping Shadow Mode
Going straight from dual-write to production traffic without shadow mode. Shadow mode catches data and response mismatches before users are affected. Never skip it.

### Forgetting Rollback Testing
Rollback is tested only when needed, which is too late. Test rollback weekly during migration. Each test should verify: routing reverts, dual-write continues, data stays consistent.

## Key Points
- Intercept traffic at the earliest point (proxy/gateway) using header, cookie, or percentage routing
- Extract features at bounded context granularity, not single-field or whole-module
- Run shadow mode for minimum 1 week before production traffic
- Monitor dual-response comparison: error rate, latency, data consistency
- Test rollback weekly — it's only reliable if practiced
- Async entry points (batch jobs, scheduled tasks, message handlers) must be included in the extraction
- Clean up extracted legacy code after full cutover and 90-day archive period