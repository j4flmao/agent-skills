# Incident Response Management

## Incident Response Lifecycle (NIST SP 800-61)

The NIST Special Publication 800-61 (Revision 2) defines a four-phase incident response lifecycle that serves as the foundational framework for all IR operations.

### Phase 1: Preparation

Preparation encompasses all activities undertaken before an incident occurs to ensure the organization can respond effectively. This includes establishing incident response capability, acquiring and maintaining tools, developing playbooks and runbooks, conducting training, and performing exercises.

### Phase 2: Detection and Analysis

Detection involves identifying that an incident has occurred through monitoring, alerting, and reporting mechanisms. Analysis encompasses determining the scope, impact, and severity of the incident, including identifying affected systems, the nature of the attack, and the data or systems compromised.

### Phase 3: Containment, Eradication, and Recovery

Containment focuses on stopping the incident and preventing further damage. Eradication removes the root cause and attacker artifacts from the environment. Recovery restores affected systems to normal operation with appropriate monitoring for recurrence.

### Phase 4: Post-Incident Activity

Post-incident activity includes lessons learned, root cause analysis, evidence retention, report writing, process improvement, and legal/compliance obligations such as breach notification.

## Incident Response Team Structure

### CSIRT (Computer Security Incident Response Team)

A dedicated team responsible for receiving, analyzing, and responding to security incidents. CSIRTs can be internal, outsourced, or hybrid.

### CIRT (Computer Incident Response Team)

Similar to CSIRT, the term CIRT emphasizes the technical incident handling function. Often used interchangeably with CSIRT.

### SOC (Security Operations Center)

The operational hub for security monitoring and initial incident response. SOCs typically operate 24/7 and provide tiered analysis.

### Tier Structure

| Tier | Role | Responsibilities | Skills |
|------|------|------------------|--------|
| **Tier 1** | Triage Analyst | Monitor alerts, validate events, basic triage, escalate | SIEM operations, alert familiarity, communication |
| **Tier 2** | Incident Responder | Deep investigation, containment, evidence collection, remediation | Forensics, malware analysis, cloud IR, network analysis |
| **Tier 3** | Subject Matter Expert | Advanced malware analysis, reverse engineering, threat hunting, tool development | Exploit analysis, kernel forensics, custom tooling |

### Key Team Roles

**Incident Commander (IC):** The single point of authority during an incident. Responsible for coordinating response activities, making strategic decisions, and communicating with stakeholders.

**Scribe:** Maintains the incident timeline, documents actions taken, and preserves evidence chain of custody.

**Communications Lead:** Manages internal and external communications, including executive briefings, legal notifications, and PR statements.

**Technical Lead:** Oversees the technical response, including containment, eradication, and recovery operations.

**Legal Counsel:** Provides guidance on legal obligations, data breach notification laws, and evidence handling requirements.

## Preparation

### Playbooks

Playbooks are high-level procedural guides for specific incident types. They define the decision points, escalation criteria, and coordination required.

```yaml
# Phishing Incident Playbook Template
name: Phishing Incident Response
version: 2.1
trigger: User reports suspicious email or email security gateway alert

steps:
  - id: triage
    name: Initial Triage
    assigned: Tier 1 Analyst
    actions:
      - Verify email headers and URLs
      - Check if other users received the same email
      - Determine if any user clicked links or opened attachments
    decision:
      if: "Malicious content confirmed"
        goto: containment
      else:
        goto: false_positive

  - id: containment
    name: User Containment
    assigned: Tier 1 Analyst
    actions:
      - Disable affected user accounts
      - Reset passwords and invalidate sessions
      - Block sender domain at email gateway
      - Remove email from all mailboxes
    goto: investigation

  - id: investigation
    name: Deep Investigation
    assigned: Tier 2 Analyst
    actions:
      - Collect mailbox audit logs
      - Check for data exfiltration
      - Review authentication logs for abnormal activity
      - Check endpoints for malware installation
    goto: eradication
```

### Runbooks

Runbooks are detailed technical procedures for specific tasks within a playbook. They provide step-by-step instructions, command syntax, and verification steps.

```bash
#!/bin/bash
# Runbook: Isolate Windows Endpoint via EDR
# Usage: ./isolate-endpoint.sh <hostname>

HOSTNAME=$1

echo "[$(date)] Initiating isolation for $HOSTNAME"

# Step 1: Verify host exists in EDR platform
edr-cli host show --hostname "$HOSTNAME"
if [ $? -ne 0 ]; then
  echo "ERROR: Host not found in EDR"
  exit 1
fi

# Step 2: Isolate host from network
edr-cli host isolate --hostname "$HOSTNAME" --reason "Incident containment"

# Step 3: Verify isolation
ISOLATED=$(edr-cli host status --hostname "$HOSTNAME" --json | jq -r '.isolation_status')
if [ "$ISOLATED" != "isolated" ]; then
  echo "ERROR: Isolation failed"
  exit 1
fi

echo "[$(date)] Host $HOSTNAME successfully isolated"
```

### Communication Plans

A communication plan defines who is notified, when, and through what channels during each phase of an incident.

| Severity | Initial Notification | Update Frequency | Stakeholders |
|----------|---------------------|------------------|--------------|
| SEV1 | 15 minutes | Every 60 minutes | CISO, CEO, Legal, PR, Board |
| SEV2 | 1 hour | Every 4 hours | CISO, Security Lead, Engineering VP |
| SEV3 | 24 hours | Daily | Security Lead, Engineering Manager |
| SEV4 | Next business day | Weekly | Assigned owner |

### Training

- Security awareness training for all employees (annual minimum)
- Phishing simulation campaigns (quarterly)
- Technical IR training for SOC analysts (continuous)
- Cross-training to prevent single points of failure
- Certification programs: GIAC, SANS, CISSP, OSCP

### Tabletop Exercises

Tabletop exercises simulate incident scenarios in a discussion-based format to validate plans and improve team coordination.

```markdown
# Tabletop Exercise: Ransomware Scenario

## Scenario
At 09:00 Tuesday, the SOC detects ransomware encryption alerts on 50
workstations in the finance department. The encryption appears to be
propagating to file shares and database servers.

## Inject 1 (T+0 min)
- 50 endpoints reporting ransomware alerts
- File shares showing mass file renaming
What actions do you take in the first 15 minutes?

## Inject 2 (T+15 min)
- Ransom note demands 50 BTC
- Database server begins showing encryption activity
- CEO calls asking for status
Do you pay the ransom? How do you communicate with the CEO?

## Inject 3 (T+60 min)
- Backups for the finance department are also encrypted
- Attacker claims to have exfiltrated 2TB of data
- Legal confirms this may trigger data breach notification
What is your recovery strategy? What notifications are required?

## Evaluation Criteria
- Time to initial containment decision
- Communication completeness and accuracy
- Backup restoration plan viability
- Regulatory notification awareness
```

## Detection

### SIEM Rules

SIEM correlation rules detect patterns across multiple log sources.

```yaml
# SIEM Rule: Multiple Failed Logins Followed by Success
name: "Brute Force - Successful Authentication After Failures"
id: BRUTE-001
severity: HIGH
type: CORRELATION

conditions:
  - event: AUTHENTICATION_FAILURE
    count: ">= 10"
    timeframe: "5 minutes"
    source_ip: $ip

  - event: AUTHENTICATION_SUCCESS
    count: ">= 1"
    timeframe: "5 minutes"
    source_ip: $ip

response:
  - create_ticket: immediate
  - alert_soc: true
  - enriched_data:
      - geoip: $ip
      - reputation: $ip
      - previous_alerts: $ip
```

### IDS/IPS Detection

Signature-based and anomaly-based detection rules for network intrusion detection.

```yaml
# Suricata Rule: Cobalt Strike Beacon Detection
alert tcp $HOME_NET any -> $EXTERNAL_NET $HTTP_PORTS (
  msg:"MALWARE-CNC Cobalt Strike Beacon Detected";
  flow:to_server,established;
  content:"|00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00|";
  depth:16;
  offset:0;
  http_client_body;
  classtype:trojan-activity;
  sid:1000001;
  rev:1;
)
```

### EDR Detection

Endpoint Detection and Response (EDR) rules identify malicious behavior on endpoints.

```yaml
# EDR Detection Rule: LSASS Process Access
name: "Suspicious LSASS Access - Credential Dumping"
id: EDR-CRED-001
platform: windows
event_type: process_access

conditions:
  target_process: "lsass.exe"
  source_process_not_in:
    - "svchost.exe"
    - "winlogon.exe"
    - "lsm.exe"
    - "LogonUI.exe"
    - "csrss.exe"
  access_rights:
    - PROCESS_VM_READ
    - PROCESS_VM_WRITE

severity: HIGH
response: isolate_endpoint
```

### Log Analysis

Correlating logs from multiple sources provides investigative context.

```bash
#!/bin/bash
# Suspicious PowerShell Pipeline
# Search for encoded PowerShell commands across endpoints

# Query endpoint logs for base64-encoded PowerShell
grep -r "powershell.*-EncodedCommand" /var/log/endpoint/ | \
  grep -oP "([A-Za-z0-9+/]{40,}={0,2})" | \
  while read -r encoded; do
    decoded=$(echo "$encoded" | base64 -d 2>/dev/null)
    if echo "$decoded" | grep -qiE "(downloadstring|invoke-expression|mimikatz)"; then
      echo "ALERT: Suspicious encoded command found"
      echo "Encoded: $encoded"
      echo "Decoded: $decoded"
    fi
  done
```

### Threat Intelligence Feeds

Automated ingestion and correlation of threat intelligence data.

```python
# Threat Intelligence Feed Ingestion
import requests
import json
from datetime import datetime, timedelta

def fetch_misp_events(api_url, api_key, days=7):
    headers = {"Authorization": api_key, "Accept": "application/json"}
    params = {
        "limit": 1000,
        "page": 1,
        "published": 1,
        "timestamp": (datetime.now() - timedelta(days=days)).strftime("%s")
    }

    indicators = []
    while True:
        response = requests.get(f"{api_url}/events/index", headers=headers, params=params)
        response.raise_for_status()
        events = response.json()

        if not events:
            break

        for event in events:
            for attr in event.get("Attribute", []):
                indicator = {
                    "value": attr["value"],
                    "type": attr["type"],
                    "category": attr["category"],
                    "tlp": attr.get("distribution", 0),
                    "source": event["info"]
                }
                indicators.append(indicator)

        params["page"] += 1

    return indicators

def correlate_with_logs(indicators, log_stream):
    for log in log_stream:
        for indicator in indicators:
            if indicator["value"] in str(log):
                print(f"MATCH: {indicator['value']} found in log {log['id']}")
```

