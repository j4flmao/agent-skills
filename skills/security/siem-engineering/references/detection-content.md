# Detection Content Creation

## Detection Rule Lifecycle

```
Idea → Requirements → Design → Implementation → Testing → Deployment → Tuning → Deprecation
```

### Phase 1: Requirements Gathering
- Threat scenario: What TTP from MITRE ATT&CK?
- Business impact: What systems/data are at risk?
- Detection goal: What exactly should trigger?
- Source events: What logs are needed (process creation, network, auth)?
- Assumptions: What baseline behaviors are assumed normal?

### Phase 2: Design

#### Detection Pattern Selection
| Pattern | Description | When to Use |
|---------|-------------|-------------|
| Single event | One match triggers alert | Known bad indicator, high severity |
| Threshold | N events in time window | Brute force, scanning, beaconing |
| Ratio | Compare counts between event types | Successful vs failed, inbound vs outbound |
| Sequence | Events in specific order | Attack chain (phish → exec → beacon) |
| Statistical | Deviation from baseline | User behavior anomaly, data volume change |
| Correlation | Multiple sources combined | Auth failure + network scan + data access |

#### Rule Severity Classification
| Severity | Definition | Response Time |
|----------|------------|---------------|
| Critical | Active threat with confirmed impact | < 15 min |
| High | High-confidence threat, potential impact | < 30 min |
| Medium | Possible threat, needs investigation | < 4 hours |
| Low | Informational, suspicious but low risk | < 24 hours |
| Informational | Not actionable, data for hunting | No SLA |

## Correlation Rule Patterns

### 1. Single Event Rules
```yaml
name: "LSASS Access from Non-Standard Process"
description: "Detects potential credential dumping via lsass.exe access"
severity: high
mitre_attack: T1003.001
detection:
  source: windows_security
  event_id: 4663
  conditions:
    - field: ObjectName
      value: "\\*\\lsass.exe"
    - field: AccessMask
      value: "0x10"  # PROCESS_VM_READ
    - field: ProcessName
      not_in: ["C:\\Windows\\System32\\svchost.exe",
               "C:\\Windows\\System32\\taskmgr.exe",
               "C:\\Program Files\\*"]
```

### 2. Threshold Rules
```yaml
name: "SSH Brute Force Detection"
description: "Multiple failed SSH logins in short time window"
severity: medium
mitre_attack: T1110
detection:
  source: linux_auth
  event_id: "Failed password"
  threshold:
    count: 10
    window: 300  # seconds (5 min)
    group_by: ["src_ip"]
  suppression:
    - field: "src_ip"
      condition: "known_admin_ip == true"
      action: ignore
```

### 3. Sequence Rules
```yaml
name: "Phishing to Beacon Chain"
description: "Detects email click followed by process creation and C2 beacon"
severity: high
mitre_attack:
  - T1566.001  # Phishing
  - T1059.001  # PowerShell
  - T1071.001  # Web C2
detection:
  sequence:
    - event: web_proxy
      filter: "url_category == 'malicious' or vt_score > 5"
      group: user
    - event: process_creation
      filter: "parent_process == 'outlook.exe' or parent_process == 'chrome.exe'"
      group: user
    - event: network_connection
      filter: "dest_port == 443 and dest_ip not in known_ips"
      group: user
  max_window: 3600  # 1 hour
```

### 4. Ratio/Statistical Rules
```yaml
name: "Abnormal Authentication Failure Ratio"
description: "Unusual ratio of failed to successful authentications"
severity: medium
detection:
  source: windows_security
  ratio:
    numerator:
      event_id: 4625  # Failed logon
      group_by: ["user"]
    denominator:
      event_id: 4624  # Successful logon
      group_by: ["user"]
    threshold: 0.8  # 80% failure rate
    window: 86400  # 24 hours
  baseline:
    window: 604800  # 7 days
    method: rolling_average
```

### 5. Correlation Rules
```yaml
name: "AWS IAM Suspicious Activity Chain"
description: "Correlates console disable, new access key, and data exfiltration"
severity: critical
mitre_attack: T1525
detection:
  correlation:
    - source: aws_cloudtrail
      event: "DisableMFADevice" or "DeleteMFADevice"
      time_window: 3600
    - source: aws_cloudtrail
      event: "CreateAccessKey" or "CreateAccessKey"
      time_window: 3600
    - source: aws_cloudtrail
      event: "GetObject" or "CopyObject"
      bucket: "*-backup" or "*-data"
      volume_threshold: "1GB"
  correlation_key: "user_arn"
  max_window: 7200  # 2 hours
```

## Anomaly Detection

### Baseline Methods
| Method | Description | Use Case |
|--------|-------------|----------|
| Rolling Average | Mean of last N windows | Authentication volume |
| Standard Deviation | Mean ± N*stddev | Network traffic volume |
| Time Series (ARIMA) | Predict next value based on history | Log volume prediction |
| Seasonal Decomposition | Account for daily/weekly patterns | User login times |
| Machine Learning | Behavioral clustering | User/entity behavior anomalies |

