---
name: crossplane
description: >
  Use this skill when the user says 'Crossplane', 'control plane',
  'managed resources', 'composite resources', 'XRDs', 'Composition',
  'provider', 'provider-aws', 'provider-kubernetes', 'crossplane CLI',
  'composition functions', 'claim', 'composite resource',
  'platform engineering', 'infrastructure as code', 'control plane'.
  Covers: Crossplane installation, XRD (CompositeResourceDefinition) design,
  Composition patterns, providers (AWS, GCP, Azure, K8s), claims,
  composition functions (inline and standalone), package management,
  enterprise patterns, multi-cloud abstraction.
  Do NOT use for: Terraform (use terraform skill), Pulumi (use pulumi skill).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, crossplane, iac, platform-engineering, phase-5]
---

# Crossplane

## Purpose
Provision and manage cloud infrastructure using Crossplane control plane with custom composite resources (XRDs), compositions, providers, and claims for platform engineering.

## Architecture Decision Trees

### Crossplane vs Terraform vs Pulumi
| Feature | Crossplane | Terraform | Pulumi |
|---|---|---|---|
| Architecture | K8s-native control plane | CLI-based | CLI/SDK-based |
| State management | K8s etcd (in-cluster) | Remote state (S3, etc.) | Service/self-managed |
| Drift detection | Continuous reconciliation | Manual (plan/apply) | Manual (refresh) |
| Multi-cloud | Single control plane | Per-provider state | Single state |
| GitOps integration | Native (K8s YAML) | ArgoCD/Terraform Controller | Automation API |
| Language | YAML/Composition | HCL | TypeScript/Python/Go |
| Learning curve | High (XRDs + Composition) | Medium | Medium |
| Best for | Platform teams, K8s shops | General IaC | Developer-familiar IaC |

### Provider Selection
| Provider | Resources | Stability | Notes |
|---|---|---|---|
| provider-aws | 1000+ (EC2, S3, RDS, IAM, etc.) | GA | Most complete |
| provider-azure | 500+ | GA | Azure-native |
| provider-gcp | 400+ | GA | GCP-native |
| provider-helm | Chart installs | GA | K8s add-ons |
| provider-kubernetes | Raw K8s resources | GA | In-cluster resources |
| provider-sql | Postgres, MySQL | Alpha | Database users/DBs |

### Composite Resource Pattern
```
Claim (mydb.example.com/v1alpha1)
  └── namespace: team-a    ← User creates this (self-service)
        └── Composite Resource (XPostgreSQLInstance)
              └── managed resources (Composition)
                    ├── RDSInstance (provider-aws)
                    ├── SecurityGroup (provider-aws)
                    └── DatabaseSecret (provider-kubernetes)
```

## Quick Start
Install Crossplane → Install provider (provider-aws) → Define XRD → Write Composition → Create Claim → Verify resources.

## Core Workflow

### Step 1: Install Crossplane and Provider
```yaml
# install/crossplane.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: crossplane-system
---
apiVersion: helm.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: helm-config
spec:
  credentials:
    source: InjectedIdentity
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws
spec:
  package: xpkg.upbound.io/crossplane-contrib/provider-aws:v1.1.0
---
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-creds
      key: creds
```

### Step 2: XRD (Composite Resource Definition)
```yaml
# xrds/x-postgres-instance.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xpostgresqlinstances.database.example.com
spec:
  group: database.example.com
  names:
    kind: XPostgreSQLInstance
    plural: xpostgresqlinstances
  claimNames:
    kind: PostgreSQLInstance
    plural: postgresqlinstances
  connectionSecretKeys:
    - host
    - port
    - username
    - password
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                parameters:
                  type: object
                  properties:
                    storageGB:
                      type: integer
                      default: 20
                      minimum: 10
                      maximum: 1000
                    instanceClass:
                      type: string
                      enum: [db.t3.small, db.t3.medium, db.r5.large]
                      default: db.t3.small
                    engine:
                      type: string
                      enum: [postgres, mysql]
                      default: postgres
                    engineVersion:
                      type: string
                      default: "15"
                    autoMinorVersionUpgrade:
                      type: boolean
                      default: true
                    multiAZ:
                      type: boolean
                      default: false
                    subnetGroupName:
                      type: string
                      default: "default"
                  required:
                    - storageGB
              required:
                - parameters
```