### User Reports

End users are often the first to detect anomalies. Establish clear reporting channels.

```
Reporting Channels:
- Email: security@company.com
- Slack: #security-reports channel
- Portal: https://security.company.com/report
- Phone: Security hotline (24/7)
- Ticketing: ServiceNow security incident form

Reporting Expectations:
- Users should report without fear of blame
- Reports acknowledged within 15 minutes during business hours
- Phishing reports auto-analyzed for campaign correlation
- Reporter receives closure notification
```

## Triage and Prioritization

### Severity Classification

| Priority | Severity | Definition | Examples |
|----------|----------|------------|----------|
| **P1** | Critical | Active data breach, ransomware, complete system compromise | Ransomware outbreak, unauthorized PII access, persistent threat actor access |
| **P2** | High | Significant compromise potential, active exploitation | Credential dumping detected, C2 beaconing confirmed, exploited vulnerability |
| **P3** | Medium | Indicators of compromise, policy violations | Suspicious logins, malware detected on isolated system, unauthorized access attempt |
| **P4** | Low | Informational, best practice violations | Failed scan, minor policy violation, low-priority vulnerability |
| **P5** | Informational | No immediate action required | Phishing training click, general inquiry |

### Impact vs Urgency Matrix

| Impact \ Urgency | High Urgency | Medium Urgency | Low Urgency |
|------------------|--------------|----------------|-------------|
| **High Impact** | P1 - Immediate escalation | P2 - Escalate within 1 hour | P3 - Standard response |
| **Medium Impact** | P2 - Escalate within 1 hour | P3 - Standard response | P4 - Low priority |
| **Low Impact** | P3 - Standard response | P4 - Low priority | P5 - Informational |

### SLA Definitions

| Priority | Initial Response | Triage Complete | Investigation Update | Resolution |
|----------|-----------------|-----------------|---------------------|------------|
| P1 | 15 minutes | 30 minutes | Every 60 minutes | 4 hours |
| P2 | 1 hour | 2 hours | Every 8 hours | 24 hours |
| P3 | 4 hours | 8 hours | Daily | 5 business days |
| P4 | 24 hours | 48 hours | Weekly | 30 days |
| P5 | 48 hours | 1 week | As needed | Backlog |

## Containment Strategies

### Short-Term Containment

Short-term containment focuses on immediately stopping the attack and preventing further damage.

```bash
#!/bin/bash
# Containment: Isolate AWS EC2 Instance
INSTANCE_ID=$1
REASON=$2

# Create security group that denies all traffic
aws ec2 create-security-group \
  --group-name "quarantine-${INSTANCE_ID}" \
  --description "Quarantine group for compromised instance"

# Apply quarantine security group to instance
aws ec2 modify-instance-attribute \
  --instance-id "$INSTANCE_ID" \
  --groups "sg-quarantine-${INSTANCE_ID}"

# Snapshot volumes for forensics
for volume in $(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].BlockDeviceMappings[*].Ebs.VolumeId' \
  --output text); do
  aws ec2 create-snapshot \
    --volume-id "$volume" \
    --description "Forensic snapshot - ${REASON}"
done
```

**Short-Term Containment Actions:**

- Isolate affected hosts (network quarantine via EDR)
- Block malicious IP addresses at firewall/WAF
- Disable compromised user accounts
- Revoke API keys and tokens
- Suspend cloud compute instances
- Block malicious domains at DNS/proxy
- Disable exposed services
- Take forensic snapshots of systems and volumes

### Long-Term Containment

Long-term containment maintains operational security while allowing investigation and eradication to proceed.

- Implement network segmentation for affected systems
- Deploy additional monitoring around containment boundary
- Create honeypots to observe attacker behavior
- Maintain containment while preserving business operations
- Implement application-level blocking rules
- Deploy virtual patching via WAF/IPS
- Create filtered network enclaves
- Implement additional access controls and approvals

## Eradication

### Root Cause Analysis

Root cause analysis identifies how the attacker gained initial access and the complete scope of compromise.

```
Investigation Checklist:
[ ] Initial access vector identified
[ ] All compromised accounts enumerated
[ ] All compromised systems identified
[ ] Persistence mechanisms discovered
[ ] Lateral movement paths mapped
[ ] Data exfiltration scope determined
[ ] Backdoor accounts and implants found
[ ] Timeline of attacker activities reconstructed
```

### Malware Removal

```powershell
# PowerShell: Automated Malware Removal Script
function Remove-MalwareArtifacts {
    param(
        [string[]]$FilePaths,
        [string[]]$RegistryKeys,
        [string[]]$ServiceNames,
        [string[]]$ScheduledTasks
    )

    Write-Host "[*] Removing malware artifacts from system"

    # Stop and remove malicious services
    foreach ($service in $ServiceNames) {
        try {
            Stop-Service -Name $service -Force -ErrorAction Stop
            sc.exe delete $service
            Write-Host "[+] Removed service: $service"
        } catch {
            Write-Host "[-] Failed to remove service: $service"
        }
    }

    # Delete malicious files
    foreach ($file in $FilePaths) {
        if (Test-Path $file) {
            Remove-Item -Path $file -Force -Recurse
            Write-Host "[+] Removed file: $file"
        }
    }

    # Remove registry persistence
    foreach ($key in $RegistryKeys) {
        try {
            Remove-Item -Path $key -Force -ErrorAction Stop
            Write-Host "[+] Removed registry key: $key"
        } catch {
            Write-Host "[-] Failed to remove registry key: $key"
        }
    }

    # Disable scheduled tasks
    foreach ($task in $ScheduledTasks) {
        Unregister-ScheduledTask -TaskName $task -Confirm:$false
        Write-Host "[+] Removed scheduled task: $task"
    }
}
```

### Patch Application

- Apply security patches to all affected systems
- Verify patch installation with vulnerability scanning
- Prioritize patches for exploited vulnerabilities
- Test patches in isolated environment before broad deployment
- Use automated patch management for consistent coverage
- Document patch exceptions with compensating controls

### System Hardening

After eradication, apply additional hardening measures to prevent recurrence.

```yaml
# System Hardening Checklist
target: windows_server_2019

hardening_items:
  - control: "Disable SMBv1"
    command: "Disable-WindowsOptionalFeature -Online -FeatureName smb1protocol"
    verify: "Get-SmbServerConfiguration | Select-Object EnableSMB1Protocol"

  - control: "Enable Windows Defender Credential Guard"
    command: "Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux"
    verify: "Get-ComputerInfo -Property DeviceGuard"

  - control: "Restrict PowerShell Execution Policy"
    command: "Set-ExecutionPolicy -ExecutionPolicy Restricted -Scope LocalMachine"
    verify: "Get-ExecutionPolicy -Scope LocalMachine"

  - control: "Enable Windows Event Log Auditing"
    command: "auditpol /set /subcategory:\"Process Creation\" /success:enable"
    verify: "auditpol /get /subcategory:\"Process Creation\""

  - control: "Block common phishing file types at email gateway"
    description: "Configure exchange transport rules to block .exe, .scr, .vbs attachments"
```

## Recovery

### System Restoration

- Restore systems from known-good backups
- Verify backup integrity before restoration
- Scan restored systems for any residual compromise
- Apply all security patches after restoration
- Change all passwords and rotate all cryptographic keys
- Reset service account credentials
- Regenerate API keys and tokens

### Validation Testing

```bash
#!/bin/bash
# Post-Recovery Validation Script

echo "[*] Validating system recovery for $HOSTNAME"

# Check endpoint protection is active
edr-cli host status --hostname "$HOSTNAME" | grep "protection: active"
if [ $? -ne 0 ]; then
  echo "ALERT: Endpoint protection not active"
  exit 1
fi

# Verify patches are installed
vuln-scanner host scan --hostname "$HOSTNAME" --severity CRITICAL
if [ $? -ne 0 ]; then
  echo "ALERT: Critical vulnerabilities still present"
  exit 1
fi

# Validate logging is functional
log-query --hostname "$HOSTNAME" --last 5 minutes | grep "heartbeat"
if [ $? -ne 0 ]; then
  echo "ALERT: System not sending logs"
  exit 1
fi

# Run security compliance check
inspec exec security-baseline --target "ssh://${HOSTNAME}"
echo "[+] Recovery validation complete for $HOSTNAME"
```

### Monitoring for Recurrence

- Implement enhanced monitoring for the specific IOCs identified
- Increase log retention for affected systems
- Deploy honeypots to detect re-entry attempts
- Monitor for the specific TTPs observed during the incident
- Implement behavioral analytics on restored systems
- Increase alerting sensitivity for the affected environment
- Conduct follow-up threat hunting

### Phased Rollout

1. Restore non-critical systems first
2. Validate monitoring and detection coverage
3. Restore business-critical systems with enhanced monitoring
4. Return user access in phased groups
5. Monitor each phase for 24-48 hours before proceeding
6. Conduct progressive rollback if abnormal activity detected

## Post-Incident Activity

### Lessons Learned

```
Post-Incident Review Meeting Agenda:
1. Incident timeline review (10 min)
2. What went well (15 min)
3. What went wrong (30 min)
4. Gaps identified (20 min)
5. Action items and owners (15 min)
6. Process improvement proposals (15 min)
7. Follow-up schedule (5 min)
```

### Root Cause Analysis Template

