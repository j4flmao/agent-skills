# SOC Operations: Incident Response Architecture & Decision Framework

## Overview

This reference defines the architectural components, decision trees, and system design principles for building a production-grade incident response capability within a Security Operations Center. It covers the end-to-end response lifecycle, integration patterns between SOC tools, and trade-off analysis for key architectural decisions.

## Core Architecture Concepts

### Incident Response Lifecycle Architecture

The IR lifecycle is architected as a state machine with well-defined transitions:

```
Detection → Triage → Classification → Containment → Eradication → Recovery → Post-Mortem
                ↑                                                              │
                └────────────────── Feedback Loop ─────────────────────────────┘
```

Each state has defined entry criteria, exit criteria, SLAs, and escalation paths. The state machine is implemented as an orchestration layer in the SOAR platform, with events published to a message bus for downstream consumers.

### System Components

| Component | Responsibility | Tech Examples | Scaling Model |
|-----------|---------------|---------------|---------------|
| Detection Engine | Alert generation from raw telemetry | SIEM, EDR, NDR, UEBA | Horizontal, partition by data source |
| Triage Queue | Alert prioritization and assignment | SOAR case management, ticketing | Sharded by severity/type |
| Investigation Workspace | Centralized context for analyst | SOAR case page, collaborative notebook | Per-incident isolation |
| Knowledge Base | Runbooks, playbooks, past incidents | Confluence, TheHive, custom wiki | Read-replicated, cached |
| Communication Bus | Real-time updates to stakeholders | Slack, Teams, PagerDuty, email | Pub/sub with fan-out |
| Evidence Store | Immutable artifact repository | S3, Elasticsearch, HDFS | Object store with lifecycle policies |
| Metrics Pipeline | Operational and security metrics | Prometheus, Elasticsearch, custom | Stream processing with aggregation |

### Data Flow Architecture

```
Log Sources → SIEM → Alert → SOAR → Triage Queue → Analyst Workstation
                 ↓                  ↓                    ↓
            Correlation        Enrichment            Response Actions
                 ↓                  ↓                    ↓
            Detection         Threat Intel            Infrastructure
```

Key architectural decisions:
- **Push vs Pull**: SOAR should poll SIEM for alerts (pull) to avoid alert floods overwhelming the orchestration layer
- **Synchronous vs Async**: Triage assignment is synchronous; enrichment lookups are async with callback
- **Stateful vs Stateless**: Incident state is persisted in a database; analyst sessions are stateless

## Architecture Decision Trees

### Decision 1: Alert Routing Strategy

```
Alert arrives at SOAR
├── Severity == CRITICAL
│   ├── Automated containment possible?
│   │   ├── Yes → Execute auto-containment → Notify T2 on-call
│   │   └── No → Page T2 immediately → Create war room
├── Severity == HIGH
│   ├── Known pattern?
│   │   ├── Yes → Route to T1 with runbook → Auto-assign
│   │   └── No → Route to T2 for investigation → Manual assign
├── Severity == MEDIUM
│   ├── Business hours?
│   │   ├── Yes → Pool queue → T1 picks up on availability
│   │   └── No → Queue for next shift → Batch triage
└── Severity == LOW
    └── Batch process daily → Auto-close if false positive pattern
```

### Decision 2: Tool Selection Trade-offs

| Criterion | Commercial SIEM + SOAR | Open Source Stack | Best-of-Breed |
|-----------|----------------------|-------------------|---------------|
| Integration Depth | Native, deep | Manual, API-based | Varies by vendor |
| TCO at Scale | High licensing cost | Infrastructure cost | Medium-High |
| Time to Value | Weeks | Months | Weeks-Months |
| Customization | Limited by product roadmap | Full control | Vendor-dependent |
| Support | Vendor SLA | Community, commercial add-ons | Per-vendor |
| Vendor Lock-in | High | Low | Medium |

## Implementation Strategies

