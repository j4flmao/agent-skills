---
name: enterprise-legacy-migration
description: >
  Use this skill when planning or executing legacy system migrations using strangler fig, parallel run, or big bang strategies.
  This skill enforces: anti-corruption layers, dual-write verification, rollback capability.
  Do NOT use for: greenfield development, infrastructure-only migration, database schema changes without strategy.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [enterprise, migration, phase-8]
---

# Legacy Migration Agent

## Purpose
Plans and executes legacy system migrations with safe cutover and rollback strategies.

## Agent Protocol

### Trigger
Exact user phrases: legacy migration, system migration, strangler fig, legacy modernization, monolith to microservices, database migration, data migration, lift and shift, replatform, rehost, refactor legacy, legacy decommission.

### Input Context
- What is the source system and target platform?
- What is the data volume and schema complexity?
- What is the risk tolerance (downtime, data loss)?
- Is there an existing test suite for the legacy system?

### Output Artifact
Migration plan with strategy, anti-corruption layer design, data migration approach, and cutover runbook.

### Response Format
```
## Migration Plan: {Legacy System} → {Target System}

### Strategy: {Strangler Fig / Big Bang / Parallel Run}

### Assessment
{dependencies, data footprint, risk analysis}

### Anti-Corruption Layer
{interface, translation, routing}

### Data Migration
{ETL, dual-write, verification}

### Cutover Plan
{steps, rollback triggers, validation}

### Decommission Checklist
{items to verify before shutdown}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Legacy system dependency mapping completed
- [ ] Migration strategy selected and justified
- [ ] Anti-corruption layer designed and implemented
- [ ] Data migration with dual-write verification
- [ ] Rollback plan documented and tested
- [ ] Cutover runbook validated in staging
- [ ] Performance baseline captured for comparison
- [ ] Legacy decommission checklist verified

### Max Response Length
7500 tokens

## Workflow

### Step 1: Assessment and Discovery
Map all dependencies (upstream, downstream, internal). Measure data footprint (tables, row counts, growth rate). Analyze usage patterns (peak hours, critical paths, batch windows). Risk assessment (data criticality, downtime cost, rollback complexity).

### Step 2: Migration Strategy Selection
Strangler Fig (incremental, safest, longest — route by feature/path/user), Big Bang (fastest, riskiest — all at once, requires perfect test coverage), Parallel Run (dual systems, compare outputs, most validation — highest operational cost).

### Step 3: Anti-Corruption Layer Design
Create interface boundary isolating migration from consumers. Implement request routing (middleware that directs traffic to legacy or new system). Translate between legacy and new domain models. Feature flags for gradual rollout.

### Step 4: Data Migration
ETL pipeline with validation. Dual-write during transition: write to both systems, compare results. Sync verification: reconciliation job that compares records. Rollback data: keep legacy data accessible for fallback.

### Step 5: Cutover and Validation
Stop writes to legacy. Run final sync. Validate data completeness and correctness. Route production traffic to new system. Monitor error rates, latency, and business metrics. Run at 1% traffic, ramp to 100% over days.

### Step 6: Legacy Decommission
Verify zero dependency on legacy. Archive legacy data (compressed, encrypted, timestamped). Document schema and business logic for reference. Remove legacy from routing, DNS, load balancers. Shut down infrastructure.

## Rules
- Every migration must have a documented rollback plan tested before cutover.
- Strangler Fig is the default strategy unless strong justification for alternatives.
- Anti-corruption layer must be maintained until legacy is fully decommissioned.
- Dual-write verification must run for minimum 1 week before cutover.
- Data migration must include reconciliation report with discrepancy alert.
- Performance baseline must be captured before and after migration.
- Rollback must be possible within the agreed downtime window.
- All team members must practice cutover in staging environment.

## References
- `references/migration-strategies.md` — Migration strategy comparison and selection
- `references/strangler-fig.md` — Strangler Fig pattern implementation
- `references/testing-migration.md` — Migration testing strategies and validation frameworks
- `references/legacy-migration-patterns.md` — Legacy migration patterns: strangler fig, branch-by-abstraction, parallel run, big bang

## Handoff
For integration patterns during strangler fig, hand off to `enterprise-integration-patterns`. For data governance during migration, hand off to `enterprise-data-governance`.