```markdown
# Root Cause Analysis Report

## Incident Summary
- **Incident ID:** IR-2026-001
- **Date/Time:** 2026-05-15 14:30 UTC
- **Severity:** P1
- **Type:** Ransomware

## Timeline
| Time (UTC) | Event |
|------------|-------|
| 14:30 | EDR alerts on 50 endpoints |
| 14:35 | Incident declared |
| 14:45 | Containment initiated |
| 15:15 | All affected hosts isolated |
| 16:00 | Root cause identified |
| 18:00 | Eradication phase started |
| 22:00 | Recovery phase started |
| 02:00 | Systems restored |

## Root Cause
Initial access gained through a phishing email targeting a finance
department employee. The attachment contained a VB-script that
downloaded LockBit ransomware. The user had local admin privileges,
allowing the ransomware to execute with elevated permissions.

## Contributing Factors
1. User had unnecessary local admin privileges
2. Email gateway did not block .vbs attachments
3. No application allowlisting on endpoints
4. Backups lacked immutability
5. Insufficient network segmentation

## Action Items
| ID | Action | Owner | Due Date | Status |
|----|--------|-------|----------|--------|
| RCA-001 | Remove local admin from standard users | IAM Team | 2026-05-22 | Open |
| RCA-002 | Block script attachments at email gateway | Security Eng | 2026-05-18 | Closed |
| RCA-003 | Implement app allowlisting | Endpoint Team | 2026-06-01 | Open |
| RCA-004 | Implement immutable backup solution | Infra Team | 2026-06-15 | Open |
| RCA-005 | Segment network into security zones | Network Team | 2026-07-01 | Open |
```

### Incident Report Template

```markdown
# Incident Report: IR-2026-001

## Classification
- **Severity:** P1
- **Category:** Malware / Ransomware
- **Status:** Closed

## Executive Summary
On May 15, 2026, the organization experienced a LockBit ransomware
incident affecting 50 workstations and 2 file servers in the finance
department. Rapid containment prevented spread to additional systems.
No customer data was exfiltrated. The root cause was a phishing email
that exploited a user with excessive privileges.

## Impact Assessment
- **Systems Affected:** 50 workstations, 2 file servers
- **Data Compromised:** No customer data exfiltrated
- **Downtime:** 12 hours for finance department
- **Financial Impact:** $50,000 (incident response + recovery)

## Response Summary
- T+0:00 - Alert received
- T+0:05 - Triage initiated
- T+0:15 - Incident declared (P1)
- T+0:25 - Containment started
- T+0:55 - All affected hosts isolated
- T+1:30 - Root cause identified
- T+3:30 - Eradication phase completed
- T+7:30 - Systems restored
- T+12:00 - Business operations normalized

## Evidence Collected
- Memory captures from 10 affected hosts
- Disk images of 5 affected workstations
- Email sample with malicious attachment
- Network packet captures
- EDR telemetry logs
- SIEM correlation records

## Recommendations
1. Remove local admin rights from standard users
2. Implement application allowlisting
3. Deploy immutable backup solution
4. Segment network with zero-trust architecture
5. Enhance email security gateway rules
```

## Communication

### Internal Stakeholder Communication

| Audience | Channel | Frequency | Content |
|----------|---------|-----------|---------|
| SOC Team | Slack / PagerDuty | Real-time | Technical details, action items |
| Security Leadership | Slack / Phone | As needed | Decision requests, status updates |
| CISO | Phone | Immediate escalation | Severity, impact, resource needs |
| CEO / Board | Email / Briefing | Per IR plan | Business impact, regulatory risk |
| Affected Business Units | Email / Meeting | Per shift | Operational impact, expected recovery |
| All Employees | Email / Intranet | As needed | Awareness, precautionary guidance |

### Executive Briefing Template

```markdown
# Executive Incident Briefing

## Current Status
**Active incident:** [YES/NO]
**Severity:** [P1-P5]
**Duration:** [X hours]

## Incident Overview
- What happened (one paragraph)
- When it started and was detected
- Which systems and data are affected

## Business Impact
- Operational impact (systems, services, teams affected)
- Customer impact (data exposure, service disruption)
- Financial impact (IR costs, potential fines, revenue loss)
- Regulatory implications (breach notification obligations)

## Response Status
- Current phase (containment, eradication, recovery)
- Actions taken
- Remaining work
- Estimated resolution timeline

## Resource Needs
- Personnel (internal and external)
- Tools or licenses
- Budget authority
- Vendor engagement

## Recommendations
- Critical decisions needed from executive
- Communication strategy
- Public disclosure plan (if applicable)
```

### Legal Counsel and PR Communication

- Engage legal counsel before any external communication
- Coordinate with PR for public statements, regulatory filings
- Preserve attorney-client privilege on investigation findings
- Do not share technical details publicly that aid attackers
- Prepare Q&A documents for customer inquiries
- Brief customer success teams on talking points
- File regulatory notifications per applicable laws

## Legal and Compliance

### Chain of Custody

Every piece of evidence must be tracked with a documented chain of custody to ensure admissibility in legal proceedings.

```markdown
# Chain of Custody Record

## Evidence Information
- **Evidence ID:** EVD-2026-001
- **Description:** Forensic disk image of finance-workstation-42
- **Source System:** finance-workstation-42.example.com
- **Acquisition Tool:** FTK Imager 4.5
- **Hash (MD5):** a1b2c3d4e5f6...
- **Hash (SHA256):** a1b2c3d4e5f6a1b2c3d4e5f6...

## Chain of Custody
| Date | Time | Custodian | Action | Purpose |
|------|------|-----------|--------|---------|
| 2026-05-15 | 15:30 | Jane Smith (IR) | Acquired | Forensic acquisition |
| 2026-05-15 | 15:30 | Jane Smith (IR) | Transferred | To secure evidence locker |
| 2026-05-15 | 16:00 | Bob Chen (Forensics) | Received | Analysis |
| 2026-05-16 | 10:00 | Bob Chen (Forensics) | Returned | To secure evidence locker |
| 2026-05-17 | 09:00 | Alice Lee (Legal) | Reviewed | Legal review |

## Signatures
- **Acquired by:** ___________________
- **Received by:** ___________________
- **Witness:** ___________________
```

### Evidence Handling

- Maintain a secure evidence locker (physical and digital)
- Use write blockers for all forensic acquisitions
- Generate cryptographic hashes before any analysis
- Document all analysis steps for reproducibility
- Maintain an evidence tracking system
- Restrict evidence access to authorized personnel
- Follow jurisdictional evidence handling requirements

### Data Breach Notification Laws

| Regulation | Notification Trigger | Timeline | Notification To |
|------------|---------------------|----------|-----------------|
| GDPR Art. 33 | Personal data breach | 72 hours | Supervisory authority |
| GDPR Art. 34 | High risk to individuals | Without undue delay | Affected individuals |
| HIPAA Breach Rule | Unsecured PHI breach | 60 days | HHS, affected individuals |
| PCI DSS Req 12.10 | Cardholder data compromise | Immediately | Acquirer, card brands |
| CCPA | Personal information breach | Without undue delay | California residents |
| SOX | Material cybersecurity event | 4 business days (8-K) | SEC |
| State laws (US) | Varies by state | Typically 30-60 days | State AG, affected residents |
| PIPEDA (Canada) | Real risk of harm breach | As soon as possible | OPC, affected individuals |
| Notifiable Data Breaches (AU) | Likely to cause serious harm | As soon as practicable | OAIC, affected individuals |

### E-Discovery

- Preserve all relevant logs, emails, and documents
- Coordinate with legal hold processes
- Use collection tools that maintain metadata
- Document preservation decisions
- Provide collected data in standard formats (PDF, TIFF, native)
- Coordinate with external e-discovery vendors
- Maintain data preservation throughout litigation hold

## Cloud Incident Response

### AWS Incident Response

```python
# AWS Incident Response Automation
import boto3
from datetime import datetime

def isolate_compromised_instance(instance_id, region):
    ec2 = boto3.client("ec2", region_name=region)

    # Create quarantine security group
    sg = ec2.create_security_group(
        GroupName=f"quarantine-{instance_id}",
        Description=f"Quarantine for compromised instance {instance_id}"
    )

    # Deny all inbound and outbound traffic
    ec2.authorize_security_group_ingress(
        GroupId=sg["GroupId"],
        IpPermissions=[{
            "IpProtocol": "-1",
            "FromPort": -1,
            "ToPort": -1,
            "IpRanges": []
        }]
    )

    ec2.authorize_security_group_egress(
        GroupId=sg["GroupId"],
        IpPermissions=[{
            "IpProtocol": "-1",
            "FromPort": -1,
            "ToPort": -1,
            "IpRanges": []
        }]
    )

    # Apply quarantine security group
    ec2.modify_instance_attribute(
        InstanceId=instance_id,
        Groups=[sg["GroupId"]]
    )

    # Snapshot all EBS volumes
    volumes = ec2.describe_instance_attribute(
        InstanceId=instance_id,
        Attribute="blockDeviceMapping"
    )["BlockDeviceMappings"]

    snapshot_ids = []
    for mapping in volumes:
        if "Ebs" in mapping:
            snapshot = ec2.create_snapshot(
                VolumeId=mapping["Ebs"]["VolumeId"],
                Description=f"Forensic snapshot - {instance_id} - {datetime.now().isoformat()}"
            )
            snapshot_ids.append(snapshot["SnapshotId"])

    return {
        "quarantine_sg_id": sg["GroupId"],
        "snapshot_ids": snapshot_ids,
        "instance_id": instance_id,
        "isolation_time": datetime.now().isoformat()
    }


def disable_iam_credentials(user_name):
    iam = boto3.client("iam")

    # Disable access keys
    for key in iam.list_access_keys(UserName=user_name)["AccessKeyMetadata"]:
        iam.update_access_key(
            UserName=user_name,
            AccessKeyId=key["AccessKeyId"],
            Status="Inactive"
        )

    # Disable console password
    try:
        iam.delete_login_profile(UserName=user_name)
    except iam.exceptions.NoSuchEntityException:
        pass

    # Remove from groups
    for group in iam.list_groups_for_user(UserName=user_name)["Groups"]:
        iam.remove_user_from_group(
            GroupName=group["GroupName"],
            UserName=user_name
        )

    return {"user": user_name, "status": "disabled"}
```

**AWS-Specific IR Considerations:**

- CloudTrail for API-level audit logging
- GuardDuty for threat detection
- Detective for investigative analysis
- Security Hub for centralized findings
- VPC Flow Logs for network traffic analysis
- S3 access logs for data access investigation
- Lambda for automated response actions
- Systems Manager for remote forensics

### Azure Incident Response

