# SOAR Automation Fundamentals

## Overview
Security Orchestration, Automation, and Response (SOAR) platforms connect security tools, automate repetitive tasks, orchestrate complex response workflows, and manage incident response (IR) processes. SOAR reduces mean time to respond (MTTR), standardizes response processes, and frees analysts from repetitive manual work.

## Core Concepts

### Concept 1: SOAR Components
- **Orchestration**: Connects and coordinates multiple security tools via APIs and integrations
- **Automation**: Executes repetitive tasks (enrichment, containment, blocking) without human intervention
- **Response**: Manages incidents through predefined playbooks from detection to resolution
- **Case management**: Tracks incident lifecycle (triage, investigation, remediation, closure)
- **Dashboard & reporting**: Metrics on response times, playbook performance, and analyst workload

### Concept 2: Playbook Types
- **Automated**: Fully automated, no human intervention (e.g., auto-block known malicious IP)
- **Semi-automated**: Automated enrichment and containment, human decision for escalation
- **Manual (investigation guide)**: Provides step-by-step procedures for analysts to follow
- **Conditional**: Branches based on context (severity, asset type, time of day)

### Concept 3: Common Automation Use Cases
| Playbook | Trigger | Actions |
|----------|---------|---------|
| Phishing response | Email report or SIEM alert | Extract indicators → sandbox URL → block if malicious → alert user |
| IP block | Firewall alert or TI match | Verify context → create firewall rule → confirm block → notify |
| User containment | Compromised account detection | Revoke sessions → reset password → disable account → alert |
| Malware isolation | EDR alert | Collect sample → scan with AV → isolate host → inform SOC |
| Enrichment | Any alert | Query VT/Shodan/GreyNoise → check asset DB → update alert |
| Ticket creation | Any alert | Create ticket in Jira/ServiceNow → assign priority → notify owner |

### Concept 4: SOAR Maturity Model
| Level | Name | Characteristics |
|-------|------|----------------|
| 1 | Manual | No automation, analysts manually triage all alerts |
| 2 | Assisted | Enrichment automated, human makes decisions |
| 3 | Automated | Common playbooks run automatically with clear success criteria |
| 4 | Autonomous | Machine-led response with human exception handling |
| 5 | Predictive | SOAR predicts incidents before they occur, auto-remediates |

## Implementation Guide

### Step 1: Playbook Example (Phishing Response)
```yaml
playbook:
  name: "Phishing Response Playbook"
  trigger:
    - type: "email"
      source: "phishing_reporting@example.com"
    - type: "api"
      source: "SIEM"
      condition:
        rule: "Phishing URL Detected"

  steps:
    - id: "extract_indicators"
      name: "Extract IOCs"
      action:
        type: "python"
        code: |
          import re
          urls = re.findall(r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+', email.body)
          attachments = email.attachments
          subject = email.subject
          sender = email.from_address
          return {"urls": urls, "attachments": attachments, "sender": sender}

    - id: "url_reputation"
      name: "Check URL Reputation"
      action:
        type: "api:virustotal"
        input: "${steps.extract_indicators.output.urls}"
        condition: "urls is not empty"
      output: "url_verdict"

    - id: "sandbox_analysis"
      name: "Sandbox Attachment"
      action:
        type: "api:anyrun"
        input: "${steps.extract_indicators.output.attachments}"
        condition: "attachments is not empty"
      output: "sandbox_verdict"

    - id: "malicious_check"
      name: "Check if Malicious"
      condition:
        type: "any"
        conditions:
          - "${steps.url_reputation.output.verdict} == 'malicious'"
          - "${steps.sandbox_analysis.output.verdict} == 'malicious'"

    - id: "block_url"
      name: "Block Malicious URL"
      condition: "${steps.malicious_check.output} == true"
      action:
        type: "api:firewall"
        params:
          target: "proxy"
          rule: "block_domain"
          domain: "${steps.extract_indicators.output.urls}"

    - id: "notify_user"
      name: "Notify User"
      condition: "${steps.malicious_check.output} == true"
      action:
        type: "email"
        to: "${alert.reporter_email}"
        subject: "Phishing Report Update"
        body: "The URL you reported was confirmed malicious and has been blocked."

    - id: "escalate"
      name: "Escalate if Suspicious"
      condition:
        type: "none"
        conditions:
          - "${steps.malicious_check.output} == true"
      action:
        type: "create_ticket"
        system: "Jira"
        priority: "P2"
        assign: "SOC Lead"
```

