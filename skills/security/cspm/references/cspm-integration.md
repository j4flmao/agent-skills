# CSPM Integration

## Overview

CSPM platforms are most effective when integrated with SIEM for correlation, SOAR for automated response, IT ticketing for tracking, and notification channels for real-time alerting.

## SIEM Integration

### Splunk Integration

**Forwarding CSPM Findings to Splunk:**
```python
import json
import requests
import boto3
from datetime import datetime

def send_to_splunk_hec(findings, hec_url, hec_token):
    """Send CSPM findings to Splunk HTTP Event Collector"""
    headers = {
        "Authorization": f"Splunk {hec_token}",
        "Content-Type": "application/json"
    }
    
    for finding in findings:
        event = {
            "event": {
                "source": "cspm",
                "sourcetype": "cspm:security_finding",
                "host": finding["cloud_provider"],
                "time": datetime.now().timestamp(),
                "fields": {
                    "finding_id": finding["id"],
                    "severity": finding["severity"],
                    "resource_id": finding["resource_id"],
                    "resource_type": finding["resource_type"],
                    "rule_name": finding["rule_name"],
                    "compliance_frameworks": finding["compliance"],
                    "account_id": finding["account_id"],
                    "region": finding["region"],
                    "remediation": finding["remediation"],
                    "status": finding["status"]
                }
            }
        }
        
        response = requests.post(
            f"{hec_url}/services/collector",
            headers=headers,
            json=event,
            verify=True
        )
        
        if response.status_code != 200:
            print(f"Failed to send {finding['id']}: {response.text}")

aws_security_hub = boto3.client('securityhub')

def poll_security_hub():
    findings = aws_security_hub.get_findings(
        Filters={
            "ComplianceStatus": [{"Value": "FAILED", "Comparison": "EQUALS"}],
            "WorkflowStatus": [{"Value": "NEW", "Comparison": "EQUALS"}],
            "SeverityLabel": [
                {"Value": "CRITICAL", "Comparison": "EQUALS"},
                {"Value": "HIGH", "Comparison": "EQUALS"}
            ]
        },
        MaxResults=100
    )
    
    splunk_events = []
    for finding in findings["Findings"]:
        splunk_events.append({
            "id": finding["Id"],
            "severity": finding["Severity"]["Label"],
            "resource_id": finding["Resources"][0]["Id"],
            "resource_type": finding["Resources"][0]["Type"],
            "rule_name": finding["Title"],
            "compliance": [c["ComplianceStatus"] for c in finding.get("Compliance", [])],
            "account_id": finding["AwsAccountId"],
            "region": finding["Region"],
            "remediation": finding.get("Remediation", {}).get("Recommendation", {}).get("Text", ""),
            "status": finding["WorkflowState"],
            "cloud_provider": "AWS"
        })
    
    if splunk_events:
        send_to_splunk_hec(splunk_events, "https://splunk.example.com:8088", "YOUR-HEC-TOKEN")

### Splunk Queries for CSPM Data
```spl
# CSPM findings overview
index=security sourcetype=cspm:security_finding
| stats count by severity, cloud_provider
| sort -count

# Top affected resources
index=security sourcetype=cspm:security_finding severity=CRITICAL
| top limit=20 resource_type, rule_name
| sort -count

# Compliance violation trends
index=security sourcetype=cspm:security_finding
| timechart span=1d count by severity

# Correlation with IAM activity
index=security sourcetype=cspm:security_finding severity=CRITICAL resource_type="AWS::IAM::*"
| join resource_id [search index=aws sourcetype=cloudtrail]
| table _time, rule_name, resource_id, eventName, userIdentity.arn, sourceIPAddress
```

### Azure Sentinel Integration

**Data Connector Configuration:**
```json
{
  "properties": {
    "connectorDefinitionId": "cspm-connector",
    "dataTypes": [
      {
        "name": "SecurityFinding",
        "lastDataReceivedQuery": "SecurityFinding | summarize arg_max(TimeGenerated, *) by SourceSystem | order by TimeGenerated desc"
      }
    ],
    "connectivityCriterias": [
      {
        "type": "IsConnectedQuery",
        "value": "SecurityFinding | summarize count() | where count_ > 0"
      }
    ]
  }
}
```

**KQL Queries:**
```kql
// Critical findings count by resource
SecurityFinding
| where Severity in ("Critical", "High")
| summarize FindingCount = count() by ResourceId, ResourceType
| sort by FindingCount desc
| take 20