```powershell
# PowerShell: Azure Incident Response Actions
function Stop-AzureCompromisedVM {
    param(
        [string]$ResourceGroup,
        [string]$VMName
    )

    # Stop the VM
    Stop-AzVM -ResourceGroupName $ResourceGroup -Name $VMName -Force

    # Apply network security group to block all traffic
    $nsg = New-AzNetworkSecurityGroup `
        -ResourceGroupName $ResourceGroup `
        -Location (Get-AzVM -ResourceGroupName $ResourceGroup -Name $VMName).Location `
        -Name "quarantine-nsg-$VMName"

    # Deny all inbound rules
    $nsg | Add-AzNetworkSecurityRuleConfig `
        -Name "DenyAllInbound" `
        -Access Deny `
        -Protocol "*" `
        -Direction Inbound `
        -Priority 100 `
        -SourceAddressPrefix "*" `
        -SourcePortRange "*" `
        -DestinationAddressPrefix "*" `
        -DestinationPortRange "*" | Set-AzNetworkSecurityGroup

    # Apply NSG to VM NIC
    $nic = Get-AzVM -ResourceGroupName $ResourceGroup -Name $VMName | `
        Select-Object -ExpandProperty NetworkProfile | `
        Select-Object -ExpandProperty NetworkInterfaces

    $nic[0].Id.Split("/")[-1] | ForEach-Object {
        $nicObj = Get-AzNetworkInterface -ResourceGroupName $ResourceGroup -Name $_
        $nicObj.NetworkSecurityGroup = $nsg
        $nicObj | Set-AzNetworkInterface
    }

    # Create forensic disk snapshot
    $vm = Get-AzVM -ResourceGroupName $ResourceGroup -Name $VMName
    foreach ($disk in $vm.StorageProfile.OsDisk + $vm.StorageProfile.DataDisks) {
        $snapshotConfig = New-AzSnapshotConfig `
            -SourceUri $disk.ManagedDisk.Id `
            -Location $vm.Location `
            -CreateOption Copy
        New-AzSnapshot `
            -ResourceGroupName $ResourceGroup `
            -SnapshotName "$($disk.Name)-forensic-$(Get-Date -Format yyyyMMddHHmm)" `
            -Snapshot $snapshotConfig
    }
}
```

**Azure-Specific IR Considerations:**

- Azure Sentinel for SIEM/SOAR
- Microsoft Defender for Cloud for CSPM
- Azure Activity Log for control plane audit
- Azure AD sign-in logs for identity investigation
- NSG Flow Logs for network analysis
- Azure Key Vault for key rotation
- Azure Automation for response orchestration
- Microsoft Defender for Identity for on-prem AD

### GCP Incident Response

```python
# GCP Incident Response Functions
from google.cloud import compute_v1
from google.cloud import logging as cloud_logging

def isolate_gcp_instance(project_id, zone, instance_name):
    instances_client = compute_v1.InstancesClient()

    # Stop the instance
    instances_client.stop(
        project=project_id,
        zone=zone,
        instance=instance_name
    )

    # Create snapshot of all attached disks
    instance = instances_client.get(
        project=project_id,
        zone=zone,
        instance=instance_name
    )

    snapshots = []
    disks_client = compute_v1.DisksClient()
    for disk in instance.disks:
        snapshot_name = f"{disk.source.split('/')[-1]}-forensic"
        snapshot = compute_v1.Snapshot()
        snapshot.name = snapshot_name
        snapshot.source_disk = disk.source

        operation = disks_client.create_snapshot(
            project=project_id,
            zone=zone,
            disk=disk.source.split("/")[-1],
            snapshot_resource=snapshot
        )
        snapshots.append(snapshot_name)

    # Remove the instance from any load balancer target pools
    # Apply firewall tag to isolate from network
    tags = compute_v1.Tags()
    tags.items = ["isolated-instance"]
    instances_client.set_tags(
        project=project_id,
        zone=zone,
        instance=instance_name,
        tags_resource=tags
    )

    return {
        "instance": instance_name,
        "snapshots": snapshots,
        "status": "isolated"
    }


def query_gcp_logs(project_id, filter_str, hours=24):
    from datetime import timezone, timedelta

    logging_client = cloud_logging.Client(project=project_id)
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(hours=hours)

    entries = []
    for entry in logging_client.list_entries(
        filter_=filter_str,
        order_by=cloud_logging.DESCENDING
    ):
        entries.append({
            "timestamp": entry.timestamp.isoformat(),
            "resource": entry.resource.type if entry.resource else None,
            "severity": entry.severity,
            "payload": entry.payload,
            "labels": entry.labels
        })

    return entries
```

**GCP-Specific IR Considerations:**

- Cloud Audit Logs for API activity
- Cloud Armor for WAF/DDoS protection
- Security Command Center for threat detection
- Event Threat Detection for suspicious activity
- Chronicle Security for SIEM
- VPC Flow Logs for network analysis
- Cloud Functions for automated response
- Forseti Security for policy enforcement

### Shared Responsibility Model

| Layer | AWS | Azure | GCP | Customer |
|-------|-----|-------|-----|----------|
| Physical Security | Provider | Provider | Provider | — |
| Network Infrastructure | Provider | Provider | Provider | — |
| Hypervisor | Provider | Provider | Provider | — |
| Operating System | Shared | Shared | Shared | Customer |
| Application | Customer | Customer | Customer | Customer |
| Data | Customer | Customer | Customer | Customer |
| Access Management | Customer | Customer | Customer | Customer |
| Network Config | Shared | Shared | Shared | Customer |
| Encryption | Shared | Shared | Shared | Customer |

### Cloud Forensics

- Use cloud-native forensic tools (AWS Disk Forensic, Azure Disk Forensic)
- Capture memory from running instances before shutdown
- Snapshot all block storage for offline analysis
- Preserve CloudTrail/Activity Log/Audit Log data
- Collect VPC Flow Logs for network timeline
- Preserve container logs and orchestration metadata
- Document API call sequences for attack reconstruction
- Use forensic AMIs/images for analysis environments

## Endpoint Forensics

### Disk Imaging

```bash
#!/bin/bash
# Forensic Disk Imaging with dd and hashing

SOURCE_DEVICE="/dev/sda"
OUTPUT_IMAGE="/evidence/forensic_image.dd"
LOG_FILE="/evidence/acquisition.log"

echo "[$(date)] Starting forensic acquisition" | tee "$LOG_FILE"

# Verify write blocker
if [ ! -f "/dev/write_blocker_enabled" ]; then
    echo "ERROR: Write blocker not detected" | tee -a "$LOG_FILE"
    exit 1
fi

# Capture source device information
echo "Source: $(lsblk $SOURCE_DEVICE)" | tee -a "$LOG_FILE"
echo "Source size: $(blockdev --getsize64 $SOURCE_DEVICE) bytes" | tee -a "$LOG_FILE"

# Pre-acquisition hash
echo "[$(date)] Computing pre-acquisition hash..." | tee -a "$LOG_FILE"
PRE_HASH=$(sha256sum "$SOURCE_DEVICE" | cut -d' ' -f1)
echo "Pre-acquisition SHA256: $PRE_HASH" | tee -a "$LOG_FILE"

# Acquire disk image
echo "[$(date)] Starting dd acquisition..." | tee -a "$LOG_FILE"
dd if="$SOURCE_DEVICE" of="$OUTPUT_IMAGE" bs=4M conv=noerror,sync status=progress 2>&1 | tee -a "$LOG_FILE"

# Post-acquisition hash
echo "[$(date)] Computing post-acquisition hash..." | tee -a "$LOG_FILE"
POST_HASH=$(sha256sum "$OUTPUT_IMAGE" | cut -d' ' -f1)
echo "Post-acquisition SHA256: $POST_HASH" | tee -a "$LOG_FILE"

# Verify hashes match
if [ "$PRE_HASH" == "$POST_HASH" ]; then
    echo "[$(date)] Hash verification PASSED" | tee -a "$LOG_FILE"
else
    echo "[$(date)] Hash verification FAILED" | tee -a "$LOG_FILE"
    exit 1
fi

echo "[$(date)] Acquisition complete. Image: $OUTPUT_IMAGE" | tee -a "$LOG_FILE"
```

### Memory Acquisition

```bash
#!/bin/bash
# Memory Acquisition with LiME (Linux)

echo "[$(date)] Starting memory acquisition"
ACQUISITION_DIR="/evidence/memory"
mkdir -p "$ACQUISITION_DIR"

# Use LiME for memory acquisition
insmod lime.ko "path=${ACQUISITION_DIR}/memory.dump format=raw"

# Generate hash
sha256sum "${ACQUISITION_DIR}/memory.dump" > "${ACQUISITION_DIR}/memory.dump.sha256"

echo "[$(date)] Memory acquisition complete"
echo "File: ${ACQUISITION_DIR}/memory.dump"
echo "Size: $(ls -lh ${ACQUISITION_DIR}/memory.dump | awk '{print $5}')"
```

```powershell
# PowerShell: Windows Memory Acquisition with WinPmem
$acquisitionDir = "C:\Evidence\Memory"
New-Item -ItemType Directory -Path $acquisitionDir -Force

# Download and execute WinPmem
$winpmemUrl = "https://github.com/Velocidex/c-aff4/releases/latest/download/winpmem.exe"
$winpmemPath = "$acquisitionDir\winpmem.exe"

Invoke-WebRequest -Uri $winpmemUrl -OutFile $winpmemPath

# Acquire memory
& $winpmemPath "$acquisitionDir\memory.raw"

# Generate hash
$hash = Get-FileHash -Path "$acquisitionDir\memory.raw" -Algorithm SHA256
$hash.Hash | Out-File -FilePath "$acquisitionDir\memory.raw.sha256"

Write-Host "Memory acquisition complete"
Write-Host "File: $acquisitionDir\memory.raw"
```

### Volatile Data Collection

