---
name: enterprise-legacy-migration
description: >
  Use this skill when planning or executing legacy system migrations using strangler fig, parallel run, or big bang strategies.
  This skill enforces: anti-corruption layers, dual-write verification, rollback capability.
  Do NOT use for: greenfield development, infrastructure-only migration, database schema changes without strategy.
version: "2.1.0"
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

## Framework/Methodology

### SAFE-CUTOVER Framework
Six-phase methodology for risk-controlled legacy migration:

Phase 1 - Survey: Comprehensive assessment of the legacy system. Map every dependency, integration point, data flow, and business rule. Identify undocumented behavior through log analysis and stakeholder interviews.

Phase 2 - Analyze: Evaluate migration strategies against risk, cost, timeline, and business impact. Select primary and fallback strategy. Define success criteria and rollback triggers.

Phase 3 - Fortify: Build anti-corruption layers, data synchronization pipelines, and validation frameworks. Establish parallel run capability. Create feature flags and traffic routing infrastructure.

Phase 4 - Execute: Migrate incrementally or in full per strategy. Validate at each step. Monitor error rates, latency, throughput, and business metrics. Ramp traffic gradually from 1% to 100%.

Phase 5 - Cutover: Complete the transition. Stop legacy writes, run final sync, validate completeness. Route all traffic to new system. Keep legacy read-only for fallback period.

Phase 6 - Retire: Decommission legacy after validation period. Archive data and documentation. Remove DNS, load balancers, and infrastructure. Celebrate with the team.

### Strategy Comparison Matrix

| Dimension          | Strangler Fig          | Parallel Run              | Big Bang              |
|--------------------|------------------------|---------------------------|-----------------------|
| Risk               | Lowest                 | Low (detection lag)       | Highest               |
| Duration           | Longest (months-years) | Medium (weeks-months)     | Shortest (days-weeks) |
| Operational Cost   | Medium                 | Highest (dual systems)    | Lowest                |
| Rollback Complexity| Low (route back)       | Low (use old system)      | High (full revert)    |
| Testing Burden     | Per-feature            | Full system               | Full system           |
| Data Sync Required | Incremental            | Continuous (dual-write)   | One-time ETL          |
| Business Visibility| Gradual                | Full during run            | Hard cut, visible     |
| Best For           | Large complex systems  | Critical financial/health | Simple systems, new   |

## Architecture / Decision Trees

### Migration Strategy Decision Tree
```
Is the system > 50k lines of code with > 5 integration points?
├── Yes → Strangler Fig (incremental, safest)
└── No → Is data loss/financial impact of downtime critical?
    ├── Yes → Parallel Run (dual validation, slower)
    └── No → Do you have full regression test coverage?
        ├── Yes → Big Bang (fastest, cheapest)
        └── No → Strangler Fig (over-testing with characterization tests)
```

### Rehost / Replatform / Refactor Decision
```
Goal: Minimize changes to application code?
├── Yes → Is hardware EOL or data center lease ending?
│   ├── Yes → Rehost (lift-and-shift, minimal code changes)
│   └── No → Replatform (move to managed services, minor code changes)
└── No → Is the application difficult to maintain or scale?
    ├── Yes → Refactor (rewrite/re-architect, full code changes)
    └── No → Replatform (improve without full rewrite)
```

### Risk Assessment Matrix
| Risk Factor | Low | Medium | High |
|------------|-----|--------|------|
| Data volume | < 100GB | 100GB-1TB | > 1TB |
| Integration count | 1-2 | 3-5 | > 5 |
| Test coverage | > 80% | 50-80% | < 50% |
| Team familiarity | Built it | Maintained it | Never seen it |
| Business peak cycles | > 6 months away | 3-6 months | < 3 months |

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
## Migration Plan: {Legacy System} -> {Target System}

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

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output -- why use many token when few do trick.

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

Identify undocumented dependencies: scan logs for integration calls, inspect network flows, review cron jobs and scheduled tasks. Interview operations staff who have managed the system. Document everything in a dependency matrix with direction, protocol, data volume, and criticality.

Assess code quality and test coverage. If legacy has no tests, establish characterization tests before modifying anything. Run the system and capture expected outputs for known inputs.

### Step 2: Migration Strategy Selection
Strangler Fig (incremental, safest, longest -- route by feature/path/user), Big Bang (fastest, riskiest -- all at once, requires perfect test coverage), Parallel Run (dual systems, compare outputs, most validation -- highest operational cost).

