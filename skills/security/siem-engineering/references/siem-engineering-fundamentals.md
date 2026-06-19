# SIEM Engineering Fundamentals

## Overview
Security Information and Event Management (SIEM) systems centralize log collection, normalization, correlation, alerting, and reporting for security monitoring. SIEM engineering involves designing, deploying, maintaining, and optimizing SIEM infrastructure to detect security threats and meet compliance requirements.

## Core Concepts

### Concept 1: SIEM Architecture Components
- **Log sources**: Firewalls, endpoints, servers, cloud services, applications, network devices
- **Log collectors/forwarders**: Agents (Winlogbeat, Filebeat, Splunk UF) that ship logs to SIEM
- **Central aggregator**: Collects and normalizes logs from all forwarders
- **Indexing & storage**: Searchable long-term storage (hot/warm/cold tiers)
- **Correlation engine**: Rules that detect suspicious patterns across multiple log sources
- **Alerting**: Triggers notifications when correlation rules match
- **Dashboards & reporting**: Visualizations and compliance reports
- **SOAR integration**: Automated response playbooks triggered by SIEM alerts

### Concept 2: SIEM Maturity Levels
| Level | Name | Characteristics |
|-------|------|----------------|
| 1 | Log Collection | Collecting logs, basic dashboards |
| 2 | Alerting | Rule-based alerts, manual triage |
| 3 | Correlation | Multi-source correlation, reduced false positives |
| 4 | Automation | SOAR integration, automated response, threat intelligence |
| 5 | Predictive | UEBA, ML-based detection, predictive analytics |

### Concept 3: Log Types & Sources
- **Authentication logs**: Windows Event ID 4624/4625, sshd logs, Okta sign-in events
- **Network logs**: Firewall allow/deny, proxy logs, DNS queries, netflow
- **Endpoint logs**: EDR alerts, process creation (4688), file changes, registry changes
- **Application logs**: Web server access logs, API gateway logs, database audit logs
- **Cloud logs**: AWS CloudTrail, Azure Activity Log, GCP Audit Logs
- **Email security**: Mail flow logs, phishing detection, DLP alerts

### Concept 4: Log Normalization
Raw logs vary by source; normalization extracts common fields:
- Timestamp (normalized to UTC)
- Source/Destination IP addresses
- Username and authentication method
- Event type/category
- Action (allow/deny/create/delete)
- Severity/priority
- Protocol and port

## Implementation Guide

### Step 1: Log Source Onboarding
```yaml
log_sources:
  - name: "Domain Controllers"
    type: "Windows Event Log"
    forwarder: "Winlogbeat"
    events:
      - 4624 (Successful Logon)
      - 4625 (Failed Logon)
      - 4672 (Admin Logon)
      - 4720 (User Created)
      - 4732 (Group Membership)
      - 4768 (Kerberos TGT)
      - 4769 (Kerberos Service Ticket)
    volume: ~50 GB/day

  - name: "Firewall (Fortinet)"
    type: "Syslog"
    collector: "Rsyslog" -> "Splunk UF"
    events:
      - Traffic logs (allow/deny)
      - Threat logs (IPS block)
      - VPN logs
    volume: ~150 GB/day

  - name: "AWS CloudTrail"
    type: "Cloud API"
    collector: "S3 -> Lambda -> SIEM"
    events:
      - ConsoleLogin
      - CreateUser
      - CreateAccessKey
      - AuthorizeSecurityGroupIngress
      - PutBucketPolicy
    volume: ~20 GB/day

  - name: "Office 365"
    type: "SaaS API"
    collector: "Office 365 Management API"
    events:
      - Sign-in events
      - Audit logs
      - DLP alerts
    volume: ~10 GB/day
```