### Step 3: Composition
```yaml
# compositions/xpostgresql-instance-v1alpha1.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xpostgresqlinstances.database.example.com
  labels:
    provider: aws
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: XPostgreSQLInstance

  resources:
    - name: security-group
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: SecurityGroup
        spec:
          forProvider:
            description: "Crossplane managed PostgreSQL SG"
            ingress:
              - fromPort: 5432
                toPort: 5432
                protocol: tcp
                cidrBlocks:
                  - "10.0.0.0/8"
              - fromPort: 5432
                toPort: 5432
                protocol: tcp
                cidrBlocks:
                  - "172.16.0.0/12"
            egress:
              - fromPort: 0
                toPort: 0
                protocol: "-1"
                cidrBlocks:
                  - "0.0.0.0/0"
            tags:
              Name: "crossplane-postgresql"
        providerConfigRef:
          name: default
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.claimRef.namespace
          toFieldPath: spec.forProvider.tags.CrossplaneClaimNamespace

    - name: db-subnet-group
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: SubnetGroup
        spec:
          forProvider:
            subnetIds: []
            tags:
              Name: "crossplane-postgresql"
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.subnetGroupName
          toFieldPath: spec.forProvider.subnetIds
          transforms:
            - type: string
              string:
                fmt: "%s-subnet-ids"

    - name: rds-instance
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            engine: postgres
            engineVersion: "15"
            autoMinorVersionUpgrade: true
            publiclyAccessible: false
            backupRetentionPeriod: 7
            backupWindow: "04:00-04:30"
            maintenanceWindow: "sun:05:00-sun:05:30"
            skipFinalSnapshot: false
            finalSnapshotIdentifier: ""
            storageType: gp3
            storageEncrypted: true
            monitoringInterval: 60
            monitoringRoleArn: ""
            performanceInsightsEnabled: true
            performanceInsightsRetentionPeriod: 7
            enabledCloudwatchLogsExports: ["postgresql"]
            deleteAutomatedBackups: false
            deletionProtection: true
            tags:
              Name: "crossplane-postgresql"
              ManagedBy: "crossplane"
          writeConnectionSecretToRef:
            namespace: crossplane-system
            name: postgresql-connection
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.storageGB
          toFieldPath: spec.forProvider.allocatedStorage
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.instanceClass
          toFieldPath: spec.forProvider.dbInstanceClass
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.engine
          toFieldPath: spec.forProvider.engine
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.engineVersion
          toFieldPath: spec.forProvider.engineVersion
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.multiAZ
          toFieldPath: spec.forProvider.multiAz
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.autoMinorVersionUpgrade
          toFieldPath: spec.forProvider.autoMinorVersionUpgrade
        - type: ToCompositeFieldPath
          fromFieldPath: status.atProvider.arn
          toFieldPath: status.instanceARN
      connectionDetails:
        - fromConnectionSecretKey: username
        - fromConnectionSecretKey: password
        - fromConnectionSecretKey: host
        - fromConnectionSecretKey: port
```

### Step 4: Claim (User-facing)
```yaml
# claims/team-a-db.yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: team-a-production-db
  namespace: team-a
spec:
  parameters:
    storageGB: 100
    instanceClass: db.r5.large
    engine: postgres
    engineVersion: "15"
    multiAZ: true
  writeConnectionSecretToRef:
    name: db-connection
```

### Step 5: Composition Functions (Inline)
```yaml
# compositions/with-functions.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: with-functions
spec:
  compositeTypeRef:
    apiVersion: example.com/v1alpha1
    kind: XExampleResource
  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: crossplane-contrib-function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
        resources:
          - name: my-resource
            base:
              apiVersion: s3.aws.upbound.io/v1beta1
              kind: Bucket
              spec:
                forProvider:
                  acl: private
            patches:
              - type: FromCompositeFieldPath
                fromFieldPath: spec.parameters.name
                toFieldPath: metadata.annotations[crossplane.io/external-name]
```

### Step 6: Package Management
```yaml
# package/configuration.yaml
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: my-platform-config
spec:
  package: myregistry/my-platform-config:v1.0.0
  packagePullPolicy: Always
  revisionActivationPolicy: Automatic
  revisionHistoryLimit: 3
---
# Build with:
# crossplane xpkg build --name my-platform-config.xpkg
# crossplane xpkg push myregistry/my-platform-config:v1.0.0 my-platform-config.xpkg
```

## Anti-Patterns

### Anti-Pattern 1: XRDs Too Similar to Provider Resources
Creating XRDs that are 1:1 wrappers around single provider resources. XRDs should provide meaningful abstraction — combine related resources and simplify configuration.

### Anti-Pattern 2: No Validation in XRD
Not using OpenAPI schema validation in XRDs. User errors propagate to provider resource failures. Define `minimum`, `maximum`, `enum`, `pattern` constraints.

### Anti-Pattern 3: Ignoring Composition Patches
Not using patches to propagate composite field values to managed resources. Use `FromCompositeFieldPath`, `ToCompositeFieldPath`, and transforms to wire up resources.

### Anti-Pattern 4: Direct Provider Resource Creation
Users creating provider resources directly instead of through claims. Claims are the self-service interface — enforce creation through claims only.

### Anti-Pattern 5: No ProviderConfig Management
Using a single ProviderConfig for all environments. Create separate ProviderConfig per environment/account for isolation.

## Production Considerations
- Use Composition Functions (Pipeline mode) for complex logic beyond YAML.
- Version XRDs to manage breaking changes (v1alpha1 → v1beta1 → v1).
- Restrict provider resource creation to crossplane-system only.
- Enable crossplane monitoring (metrics on port 8080).
- Use external name for importing existing resources.
- Pin provider versions and test before upgrading.