For strangler fig, define routing granularity: URL path prefix, HTTP header, user cohort, feature flag. Use a routing tier (API gateway, service mesh, or custom proxy) that can direct traffic to legacy or new system.

For parallel run, design the output comparison engine. Define comparison tolerance (floating point precision, timestamp formatting, null handling). Handle out-of-order processing. Establish SLA for comparison completeness.

### Step 3: Anti-Corruption Layer Design
Create interface boundary isolating migration from consumers. Implement request routing (middleware that directs traffic to legacy or new system). Translate between legacy and new domain models. Feature flags for gradual rollout.

The anti-corruption layer (ACL) has three components:
- Interface: stable contract that consumers depend on. Does not change during migration.
- Translation: maps between legacy domain model and new domain model. Handles data format differences, naming conventions, and behavioral semantics.
- Routing: directs requests to either legacy or new system based on routing rules.

ACL patterns: facade (wrap legacy with new interface), adapter (translate between models), gateway (route and transform at proxy layer). Choose based on what consumers can tolerate.

### Step 4: Data Migration
ETL pipeline with validation. Dual-write during transition: write to both systems, compare results. Sync verification: reconciliation job that compares records. Rollback data: keep legacy data accessible for fallback.

Data migration patterns:
- Bulk ETL: for initial load. Batch extract, transform, load. Validate row counts, checksums, and business rules.
- Change Data Capture (CDC): for ongoing sync. Capture changes from legacy DB transaction log. Apply to new system in near-real-time.
- Dual-write: application writes to both systems atomically. Requires transaction coordination or eventual consistency with reconciliation.
- Backfill: migrate historical data after cutover while system is live. Use for large history tables.

Reconciliation: run scheduled comparison jobs that identify mismatches. Alert on discrepancies exceeding threshold. Auto-correct for known transform rules. Escalate manual review for ambiguous cases.

### Step 5: Cutover and Validation
Stop writes to legacy. Run final sync. Validate data completeness and correctness. Route production traffic to new system. Monitor error rates, latency, and business metrics. Run at 1% traffic, ramp to 100% over days.

Cutover checklist:
- [ ] Final data sync complete and verified
- [ ] Rollback data snapshot taken
- [ ] New system health check passed
- [ ] Monitoring dashboards configured and reviewed
- [ ] On-call team briefed on new system
- [ ] Runbook accessible to all responders
- [ ] Stakeholders notified of cutover window
- [ ] External dependency status verified

Ramp schedule: 1% traffic for 2 hours (validate), 5% for 4 hours, 25% for 8 hours, 50% for 24 hours, 100% after 48 hours of clean run. Rollback immediately if error rate exceeds baseline + 1% or latency exceeds 2x baseline.

### Step 6: Legacy Decommission
Verify zero dependency on legacy. Archive legacy data (compressed, encrypted, timestamped). Document schema and business logic for reference. Remove legacy from routing, DNS, load balancers. Shut down infrastructure.

Decommission checklist:
- [ ] All traffic verified flowing to new system (zero requests to legacy)
- [ ] All cron jobs, ETL pipelines, and batch processes updated
- [ ] All monitoring and alerting migrated
- [ ] Legacy data archived with access procedure documented
- [ ] Third-party integrations pointed to new endpoints
- [ ] Vendor contracts for legacy infrastructure terminated
- [ ] Disaster recovery plan updated (no legacy dependency)

## Common Pitfalls

Pitfall 1: Assuming legacy documentation is accurate. Documentation drifts from reality. Use code analysis and log inspection to discover actual behavior. Treat docs as hints, not truth.

Pitfall 2: Migrating bugs alongside features. Legacy systems have known bugs that consumers may depend on. Document behavioral quirks. Decide which to replicate and which to fix. Communicate changes to consumers.

Pitfall 3: Insufficient dual-write validation. Writing to both systems is not enough. Compare outputs continuously. A silent data corruption bug could affect all records before detection.

Pitfall 4: No performance baseline. Without knowing current latency and throughput, you cannot tell if the new system is performing adequately. Measure before, during, and after migration.

Pitfall 5: Overlooking batch jobs and scheduled tasks. The interactive UI gets migrated first, but batch reports, data exports, and ETL pipelines are often forgotten. Map every automated process.

Pitfall 6: Big bang without rollback rehearsal. Testing the primary cutover is standard. Testing the rollback is rare and reveals infrastructure gaps. Always practice the rollback.

