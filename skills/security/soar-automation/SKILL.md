---
name: soar-automation
description: >
  Automate security operations with SOAR playbooks, case management, enrichment pipelines, and response orchestration.
  Use when the user asks about SOAR, playbook, security automation, XSOAR, Splunk SOAR, Tines, or case management.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, soar, phase-8]
---

# SOAR Automation

## Purpose
Design and implement SOAR playbooks for automated incident response, case management, threat enrichment, and response orchestration. Reduce manual effort in SOC operations and accelerate response times through standardized automation.

## Agent Protocol

### Trigger
- "SOAR", "playbook", "security automation", "automated response", "XSOAR"
- "Splunk SOAR", "Palo Alto XSOAR", "Tines", "Shuffle", "Torq"
- "case management", "incident enrichment", "threat enrichment", "automated containment"
- "response orchestration", "playbook trigger", "playbook action"
- "automation workflow", "security workflow", "triage automation"

### Input Context
- SOAR platform (XSOAR, Splunk SOAR, Tines, Shuffle, Torq, custom)
- Existing tool stack: SIEM, EDR, firewall, email security, ticketing
- Automation scope: triage, enrichment, containment, notification, reporting
- Incident types: phishing, malware, unauthorized access, data exfiltration, DDoS
- Compliance requirements: evidence collection, chain of custody, audit trails

### Output Artifact
Playbook designs with triggers, conditions, actions, and error handling; case management templates; integration specifications.

### Response Format
```
## Automation Scope
{What will be automated, what stays manual, success criteria}

## Playbook
{Step-by-step workflow with triggers, conditions, actions, error handling}

## Integrations
{Connected tools, API endpoints, credentials, rate limits}
```

### Completion Criteria
- [ ] Playbooks designed for key incident types (phishing, malware, unauthorized access)
- [ ] Case management schema defined with mandatory fields
- [ ] Enrichment pipeline designed (threat intel, asset DB, geolocation)
- [ ] Manual vs automated decisions documented
- [ ] Error handling and fallback procedures defined
- [ ] Testing and validation strategy documented
- [ ] Playbook version control and change management established

## Architecture / Decision Trees

### SOAR Platform Selection Decision Tree

```
What is the primary use case?
├── Incident response automation (enterprise)
│   ├── Palo Alto ecosystem → Cortex XSOAR (best integration)
│   ├── Splunk shop → Splunk SOAR (native Splunk integration)
│   └── Multi-vendor → XSOAR (broadest connector library)
├── Phishing response (focused)
│   ├── M365 + Defender → Microsoft Sentinel SOAR (Logic Apps)
│   └── Need email gateway integration → Tines (Agari, Mimecast, Proofpoint)
├── IT ticket automation
│   └── ServiceNow + Jira → Tines or Torq (low-code, IT-focused)
└── Budget-conscious / open-source
    └── Shuffle (open-source, Python-based, free tier)

What automation skill level does the team have?
├── Low-code / no-code → Tines (visual builder), Torq (IT-friendly)
├── Python developers → XSOAR (extensive Python SDK), Splunk SOAR (Python/Phantom apps)
└── Custom / full control → Shuffle (open-source, fully customizable)

What is the scale of automation?
├── < 50 playbooks → Any platform
├── 50-200 playbooks → XSOAR or Splunk SOAR (mature lifecycle management)
└── > 200 playbooks → XSOAR (marketplace, content packs, multi-tenant)
```

### Automation Decision: Automate vs Manual

```
Is the action deterministic (same input = same output)?
├── YES → Automate
└── NO → Manual or semi-automated (human-in-the-loop)

Does the action require human judgment?
├── YES → Manual (present evidence for decision)
└── NO → Automate

Is the action time-sensitive (< 5 min response)?
├── YES → Automate with fallback
└── NO → Semi-automated (approval gate)

Does the action have high blast radius?
├── YES → Semi-automated (approval required)
├── Moderate → Automate with kill-switch
└── Low → Automate fully

Is the action reversible?
├── YES → Automate (can undo if mistaken)
└── NO → Manual (review required before action)
```

