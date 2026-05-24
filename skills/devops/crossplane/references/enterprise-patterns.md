# Crossplane Enterprise Patterns

## Overview

Scaling Crossplane from a single-cluster demo to enterprise production requires patterns for multi-cluster management, multi-cloud abstractions, GitOps integration, RBAC, and cost tracking.

## Multi-Cluster Architecture

```
                  ┌─────────────────────────────┐
                  │    Global Control Plane     │
                  │  (Management Cluster)      │
                  │                             │
                  │  ┌─────────────────────┐   │
                  │  │ Crossplane Core     │   │
                  │  │ XRDs, Compositions, │   │
                  │  │ ProviderConfigs     │   │
                  │  └─────────────────────┘   │
                  │              │              │
                  │  ┌───────────▼──────────┐  │
                  │  │  provider-kubernetes │  │
                  │  │  (Deploy to child)  │  │
                  │  └─────────────────────┘  │
                  └──────────┬────────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                  │
   ┌───────▼───────┐ ┌──────▼──────┐ ┌───────▼──────┐
   │ Workload      │ │ Workload    │ │ Workload     │
   │ Cluster       │ │ Cluster     │ │ Cluster      │
   │ (us-east-1)   │ │ (eu-west-1) │ │ (ap-south-1)│
   │               │ │             │ │              │
   │ Provider AWS  │ │ Provider AWS│ │ Provider AWS │
   └───────────────┘ └─────────────┘ └──────────────┘
```

### Global Control Plane Setup

```yaml
# Management cluster: global XRDs
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xclusters.compute.example.org
spec:
  group: compute.example.org
  names:
    kind: XCluster
    plural: xclusters
  claimNames:
    kind: Cluster
    plural: clusters
  versions:
  - name: v1alpha1
    served: true
    referenceable: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            properties:
              parameters:
                properties:
                  region:
                    type: string
                  nodeCount:
                    type: integer
                    default: 3
                  environment:
                    type: string
                    enum: ["dev", "staging", "prod"]
```

```yaml
# Deploy to child cluster using provider-kubernetes
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: clusters.aws.compute.example.org
spec:
  compositeTypeRef:
    apiVersion: compute.example.org/v1alpha1
    kind: XCluster
  resources:
  - name: workload-cluster
    base:
      apiVersion: kubernetes.crossplane.io/v1alpha2
      kind: Object
      spec:
        forProvider:
          manifest:
            apiVersion: eks.aws.upbound.io/v1beta1
            kind: Cluster
            spec:
              forProvider:
                region: us-east-1
                roleArn: arn:aws:iam::xxx:role/eks-role
                vpcConfig:
                  subnetIds:
                  - subnet-xxx
    patches:
    - fromFieldPath: spec.parameters.region
      toFieldPath: spec.forProvider.manifest.spec.forProvider.region
```

## Multi-Cloud Abstractions

### Unified Database Abstraction
```yaml
# Single claim drives different cloud backends
apiVersion: database.example.org/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: team-db
spec:
  parameters:
    storageGB: 100
    engineVersion: "15"
    highAvailability: true
  compositionSelector:
    matchLabels:
      provider: aws   # Or "gcp" or "azure"
```

### Cloud-Agnostic XRD
```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xpostgresqlinstances.database.example.org
spec:
  group: database.example.org
  names:
    kind: XPostgreSQLInstance
    plural: xpostgresqlinstances
  versions:
  - name: v1alpha1
    schema:
      openAPIV3Schema:
        properties:
          spec:
            properties:
              parameters:
                properties:
                  # Cloud-agnostic parameters
                  storageGB:
                    type: integer
                  engineVersion:
                    type: string
                  highAvailability:
                    type: boolean
                  # Cloud selector
                  cloudProvider:
                    type: string
                    enum: ["aws", "gcp", "azure"]
                  failoverPriority:
                    type: array
                    items:
                      type: string
```

## GitOps Integration

### Argo CD Integration
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: crossplane-configs
spec:
  project: platform
  source:
    repoURL: https://github.com/myorg/crossplane-configs
    path: environments/prod
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
    - ServerSideApply=true
