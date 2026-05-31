# Legacy Migration Risk Management

## Overview

This reference covers risk identification, assessment, mitigation, and monitoring for legacy system migrations. It provides a comprehensive risk framework, detailed risk registers, rollback planning, testing strategies, and operational risk controls specific to migration projects.

## Migration Risk Framework

### RISK-MIGRATE Framework

Seven-phase approach to managing migration risk:

Phase 1 - Recognize: Identify all risk categories relevant to the migration. Include technical, business, data, operational, security, regulatory, and vendor risks. Use structured brainstorming sessions with the full migration team.

Phase 2 - Investigate: Assess each risk for probability and impact. Use quantitative methods where possible (cost of outage, data loss probability) and qualitative methods for subjective risks (reputation, team morale).

Phase 3 - Score: Prioritize risks using a risk matrix. Critical risks (high probability, high impact) require dedicated mitigation plans. Track all risks in a register with owners.

Phase 4 - Mitigate: Design and implement controls for each risk. Preventive controls reduce probability. Detective controls reduce impact. Corrective controls enable recovery.

Phase 5 - Govern: Monitor risk indicators throughout the migration. Track risk status in weekly migration standups. Escalate new risks as they emerge.

Phase 6 - Rollback: Plan and test rollback procedures. Define clear rollback triggers. Ensure rollback can be executed within the agreed downtime window.

Phase 7 - Adapt: After migration completion, review risk management effectiveness. Document lessons learned. Feed improvements into the organization's general risk management process.

### Risk Categories

**Technical Risks**
- Data loss or corruption during migration
- Performance degradation in new system
- Integration failures with dependent systems
- Incomplete feature parity
- Undocumented legacy behaviors
- Security vulnerabilities in new system
- Scalability limitations of new architecture

**Business Risks**
- Customer-facing downtime or degraded experience
- Revenue loss during transition
- SLA breaches and penalty payments
- Partner/customer trust erosion
- Competitive disadvantage from delayed migration
- Brand reputation damage from high-profile issues

**Data Risks**
- Data loss during ETL or cutover
- Data corruption due to transformation errors
- Data inconsistency between legacy and new systems
- Incomplete data migration (missed tables)
- Privacy/regulatory breach during data handling
- Data format incompatibility

**Operational Risks**
- Insufficient team capacity for dual-running systems
- Knowledge loss (legacy system experts leaving)
- Tooling and environment gaps
- Monitoring blind spots during transition
- Incident response confusion (which system is active?)
- On-call team unfamiliar with new system

**Regulatory Risks**
- Compliance gaps in new system
- Audit trail discontinuity
- Data retention policy violations
- Contractual obligations not met during migration
- Privacy law violation (GDPR right to erasure)
- Industry-specific regulatory requirements

## Detailed Risk Register

### Risk: Data Loss During Cutover

ID: MIG-RISK-001
Category: Data
Probability: Medium
Impact: Critical
Pre-Migration RPN: 16 (4x4)

Description: During final data sync at cutover, transactions that occur between the final legacy write and the new system activation could be lost.

Preventive Controls:
- Use CDC with transaction log reading (not timestamp-based queries)
- Implement last-write-wins conflict resolution
- Replicate writes to both systems during cutover window (dual-write)
- Maintain a write queue that drains after cutover

Detective Controls:
- Reconciliation job comparing row counts and checksums post-cutover
- Business metric monitoring (total orders, revenue) for anomalies
- Transaction log gap analysis

Contingency:
- Rollback to legacy if data loss exceeds threshold (>0.01% of records)
- Manual reconciliation and backfill for small discrepancies
- Point-in-time recovery from database backups

### Risk: Undocumented Business Logic

ID: MIG-RISK-002
Category: Technical
Probability: High
Impact: Medium
Pre-Migration RPN: 12 (4x3)

Description: Legacy system contains business logic that is not documented and unknown to the migration team. This logic may not be replicated in the new system, causing functional gaps.

Preventive Controls:
- Comprehensive legacy code analysis (AST parsing, log mining)
- Stakeholder interviews with all known users of legacy system
- Crash course in legacy system for new team (shadow experienced operators)
- Automated characterization tests on legacy system outputs

Detective Controls:
- Comparison jobs that flag behavioral differences between systems
- User feedback mechanism for "missing feature" reports
- Regression test suite covering known business scenarios

Contingency:
- Rapid response team to implement missed functionality
- Feature flag to route affected users back to legacy
- Sprint-based backlog for post-migration feature completion

### Risk: Performance Degradation

ID: MIG-RISK-003
Category: Technical
Probability: Medium
Impact: High
Pre-Migration RPN: 12 (3x4)

Description: The new system may have worse performance characteristics than the legacy system, leading to user-facing slowdowns.

Preventive Controls:
- Performance baseline captured before migration
- Performance benchmarks defined with clear targets (p50 < 200ms, p99 < 1s)
- Load testing in staging with production-matching data volumes
- Capacity planning for new infrastructure
- Caching strategy designed for new system workload