## Workflow

### Step 1: Automation Scoping and Prioritization

Identify automation candidates from incident frequency, manual effort, and impact:

```yaml
automation_candidates:
  phishing_email:
    frequency: "Daily (50-100)"
    manual_time: "30 min per incident"
    automation_potential: "80%"
    priority: "P1"
    description: "Auto-collect email, verify links, quarantine, notify user"

  malware_alert:
    frequency: "Daily (20-50)"
    manual_time: "45 min per incident"
    automation_potential: "70%"
    priority: "P1"
    description: "Isolate endpoint, collect artifacts, scan with sandbox"

  port_scan_detected:
    frequency: "Continuous (500+/day)"
    manual_time: "N/A (currently ignored)"
    automation_potential: "95%"
    priority: "P2"
    description: "Cross-correlate with threat intel, auto-block if malicious"

  compromised_account:
    frequency: "Weekly (5-10)"
    manual_time: "60 min per incident"
    automation_potential: "60%"
    priority: "P2"
    description: "Disable account, revoke sessions, check recent activity"

  data_exfiltration:
    frequency: "Monthly (1-3)"
    manual_time: "4+ hours"
    automation_potential: "50%"
    priority: "P1"
    description: "Block C2, isolate endpoints, preserve evidence"
```

### Step 2: Playbook Design Principles

**Playbook Structure (all platforms):**
```
Trigger → Data Enrichment → Decision → Action → Notification → Case Update
```

**Core playbook components:**
1. **Trigger**: Alert from SIEM, email, ticket, API webhook, schedule
2. **Data Collection**: Gather all relevant context (log extracts, asset info, user info)
3. **Enrichment**: Query threat intel (VirusTotal, MISP, AlienVault), geolocation, asset criticality
4. **Decision**: Conditional branching based on enrichment results
5. **Action**: Automated containment (isolate, block, disable) or notification
6. **Case Update**: Create or update case/ticket with investigation findings
7. **Escalation**: Route to human analyst if automation thresholds exceeded

**Playbook patterns:**

```
Pattern 1: Straight-through automation (no human touch)
Alert → Enrich → Decision → Auto-Contain → Close

Pattern 2: Human-in-the-loop
Alert → Enrich → Present Evidence → Analyst Decision → Execute Action → Close

Pattern 3: Tiered escalation
Alert → Auto-Triage → Low confidence? → Tier 1 review
                           → High confidence? → Auto-Contain + Notify
                                              → Escalating? → Tier 2 deep dive

Pattern 4: Multi-system orchestration
Alert → Enrich (threat intel) → Check asset criticality (CMDB)
       → Low criticality? → Isolate endpoint
       → High criticality? → Notify on-call + Create incident
```

### Step 3: Phishing Response Playbook (Python/XSOAR)