```

### GitOps Repository Structure
```
crossplane-configs/
├── environments/
│   ├── dev/
│   │   ├── providers/
│   │   ├── configurations/
│   │   └── claims/
│   ├── staging/
│   ├── prod/
│   └── global/
│       ├── provider-aws.yaml
│       ├── provider-azure.yaml
│       └── provider-gcp.yaml
├── platform/
│   ├── xrds/
│   ├── compositions/
│   └── functions/
└── teams/
    ├── alpha/
    │   ├── rds-claim.yaml
    │   └── vpc-claim.yaml
    └── beta/
```

### Flux Integration
```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crossplane-platform
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: crossplane-configs
  path: ./platform
  prune: true
  validation: client
  healthChecks:
  - apiVersion: pkg.crossplane.io/v1
    kind: Provider
    name: provider-aws
  - apiVersion: apiextensions.crossplane.io/v1
    kind: Composition
    name: xpostgresqlinstances.aws.database.example.org
```

## RBAC and Multi-Tenancy

### Platform Team Role
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: crossplane:platform-admin
rules:
- apiGroups: ["apiextensions.crossplane.io"]
  resources: ["compositeresourcedefinitions", "compositions"]
  verbs: ["*"]
- apiGroups: ["pkg.crossplane.io"]
  resources: ["providers", "configurations", "functions"]
  verbs: ["*"]
- apiGroups: ["aws.upbound.io"]
  resources: ["providerconfigs"]
  verbs: ["*"]
```

### Application Team Role
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: crossplane:claim-user
  namespace: team-alpha
rules:
- apiGroups: ["database.example.org"]
  resources: ["postgresqlinstances"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
  resourceNames: ["db-connection"]
```

### Namespace Scoping
```yaml
apiVersion: apiextensions.crossplane.io/v1alpha1
kind: Usage
metadata:
  name: team-alpha-scope
spec:
  of:
    apiVersion: database.example.org/v1alpha1
    kind: PostgreSQLInstance
  by:
    apiVersion: v1
    kind: Namespace
    name: team-alpha
  reason: "Team Alpha is allowed to create databases"
```

## Cost Tracking

### Label Propagation for Cost Allocation
```yaml
# In Composition: propagate labels from claim to all resources
patches:
- type: FromCompositeFieldPath
  fromFieldPath: metadata.labels[crossplane.io/claim-name]
  toFieldPath: spec.forProvider.tags.ClaimName
- type: FromCompositeFieldPath
  fromFieldPath: metadata.labels[crossplane.io/claim-namespace]
  toFieldPath: spec.forProvider.tags.ClaimNamespace
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.team
  toFieldPath: spec.forProvider.tags.Team
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.costCenter
  toFieldPath: spec.forProvider.tags.CostCenter
```

### AWS Cost Explorer Tagging
```json
{
  "TagKeys": [
    "ClaimName",
    "ClaimNamespace",
    "Team",
    "CostCenter",
    "Environment",
    "Platform"
  ]
}
```

## Observability

### Crossplane Metrics
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: crossplane-monitor
spec:
  selector:
    matchLabels:
      app: crossplane
  endpoints:
  - port: metrics
    interval: 15s
    path: /metrics
```

### Key Metrics
```
# Resource reconciliation
crossplane_managed_resource_uptodate
crossplane_managed_resource_exists
crossplane_composite_resource_exists

# Package health
crossplane_package_revision_health

# Provisioning times
crossplane_resource_provisioning_duration_seconds

# Errors
crossplane_managed_resource_errors_total
crossplane_composite_resource_errors_total
```

## Platform Team Workflow

```
Day 1: Define XRD + Composition → Push package to registry
Day 2: Create claim in dev namespace → Validate resources created
Day 3: Add tests and validation → Promote to staging
Day 4: GitOps deploy to production → Monitor metrics
Day 5: Collect feedback → Iterate on XRD schema
```

## Best Practices

1. **Global XRDs, local compositions**: Define schemas globally but allow per-region compositions.
2. **GitOps as source of truth**: Never create claims manually in production.
3. **Namespace tenancy**: Each team gets one namespace with RBAC-limited claim access.
4. **Cost allocation**: Tag all resources with team, cost center, environment.
5. **Drift detection**: Run `crossplane validate` in CI and periodic reconciliation checks.
6. **Progressive delivery**: Roll out new composition versions via ArgoCD stages.
7. **Audit logging**: Enable Kubernetes audit logs for all Crossplane API operations.
8. **Resource quotas**: Set namespace resource quotas to prevent runaway provisioning.