// New findings in last 24 hours
SecurityFinding
| where TimeGenerated > ago(24h)
| where Status == "New"
| project TimeGenerated, FindingName, Severity, ResourceId, ResourceType, AccountId

// Cross-resource attack path visualization
SecurityFinding
| where FindingName contains "public" or FindingName contains "exposed"
| project ResourceId, ResourceType, AccountId
| join kind=inner (
    SecurityFinding
    | where FindingName contains "IAM" or FindingName contains "permission"
) on AccountId
| project-away AccountId
```

## SOAR Integration

### Palo Alto XSOAR Playbook
```yaml
playbook:
  name: "CSPM Finding — Auto Remediate S3 Public Bucket"
  trigger:
    type: webhook
    source: wiz / prisma / security_hub

  steps:
    - name: Parse Finding
      action: core.setIncident
      inputs:
        name: "CSPM: ${finding.severity} - ${finding.rule_name}"
        severity: ${finding.severity}
        owner: soc-engineer
        type: CSPM Finding

    - name: Enrich Resource
      action: aws-get-resource
      inputs:
        resource_id: ${finding.resource_id}

    - name: Validate Remediation
      action: Conditional
      inputs:
        condition: ${finding.severity} in ["CRITICAL", "HIGH"]
        true_step: block_public_access
        false_step: create_ticket

    - name: Block Public Access
      action: aws-s3-put-public-access-block
      inputs:
        bucket: ${finding.resource_id}
        block_public_acls: true
        block_public_policy: true
        ignore_public_acls: true
        restrict_public_buckets: true

    - name: Create Change Record
      action: servicenow-create-record
      inputs:
        table: change_request
        short_description: "Auto-remediated S3 public access on ${finding.resource_id}"
        category: security
        priority: ${finding.severity == "CRITICAL" ? 1 : 2}

    - name: Notify Team
      action: slack-send-message
      inputs:
        channel: "#security-alerts"
        message: "Auto-remediated ${finding.resource_id}: Public S3 access blocked"
```

### Splunk SOAR (Phantom) Playbook
```python
def remediate_s3_bucket(action=None, container=None, config=None, **kwargs):
    # Get finding details from container
    finding = container.get('artifact', {}).get('cef', {})
    
    bucket_name = finding.get('resource_name')
    severity = finding.get('severity')
    
    # Execute remediation
    success = block_public_s3(bucket_name)
    
    if success:
        # Create ServiceNow ticket
        service_now_client = ServiceNowClient(
            config.get('snow_instance'),
            config.get('snow_username'),
            config.get('snow_password')
        )
        
        ticket = service_now_client.create_incident(
            short_description=f"Auto-remediated S3 bucket: {bucket_name}",
            category="security",
            impact=1 if severity == "CRITICAL" else 2,
            urgency=1 if severity == "CRITICAL" else 2,
            assignment_group="SOC"
        )
        
        # Send Slack notification
        slack_client = SlackClient(config.get('slack_token'))
        slack_client.send_message(
            channel="#security-remediation",
            text=f"✅ Auto-remediated S3 bucket `{bucket_name}` — public access blocked.\nTicket: {ticket.number}"
        )
    
    return action_result.set_status(phantom.APP_SUCCESS, "Remediation completed")
```

## IT Ticketing Integration

### Jira Automation
```yaml
# Jira automation rule for CSPM findings
rule:
  name: "CSPM High/Critical Finding → Jira Issue"
  trigger:
    type: webhook
    url: "/cspm-finding-webhook"

  actions:
    - create_issue:
        project: SEC
        issuetype: Bug
        summary: "[CSPM] {{finding.severity}} — {{finding.rule_name}}"
        description: |
          h2. CSPM Finding
          * *Resource:* {{finding.resource_id}}
          * *Type:* {{finding.resource_type}}
          * *Provider:* {{finding.provider}}
          * *Account:* {{finding.account_id}}
          * *Region:* {{finding.region}}
          
          h3. Remediation
          {{finding.remediation}}
          
          h3. Compliance
          {{finding.compliance_frameworks}}
        priority: "{{finding.severity == 'CRITICAL' ? 'Highest' : 'High'}}"
        labels: [cspm, auto-ticket, {{finding.provider}}]
        assignee: project_lead
        
    - add_comment:
        issue: "{{created_issue.key}}"
        body: "Auto-created from CSPM finding [{{finding.id}}]"
```

### ServiceNow Integration
```python
import requests
from requests.auth import HTTPBasicAuth

