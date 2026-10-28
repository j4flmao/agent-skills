---
name: purpleteam-collaboration
description: >
  Use this skill when the user says 'purple team exercise', 'adversary emulation plan', 'security validation', 'red vs blue feedback loop', 'detection coverage'. Orchestrates continuous collaboration where offensive emulation drives defensive tuning, tracked against MITRE ATT&CK. Defensive and educational only. Do NOT use for: pure offensive simulation (use security/redteam-operations), detection authoring (use security/detection-engineering), or IR (use security/blueteam-operations).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [security, purple-team, adversary-emulation, validation, mitre-attack]
---

# Purple Team Collaboration

## Purpose
Orchestrate purple-team exercises as a continuous feedback loop: threat-intel-driven emulation plans, validation of whether detections fire, and iterative detection/evasion tuning. Tracks coverage against ATT&CK and emphasizes capability improvement over "winning".

## Agent Protocol

### Trigger
User phrases: "purple team exercise", "adversary emulation", "security validation", "red vs blue".

### Input Context
- Target threat actor / TTPs to emulate.
- Current detection stack and coverage gaps.

### Output Artifact
Emulation plan mapped to ATT&CK with red execution steps and expected blue telemetry.

### Response Format
```
Technique: {Txxxx}
Red step: {action}
Expected telemetry: {log/alert}
Outcome: {Logged | Detected | Blocked}
```

> [!WARNING]
> **DISCLAIMER: EDUCATIONAL & DEFENSIVE PURPOSES ONLY**
> Purple teaming focuses on continuous improvement by combining offensive simulation with defensive tuning.

## 1. Skill Context
**Focus**: Adversary emulation plans, continuous security validation, assumed breach scenarios.
**Triggers**: purple team exercise, adversary emulation, security validation, red vs blue

## 2. Execution Framework
Purple Teaming is not a single event but a continuous feedback loop. The agent helps orchestrate this collaboration.

### Emulation Plans
- **Threat Intelligence Driven**: Selecting a specific threat actor (e.g., APT29) and extracting their TTPs from CTI reports (Cyber Threat Intelligence).
- **Execution**: The Red Team executes a specific TTP (e.g., dumping LSASS). 
- **Validation**: The Blue Team immediately checks if the SIEM/EDR generated an alert.

### The Feedback Loop
- **If Detected**: Blue team explains *how* they detected it. Red team attempts to modify the technique (e.g., obfuscation, different API calls) to bypass the detection.
- **If Not Detected**: Red team explains the exact methodology. Blue team writes a new detection rule (e.g., creating a Sigma rule) and validates it against the previous attack data.

### Metrics & Tracking
- Tracking detection coverage using tools like VECTR or MITRE ATT&CK Navigator.
- Categorizing outcomes: Logged vs. Detected vs. Blocked.

## 3. Output Format
- Provide an Advesary Emulation plan mapped to MITRE ATT&CK tactics.
- Include columns/sections for Red Team Execution steps and Blue Team Expected Telemetry.
- Emphasize communication and capability improvement over "winning".