### Phase 1: Foundation (Weeks 1-4)
- Deploy SIEM with top 5 log sources (AD, firewall, EDR, DNS, cloud)
- Create 10 high-fidelity correlation rules (no false positives expected)
- Implement 5 SOAR playbooks for automated triage
- Define incident severity matrix with SLAs
- Establish shift structure and escalation contacts

### Phase 2: Operational (Weeks 5-12)
- Onboard remaining log sources (application, database, physical)
- Expand to 30+ detection rules with tuning cycles
- Build 15+ SOAR playbooks including enrichment and containment
- Implement shift handover automation
- Deploy SOC metrics dashboard
- Establish post-mortem process

### Phase 3: Advanced (Weeks 13-24)
- UEBA deployment for behavioral analytics
- Threat hunting program with MITRE ATT&CK alignment
- Automated containment for top 5 attack patterns
- Purple team exercises to validate detection coverage
- Capacity planning for data volume growth

### Phase 4: Optimize (Ongoing)
- False positive reduction targeting <5% FP rate
- Playbook effectiveness scoring and improvement
- MTTD/MTTR reduction via automation
- Regular tabletop exercises
- Continuous feedback loop to detection engineering

## Integration Patterns

### SIEM-SOAR Integration

```
Pattern: Webhook-based alert forwarding
Pros: Real-time, simple, no polling overhead
Cons: No retry logic, potential for missed alerts
Best for: Low-volume, high-severity alerts

Pattern: API-based polling
Pros: Reliable, retry-capable, batch processing
Cons: Higher latency, API rate limits
Best for: High-volume, all-severity alert handling
```

### EDR-SOAR Integration

```
Alert: EDR detects malware → API call to isolate endpoint
Step 1: SOAR receives webhook from EDR
Step 2: Validate alert (check for false positive indicators)
Step 3: Isolate endpoint via EDR API (POST /api/endpoints/{id}/isolate)
Step 4: Check isolation status (poll every 30s, max 5 min)
Step 5: If failed, escalate to Tier 2 with error context
Step 6: Log all actions to case management
```

### Threat Intel Integration

```
Feeds → TIP → SIEM rules → SOAR enrichment → Analyst context

Decision: When to enrich?
- Pre-triage: Enrich all HIGH+ alerts (adds 30-60s latency)
- On-demand: Enrich only when analyst requests (no latency impact)
- Batch: Enrich during low-activity periods, cache results
```

## Performance Optimization

### Queue Throughput Engineering

| Factor | Constraint | Mitigation |
|--------|-----------|------------|
| Alert ingestion rate | SIEM API rate limit | Batch alerts, queue locally |
| Enrichment lookups | External API rate limits | Cache results, throttle requests |
| Playbook execution | Script runtime limits | Parallelize independent branches |
| Case creation | Database write throughput | Shard by tenant/region |
| Notification delivery | Chat API rate limits | Queue notifications, batch send |

### Cache Strategy
- **Enrichment cache**: TTL 1h for IP/domain reputation, 24h for file hashes
- **Runbook cache**: TTL 1h, invalidated on update
- **User/team cache**: TTL 5min, real-time updates via webhook
- **Session cache**: In-memory, TTL = shift duration

## Security Considerations

### Isolation Architecture
```
SOAR Platform
├── Management Plane (UI, API, RBAC)
├── Worker Plane (Playbook execution)
│   ├── Sandboxed containers (per playbook)
│   ├── Network isolated (no internet unless specified)
│   └── Resource limited (CPU, memory, disk)
└── Data Plane (Case management, evidence)
    ├── Encrypted at rest (AES-256)
    ├── Encrypted in transit (TLS 1.3)
    └── Immutable audit log
```

### Credential Management
- All integrations use OAuth 2.0 client credentials or API tokens
- Credentials stored in vault (HashiCorp Vault, CyberArk)
- Playbooks access secrets via vault API, never embedded
- Rotation policy: 30 days for service accounts, 90 days for API tokens
- Audit: Every credential access logged and correlated to incident