```python
"""Phishing Email Response Playbook"""
import demistomock as demisto
from CommonServerPython import *
from typing import Dict, Any

def phishing_response_playbook(incident: Dict[str, Any]) -> str:
    """
    Automated phishing response playbook.
    Returns: verdict: "malicious", "suspicious", "clean"
    """
    email_details = incident.get("Email", {})
    attachment_hash = email_details.get("AttachmentHash")
    urls = email_details.get("URLs", [])
    sender = email_details.get("From", "")
    subject = email_details.get("Subject", "")

    # Step 1: Extract and analyze URLs
    malicious_urls = []
    for url in urls:
        # Submit to VirusTotal
        vt_result = demisto.executeCommand("url", {"url": url})
        if vt_result and vt_result[0].get("Contents", {}).get("positives", 0) > 0:
            malicious_urls.append(url)

    # Step 2: Analyze attachments
    malicious_attachments = []
    if attachment_hash:
        # Check hash against threat intel
        file_reputation = demisto.executeCommand("file", {"file": attachment_hash})
        if file_reputation:
            pos = file_reputation[0].get("Contents", {}).get("positives", 0)
            if pos > 3:
                malicious_attachments.append(attachment_hash)
            # Submit to sandbox if unknown
            elif pos == 0:
                sandbox_result = demisto.executeCommand(
                    "wildfire-report", {"hash": attachment_hash}
                )
                if sandbox_result and sandbox_result[0].get("Contents", {}).get("verdict") == 1:
                    malicious_attachments.append(attachment_hash)

    # Step 3: Check sender reputation
    sender_malicious = False
    sender_reputation = demisto.executeCommand("email", {"email": sender})
    if sender_reputation:
        dbot_score = sender_reputation[0].get("Contents", {}).get("DBotScore", {})
        if dbot_score.get("Score", 0) >= 2:
            sender_malicious = True

    # Step 4: Determine verdict
    threat_score = len(malicious_urls) * 2 + len(malicious_attachments) * 3 + (3 if sender_malicious else 0)
    if threat_score >= 3:
        verdict = "malicious"
    elif threat_score >= 1:
        verdict = "suspicious"
    else:
        verdict = "clean"

    # Step 5: Automated response
    if verdict == "malicious":
        # Quarantine email in all recipients' mailboxes
        recipients = email_details.get("To", "").split(",")
        for recipient in recipients:
            demisto.executeCommand("microsoft-atp-list-messages", {
                "recipient": recipient.strip(),
                "subject": subject,
                "delete": True
            })
        # Block sender domain on email gateway
        sender_domain = sender.split("@")[-1] if "@" in sender else sender
        demisto.executeCommand("proofpoint-block-domain", {"domain": sender_domain})

        # Notify security team
        demisto.executeCommand("slack-send", {
            "message": f"🚨 MALICIOUS EMAIL BLOCKED: {subject} from {sender}. "
                       f"URLs: {len(malicious_urls)}, Attachments: {len(malicious_attachments)}",
            "channel": "#security-alerts"
        })

        # Create detailed case
        demisto.executeCommand("createCase", {
            "name": f"Phishing - {subject}",
            "type": "Phishing",
            "severity": IncidentSeverity.HIGH,
            "details": f"Automated phishing detection. Sender: {sender}, "
                       f"Malicious URLs: {malicious_urls}, "
                       f"Malicious attachments: {malicious_attachments}"
        })

    elif verdict == "suspicious":
        # Create case for analyst review
        demisto.executeCommand("createCase", {
            "name": f"Suspicious Email - {subject}",
            "type": "Phishing",
            "severity": IncidentSeverity.MEDIUM,
            "details": f"Manual review required. Sender: {sender}, "
                       f"Suspicious indicators found."
        })

    # Step 6: Update case with findings
    demisto.executeCommand("setIncident", {
        "customFields": {
            "phishingverdict": verdict,
            "maliciousurls": malicious_urls,
            "maliciousattachments": malicious_attachments
        }
    })

    return verdict
```

### Step 4: Enrichment Pipeline Design

