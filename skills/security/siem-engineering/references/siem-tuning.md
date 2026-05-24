# SIEM Tuning

## Tuning Framework

```
Log Quality → Ingestion Filtering → Rule Tuning → Performance Optimization → Storage Optimization
     ↓               ↓                    ↓                  ↓                        ↓
  Log source     Suppress         Adjust rules         Index strategy            Retention
  validation     noisy sources    for FP/FN            optimize                  tier tuning
```

## Log Source Quality

### Quality Assessment Criteria
| Criterion | Description | Measurement |
|-----------|-------------|-------------|
| Completeness | Are all expected events present? | % of expected vs received events |
| Timeliness | Is log delivery within SLA? | 95th percentile delivery latency |
| Accuracy | Are fields correctly populated? | % of logs with valid values for key fields |
| Consistency | Same format across all sources? | % of logs passing schema validation |
| Coverage | Are all sources contributing? | % of assets sending expected logs |

### Log Quality Scoring
```yaml
log_quality:
  windows_security_event_log:
    score: 92/100
    issues:
      - field: "TargetUserName"
        empty_rate: 3%
        severity: warning
      - field: "WorkstationName"
        empty_rate: 8%
        severity: low
    recommendations:
      - "GPO: Enable auditing for logon events"
      - "GPO: Ensure workstation name logging is enabled"

  aws_cloudtrail:
    score: 98/100
    issues: []
    recommendations: []
```

### Log Source Validation
- Validate timestamp accuracy (± 1 sec expected)
- Check for truncated events (split across multiple logs)
- Verify required fields are populated for all events
- Monitor for format drift (parser compatibility)
- Test against known events (manual trigger then verify)

## Ingestion Filtering

### Filtering Strategies

**At Source (Forwarder-level):**
- Exclude noise events before they leave the source
- Filter health check events, heartbeat messages, debug logs
- Whitelist only relevant event IDs for each log source

**At Collector/Ingestion:**
- Drop events from trusted but noisy internal sources
- Sample high-volume low-value data (e.g., DNS queries)
- Limit per-source event rate with quota enforcement

**At Index Time:**
- Route low-value events to cheaper storage tier
- Drop fields from verbose events to reduce index size
- Apply regex extract vs key-value parsing based on value

### Ingestion Filter Examples
```yaml
ingestion_filters:
  # Windows Event Log - exclude noise
  - source: windows_security
    action: drop
    conditions:
      - event_id: 4662  # AD object access (very verbose)
      - event_id: [5156, 5158, 5159]  # Windows Filtering Platform (network noise)
      - event_id: 5061  # Cryptographic operation (debug noise)

  # Drop event if message contains known noise patterns
  - source: syslog
    action: drop
    field: message
    pattern: "healthcheck|heartbeat|keepalive|status=up|status=ok"

  # Sample low-value DNS queries
  - source: dns_logs
    action: sample
    rate: 0.1  # Keep 10% of records
    exclusion:
      - query_type: "A" or "AAAA"
      - query: "*.microsoft.com" or "*.windowsupdate.com"
```

### Log Source Volume Budget
| Log Source | Daily Volume | Budget | Action if Exceeded |
|------------|-------------|--------|-------------------|
| Windows Security | 500 GB | 600 GB | Filter verbose events |
| DNS Queries | 2 TB | 1.5 TB | Increase sampling rate |
| Network Flow Logs | 3 TB | 2 TB | Aggregate flows, filter internal |
| CloudTrail | 200 GB | 250 GB | Filter read-only events |
| Proxy Logs | 400 GB | 500 GB | Filter known-good sites |
| EDR Alerts | 50 GB | 75 GB | N/A |

## Rule Tuning

### Tuning Methodology

1. **Baseline**: Run rule for 7-14 days in monitoring-only mode
2. **Analyze**: Review all triggered alerts — classify TP, FP, noise
3. **Identify patterns**: What entities/sources/times cause FPs?
4. **Modify**: Apply one tuning change at a time
5. **Validate**: Test modified rule on historical data
6. **Repeat**: Continue until FP rate is acceptable

### Tuning Adjustments
| Adjustment | Effect | Risk |
|-----------|--------|------|
| Add allowlist (user/IP/host) | Reduces FP | May miss true attack from allowlisted source |
| Increase threshold | Reduces FP and sensitivity | May miss low-and-slow attacks |
| Narrow time window | Reduces detection window | May miss attacks spread over time |
| Add additional condition | Improves precision | May increase FNs with untested conditions |
| Suppress by time | Reduces noise during known activity | May miss attacks during suppression window |
| Decrease severity | Reduces alerting priority | May hide actual threats in noise |

### Tuning Workflow Example
```yaml
rule: "Multiple Failed Logins from Same IP"
version: "1.2"
tuning_history:
  - date: "2026-04-01"
    change: "Initial deployment"
    volume: "250 alerts/day"
    fp_rate: "40%"

  - date: "2026-04-08"
    change: "Added IP whitelist for VPN ranges"
    volume: "150 alerts/day"
    fp_rate: "25%"

  - date: "2026-04-15"
    change: "Increased threshold from 10 to 20 in 5 minutes"
    volume: "80 alerts/day"
    fp_rate: "15%"

  - date: "2026-04-22"
    change: "Added exclusion for known scanning tools (Qualys, Nessus)"
    volume: "45 alerts/day"
    fp_rate: "8%"

current:
  volume: "45 alerts/day"
  fp_rate: "8%"
  status: "acceptable"
```