Pitfall 7: Not budgeting for the parallel run period. Running two systems simultaneously costs 2x compute, storage, and operations. Plan for this in budget and capacity.

Pitfall 8: Cutting over during business peak. Migration should happen during known low-traffic periods. Never schedule cutover near product launches, end-of-quarter, or holiday seasons.

## Best Practices

Practice 1: The strangler fig is the default. Start with strangler fig unless you can strongly justify big bang (small system, low risk, high test coverage, reversible).

Practice 2: Feature flags are your safety net. Use flags for every migration step. Canary deploy new features. Instant rollback with a flag toggle.

Practice 3: Invest in the anti-corruption layer. The ACL is not technical debt -- it is an intentional boundary that protects both legacy and new systems. It can be removed after migration completes.

Practice 4: Automate comparison. Manual data verification does not scale. Write comparison scripts that run automatically and page on mismatch.

Practice 5: Keep the legacy system running in read-only mode after cutover. This provides a safety net for data verification and emergency rollback. Plan for 30-90 days of overlap.

Practice 6: Practice the cutover in staging weekly. Each practice reveals gaps in the runbook. Team members should be able to execute the cutover under stress.

Practice 7: Communicate migration progress to stakeholders weekly. Visibility builds confidence. Flag delays early. Celebrate milestones (data sync complete, X% traffic migrated).

## Templates & Tools

### Migration Runbook Template
```
# Cutover Runbook: {Legacy} -> {New}

## Pre-Cutover (T-24h)
- [ ] Disable non-critical batch jobs on legacy
- [ ] Run final data comparison
- [ ] Verify new system health checks pass
- [ ] Warm caches on new system
- [ ] Notify stakeholders of cutover window
- [ ] On-call engineers acknowledge rotation

## Cutover (T-0)
- [ ] Stop write traffic to legacy
- [ ] Run final CDC sync
- [ ] Verify row counts and checksums match
- [ ] Enable write on new system
- [ ] Route 1% traffic to new system
- [ ] Monitor error rate, latency for 30min

## Ramp (T+0 to T+48h)
- [ ] Ramp to 5% - monitor 2h
- [ ] Ramp to 25% - monitor 4h
- [ ] Ramp to 50% - monitor 8h
- [ ] Ramp to 100% - monitor 24h

## Rollback Triggers
- Error rate > baseline + 1% for 5min
- Latency p99 > 2x baseline for 5min
- Data comparison mismatch > 0.01%
- Any P1 incident on new system
```

### Tools Reference
- Service mesh (Istio/Linkerd) for traffic routing
- Feature flag systems (LaunchDarkly/Flagsmith) for gradual rollout
- Kafka Connect / Debezium for CDC
- Apache Airflow for ETL orchestration
- Great Expectations for data validation
- Terraform for infrastructure provisioning
- Custom diff/comparison framework for parallel run validation

## Case Studies

### Case Study 1: Monolith to Microservices (Strangler Fig)
A financial services company migrated a 15-year-old Java monolith handling 50M daily transactions. Using strangler fig with an API gateway routing layer, they extracted 12 microservices over 18 months. Each extraction began with an anti-corruption layer, followed by dual-write, then cutover. The monolith was decommissioned after 14 months of parallel operation. Zero customer-facing incidents during migration. Performance improved 3x for migrated services.

### Case Study 2: Healthcare CRM (Parallel Run)
A healthcare SaaS provider migrated from a legacy on-premises CRM to a cloud-native platform. Using parallel run with real-time comparison, both systems processed identical traffic for 6 weeks. The comparison engine flagged 847 discrepancies in the first week, revealing 3 critical data transformation bugs. After the 6-week validation period, cutover completed in 4 hours with no rollback required.

### Case Study 3: Retail Data Warehouse (Big Bang)
A retail chain migrated a 12TB data warehouse over a long holiday weekend. After 8 weeks of rehearsal in staging, the production cutover took 6 hours. The 48-hour rollback window was not triggered. Key success factors: exhaustive rehearsal, frozen schema changes for 2 months prior, dedicated on-call team, and a clear rollback decision tree.

## Code Examples

