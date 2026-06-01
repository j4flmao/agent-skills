---
name: siem-engineering
description: >
  Design SIEM architecture, onboard log sources, create correlation rules, manage use cases, and tune detection.
  Use when the user asks about SIEM, Splunk, Wazuh, Elastic Security, Microsoft Sentinel, log source, correlation rule, or SIEM use case.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, siem, phase-8]
---

# SIEM Engineering

## Purpose
Design and maintain SIEM infrastructure, onboard log sources, develop correlation rules, manage detection use cases, and tune for false positive reduction. This skill covers architecture decisions, ingestion pipeline design, correlation rule development, use case management, performance optimization, and cost control.

## Agent Protocol

### Trigger
- "SIEM", "Splunk", "Elastic Security", "Wazuh", "Microsoft Sentinel", "QRadar"
- "log source", "log onboarding", "syslog", "Windows Event Log", "log collector"
- "correlation rule", "detection rule", "SIEM use case", "use case management"
- "false positive", "SIEM tuning", "alert suppression", "SIEM optimization"
- "log retention", "SIEM architecture", "log ingestion", "index strategy"

### Input Context
- SIEM platform (Splunk, Elastic, Sentinel, Wazuh, QRadar) and licensing model
- Data sources: cloud audit logs, endpoint logs, network flows, application logs
- Ingestion volume: daily log volume (GB/day), peak ingestion rate, retention requirements
- Compliance requirements: retention periods, data sovereignty, chain of custody
- Existing detection rules and false positive rate

### Output Artifact
SIEM architecture with ingestion pipeline, correlation rule definitions, use case backlog, and tuning recommendations.

### Response Format
```
## Architecture
{SIEM components, data flow, ingestion pipeline, sizing}

## Rules
{Correlation rules with logic, severity, response}

## Use Cases
{Priority-ordered detection use cases with MITRE ATT&CK mapping}

## Tuning
{False positive reduction plan, suppression rules, performance optimization}
```

### Completion Criteria
- [ ] SIEM architecture designed with ingestion pipeline and sizing
- [ ] Log sources identified with onboarding priority and method
- [ ] Correlation rules defined for key use cases with testing strategy
- [ ] Use case coverage mapped to MITRE ATT&CK
- [ ] Tuning strategy documented for FP reduction
- [ ] Cost optimization plan (storage tiers, indexing strategy)

## Architecture / Decision Trees

### SIEM Platform Selection Decision Tree

```
What is the primary deployment model?
├── Cloud-native SaaS
│   ├── Microsoft shop (Azure, M365) → Microsoft Sentinel
│   ├── AWS shop → Splunk Cloud or ELK on Elastic Cloud
│   ├── Multi-cloud → Splunk Cloud (broadest integration)
│   └── Budget-conscious → Wazuh (free, open-source)
├── On-premises / air-gapped
│   ├── Mature SOC team → Splunk Enterprise
│   ├── Elastic stack already in use → Elastic Security
│   ├── Small team, limited budget → Wazuh
│   └── Legacy compliance → QRadar or ArcSight
└── Hybrid (some on-prem, some cloud)
    ├── Need single pane → Splunk (universal forwarding, HEC)
    └── Cloud-first → Elastic Agent → Elastic Cloud

What is the daily ingestion volume?
├── < 50 GB/day → Wazuh or Elastic (free tier OK)
├── 50-500 GB/day → Elastic (cost-effective) or Sentinel (log analytics)
├── 500 GB-5 TB/day → Splunk (mature) or Sentinel (competitive pricing)
└── > 5 TB/day → Splunk (tested at scale) or custom pipeline (Kafka + Elastic)
```

### Log Source Onboarding Priority

```
Tier 1 (Day 1-7): Must-have for baseline detection
├── Authentication: AD/LDAP, Okta, Azure AD, VPN
├── Endpoint: EDR (CrowdStrike, Defender, SentinelOne), Windows Event Logs
├── Network: Firewall, DNS, Proxy, IDS/IPS
├── Cloud: CloudTrail (AWS), Activity Logs (Azure), Audit Logs (GCP)
└── Email: M365 Exchange, Proofpoint, Mimecast

Tier 2 (Week 2-4): Detect common attack patterns
├── Application: Web server (IIS, Nginx, Apache), API gateway
├── Database: SQL Server, PostgreSQL, MySQL audit logs
├── Container: K8s audit logs, Docker events
├── SaaS: Salesforce, Slack, GitHub audit logs
└── Vulnerability: Scanner results (Nessus, Qualys, Rapid7)

Tier 3 (Month 2-3): Advanced detection and forensics
├── Network: NetFlow, Zeek, packet captures
├── Identity: Azure AD sign-in logs, Privileged Identity Management
├── OT/IoT: PLC logs, SCADA events
├── Physical: Badge access, CCTV metadata
└── Threat intel feeds: MISP, AlienVault OTX, commercial feeds

Tier 4 (Ongoing): Continuous improvement
├── New applications as deployed
├── New cloud services as adopted
├── Custom application logs for business logic abuse
└── Threat intelligence enrichment feeds
```