```powershell
# PowerShell: Windows Volatile Data Collection
$outputDir = "C:\Evidence\$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $outputDir -Force

function Collect-VolatileData {
    param([string]$OutputDir)

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC"
    "Collection started: $timestamp" | Out-File "$OutputDir\collection_info.txt"

    # Running processes
    Get-Process | Format-Table -AutoSize | Out-File "$OutputDir\running_processes.txt"
    Get-WmiObject Win32_Process | Select-Object ProcessId, Name, CommandLine | `
        Format-Table -AutoSize | Out-File "$OutputDir\process_detail.txt"

    # Network connections
    netstat -ano | Out-File "$OutputDir\netstat.txt"

    # Active network interfaces
    Get-NetAdapter | Out-File "$OutputDir\network_adapters.txt"

    # ARP cache
    arp -a | Out-File "$OutputDir\arp_cache.txt"

    # Routing table
    route print | Out-File "$OutputDir\routing_table.txt"

    # Logged-in users
    query user | Out-File "$OutputDir\logged_in_users.txt"

    # Scheduled tasks
    schtasks /query /fo CSV /v | Out-File "$OutputDir\scheduled_tasks.csv"

    # Service list
    Get-Service | Format-Table -AutoSize | Out-File "$OutputDir\services.txt"

    # Auto-start locations
    Get-CimInstance Win32_StartupCommand | Format-Table -AutoSize | `
        Out-File "$OutputDir\startup_commands.txt"

    # Open files and handles
    Get-ChildItem -Path "HKLM:\SYSTEM\CurrentControlSet\Services" | `
        Out-File "$OutputDir\driver_services.txt"

    Write-Host "Volatile data collected to: $OutputDir"
}

Collect-VolatileData -OutputDir $outputDir
```

### Timeline Analysis

Timeline analysis reconstructs the sequence of events on a system.

```bash
#!/bin/bash
# Timeline Creation with fls and mactime

EVIDENCE_IMAGE=$1
BODY_FILE="/evidence/body.txt"
TIMELINE_FILE="/evidence/timeline.csv"

# Create body file from disk image
fls -r -m "/" -o 2048 "$EVIDENCE_IMAGE" > "$BODY_FILE"

# Generate timeline
mactime -b "$BODY_FILE" -d -z "UTC" > "$TIMELINE_FILE"

echo "Timeline generated: $TIMELINE_FILE"
echo "Extract specific timeframes:"
echo "  grep 'May 2026' $TIMELINE_FILE"
echo "  awk -F',' '\$1 >= \"2026-05-15\" && \$1 <= \"2026-05-16\"' $TIMELINE_FILE"
```

**Key Timeline Analysis Techniques:**

- Super timeline creation (body file + additional artifacts)
- MFT ($MFT) analysis for file system activity
- Prefetch files for application execution history
- Event logs for system and security events
- Registry hives (SYSTEM, SOFTWARE, SAM, NTUSER.DAT) for configuration changes
- Browser history and cache for user activity
- $LogFile and $UsnJrnl for file system journal
- Amcache and Shimcache for application execution

## Network Forensics

### Packet Capture

```bash
#!/bin/bash
# Network Packet Capture for Incident Response

INTERFACE="eth0"
CAPTURE_DIR="/evidence/network"
CAPTURE_FILE="${CAPTURE_DIR}/incident_capture.pcap"
FILTER="not arp and not icmp"

mkdir -p "$CAPTURE_DIR"

# Start capture
echo "[$(date)] Starting packet capture on $INTERFACE"
tcpdump -i "$INTERFACE" -s 0 -w "$CAPTURE_FILE" \
  -C 200 -W 10 \
  "$FILTER" &

TCPDUMP_PID=$!
echo "$TCPDUMP_PID" > "${CAPTURE_DIR}/tcpdump.pid"
echo "[$(date)] tcpdump PID: $TCPDUMP_PID"

# Capture for analysis duration
sleep 3600

# Stop capture
kill $TCPDUMP_PID
echo "[$(date)] Packet capture complete"

# Verify capture
capinfos "$CAPTURE_FILE"
```

### NetFlow Analysis

```python
# NetFlow Data Analysis for Lateral Movement Detection
import subprocess
import json

def analyze_netflow(pcap_file, suspicious_ips):
    """Analyze network flows for suspicious activity."""

    # Extract flows using nfdump
    result = subprocess.run(
        ["nfdump", "-r", pcap_file, "-o", "json", "-q"],
        capture_output=True, text=True
    )

    flows = []
    for line in result.stdout.strip().split("\n"):
        try:
            flow = json.loads(line)
            flows.append(flow)
        except json.JSONDecodeError:
            continue

    # Identify suspicious flows
    suspicious_flows = []
    for flow in flows:
        src_ip = flow.get("src_ip", "")
        dst_ip = flow.get("dst_ip", "")
        src_port = flow.get("src_port", 0)
        dst_port = flow.get("dst_port", 0)
        bytes_xfer = flow.get("bytes", 0)

        # Check for data exfiltration (large outbound transfers)
        if src_ip in suspicious_ips and dst_port in [80, 443, 53]:
            if bytes_xfer > 10_000_000:  # > 10MB
                suspicious_flows.append({
                    "type": "data_exfiltration",
                    "src_ip": src_ip,
                    "dst_ip": dst_ip,
                    "bytes": bytes_xfer,
                    "protocol": flow.get("protocol"),
                    "dst_port": dst_port
                })

        # Check for C2 beaconing (regular intervals)
        # Lateral movement to new subnets
        if src_ip in suspicious_ips:
            subnet = ".".join(dst_ip.split(".")[:3])
            src_subnet = ".".join(src_ip.split(".")[:3])
            if subnet != src_subnet:
                suspicious_flows.append({
                    "type": "lateral_movement",
                    "src_ip": src_ip,
                    "dst_ip": dst_ip,
                    "dst_port": dst_port,
                    "protocol": flow.get("protocol")
                })

    return suspicious_flows
```

### DNS Log Analysis

```python
# DNS Query Analysis for C2 Detection
import re
from collections import Counter

SUSPICIOUS_DOMAIN_PATTERNS = [
    r"[a-z0-9]{25,}\.(com|net|org)",        # Long random subdomains
    r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\.", # IP as subdomain (DGA)
    r"(\.(xyz|top|club|work|click))$",        # High-risk TLDs
    r"(\.(tk|ml|ga|cf|gq))$",                 # Free TLDs
]

def analyze_dns_logs(log_file):
    queries = Counter()
    suspicious = []

    with open(log_file) as f:
        for line in f:
            match = re.search(r"QUERY:\s+(\S+)", line)
            if match:
                domain = match.group(1).lower()
                queries[domain] += 1

                # Check against suspicious patterns
                for pattern in SUSPICIOUS_DOMAIN_PATTERNS:
                    if re.search(pattern, domain):
                        suspicious.append({
                            "domain": domain,
                            "count": queries[domain],
                            "pattern": pattern,
                            "reason": "Suspicious domain structure"
                        })

                # Check for high query frequency (beaconing)
                if queries[domain] > 100:  # threshold
                    suspicious.append({
                        "domain": domain,
                        "count": queries[domain],
                        "reason": "High query frequency - possible beaconing"
                    })

    # Check for NXDOMAIN responses (DGA probing)
    nxdomain = Counter()
    with open(log_file) as f:
        for line in f:
            if "NXDOMAIN" in line:
                match = re.search(r"QUERY:\s+(\S+)", line)
                if match:
                    nxdomain[match.group(1)] += 1

    high_nx = [d for d, c in nxdomain.items() if c > 20]
    for domain in high_nx:
        suspicious.append({
            "domain": domain,
            "count": nxdomain[domain],
            "reason": "High NXDOMAIN rate - possible DGA probing"
        })

    return suspicious
```

### Proxy Logs

Key artifacts to analyze in proxy logs:

- User-agent strings (identify tools, malware variants)
- Destination URLs and domains
- Upload/download sizes (exfiltration detection)
- Time of access patterns (unusual hours)
- Content types requested
- Authentication patterns
- Referrer headers
- Response status codes

### Firewall Logs

```python
# Firewall Log Analysis
def analyze_firewall_logs(log_file):
    findings = []
    denied_counts = {}

    with open(log_file) as f:
        for line in f:
            parts = line.split()

            # Parse common firewall log format
            # Example: src_ip, dst_ip, dst_port, action, protocol
            if len(parts) < 5:
                continue

            src_ip = parts[0]
            dst_ip = parts[1]
            dst_port = parts[2]
            action = parts[3]
            protocol = parts[4]

            # Track denied outbound connections
            if action == "DENY" and protocol == "TCP":
                if dst_port in ["445", "139", "3389"]:
                    key = f"{src_ip}:{dst_ip}:{dst_port}"
                    denied_counts[key] = denied_counts.get(key, 0) + 1

            # Track outbound to known bad IPs
            if check_threat_intel(dst_ip):
                findings.append({
                    "type": "known_bad_ip",
                    "src_ip": src_ip,
                    "dst_ip": dst_ip,
                    "timestamp": parts[4] if len(parts) > 4 else "unknown"
                })

    # Identify lateral movement attempts (excessive denied SMB/RDP)
    for key, count in denied_counts.items():
        if count > 50:  # threshold for brute force
            src, dst, port = key.split(":")
            findings.append({
                "type": "lateral_movement_attempt",
                "src_ip": src,
                "dst_ip": dst,
                "port": port,
                "attempts": count
            })

    return findings
```

## Malware Analysis

### Static Analysis

Static analysis examines malware without executing it.

```python
# Static Malware Analysis
import pefile
import hashlib
import requests

def static_pe_analysis(file_path):
    results = {}

    # File hashes
    with open(file_path, "rb") as f:
        data = f.read()
    results["md5"] = hashlib.md5(data).hexdigest()
    results["sha1"] = hashlib.sha1(data).hexdigest()
    results["sha256"] = hashlib.sha256(data).hexdigest()

    # PE analysis
    try:
        pe = pefile.PE(file_path)
        results["entry_point"] = hex(pe.OPTIONAL_HEADER.AddressOfEntryPoint)
        results["image_base"] = hex(pe.OPTIONAL_HEADER.ImageBase)
        results["subsystem"] = pe.OPTIONAL_HEADER.Subsystem
        results["compile_time"] = pe.FILE_HEADER.TimeDateStamp

        # DLL imports
        imports = []
        for entry in pe.DIRECTORY_ENTRY_IMPORT:
            for imp in entry.imports:
                imports.append({
                    "dll": entry.dll.decode(),
                    "function": imp.name.decode() if imp.name else f"ordinal_{imp.ordinal}"
                })
        results["imports"] = imports

        # Sections
        sections = []
        for section in pe.sections:
            sections.append({
                "name": section.Name.decode().rstrip("\x00"),
                "virtual_size": hex(section.SizeOfRawData),
                "entropy": section.get_entropy(),
                "characteristics": hex(section.Characteristics)
            })
        results["sections"] = sections

        # Suspicious indicators
        results["suspicious_imports"] = []
        suspicious_api = [
            "CreateRemoteThread", "WriteProcessMemory", "VirtualAllocEx",
            "CreateService", "RegSetValue", "ShellExecute",
            "URLDownloadToFile", "WinExec", "system"
        ]
        for imp in imports:
            if imp["function"] in suspicious_api:
                results["suspicious_imports"].append(imp)

        # High entropy sections (packed)
        results["packed"] = any(s["entropy"] > 7.0 for s in sections)

    except Exception as e:
        results["pe_error"] = str(e)

    return results