```yaml
enrichment_pipeline:
  ip_address:
    order: ["geolocation", "threat_intel", "reputation_score"]
    sources:
      geolocation: "MaxMind GeoIP or ip-api.com"
      threat_intel: "VirusTotal, AlienVault OTX, MISP"
      reputation_score: "Greynoise (noise/riot classification)"
    cache: "24 hours for benign, 1 hour for malicious"
  
  domain:
    order: ["whois", "dns_lookup", "threat_intel", "category_check"]
    sources:
      whois: "WhoisXML or built-in WHOIS"
      dns_lookup: "A, MX, NS records"
      threat_intel: "VirusTotal, URLhaus, PhishTank"
      category_check: "FortiGuard, BlueCoat category"
    cache: "48 hours for benign, 1 hour for malicious"
  
  file_hash:
    order: ["threat_intel", "sandbox"]
    sources:
      threat_intel: "VirusTotal (md5/sha1/sha256)"
      sandbox: "Cuckoo, Cape, WildFire, Joe Sandbox"
    cache: "7 days for benign, indefinite for malicious"
  
  email_address:
    order: ["email_rep", "domain_reputation", "breach_check"]
    sources:
      email_rep: "Hunter.io, EmailRep.io"
      domain_reputation: "Same as domain enrichment"
      breach_check: "HaveIBeenPwned API (for internal users)"
    cache: "24 hours"

  user_identity:
    order: ["directory_lookup", "asset_ownership", "recent_activity"]
    sources:
      directory_lookup: "Active Directory, Azure AD, Okta"
      asset_ownership: "CMDB (ServiceNow, Snipe-IT)"
      recent_activity: "SIEM query for last 24h user activity"
    cache: "No cache — always fresh"
```

### Step 5: Automated Containment Playbooks

**Endpoint Isolation Playbook (Splunk SOAR):**
```python
def isolate_endpoint(incident_id: str, hostname: str, reason: str) -> dict:
    """
    Isolate an endpoint from the network while maintaining EDR communication.
    """
    results = {}

    # Step 1: Verify endpoint exists in EDR
    edr_query = splunk_soar.call_app("crowdstrike", "get_host_details", {
        "hostname": hostname
    })
    if not edr_query.get("success"):
        return {"error": f"Host {hostname} not found in CrowdStrike"}

    device_id = edr_query["result"]["device_id"]

    # Step 2: Check if already isolated
    isolation_status = splunk_soar.call_app("crowdstrike", "get_isolation_status", {
        "device_id": device_id
    })
    if isolation_status.get("result", {}).get("status") == "isolated":
        return {"warning": f"Host {hostname} already isolated"}

    # Step 3: Log isolation action
    splunk_soar.add_note(incident_id, f"Starting isolation of {hostname}. Reason: {reason}")

    # Step 4: Execute isolation
    isolation_result = splunk_soar.call_app("crowdstrike", "contain_host", {
        "device_id": device_id
    })

    if isolation_result.get("success"):
        # Step 5: Update incident
        splunk_soar.update_incident(incident_id, {
            "status": "in_progress",
            "isolation_hosts": [hostname],
            "isolation_time": datetime.utcnow().isoformat()
        })

        # Step 6: Notify SOC
        splunk_soar.call_app("slack", "send_message", {
            "channel": "#incident-response",
            "message": f"🔒 {hostname} isolated. Incident: {incident_id}. Reason: {reason}"
        })

        results["success"] = True
        results["device_id"] = device_id
    else:
        results["success"] = False
        results["error"] = isolation_result.get("error", "Unknown error")

    return results
```

**IoC Blocking Playbook (Tines workflow):**
```yaml
# Tines Story Template: Block Malicious IoCs
triggers:
  - type: "webhook"
    name: "Receive IoC from SIEM"
    events: ["new_malicious_alert"]

actions:
  extract_iocs:
    type: "transform"
    input: "{{trigger.body}}"
    rules:
      - field: "ip_addresses"
        action: "extract_regex"
        pattern: '\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b'
      - field: "domains"
        action: "extract_regex"
        pattern: '\\b(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}\\b'

  block_on_firewall:
    type: "http_request"
    url: "https://firewall-api.example.com/v1/address-objects"
    method: "POST"
    headers:
      Authorization: "Bearer {{credential.FIREWALL_API_KEY}}"
    body:
      name: "BLOCKED-IOC-{{$now | date '%Y%m%d%H%M%S'}}"
      addresses: "{{extract_iocs.ip_addresses}}"
      tags: ["soar-blocked", "{{trigger.body.severity}}"]
    on_error:
      - escalate_to_soc

  block_on_dns:
    type: "http_request"
    url: "https://dns-firewall-api.example.com/v1/block"
    method: "POST"
    body:
      domains: "{{extract_iocs.domains}}"
      action: "block"
      ttl: 3600

  create_ticket:
    type: "http_request"
    url: "https://service-now.example.com/api/now/table/incident"
    method: "POST"
    headers:
      Authorization: "Bearer {{credential.SERVICENOW_TOKEN}}"
    body:
      short_description: "Automated IoC blocking - {{trigger.body.alert_name}}"
      description: "Blocked {{extract_iocs.ip_addresses | length}} IPs and {{extract_iocs.domains | length}} domains"
      category: "security"
      impact: 2
      urgency: 2
      assignment_group: "SOC"

  notify:
    type: "http_request"
    url: "https://slack.com/api/chat.postMessage"
    headers:
      Authorization: "Bearer {{credential.SLACK_TOKEN}}"
    body:
      channel: "#security-automation"
      text: "🛑 Blocked {{extract_iocs.ip_addresses | length}} IPs and {{extract_iocs.domains | length}} domains from alert: {{trigger.body.alert_name}}"
```