def create_servicenow_incident(finding, snow_instance, username, password):
    url = f"https://{snow_instance}.service-now.com/api/now/table/incident"
    
    payload = {
        "short_description": f"[CSPM] {finding['severity']} — {finding['rule_name']}",
        "description": f"Resource: {finding['resource_id']}\nType: {finding['resource_type']}\nAccount: {finding['account_id']}\nRemediation: {finding['remediation']}",
        "category": "security",
        "impact": 1 if finding['severity'] == 'CRITICAL' else 2,
        "urgency": 1 if finding['severity'] == 'CRITICAL' else 2,
        "assignment_group": "SOC",
        "caller_id": "CSPM Automation",
        "work_notes": f"Auto-created from CSPM. Finding ID: {finding['id']}"
    }
    
    response = requests.post(
        url,
        json=payload,
        auth=HTTPBasicAuth(username, password),
        headers={"Content-Type": "application/json", "Accept": "application/json"}
    )
    
    if response.status_code == 201:
        ticket = response.json()["result"]
        return ticket["sys_id"], ticket["number"]
    
    return None, None
```

## Slack/PagerDuty Alerting

### Slack Alert Templates
```json
{
  "CRITICAL": {
    "channel": "#security-critical",
    "message": {
      "blocks": [
        {
          "type": "header",
          "text": {"type": "plain_text", "text": "🔴 CRITICAL: CSPM Finding"}
        },
        {
          "type": "section",
          "fields": [
            {"type": "mrkdwn", "text": "*Rule:*\n{{rule_name}}"},
            {"type": "mrkdwn", "text": "*Resource:*\n<{{resource_url}}|{{resource_id}}>"},
            {"type": "mrkdwn", "text": "*Provider:*\n{{provider}}"},
            {"type": "mrkdwn", "text": "*Account:*\n{{account_id}}"}
          ]
        },
        {
          "type": "actions",
          "elements": [
            {"type": "button", "text": {"type": "plain_text", "text": "View in SIEM"}, "url": "{{siem_url}}"},
            {"type": "button", "text": {"type": "plain_text", "text": "Open Ticket"}, "url": "{{ticket_url}}"},
            {"type": "button", "text": {"type": "plain_text", "text": "Remediate Now", "style": "danger", "url": "{{remediation_url}}"}
          ]
        }
      ]
    }
  },
  "HIGH": {
    "channel": "#security-alerts",
    "message": {
      "blocks": [
        {
          "type": "section",
          "text": {"type": "mrkdwn", "text": "🟠 *HIGH* — {{rule_name}} on `{{resource_id}}`"}
        },
        {
          "type": "context",
          "elements": [
            {"type": "mrkdwn", "text": "{{provider}} | {{account_id}} | Ticket: {{ticket_number}}"}
          ]
        }
      ]
    }
  }
}
```

## Integration Architecture

```
┌──────────────┐     ┌──────────────┐     ┌─────────────────┐
│  CSPM Platform │────▶│  SIEM/Splunk │────▶│  Security Analyst │
│  (Wiz, Prisma) │     │  Azure Senti │     └─────────────────┘
└──────┬───────┘     └──────────────┘
       │                                 ┌─────────────────┐
       ├─────────────────────────────────▶│  SOAR/XSOAR      │
       │                                  │  Auto-remediate   │
       │                                  └────────┬─────────┘
       │                                           │
       │                                  ┌────────▼─────────┐
       ├─────────────────────────────────▶│  IT Ticketing     │
       │                                  │  Jira/ServiceNow  │
       │                                  └──────────────────┘
       │
       ├─────────────────────────────────▶│ Slack/PagerDuty
       │                                  │  Alerting
       └──────────────────────────────────┘
```

## Best Practices

1. **Severity mapping** — Align CSPM severity to SIEM/SOAR severity (Critical → P1, High → P2)
2. **Deduplication** — Deduplicate findings from multiple CSPM sources before SIEM ingestion
3. **Correlation rules** — Build SIEM rules that correlate CSPM findings with actual CloudTrail activity
4. **Rate limiting** — Limit SIEM ingestion to N events/second to avoid overwhelming the pipeline
5. **Tag enrichment** — Enrich findings with resource tags (owner, environment, cost-center) before ticketing
6. **Escalation paths** — P1 → PagerDuty + Slack, P2 → Slack + Jira, P3 → Jira only
7. **Feedback loop** — Remediated findings should auto-close tickets and resolve SIEM alerts