### Strangler Fig Routing Proxy (Python)
```python
import random
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

class StranglerFigRouter:
    def __init__(self, legacy_url: str, new_url: str):
        self.legacy_url = legacy_url
        self.new_url = new_url
        self.routes = {}  # path -> percentage to new system

    def add_route(self, path: str, new_pct: float = 0.0):
        self.routes[path] = new_pct

    def route_request(self, path: str, method: str, headers: dict, body: dict = None):
        new_pct = self._get_route_pct(path)
        use_new = random.random() * 100 < new_pct
        target_url = self.new_url if use_new else self.legacy_url

        try:
            response = requests.request(method, f"{target_url}{path}",
                                        headers=headers, json=body, timeout=30)
            return response.status_code, response.json() if use_new else response.text, use_new
        except requests.Timeout:
            return 504, {"error": "timeout"}, use_new
        except requests.ConnectionError:
            # Fallback to legacy if new system fails
            if use_new:
                fallback = requests.request(method, f"{self.legacy_url}{path}",
                                            headers=headers, json=body, timeout=30)
                return fallback.status_code, fallback.text, False
            raise

    def _get_route_pct(self, path: str) -> float:
        for route_pat, pct in self.routes.items():
            if route_pat in path:
                return pct
        return 0.0

router = StranglerFigRouter("https://legacy.example.com", "https://new.example.com")
router.add_route("/api/orders", 10.0)  # 10% to new, 90% to legacy
router.add_route("/api/users", 50.0)   # 50/50 split

# Request flows through router
# status, data, used_new = router.route_request("/api/orders", "GET", {})
```

### Dual-Write Data Comparison (Python)
```python
import hashlib, json
from dataclasses import dataclass

@dataclass
class ComparisonResult:
    total_records: int
    matched: int
    mismatched: list[dict]
    missing_in_new: list[str]
    missing_in_legacy: list[str]

def compute_hash(record: dict) -> str:
    canonical = json.dumps(record, sort_keys=True)
    return hashlib.sha256(canonical.encode()).hexdigest()

class DualWriteComparator:
    def __init__(self, key_field: str = "id"):
        self.key_field = key_field
        self.results = []

    def compare(self, legacy_records: list[dict], new_records: list[dict]) -> ComparisonResult:
        legacy_by_key = {r[self.key_field]: r for r in legacy_records}
        new_by_key = {r[self.key_field]: r for r in new_records}

        all_keys = set(legacy_by_key.keys()) | set(new_by_key.keys())
        missing_in_new = [k for k in all_keys if k not in new_by_key]
        missing_in_legacy = [k for k in all_keys if k not in legacy_by_key]
        common_keys = set(legacy_by_key.keys()) & set(new_by_key.keys())

        mismatched = []
        matched = 0
        for key in common_keys:
            old_hash = compute_hash(legacy_by_key[key])
            new_hash = compute_hash(new_by_key[key])
            if old_hash == new_hash:
                matched += 1
            else:
                mismatched.append({
                    "key": key,
                    "legacy": legacy_by_key[key],
                    "new": new_by_key[key],
                    "legacy_hash": old_hash,
                    "new_hash": new_hash
                })

        self.results.append(ComparisonResult(
            total_records=len(all_keys),
            matched=matched,
            mismatched=mismatched,
            missing_in_new=missing_in_new,
            missing_in_legacy=missing_in_legacy
        ))
        return self.results[-1]

    def report(self) -> str:
        summary = self.results[-1] if self.results else None
        if not summary:
            return "No comparison run"
        return (
            f"Total: {summary.total_records}, "
            f"Matched: {summary.matched}, "
            f"Mismatched: {len(summary.mismatched)}, "
            f"Missing in new: {len(summary.missing_in_new)}, "
            f"Missing in legacy: {len(summary.missing_in_legacy)}, "
            f"Match rate: {summary.matched/summary.total_records*100:.2f}%"
        )

comparator = DualWriteComparator()
# Example: comparator.compare(legacy_data, new_data)
# print(comparator.report())
```

### CDC with Debezium (Kafka Connect Configuration)
```json
{
  "name": "legacy-db-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "legacy-db.example.com",
    "database.port": "5432",
    "database.user": "cdc_user",
    "database.password": "${file:/etc/kafka/secrets/db-password}",
    "database.dbname": "legacy_erp",
    "database.server.name": "legacy-erp",
    "table.include.list": "public.orders,public.customers,public.products",
    "plugin.name": "pgoutput",
    "slot.name": "migration_slot",
    "publication.name": "migration_publication",
    "tombstones.on.delete": "false",
    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "transforms": "unwrap,router",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.router.type": "org.apache.kafka.connect.transforms.RegexRouter",
    "transforms.router.regex": "legacy-erp\\.public\\.(.*)",
    "transforms.router.replacement": "migration.cdc.$1"
  }
}
```

