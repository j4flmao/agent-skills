---
name: blueteam-operations
description: >
  Use this skill when the user says 'incident response', 'memory forensics', 'threat hunting', 'Windows forensic artifacts', 'Volatility', 'PICERL'. Guides structured incident response, host/memory forensics, and hypothesis-driven threat hunting. Defensive only. Do NOT use for: writing SIEM detection content (use security/detection-engineering), SOC program/metrics design (use security/soc-operations), or threat-intel lifecycle (use security/threat-intelligence).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [security, blue-team, incident-response, forensics, threat-hunting]
---

# Blue Team Operations

## Purpose
Guide defenders through structured incident response (PICERL), Windows/Linux host forensics, live memory analysis, and hypothesis-driven threat hunting. Produces investigation playbooks and the exact artifacts/event IDs needed to confirm or refute a hypothesis.

## Agent Protocol

### Trigger
User phrases: "analyze memory dump", "threat hunting", "forensic artifacts", "incident response plan", "beaconing analysis".

### Input Context
- Incident type and affected platform (Windows/Linux/cloud).
- Available telemetry (Sysmon, EDR, proxy/firewall logs).

### Output Artifact
IR playbook or hunt plan with concrete artifacts, event IDs, and tools.

### Response Format
```
Phase: {PICERL phase}
Artifacts: {MFT / Prefetch / Event IDs / memory plugin}
Tooling: {Volatility, KAPE, ...}
Next step: {action}
```

> [!WARNING]
> **DISCLAIMER: DEFENSIVE PURPOSES ONLY**
> This skill is dedicated to Incident Response, forensics, and defending organizational perimeters.

## 1. Skill Context
**Focus**: Incident Response (IR), live memory forensics, disk artifacts, and log hunting.
**Triggers**: analyze memory dump, threat hunting, forensic artifacts, incident response plan

## 2. Defensive Strategies & Forensics
The agent must guide the user through structured investigation methodologies (e.g., PICERL - Preparation, Identification, Containment, Eradication, Recovery, Lessons Learned).

### Windows Disk Forensics & Artifacts
- **MFT (Master File Table)**: Analyzing `$MFT` for file creation, modification, and deletion timestamps (Time stomping detection).
- **Execution Evidence**: 
  - **Prefetch (`.pf`) files**: Proves an application was executed, tracking run counts and loaded DLLs.
  - **Amcache & Shimcache**: Tracks executed programs, their hashes, and execution paths.
- **Persistence Mechanisms**: Investigating Registry Run keys, Scheduled Tasks, WMI Event Subscriptions, and Services.

### Live Memory Forensics (Volatility)
- **Process Trees**: Identifying anomalous parent-child relationships (e.g., `cmd.exe` spawning from `spoolsv.exe`).
- **In-Memory Payloads**: Using plugins like `malfind` to detect injected, unbacked, executable memory regions (VAD tags indicating `PAGE_EXECUTE_READWRITE`).
- **Network Connections**: Mapping established connections (`netscan`) back to suspicious PIDs.

### Threat Hunting
- **Hypothesis-Driven Hunting**: Formulating assumptions (e.g., "Attackers are using WMI for lateral movement") and querying SIEM data (Event ID 4688 with command line auditing) to prove/disprove it.
- **Beaconing Analysis**: Analyzing Proxy/Firewall logs for regular, rhythmic outbound connections to unknown domains.

## 3. Output Format
- Provide structured IR playbooks.
- Detail the exact Windows Event IDs or Linux artifacts needed for the investigation.
- Recommend forensic tools (e.g., Volatility, KAPE, Eric Zimmerman's tools).
