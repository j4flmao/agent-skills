# SIEM Correlation Rules

## Rule Structure
```
## Title: {Rule Name}
Rule ID: {unique identifier}
MITRE ATT&CK: {TXXXX}
Severity: {SEV1-SEV4}
Data Sources: {log types}

## Logic
{Search query or pseudocode}

## Trigger Conditions
{When this rule fires}

## Response
{Playbook or action to take}

## Tuning
{False positive sources, exclusions}
```

## Critical Rules

### Multiple Failed Logins + Success
```
## Title: Password Spray Detected
Rule ID: DET-001
MITRE ATT&CK: T1110.003
Severity: SEV2
Data Sources: Authentication logs

Logic:
- Count failures per user > 10 in 5 minutes
- Followed by successful login from different IP
- CORRELATE with: geo-IP mismatch

Response: Alert SOC, verify with user, check geo-location
Tuning: Exclude service accounts with known automation
```

### Known Malicious IP Communication
```
## Title: C2 Beacon Detected
Rule ID: DET-002
MITRE ATT&CK: T1071.001
Severity: SEV1
Data Sources: Proxy logs, DNS logs, flow logs

Logic:
- Destination IP in threat intel feed
- Regular beacon interval (±1s variance)
- Low bytes per connection (keep-alive)

Response: Block IP, isolate endpoint, forensic collection
Tuning: Exclude known partner IPs, CDN ranges
```

### Unauthorized Privilege Escalation
```
## Title: Privilege Escalation
Rule ID: DET-003
MITRE ATT&CK: T1078
Severity: SEV1
Data Sources: Windows Event Log 4672, Linux /var/log/auth.log

Logic:
- User added to Admin/Domain Admin group
- Not authorized change (ticketing system check)
- BASELINE: Compare against normal admin addition patterns

Response: Verify with manager, revert change, audit user
Tuning: Exclude approved change windows, known automation
```

### Data Exfiltration
```
## Title: Large Outbound Transfer
Rule ID: DET-004
MITRE ATT&CK: T1048
Severity: SEV1
Data Sources: Proxy logs, DLP logs, flow logs

Logic:
- Outbound data > 100MB in 10 minutes
- Non-business destination (cloud storage, personal email)
- BASELINE: 3x normal traffic for this user

Response: Block outbound, engage SOC T2, DLP review
Tuning: Exclude known backup tools, CDN, legitimate cloud services
```

## Rules Maintenance
- Review false positives weekly
- Decommission unused rules quarterly
- Test new rules in monitoring mode first (no alerting)
- Use risk scoring: Severity × Asset Criticality × Confidence