### Step 6: Case Management Schema

```yaml
case_management_schema:
  case_id:
    type: "auto-generated"
    format: "SOC-{YYYY}-{NNNNN}"
  title:
    type: "string"
    required: true
    description: "Brief incident description"
  severity:
    type: "enum"
    values: ["Low", "Medium", "High", "Critical"]
  status:
    type: "enum"
    values: ["New", "Investigating", "Contained", "Remediating", "Resolved", "Closed"]
  category:
    type: "enum"
    values: [
      "Phishing", "Malware", "Ransomware", "Unauthorized Access",
      "Data Exfiltration", "DDoS", "Insider Threat", "Policy Violation",
      "Misconfiguration", "Other"
    ]
  discovered_at:
    type: "datetime"
    auto: "now"
  source:
    type: "string"
    description: "Detection source (SIEM, EDR, User Report, Threat Intel)"
  description:
    type: "text"
    required: true
  affected_assets:
    type: "array"
    items:
      type: "object"
      properties:
        hostname: "string"
        ip: "string"
        owner: "string"
        criticality: "Low|Medium|High|Critical"
  indicators:
    type: "array"
    items:
      type: "object"
      properties:
        type: "ip|domain|url|hash|email|registry|filepath"
        value: "string"
        malicious: "boolean"
        enrichment: "object"
  timeline:
    type: "array"
    items:
      type: "object"
      properties:
        timestamp: "datetime"
        action: "string"
        actor: "string (System or Analyst name)"
        details: "text"
  response_actions:
    type: "array"
    items:
      type: "object"
      properties:
        action: "isolate|block|disable|quarantine|remove|restore|notify|other"
        target: "string"
        executed_at: "datetime"
        result: "success|failure|pending"
  assigned_to:
    type: "string"
  sla_deadline:
    type: "datetime"
  resolution_notes:
    type: "text"
  closed_at:
    type: "datetime"
```

### Step 7: Testing and Validation

**Playbook Testing Strategy:**

| Test Level | Description | Frequency | Tooling |
|-----------|-------------|-----------|---------|
| Unit test | Test individual actions (API call, transformation) | Per playbook change | Python unittest, Postman |
| Integration test | Test full playbook against sandbox tools | Per deployment | Shuffle emulator, XSOAR test playbook |
| Tabletop test | Simulate incident, validate playbook response | Monthly | Manual walkthrough with SOC team |
| Purple team test | Adversary simulation triggers playbook | Quarterly | Atomic Red Team, Caldera |
| Regression test | Verify existing playbooks still work after tool changes | Per tool version update | Automated CI pipeline |

