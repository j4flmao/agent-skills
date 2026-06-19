# EDR/XDR Fundamentals

## Overview
Endpoint Detection and Response (EDR) monitors endpoint activities — processes, file operations, network connections, registry changes — to detect and respond to threats. Extended Detection and Response (XDR) extends EDR with telemetry from network, email, cloud workloads, and identity systems for correlated threat detection across the entire environment.

## Core Concepts

### Concept 1: Telemetry Collection
EDR agents collect rich endpoint telemetry:
- **Process creation**: Every process start with command line, parent process, user
- **File operations**: Create, modify, delete, rename operations
- **Network connections**: Outbound and inbound connections with remote IPs and ports
- **Registry changes**: Key creation, modification, deletion (Windows)
- **Script execution**: PowerShell, bash, Python script execution
- **Module loading**: DLL/Shared library loads into processes
- **Memory operations**: Process injection, memory allocation patterns

### Concept 2: Detection Methods
- **Signature-based**: Known threat indicators (IoCs) — file hashes, IPs, domains
- **Behavioral**: Unusual behavior patterns — process spawning cmd.exe, lateral movement
- **ML/AI-based**: Model trained on normal behavior flags anomalies
- **Rule-based**: Custom detection rules mapped to MITRE ATT&CK techniques
- **Threat intelligence**: Enrichment with external threat feeds

### Concept 3: Response Actions
When a threat is detected, EDR can:
- **Isolate endpoint**: Block all network communication except to management server
- **Kill process**: Terminate malicious processes
- **Remove file**: Delete malware from disk
- **Block IoC**: Add file hash, IP, or domain to blocklist
- **Rollback**: Restore registry changes and files (Windows)
- **Collect forensic data**: Memory dump, file copy, event log export

## EDR Platform Comparison

| Feature | CrowdStrike Falcon | Microsoft Defender for Endpoint | SentinelOne | Palo Alto Cortex XDR | VMware Carbon Black |
|---------|-------------------|-------------------------------|-------------|---------------------|-------------------|
| Architecture | Cloud/SaaS | Cloud/SaaS | Cloud/SaaS | Cloud/On-prem | Cloud/On-prem |
| OS support | Win, Mac, Linux | Win, Mac, Linux | Win, Mac, Linux | Win, Mac, Linux | Win, Mac, Linux |
| ML detection | Yes | Yes | Yes | Yes | Yes |
| Behavioral AI | Yes | Yes | Yes | Yes | Yes |
| Ransomware protection | Yes | Yes | Yes | Yes | Yes |
| EDR capabilities | Excellent | Excellent | Excellent | Very good | Very good |
| XDR scope | Identity, Cloud, SIEM | M365, Azure, Defender | Cloud, Identity | Network, Cloud, Email | Endpoint-focused |
| Automated response | Yes (RTR) | Yes (automated) | Yes (autonomous) | Yes (playbooks) | Yes (policy) |
| Threat hunting | Yes | Yes | Yes | Yes | Yes |
| Pricing | Per endpoint | M365 E5 bundle | Per endpoint | Per endpoint | Per endpoint |
| Best for | Enterprise, multi-platform | Microsoft ecosystem | Autonomous SOC | Integrated security stack | Compliance-heavy |

## Implementation Guide

### Step 1: EDR Deployment Strategy
```yaml
edr_deployment:
  phase_1_assessment:
    duration: "1-2 weeks"
    activities:
      - "Inventory all endpoints (servers, desktops, laptops, VMs)"
      - "Identify OS versions and patch levels"
      - "Document existing security controls"
      - "Assess network connectivity to EDR cloud"
    success_criteria:
      - "Complete endpoint inventory"
      - "Deployment blockers identified"

  phase_2_pilot:
    duration: "2-4 weeks"
    endpoints: "10-50 (IT team + security team)"
    activities:
      - "Deploy EDR agent via MDM/GPO/script"
      - "Validate telemetry collection"
      - "Test detection capabilities"
      - "Configure initial detection rules"
      - "Define response procedures"
    success_criteria:
      - "All pilot endpoints reporting telemetry"
      - "Baseline detections validated"
      - "Response playbooks tested"

  phase_3_full_deployment:
    duration: "4-8 weeks"
    endpoints: "All remaining"
    activities:
      - "Batch deployment by business unit"
      - "Monitor for false positives"
      - "Tune detection rules"
      - "Train SOC team on EDR workflows"
      - "Integrate with SIEM"
    success_criteria:
      - "100% endpoint coverage"
      - "< 5% false positive rate"
      - "SIEM integration operational"

  phase_4_optimization:
    duration: "Ongoing"
    activities:
      - "Custom detection rule creation"
      - "Threat hunting setup"
      - "Automated response playbooks"
      - "Quarterly EDR health review"
```