## Rules & Constraints
- XRDs must define meaningful abstraction (not 1:1 wrappers).
- Claims are the only self-service interface for users.
- Use Composition patches for field mapping.
- Validate inputs in XRD OpenAPI schema.
- Pin provider and configuration package versions.
- Use Kubernetes network policies to isolate Crossplane components.

## References
  - references/composition-functions.md
  - references/composition-patterns.md
  - references/crossplane-advanced.md
  - references/crossplane-fundamentals.md
  - references/enterprise-patterns.md
  - references/package-management.md
  - references/provider-architecture.md
  - references/xrd-design-guide.md

## Handoff
Next: **terraform** — Terraform vs Crossplane comparison for IaC.

## Implementation Patterns

### YAML: Composite Resource (XRD) with Composition

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
spec:
  group: infrastructure.acme.co
  names:
    kind: XPostgreSQL
    plural: xpostgresqls
  claimNames:
    kind: PostgreSQL
    plural: postgresqls
  versions:
    - name: v1alpha1
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                region:
                  type: string
                storageGB:
                  type: integer
                  default: 100
---
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
spec:
  compositeTypeRef:
    apiVersion: infrastructure.acme.co/v1alpha1
    kind: XPostgreSQL
  resources:
    - name: rds-instance
      base:
        apiVersion: database.aws.crossplane.io/v1beta1
        kind: RDSInstance
        spec:
          forProvider:
            engine: postgres
            engineVersion: "15"
            dbInstanceClass: db.t3.medium
            masterUsername: postgres
            allocatedStorage: 100
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.storageGB
          toFieldPath: spec.forProvider.allocatedStorage
```

### Bash: Crossplane Provider Health Check

```bash
#!/usr/bin/env bash
set -euo pipefail

check_providers() {
  kubectl get provider -o json | jq -r '
    .items[] | select(.status.conditions[]?.type == "Healthy") |
    "\(.metadata.name): \(.status.conditions[] | select(.type == "Healthy") | .status)"
  '

  UNHEALTHY=$(kubectl get provider -o json | jq '
    [.items[] | select(.status.conditions[]?.type == "Healthy" and .status.conditions[]?.status != "True")] | length
  ')

  if [ "$UNHEALTHY" -gt 0 ]; then
    echo "WARNING: $UNHEALTHY provider(s) are unhealthy"
    exit 1
  fi
}
```

## Production Considerations

- Use **crossplane packages** to distribute compositions across clusters via OCI registries
- Pin provider versions with **version constraints** to prevent unexpected upgrades
- Configure **ProviderConfig** with IRSA (IAM Roles for Service Accounts) instead of hardcoded creds
- Enable **crossplane-rbac** to restrict which claims each namespace team can create
- Set **resource limits** on crossplane pods — composition reconciliation is CPU intensive
- Use **composition functions** (Go, Python) for complex transformations beyond patching
- Monitor provider API call rates to avoid hitting AWS/GCP/Azure throttling limits

## Anti-Patterns

- Creating **one massive XRD** that tries to provision everything — compose smaller, reusable XRDs
- Using **`dependsOn`** heavily — prefer composition functions or patches to order resources
- Keeping **provider credentials** as raw Kubernetes secrets — always use external secret stores
- Ignoring **claim namespaces** — every team deploying claims pollutes the crossplane system namespace
- Mixing **composition versions** without migration strategies — breaking changes affect all claims
- Overusing **`patchSets`** for simple mappings — inline patches are more readable
- Forgetting to **prune deleted resources** — crossplane leaves orphaned cloud resources if not configured

## Performance Optimization

- Set **`spec.reclaimPolicy: Delete`** on managed resources to auto-clean when claims are deleted
- Use **`provider-xxx` resource timeouts** to prevent stuck reconciliations from blocking the queue
- Optimize **composition revision history** — keep only last 3 revisions with `revisionHistoryLimit: 3`
- Reduce **API call rate** by batching updates in composition functions instead of per-resource patches
- Tune **crossplane controller manager** `--max-reconcile-rate` for the cluster size
- Use **composition function results caching** to avoid re-evaluating unchanged inputs
- Set **readiness checks** on individual composed resources to surface provisioning status early

## Security Considerations

- Restrict **crossplane ServiceAccount** with least-privilege ClusterRole — never use cluster-admin
- Rotate **provider credentials** via external secrets operator with automatic refresh
- Enable **composition dry-run** validation in CI before applying to production
- Use **OPA/Gatekeeper** to validate claim parameters (e.g., enforce max storage size)
- Scan **crossplane packages** for vulnerabilities before installing from OCI registries
- Audit **managed resource deletions** with Kubernetes audit logs and alert on mass deletions
- Set **NetworkPolicy** to restrict crossplane pod egress to only cloud provider API endpoints