```

### Dynamic Analysis

- Execute malware in a controlled sandbox environment
- Monitor registry changes, file system modifications, network connections
- Capture process creation chain
- Record API calls
- Analyze behavior under different conditions
- Use tools: Cuckoo/CAPE sandbox, ANY.RUN, Joe Sandbox

### Sandbox Execution

```python
# CAPE Sandbox Submission Script
import requests
import json

def submit_to_cape(api_url, api_key, file_path):
    headers = {"Authorization": f"Token {api_key}"}

    with open(file_path, "rb") as f:
        files = {"file": (file_path, f)}
        response = requests.post(
            f"{api_url}/tasks/create/file/",
            headers=headers,
            files=files,
            data={
                "timeout": 120,
                "enforce_timeout": True,
                "full_network": False,
                "custom": "Incident response analysis"
            }
        )

    return response.json()


def get_analysis_results(api_url, api_key, task_id):
    headers = {"Authorization": f"Token {api_key}"}
    response = requests.get(
        f"{api_url}/tasks/report/{task_id}/",
        headers=headers
    )

    report = response.json()

    # Extract key findings
    results = {
        "signatures": [],
        "network": [],
        "processes": [],
        "files": []
    }

    for signature in report.get("signatures", []):
        results["signatures"].append({
            "name": signature.get("name"),
            "severity": signature.get("severity"),
            "description": signature.get("description")
        })

    for conn in report.get("network", {}).get("tcp", []):
        results["network"].append({
            "dst_ip": conn.get("dst"),
            "dst_port": conn.get("dport"),
            "state": conn.get("state")
        })

    return results
```

### Reverse Engineering Basics

- Disassembly: IDA Pro, Ghidra, Binary Ninja, Radare2
- Decompilation: Hex-Rays, Ghidra decompiler
- Debugging: x64dbg, OllyDbg, WinDbg
- API monitoring: API Monitor, ProcMon, Process Hacker
- Network monitoring: Wireshark, Fiddler, Burp Suite
- Key techniques: unpacking, anti-analysis bypass, string extraction, control flow analysis

## Threat Intelligence Integration

### STIX/TAXII

```python
# TAXII Client for Threat Intelligence Feed Ingestion
from taxii2client import Collection
import json

def fetch_indicators(taxii_url, username, password, collection_id):
    collection = Collection(
        f"{taxii_url}/collections/{collection_id}",
        user=username,
        password=password
    )

    indicators = []
    for bundle in collection.get_objects():
        for obj in bundle.get("objects", []):
            if obj.get("type") == "indicator":
                pattern = obj.get("pattern", "")
                # STIX pattern example:
                # [file:hashes.MD5 = 'd41d8cd98f00b204e9800998ecf8427e']

                indicator = {
                    "id": obj["id"],
                    "pattern": pattern,
                    "created": obj.get("created"),
                    "modified": obj.get("modified"),
                    "valid_from": obj.get("valid_from"),
                    "labels": obj.get("labels", []),
                    "confidence": obj.get("confidence", 50),
                    "indicator_types": obj.get("indicator_types", [])
                }
                indicators.append(indicator)

    return indicators


def correlate_with_environment(indicators, environment_iocs):
    matches = []
    for indicator in indicators:
        for env_ioc in environment_iocs:
            # Extract IOC value from STIX pattern
            if indicator["pattern"] and env_ioc in indicator["pattern"]:
                matches.append({
                    "indicator_id": indicator["id"],
                    "pattern": indicator["pattern"],
                    "matched_ioc": env_ioc,
                    "confidence": indicator["confidence"]
                })
    return matches
```

### MISP Integration

```python
# MISP Event Ingestion and Correlation
from pymisp import PyMISP
import json

def ingest_misp_events(misp_url, misp_key, event_ids=None):
    misp = PyMISP(misp_url, misp_key, False)

    events = []
    if event_ids:
        for eid in event_ids:
            event = misp.get_event(eid)
            events.append(event)
    else:
        # Get recent events
        result = misp.search(controller="events", limit=10, published=True)
        events = result

    indicators = []
    for event in events:
        event_data = event.get("Event", event)
        event_info = {
            "id": event_data.get("id"),
            "info": event_data.get("info"),
            "date": event_data.get("date"),
            "analysis": event_data.get("analysis"),
            "threat_level": event_data.get("threat_level_id")
        }

        for attr in event_data.get("Attribute", []):
            indicator = {
                "event_id": event_info["id"],
                "type": attr.get("type"),
                "value": attr.get("value"),
                "category": attr.get("category"),
                "to_ids": attr.get("to_ids", False),
                "tags": [t.get("name") for t in attr.get("Tag", [])]
            }

            if indicator["to_ids"]:
                indicators.append(indicator)

    return indicators
```

### IOCs vs TTPs

| Characteristic | IOCs | TTPs |
|----------------|------|------|
| Definition | Specific artifacts of compromise | Tactics, techniques, and procedures |
| Examples | IP addresses, hashes, domains | MITRE ATT&CK T1566 (Phishing), T1059 (Command/Scripting) |
| Longevity | Hours to days (easily changed) | Months to years (harder to change) |
| Detection | Signature-based | Behavioral-based |
| Sharing | STIX indicators, OpenIOC | ATT&CK, kill chain phases |
| Value | Reactive, specific | Proactive, general |

### Integration with Existing Security Stack

```yaml
# Threat Intelligence Pipeline Configuration
threat_intel:
  sources:
    - name: "Commercial Feed"
      type: STIX/TAXII
      url: "https://taxii.provider.com"
      frequency: "every 15 minutes"
      collections:
        - "malware"
        - "phishing"
        - "cnc"

    - name: "MISP Community"
      type: MISP
      url: "https://misp.internal.example"
      frequency: "every hour"
      feeds:
        - "community"
        - "country-botnet"

    - name: "AlienVault OTX"
      type: OTX API
      api_key: "${OTX_API_KEY}"
      frequency: "every hour"

  processing:
    - normalize_iocs: true
    - deduplicate: true
    - score_based_on:
        - source_reliability
        - age_of_indicator
        - correlation_with_other_feeds

  enrichment:
    - geoip_lookup
    - whois_lookup
    - passive_dns
    - sandbox_verification

  distribution:
    - siem: "Push IOCs to SIEM correlation rules"
    - edr: "Push IOCs to EDR watchlists"
    - firewall: "Push IP/domain blocks to firewall"
    - proxy: "Push URL/domain blocks to proxy"
    - dns: "Push domain sinks to DNS"
```

## Automation

### SOAR Playbooks

```yaml
# SOAR Playbook: Automated Phishing Response
name: "Phishing Email Auto-Response"
trigger: "User reports phishing via Outlook add-in"
steps:
  - id: extract_iocs
    action: "Extract URLs, attachments, sender from email"
    tool: "Email parsing"

  - id: reputation_check
    action: "Check sender, URLs, attachments against threat intel"
    tool: "VirusTotal, RiskIQ, internal intel"
    conditions:
      if: "malicious_score > 70"
        goto: auto_remediate
      else:
        goto: create_low_ticket

  - id: auto_remediate
    actions:
      - action: "Delete email from all mailboxes"
        tool: "Exchange Online"
      - action: "Block sender domain at email gateway"
        tool: "Email security gateway"
      - action: "Block URLs at proxy"
        tool: "Forward proxy"
      - action: "Submit attachments to sandbox"
        tool: "CAPE sandbox"

  - id: create_incident
    action: "Create incident in SIEM"
    data:
      severity: "HIGH"
      category: "Phishing"
      affected_users: "{{users_who_received_email}}"

  - id: notify
    actions:
      - action: "Notify reporter of resolution"
        channel: "email"
      - action: "Notify security team"
        channel: "Slack"
      - action: "Create ticket in case management"
        tool: "ServiceNow"
```

### Automated Containment

```python
# Automated Containment Based on Alert Severity
import json
import requests

class AutomatedContainment:
    def __init__(self, config):
        self.config = config
        self.siem_api = config["siem_api"]
        self.edr_api = config["edr_api"]
        self.firewall_api = config["firewall_api"]

    def evaluate_alert(self, alert):
        score = alert.get("score", 0)
        indicator = alert.get("indicator", {})
        affected_hosts = alert.get("affected_hosts", [])

        if score >= 90:
            self.critical_response(indicator, affected_hosts)
        elif score >= 70:
            self.high_response(indicator, affected_hosts)
        elif score >= 50:
            self.medium_response(alert)

    def critical_response(self, indicator, hosts):
        # Isolate all affected hosts
        for host in hosts:
            self._isolate_host(host)

        # Block IOCs
        for ip in indicator.get("ips", []):
            self._block_ip(ip)
        for domain in indicator.get("domains", []):
            self._block_domain(domain)

        # Create emergency incident
        self._create_incident("CRITICAL", indicator, hosts)
        self._notify_oncall("P1 CRITICAL: Active compromise detected")

    def high_response(self, indicator, hosts):
        # Disable user accounts
        for user in indicator.get("users", []):
            self._disable_account(user)

        # Block specific indicators
        for ip in indicator.get("ips", []):
            self._add_firewall_rule(ip, "deny")

        # Create high severity incident
        self._create_incident("HIGH", indicator, hosts)

    def medium_response(self, alert):
        # Create ticket for investigation
        self._create_ticket(alert)
        self._enrich_alert(alert)

    def _isolate_host(self, hostname):
        response = requests.post(
            f"{self.edr_api}/v2/hosts/{hostname}/isolate",
            headers={"Authorization": f"Bearer {self.config['edr_token']}"}
        )
        return response.json()

    def _block_ip(self, ip):
        requests.post(
            f"{self.firewall_api}/rules",
            json={
                "source": "*",
                "destination": ip,
                "action": "deny",
                "description": "Automated containment block"
            }
        )

    def _block_domain(self, domain):
        # Block at DNS level
        requests.post(
            f"{self.config['dns_api']}/block",
            json={"domain": domain}
        )

    def _disable_account(self, username):
        # Disable in identity provider
        requests.post(
            f"{self.config['idp_api']}/users/{username}/disable"
        )

    def _create_incident(self, severity, indicator, hosts):
        requests.post(
            f"{self.siem_api}/incidents",
            json={
                "title": f"Automated containment - {severity}",
                "severity": severity,
                "indicators": indicator,
                "affected_hosts": hosts,
                "automated_actions": True
            }
        )

    def _notify_oncall(self, message):
        requests.post(
            self.config["pagerduty_url"],
            json={
                "routing_key": self.config["pagerduty_key"],
                "event_action": "trigger",
                "payload": {
                    "summary": message,
                    "severity": "critical",
                    "source": "Automated Containment System"
                }
            }
        )
