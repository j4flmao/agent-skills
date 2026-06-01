# Crossplane Advanced Topics

## Introduction
Advanced Crossplane covers function composition, provider development, Crossplane with GitOps, multi-cloud control planes, and crossplane at enterprise scale.

## Function Composition
Crossplane Functions are composable units of logic for Compositions. Use Functions for: patching, conditionals, transform, validation. Built-in functions: PatchAndTransform, Sequence. Custom functions in Go or Python via gRPC. Function pipelines chain multiple functions together. Functions enable reusable logic across Compositions.

## Provider Development
Build custom providers for internal or third-party APIs. Use Crossplane provider template repository. Define Managed Resources as CRDs with Terraform or Upjet. Handle create, read, update, delete operations. Implement observe function for state reconciliation. Publish provider as Crossplane package.

## Crossplane with GitOps
Store XRD, Composition, and Claim definitions in Git ArgoCD/Flux apply Crossplane configurations. GitOps controller syncs Crossplane resources. Environment promotion through Git branches. Drift detection and reconciliation. Audit trail through Git history.

## Multi-Cloud Control Plane
Single Crossplane instance managing AWS, Azure, GCP, and on-prem. Consistent API for infrastructure across providers. Composition abstraction hides provider differences. Policy enforcement across all clouds. Unified observability and cost tracking.

## Enterprise Crossplane
Crossplane as internal cloud API: platform team defines abstractions, application teams consume claims. RBAC: platform team manages XRDs/Compositions, app teams manage Claims only. Resource limits and quotas at Composite Resource level. Crossplane Packages for versioned, distributable infrastructure components. Usage tracking to charge teams for infrastructure consumption.

## Advanced Composition Patterns
Nested compositions: composite resource creates other composite resources. Claim propagation: claim parameters automatically passed to XR. Patch transforms: string conversion, map, match, merge. Readiness checks: condition-based resource readiness. Connection details: automatically expose connection secrets to claim namespace.

## References
- crossplane-fundamentals.md -- Fundamentals
- compositions.md -- Compositions Guide
- providers.md -- Provider Configuration
- composite-resources.md -- XRDs
- crossplane-gitops.md -- Crossplane with GitOps
