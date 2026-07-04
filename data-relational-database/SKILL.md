---
name: data-relational-database
description: >
  Advanced skill for relational database management, focusing on B-Tree fragmentation,
  query execution plans, indexing strategies, and PostgreSQL optimization.
version: 2.0.0
author: j4flmao
license: MIT
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - database
  - sql
  - postgresql
  - performance
---

# Data Relational Database

## Purpose
Comprehensive description of relational database management, optimizing query execution, and managing B-Tree fragmentation in PostgreSQL environments.

## Core Principles
1. Minimize B-Tree fragmentation.
2. Optimize query execution plans.
3. Understand indexing structures.
4. Normalize and denormalize strategically.
5. Monitor database performance continuously.

## Agent Protocol
Triggers: database performance issues, slow queries.
Input Context Required: Database schema, current query execution plan.
Output Artifact: Optimized query and recommendations.
Response Formats:
```json
{
  "status": "success",
  "recommendations": ["Rebuild index", "Analyze table"]
}
```

## Decision Matrix
```
[Start] -> (Index fragmented?)
  |-- Yes -> [Rebuild Index]
  |-- No  -> (Slow Query?)
               |-- Yes -> [Analyze Execution Plan]
               |-- No  -> [Monitor]
```

## Detailed Architectural Overview
```
+---------------+      +-------------------+
| Client Server | ---> | Connection Pooler |
+---------------+      +-------------------+
                              |
                       +-------------------+
                       | PostgreSQL Engine |
                       +-------------------+
```

## Workflow Steps
Phase 1: Diagnostics
1. Identify slow queries.
2. Check index usage.
3. Review active locks.

Phase 2: Analysis
1. Generate EXPLAIN ANALYZE.
2. Check fragmentation levels.
3. Evaluate table bloat.

Phase 3: Execution
1. Create new indexes.
2. Run VACUUM/REINDEX.
3. Monitor changes.

Phase 4: Validation
1. Verify query time.
2. Check CPU usage.
3. Review logs.

Phase 5: Documentation
1. Log changes.
2. Update runbooks.
3. Notify stakeholders.

Phase 6: Maintenance
1. Schedule automated vacuums.
2. Set up alerts.
3. Regular review of query plans.

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Slow read | Missing index | Add index |
| High CPU | Bad join | Rewrite query |
| Deadlocks | Lock ordering | Standardize access |
| High IO | Table bloat | Vacuum full |
| Slow write | Too many indexes | Remove unused indexes |
| Out of memory | High work_mem | Tune work_mem |

## Complete Execution Scenario
```
[Detect Issue] -> [Analyze Plan] -> [Apply Fix] -> [Verify]
```

## Rules and Guidelines
1. Always test in staging first.
2. Use CONCURRENTLY for indexes.
3. Keep transactions short.
4. Monitor replication lag.
5. Back up before major changes.

## Reference Guides
1. [B-Tree Internals](references/ref1.md)
2. [Query Execution Plans](references/ref2.md)
3. [PostgreSQL Vacuuming](references/ref3.md)
4. [Index Maintenance](references/ref4.md)
5. [Performance Tuning](references/ref5.md)
6. [Connection Pooling](references/ref6.md)
7. [High Availability](references/ref7.md)
8. [Advanced SQL](references/ref8.md)

## Handoff
Refer to `data-modeling` skill.

<!-- COMPRESSED -->