```

### Enrichment Automation

```python
# Alert Enrichment Pipeline
import ipaddress
import requests
from datetime import datetime

class AlertEnrichment:
    def __init__(self, config):
        self.virustotal_key = config.get("virustotal_key")
        self.shodan_key = config.get("shodan_key")
        self.abuseipdb_key = config.get("abuseipdb_key")

    def enrich_ip(self, ip):
        results = {
            "ip": ip,
            "enrichment_time": datetime.utcnow().isoformat(),
            "sources": {}
        }

        # GeoIP
        try:
            response = requests.get(f"http://ip-api.com/json/{ip}")
            results["sources"]["geoip"] = response.json()
        except Exception:
            results["sources"]["geoip"] = {"error": "lookup failed"}

        # Reputation checks
        if self.abuseipdb_key:
            try:
                response = requests.get(
                    "https://api.abuseipdb.com/api/v2/check",
                    params={"ipAddress": ip, "maxAgeInDays": 90},
                    headers={"Key": self.abuseipdb_key, "Accept": "application/json"}
                )
                results["sources"]["abuseipdb"] = response.json().get("data", {})
            except Exception:
                pass

        # Private IP check
        try:
            results["is_private"] = ipaddress.ip_address(ip).is_private
        except ValueError:
            results["is_private"] = None

        # Known services
        if self.shodan_key:
            try:
                response = requests.get(
                    f"https://api.shodan.io/shodan/host/{ip}",
                    params={"key": self.shodan_key}
                )
                results["sources"]["shodan"] = response.json()
            except Exception:
                pass

        return results


    def enrich_domain(self, domain):
        results = {
            "domain": domain,
            "enrichment_time": datetime.utcnow().isoformat(),
            "sources": {}
        }

        # VirusTotal
        if self.virustotal_key:
            try:
                response = requests.get(
                    f"https://www.virustotal.com/api/v3/domains/{domain}",
                    headers={"x-apikey": self.virustotal_key}
                )
                vt_data = response.json().get("data", {})
                results["sources"]["virustotal"] = {
                    "malicious": vt_data.get("attributes", {}).get("last_analysis_stats", {}).get("malicious", 0),
                    "suspicious": vt_data.get("attributes", {}).get("last_analysis_stats", {}).get("suspicious", 0)
                }
            except Exception:
                pass

        # WHOIS
        try:
            import whois
            w = whois.whois(domain)
            results["sources"]["whois"] = {
                "registrar": w.registrar,
                "creation_date": str(w.creation_date),
                "expiration_date": str(w.expiration_date)
            }
        except Exception:
            results["sources"]["whois"] = {"error": "lookup failed"}

        return results


    def enrich_hash(self, file_hash):
        results = {
            "hash": file_hash,
            "enrichment_time": datetime.utcnow().isoformat(),
            "sources": {}
        }

        if self.virustotal_key:
            try:
                response = requests.get(
                    f"https://www.virustotal.com/api/v3/files/{file_hash}",
                    headers={"x-apikey": self.virustotal_key}
                )
                vt_data = response.json().get("data", {})
                attributes = vt_data.get("attributes", {})
                results["sources"]["virustotal"] = {
                    "malicious": attributes.get("last_analysis_stats", {}).get("malicious", 0),
                    "type_description": attributes.get("type_description", ""),
                    "names": attributes.get("names", [])[:5],
                    "signature_info": attributes.get("signature_info", {})
                }
            except Exception:
                pass

        return results
```

### Case Management

```python
# Incident Case Management Automation
from dataclasses import dataclass
from datetime import datetime
from typing import List, Dict, Optional

@dataclass
class Incident:
    incident_id: str
    severity: str
    status: str
    title: str
    description: str
    detected_at: datetime
    assigned_to: Optional[str] = None
    artifacts: List[Dict] = None
    timeline: List[Dict] = None
    actions: List[Dict] = None

    def add_timeline_entry(self, entry_type, description, user):
        if self.timeline is None:
            self.timeline = []
        self.timeline.append({
            "timestamp": datetime.utcnow().isoformat(),
            "type": entry_type,
            "description": description,
            "user": user
        })

    def add_action(self, action_type, description, assigned_to):
        if self.actions is None:
            self.actions = []
        self.actions.append({
            "id": f"ACT-{len(self.actions) + 1:04d}",
            "type": action_type,
            "description": description,
            "assigned_to": assigned_to,
            "status": "open",
            "created_at": datetime.utcnow().isoformat()
        })

    def to_dict(self):
        return {
            "incident_id": self.incident_id,
            "severity": self.severity,
            "status": self.status,
            "title": self.title,
            "description": self.description,
            "detected_at": self.detected_at.isoformat(),
            "assigned_to": self.assigned_to,
            "artifacts": self.artifacts or [],
            "timeline": self.timeline or [],
            "actions": self.actions or []
        }


class CaseManagement:
    def __init__(self, config):
        self.incidents = {}
        self.next_id = 1

    def create_incident(self, severity, title, description):
        incident = Incident(
            incident_id=f"IR-{datetime.now().strftime('%Y')}-{self.next_id:04d}",
            severity=severity,
            status="open",
            title=title,
            description=description,
            detected_at=datetime.utcnow()
        )
        self.incidents[incident.incident_id] = incident
        self.next_id += 1
        return incident

    def assign_incident(self, incident_id, analyst):
        if incident_id in self.incidents:
            self.incidents[incident_id].assigned_to = analyst
            self.incidents[incident_id].add_timeline_entry(
                "assignment", f"Assigned to {analyst}", "system"
            )

    def update_status(self, incident_id, status):
        if incident_id in self.incidents:
            self.incidents[incident_id].status = status
            self.incidents[incident_id].add_timeline_entry(
                "status_change", f"Status changed to {status}", "system"
            )

    def add_artifact(self, incident_id, artifact_type, value, source):
        if incident_id in self.incidents:
            if self.incidents[incident_id].artifacts is None:
                self.incidents[incident_id].artifacts = []
            self.incidents[incident_id].artifacts.append({
                "type": artifact_type,
                "value": value,
                "source": source,
                "added_at": datetime.utcnow().isoformat()
            })

    def generate_report(self, incident_id):
        if incident_id not in self.incidents:
            return None

        incident = self.incidents[incident_id]
        return {
            "report_generated": datetime.utcnow().isoformat(),
            "incident": incident.to_dict(),
            "duration": (datetime.utcnow() - incident.detected_at).total_seconds() / 3600,
            "artifacts_collected": len(incident.artifacts or []),
            "actions_taken": len(incident.actions or []),
            "timeline_entries": len(incident.timeline or [])
        }
```

## Metrics and KPIs

### Key Performance Indicators

| Metric | Definition | Target | Calculation |
|--------|------------|--------|-------------|
| **MTTD** | Mean Time to Detect | < 1 hour (P1) | Sum of detection times / Incidents |
| **MTTR** | Mean Time to Respond | < 4 hours (P1) | Sum of response times / Incidents |
| **MTTC** | Mean Time to Contain | < 1 hour (P1) | Sum of containment times / Incidents |
| **MTTE** | Mean Time to Eradicate | < 8 hours (P1) | Sum of eradication times / Incidents |
| **MTTRS** | Mean Time to Restore Service | < 4 hours (P1) | Sum of restoration times / Incidents |
| **SLA Adherence** | SLA compliance percentage | > 95% | Incidents meeting SLA / Total incidents |
| **Escalation Rate** | Percentage escalated to Tier 2/3 | < 30% | Escalated incidents / Total incidents |
| **False Positive Rate** | Percentage of false alerts | < 10% | False positives / Total alerts |

### Incident Volume Trends

```python
# Incident Volume Analytics
from datetime import datetime, timedelta
from collections import defaultdict

def analyze_incident_trends(incidents, period_days=90):
    cutoff = datetime.now() - timedelta(days=period_days)
    recent = [i for i in incidents if i["detected_at"] > cutoff]

    trends = {
        "total_incidents": len(recent),
        "by_severity": defaultdict(int),
        "by_category": defaultdict(int),
        "by_day": defaultdict(int),
        "by_hour": defaultdict(int),
        "avg_response_time": 0,
        "recurrence_rate": 0
    }

    response_times = []
    # Track repeat offenders
    source_types = defaultdict(int)

    for incident in recent:
        trends["by_severity"][incident["severity"]] += 1
        trends["by_category"][incident["category"]] += 1

        day_key = incident["detected_at"].strftime("%Y-%m-%d")
        trends["by_day"][day_key] += 1

        hour_key = incident["detected_at"].strftime("%H")
        trends["by_hour"][hour_key] += 1

        if incident.get("time_to_respond"):
            response_times.append(incident["time_to_respond"])

    if response_times:
        trends["avg_response_time"] = sum(response_times) / len(response_times)

    trends["by_severity"] = dict(trends["by_severity"])
    trends["by_category"] = dict(trends["by_category"])
    trends["by_day"] = dict(trends["by_day"])
    trends["by_hour"] = dict(trends["by_hour"])

    return trends