## Operational Excellence

### Runbook Structure Standard
```yaml
runbook:
  metadata:
    id: RB-001
    name: "Phishing Response"
    version: "2.1"
    owner: "SOC Tier 2"
    last_reviewed: "2026-05-15"
  
  trigger:
    conditions:
      - "Alert type: phishing"
      - "Severity: >= MEDIUM"
    
  steps:
    - id: S1
      name: "Extract indicators"
      action: "Parse email headers, URLs, attachments"
      automation: true
      timeout: 30s
    
    - id: S2
      name: "Check reputation"
      action: "Query VirusTotal, URLScan, phish.detection"
      automation: true
      timeout: 120s
      
    - id: S3
      name: "Determine user action"
      decision:
        condition: "User clicked link or opened attachment"
        true:
          - id: S3a
            action: "Force password reset"
            automation: true
          - id: S3b
            action: "Enable MFA if not active"
            automation: true
          - id: S3c
            action: "Scan endpoint with EDR"
            automation: true
        false:
          - id: S3d
            action: "Block sender at email gateway"
            automation: true
    
    - id: S4
      name: "Contain if malicious"
      automation: false
      approval_required: "T2 analyst"

  escalation:
    timeout: 30min
    to_tier: 3
    conditions:
      - "Lateral movement detected"
      - "Credentials compromised on multiple systems"
```

### Shift Handover Automation
Design a continuous handover process:
- Shift summary auto-generated 15min before handover
- Open incidents transferred with full context
- Pending enrichment results re-routed to incoming team
- Critical alerts during handover go to both teams
- Handover document stored as case note in SOAR

## Testing Strategy

### Detection Testing
- TTP-based testing using atomic red team
- Scheduled weekly validation of top 20 rules
- Monthly purple team exercises for new detections
- Quarterly full regression test of all rules

### Playbook Testing
- Unit test each playbook step in isolation
- Integration test with mock API responses
- Dry-run mode for destructive actions
- Production validation with canary alerts
- Monthly full regression of all active playbooks

### Performance Testing
- Load test ingestion pipeline at 2x peak volume
- Soak test for 72h to detect memory leaks
- Chaos testing: kill worker pods, verify recovery
- Failover test: switch to DR region, measure RTO

## Common Pitfalls

| Pitfall | Symptom | Root Cause | Prevention |
|---------|---------|------------|------------|
| Alert fatigue | Analysts ignore alerts | Too many low-fidelity rules | Strict tuning, FP feedback loop |
| Playbook failures | Partial containment | API changes, expired creds | Versioned integrations, health checks |
| Context loss | Analysts re-investigate | Poor handover process | Automated shift summaries |
| Tool silos | Context switching | Non-integrated tools | Unified SOAR case view |
| Metric vanity | Wrong KPIs tracked | Measuring activity not outcomes | Focus on MTTD, MTTR, FP rate |
| Burnout | High analyst turnover | 24/7 without adequate staffing | Follow-the-sun, proper shift ratios |

## Key Takeaways

- Architect incident response as a state machine with clear state transitions
- Route alerts based on severity AND pattern familiarity, not severity alone
- Build automation incrementally: triage first, then enrichment, then containment
- Cache enrichment results aggressively to reduce API dependency
- Test playbooks in dry-run mode before enabling automated actions
- Structure handovers as automated data transfers, not verbal summaries
- Measure what matters: detection quality over alert volume
- Design for credential rotation from day one

## Related References
- references/soc-structure.md — SOC tier model and roles
- references/soc-runbooks.md — Runbook templates and patterns
- references/triage-procedures.md — Alert triage methodology
- references/threat-hunting.md — Threat hunting integration
- references/soc-metrics.md — SOC metrics and KPIs
- references/soc-operations-fundamentals.md — Foundational SOC concepts
