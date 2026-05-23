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
- `references/soar-playbooks.md` — playbook patterns and templates
- `references/soar-integrations.md` — common integration patterns

## Handoff
Playbooks integrate with siem-engineering for triggers, soc-operations for triage workflows, and threat-intelligence for enrichment.
