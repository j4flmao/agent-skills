# SOAR Automation: Case Management Schema & Workflow Architecture

## Overview

Case management is the backbone of SOAR operations — it provides the persistent state model, audit trail, collaboration space, and workflow engine that underpins all incident response activities. This reference covers the architecture of SOAR case management systems, including data schema design, workflow state machines, collaboration patterns, and integration with external ticketing systems.

## Core Architecture Concepts

### Case Data Model

A SOAR case is a structured container that aggregates all information related to a security incident:

```
Case
├── Metadata (id, title, description, severity, status, timestamps)
├── Linked Alerts (one or more source alerts)
├── Entities (IPs, domains, hashes, users, hosts, URLs)
├── Timeline (ordered events with timestamps, actors, descriptions)
├── Tasks (action items with assignees, status, deadlines)
├── Notes (collaborative annotations with audit trail)
├── Attachments (evidence files, screenshots, log extracts)
├── Playbook Executions (automated actions taken)
├── Communications (email, chat, phone call records)
└── Audit Log (immutable record of all changes)
```

### State Machine Architecture

```
                    ┌──────────┐
                    │   NEW    │
                    └────┬─────┘
                         │ auto-triage
                         ▼
                    ┌──────────┐
               ┌───▶│ TRIAGE   │◀────────────┐
               │    └────┬─────┘              │
               │         │ assign             │
               │         ▼                    │
               │    ┌──────────┐              │
               │    │INVESTI-  │              │ re-open
               │    │GATING    │──────────────┘
               │    └────┬─────┘
               │         │ contain
               │         ▼
               │    ┌──────────┐
               │    │CONTAIN-  │
               │    │MENT      │
               │    └────┬─────┘
               │         │ eradicate
               │         ▼
               │    ┌──────────┐
               │    │ERADICA-  │
               │    │TION      │
               │    └────┬─────┘
               │         │ recover
               │         ▼
               │    ┌──────────┐
               │    │ RECOVERY │
               │    └────┬─────┘
               │         │ close
               │         ▼
               │    ┌──────────┐
               └────│  CLOSED  │
                    └──────────┘

Transitions:
  NEW → TRIAGE: Automatic (on alert creation)
  TRIAGE → INVESTIGATING: Manual (analyst assignment)
  INVESTIGATING → CONTAINMENT: Decision (malicious confirmed)
  CONTAINMENT → ERADICATION: Automated (post-containment)
  ERADICATION → RECOVERY: Manual (remediation verified)
  RECOVERY → CLOSED: Manual (business confirmation)
  Any → CLOSED: False positive (direct closure with reason)
  CLOSED → INVESTIGATING: Re-open (new evidence)
```

## Architecture Decision Trees

### Decision 1: Case Aggregation Strategy

```
Question: When to create a new case vs. add to existing case?
├── One alert = one case (simple)
│   ├── Pros: Simple, no merge complexity, clear traceability
│   ├── Cons: Alert storms create case storms, context fragmentation
│   └── Best for: Low-volume SOC, comprehensive SIEM correlation
├── Correlation-based aggregation (intelligent)
│   ├── Rules for merging:
│   │   ├── Same attacker IP → merge (within 24h window)
│   │   ├── Same affected user → merge (within 72h window)
│   │   ├── Same campaign indicator → merge (within 7d window)
│   │   └── Same TTP on same asset → merge (within 1h window)
│   ├── Pros: Reduced case volume, richer context
│   ├── Cons: Merge logic complexity, potential for over-merging
│   └── Best for: Medium-Large SOC, high alert volume
└── Time-bucketed aggregation (volume control)
    ├── Group alerts by type into time windows (15min, 1h, 4h, 24h)
    ├── Pros: Predictable volume, simple implementation
    ├── Cons: May merge unrelated incidents
    └── Best for: High-volume automated SOC
```

### Decision 2: External Ticketing Integration

