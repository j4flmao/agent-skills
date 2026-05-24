# Detection Engineering

## Detection Lifecycle

```
Requirements → Design → Implementation → Testing → Deployment → Tuning → Deprecation
    ↑                                                                           │
    └──────────────────────── Feedback Loop ◄───────────────────────────────────┘
```

### Phase 1: Requirements
- Identify threat scenario (TTP from MITRE ATT&CK, real incident, intelligence report)
- Define detection goal: What adversary behavior should trigger?
- Determine data sources needed: Do we have the right logs?
- Set priority based on risk (likelihood × impact)
- Document business context: What systems are affected?

### Phase 2: Design
- Select detection pattern (signature, behavioral, anomaly, threshold)
- Define detection logic with explicit conditions
- Map to MITRE ATT&CK technique(s) for classification
- Determine severity assignment logic
- Plan response actions on detection

### Phase 3: Implementation

#### Sigma Rule Example
```yaml
title: Suspicious Service Installation
id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
status: experimental
description: Detects suspicious service installation from non-standard paths
author: Detection Engineering Team
date: 2026-05-20
tags:
  - attack.persistence
  - attack.t1543.003
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    Image|endswith:
      - '\sc.exe'
      - '\powershell.exe'
      - '\wmic.exe'
    CommandLine|contains:
      - 'create'
      - 'New-Service'
  filter:
    CommandLine|contains:
      - 'C:\Windows\System32\'
      - 'C:\Program Files'
  condition: selection and not filter
falsepositives:
  - Legitimate software installation
  - IT admin maintenance
level: medium
```

### Phase 4: Testing

| Test Type | Method | Frequency |
|-----------|--------|-----------|
| Unit Test | Run rule against known malicious sample | Per rule creation |
| Regression Test | Run rule against historical benign data | Per rule update |
| Integration Test | Run in test environment with simulated attack | Per deployment |
| Canary Deployment | Deploy to small subset of production | Per deployment |
| A/B Testing | Compare with existing rule coverage | Quarterly |

**Testing Tools:**
- Atomic Red Team — Atomic test execution for validation
- Caldera — Automated adversary emulation
- Red Canary Atomic Tests — TTP-based test library
- Custom test harness — Inject events directly into detection pipeline

### Phase 5: Deployment
- Deploy in monitoring-only mode first (alert but no response)
- Set initial severity to "Informational" to observe behavior
- Analyze initial alert volume for 7-14 days
- Apply tuning before enabling active response
- Promote to production with appropriate severity

### Phase 6: Tuning
- Baseline normal behavior for your environment
- Identify false positive patterns and create filters
- Adjust thresholds based on observed volume
- Whitelist known-good processes, users, and paths

### Phase 7: Deprecation
- Rule no longer triggers on validated threats
- Better rule created that supersedes this one
- Data source no longer available (log source decommissioned)
- Coverage shifted to different technique (MITRE mapping updated)

## Detection Patterns

### 1. Signature-Based
- Match on static indicators (hash, IP, domain, known string pattern)
- Pros: Low false positive, simple to implement
- Cons: Easily evaded, only detects known threats

### 2. Behavioral
- Detect anomalous activity patterns (process chain, command-line anomalies)
- Pros: Detects variants, harder to evade
- Cons: Higher false positive rate, requires tuning

### 3. Anomaly/Statistical
- Establish baseline and alert on deviation (event frequency, time of day)
- Pros: Detects unknown threats, zero-day
- Cons: Complex implementation, baseline drift

### 4. Threshold/Counting
- Alert on count of events in time window (brute force, port scan)
- Pros: Detects low-slow attacks
- Cons: Challenging with noise, log latency

### 5. Correlation/Chaining
- Link multiple events across sources (detonated phish + beaconing + data access)
- Pros: High fidelity, reduces alert volume
- Cons: Complex logic, stateful tracking

## False Positive Tuning

### Tuning Strategies
1. **Allowlist by entity**: Exclude known-good users, IPs, processes, paths
2. **Time-based filtering**: Exclude during maintenance windows, business hours
3. **Threshold adjustment**: Raise minimum event count or score threshold
4. **Additional conditions**: Require multiple signals before alerting
5. **Context enrichment**: Add geo, asset criticality, user role as conditions

### FP Categorization
| Category | Description | Resolution |
|----------|-------------|------------|
| Expected Behavior | Admin running legitimate tools | Add process exclusion with approval |
| Tool Conflict | Security tool triggering rule | Cross-product exclusion |
| Environmental | Specific app behavior in your org | Environment-specific filter |
| Threshold Too Low | Normal activity exceeds threshold | Raise threshold |
| Missing Context | Data source too broad | Add additional conditions |

## Detection as Code

### Repository Structure
```
detections/
├── sigma/
│   ├── windows/
│   │   ├── process_creation/
│   │   ├── registry_event/
│   │   ├── file_event/
│   │   └── network_connection/
│   ├── linux/
│   └── cloud/
├── kql/
│   ├── sentinel/
│   └── defender/
├── splunk/
│   ├── savedsearches/
│   └── macros/
├── tests/
│   ├── atomic/
│   └── unit/
├── .github/
│   └── workflows/
│       └── test-rules.yml
└── README.md
```

### CI/CD Pipeline
1. **PR submitted** with new/modified rule
2. **Lint check**: Validate YAML/JSON syntax, required fields
3. **Schema validation**: Verify against detection schema
4. **Automated testing**: Run against test dataset
5. **Peer review**: Detection engineer reviews logic
6. **Staging deploy**: Deploy to SIEM test environment
7. **Canary period**: Monitor alerts for 24-48h
8. **Production deploy**: Promote to production environment

## Alert Enrichment

### Enrichment Sources
| Source | Data Enriched | Use Case |
|--------|--------------|----------|
| Active Directory | User department, manager, group membership | User context |
| CMDB | Asset owner, criticality, location | Asset context |
| Threat Intel | IP/domain/hash reputation | Severity scoring |
| GeoIP | Source IP geographic location | Anomaly detection |
| HR System | Employee status, last day | Insider threat |
| PAM | Privileged access elevation | Account abuse |

### Enrichment Pipeline
```
Raw Alert → User Lookup → Asset Lookup → Threat Intel Check → GeoIP → Severity Scoring
```

Each enrichment step adds fields to the alert:
```json
{
  "alert": { "original_fields": {...} },
  "enrichments": {
    "user": { "department": "Engineering", "manager": "jane.doe@company.com" },
    "asset": { "criticality": "high", "owner": "ops@company.com" },
    "reputation": { "vt_score": 45, "malicious": false },
    "geo": { "country": "US", "is_expected": true }
  }
}
```
