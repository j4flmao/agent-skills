# Legacy Migration Fundamentals

## Overview
Legacy system migrations carry significant risk — data loss, downtime, and business disruption. This covers migration strategies (strangler fig, parallel run, big bang), anti-corruption layers, data migration, validation, and rollback planning.

## Core Concepts

### Migration Strategies
| Dimension | Strangler Fig | Parallel Run | Big Bang |
|-----------|--------------|-------------|----------|
| Risk | Lowest | Low | Highest |
| Duration | Longest (months) | Medium (weeks) | Shortest (days) |
| Operational Cost | Medium | Highest (dual systems) | Lowest |
| Rollback Complexity | Low | Low | High |
| Testing Burden | Per-feature | Full system | Full system |
| Data Sync | Incremental | Continuous | One-time ETL |
| Business Visibility | Gradual | Full during run | Hard cut |

### Strategy Decision Tree
```
System > 50K LOC with > 5 integrations?
├── Yes → Strangler Fig (incremental, safest)
└── No → Data loss/financial impact critical?
    ├── Yes → Parallel Run (dual validation)
    └── No → Full regression test coverage?
        ├── Yes → Big Bang (fastest, cheapest)
        └── No → Strangler Fig (characterization tests first)
```

### Rehost / Replatform / Refactor
| Approach | Code Changes | Benefit | Best For |
|----------|-------------|---------|----------|
| Rehost (Lift and Shift) | Minimal | Quickest, lowest risk | Hardware EOL, DC exit |
| Replatform | Minor | Improved operations, lower cost | Managed services adoption |
| Refactor (Re-architect) | Full | Modern architecture, scalability, maintainability | Hard-to-maintain systems |

## Anti-Corruption Layer (ACL)

### ACL Components
1. Interface: Stable contract that consumers depend on. Does not change during migration.
2. Translation: Maps between legacy and new domain models. Handles data format differences, naming conventions, semantics.
3. Routing: Directs requests to legacy or new system based on routing rules (path, header, user cohort, feature flag).

### ACL Patterns
| Pattern | Use When |
|---------|----------|
| Facade | Legacy API is complex or inconsistent |
| Adapter | Legacy interface differs from modern contract |
| Gateway | Need to route and transform at proxy layer |
| Translator | Data models differ between systems |

## Data Migration

### Data Migration Patterns
| Pattern | Description | Best For |
|---------|-------------|----------|
| Bulk ETL | Batch extract, transform, load | Initial data load |
| Change Data Capture (CDC) | Real-time sync from transaction log | Ongoing sync during migration |
| Dual-Write | Application writes to both systems | Transactionally critical data |
| Backfill | Migrate historical data post-cutover | Large history tables |

### Reconciliation
Run comparison jobs: row count match, checksum verification, business rule validation. Alert on discrepancies exceeding threshold (e.g., > 0.01% mismatch). Auto-correct known transform rules. Escalate ambiguous cases for manual review.

## Validation

### Characterization Tests
Legacy systems rarely have test coverage above 30%. Before modifying legacy code, write characterization tests: run legacy with known inputs, capture outputs. These tests define expected behavior for the new system.

### Validation Types
| Validation | What It Checks | Frequency |
|------------|----------------|-----------|
| Row count | Same number of records | Every sync |
| Checksum | Data integrity | Every sync |
| Business rule | Semantic correctness | Daily |
| Performance | Latency, throughput | Continuous during ramp |
| Functional | Feature parity | Per-feature cutover |

## Rollback Planning

### Rollback Triggers
| Trigger | Threshold | Recovery |
|---------|-----------|----------|
| Error rate | > baseline + 1% for 5 min | Route all traffic back to legacy |
| Latency p99 | > 2x baseline for 5 min | Route all traffic back |
| Data mismatch | > 0.01% of records | Stop migration, fix sync |
| P1 incident | Any on new system | Full rollback |

### Rollback Requirements
- Rollback must be possible within agreed downtime window
- Keep legacy system running (read-only OK) for minimum 30 days post-cutover
- Practice rollback in staging before cutover
- Document rollback steps in runbook
- Assign rollback decision authority per phase

## Common Pitfalls

### Assuming Legacy Documentation Is Accurate
Documentation drifts from reality. Use code analysis and log inspection to discover actual behavior. Treat docs as hints, not truth.

### Migrating Bugs Without Documentation
Legacy bugs that consumers depend on must be documented. Decide which to replicate and which to fix. Communicate changes to consumers.

### Insufficient Dual-Write Validation
Writing to both systems is not enough. Compare outputs continuously. Silent data corruption can affect all records before detection.

### Overlooking Batch Jobs
Interactive UI gets migrated first, but batch reports, data exports, and ETL pipelines are often forgotten. Map every automated process.

## Key Points
- Strangler Fig is the default strategy — safest, lowest risk, but longest duration
- Anti-corruption layer protects both legacy and new systems during migration
- Data migration requires reconciliation (row count + checksum + business rules)
- Characterization tests capture legacy behavior before migration
- Rollback plan must be tested in staging before cutover
- Keep legacy read-only for 30-90 days after cutover as safety net
- Practice cutover in staging weekly — each practice reveals gaps
- Never migrate during business peak periods
- Document all undocumented legacy behaviors discovered during migration