## False Positive Reduction

### FP Classification
| FP Type | Cause | Remedy |
|---------|-------|--------|
| Environmental | Specific to your org's apps/processes | Environment-specific filter |
| Tool Conflict | Security tools triggering each other | Cross-tool exclusion coordination |
| Baseline Shift | Normal behavior changed (new app, migration) | Update baseline, retrain model |
| Configuration Gap | Log source misconfigured | Fix log source configuration |
| Rule Too Broad | Detection logic too generic | Add specific conditions |
| Missing Context | Rule needs additional info to validate | Add enrichment before decision |

### FP Review Process
```
Alert Generated
    ↓
Auto-enrich (user, asset, intel context)
    ↓
Low Score / Known FP → Close automatically
    ↓
Medium Score → Review by T1 analyst
    ↓
High Score → Escalate to T2
    ↓
Weekly FP review meeting:
  - Top 10 rules by FP count
  - FP trend analysis
  - Tuning recommendations
  - Rule deprecation decisions
```

## False Negative Optimization

### FN Detection Methods
| Method | Description | Tooling |
|--------|-------------|---------|
| Retrospective analysis | Hunt known threats in historical logs | SIEM search, KQL/SPL queries |
| Red team validation | Run adversary emulation against rules | Atomic Red Team, Caldera |
| Peer comparison | Compare detection coverage to industry peers | Threat intel, benchmarks |
| Incident review | Analyze missed detections after incidents | Post-mortem analysis |
| Coverage mapping | MITRE coverage gap analysis | MITRE ATT&CK navigator |

### FN Resolution
```yaml
missed_detection:
  incident: "Ransomware on FIN-PROD-042"
  date: "2026-05-15"
  root_cause:
    - "Scheduled task creation (T1053.005) was not monitored"
    - "Process creation args truncated due to indexing limit"
  resolution:
    - "Added rule for suspicious scheduled task creation"
    - "Enabled command-line logging for all process events"
    - "Extended ProcessCommandLine field to 4096 chars"
  validation:
    - "Atomic Red Team T1053.005 test passes"
    - "Historical FN events now trigger new rule"
```

## Rule Performance

### Performance Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Search time | < 5 sec | Query execution time per rule |
| Index impact | < 50 GB/day/rule | Storage consumed |
| CPU usage | < 5% of search cluster | CPU per rule evaluation |
| Memory usage | < 2 GB per rule | Memory per correlation engine |
| Alert latency | < 30 sec from event to alert | Alert generation time |

### Performance Optimization
- Use summary/datamodel acceleration for frequently queried fields
- Avoid regex on unindexed fields — use indexed fields where possible
- Batch event lookups instead of per-event correlation
- Use time-bounded searches (limit search window)
- Pre-aggregate high-frequency events into rollups
- Archive rules that run but never trigger (stale rules)

## Storage Optimization

### Retention Tier Strategy
| Tier | Duration | Performance | Storage Cost | Example |
|------|----------|-------------|--------------|---------|
| Hot | 7-30 days | Fast (SSD) | High | Active investigation, real-time rules |
| Warm | 30-90 days | Medium (HDD) | Medium | Regular compliance queries |
| Cold | 90-365 days | Slow (object store) | Low | Compliance retention, historical analysis |
| Frozen | 1-7 years | Archived (tape/glacier) | Very low | Legal hold, long-term compliance |

### Storage Reduction Techniques
| Technique | Reduction | Impact |
|-----------|-----------|--------|
| Drop unnecessary fields | 30-50% | Low — keep useful fields |
| Event sampling | 50-90% | High — miss low-frequency events |
| Aggregation/rollups | 70-90% | Medium — preserves trends, loses individual events |
| Compression at source | 20-40% | None — transparent to users |
| Deduplication | 5-20% | None — dedup identical events |
| Routing verbose events | 40-60% | Medium — retain raw searchability on subset |

### Storage Budget Allocation
```yaml
storage_budget:
  total: "10 TB/day"
  distribution:
    auth: "15%"
    endpoint: "25%"
    network: "30%"
    cloud: "20%"
    application: "8%"
    intel: "2%"
  retention:
    auth: { hot: 30, warm: 90, cold: 365 }
    endpoint: { hot: 14, warm: 60, cold: 180 }
    network: { hot: 7, warm: 30, cold: 90 }
    cloud: { hot: 14, warm: 60, cold: 365 }
    application: { hot: 7, warm: 30, cold: 90 }
    intel: { hot: 90, warm: 365, cold: 730 }
```

## Tuning Dashboard Metrics
| Metric | Description | Target |
|--------|-------------|--------|
| Alert Volume | Total alerts per day | < 500/day |
| FP Rate | % of alerts that are false positive | < 10% |
| FN Rate | % of known attacks missed | < 5% |
| Mean Alert Triage Time | Avg time to review | < 15 min |
| Rule Staleness | % of rules not triggered in 90 days | < 20% |
| Indexing Ratio | Raw data vs index size | < 1:4 (25% overhead) |
| Ingestion Coverage | % of assets sending logs | > 95% |
