# Legacy Migration Advanced Topics

## Introduction
Advanced legacy migration covers large-scale strangler fig extraction, database migration patterns, post-migration validation, performance optimization during migration, team coordination, and lessons from complex migrations.

## Large-Scale Strangler Fig Extraction

### Decomposition Strategy
Decompose the monolith by bounded contexts. Each extraction follows the pattern:
1. Identify: Map business capability, data ownership, integration points
2. ACL: Build anti-corruption layer at boundary
3. Extract: Move code and data to new service
4. Dual-run: Both old and new paths active
5. Cutover: Route traffic to new service
6. Clean: Remove extracted code from monolith

### Extraction Ordering
| Priority | Extraction Criteria | Example |
|----------|-------------------|---------|
| First | Low dependencies, clear boundary | Notification service |
| Second | High business value, medium dependencies | Order service |
| Third | High dependencies, complex data | User service |
| Last | Deeply coupled, shared data | Reporting with cross-schema queries |

### Dependencies During Extraction
Monitor: coupling strength (how many calls to monolith remaining), data dependency (how much shared data), latency impact (network calls vs in-process calls), transactionality (distributed vs local transactions).

## Database Migration Patterns

### Expand-Migrate-Contract Pattern
1. Expand: Add new columns/tables for new system alongside existing ones
2. Migrate: Write to both old and new schemas, migrate historical data
3. Contract: Backfill reads/writes to new schema, remove old columns

### Online Schema Migration
| Tool | Strategy | Downtime |
|------|----------|----------|
| pt-online-schema-change | Trigger-based copy | Minimal (seconds) |
| gh-ost | Binlog-based copy | Minimal (seconds) |
| Flyway/Liquibase | Version-controlled migrations | Schema lock duration |
| Debezium | CDC-based migration | None (eventual consistency) |

### Data Validation Strategies
| Validation Type | What It Catches | Implementation |
|----------------|-----------------|----------------|
| Row count | Missing or duplicate rows | COUNT(*) comparison |
| Checksum (MD5/SHA) | Data corruption | HASH of sorted rows |
| Business rule | Semantic errors | Domain-specific queries |
| Referential integrity | Orphaned records | FK matching |
| Sample verify | Random verification | Audit 1% of records |
| Dual-read | Runtime comparison | Read from both, compare |

## Post-Migration Validation

### Performance Verification
Compare before and after: latency (p50, p95, p99), throughput (requests/second), error rate, resource utilization (CPU, memory, DB connections), response size. Run for minimum 7 days post-migration. Alert on regression > 10%.

### Business Metrics Verification
Verify business outcomes: revenue metrics (orders processed, revenue booked), customer metrics (conversion rate, page load time, error rate), operational metrics (job completion rate, report generation time). Business metrics may take days to stabilize.

### Dark Launch Validation
Run new system in shadow mode: duplicate production traffic to new system, compare results, but serve only from old system. Continue for 1-2 weeks to validate correctness without risking user impact.

## Performance Optimization During Migration

### ACL Performance
ACL adds latency for every request: routing decision, protocol translation, data transformation. Optimize by: in-process routing (sidecar instead of proxy), schema caching, connection pooling, async transformation where possible.

### Dual-Write Latency
Dual-write doubles write path latency if done synchronously. Mitigations: async dual-write (write to new system asynchronously after confirming old system write), batch dual-write (batch and send every 100ms), parallel writes with timeout and fallback.

### Migration Performance Pitfalls
| Pitfall | Impact | Mitigation |
|---------|--------|------------|
| Long migrations during business hours | User-facing latency | Migrate during low-traffic windows |
| CDC consumer lag | Data inconsistency | Monitor lag, alert on growth |
| ETL resource contention | Database performance impact | Throttle ETL, run during off-peak |
| Large backfill transactions | Lock contention | Batch in small transactions |

## Team Coordination

### Migration Team Structure
| Role | Responsibilities |
|------|-----------------|
| Migration Lead | Overall coordination, decision authority |
| Legacy SME | Knowledge of legacy system behavior |
| New System Team | Building and operating new system |
| Data Engineer | ETL, CDC, reconciliation |
| QA Engineer | Validation, characterization tests |
| Operations | Monitoring, deployment, rollback |
| Business Stakeholder | Business requirements, sign-off |

### Communication Cadence
| Frequency | Audience | Content |
|-----------|----------|---------|
| Daily | Migration team | Progress, blockers, decisions |
| Weekly | Stakeholders | Milestone status, risks, timeline |
| Per-cutover | All affected teams | Cutover schedule, rollback plan |
| Post-migration | All | Migration report, lessons learned |

## Complex Migration Scenarios

### Stateful System Migration
Stateful systems (session stores, caches, queues) are hardest to migrate. Strategies: drain old queue, re-route to new; replicate session data between old and new; dual-write to both caches during migration; use a migration proxy that checks both stores.

### Multi-Team Coordination
When multiple teams migrate their services simultaneously, dependencies must be coordinated. Use a migration dependency graph. Establish integration testing schedule. Hold cross-team migration syncs weekly.

### Zero-Downtime Migration
Achieve zero downtime by: active-active both systems, traffic routing with health checks, gradual ramp from 0% to 100%, immediate rollback by routing back to legacy, no single point of failure in migration infrastructure.

## Key Points
- Extract services by bounded context, starting with low-dependency services
- Expand-Migrate-Contract pattern enables online schema changes with minimal downtime
- Dark launch validates new system with production traffic but serves from old system
- ACL performance must be optimized — it adds latency to every request
- Dual-write with async pattern avoids write path latency penalty
- CDC consumer lag monitoring is critical during ongoing sync
- Team communication cadence (daily standup, weekly stakeholder update) keeps migration on track
- Zero-downtime migration requires active-active configuration and gradual traffic ramp
- Post-migration performance and business metrics must be monitored for 7+ days
- Characterization tests prevent behavioral regressions in the new system