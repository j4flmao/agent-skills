# SOC Runbook Templates

## Runbook Structure
```
## Title: {Incident Type}
Severity: {SEV1-SEV4}
Tier: {Primary responder tier}

## Step 1: {Action}
{Detailed instructions, commands, tools}

## Step 2: {Action}
{...}

## Escalation Criteria
- {When to escalate to next tier}

## Resolution Criteria
- {When incident is considered resolved}
```

## Phishing Email Runbook
```
## Title: Phishing Email
Severity: SEV2
Tier: T1

## Step 1: Verify
- Open email headers, check SPF/DKIM/DMARC
- Check URL reputation (VirusTotal, URLScan)
- Check attachment hash against threat intel

## Step 2: Contain
- If malicious URL: block at proxy/gateway
- If malicious attachment: quarantine at email gateway
- Check if any user clicked: initiate endpoint scan

## Step 3: Remediate
- Remove email from all mailboxes
- Reset affected user passwords
- Enable MFA if not already active

## Escalation Criteria
- Credential theft confirmed → Escalate to T2
- Lateral movement detected → Escalate to T3

## Resolution Criteria
- Malicious content blocked, users notified, no data exfiltrated
```

## Malware Detection Runbook
```
## Title: Malware Detection
Severity: SEV1-SEV2
Tier: T2

## Step 1: Isolate
- Isolate endpoint from network (EDR)
- Block C2 IPs at firewall/proxy

## Step 2: Investigate
- Collect process tree, file system artifacts
- Check persistence mechanisms
- Review network connections

## Step 3: Analyze
- Submit sample to sandbox
- Check IoCs against threat intel
- Determine infection vector

## Step 4: Remediate
- Remove malware, revoke persistence
- Reimage if persistence unclear
- Scan lateral connections

## Escalation Criteria
- Ransomware confirmed → SEV1, engage T3
- Data exfiltration detected → engage legal + comms
```
