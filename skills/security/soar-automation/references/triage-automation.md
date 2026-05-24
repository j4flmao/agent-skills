# Automated Triage

## Triage Pipeline

```
Raw Alert → Normalize → Enrich → Score → Classify → Route → Action
                                               ↓
                                         Auto-Contain?
                                           Yes → Contain
                                           No → Escalate
```

### Pipeline Components
| Stage | Description | Tools |
|-------|-------------|-------|
| Normalize | Parse alert into standard JSON schema | Custom parser, CIM normalization |
| Enrich | Add context from external sources | VT, AbuseIPDB, Shodan, AD, CMDB |
| Score | Calculate threat score 0-100 | Weighted scoring engine |
| Classify | Assign category and priority | ML classifier, rule-based |
| Route | Determine next action | Decision tree, playbook router |
| Action | Execute response or escalate | SOAR playbook execution |

## Enrichment Orchestration

### Parallel Enrichment Pattern
```yaml
- id: enrichment_phase
  type: parallel
  timeout: 30
  on_partial_failure: continue
  branches:
    - id: vt_ip_check
      connector: virustotal
      action: check_ip
      input:
        ip: "{{ alert.source_ip }}"
    - id: abuse_check
      connector: abuseipdb
      action: check_ip
      input:
        ip: "{{ alert.source_ip }}"
    - id: shodan_check
      connector: shodan
      action: lookup_ip
      input:
        ip: "{{ alert.source_ip }}"
    - id: geoip_check
      connector: maxmind
      action: geolocate
      input:
        ip: "{{ alert.source_ip }}"
    - id: ad_user_lookup
      connector: active_directory
      action: get_user
      input:
        username: "{{ alert.username }}"
```

### Enrichment Data Model
```json
{
  "alert_id": "ALERT-2026-0042",
  "enrichments": {
    "virustotal": {
      "detection_ratio": "12/70",
      "malicious": true,
      "categories": ["malware", "c2"],
      "last_analysis_date": "2026-05-20"
    },
    "abuseipdb": {
      "abuse_confidence_score": 85,
      "total_reports": 23,
      "last_reported": "2026-05-19",
      "categories": ["brute_force", "web_attack"]
    },
    "shodan": {
      "open_ports": [22, 80, 443, 8080],
      "services": ["ssh", "http", "nginx"],
      "hostname": "hosting-provider.example.com"
    },
    "geoip": {
      "country": "RU",
      "city": "Moscow",
      "isp": "SomeHostingProvider",
      "is_vpn": true,
      "is_datacenter": true
    },
    "active_directory": {
      "user_exists": true,
      "department": "Finance",
      "manager": "mgr@company.com",
      "account_enabled": true,
      "last_logon": "2026-05-20T09:15:00Z",
      "risk_score": 30
    }
  }
}
```

### Enrichment Timing Budget
| Enrichment Step | Time Budget | Priority |
|----------------|-------------|----------|
| Reputation lookup (VT, AbuseIPDB) | 5 sec | Critical |
| GeoIP lookup | 1 sec | High |
| AD user lookup | 3 sec | High |
| CMDB asset lookup | 3 sec | High |
| Sandbox analysis | 5-10 min | Low (deferred) |
| Deep threat intel | 10-30 min | Low (deferred) |

## IOC Checking

### IOC Types and Sources
| IOC Type | Primary Check | Secondary Check | Tertiary Check |
|----------|---------------|-----------------|----------------|
| IP Address | VirusTotal | AbuseIPDB | GreyNoise |
| Domain | VirusTotal | PassiveTotal | URLScan.io |
| URL | URLScan.io | VirusTotal | PhishTank |
| File Hash | VirusTotal | Hybrid Analysis | MalwareBazaar |
| Email | Hunter.io | HaveIBeenPwned | DeHashed |
| Hostname | Passive DNS | RiskIQ | SecurityTrails |

### IOC Check Configuration
```yaml
ioc_check_rules:
  - type: ip_address
    sources:
      - name: virustotal
        weight: 40
        threshold: 5  # malicious detections
      - name: abuseipdb
        weight: 30
        threshold: 50  # confidence score
      - name: greynoise
        weight: 30
        threshold: "malicious"
    overall_threshold: 60  # weighted score

  - type: file_hash
    sources:
      - name: virustotal
        weight: 60
        threshold: 3
      - name: hybrid_analysis
        weight: 40
        threshold: "malicious"
    overall_threshold: 50
```

## User Context Lookup

### User Investigation Checks
| Check | Source | Purpose |
|-------|--------|---------|
| Identity verification | HR system, AD | Is this a real employee? |
| Department and role | AD, HR | Is the behavior expected for role? |
| Manager information | AD, HR | Who to notify for escalation |
| Recent activity | SIEM, VPN logs | Anomalous behavior detection |
| Privilege level | AD, PAM | Account sensitivity |
| Risk score | UEBA, IAM | Pre-calculated risk |
| Recent alerts | SIEM, SOAR | Pattern of behavior |

