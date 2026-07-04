---
name: soar-automation
description: >
  Comprehensive skill for developing, optimizing, and deploying
  Security Orchestration, Automation, and Response (SOAR)
  playbooks and integrations. Covers state management,
  performance tuning, testing, and error handling at scale.
version: 2.0.0
author: j4flmao
license: MIT
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - security
  - soar
  - automation
  - playbooks
---

# SOAR Automation Engineering

## Purpose
The primary purpose of this skill is to empower autonomous agents to engineer enterprise-grade SOAR playbooks, custom integrations, and fully automated remediation pipelines. Modern Security Operations Centers (SOCs) depend heavily on automated response capabilities to handle an ever-increasing volume of alerts without overwhelming human analysts. This skill guarantees the capability to architect scalable event-driven playbooks, integrate with myriad security tools (SIEM, EDR, Threat Intel), maintain state across disparate microservices, and handle exceptions gracefully to ensure zero drop rate for critical security incidents. 

By utilizing this skill, an agent can securely parse incident data, enrich it, execute conditional branching based on decision matrices, and perform containment actions (like host isolation or IP blocking) safely.

## Core Principles
1. **Idempotent Execution Guarantee**: Every automated action must be fully idempotent, ensuring that concurrent or repeated playbook triggers do not result in unintended side-effects or system instability.
2. **Defensive Error Handling**: Assume all external APIs will eventually fail, rate-limit, or timeout. Implement rigorous circuit breakers, exponential backoff, and fallback routing for mission-critical paths.
3. **Strict State Isolation**: Playbook execution states must be completely isolated. Avoid global mutable variables. Pass contextual state explicitly to prevent data leakage between concurrent security alerts.
4. **Least Privilege Contexts**: Limit the execution scope and credentials of any single integration. A playbook designed to query Active Directory should not have permissions to alter firewall rules unless strictly necessary.
5. **Deterministic Auditability**: Every decision, branch, API call, and response must be cryptographically or reliably logged to ensure post-incident forensic review and compliance with organizational policies.

## Agent Protocol

### Triggers
- Inbound webhook alerts from SIEM (e.g., Splunk, Sentinel).
- Escalation events from Tier 1 analyst actions.
- Scheduled threat hunting chron triggers.

### Input Context Required
- Raw alert payload (JSON).
- Correlated threat indicators (IPs, domains, hashes).
- Analyst override flags.

### Output Artifact
- Enriched incident dossier.
- Playbook execution trace log.
- Containment status report.

### Response Formats
```json
{
  "playbook_id": "pb-alpha-994",
  "status": "success",
  "remediation_actions": [
    {
      "type": "block_ip",
      "target": "198.51.100.4",
      "system": "palo_alto_fw",
      "timestamp": "2026-06-28T09:25:00Z"
    }
  ],
  "metrics": {
    "execution_time_ms": 450,
    "api_calls_made": 12
  }
}
```

## Decision Matrix

```text
       [Inbound Security Alert]
                  |
        Is Alert Severity > High?
               /     \
             Yes      No
             /          \
   [Enrich Data]    [Log & Close]
         |
 Threat Intel Match?
       /    \
     Yes     No
     /        \
[Contain]   [Escalate to Analyst]
     |
  Success?
   /   \
 Yes    No
  |      |
[Log] [Trigger Backup Playbook]
```

## Detailed Architectural Overview

```text
+-------------------------------------------------------------+
|                     SOAR Core Engine                        |
|                                                             |
|  +-------------+    +---------------+    +---------------+  |
|  | Event Queue | -> | Playbook Exec | -> | State Store   |  |
|  +-------------+    +---------------+    +---------------+  |
|          ^                  |                    |          |
+----------|------------------|--------------------|----------+
           |                  v                    v
   +---------------+  +---------------+    +---------------+
   | SIEM Webhooks |  | External APIs |    | Analyst UI    |
   +---------------+  +---------------+    +---------------+
```

### Lifecycle Diagram
```text
[Ingestion] -> [Normalization] -> [Enrichment] -> [Decision] -> [Action] -> [Post-Action Review]
```

## Workflow Steps

### Phase 1: Event Ingestion and Normalization
1. Validate incoming webhook payload signature.
2. Extract core entities (IPs, users, endpoints).
3. Map to Common Information Model (CIM) format.

### Phase 2: Contextual Enrichment
1. Query internal asset databases for host ownership.
2. Poll external Threat Intelligence platforms for IOC reputation.
3. Consolidate results into a unified context object.

### Phase 3: Risk Assessment and Triage
1. Calculate a normalized risk score using an ensemble of metrics.
2. Apply whitelist/suppression rules to filter false positives.
3. Determine if automated remediation is authorized for the asset class.

### Phase 4: Automated Remediation Execution
1. Isolate the compromised endpoint via EDR API.
2. Block malicious domains on secure web gateways.
3. Suspend compromised user accounts in Identity Provider.

### Phase 5: Verification and Escalation
1. Verify API success responses for all actions.
2. Validate actual containment via secondary checks.
3. Route fallback tasks to human analysts if automated steps fail.

### Phase 6: Post-Incident Operations
1. Compile final incident report.
2. Update case management system with playbook traces.
3. Send executive summary notifications.

## Extended Troubleshooting Guide

| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Playbook timeout | Slow Threat Intel API response | Implement circuit breaker and lower timeout thresholds |
| Stale state errors | Concurrency race condition on state read/write | Use atomic transactions or distributed locks for state updates |
| API Rate Limiting (429) | Spikes in alert volume overwhelming integrations | Implement exponential backoff and queueing mechanism |
| Missing Context | Upstream SIEM payload changed format | Update normalization parsers and schema validators |
| Unintended Isolation | Missing asset whitelist enforcement | Audit whitelist rules and enforce 'dry-run' flags on VIP assets |
| Action Not Logged | Audit trail database connection failure | Enable local fallback logging and replay mechanisms |

## Complete Execution Scenario

```text
  User clicks Phishing Link
           |
       EDR Alert
           |
   [SOAR Webhook Trigger]
           |
    Extract URL & User ID
           |
  Check URL vs ThreatIntel <---> (Malicious)
           |
   Quarantine Endpoint     <---> (Success via CrowdStrike API)
           |
   Reset User Password     <---> (Success via Active Directory)
           |
    Generate Ticket        <---> (Jira Issue Created)
           |
      [End Process]
```

## Rules and Guidelines
1. Do not hardcode internal IP ranges or domains; always fetch from dynamic configuration sets.
2. Ensure every API request specifies a strict timeout parameter to prevent blocking the event loop.
3. Never log sensitive personally identifiable information (PII) or authentication tokens in playbook trace logs.
4. When writing custom integration scripts, always include a full suite of mocked unit tests.
5. Prioritize read-only enrichment actions over state-mutating containment actions unless explicitly instructed by the incident response policy.

## Reference Guides
- [Architecture Patterns](references/architecture-patterns.md)
- [State Management](references/state-management.md)
- [Performance Optimization](references/performance-optimization.md)
- [Security Best Practices](references/security-best-practices.md)
- [Testing Strategies](references/testing-strategies.md)
- [Deployment Pipelines](references/deployment-pipelines.md)
- [Error Handling](references/error-handling.md)
- [Code Organization](references/code-organization.md)

## Handoff
When containment actions require infrastructure-level changes beyond standard APIs, hand off to the `cloud-infrastructure-management` skill. For advanced malware analysis logic, interface with the `malware-reverse-engineering` skill.

<!-- COMPRESSION_FOOTER: {"schema": "v2", "hash": "a1b2c3d4e5f6", "size": 4096} -->