### Step 2: Automation with Python
```python
# SOAR automation script for IP enrichment
import os
import requests

class IPEnrichment:
    """Enrich IP address with threat intelligence."""

    def __init__(self, vt_api_key: str, abuseipdb_key: str):
        self.vt_api_key = vt_api_key
        self.abuseipdb_key = abuseipdb_key

    def enrich(self, ip: str) -> dict:
        """Gather threat intelligence for an IP address."""
        return {
            "ip": ip,
            "virustotal": self._check_virustotal(ip),
            "abuseipdb": self._check_abuseipdb(ip),
            "shodan": self._check_shodan(ip),
        }

    def _check_virustotal(self, ip: str) -> dict:
        url = f"https://www.virustotal.com/api/v3/ip_addresses/{ip}"
        headers = {"x-apikey": self.vt_api_key}
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            return {
                "malicious": data["data"]["attributes"]["last_analysis_stats"]["malicious"],
                "suspicious": data["data"]["attributes"]["last_analysis_stats"]["suspicious"],
            }
        return {"error": resp.status_code}

    def _check_abuseipdb(self, ip: str) -> dict:
        url = "https://api.abuseipdb.com/api/v2/check"
        headers = {"Key": self.abuseipdb_key, "Accept": "application/json"}
        params = {"ipAddress": ip, "maxAgeInDays": 90}
        resp = requests.get(url, headers=headers, params=params, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            return {
                "abuse_confidence_score": data["data"]["abuseConfidenceScore"],
                "total_reports": data["data"]["totalReports"],
            }
        return {"error": resp.status_code}

    def auto_block_decision(self, enrichment: dict) -> str:
        """Determine whether to automatically block."""
        vt_malicious = enrichment.get("virustotal", {}).get("malicious", 0)
        abuse_score = enrichment.get("abuseipdb", {}).get("abuse_confidence_score", 0)
        if vt_malicious >= 5 or abuse_score >= 90:
            return "auto_block"
        elif vt_malicious >= 2 or abuse_score >= 50:
            return "analyst_review"
        return "no_action"
```

### Step 3: Incident Case Management
```yaml
incident:
  id: "INC-2026-00142"
  title: "Phishing Campaign - Fake O365 Login"
  severity: "HIGH"
  status: "Active"
  created: "2026-06-19T08:30:00Z"
  source: "SIEM: Rule-Phishing-URL-Detected"

  affected_assets:
    - "user: jane.doe@example.com"
    - "endpoint: DESKTOP-JANE (10.1.2.50)"

  playbooks_run:
    - "Phishing Response v2.1" (completed)
    - "User Containment v1.4" (completed)

  timeline:
    - "08:30: Alert triggered by SIEM"
    - "08:31: SOAR extracted indicators (URL: hxxp://fake-o365[.]com)"
    - "08:32: URL verified malicious (VT: 8/94)"
    - "08:32: URL blocked at proxy"
    - "08:33: User Jane Doe notified"
    - "08:35: User sessions revoked, password reset"
    - "08:45: Incident escalated to SOC Lead (P1)"
    - "09:00: Full containment verified"

  resolution:
    status: "Resolved - Contained"
    resolved_at: "2026-06-19T09:00:00Z"
    root_cause: "User clicked phishing link in email"
    lessons_learned: "Add security awareness training for phishing"
```

## Best Practices
- Start with high-volume, low-complexity automation (enrichment, IP blocking)
- Define clear success criteria for automated actions — when does automation stop and human take over?
- Include rollback/revert logic in destructive playbooks
- Test playbooks in non-production environments before enabling automation
- Implement approval gates for high-impact actions (account disable, production firewall changes)
- Monitor automation health — failed playbooks must be alerted
- Version control playbooks for audit and rollback
- Document every playbook with clear trigger, steps, expected outcomes, and failure handling
- Use playbooks as incident response documentation (what was done, when, by whom)
- Start with semi-automated playbooks, graduate to fully automated as confidence grows

## Common Pitfalls
- Automating without understanding the process first — garbage in, garbage out
- No human-in-the-loop for destructive actions — risk of auto-blocking critical infrastructure
- Playbooks too complex — hundreds of steps that are impossible to maintain
- Not testing playbooks regularly — playbooks break when integrations change
- Over-relying on automation — some incidents require human judgment
- No monitoring of automation — failures go unnoticed
- Playbooks not version controlled — changes and audits impossible
- No rollback in playbooks — automated changes can't be undone
- Automating everything at once — start small, iterate
- Not measuring playbook effectiveness — can't improve what you don't measure

## Key Points
- SOAR orchestrates tools, automates tasks, and manages incident response
- Playbooks: fully automated → semi-automated → investigation guides
- Start with enrichment automation, graduate to response automation
- Every playbook needs triggers, actions, conditions, and error handling
- Include rollback logic in destructive actions
- Test playbooks before enabling automation
- Version control all playbooks
- Monitor automation health and measure MTTR improvement
- Approval gates for high-impact actions
- Start small, iterate, and expand automation gradually