```
Question: SOAR-native case management vs. external ticketing system?
├── SOAR-native only
│   ├── Pros: No sync latency, full feature access, single UI
│   ├── Cons: Ticketing features may be limited, org may require ServiceNow
│   └── Best for: SOC-only use, no enterprise ticketing mandate
├── External ticketing (ServiceNow, Jira) as source of truth
│   ├── SOAR creates/updates ticket → external system authoritative
│   ├── Pros: Enterprise standard, audit compliance, other teams use same system
│   ├── Cons: Sync latency, API limits, feature limitations in external system
│   └── Best for: Regulated enterprises, ITIL-aligned organizations
└── Bi-directional sync
    ├── Case created in both, state synchronized both directions
    ├── Pros: Best of both worlds
    ├── Cons: Conflict resolution complexity, reconciliation needed
    └── Best for: Large enterprises with dedicated integration team

Recommendation: Start with SOAR-native, add external sync when enterprise
integration becomes mandatory. Bi-directional sync is high-risk.
```

### Decision 3: Task Management Model

```
Question: How to manage investigation tasks?
├── Free-form (analysts add tasks as needed)
│   ├── Pros: Flexible, adapts to any incident type
│   ├── Cons: Inconsistent, may miss steps
│   └── Best for: Small SOC, experienced analysts
├── Playbook-driven (tasks generated from playbook steps)
│   ├── Pros: Consistent, complete coverage, measurable
│   ├── Cons: Rigid, may not fit every scenario
│   └── Best for: Standardized SOC, regulated environments
└── Hybrid (playbook suggests, analyst confirms)
    ├── Auto-generate tasks from playbook
    ├── Analyst can add/remove/modify
    ├── Pros: Structured yet flexible
    └── Best for: Most SOCs (recommended default)
```

## Implementation Strategies

### Phase 1: Schema Design (Weeks 1-3)
- Define case data model with mandatory and optional fields
- Implement status state machine with allowed transitions
- Create field-level access control model
- Define required audit log schema
- Establish data retention and archival policies

### Phase 2: Core Workflow (Weeks 4-8)
- Implement case creation from SIEM alerts
- Build triage assignment logic (round-robin, skill-based, severity-based)
- Create timeline and note-taking functionality
- Implement attachment and evidence management
- Deploy task management with assignment and deadlines

### Phase 3: Collaboration (Weeks 9-14)
- Build integrated communication (chat, email from case)
- Implement case sharing and joint investigation
- Create war room automation (auto-create Slack/Teams channel)
- Build case template system for recurring incident types
- Implement case tagging and classification

### Phase 4: Integration and Analytics (Weeks 15-20)
- Integrate with external ticketing systems
- Build case correlation and merge functionality
- Implement case metrics and analytics
- Create case closure checklist automation
- Deploy case search and reporting

## Integration Patterns

### Case Creation from SIEM

```
SIEM Alert → SOAR Webhook → Case Creation Pipeline

Pipeline Steps:
1. Validate alert payload (schema check)
2. Normalize fields to case model
3. Check for existing cases to merge
   ├── Match found → Add alert to existing case
   └── No match → Create new case
4. Assign severity (SIEM severity vs. SOAR severity mapping)
5. Apply case template based on alert type
6. Auto-generate initial tasks from template
7. Assign to appropriate team (skill-based routing)
8. Notify assignee via chat/email
9. Log creation in case audit trail
```

### External Ticketing Sync Pattern

```
SOAR Case ↔ ServiceNow Ticket

SOAR → ServiceNow (Case creation):
  POST /api/now/table/incident
  Body: {short_description, description, severity, assignment_group, caller_id}
  Response: ticket sys_id → stored in case metadata

ServiceNow → SOAR (Status update):
  Webhook: /soar/webhook/servicenow
  Payload: {sys_id, state, close_notes, resolved_by}
  Action: Update case status, add close notes

Reconciliation:
  Every 60min: Compare SOAR cases with ServiceNow tickets
  Mismatch resolution: More recent update wins, log conflict
```

## Performance Optimization

### Case Storage Architecture

| Storage Tier | Data | Access Pattern | Technology |
|-------------|------|---------------|------------|
| Hot (0-30 days) | Active cases, open investigations | Frequent reads/writes, search | PostgreSQL, Elasticsearch |
| Warm (31-90 days) | Recently closed cases | Occasional reads for reference | Elasticsearch, S3 + index |
| Cold (91-365 days) | Historical cases | Rare reads, compliance queries | S3/Glacier + metadata index |
| Archive (>1 year) | Compliance archives | Very rare, legal hold | Glacier, tape |

### Search Optimization

| Query Type | Index Strategy | Performance Target |
|-----------|---------------|-------------------|
| Case ID lookup | Primary key index | <10ms |
| Entity search (IP, domain) | Inverted index on entities | <100ms |
| Full-text search | Elasticsearch full-text index | <500ms |
| Time range + status | Composite index (created_at, status) | <200ms |
| Tag/classification | Bitmap index on tags | <50ms |
| Related cases | Graph traversal index | <1s |