### Ingestion Method Decision Tree

```
Does the source support syslog?
├── Yes → syslog-ng/rsyslog → SIEM (preferred for network devices)
└── No → Is there a native collector?
    ├── Yes → Use native agent (Splunk UF, Elastic Agent, Wazuh agent)
    └── No → Can we use API-based ingestion?
        ├── Yes → REST API → SIEM (cloud services, SaaS)
        └── No → Custom parser (Logstash, Fluentd, custom script)
```

## Workflow

### Step 1: SIEM Architecture Design

**Splunk Reference Architecture:**
```
Data Sources → Universal Forwarders → Heavy Forwarders → Indexers → Search Heads
                                        ↓
                                   License Master
```

Components: Universal Forwarder (UF) — lightweight, sends data to indexers. Heavy Forwarder (HF) — parses, routes, filters before indexing. Indexer — stores and indexes data, searchable. Search Head — distributed search across indexers, knowledge objects. License Master — manages license usage. Deployment Server — manages UF configurations. Cluster Master — manages indexer cluster.

**Elastic Security Reference Architecture:**
```
Data Sources → Elastic Agent/Fleet → Logstash (optional) → Elasticsearch → Kibana
                                        ↓
                                   Fleet Server
```

Components: Elastic Agent — single agent for logs, metrics, and security data. Fleet Server — manages agent policies. Logstash — optional enrichment and transformation. Elasticsearch — storage and search. Kibana — visualization, SIEM app, detection rules.

**Microsoft Sentinel Architecture:**
```
Data Sources → Log Analytics Agent/AMA → Log Analytics Workspace → Sentinel
                    ↓
              Diagnostic Settings → Event Hub → Azure Functions
```

Components: Azure Monitor Agent (AMA) — collects logs from VMs. Diagnostic Settings — streams Azure resources. Data Connectors — SaaS integrations (M365, AWS, Okta). Log Analytics Workspace — storage and querying. Sentinel — analytics, automation, investigation.

### Step 2: Log Ingestion Pipeline

**Normalization and Parsing:**
```json
// Normalized event schema (ECS - Elastic Common Schema)
{
  "@timestamp": "2026-06-01T14:30:00Z",
  "event": {
    "kind": "event",
    "category": "authentication",
    "type": ["start"],
    "outcome": "success",
    "action": "user_login"
  },
  "user": {
    "id": "user-123",
    "name": "jdoe",
    "email": "jdoe@example.com",
    "roles": ["admin"]
  },
  "source": {
    "ip": "203.0.113.50",
    "geo": {
      "country_name": "US",
      "city_name": "New York"
    }
  },
  "destination": {
    "ip": "10.0.1.50",
    "port": 443,
    "service": "vpn.example.com"
  },
  "related": {
    "ip": ["203.0.113.50", "10.0.1.50"],
    "user": ["jdoe"]
  }
}
```

**Splunk parsing (props.conf & transforms.conf):**
```properties
# props.conf - source type configuration
[source::/var/log/auth.log]
TIME_PREFIX = ^
TIME_FORMAT = %b %e %H:%M:%S
MAX_TIMESTAMP_LOOKAHEAD = 15
TRANSFORMS-fingerprint = add_fingerprint

[sourcetype::aws:cloudtrail]
KV_MODE = json
TIMESTAMP_FIELDS = eventTime
TIME_FORMAT = %Y-%m-%dT%H:%M:%SZ
EXTRACT-disabled = disabled

# transforms.conf - field extraction
[add_fingerprint]
REGEX = (.)
FORMAT = fingerprint::sha256($1)
WRITE_META = true
```

