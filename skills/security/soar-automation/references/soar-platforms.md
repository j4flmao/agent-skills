# SOAR Platforms

## Platform Comparison

| Feature | Splunk SOAR (Phantom) | Palo Alto XSOAR | Swimlane | SIRP | Shuffle |
|---------|---------------------|-----------------|----------|------|---------|
| Cost | $$$ (per analyst) | $$$ (per playbook) | $$ (per case) | $$$ (per analyst) | Free (open source) |
| License | Commercial | Commercial | Commercial | Commercial | Apache 2.0 |
| Deployment | On-prem / Cloud | Cloud | Cloud / On-prem | Cloud | Self-hosted / Cloud |
| Playbook Engine | Visual + Python | Visual + Python/JS | Low-code visual | Visual + Python | Visual + YAML |
| Case Management | ✅ Built-in | ✅ Built-in | ✅ Built-in | ✅ Built-in | ❌ (external) |
| Connector Library | 300+ | 600+ | 200+ | 150+ | 50+ |
| Community | Active | Very Active | Moderate | Moderate | Growing |
| API | REST + Python | REST + Python | REST | REST | REST + Webhooks |
| Custom Scripting | Python | Python, JavaScript | Python | Python | Python, JS |
| Multi-Tenant | ✅ | ✅ | ✅ | ✅ | ❌ |
| SLA Management | Custom | Built-in | Built-in | Built-in | ❌ |
| MITRE ATT&CK | Manual | Built-in mapping | Manual | Manual | Manual |

## Splunk SOAR (Phantom)

### Architecture
```
Ingestion → Apps → Playbooks → Actions → Case Management → Reports
             ↓
        Asset Config
```

### Key Concepts
- **Apps**: Connectors to external systems (VirusTotal, Palo Alto, Splunk SIEM)
- **Assets**: Configured instances of apps (API keys, endpoints)
- **Playbooks**: Automation workflows (visual editor or Python)
- **Actions**: Individual operations within playbooks
- **Containers**: Case/ticket objects that track investigations
- **Artifacts**: Evidence and data attached to containers
- **Vault**: File storage for forensic artifacts

### Splunk SOAR Python API
```python
import phantom.rules as phantom

def on_start(container):
    # Extract artifacts from incoming alert
    ip = phantom.collect(container, 'artifact:*.cef.sourceAddress')
    phantom.debug(f"Investigating IP: {ip}")

    # Run enrichment
    vt_result = phantom.act('lookup ip', parameters=[{'ip': ip}],
                           assets=['virustotal'])

    # Decision
    if vt_result[0]['result_data'][0]['malicious']:
        phantom.act('block ip', parameters=[{'ip': ip}],
                   assets=['pan_firewall'])
        phantom.add_to_container(container, artifacts={'ip': ip, 'action': 'blocked'})

    phantom.complete()
```

### Playbook Lifecycle
1. **Draft**: Develop playbook in visual editor
2. **Test**: Run against test data
3. **Review**: Peer review for logic and safety
4. **Promote**: Deploy to production
5. **Monitor**: Track execution and performance
6. **Iterate**: Update based on feedback

## Palo Alto XSOAR

### Architecture
```
Marketplace → Integrations → Playbooks → Incident Types → Layouts → Dashboards
                                     ↓
                              Job Scheduler
```

### Key Concepts
- **Integrations**: Pre-built connectors (600+ available)
- **Playbooks**: Python/JavaScript-based automation with visual editor
- **Incident Types**: Custom field schemas per alert type
- **Layouts**: Custom incident detail views per type
- **Jobs**: Scheduled automation tasks
- **Indicators**: Threat intel management (optional)
- **Classifier/Mapper**: Map incoming alert fields to incident fields

