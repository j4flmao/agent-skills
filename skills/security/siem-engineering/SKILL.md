---
name: siem-engineering
description: >
  Design SIEM architecture, onboard log sources, create correlation rules, manage use cases, and tune detection.
  Use when the user asks about SIEM, Splunk, Wazuh, Elastic Security, Microsoft Sentinel, log source, correlation rule, or SIEM use case.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, siem, phase-8]
---

# SIEM Engineering

## Purpose
Design and maintain SIEM infrastructure, onboard log sources, develop correlation rules, manage detection use cases, and tune for false positive reduction.

## Agent Protocol

### Trigger
- "SIEM", "Splunk", "Elastic Security", "Wazuh", "Microsoft Sentinel", "QRadar"
- "log source", "log onboarding", "syslog", "Windows Event Log", "log collector"
- "correlation rule", "detection rule", "SIEM use case", "use case management"
- "false positive", "SIEM tuning", "alert suppression", "SIEM optimization"
- "log retention", "SIEM architecture", "log ingestion", "index strategy"

### Input Context
- If SIEM platform, data sources, and compliance requirements are not provided, ask.

### Output Artifact
- SIEM architecture diagrams, correlation rule definitions, use case backlog, tuning recommendations

### Response Format
```
## Architecture
{SIEM components, data flow, ingestion pipeline}

## Rules
{Correlation rules with logic, severity, response}

## Use Cases
{Priority-ordered detection use cases}

## Tuning
{False positive reduction plan, suppression rules}
```

### Completion Criteria
- [ ] SIEM architecture designed with ingestion pipeline
- [ ] Log sources identified and onboarding planned
- [ ] Correlation rules defined for key use cases
- [ ] Tuning strategy documented for FP reduction

## References
- `references/siem-architecture.md` — SIEM components and data flow
- `references/correlation-rules.md` — rule patterns and examples

## Handoff
Use cases feed into soc-operations for triage workflows. Rules can be automated via soar-automation.