## Security Considerations

### Case Access Control

```
Access Levels:
├── Viewer: Read-only access to assigned cases
├── Contributor: Add notes, upload evidence, update tasks
├── Investigator: Full case management, state transitions
├── Manager: Cross-team case access, reassignment, closure authority
└── Auditor: Read-only access to all cases, audit log access

Access Scoping:
├── Team-scoped: Access only cases assigned to your team
├── Severity-scoped: All cases up to assigned severity level
├── Global: Access all cases
└── Temporal: Access during assigned shift only

Access Enforcement:
- API-level: Every API call validated against RBAC policy
- Data-level: Field-level redaction for sensitive fields
- Audit-level: Every access logged with timestamp and reason
```

### Evidence Security
- All case evidence encrypted at rest (AES-256)
- Evidence access logged with chain of custody
- Evidence integrity verified via SHA-256 hash
- Automated evidence expiry based on data classification
- Legal hold capability for litigation-hold cases

## Operational Excellence

### Case Quality Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Documentation Score | Completeness of case fields | >90% |
| SLA Compliance | % cases resolved within SLA | >95% |
| Re-open Rate | Cases re-opened after closure | <5% |
| Merge Accuracy | Correct merges / total merges | >99% |
| Time to Triage | Alert to case assignment | <15 min |
| Task Completion | % of auto-generated tasks completed | >80% |

### Case Closure Checklist
```yaml
closure_checklist:
  mandatory:
    - "Root cause identified and documented"
    - "All tasks completed or explicitly deferred"
    - "Evidence collected and preserved"
    - "Timeline fully populated"
    - "Remediation verified (tick-tock)"
    - "Post-mortem scheduled (if SEV1/SEV2)"
    
  recommended:
    - "IoCs added to threat intel platform"
    - "Detection rule created/updated"
    - "Playbook updated based on lessons learned"
    - "Stakeholder notified of closure"
    - "Compliance evidence documented"
    
  automated:
    - "Case audit log complete"
    - "All attachments hashed and stored"
    - "External ticket synced"
    - "Metrics updated"
```

## Testing Strategy

### Case Management Testing
- **Schema validation tests**: Every field with correct types and constraints
- **State machine tests**: Every allowed and disallowed transition
- **Permission tests**: Every role with correct access levels
- **Sync tests**: SOAR-native ↔ external ticketing with conflict scenarios
- **Performance tests**: 10K concurrent case operations
- **Search tests**: All query types with expected latency
- **Audit tests**: Verify immutability and completeness of audit log

## Common Pitfalls

| Pitfall | Symptom | Root Cause | Prevention |
|---------|---------|------------|------------|
| Case sprawl | Thousands of single-alert cases | No aggregation logic | Correlation-based merging |
| Lost context | Case doesn't contain all relevant data | Incomplete enrichment pipeline | Auto-enrichment at case creation |
| Sync conflicts | SOAR and ticketing out of sync | Bidirectional sync conflicts | Idempotent updates, last-write-wins |
| Bloated cases | Single case with 500+ alerts | Overly aggressive merging | Merge with limits, time windows |
| Audit gaps | Missing state changes | Incomplete audit logging | Mandatory audit on all state transitions |
| Template rot | Case templates out of date | No template review cycle | Quarterly template audit with stakeholders |

## Key Takeaways

- Design case schema as an aggregation container: alerts, entities, timeline, tasks, notes, evidence
- Implement state machine with explicit allowed transitions and validation
- Start with SOAR-native case management, add external ticketing sync when required
- Use correlation-based aggregation to prevent case sprawl
- Implement multi-tier storage (hot/warm/cold/archive) based on access patterns
- Enforce field-level access control with RBAC
- Define a closure checklist with mandatory and recommended items
- Monitor case quality with documentation score, SLA compliance, and re-open rate
- Design for merge accuracy with dedup and correlation logic

## Related References
- references/soar-playbooks.md — Playbook patterns
- references/playbook-development.md — Playbook development
- references/triage-automation.md — Triage automation
- references/soar-platforms.md — Platform selection
- references/soar-integrations.md — Integration patterns
- references/soar-automation-fundamentals.md — Foundational concepts