### XSOAR Playbook YAML
```yaml
id: phishing-investigation
version: 2
name: Phishing Investigation
starttaskid: "0"
tasks:
  "0":
    id: "0"
    taskid: extract-iocs
    type: regular
    task:
      name: Extract IOCs
      script: ExtractIndicatorsFromText
      inputs:
        text: ${incident.email.body}
    nexttasks:
      "#none#": "1"

  "1":
    id: "1"
    taskid: check-reputation
    type: condition
    task:
      name: Check Reputation
      script: |
        var vt = executeCommand("vt-check", {file: args.hash});
        return vt[0].malicious > 0 ? "malicious" : "unknown";
    nexttasks:
      "malicious": "2"
      "unknown": "3"

  "2":
    id: "2"
    taskid: block-indicator
    type: regular
    task:
      name: Block Indicator
      script: BlockIP
      inputs:
        ip: ${incident.sourceip}
```

## Swimlane

### Key Features
- Low-code visual playbook builder (no coding required)
- AI-assisted case resolution suggestions
- Built-in SLA management with escalation automation
- Role-based access with multi-tenant support
- Enterprise-grade audit logging and compliance
- Custom dashboards and reporting

### Swimlane Playbook Pattern
```
Trigger → Filter → Enrich → Decision → Resolution
                                  ↓
                            Escalation
```

### Swimlane Use Cases
| Use Case | Automation Level |
|----------|-----------------|
| Phishing triage | High (90% auto-close) |
| Vulnerability management | Medium (auto-prioritization) |
| SOC alert enrichment | High (parallel enrichment) |
| Incident reporting | High (auto-generated reports) |
| Threat intel ingestion | High (auto-ingest and score) |

## SIRP (Security Incident Response Platform)

### Key Features
- Unified case management across security operations
- Playbook automation with drag-and-drop builder
- Threat intel integration and IoC management
- SLA tracking with automated escalation
- Compliance reporting (GDPR, PCI DSS, SOX)
- Built-in IR collaboration tools

### SIRP Workflow Stages
```
Detection → Triage → Investigation → Containment → Eradication → Recovery → Post-Mortem
   │          │           │               │             │           │           │
   ↓          ↓           ↓               ↓             ↓           ↓           ↓
Alert via  Auto-     Manual or        Quarantine    Remove        Restore     Lessons
SIEM/SOAR  enrich    auto-investigate endpoint      malware       systems     learned
```

## Shuffle (Open Source)

### Key Features
- Open source (Apache 2.0) — no licensing costs
- Webhook and API-first trigger system
- YAML-based workflow definitions
- Node.js/Python execution environment
- Built-in error handling and retry logic
- Docker-based deployment (easy to scale)

### Shuffle Workflow Example
```yaml
name: "Phishing Response"
triggers:
  - type: webhook
    name: email_alert
    webhook_path: "/phishing"

steps:
  - id: parse_alert
    type: json_parse
    input:
      data: "$.trigger.body"
    schema:
      source_ip: string
      email_from: string
      attachment_hash: string

  - id: check_vt
    type: http_request
    input:
      url: "https://www.virustotal.com/api/v3/files/$parse_alert.attachment_hash"
      headers:
        x-apikey: "$env.VT_API_KEY"

  - id: decision
    type: condition
    input:
      condition: "$check_vt.body.data.attributes.last_analysis_stats.malicious > 3"
    branches:
      true:
        - id: block_ip
          type: http_request
          input:
            url: "http://firewall-api/block"
            method: POST
            body:
              ip: "$parse_alert.source_ip"
              reason: "Phishing attachment detected"
      false:
        - id: close
          type: comment
          input:
            message: "Benign alert, no action needed"
```

## Architecture Patterns

### Centralized SOAR
```
All alerts → SIEM → Central SOAR → Action
```
Best for: Single SOC, centralized operations

### Distributed SOAR
```
Alert Source A → SOAR A → Regional SOC
Alert Source B → SOAR B → Regional SOC
```
Best for: Multi-region, follow-the-sun

### Federated SOAR
```
MSSP SOAR → Client A SOAR → Client A tools
          → Client B SOAR → Client B tools
```
Best for: MSSPs, multi-tenant environments

## Connector Best Practices
- Use dedicated service accounts with least privilege
- Rotate API keys on a regular schedule (90 days)
- Use API rate limiting awareness in playbooks
- Implement circuit breaker for downstream failures
- Monitor connector health and error rates
- Document connector configuration per environment