### User Context Response
```json
{
  "user": "jane.doe",
  "department": "Finance",
  "title": "Senior Accountant",
  "manager": "john.smith@company.com",
  "account_age_days": 1240,
  "last_password_change": "2026-03-15",
  "mfa_enabled": true,
  "risk_score": 85,
  "recent_alerts": [
    {"alert_id": "ALT-2026-0039", "rule": "impossible_travel", "timestamp": "2026-05-20T08:00:00Z"}
  ],
  "access_risk_factors": [
    "Sensitive data access (financial records)",
    "Privileged account (Finance Admin)",
    "Recent impossible travel alert"
  ]
}
```

## Initial Classification

### Classification Taxonomy
| Category | Subcategories | Priority |
|----------|--------------|----------|
| Malware | ransomware, trojan, worm, dropper, loader | Critical/High |
| Phishing | credential_phish, spear_phish, whaling, smishing | High |
| Network Attack | scan, brute_force, dos, mitm, dns_tunnel | Medium/High |
| Insider Threat | data_exfil, policy_violation, sabotage | Critical/High |
| Account Compromise | credential_stuff, session_hijack, lateral | Critical/High |
| Unauthorized Access | privilege_escalation, bypass, misuse | High |
| Policy Violation | p2p, torrent, proxy_abuse, gaming | Low/Medium |
| False Positive | verified_benign, test_alert, expected_behavior | Informational |

### Classification Logic
```yaml
classification_rules:
  - name: ransomware_classifier
    priority: 1
    conditions:
      - "alert.rule_name contains 'ransomware'"
      - "alert.severity == 'critical'"
      - "enrichments.file_scan.malicious == true"
    classification:
      category: "ransomware"
      severity: "critical"
      sla_minutes: 15

  - name: phishing_classifier
    priority: 2
    conditions:
      - "alert.category == 'phishing'"
      - "enrichments.url_reputation.malicious == true"
      - "enrichments.attachment_scan.malicious_probability > 0.7"
    classification:
      category: "phishing"
      severity: "high"
      sla_minutes: 30
```

## Automated Containment

### Containment Actions by Severity
| Severity | Containment Action | Automation | Approval Required |
|----------|-------------------|------------|------------------|
| Critical | Isolate endpoint | Automatic | No (notify only) |
| Critical | Block IP at firewall | Automatic | No (notify only) |
| High | Disable user account | Automatic | No (notify only) |
| High | Quarantine email | Automatic | No (notify only) |
| Medium | Add to watchlist | Automatic | No |
| Medium | Reset password | Semi-auto | Manager approval |
| Low | Create case | Automatic | No |

### Containment Playbook Example
```yaml
- id: auto_contain_critical
  type: action_bundle
  condition: "{{ classification.severity == 'critical' and classification.confidence > 80 }}"
  parallel: true
  actions:
    - connector: edr
      action: isolate_endpoint
      input:
        hostname: "{{ alert.hostname }}"
        comment: "Auto-isolated by triage playbook - {{ alert.rule_name }}"
    - connector: firewall
      action: create_block_rule
      input:
        ip: "{{ enrichment.source_ip }}"
        duration_hours: 24
        reason: "Triage automation - malicious IP"
    - connector: iam
      action: disable_account
      input:
        username: "{{ alert.username }}"
        reason: "Account compromise detected - triage automation"
  notify:
    - channel: slack
      webhook: "{{ env.slack_soc_channel }}"
      message: "Critical auto-containment: {{ alert.rule_name }} on {{ alert.hostname }}"
```

## Triage Decision Matrix

| Enrichment Score | User Risk | Asset Criticality | Action |
|-----------------|-----------|-------------------|--------|
| 80-100 | High | Critical | Auto-contain, notify SOC, create case |
| 80-100 | High | Standard | Auto-contain, create case |
| 80-100 | Low | Critical | Auto-contain, notify SOC |
| 80-100 | Low | Standard | Auto-contain, create case |
| 50-79 | High | Critical | Escalate to T2, create case |
| 50-79 | High | Standard | Escalate to T2, create case |
| 50-79 | Low | Critical | Escalate to T2, create case |
| 50-79 | Low | Standard | Create case, add to watchlist |
| 0-49 | Any | Any | Create low-priority case, close if benign |

## Performance Tuning
| Metric | Target | Action if Below |
|--------|--------|-----------------|
| % alerts auto-contained | > 30% | Add auto-contain rules for common scenarios |
| % alerts auto-classified | > 80% | Improve classification rules |
| Mean enrichment time | < 10 sec | Optimize parallel execution |
| False classification rate | < 5% | Review classification thresholds |
| Escalation accuracy | > 90% | Triage rule tuning |