**Logstash pipeline (Elastic):**
```ruby
input {
  beats {
    port => 5044
    ssl => true
    ssl_certificate_authorities => ["/etc/logstash/ca.crt"]
  }
  kafka {
    bootstrap_servers => "kafka:9092"
    topics => ["security-logs"]
    consumer_threads => 4
    codec => json
  }
}

filter {
  # Parse timestamp
  date {
    match => ["timestamp", "ISO8601", "UNIX_MS"]
    target => "@timestamp"
  }

  # GeoIP enrichment
  geoip {
    source => "[source][ip]"
    target => "[source][geo]"
    database => "/etc/logstash/GeoLite2-City.mmdb"
  }

  # Remove PII fields before indexing
  mutate {
    remove_field => ["[user][password]", "[headers][authorization]"]
  }

  # Add constant fields
  mutate {
    add_field => {
      "[event][ingested]" => "%{[@timestamp]}"
      "[labels][environment]" => "production"
    }
  }
}

output {
  elasticsearch {
    hosts => ["https://elasticsearch:9200"]
    index => "security-logs-%{+yyyy.MM.dd}"
    ssl => true
    cacert => "/etc/logstash/ca.crt"
    user => "${ES_USER}"
    password => "${ES_PASSWORD}"
    ilm_enabled => true
    ilm_rollover_alias => "security-logs"
    ilm_policy => "security-logs-policy"
  }
}
```

### Step 3: Correlation Rules Design

**Correlation Rule Patterns:**

```spl
# Splunk - Lateral movement detection
index=windows EventCode=4624 (LogonType=3 OR LogonType=10)
| where AuthenticationPackageName="NTLM"
| stats count by AccountName, WorkstationName, Source_Network_Address
| where count > 3
| eval severity="high"
| eval mitre_technique="T1021.006"
| eval recommendation="Investigate potential lateral movement via NTLM authentication"

# Splunk - Privilege escalation detection
index=windows EventCode=4672 (SpecialPrivileges="SeTakeOwnershipPrivilege" OR SpecialPrivileges="SeDebugPrivilege")
| search NOT AccountName="SYSTEM" NOT AccountName="Administrator"
| stats count by AccountName, ComputerName, SpecialPrivileges
| where count > 0
| eval severity="critical"
| eval mitre_technique="T1068"
```

```kql
// Microsoft Sentinel - Anomalous sign-in detection
let threshold = 3;
let timeWindow = 1h;
SigninLogs
| where TimeGenerated > ago(7d)
| where ResultType == "50057" // User account is disabled
  or ResultType == "50053" // Account locked
  or ResultType == "50126" // Invalid username or password
| make-series FailedCount=count() on TimeGenerated step timeWindow by UserPrincipalName
| extend series_decompose(FailedCount)
| mv-expand FailedCount to typeof(double), anomalies to typeof(double)
| where anomalies > threshold
| project UserPrincipalName, TimeGenerated, FailedCount, anomalies
| join kind=inner (IdentityInfo) on $left.UserPrincipalName == $right.AccountUPN
```

```kql
// Microsoft Sentinel - Multi-stage attack detection
let timeWindow = 10m;
// Stage 1: Reconnaissance
let recon = (
  SigninLogs
  | where TimeGenerated > ago(timeWindow)
  | where ResultType == "50053" or ResultType == "50126"
  | summarize ReconAttempts=count() by UserPrincipalName, SourceIPAddress
  | where ReconAttempts > 5
);
// Stage 2: Successful login from same IP
let success = (
  SigninLogs
  | where TimeGenerated > ago(timeWindow)
  | where ResultType == "0"
  | summarize SuccessfulLogins=count() by UserPrincipalName, SourceIPAddress
);
// Correlate: recon IP then success
recon
| join kind=inner success on SourceIPAddress, UserPrincipalName
| project UserPrincipalName, SourceIPAddress, ReconAttempts, SuccessfulLogins
| extend Severity = "high"
```

```yaml
# Wazuh correlation rule
<group name="linux_anomaly">
  <rule id="100001" level="12">
    <if_sid>550</if_sid>
    <field name="audit.key">user_login</field>
    <field name="user" type="pcre2">^(?!root|deploy|monitor)</field>
    <description>SSH login from unexpected user account</description>
    <mitre>
      <id>T1078</id>
    </mitre>
    <options>no_full_log</options>
    <group>authentication,</group>
  </rule>
</group>
```

