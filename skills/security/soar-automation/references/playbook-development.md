# SOAR Playbook Development

## Playbook Structure

### Core Components
```
┌─────────────────────────────────────┐
│          TRIGGER (Alert, Webhook..)  │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│      INPUT PARSING & NORMALIZATION  │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│      ENRICHMENT (parallel checks)   │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│      DECISION (conditional branching)│
├────────────┬────────────┬───────────┤
│  Malicious │ Suspicious │ Benign    │
└──────┬─────┴─────┬──────┴─────┬─────┘
       ↓           ↓            ↓
   Contain    Escalate      Close
```

### Playbook Schema
```yaml
name: "Phishing Investigation"
description: "Investigate reported phishing emails"
version: "1.0.0"
author: "SOC Engineering"
trigger:
  type: webhook  # alert, webhook, schedule, manual
  source: "email_security_gateway"
  filters:
    - field: "category"
      value: "phishing"
inputs:
  - name: "email_from"
    type: string
    required: true
  - name: "email_subject"
    type: string
    required: true
  - name: "attachment_hash"
    type: string
    required: false
  - name: "email_links"
    type: array
    required: false
steps:
  - id: enrich_ip
    type: action
    connector: virustotal
    action: check_ip
    input:
      ip: "{{ alert.source_ip }}"
  - id: check_malicious
    type: decision
    condition: "{{ enrich_ip.data.malicious > 0 }}"
    branches:
      true:
        - id: block_ip
          type: action
          connector: firewall
          action: block_ip
      false:
        - id: escalate_t2
          type: action
          connector: case_management
          action: create_case
```

## Conditional Logic

### Decision Types
| Type | Use Case | Example |
|------|----------|---------|
| If/Else | Binary outcome | Is IP malicious? |
| Switch/Case | Multiple values | Alert severity: Low/Med/High/Critical |
| Match/Regex | Pattern matching | Does URL match known phishing pattern? |
| Threshold | Numeric comparison | Events in time window > threshold |
| Contains | Substring check | Does command line contain "-enc"? |
| And/Or/Nor | Compound conditions | Is IP malicious AND not whitelisted? |

### Decision Best Practices
- Use strict equality checks where possible
- Handle null/empty values explicitly
- Chain conditions from most specific to least
- Include a default/else branch for unexpected states
- Log decision outcomes for audit and debugging

## Loops

### Loop Patterns

**For-Each Loop (parallel):**
```yaml
- id: enrich_iocs
  type: loop
  mode: parallel  # parallel or sequential
  items: "{{ alert.iocs }}"
  actions:
    - connector: virustotal
      action: check_hash
      input:
        hash: "{{ loop_item.value }}"
```

**For-Each Loop (sequential):**
```yaml
- id: contain_hosts
  type: loop
  mode: sequential
  items: "{{ alert.affected_hosts }}"
  actions:
    - connector: edr
      action: isolate_endpoint
      input:
        hostname: "{{ loop_item.hostname }}"
  on_error: continue  # continue, stop, retry
```

**While Loop (retry):**
```yaml
- id: poll_sandbox
  type: while
  condition: "{{ sandbox_result.status != 'completed' }}"
  max_iterations: 10
  delay_seconds: 30
  actions:
    - connector: sandbox
      action: get_report
      input:
        task_id: "{{ sandbox_task.id }}"
```

## Variables and Templating

### Variable Sources
| Source | Syntax | Description |
|--------|--------|-------------|
| Alert fields | `{{ alert.source_ip }}` | From triggering alert |
| Playbook inputs | `{{ inputs.email_from }}` | From playbook trigger params |
| Step outputs | `{{ enrich_ip.data.malicious }}` | From previous step results |
| Environment | `{{ env.splunk_url }}` | Environment/global variables |
| Custom | `{{ setv("malicious_count", 0) }}` | Set within playbook |

### Template Functions
```yaml
# String manipulation
"{{ lower(alert.source_ip) }}"
"{{ split(alert.command_line, ' ')[0] }}"
"{{ replace(alert.url, 'http', 'https') }}"

# Numeric
"{{ sum(5, count) }}"
"{{ max(severity_score, 75) }}"

# Arrays/Lists
"{{ join(alert.iocs, ', ') }}"
"{{ length(alert.affected_users) }}"
"{{ first(matched_indicators) }}"

# Date/Time
"{{ now() }}"
"{{ format_date(alert.timestamp, 'ISO8601') }}"
"{{ add_hours(now(), 4) }}"

# Logic
"{{ contains(alert.url, 'bit.ly') }}"
"{{ match(alert.command_line, '.*-enc.*') }}"
"{{ coalesce(alert.user_agent, 'unknown') }}"
```

