# SOAR Integration Patterns

## Integration Categories
| Category | Examples | Use Case |
|----------|----------|----------|
| SIEM | Splunk, Elastic, Sentinel | Alert ingestion |
| EDR | CrowdStrike, Defender, SentinelOne | Endpoint isolation, process kill |
| Email security | Mimecast, Proofpoint, Office 365 | Email quarantine, URL block |
| Network security | Palo Alto, Fortinet, Check Point | Firewall block, IP blacklist |
| Threat intel | VirusTotal, AlienVault, MISP | IoC enrichment, reputation check |
| Identity | Okta, Azure AD, Duo | User disable, password reset |
| Ticketing | ServiceNow, Jira, Zendesk | Case creation, task assignment |
| Communication | Slack, Teams, PagerDuty | Notification, escalation |

## Common Integration Actions
| Provider | Action | Parameters |
|----------|--------|------------|
| CrowdStrike | Isolate host | hostname, reason |
| Okta | Suspend user | username |
| AWS | Block IP in security group | IP, port, duration |
| VirusTotal | Search IP/domain/hash | indicator |
| ServiceNow | Create incident | title, description, priority |
| Slack | Send message | channel, message, severity |
| PagerDuty | Trigger incident | service, title, details |