**XSOAR Playbook Testing:**
```python
"""Example playbook unit test"""
import pytest
from phishing_playbook import phishing_response_playbook

class TestPhishingPlaybook:
    @pytest.fixture
    def malicious_email_incident(self):
        return {
            "Email": {
                "From": "attacker@evil-phish.example.com",
                "Subject": "Urgent: Password Reset Required",
                "To": "user@company.com",
                "AttachmentHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "URLs": ["http://evil-phish.example.com/reset", "http://evil-phish.example.com/collect"]
            },
            "source": "SIEM"
        }

    def test_malicious_with_urls_and_attachment(self, mocker, malicious_email_incident):
        """Test playbook detects malicious email with both malicious URLs and attachment."""
        # Mock VirusTotal response
        mocker.patch('demistomock.executeCommand',
                     side_effect=lambda cmd, args: {
                         "url": [{"Contents": {"positives": 5, "total": 70}}],
                         "file": [{"Contents": {"positives": 8, "total": 65}}],
                         "email": [{"Contents": {"DBotScore": {"Score": 0}}}]
                     }.get(cmd, [{"Contents": {}}]))

        verdict = phishing_response_playbook(malicious_email_incident)
        assert verdict == "malicious"

    def test_clean_email(self, mocker):
        clean_incident = {
            "Email": {
                "From": "legit@company.com",
                "Subject": "Team Meeting",
                "To": "user@company.com",
                "URLs": ["https://company.com/meeting"]
            }
        }
        mocker.patch('demistomock.executeCommand',
                     side_effect=lambda cmd, args: {
                         "url": [{"Contents": {"positives": 0, "total": 70}}],
                         "email": [{"Contents": {"DBotScore": {"Score": 1}}}]
                     }.get(cmd, [{"Contents": {}}]))

        verdict = phishing_response_playbook(clean_incident)
        assert verdict == "clean"
```

### Step 8: Error Handling and Resilience

**Error handling patterns:**

```yaml
error_handling:
  api_timeout:
    pattern: "retry_with_backoff"
    config:
      max_retries: 3
      base_delay: 5  # seconds
      backoff_multiplier: 2
      max_delay: 60
    action_on_failure: "skip_enrichment, log warning, proceed with available data"

  api_error:
    pattern: "fallback_source"
    config:
      primary: "VirusTotal"
      fallback: "AlienVault OTX"
      second_fallback: "MISP"
    action_on_all_fail: "note enrichment unavailable, proceed without enrichment"

  credential_expired:
    pattern: "notify_admin"
    action: "stop playbook, create ticket for credential rotation, notify integration owner"

  unexpected_error:
    pattern: "escalate_to_human"
    action: "capture error context, route incident to Tier 1 analyst with automation notes"

  rate_limit_hit:
    pattern: "throttled_queue"
    config:
      queue: "playbook_retry_queue"
      delay: 300  # seconds
      max_retries: 2
```

**Kill switch and fail-safe:**
- Every playbook must have a manual abort mechanism
- Critical actions (isolate, block, disable) require two-phase confirmation in semi-automated mode
- Rollback capability: "undo" playbook for reversible actions
- Maximum execution time: 30 minutes (configurable per playbook type)
- Monitoring: playbook success/failure rate, execution time, error types

## Common Pitfalls

### Pitfall 1: Automating Without Understanding the Process
Automating a broken manual process just makes it break faster. Document the manual process first, identify exception paths, then automate.

### Pitfall 2: Over-Automation
Automating actions with high blast radius (isolating critical servers, blocking broad IP ranges) without human approval causes business disruption. Use two-person rule for destructive actions.

### Pitfall 3: No Error Handling
Playbooks that fail silently leave incidents unresolved. Every action branch must handle: API timeout, rate limit, auth failure, malformed response, network error.

### Pitfall 4: Hardcoded Credentials
Secrets in playbook code are a security risk and break on rotation. Use credential management: vault lookups, environment variables, SOAR platform secret store.

### Pitfall 5: No Playbook Version Control
Playbooks modified without version control lose change history and rollback capability. Store playbooks in git. Tag versions. Document changes.