**Rule severity classification:**
- CRITICAL: Active exploitation, data exfiltration, ransomware (respond immediately)
- HIGH: Lateral movement, privilege escalation, persistence (respond within 1 hour)
- MEDIUM: Reconnaissance, policy violation, anomalous behavior (investigate same day)
- LOW: Failed logins, out of hours access, informational (triage within 24h)
- INFO: Baseline deviations, trend alerts (log for reporting)

### Step 4: Use Case Management

**Use Case Lifecycle:**
1. **Triage**: Identify detection gap from threat model, incident, or threat intel
2. **Design**: Write rule logic, define data sources, set thresholds
3. **Test**: Run against historical data, verify true positive rate
4. **Tune**: Adjust thresholds, add exclusions, reduce noise
5. **Deploy**: Enable in production, set severity, assign response
6. **Review**: Monthly effectiveness review, FP rate, value assessment
7. **Retire**: Remove if no longer relevant (deprecated technique, false positive > 90%)

**Use Case Examples:**

| Priority | Use Case | Data Sources | ATT&CK | Rule Type |
|----------|----------|-------------|--------|-----------|
| P1 | Ransomware file encryption | EDR, File Server | T1486 | Behavioral |
| P1 | Lateral movement via RDP | Windows Event 4624 | T1021.001 | Statistical |
| P1 | Data exfiltration to unusual domain | DNS, Proxy | T1048 | Threshold |
| P2 | PowerShell with encoded command | Windows Event 4104 | T1059.001 | Signature |
| P2 | Service account interactive login | Windows Event 4624 | T1078 | Anomaly |
| P2 | New user added to admin group | Windows Event 4732 | T1098 | Signature |
| P3 | Login from unusual geo | AAD Sign-in, VPN | T1078 | Statistical |
| P3 | Out-of-hours access | Windows Event 4624 | T1078 | Time-based |
| P3 | Failed logins on privileged account | Windows Event 4625 | T1110 | Threshold |

**MITRE ATT&CK Coverage Matrix:**
```yaml
coverage_matrix:
  initial_access:
    total: 14
    covered: 7
    gaps: [T1189, T1190, T1195, T1197, T1199, T1200, T1566]
    priority: [T1566 (phishing), T1190 (exploit public-facing)]
  execution:
    total: 18
    covered: 9
    gaps: [T1053, T1059, T1072, T1106, T1129, T1204, T1559, T1569, T1648]
    priority: [T1059 (command/scripting), T1204 (user execution)]
  persistence:
    total: 22
    covered: 10
    gaps: [T1098, T1136, T1137, T1505, T1525, T1543, T1546, T1547, T1548, T1554, T1574, T1611]
    priority: [T1547 (boot/logon autostart), T1098 (account manipulation)]
  defense_evasion:
    total: 28
    covered: 14
    priority: [T1562 (impair defenses), T1070 (indicator removal)]
  credential_access:
    total: 11
    covered: 5
    priority: [T1003 (OS credential dumping), T1056 (input capture)]
  discovery:
    total: 20
    covered: 10
    priority: [T1087 (account discovery), T1069 (permission discovery)]
  lateral_movement:
    total: 13
    covered: 6
    priority: [T1021 (remote services), T1550 (use alternate auth)]
  collection:
    total: 10
    covered: 4
    priority: [T1005 (data from local system), T1074 (data staged)]
  c2:
    total: 17
    covered: 8
    priority: [T1071 (application layer protocol), T1572 (protocol tunneling)]
  exfiltration:
    total: 9
    covered: 4
    priority: [T1048 (exfiltration over alt protocol), T1567 (exfiltration over web)]
```

### Step 5: Tuning and False Positive Reduction

**Tuning Methodology:**

1. **Measure FP rate per rule**: `FP / (TP + FP) * 100`. Target: < 10% for high severity, < 20% for medium, < 50% for low
2. **Analyze FPs**: Common causes — misconfigured applications, legitimate admin activity, scheduled tasks, monitoring tools, backup software, security scanners
3. **Tune threshold**: Increase count threshold, extend time window, add environment filter (exclude known-good subnets)
4. **Add exclusion**: Known-good: security scanners (nessus, qualys), admin tools (ansible, puppet, salt), backup agents (veam, commvault), monitoring agents (datadog, new relic)
5. **Simplify rule**: Overly complex correlation rules with multiple conditions have higher FP rates. Start simple, add conditions only when needed
6. **Retest**: Run against 7 days of historical data to verify FP reduction