Detective Controls:
- Real-time performance monitoring (response time percentiles, throughput, error rate)
- Automatic performance comparison dashboard (new vs legacy)
- Alerting on performance degradation against baseline

Contingency:
- Rollback routing for affected users
- Performance optimization sprint (identified bottlenecks, targeted fixes)
- Infrastructure scaling (more/bigger instances)

### Risk: Team Knowledge Attrition

ID: MIG-RISK-004
Category: Operational
Probability: High
Impact: High
Pre-Migration RPN: 16 (4x4)

Description: Team members with deep legacy system knowledge may leave the organization or rotate off the project before knowledge is transferred.

Preventive Controls:
- Knowledge transfer sessions scheduled early in migration
- Legacy system runbooks and architecture documentation
- Pair programming between legacy experts and new team members
- Recorded walkthroughs of critical legacy functionalities
- Shadow rotations: each legacy module has a backup

Detective Controls:
- Knowledge transfer completion tracking per module
- Periodic quizzes or walkthroughs to verify understanding
- "Can we deploy without X person?" test

Contingency:
- Contractual retention bonuses for key knowledge holders through migration
- External contractor knowledge retention
- Code analysis tools to extract business rules from legacy codebase

### Risk: Integration Point Failure

ID: MIG-RISK-005
Category: Technical
Probability: Medium
Impact: Critical
Pre-Migration RPN: 12 (3x4)

Description: Dependent systems that integrate with the legacy system may fail when connections switch to the new system due to API contract differences.

Preventive Controls:
- API contract testing for all integration points
- Consumer-driven contract tests
- Integration testing in staging with real downstream systems
- API versioning with backward compatibility period

Detective Controls:
- Integration health monitoring (connection pool, response codes, latency)
- Synthetic transactions that exercise each integration point
- Downstream system error rate monitoring

Contingency:
- Anti-corruption layer maintained for fallback
- Integration point canary: test with one consumer before routing all
- Manual failback capability for each integration

## Rollback Planning

### Rollback Strategy per Migration Type

**Strangler Fig Rollback**: Simply route traffic back to legacy system. The legacy system was never fully decommissioned. Rollback is low-risk and fast.

Procedure:
1. Change routing rule at API gateway
2. Reroute traffic from new to legacy
3. Verify legacy system is handling traffic correctly
4. Keep new system running for investigation
5. Document root cause of rollback

Rollback time: 1-5 minutes (DNS propagation or config change)
Risk of rollback: Low (legacy system was running in production)

**Parallel Run Rollback**: Legacy system was still processing all requests. No actual rollback is needed -- just stop reading from the new system.

Procedure:
1. Stop using new system for primary processing
2. Continue using legacy system (it was never switched off)
3. Analyze discrepancies found during parallel run
4. Fix issues in new system
5. Resume parallel run

Rollback time: 0 minutes (no switch happened)
Risk of rollback: None (legacy system never stopped)

**Big Bang Rollback**: Most complex rollback. Requires reversing the data migration and traffic switch.

Procedure:
1. Announce rollback decision (to stakeholders, on-call, customers)
2. Stop traffic to new system
3. Reverse DNS/load balancer to point to legacy
4. Restore any data written to new system back to legacy (reverse sync)
5. Verify legacy system health
6. Monitor for data loss or corruption
7. Investigate root cause before planning next cutover attempt

Rollback time: 15 minutes to 4 hours (depends on data volume)
Risk of rollback: Medium-High (data reconciliation complexity)

### Rollback Triggers

Clear, measurable conditions that trigger automatic rollback consideration:

- Error rate exceeds baseline + 2% for more than 5 minutes
- Latency p99 exceeds 3x baseline for more than 5 minutes
- Data reconciliation mismatch > 0.01% of records
- Business metric (revenue, conversion, orders) drops > 5%
- Security incident on new system
- External dependency (payment gateway, auth provider) failure that affects new but not legacy
- Any P1 incident caused by the new system

### Rollback Decision Authority

Define who decides to rollback and under what circumstances:

- On-call engineer: Can rollback individual service (strangler fig) without approval
- Migration lead: Can rollback a full migration phase with notice to stakeholders
- Incident commander: Can order full rollback during a P1/P2 incident
- Executive: Involved only if rollback affects customer-visible services for > 30 minutes

Decision tree:
```
Is error rate > baseline + 2% for 5+ minutes?
  Yes -> Is it a P1 incident?
    Yes -> IC decides rollback -> Execute
    No -> Migration lead decides -> Execute or Mitigate
  No -> Continue monitoring

Is revenue drop > 5% detected?
  Yes -> Migration lead decides -> Rollback to restore revenue
  No -> Continue monitoring
```

## Testing Strategies for Risk Mitigation

### Characterization Testing

Before modifying legacy code, capture its behavior through characterization tests:

1. Run legacy system with known inputs
2. Capture all outputs (responses, database state, side effects)
3. Write tests that assert expected outputs for those inputs
4. These tests become the regression suite for the new system

Tools: Approval tests, property-based testing, record-and-replay (VCR, Polly.js)

### Integration Testing Strategy

Test integration points at multiple levels:

Level 1 - Contract tests: Verify API contracts (OpenAPI, gRPC proto) are satisfied by both legacy and new systems.

Level 2 - Component tests: Verify individual integration points with downstream systems.

Level 3 - End-to-end tests: Verify full request flow through the system. Run against staging environment with test data.

Level 4 - Production canary: Route a small percentage of real traffic to new system. Monitor for errors. Compare outputs.

### Chaos Engineering for Migration

Introduce controlled failures to validate migration resilience:

- Kill the anti-corruption layer: Does the system degrade gracefully?
- Simulate data sync failure: Does the system queue writes for retry?
- Increase latency on new system: Does the routing layer failover to legacy?
- Inject data corruption: Does reconciliation detect it?
- Kill the new system entirely: Does legacy take over cleanly?

Run chaos experiments in staging first, then in production with guardrails.

### Performance Testing

Essential for Big Bang and significant Strangler Fig milestones:

1. Baseline: Current legacy system performance under normal load
2. Target: New system performance targets (p50, p95, p99, max RPS, error rate)
3. Load test: Ramp up traffic to 2x expected peak. Measure response times and error rates.
4. Stress test: Push until the system breaks. Document the breaking point.
5. Soak test: Run at sustained peak load for 4+ hours. Look for memory leaks, connection pool exhaustion, disk filling.

Performance test environment must match production in data volume, configuration, and infrastructure.

## Communications Risk Management

### Stakeholder Communication Plan

| Stakeholder | Frequency | Channel | Content |
|-------------|-----------|---------|---------|
| Executive sponsor | Bi-weekly | Email + 15min call | Status, risks, decisions needed |
| Engineering team | Daily | Standup | What was done, blockers, next steps |
| Business stakeholders | Weekly | Email + dashboard | Progress, impact, timeline |
| Customer-facing teams | Weekly | Email | Expected customer impact, talking points |
| Regulatory (if applicable) | Per plan | Formal report | Compliance status, audit trail |
| Users/customers | Per milestone | Status page, email | Migration schedule, what to expect |

### Risk Communication Protocol

When a risk materializes:
1. Assess severity (use defined incident severity levels)
2. Notify affected stakeholders based on severity
3. Provide: what happened, impact, mitigation actions, timeline for resolution
4. Update as situation changes
5. Post-incident review within 5 business days

Hold-back: Do not communicate rollback or incident details externally until internal assessment is complete and response is underway.

## Post-Migration Risk Assessment

### Risk Scoring After Migration

Re-assess all risks after migration completion:

| Risk | Pre-Migration | Post-Migration | Delta |
|------|---------------|----------------|-------|
| Data loss | 16 | 4 | -12 |
| Undocumented logic | 12 | 6 | -6 |
| Performance degradation | 12 | 3 | -9 |
| Knowledge attrition | 16 | 8 | -8 |
| Integration failure | 12 | 4 | -8 |

Track residual risks: some risks persist even after migration (e.g., knowledge of new system is still developing). Include residual risks in the ongoing operational risk register.

### Lessons Learned Documentation

Capture structured lessons from every migration phase:

```
Lesson: {short description}
Category: {technical / process / people / communication}
Phase: {discovery / build / migration / decommission}
Impact: {positive / negative}
Root Cause: {what led to this observation}
Recommendation: {what to do differently next time}
Action Item: {owner, deadline}
```

Share lessons with other migration teams. Update migration playbook and runbooks.

## Risk Tooling and Templates

### Migration Risk Register Template

```
Risk ID | Category | Description | Probability (1-5) | Impact (1-5) | RPN | Owner | Mitigation | Contingency | Status
--------|----------|-------------|-------------------|--------------|-----|-------|------------|-------------|-------
MIG-001 | Data     | Data loss during ETL | 3 | 5 | 15 | jdoe | CDC + dual-write | Rollback and reconcile | Open
MIG-002 | Technical| API contract mismatch | 4 | 4 | 16 | jsmith | Contract tests | Anti-corruption layer | Mitigated
```

### Pre-Cutover Checklist Risk Review

```
Pre-Cutover Risk Verification
- [ ] All critical risks from register have acceptable residual risk
- [ ] Rollback plan documented and tested
- [ ] Rollback triggers defined and communicated to on-call
- [ ] All team members have executed cutover in staging at least once
- [ ] Performance baseline captured (last 30 days of production data)
- [ ] Monitoring dashards prepared for both systems
- [ ] Stakeholder notifications scheduled
- [ ] Executive escalation contacts confirmed
- [ ] Dependency status verified (all downstream systems ready)
- [ ] Data synchronization verified (counts, checksums)
- [ ] Security scan completed on new system
- [ ] Incident response runbook published
```