### Pitfall 6: Ignoring Rate Limits
API rate limit hits cause playbook failures. Implement exponential backoff, queue management, and monitoring for API utilization.

### Pitfall 7: No Performance Baselines
Without metrics, you cannot measure automation effectiveness. Track: time saved, false positive reduction, containment time improvement, analyst satisfaction.

### Pitfall 8: One-Size-Fits-All Enrichment
Enriching every alert against 10+ sources adds latency and uses API quota. Use conditional enrichment: enrich based on severity, data source, asset criticality.

### Pitfall 9: No Playbook Retirement
Old playbooks for retired tools or obsolete threats accumulate. Quarterly review: remove playbooks for decommissioned tools, update for API changes, retire for obsolete threats.

### Pitfall 10: Analyst Bypass
If analysts find the playbook slow, inaccurate, or hard to override, they will work around it. Measure analyst satisfaction. Make playbooks fast (< 30s enrichment), accurate (< 5% false containment), and easy to override.

## Best Practices

- Automate the 80% common case; always have a manual escalation path for edge cases
- Start with containment actions that have low blast radius (quarantine file > isolate endpoint > block IP range)
- Implement two-phase confirmation for destructive actions in semi-automated playbooks
- Version control all playbooks in git with pull request review
- Collect empirical metrics: time saved per incident, false positive rate, containment success rate
- Design playbooks with kill switch: automated stop on error threshold exceeded
- Use conditional enrichment: only enrich when needed based on alert type and severity
- Implement retry with exponential backoff for all API calls
- Test playbooks in a sandbox environment before production deployment
- Create an automation COE (Center of Excellence) to govern playbook quality
- Document each playbook with: trigger conditions, expected inputs/outputs, error handling, known limitations
- Monitor playbook execution: success rate, execution time, error frequency, analyst overrides
- Review playbooks quarterly: update for tool changes, retire obsolete ones, optimize slow ones

## Performance Considerations

- Enrichment pipeline latency: typical full enrichment 30-90 seconds. Parallel enrichment reduces to 15-30 seconds
- API rate limits: VirusTotal (4 req/min free, 500 req/min paid), AlienVault (60 req/min), MISP (depends on instance)
- Playbook execution time target: < 2 minutes for automated triage, < 10 minutes for full investigation
- SOAR platform scaling: XSOAR (50 concurrent playbooks per engine), Splunk SOAR (25 playbooks per appliance)
- Concurrent alerts: design playbooks for 5x peak alert volume; queue excess alerts for delayed processing
- Database queries: cache asset and user data (CMDB queries are slow); invalidate cache hourly
- Cost: multi-enrichment each alert costs API credits. Set monthly enrichment budget per playbook

## Rules

- Every automated destructive action must have a corresponding rollback playbook
- Playbooks must handle errors gracefully — no silent failures, always escalate
- All automation actions must be logged to the case timeline with full context
- Human approval required for: isolate production server, disable admin account, block large IP range, delete data
- Playbook change requires peer review — no direct-to-production changes
- Playbook execution time must not exceed 30 minutes (configurable cap)
- API credentials must use SOAR platform secret store — never hardcoded
- Monthly playbook review: success rate, FP rate, execution time, errors
- Every playbook must have a documented owner and test schedule
- Automated responses must comply with regulatory requirements (GDPR right to deletion, etc.)

## References
  - references/playbook-development.md — SOAR Playbook Development
  - references/soar-automation-advanced.md — Soar Automation Advanced Topics
  - references/soar-automation-fundamentals.md — Soar Automation Fundamentals
  - references/soar-integrations.md — SOAR Integration Patterns
  - references/soar-platforms.md — SOAR Platforms
  - references/soar-playbooks.md — SOAR Playbook Patterns
  - references/triage-automation.md — Automated Triage
## Handoff
Playbooks integrate with siem-engineering for triggers, soc-operations for triage workflows, and threat-intelligence for enrichment.