### Step 2: Detection Rule Examples
```yaml
# CrowdStrike Falcon custom IoA rule
detection_rules:
  - name: "Suspicious PowerShell Execution"
    description: "Detects encoded PowerShell commands often used in attacks"
    enabled: true
    severity: high
    mitre_technique: "T1059.001"
    conditions:
      - field: "CommandLine"
        operator: "contains"
        value: "-EncodedCommand"
      - field: "FileName"
        operator: "any"
        values: ["powershell.exe", "pwsh.exe"]
    response:
      - "Alert SOC"
      - "Collect process memory dump"
      - "Isolate endpoint if from untrusted source"

  - name: "Lateral Movement via RDP"
    description: "Detects new RDP connections from compromised workstation"
    enabled: true
    severity: critical
    mitre_technique: "T1021.001"
    conditions:
      - field: "EventType"
        operator: "equals"
        value: "NetworkConnection"
      - field: "RemotePort"
        operator: "equals"
        value: "3389"
      - field: "InitiatingProcessUserName"
        operator: "not_in"
        values: ["NT AUTHORITY\\SYSTEM", "admin-*"]
    response:
      - "Alert SOC"
      - "Block RDP traffic from source endpoint"
      - "Isolate endpoint"
```

### Step 3: Incident Investigation Workflow
```
Alert Triggered
    ↓
Tier 1: Triage (15 min SLA)
    ├── Validate alert is not false positive
    ├── Gather initial context: process, user, endpoint
    ├── Check threat intelligence for related IoCs
    └── Escalate if true positive
        ↓
Tier 2: Investigation (4 hour SLA)
    ├── Analyze process tree and timeline
    ├── Review network connections
    ├── Check for lateral movement
    ├── Determine scope (affected endpoints/users)
    └── Contain affected endpoints
        ↓
Tier 3: Remediation (24 hour SLA)
    ├── Remove malware
    ├── Restore affected systems
    ├── Update detection rules
    ├── Block IoCs across environment
    └── Post-incident review
```

## Best Practices
- Deploy EDR agents on all endpoints — no coverage gaps
- Enable behavioral AI/ML detection alongside signature-based
- Tune detection rules to minimize false positives (target < 5% FP rate)
- Integrate EDR with SIEM for correlated alerting
- Define and test incident response playbooks for common scenarios
- Use automated response for well-understood threats (known malware families)
- Manual response for complex threats (APT, zero-day, lateral movement)
- Regularly test EDR detection with purple team exercises
- Keep EDR agents updated — enable auto-update
- Monitor EDR agent health — ensure endpoints are reporting

## Common Pitfalls
- Partial endpoint coverage (missed detection on non-covered endpoints)
- Alert fatigue from untuned rules (ignore real threats in noise)
- Over-reliance on automated response (can disrupt legitimate operations)
- No SIEM integration (EDR alerts siloed from other security signals)
- Insufficient investigation skills (alerts closed without proper analysis)
- No purple team testing (don't know if detection rules actually work)
- Outdated agents (missing new detection capabilities)
- False positives from legitimate software (security scanners, backup tools, IT management tools)

## Key Points
- EDR monitors endpoints for process, file, network, and registry activity
- XDR extends EDR with network, email, cloud, and identity telemetry
- Deploy in phases: assess → pilot → full deployment → optimize
- Use signature, behavioral, ML, and rule-based detection methods
- Integrate EDR with SIEM for correlated threat detection
- Tune rules to balance detection rate vs false positives
- Define response workflows for tiered triage and investigation
- Test detection with purple team exercises
- Respond with isolation, process kill, file removal, and IoC blocking
