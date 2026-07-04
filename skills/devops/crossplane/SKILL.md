---
name: devops/crossplane
description: >
  A comprehensive skill for deploying, managing, and troubleshooting
  Crossplane-based cloud infrastructure abstractions. Includes advanced
  composition, XRD management, and provider configuration strategies.
version: "2.0.0"
author: j4flmao
license: MIT
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, crossplane, kubernetes, iac, control-plane]
---

# Crossplane Engineering Skill

## Purpose
The purpose of this skill is to empower agents with the ability to define, deploy, and debug complex infrastructure control planes using Crossplane. It covers the entire lifecycle of Compositions, CompositeResourceDefinitions (XRDs), and external Provider configurations, providing highly detailed templates and references.

## Core Principles
1. Infrastructure as Data: Treat all infrastructure components as declarative data managed by Kubernetes APIs.
2. Separation of Concerns: Maintain strict boundaries between API definitions (XRDs) and their implementations (Compositions).
3. Least Privilege Provider Access: Ensure cloud provider credentials are scoped precisely to the resources they manage.
4. Deterministic State Management: Rely on Crossplane's continuous reconciliation to manage drift and ensure desired state.
5. Reusable Abstractions: Design Compositions to be generic and reusable across multiple environments (Dev, Staging, Prod).

## Agent Protocol
### Triggers
- "Deploy Crossplane composition"
- "Troubleshoot crossplane provider"
- "Create new XRD for [Resource]"

### Input Context Required
- Target Kubernetes cluster credentials/context
- Desired API surface (for XRDs)
- Cloud provider details (AWS, GCP, Azure)

### Output Artifact
- YAML manifests for XRDs and Compositions
- ProviderConfig specifications
- Architecture deployment diagrams

### Response Formats
```json
{
  "action": "apply_xrd",
  "resource": "xpostgresqlinstances.database.example.org",
  "status": "ready",
  "conditions": [
    {
      "type": "Established",
      "status": "True"
    }
  ]
}
```

## Decision Matrix
```text
[New Request]
     |
     v
Is it an API Definition?
/                     \
YES                    NO
/                        \
[Create XRD]           Does it implement an API?
                         /                \
                       YES                 NO
                       /                     \
               [Create Composition]   [Create Provider/MR]
```

## Detailed Architectural Overview
```text
+---------------------------------------------------+
|                  Kubernetes API                   |
|  +------------+   +------------+   +-----------+  |
|  |   Claims   |-->|    XRDs    |<--| Composites|  |
|  +------------+   +------------+   +-----------+  |
+---------------------------------------------------+
         |                                 |
         v                                 v
+------------------+             +------------------+
| Application Team |             | Platform Team    |
+------------------+             +------------------+
```
### Lifecycle Diagram
```text
Claim Created -> XR Provisioned -> Composition Selected -> MRs Created -> Cloud Resources Provisioned -> Status Updated
```

## Workflow Steps

### Phase 1: Planning and Scoping
1. Identify the infrastructure requirements from the application team.
2. Determine the cloud providers necessary for the resources.
3. Map the required fields for the API definition.
4. Validate access constraints for targeted cloud accounts.

### Phase 2: Provider Configuration
1. Install necessary Crossplane Providers (e.g., provider-aws).
2. Create ProviderConfigs binding to specific cloud credentials.
3. Verify Provider health and API discovery.
4. Audit installed CRDs to verify full provider surface.

### Phase 3: XRD Definition
1. Write the CompositeResourceDefinition (XRD) OpenAPI schema.
2. Define cluster-scoped and namespace-scoped (Claim) names.
3. Apply the XRD and wait for the "Established" condition.
4. Generate corresponding documentation for the new API.

### Phase 4: Composition Implementation
1. Create a Composition targeting the newly established XRD.
2. Define the array of base Managed Resources (MRs).
3. Implement patch sets to map XRD fields to MR properties.
4. Implement connection details extraction (e.g., database endpoints).

### Phase 5: Testing and Validation
1. Create a namespace-scoped Claim.
2. Monitor the instantiation of the XR and underlying MRs.
3. Validate cloud resource creation via the cloud provider console/CLI.
4. Verify Secret creation for connection details.

### Phase 6: Maintenance and Upgrades
1. Monitor Crossplane controller logs for reconciliation errors.
2. Implement versioning strategies for XRDs (e.g., v1alpha1 to v1beta1).
3. Update Provider versions using package revisions.
4. Run regression tests upon major platform upgrades.

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---|---|---|
| XR stuck in "Not Ready" | MRs failing to provision | Check Crossplane event logs and MR status conditions |
| Provider unhealthy | Invalid credentials/IAM | Rotate credentials and verify ProviderConfig secrets |
| Composition not selected | Label mismatch | Verify Composition selector matches Claim labels |
| Patches not applying | Invalid jsonPath | Validate patch paths against MR OpenAPI schemas |
| Claims not creating XR | XRD not established | Check XRD events for schema validation errors |
| Connection secret missing | Extraction failed | Verify ConnectionDetail patches in Composition |

## Complete Execution Scenario
```text
[User Request] --> [Agent parses requirements]
                          |
                          v
            [Agent generates XRD YAML]
                          |
                          v
            [Agent generates Composition]
                          |
                          v
            [Apply to Cluster via kubectl]
                          |
                          v
           [Agent monitors XR/MR readiness]
                          |
                          v
             [Success Notification sent]
```

## Rules and Guidelines
1. ALWAYS validate OpenAPI schemas in XRDs before applying.
2. NEVER hardcode sensitive credentials in ProviderConfigs.
3. MUST use explicit Composition selectors on Claims in multi-tenant clusters.
4. PREFER bidirectional patching only when external state updates are required.
5. AVOID massive Compositions; break them down using nested XRs if possible.

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
For continuous delivery integrations, refer to `devops/argocd` or `devops/flux`. For credential management, refer to `security/vault`.

<!-- COMPRESSION_FOOTER: {"optimized": true, "tokens_saved": 400} -->
