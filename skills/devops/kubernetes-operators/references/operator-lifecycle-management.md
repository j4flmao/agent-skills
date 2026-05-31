# Kubernetes Operators: Lifecycle Management

## Overview

Operator Lifecycle Management (OLM) encompasses the full lifecycle of Kubernetes operators: packaging, distribution, installation, upgrade, scaling, and retirement. As operators become the standard mechanism for automating complex application management on Kubernetes, the discipline of managing operators themselves — versioning them, upgrading them without disruption, and removing them cleanly — becomes critical. This reference provides deep architecture for operator lifecycle management using OLM, plain manifests, and Helm-based approaches.

## Core Architecture Concepts

### Operator Lifecycle Phases

Development → Packaging → Distribution → Installation → Operation → Upgrade → Deprecation

### OLM Architecture

The Operator Lifecycle Manager (OLM) extends Kubernetes to manage operators as first-class citizens:

OLM Components:
- olm-operator: Manages ClusterServiceVersion (CSV) resources
- catalog-operator: Resolves operator dependencies and versions
- packagemanifest: Exposes available operators in a namespace

CRDs introduced by OLM:
- ClusterServiceVersion (CSV): Operator metadata, CRDs, permissions, install strategy
- CatalogSource: Repository of operator bundles
- Subscription: Namespace-scoped operator subscription to a catalog channel
- InstallPlan: Set of resources to be created for an operator installation
- OperatorGroup: Multitenant configuration for operator targets
- OperatorCondition: Operator readiness and upgrade readiness signals

### Decision Tree: Operator Installation Method

Operator Deployment Strategy:
- OLM: Automated upgrades, dependency resolution, multi-tenant. Requires OLM on cluster.
- Helm Chart: Simple operators, existing Helm tooling. No dependency resolution.
- Plain Manifests: CI/CD controlled, GitOps-driven. Manual dependency management.
- Custom Installer: Air-gapped environments, specialized requirements. Maintenance burden.

## Architecture Decision Trees

### CRD Versioning Strategy

CRD Version Evolution:
- v1alpha1: Initial design, no stability guarantee. May change arbitrarily, no backward compatibility.
- v1beta1: Stabilizing, short-term guarantee. Backward compatible within beta. Deprecated in favor of v1.
- v1: Stable, long-term guarantee. Full backward compatibility. Storage version must be v1.

### Upgrade Channel Strategy

Channel Design:
- stable: Production-ready, lowest risk. Semver 1.x to 2.x requires migration.
- alpha: Early access, highest risk. Semver 1.x-alpha.N.
- beta: Pre-release validation, medium risk. Semver 1.x-beta.N.
- custom: Organization-specific builds.

### Webhook Lifecycle

Webhook Update Strategy:
- Mutating: Update before CRD changes. New version must handle old and new CR versions.
- Validating: Update independently of CRD changes. Must remain compatible with existing CRs.
- Conversion: Required when CRD storage version changes. Must handle all existing versions.

## Implementation Strategies

### ClusterServiceVersion (CSV) Definition

The CSV is the core OLM artifact. It defines operator metadata, CRDs, permissions, install strategy, and upgrade relationships. Key fields include replaces (previous version), skips (versions to skip), skipRange (version range to bypass), and installModes (namespace scoping).

### Operator Upgrade Strategy

Upgrading operators requires version-aware reconciliation:
1. Fetch the Custom Resource
2. Check operator version migration needed
3. Apply migration logic based on previous version
4. Perform standard reconciliation
5. Update CR status with current operator version

### Bundle and Catalog Management

OLM bundles are published as container images to catalogs. The bundle Dockerfile uses scratch base and LABELs to declare package name, channels, and default channel. CatalogSources define where operators are discoverable. Subscriptions tie namespaces to catalog channels with automatic or manual approval modes.

## Integration Patterns

### GitOps for Operator Management

Managing operator versions through GitOps ensures consistency. ArgoCD manages Subscription resources that control operator versions. Sync waves ensure operators install before dependent resources.

### Multi-Namespace Operator Deployment

OperatorGroups define target namespaces for operator reconciliation. Support for OwnNamespace, SingleNamespace, MultiNamespace, and AllNamespaces modes.

## Performance Optimization

### Reconciliation Performance During Upgrades

- Rolling upgrade: One replica at a time, low risk, medium time
- Blue-green: New version alongside old, fast but 2x resources
- All-at-once: Scale down old, up new, brief downtime risk
- Recreate: Delete old, create new, CR queue backup risk

### Bundle Size Optimization

- Trim unused CRDs, only include owned CRDs
- Multi-stage builds with distroless base images
- Least privilege RBAC, remove unused permissions
- Externalize large examples from bundles

## Security Considerations

### Operator Supply Chain Security

| Measure | Implementation | Verification |
|---------|---------------|--------------|
| Image signing | Cosign signatures | Verification on install |
| Bundle signing | GPG signatures | Verification on catalog add |
| Vulnerability scanning | Trivy/Grype | Pre-publication scan gate |
| SBOM generation | CycloneDX per version | SBOM in catalog metadata |
| Provenance attestation | SLSA provenance | Build chain verification |

### RBAC Review for Upgrades

During upgrades, RBAC permissions may change. New API group access must be reviewed. Removed permissions may break reconciliation. Expanded verbs require policy validation.

## Operational Excellence

### Operator Health Monitoring

Health indicators include: CSV Phase (Installing, Succeeded, Failed), Subscription State (AtLatestKnown, UpgradeAvailable, UpgradePending), Webhook TLS certificate status, CRD establishment state.

### Operator Deprecation Process

1. Announce deprecation with minimum 3 months notice
2. Final release with deprecation warnings in operator logs
3. Update catalog to mark operator as deprecated
4. Remove from default channel
5. After deprecation period, remove from catalog
6. Clean up CRDs, webhooks, cluster-scoped resources

## Testing Strategy

### Operator Upgrade Testing

| Test | Success Criteria |
|------|------------------|
| Fresh install | All resources created, CSV Succeeded |
| Upgrade from previous | No disruption to managed resources |
| Rollback | Resources revert to previous management |
| Skip upgrade | Handles direct version upgrade |
| Webhook continuity | Both old and new webhooks process requests |
| CR migration | All existing CRs have migrations applied |

## Common Pitfalls

| Pitfall | Impact | Prevention |
|---------|--------|------------|
| Missing RBAC update | Operator fails post-upgrade | RBAC review in upgrade checklist |
| Breaking CRD changes without conversion | Existing CRs unreadable | CRD versioning with conversion webhooks |
| Webhook TLS expiry | Admission control fails | Certificate monitoring, auto-renewal |
| Incorrect skipRange | Users skip required migration | Test all upgrade paths |
| OLM namespace conflicts | OperatorGroup targets wrong namespaces | Namespace scope review |
| Missing CR finalizer cleanup | CRD removal blocked | Finalizer handling in reconciliation |

## Key Takeaways

- OLM is the standard for operator lifecycle management; use it unless compelling reasons for alternatives
- CRD versioning requires conversion webhooks for storage version changes
- Operator upgrades must be tested end-to-end: fresh install, upgrade, skip, and rollback
- Supply chain security (signing, SBOM, provenance) is essential for distributed operators
- Operator deprecation is a multi-month process requiring communication and automation
- Bundle optimization reduces catalog size and deployment time
- RBAC permissions must be reviewed at every upgrade
- GitOps integration provides auditable, version-controlled operator management