def generate_monthly_report(incidents, year, month):
    report = {
        "period": f"{year}-{month:02d}",
        "total_incidents": 0,
        "sev1_incidents": 0,
        "top_categories": [],
        "average_mttr": 0,
        "average_mttd": 0,
        "improvement_areas": []
    }

    monthly = [
        i for i in incidents
        if i["detected_at"].year == year and i["detected_at"].month == month
    ]

    report["total_incidents"] = len(monthly)
    report["sev1_incidents"] = sum(1 for i in monthly if i["severity"] == "P1")

    # Trend analysis
    if len(monthly) > 0:
        categories = defaultdict(int)
        response_times = []
        detection_times = []

        for incident in monthly:
            categories[incident["category"]] += 1
            if incident.get("time_to_respond"):
                response_times.append(incident["time_to_respond"])
            if incident.get("time_to_detect"):
                detection_times.append(incident["time_to_detect"])

        if response_times:
            report["average_mttr"] = sum(response_times) / len(response_times)
        if detection_times:
            report["average_mttd"] = sum(detection_times) / len(detection_times)

        report["top_categories"] = sorted(
            categories.items(), key=lambda x: x[1], reverse=True
        )[:5]

    previous_month = [
        i for i in incidents
        if i["detected_at"].year == year and i["detected_at"].month == month - 1
    ]

    if previous_month:
        report["month_over_month_change"] = (
            (len(monthly) - len(previous_month)) / len(previous_month) * 100
        )

    return report
```

### SLA Adherence Dashboard

```python
# SLA Compliance Tracking
def calculate_sla_compliance(incidents, slas):
    compliance = {
        "overall": 0,
        "by_priority": {},
        "breaches": []
    }

    total = len(incidents)
    met_sla = 0

    for incident in incidents:
        priority = incident.get("severity", "P3")
        sla_hours = slas.get(priority, 24)

        response_time = incident.get("time_to_respond_hours", 0)
        within_sla = response_time <= sla_hours

        if within_sla:
            met_sla += 1
        else:
            compliance["breaches"].append({
                "incident_id": incident["id"],
                "priority": priority,
                "response_time": response_time,
                "sla_hours": sla_hours,
                "exceeded_by": response_time - sla_hours
            })

        if priority not in compliance["by_priority"]:
            compliance["by_priority"][priority] = {"met": 0, "total": 0}
        compliance["by_priority"][priority]["total"] += 1
        if within_sla:
            compliance["by_priority"][priority]["met"] += 1

    if total > 0:
        compliance["overall"] = (met_sla / total) * 100

    for priority in compliance["by_priority"]:
        p = compliance["by_priority"][priority]
        p["compliance_pct"] = (p["met"] / p["total"]) * 100 if p["total"] > 0 else 0

    return compliance
```

## Tabletop Exercises

### Exercise Design

| Element | Description |
|---------|-------------|
| **Objectives** | Specific goals (e.g., test communication plan, validate containment procedures) |
| **Scenario** | Realistic attack scenario based on threat landscape |
| **Inject Timeline** | Scheduled events that drive the exercise forward |
| **Participants** | Roles involved (SOC, engineering, legal, exec, PR) |
| **Facilitator** | Neutral party who manages the exercise |
| **Observers** | Evaluate performance and capture lessons learned |
| **Cell Structure** | White cell (facilitator), Red cell (attackers), Blue cell (defenders) |

### Scenario Library

| Scenario | Focus Area | Difficulty | Duration |
|----------|------------|------------|----------|
| Ransomware attack | Containment, backup recovery, communication | Advanced | 4 hours |
| Data exfiltration via insider | Detection, investigation, legal | Intermediate | 2 hours |
| Cloud account compromise | Cloud IR, credential management | Advanced | 3 hours |
| Supply chain attack | Third-party risk, vendor communication | Advanced | 3 hours |
| Phishing campaign | User reporting, email security | Basic | 1 hour |
| DDoS extortion | Network mitigation, threat intelligence | Intermediate | 2 hours |
| Physical security breach | Physical/logical convergence | Basic | 1 hour |
| Nation-state APT | Advanced persistence, threat hunting | Expert | 4 hours |

### Exercise Evaluation

```markdown
# Tabletop Exercise Evaluation Form

## Exercise Information
- **Exercise Name:** ___________________
- **Date:** ___________________
- **Scenario Type:** ___________________
- **Facilitator:** ___________________

## Participant Evaluation
| Role | Participant | Effectiveness (1-5) | Observations |
|------|-------------|---------------------|--------------|
| Incident Commander | | | |
| Technical Lead | | | |
| Communications Lead | | | |
| Scribe | | | |
| Legal Counsel | | | |

## Decision Point Evaluation
| Decision Point | Decision Made | Time to Decide | Optimal? | Notes |
|----------------|---------------|----------------|----------|-------|
| | | | Y / N | |
| | | | Y / N | |

## Key Metrics
- Time to declare incident: _____ minutes
- Time to containment decision: _____ minutes
- Communication completeness: ____ / 10
- Number of missed critical actions: ____

## Improvement Opportunities
1. _______________________________________________________________
2. _______________________________________________________________
3. _______________________________________________________________
```

### Improvement Tracking

```markdown
# Improvement Tracking Register

| ID | Finding | Source | Action Plan | Owner | Target Date | Status |
|----|---------|--------|-------------|-------|-------------|--------|
| TTX-001 | Communication plan not accessible during incident | Tabletop 2026-Q1 | Publish communication plan to wiki and mobile app | John Smith | 2026-03-15 | Closed |
| TTX-002 | Backup restoration procedure outdated | Tabletop 2026-Q1 | Review and update backup runbooks | Sarah Lee | 2026-04-01 | In Progress |
| TTX-003 | Legal notification timeline unclear | Tabletop 2026-Q2 | Create breach notification matrix per jurisdiction | Legal team | 2026-07-01 | Open |
| TTX-004 | SOC escalation delays observed | Tabletop 2026-Q2 | Implement automated escalation triggers | Security Eng | 2026-08-01 | Open |
```

## Tools

### SIEM Platforms

| Platform | Key Features | Use Case |
|----------|-------------|----------|
| **Splunk** | SPL search, correlation, dashboards, ML toolkit | Enterprise SIEM, advanced analytics |
| **ELK Stack** | Elasticsearch, Logstash, Kibana, Elastic Security | Open-source, cloud-native, scalable |
| **Microsoft Sentinel** | KQL, built-in analytics, cloud-native | Azure-centric, Microsoft integration |
| **QRadar** | AQL, offense management, flow analytics | Traditional SOC, network-centric |
| **LogRhythm** | AI Engine, case management, UEBA | Mid-market, compliance-focused |

### EDR Platforms

| Platform | Key Features | Strengths |
|----------|-------------|-----------|
| **CrowdStrike Falcon** | Cloud-native, IOA, real-time response | Threat intelligence, speed |
| **SentinelOne Singularity** | Autonomous, AI-driven, rollback | Automated response, ransomware protection |
| **Microsoft Defender for Endpoint** | Integrated with M365, threat analytics | Microsoft ecosystem, cost-effective |
| **Carbon Black (VMware)** | Behavioral detection, live response | Policy-based, mature |
| **Cybereason** | MalOp (Malicious Operations), cross-machine correlation | Investigation, root cause visualization |
| **Palo Alto Cortex XDR** | Network + endpoint + cloud integration | Comprehensive XDR |

### SOAR Platforms

| Platform | Key Features | Strengths |
|----------|-------------|-----------|
| **Palo Alto XSOAR** | Playbook editor, marketplace, case management | Rich integration ecosystem |
| **Splunk SOAR** | Visual playbooks, automation, Phantom community | Splunk ecosystem integration |
| **IBM Resilient** | Incident management, orchestration, reporting | Enterprise incident management |
| **Siemplify (Google)** | Built-in playbooks, analyst workflow | User-friendly, SOC workflow |
| **Swimlane** | Low-code, SOAR + case management | Customization, ease of use |
| **Torq** | No-code automation, rapid deployment | Speed of deployment |

### Additional Tools

| Category | Tools |
|----------|-------|
| **Threat Intel** | MISP, ThreatConnect, Anomali, Recorded Future, VirusTotal |
| **Forensics** | FTK Imager, Autopsy, Volatility, Rekall, Plaso, Sleuth Kit |
| **Network Analysis** | Wireshark, tcpdump, nfdump, Zeek, Moloch, Arkime |
| **Malware Analysis** | CAPE Sandbox, Ghidra, IDA Pro, x64dbg, ProcMon, RegShot |
| **Cloud Forensics** | AWS Disk Forensic, Azure Disk Forensic, Pacu, ScoutSuite |
| **Communication** | PagerDuty, OpsGenie, Slack, Microsoft Teams, Atlassian Opsgenie |
| **Case Management** | ServiceNow, Jira, TheHive, RTIR, Demisto |

## Case Studies

### Case Study 1: Ransomware Response

**Scenario:** Mid-sized financial services firm hit by LockBit ransomware.

**Timeline:**
- 02:00 - Initial compromise via phishing email
- 02:15 - C2 beacon established
- 03:30 - Lateral movement using PsExec
- 04:00 - Domain admin credentials compromised
- 06:30 - Ransomware deployment begins
- 06:45 - EDR detects mass file encryption
- 06:50 - SOC declares P1 incident
- 07:00 - Incident Commander assigned, containment begins
- 07:30 - All endpoints isolated via EDR
- 08:00 - Domain controller isolated, accounts disabled
- 09:00 - Root cause analysis initiated
- 14:00 - Recovery from immutable backups starts
- 22:00 - Production systems restored

**Key Lessons:**
- Immutable backups were crucial — prevented total data loss
- EDR with automated isolation stopped spread within 15 minutes
- Network segmentation limited blast radius to finance department
- Clear communication plan kept stakeholders informed
- Post-incident analysis identified gaps: local admin rights, no app allowlisting

### Case Study 2: Cloud Account Takeover

**Scenario:** SaaS provider suffered AWS IAM key compromise.

**Timeline:**
- 10:00 - Attacker obtains IAM keys from public GitHub repository
- 10:15 - Reconnaissance using List* and Describe* API calls
- 10:30 - Data exfiltration from S3 buckets begins
- 11:00 - GuardDuty detects anomalous API calls from unexpected region
- 11:05 - SOC alerted
- 11:10 - Incident declared
- 11:15 - IAM keys revoked
- 11:20 - Root account password rotated, MFA enforced
- 11:30 - Impact assessment: 3 S3 buckets accessed, 500GB data exfiltrated
- 14:00 - CloudTrail analysis complete, full attack path reconstructed

**Key Lessons:**
- Automated scanning for leaked credentials prevented future occurrences
- CloudTrail provided complete audit trail for forensics
- Service control policies (SCPs) could have limited blast radius
- Need for automated key rotation and anomaly detection
- GitHub secret scanning integrated into CI/CD pipeline
