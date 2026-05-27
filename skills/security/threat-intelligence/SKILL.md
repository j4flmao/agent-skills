---
name: threat-intelligence
description: >
  Manage threat intelligence feeds, IoC/TTP management, threat hunting, and MITRE ATT&CK mapping.
  Use when the user asks about threat intelligence, CTI, threat feed, IoC, TTP, MITRE ATT&CK, threat hunting, or intelligence lifecycle.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, threat-intel, phase-8]
---

# Threat Intelligence

## Purpose
Manage cyber threat intelligence operations including feed management, IoC/TTP handling, threat hunting, and MITRE ATT&CK mapping.

## Agent Protocol

### Trigger
- "threat intelligence", "CTI", "threat feed", "threat intel", "intelligence"
- "IoC", "indicator of compromise", "TTP", "MITRE ATT&CK", "attack chain"
- "threat hunting", "hunt hypothesis", "proactive hunting"
- "intelligence lifecycle", "strategic intelligence", "tactical intelligence"
- "threat actor", "campaign", "TTP mapping", "threat landscape"

### Input Context
- If industry, threat model, and existing intelligence sources are not provided, ask.

### Output Artifact
- Threat intelligence reports, IoC lists, ATT&CK mappings, hunting hypotheses

### Response Format
```
## Intelligence Summary
{Relevant threats, actors, campaigns}

## IoC/TTP Details
{Indicators with context, MITRE mapping}

## Hunting Recommendations
{Hypotheses, data sources, techniques}
```

### Completion Criteria
- [ ] Intelligence sources identified and prioritized
- [ ] IoC management process defined
- [ ] TTP mapping to MITRE ATT&CK completed
- [ ] Threat hunting plan with hypotheses

## References
  - references/cti-lifecycle.md — Threat Intelligence Lifecycle
  - references/osint-collection.md — OSINT Collection
  - references/threat-hunting.md — Threat Hunting
  - references/threat-intelligence-advanced.md — Threat Intelligence Advanced Topics
  - references/threat-intelligence-fundamentals.md — Threat Intelligence Fundamentals
  - references/ti-platforms.md — Threat Intelligence Platforms
  - references/ti-sharing.md — Threat Intelligence Sharing
## Handoff
IoC feeds integrated with siem-engineering for detection rules. TTP mapping informs soc-operations for analyst workflows.