## Error Handling

### Error Handling Strategies
| Strategy | Description | When to Use |
|----------|-------------|-------------|
| Continue | Log error, proceed to next step | Non-critical enrichment |
| Stop | Halt playbook execution | Critical path failure |
| Retry | Retry step N times with delay | Transient API failures |
| Fallback | Use alternative action on failure | When backup connector exists |
| Escalate | Create manual case | When automation cannot proceed |

### Error Handling Configuration
```yaml
- id: call_vt_api
  type: action
  connector: virustotal
  action: check_ip
  input:
    ip: "{{ alert.source_ip }}"
  error_handling:
    on_error: retry
    max_retries: 3
    retry_delay: 10
    retry_backoff: exponential  # linear or exponential
    fallback_action:
      connector: abuseipdb
      action: check_ip
    escalate_on_failure: true
  timeout: 30  # seconds
```

## Input/Output Schema

### Input Schema Definition
```json
{
  "name": "PhishingInvestigation",
  "inputs": [
    {
      "name": "email_from",
      "type": "string",
      "description": "Sender email address",
      "required": true,
      "validation": {
        "pattern": "^[\\w.+-]+@[\\w-]+\\.[\\w.]+$",
        "max_length": 254
      }
    },
    {
      "name": "attachment_hash",
      "type": "string",
      "description": "SHA256 hash of email attachment",
      "required": false,
      "validation": {
        "pattern": "^[a-f0-9]{64}$"
      }
    },
    {
      "name": "links",
      "type": "array",
      "items": { "type": "string" },
      "description": "URLs found in email body",
      "required": false
    }
  ],
  "outputs": [
    {
      "name": "malicious_score",
      "type": "integer",
      "description": "Confidence score 0-100"
    },
    {
      "name": "containment_actions",
      "type": "array",
      "items": { "type": "string" }
    }
  ]
}
```

### Output Artifacts
```json
{
  "case_id": "CASE-2026-0042",
  "severity": "High",
  "threat_score": 85,
  "indicators": [
    {"type": "ip", "value": "5.6.7.8", "reputation": "malicious"},
    {"type": "hash", "value": "abcd...1234", "reputation": "malicious"}
  ],
  "affected_users": ["user@company.com"],
  "containment": ["ip_blocked", "email_quarantined"],
  "timeline": [
    {"time": "2026-05-20T10:00:00Z", "action": "alert_received"},
    {"time": "2026-05-20T10:00:05Z", "action": "enrichment_complete"},
    {"time": "2026-05-20T10:00:10Z", "action": "ip_blocked"}
  ]
}
```

## Testing Playbooks

### Testing Phases
| Phase | Environment | Data | Goal |
|-------|-------------|------|------|
| Unit Test | Dev (isolated) | Synthetic alerts | Step-by-step validation |
| Integration Test | Dev (connected) | Realistic test data | Connector/interaction testing |
| Staging | Staging SIEM | Anonymized production data | End-to-end validation |
| Canary | Production (limited) | Real alerts, no auto-action | Volume and timing validation |
| Production | Production | Real alerts | Full automation |

### Test Scenarios
```
Test Case: Phishing - Known Malicious Link
  Input: email with known-bad URL
  Expected:
    - URL reputation check returns malicious
    - URL blocked at proxy
    - Email quarantined
    - Case created with severity High
    - Notify SOC

Test Case: Phishing - Benign Link
  Input: email with known-good URL
  Expected:
    - URL reputation check returns clean
    - No blocking actions
    - Case created with severity Low
    - No notification

Test Case: API Timeout
  Input: VT API timeout on enrichment step
  Expected:
    - Retry logic executed (3 attempts)
    - Fallback to AbuseIPDB
    - Escalation created if all fail
```

### Playbook Version Control
- Store playbooks in version control (Git)
- Use semantic versioning for playbook releases
- Maintain changelog per playbook
- Tag production releases
- Require peer review for production playbooks
- Archive deprecated playbooks with reason
