---
name: kubernetes-patterns
description: >
  Comprehensive guide to advanced Kubernetes patterns,
  including Sidecar, Ambassador, and custom K8s Operators (CRDs).
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
  - kubernetes
  - patterns
  - operator
  - crd
---

# Title
Kubernetes Patterns and Advanced Operations

## Purpose
This skill provides deep knowledge of Kubernetes architectural patterns, focusing on Sidecar, Ambassador, and custom Operator patterns using CRDs.

## Core Principles
1. Decentralize concerns using Sidecar pattern for logging and monitoring.
2. Abstract external services using Ambassador pattern for network proxying.
3. Automate operations using the Operator pattern.
4. Define robust Custom Resource Definitions (CRDs).
5. Ensure security and validation using Admission Webhooks.

## Agent Protocol
Triggers: User asks for k8s architecture or operator design.
Input Context Required: Cluster details, workloads.
Output Artifact: Architecture markdown or CRD YAML.
Response Formats:
```json
{
  "pattern": "Sidecar",
  "action": "inject",
  "status": "success"
}
```

## Decision Matrix
+-------------------+       +--------------------+
| Need DB Proxy?    | ----> | Use Ambassador     |
+-------------------+       +--------------------+
        |
        v
+-------------------+       +--------------------+
| Need Logging?     | ----> | Use Sidecar        |
+-------------------+       +--------------------+

## Detailed Architectural Overview
+---------+      +-----------+
| Pod     | ---> | Container |
|         |      +-----------+
|         | ---> | Sidecar   |
+---------+      +-----------+

Lifecycle: Init -> Start -> Run -> Terminate

## Workflow Steps
Phase 1: Design
1. Analyze requirements.
2. Choose pattern.
3. Draft CRD.
4. Review architecture.

Phase 2: Implementation
1. Write YAML.
2. Build Operator.
3. Configure RBAC.
4. Test locally.

Phase 3: Deployment
1. Apply CRD.
2. Deploy Operator.
3. Monitor logs.
4. Scale out.

Phase 4: Validation
1. Run e2e tests.
2. Validate webhooks.
3. Check metrics.
4. Audit security.

Phase 5: Maintenance
1. Upgrade CRDs.
2. Patch Operator.
3. Rotate certs.
4. Update docs.

Phase 6: Teardown
1. Delete instances.
2. Remove Operator.
3. Delete CRD.
4. Clean RBAC.

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Pod Crash | OOM | Increase limits |
| CRD not found | API missing | Apply CRD first |
| Webhook fail | TLS error | Rotate certs |
| Operator loop | Bug in reconcile | Fix logic |
| Proxy timeout | Network down | Check Ambassador |
| Sidecar fails | Bad image | Check registry |

## Complete Execution Scenario
Start -> Apply CRD -> Start Operator -> Create CR -> Reconcile -> Done

## Rules and Guidelines
1. Always validate CRDs.
2. Use minimal RBAC.
3. Handle reconcile errors gracefully.
4. Keep sidecars lightweight.
5. Use structured logging.

## Reference Guides
- [Sidecar Pattern](references/sidecar_pattern.md)
- [Ambassador Pattern](references/ambassador_pattern.md)
- [Custom K8s Operators](references/custom_k8s_operators.md)
- [CRD Design Guide](references/crd_design_guide.md)
- [Adapter Pattern](references/adapter_pattern.md)
- [Operator SDK Tutorial](references/operator_sdk_tutorial.md)
- [Mutating Webhook](references/mutating_webhook.md)
- [Validating Webhook](references/validating_webhook.md)

## Handoff
Refer to `docker-build` for image creation.

<!-- HTML Compression Footer -->

<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->
<!-- padding -->