**Suppression Rules (Splunk):**
```spl
index=windows EventCode=4625 LogonType=3
| search NOT AccountName IN ("Nessus$", "Qualys$", "Ansible$", "Backup$")
| search NOT Source_Network_Address IN ("10.100.0.0/16", "192.168.200.0/24")
| search NOT ComputerName IN ("SCANNER-01", "SCANNER-02")
```

**Elastic detection rule exception:**
```json
{
  "rule_id": "anomalous-login-001",
  "exceptions_list": [
    {
      "type": "simple",
      "conditions": [
        {
          "field": "source.ip",
          "operator": "not_in",
          "value": ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
        },
        {
          "field": "user.name",
          "operator": "not_in",
          "value": ["splunk-system", "nessus-scan", "monitor-bot"]
        }
      ]
    }
  ]
}
```

**OEM (Optimization and Event Management) process:**
- Weekly: review top 10 noisiest rules by alert volume
- Bi-weekly: tune rules with > 20% FP rate
- Monthly: full use case review, retire low-value rules
- Quarterly: MITRE coverage gap analysis, new use case creation

### Step 6: Performance and Cost Optimization

**Indexing Strategy:**

| Data Type | Retention Hot | Retention Warm | Retention Cold | Archive | Notes |
|-----------|--------------|----------------|----------------|---------|-------|
| Authentication logs | 7 days | 30 days | 90 days | 1 year | High volume, important for investigations |
| Endpoint logs (EDR) | 14 days | 60 days | 180 days | 2 years | High value for incident response |
| Network logs | 7 days | 30 days | 90 days | 1 year | Medium volume, good for lateral movement |
| Cloud audit logs | 14 days | 60 days | 180 days | 3 years | Compliance requirement |
| Application logs | 3 days | 14 days | 30 days | 90 days | Use case dependent, often low value |
| DNS logs | 7 days | 30 days | 90 days | 1 year | High value for C2 detection |
| Threat intel feeds | N/A | Live | 7 days | 30 days | Keep fresh, refresh daily |

**Cost Saving Strategies:**
- Separate retention tiers: hot (fast search), warm (standard), cold (cheap storage), archive (S3/Blob)
- Drop low-value fields before indexing: user-agent, referrer, debug output
- Aggregate before indexing: summarize repetitive events (e.g., 100 failed logins → single event with count)
- Use sampling for high-volume, low-value sources: 1:10 sample for firewall allow logs
- Archive cold data to S3/GCS/Azure Blob with search-back capability
- Scheduled search summarization: create summary indexes for common queries

**Splunk Sizing Guide:**
```
Daily Volume → Indexers → Search Heads → Storage (Hot + Cold)
100 GB/day  → 2-3 indexers → 1 search head → 3.6 TB hot + 9 TB cold (90 day retention)
500 GB/day  → 6-8 indexers → 2 search heads → 18 TB hot + 45 TB cold
1 TB/day    → 10-12 indexers → 3 search heads → 36 TB hot + 90 TB cold
5 TB/day    → 30-40 indexers → 6-8 search heads → 180 TB hot + 450 TB cold
```

### Step 7: Incident Detection and Response Integration

**Alert to Incident Pipeline:**
```
Raw Log → Parse & Normalize → Enrich (GeoIP, threat intel) → Correlation Rule → Alert
                                                                                    ↓
                                                                           Deduplication & Aggregation
                                                                                    ↓
                                                                              Severity Assignment
                                                                                    ↓
                                                                              Incident Creation
                                                                                    ↓
                                                                         SOC Tier 1 Triage
                                                                                    ↓
                                                                       True Positive → Tier 2 Investigation
                                                                              ↓
                                                                        Escalate or Close
```

**SIEM-SOAR Integration:**
- Alert enrichment: query threat intel (VirusTotal, AlienVault), check asset criticality (CMDB), correlate with EDR alerts
- Automated response: isolate endpoint, block IP on firewall, disable compromised account
- Case management: create ticket, assign analyst, track SLA, document findings
- Feedback loop: analyst verdict → SIEM rule tuning → improved detection

**Incident Response Data Sources:**
```spl
index=windows EventCode=4688 CommandLine=*          // Process creation - track execution
index=windows EventCode=4103 EventLog=PowerShell*    // PowerShell pipeline execution
index=windows EventCode=5156                          // Windows Firewall - network connections
index=windows EventCode=4648                           // Explicit credential usage
index=windows EventCode=4698 EventLog=Security        // Scheduled task creation
index=syslog sourcetype=fortigate                     // FW logs - network connections
```