### Migration Rollback Plan Template (YAML)
```yaml
rollback_plan:
  migration_id: "monolith-to-microservices-v2"
  trigger_conditions:
    - error_rate_baseline_pct: 0.5
    - error_rate_threshold: 2.0  # > 2% error rate triggers rollback
    - latency_p99_baseline_ms: 200
    - latency_p99_threshold_ms: 2000
    - data_mismatch_threshold_pct: 0.01

  rollback_steps:
    1: { action: "stop_new_system_writes", owner: "platform-team", max_duration: "1m" }
    2: { action: "enable_legacy_writes", owner: "platform-team", max_duration: "1m" }
    3: { action: "route_100pct_to_legacy", owner: "gateway-team", max_duration: "5m" }
    4: { action: "verify_legacy_traffic", owner: "qa-team", max_duration: "10m" }
    5: { action: "extract_new_system_data_for_debugging", owner: "migration-team", max_duration: "30m" }
    6: { action: "notify_stakeholders", owner: "comms-lead", max_duration: "5m" }

  post_rollback_validation:
    - check: "All traffic flowing to legacy"
    - check: "No data loss in last 15 minutes"
    - check: "Error rates returned to baseline"
```

## Anti-Patterns

### Anti-Pattern 1: Big Bang Without Safety Net
Migrating everything at once with no rollback plan. When something goes wrong (and it will), there is no way to revert. The team is in firefighting mode until 3am. Always have a tested rollback plan. The rollback should be practiced in staging before cutover.

### Anti-Pattern 2: Migrating Bugs
Replicating known legacy bugs in the new system because "the old system did it that way." Bugs accumulate over years and some consumers may depend on incorrect behavior. Document behavioral quirks explicitly. Fix bugs as part of migration, with clear communication to consumers.

### Anti-Pattern 3: Insufficient Characterization Tests
Legacy systems rarely have test coverage above 30%. Without characterization tests (capturing current behavior before changes), you cannot tell if the migration changed behavior. Write characterization tests by running the legacy system with known inputs and recording outputs.

### Anti-Pattern 4: Data Migration Without Reconciliation
Running an ETL to move data to the new system but never verifying completeness. Missing records, corrupted fields, or transformed data errors propagate silently. Always run row-count + checksum + business-rule reconciliation after any data migration.

### Anti-Pattern 5: Cutover During Peak Business
Scheduling the cutover during end-of-quarter close, Black Friday, or product launch week. Any issue during a peak period multiplies impact by 10x. Migrate during known low-traffic windows. Have a 30-day buffer around known busy periods.

## Rules
- Every migration must have a documented rollback plan tested before cutover.
- Strangler Fig is the default strategy unless strong justification for alternatives.
- Anti-corruption layer must be maintained until legacy is fully decommissioned.
- Dual-write verification must run for minimum 1 week before cutover.
- Data migration must include reconciliation report with discrepancy alert.
- Performance baseline must be captured before and after migration.
- Rollback must be possible within the agreed downtime window.
- All team members must practice cutover in staging environment.
- No migration during business peak periods (end-of-quarter, holiday, product launch).
- All undocumented legacy behaviors must be captured before starting migration.
- Characterization tests must be written before modifying legacy code.
- Consumer contracts (API, messaging) must be versioned and backward compatible.
- Data validation must compare records at both count and content levels.
- Migration schedule must include buffer for rollback and re-attempt.
- Security scanning must be completed on migrated code before production traffic.
- Post-migration performance monitoring must continue for minimum 30 days.

## References
  - references/legacy-migration-advanced.md -- Legacy Migration Advanced
  - references/strangler-fig-implementation.md -- Strangler Fig Implementation Patterns Topics
  - references/legacy-migration-fundamentals.md -- Legacy Migration Fundamentals
  - references/legacy-migration-patterns.md -- Legacy Migration Patterns
  - references/legacy-migration-strategies.md -- Legacy Migration Strategies Reference
  - references/legacy-migration-risk-management.md -- Legacy Migration Risk Management
  - references/migration-strategies.md -- Migration Strategies
  - references/strangler-fig.md -- Strangler Fig Pattern
  - references/testing-migration.md -- Testing Legacy Migrations
## Handoff
For integration patterns during strangler fig, hand off to `enterprise-integration-patterns`. For data governance during migration, hand off to `enterprise-data-governance`.