### Anomaly Rule Template
```yaml
name: "User Login Time Anomaly"
description: "User logging in at unusual time based on historical patterns"
severity: medium
detection:
  model: seasonal_decomposition
  entity: user
  metric: login_timestamp_hour
  baseline:
    window: 30  # days
    min_samples: 10
  threshold:
    z_score: 3
    p_value: 0.01
  filters:
    - field: "user"
      not_in: ["svc-*"]  # exclude service accounts
    - field: "is_vpn"
      value: true
```

## Watchlists

### Watchlist Types
| Type | Purpose | Data Sources |
|------|---------|--------------|
| IP Watchlist | Known bad IPs for matching | Threat intel, internal blocklist |
| User Watchlist | High-risk users for extra monitoring | HR offboarding, PIP, privileged users |
| Asset Watchlist | Critical assets requiring elevated monitoring | CMDB, asset criticality |
| Domain Watchlist | Suspicious domains for DNS monitoring | Threat intel, typo-squatting detection |
| Hash Watchlist | Known malware hashes | Threat intel, sandbox results |
| Behavioral Watchlist | Unusual pattern baseline | UEBA, historical analytics |

### Watchlist Rule Integration
```yaml
name: "User Watchlist Activity"
description: "Alert on watchlisted user activity"
severity: high
detection:
  watchlist: "high_risk_users"
  conditions:
    - source: windows_security
      event_id: 4688  # Process creation
      alert_on_any: true
    - source: vpn_logs
      event: "VPN_Connect"
      field: "username"
      watchlist_field: "user"
  escalation:
    notify_manager: true
    priority_boost: 2
```

## Rule Lifecycle Management

### Rule States
| State | Description | Transition |
|-------|-------------|------------|
| Draft | Being developed | Draft → Test |
| Test | Running in test mode | Test → Review or Draft |
| Review | Peer review pending | Review → Production or Draft |
| Production | Active and alerting | Production → Tuning or Deprecation |
| Tuning | Being adjusted for volume/FPs | Tuning → Production or Deprecation |
| Deprecated | No longer in use | Deprecated → (archived) |

### Rule Documentation Template
```yaml
name: "Rule Name"
id: "RUL-001"
author: "Detection Engineering"
created: "2026-05-20"
updated: "2026-05-20"
version: "1.2.0"

description: "Detailed description of what this rule detects"

rationale: "Why this rule exists, what threat it addresses"

logic: "Step-by-step detection logic explanation"

mitre_attack:
  - tactic: "Tactic Name"
    technique_id: "T1234.001"
    technique_name: "Technique Name"

data_sources:
  - "Windows Event Log 4688"
  - "Sysmon Event ID 1"

false_positives:
  - "IT admin running approved scripts"
  - "Backup software spawning processes"

validation:
  atomic_tests:
    - "Atomic Red Team T1234.001"
    - "Custom test script"

tuning_history:
  - date: "2026-04-01"
    change: "Added filter for backup software"
    fp_reduction: "40%"
  - date: "2026-05-15"
    change: "Reduced threshold from 5 to 3"
    sensitivity_increase: "25%"
```

## False Positive Analysis

### FP Triage Workflow
1. **Collect FP alert details**: Rule name, trigger events, entity affected
2. **Identify pattern**: Is FP recurring? Specific user/host/time?
3. **Root cause analysis**: Why did the rule trigger on benign activity?
4. **Apply fix**: Add filter, adjust threshold, modify logic
5. **Validate**: Test fix on historical FP data and recent production data
6. **Deploy**: Update rule in test → review → production
7. **Monitor**: Track FP rate change after deployment

### FP Rate Targets
| Rule Type | Target FP Rate | Action if Exceeded |
|-----------|---------------|-------------------|
| Critical | < 1% | Immediate review |
| High | < 5% | Tune within 48 hours |
| Medium | < 10% | Tune within 1 week |
| Low | < 20% | Review for deprecation |

## Detection Coverage Matrix
| MITRE Technique | Covered | Rule Count | Last Tested | Data Source |
|-----------------|---------|------------|-------------|-------------|
| T1003.001 (LSASS) | ✅ | 3 | 2026-05-15 | Sysmon 10 |
| T1059.001 (PowerShell) | ✅ | 5 | 2026-05-10 | Sysmon 1 |
| T1071.001 (Web C2) | ⚠ Partial | 2 | 2026-04-20 | Proxy logs |
| T1110 (Brute Force) | ✅ | 4 | 2026-05-18 | Auth logs |
| T1486 (Ransomware) | ⚠ Partial | 1 | 2026-03-01 | EDR alerts |