### Step 8: Compliance and Audit Readiness

**Log Retention Requirements:**

| Regulation | Retention Requirement | Special Requirements |
|------------|----------------------|---------------------|
| PCI DSS 4.0 | 12 months (7 years for audit trails) | Chronological ordering, cannot be altered |
| SOC 2 | Policy-defined minimum (typically 90 days) | Access control, tamper detection |
| HIPAA | 6 years | Access log review every 3 months |
| GDPR | Duration of processing | Right to erasure, data minimization |
| SOX | 7 years | Financial system logs |
| NIST 800-53 | 1 year minimum, 3 years for critical | Offline backup, chain of custody |

**Audit-Readiness Checklist:**
- [ ] All data sources have documented log generation and retention
- [ ] Log review process documented and followed
- [ ] Access to SIEM logged and audited
- [ ] Change management for correlation rules documented
- [ ] Chain of custody maintained for forensic data
- [ ] Backup and recovery tested quarterly
- [ ] Data sovereignty requirements met (in-region storage)

## Common Pitfalls

### Pitfall 1: Ingestion Before Architecture
Onboarding log sources without designing the architecture leads to indexer imbalance, search performance degradation, and cost overruns. Design architecture first: plan indexer cluster sizing, storage tiers, and retention policies before onboarding.

### Pitfall 2: Everything at Maximum Log Level
Sending debug/trace logs to SIEM at 10x volume creates cost and noise. Use error/warn level for production security logs. Enable verbose only for specific use cases with separate retention.

### Pitfall 3: Alert Fatigue from Untuned Rules
Deploying rules without tuning generates thousands of alerts that overwhelm SOC analysts. Rules must be tuned against historical data. Set FP targets: P1 rules < 5% FP, P2 rules < 10% FP, P3 rules < 20% FP.

### Pitfall 4: No Correlation Across Data Sources
Single-source rules miss multi-stage attacks (phishing → credential theft → lateral movement). Cross-source correlation detects the attack chain. Use threat intelligence to link seemingly unrelated events.

### Pitfall 5: Ignoring Compliance Retention Requirements
Storing all logs with the same retention policy is either insufficient (compliance failure) or excessive (cost overrun). Map retention to data source compliance requirements. Implement tiered storage.

### Pitfall 6: No Monitoring of SIEM Health
SIEM that is down, overloaded, or missing data sources is a security blind spot. Monitor: ingestion rate vs expected, license usage, indexer CPU/disk, search head response time, agent health.

### Pitfall 7: Over-Normalization
Heavy normalization breaks original log context. Keep raw log copy alongside normalized fields. Use field aliases instead of overwriting. Maintain backward compatibility for existing dashboards.

### Pitfall 8: Underestimating Storage Growth
Log volume grows 20-50% annually from new sources, increased verbosity, and data retention requirements. Over-provision by 50% minimum. Plan for storage scaling. Use compression and sampling.

### Pitfall 9: Complex Correlation Rules Too Early
Rules with 5+ conditions, multiple lookups, and subsearches are hard to troubleshoot and slow to execute. Start with single-condition rules. Add complexity only when needed. Test each incremental change.

### Pitfall 10: No Use Case Lifecycle Management
Rules deployed and never reviewed accumulate noise. Quarterly use case review: retire low-value rules, tune high-FP rules, add new use cases from threat intelligence and incident findings.

## Best Practices

- Design architecture before onboarding — indexer sizing, retention tiers, storage planning
- Normalize to ECS (Elastic), CIM (Splunk), or ASIM (Sentinel) for cross-source correlation
- Start with simple correlation rules (1-2 conditions), add complexity validated against historical data
- Map every use case to MITRE ATT&CK for coverage measurement and gap analysis
- Set false positive targets: CRITICAL < 5%, HIGH < 10%, MEDIUM < 20%, LOW < 50%
- Implement tiered storage: hot (fast search, 7-14 days), warm (30-90 days), cold (archive, queryable)
- Monitor SIEM health: ingestion volume, license usage, search performance, agent coverage
- Use case lifecycle: propose → test → deploy → tune → review (quarterly) → retire
- Test correlation rules against historical data before production deployment
- Automate enrichment with geoIP, asset DB, threat intel feeds (reduces analyst investigation time 40-60%)
- Onboard log sources in priority order: authentication → endpoint → network → cloud → application
- Implement chain of custody for forensic data: immutable logs, access audit, integrity verification
- Plan for 30-50% annual log volume growth in capacity planning
- Document runbooks for every detection use case: triage steps, investigation queries, response actions

