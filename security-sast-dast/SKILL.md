---
name: security-sast-dast
description: >
  Comprehensive expert-level implementation of security-sast-dast methodologies, providing deep 
  architectural patterns, mathematical formulations, and strict operational guidelines.
version: "2.0.0"
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
  - architecture
  - security-sast-dast
---
# security-sast-dast

## Purpose - comprehensive description
This skill encapsulates the entirety of the security-sast-dast domain, providing subagents with the exact procedural logic, architectural blueprints, and cryptographic / security primitives required to implement, audit, or enforce security-sast-dast within enterprise ecosystems.

## Core Principles
1. Immutability of audit logs and security telemetry.
2. Principle of least privilege enforced strictly at every boundary.
3. Defense in depth through layered validation schemas.
4. Cryptographic integrity for all transit and at-rest states.
5. Deterministic fallback states during anomalous system events.

## Agent Protocol
- Triggers: Any mention of security-sast-dast, security audits, or architectural reviews.
- Input Context Required: Target environment configuration, source code boundaries, cloud provider metadata.
- Output Artifact: A comprehensive markdown report detailing findings and remediation.
- Response Formats:
```json
{
  "finding_id": "SEC-001",
  "severity": "CRITICAL",
  "domain": "security-sast-dast",
  "remediation_plan": "..."
}
```

## Decision Matrix
```text
      [Input Data]
           |
    +------+------+
    |             |
[Valid]       [Invalid]
    |             |
[Process]      [Alert]
```

## Detailed Architectural Overview
```text
  [Ingress] -> [WAF/Gateway] -> [security-sast-dast Validator] -> [Data Layer]
                                     |
                               [Audit Log]
```

## Workflow Steps
1. Initialization Phase
   1. Bootstrap environment variables.
   2. Validate cryptographic keys.
   3. Establish secure TLS tunnels.
2. Reconnaissance Phase
   1. Map attack surface.
   2. Identify service boundaries.
   3. Baseline normal operations.
3. Execution Phase
   1. Run heuristics engine.
   2. Correlate threat intelligence.
   3. Execute state modifications.
4. Validation Phase
   1. Verify state integrity.
   2. Cross-check access control lists.
   3. Run compliance assertions.
5. Reporting Phase
   1. Aggregate logs.
   2. Generate executive summary.
   3. Formulate JSON response.
6. Teardown Phase
   1. Purge volatile memory.
   2. Close TLS tunnels.
   3. Archive audit events.

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Timeout | Network partition | Check routing |
| Denied Access | IAM misconfiguration | Audit policies |
| Data Corruption | Disk failure | Restore from backup |
| High Latency | CPU throttling | Scale horizontally |
| Auth Failure | Expired token | Rotate credentials |
| Crash Loop | OOM Killer | Increase memory limits |

## Complete Execution Scenario
```text
[Trigger] -> [Init] -> [Scan] -> [Report] -> [Teardown]
```

## Rules and Guidelines
1. Never bypass the TLS validation step.
2. Always log authentication failures.
3. Fail closed on permission errors.
4. Use standard cryptographic libraries (no custom crypto).
5. Sanitize all user inputs before processing.

## Reference Guides
- [Reference File](references/core_architecture_and_patterns.md)
- [Reference File](references/advanced_algorithms_and_math.md)
- [Reference File](references/comprehensive_data_schemas.md)
- [Reference File](references/deployment_and_configuration.md)
- [Reference File](references/complex_decision_matrices.md)
- [Reference File](references/security_best_practices_anti_patterns.md)
- [Reference File](references/troubleshooting_and_diagnostics.md)
- [Reference File](references/api_and_integration_reference.md)

## Handoff
None.

<!-- COMPRESSION FOOTER -->
