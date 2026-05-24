---
name: devops-cloud-migration
description: >
  Use when the user asks about cloud migration, lift-and-shift, rehost, replatform, refactor, 6 Rs migration strategy, legacy-to-cloud migration, data center migration, or cloud adoption. Do NOT use for: cloud infrastructure setup (devops-aws/azure/gcp), landing zone design (cloud-architecture), or cost optimization (cloud-cost-optimization).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cloud-migration, phase-3]
---

# Cloud Migration

## Purpose
Plan and execute cloud migration using the 6 Rs strategy: assess, design, migrate, validate, and optimize legacy workloads to cloud infrastructure.

## Workflow

### Step 1: Assessment
| Activity | Output |
|----------|--------|
| Application discovery | Complete inventory of apps, dependencies, data flows |
| Dependency mapping | Inter-service dependencies, network flows, data pipelines |
| Performance baselines | CPU, memory, IOPS, network utilization |
| Licensing audit | OS, database, middleware license types and costs |
| Compliance check | Data residency, encryption, audit requirements |

### Step 2: 6 Rs Strategy
| Strategy | Description | Effort | Benefit | When to Use |
|----------|-------------|--------|---------|-------------|
| Rehost | Lift-and-shift: move as-is | Low | Quick win | Simple apps, tight timelines |
| Replatform | Lift, tweak, shift: minor cloud optimizations | Medium | Better perf/cost | RDS, managed services |
| Refactor | Re-architect for cloud-native | High | Full cloud benefits | Strategic apps, high ROI |
| Repurchase | Replace with SaaS | Low | Eliminate maintenance | Commodity functions (CRM, HR) |
| Retire | Decommission | None | Cost savings | Unused/duplicate apps |
| Retain | Keep on-premises | None | Avoid risk | Compliance, latency-sensitive |

### Step 3: Migration Waves
```
Wave 0: Foundation (network, identity, logging, CI/CD)
Wave 1: Easy wins (stateless apps, dev/test)
Wave 2: Data tier (databases, storage)
Wave 3: Core business (stateful, critical apps)
Wave 4: Legacy (mainframe, specialized hardware)
```

### Step 4: Validation
- Functional testing: all features work as expected
- Performance testing: latency, throughput within 10% of baseline
- Security testing: vulnerability scan, penetration test
- DR testing: failover and restore procedures verified
- Cost validation: actual spend vs projected

## References
- `references/migration-strategies.md` — 6 Rs deep dive with decision trees
- `references/migration-phases.md` — Phased migration plan and wave planning
- `references/post-migration.md` — Post-migration optimization and operations
- `references/migration-tools.md` — Server migration, database migration, data transfer tools, cutover checklist, rollback triggers

## Handoff
Related skills: cloud-architecture (landing zone), devops-aws/azure/gcp (infra setup), enterprise-legacy-migration (legacy modernization), cloud-cost-optimization.