### Step 2: Correlation Rules
```python
# Python-style pseudocode for SIEM correlation rules

def rule_brute_force_attempt():
    """Detect brute force: 10+ failed logins in 5 minutes from same IP."""
    return correlation(
        source="Windows Event Log:4625",
        aggregate="count(*)",  # Count failed logins
        group_by=["source_ip", "target_user"],
        filter={"event_id": 4625},
        window="5 minutes",
        threshold=10,
        severity="HIGH",
        response="Block IP at firewall + alert SOC",
    )

def rule_lateral_movement():
    """Detect lateral movement: anomalous admin login via non-admin tool."""
    return correlation(
        source="Windows Event Log:4624",
        condition=[
            "logon_type == 3",  # Network logon
            "account in privileged_group",
            "source_workstation not in admin_workstations",
            "target_workstation not in admin_workstations",
        ],
        window="1 hour",
        severity="CRITICAL",
        response="Isolate affected systems + alert SOC immediately",
    )

def rule_data_exfiltration():
    """Detect possible data exfiltration: large outbound transfer."""
    return correlation(
        source="Firewall Traffic Log",
        condition=[
            "bytes_out > 50000000",  # 50MB outbound
            "dest_ip not in trusted_external_domains",
        ],
        window="Real-time",
        severity="HIGH",
        response="Alert SOC + block outbound connection",
    )
```

### Step 3: Dashboard Example (Splunk)
```splunk
# Failed Logins by Source IP (last 24 hours)
index=windows EventCode=4625
| stats count by Source_Network_Address
| sort -count
| head 20

# Top Blocked Traffic
index=firewall action=block
| stats count by src_ip, dest_ip, dest_port
| sort -count
| head 20

# Admin Account Usage
index=windows EventCode=4672
| stats count by Account_Name, Computer_Name
| where count > 1
| sort -count
```

## Elastic Search Query Examples
```json
// Detect multiple failed logins from different IPs
{
  "query": {
    "bool": {
      "must": [
        {"term": {"event.code": "4625"}},
        {"range": {"@timestamp": {"gte": "now-5m"}}}
      ]
    }
  },
  "aggs": {
    "by_user": {
      "terms": {"field": "user.name"},
      "aggs": {
        "by_ip": {
          "terms": {"field": "source.ip"},
          "aggs": {
            "count": {"value_count": {"field": "_id"}}
          }
        }
      }
    }
  }
}
```

## Best Practices
- Start with the most critical log sources (auth, network, endpoint)
- Normalize logs to common schema for efficient searching
- Use log volume estimates to plan storage capacity
- Create use-case-driven correlation rules (not alerts for everything)
- Tune alert rules continuously to reduce false positives
- Implement log retention tiers (hot 30d, warm 90d, cold 1y, archive 3y+)
- Document each correlation rule's purpose and expected response
- Test correlation rules with known threat scenarios (atomic red team)
- Automate alert enrichment with threat intelligence and asset context
- Monitor SIEM health (agent connectivity, ingestion rate, storage)

## Common Pitfalls
- Collecting everything without use cases — overwhelming noise with no detection value
- Correlation rules too broad — massive false positives, alert fatigue
- Correlation rules too narrow — missing real attacks
- No log source validation — missing critical logs due to collection failures
- Under-provisioned storage — logs dropped during peak ingestion
- No alert triage process — alerts fire but nobody responds
- SIEM as the only monitoring tool — needs EDR, NDR, and other tools for defense in depth
- Not normalizing timestamps — distributed systems in different time zones
- Correlation rules not tested — false sense of security
- No threat intelligence integration — missing known IOCs

## Key Points
- SIEM centralizes logs, normalizes events, correlates patterns, and alerts
- Maturity: Collect → Alert → Correlate → Automate → Predict
- Prioritize critical log sources: auth, network, endpoint, cloud, email
- Write correlation rules with clear use cases — fewer, better rules
- Tune alerts continuously to reduce false positives
- Retain logs per compliance requirements (hot/warm/cold/archive)
- Integrate threat intelligence for IOC matching
- Monitor SIEM health and log source connectivity
- Automation and SOAR integration reduce response time
- SIEM is one layer in defense-in-depth — not a complete solution
