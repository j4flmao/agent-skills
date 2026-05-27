---
name: edr-xdr
description: >
  Manage endpoint detection and response, EDR/XDR platforms, detection rules, and incident investigation.
  Use when the user asks about EDR, XDR, endpoint detection, CrowdStrike, Defender, SentinelOne, or detection rule.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, edr, phase-8]
---

# EDR/XDR

## Purpose
Design and manage endpoint detection and response capabilities including EDR/XDR platform selection, detection rule creation, and endpoint investigation workflows.

## Agent Protocol

### Trigger
- "EDR", "XDR", "endpoint detection", "endpoint response"
- "CrowdStrike", "Microsoft Defender", "SentinelOne", "Carbon Black"
- "detection rule", "endpoint detection rule", "endpoint investigation"
- "malware analysis", "endpoint forensics", "process investigation"
- "MDR", "managed detection", "endpoint isolation", "containment"

### Input Context
- If endpoint count, operating systems, and existing security tools are not provided, ask.

### Output Artifact
- Detection rule definitions, EDR configuration guides, investigation playbooks

### Response Format
```
## Platform
{EDR/XDR tool, configuration, coverage}

## Detection Rules
{Rules with logic, severity, response}

## Investigation
{Step-by-step endpoint investigation process}
```

### Completion Criteria
- [ ] EDR platform configured with proper coverage
- [ ] Detection rules defined for key techniques
- [ ] Investigation playbook created
- [ ] Response actions defined (isolation, containment)

## References
  - references/detection-engineering.md — Detection Engineering
  - references/edr-deployment.md — EDR Deployment
  - references/edr-detection-rules.md — EDR Detection Rule Patterns
  - references/edr-platforms.md — EDR/XDR Platform Comparison
  - references/edr-xdr-advanced.md — Edr Xdr Advanced Topics
  - references/edr-xdr-fundamentals.md — Edr Xdr Fundamentals
  - references/incident-investigation.md — EDR Incident Investigation
## Handoff
Alerts flow to siem-engineering for correlation. Investigation results feed threat-intelligence for IoC extraction.
