---
name: soar-automation
description: >
  Automate security operations with SOAR playbooks, case management, enrichment pipelines, and response orchestration.
  Use when the user asks about SOAR, playbook, security automation, XSOAR, Splunk SOAR, Tines, or case management.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, soar, phase-8]
---

# SOAR Automation

## Purpose
Design and implement SOAR playbooks for automated incident response, case management, threat enrichment, and response orchestration.

## Agent Protocol

### Trigger
- "SOAR", "playbook", "security automation", "automated response", "XSOAR"
- "Splunk SOAR", "Palo Alto XSOAR", "Tines", "Shuffle", "Torq"
- "case management", "incident enrichment", "threat enrichment", "automated containment"
- "response orchestration", "playbook trigger", "playbook action"
- "automation workflow", "security workflow", "triage automation"

### Input Context
- If SOAR platform, existing tools, and automation scope are not provided, ask.

### Output Artifact
- Playbook designs, workflow diagrams, case management templates, integration specs

### Response Format
```
## Automation Scope
{What will be automated, what stays manual}

## Playbook
{Step-by-step workflow with triggers, conditions, actions}

## Integrations
{Connected tools, API endpoints, credentials needed}
```

### Completion Criteria
- [ ] Playbooks designed for key use cases
- [ ] Case management schema defined
- [ ] Enrichment pipeline designed
- [ ] Manual vs automated actions defined

## References
  - references/playbook-development.md — SOAR Playbook Development
  - references/soar-automation-advanced.md — Soar Automation Advanced Topics
  - references/soar-automation-fundamentals.md — Soar Automation Fundamentals
  - references/soar-integrations.md — SOAR Integration Patterns
  - references/soar-platforms.md — SOAR Platforms
  - references/soar-playbooks.md — SOAR Playbook Patterns
  - references/triage-automation.md — Automated Triage
## Handoff
Playbooks integrate with siem-engineering for triggers, soc-operations for triage workflows, and threat-intelligence for enrichment.