## SIEM Platform Comparison

| Feature | Splunk | Elastic Security | Microsoft Sentinel | Wazuh | QRadar |
|---------|--------|-----------------|-------------------|-------|--------|
| Deployment | Cloud, on-prem, hybrid | Cloud, on-prem | Cloud-only | On-prem, cloud | On-prem, cloud |
| Licensing | Per GB ingested | Per GB + features | Per GB (Azure LA) | Free (OSS) | Per EPS + flow |
| Ingestion | UF, HEC, TCP/UDP | Elastic Agent, Beats, Logstash | AMA, Data Connectors | Wazuh Agent | WinCollect, Syslog |
| Query language | SPL | EQL, KQL, Lucene | KQL | Rules XML | AQL |
| Correlation | SPL subsearch, lookup, stats | EQL rules, ML jobs | Analytics rules, KQL | Decoder + rules | Rule engine |
| ML/Analytics | ML Toolkit | Built-in ML jobs | UEBA, ML rules | Limited | User Behavior Analytics |
| SOAR | Splunk SOAR (separate) | Cases, Actions | Built-in (Logic Apps) | Limited | IBM SOAR (separate) |
| Price (1TB/day) | ~$1.5M/year | ~$300K/year | ~$200K/year | Free + infra | ~$500K/year |
| Best for | Enterprise, compliance-focused | Cost-effective, already on Elastic | Microsoft ecosystem | Budget, small teams | Enterprise on-prem |

## SIEM Maturity Model

| Level | Characteristics | Practices |
|-------|----------------|-----------|
| 1: Initial | Ad-hoc log collection | Scattered log sources, no normalization, manual investigation |
| 2: Defined | Structured log collection | CIM/ECS normalization, basic correlation rules, 50% log source coverage |
| 3: Managed | Proactive detection | MITRE mapping, use case lifecycle, tuning process, 80% log source coverage |
| 4: Measured | Advanced analytics | ML-based anomaly detection, user/entity behavior analytics, automated enrichment |
| 5: Optimized | Predictive defense | Threat intel integration, automated response, purple team validation, full coverage |

## Performance Considerations

- Indexer sizing: 500 GB/day per indexer core (Splunk), 250 GB/day per data node (Elastic)
- Search performance degrades when indexer CPU > 60% or hot storage > 75% full
- Use summary indexing for common queries: pre-aggregate hourly/daily statistics
- Schedule heavy searches during off-peak hours (evening, weekends)
- Limit real-time searches to critical use cases only — use scheduled searches for routine monitoring
- Use data model acceleration for faster pivot/search in large datasets
- Monitor search head CPU — oversubscribed search heads cause query timeouts

## Rules

- Every log source must have documented source type (Splunk), data stream (Elastic), or table (Sentinel)
- Correlation rules must be tested against historical data before production deployment
- False positive rate must be measured per rule — target < 10% for high severity
- Ingestion sources must be monitored for data interruption — alert if expected volume drops > 20%
- Log retention must comply with regulatory requirements per data type
- All SIEM administrative access must be logged and audited
- No production rule changes without change control documentation
- Use case lifecycle: propose → test (7 days) → deploy → review (quarterly) → retire
- Indexer storage must not exceed 75% capacity — add capacity at 60% threshold
- Security events must be correlated with at least one other data source for validation
- Raw logs must be preserved alongside normalized fields for forensic integrity
- SIEM rule changes must be version-controlled (XML/YAML in git)
- Weekly review of top 10 noisiest rules for FP reduction

## References
  - references/correlation-rules.md — SIEM Correlation Rules
  - references/detection-content.md — Detection Content Creation
  - references/log-sources-ingestion.md — Log Source Ingestion
  - references/siem-architecture.md — SIEM Architecture
  - references/siem-engineering-advanced.md — Siem Engineering Advanced Topics
  - references/siem-engineering-fundamentals.md — Siem Engineering Fundamentals
  - references/siem-tuning.md — SIEM Tuning
## Handoff
Use cases feed into soc-operations for triage workflows. Rules can be automated via soar-automation.
