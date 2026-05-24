# Crossplane Provider Architecture

## Overview

Crossplane extends Kubernetes to orchestrate infrastructure through a control plane model. The architecture is built on four core resource types: Providers, Managed Resources, Composite Resources, and Claims.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Application Team                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Claim       │  │  Claim       │  │  Claim       │   │
│  │ (PostgreSQL) │  │ (PostgreSQL) │  │ (PostgreSQL) │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
└─────────┼──────────────────┼──────────────────┼──────────┘
          │                  │                  │
          │      ┌───────────┴───────────┐      │
          │      │   Crossplane Control  │      │
          │      │       Plane          │      │
          │      │  ┌─────────────────┐ │      │
          └──────┼──►   Composition   │ │      │
                 │  │ (Patch/Transf.)│ │      │
                 │  └───────┬─────────┘ │      │
                 │  ┌───────┴─────────┐ │      │
                 │  │  Composite     │ │      │
                 │  │  Resource (XR) │ │      │
                 │  └───────┬─────────┘ │      │
                 └──────────┼───────────┘      │
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                  │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌───────▼─────┐
   │ Provider    │  │ Provider    │  │ Provider    │
   │ AWS         │  │ Azure       │  │ GCP         │
   │             │  │             │  │             │
   │ Managed     │  │ Managed     │  │ Managed     │
   │ Resources   │  │ Resources   │  │ Resources   │
   │ (RDS, VPC)  │  │ (AzureSQL)  │  │ (CloudSQL)  │
   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
          │                 │                 │
          ▼                 ▼                 ▼
      AWS Cloud         Azure Cloud      GCP Cloud
```

## Providers

Providers extend Crossplane with cloud/service APIs. Each provider is a set of Kubernetes CRDs and controllers.

### Provider Types
```yaml
# Official Providers (Upbound)
- provider-aws        # AWS (upbound/provider-family-aws)
- provider-azure      # Azure (upbound/provider-family-azure)
- provider-gcp        # GCP (upbound/provider-family-gcp)

# Community Providers
- provider-kubernetes # Raw Kubernetes resources
- provider-helm      # Helm chart deployment
- provider-terraform # Wrap existing Terraform providers
- provider-sql       # Direct database management
```

### Installing a Provider
```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws
spec:
  package: xpkg.upbound.io/upbound/provider-aws:v1.4.0
```

### Provider with Custom Configuration
```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-ec2
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v1.4.0
  revisionActivationPolicy: Automatic
  packagePullPolicy: IfNotPresent
  packagePullSecrets:
    - name: private-registry-creds
```

### ProviderConfig
```yaml
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
  # Optional: assume role for multi-account
  assumeRole:
    roleARN: arn:aws:iam::123456789012:role/CrossplaneAdmin
    externalID: crossplane-session
    policyARNs:
      - arn:aws:iam::aws:policy/AdministratorAccess
```

## Managed Resources

Managed resources represent infrastructure resources managed by a provider.

```yaml
apiVersion: ec2.aws.upbound.io/v1beta1
kind: VPC
metadata:
  name: platform-vpc
spec:
  forProvider:
    region: us-east-1
    cidrBlock: 10.0.0.0/16
    enableDnsHostnames: true
    enableDnsSupport: true
    tags:
      Name: platform-vpc
  providerConfigRef:
    name: default
  deletionPolicy: Delete  # Orphan to keep on deletion
```

### Deletion Policies
- **Delete** (default): Remove cloud resource when Managed Resource is deleted
- **Orphan**: Keep cloud resource when Managed Resource is deleted

### Write Connection Secrets
```yaml
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: postgres-db
spec:
  forProvider:
    engine: postgres
    engineVersion: "15.3"
    # ...
  writeConnectionSecretToRef:
    namespace: crossplane-system
    name: postgres-connection
```

## Composite Resources (XRs)

Composite Resources (XRs) aggregate multiple Managed Resources into a single abstraction.

### Composite Resource Definition (XRD)
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
  claimNames:
    kind: PostgreSQLInstance
    plural: postgresqlinstances
  defaultCompositeDeletePolicy: Background  # Delete all composed resources
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
                    minimum: 10
                    maximum: 10000
                    default: 20
                  region:
                    type: string
                    enum: ["us-east-1", "eu-west-1", "ap-southeast-1"]
                    default: "us-east-1"
                  engineVersion:
                    type: string
                    default: "14"
                  highAvailability:
                    type: boolean
                    default: false
              connectionSecretKeys:
                type: object
                description: Keys to propagate from the provider secret
```

## Compositions

Compositions define how an XR maps to Managed Resources.

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xpostgresqlinstances.aws.database.example.org
spec:
  compositeTypeRef:
    apiVersion: database.example.org/v1alpha1
    kind: XPostgreSQLInstance

  # Detect readiness from specific resources
  readinessChecks:
  - resourceRef:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
    condition: "Ready"

  resources:
  - name: rds-subnet-group
    base:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: SubnetGroup
      spec:
        forProvider:
          region: us-east-1
          subnetIdSelector: {}
    patches:
    - fromFieldPath: spec.parameters.region
      toFieldPath: spec.forProvider.region

  - name: rds-instance
    base:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      spec:
        forProvider:
          engine: postgres
          dbInstanceClass: db.t3.medium
          allocatedStorage: 20
          publiclyAccessible: false
          skipFinalSnapshot: true
          backupRetentionPeriod: 7
          backupWindow: "03:00-04:00"
          maintenanceWindow: "Mon:04:00-Mon:05:00"
          autoMinorVersionUpgrade: true
          copyTagsToSnapshot: true
          performanceInsightsEnabled: true
          monitoringInterval: 60
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.storageGB
      toFieldPath: spec.forProvider.allocatedStorage
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.region
      toFieldPath: spec.forProvider.region
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.engineVersion
      toFieldPath: spec.forProvider.engineVersion
    - type: PatchSet
      patchSetName: connectionDetails
    - type: ToCompositeFieldPath
      fromFieldPath: status.atProvider.arn
      toFieldPath: status.dbARN

  patchSets:
  - name: connectionDetails
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: metadata.labels[crossplane.io/claim-namespace]
      toFieldPath: spec.writeConnectionSecretToRef.namespace
    - type: FromCompositeFieldPath
      fromFieldPath: metadata.labels[crossplane.io/claim-name]
      toFieldPath: spec.writeConnectionSecretToRef.name
```

## Claims

Claims are namespace-scoped resources that teams use to request infrastructure.

```yaml
apiVersion: database.example.org/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: team-alpha-db
  namespace: team-alpha
spec:
  parameters:
    storageGB: 100
    region: eu-west-1
    engineVersion: "15"
    highAvailability: true
  compositionRef:
    name: xpostgresqlinstances.aws.database.example.org
  compositionSelector:
    matchLabels:
      provider: aws
      tier: standard
  writeConnectionSecretToRef:
    name: db-connection
  resourceRef:
    apiVersion: database.example.org/v1alpha1
    kind: XPostgreSQLInstance
```

## Resource Lifecycle

```
Claim Created → Crossplane creates XR → Composition creates managed resources →
Provider controllers provision cloud resources → Status becomes "Ready" →
Connection secrets written → Claim becomes "Ready"

User deletes Claim → Deletion propagates to XR → Composition cascades to managed resources →
Provider controllers tear down cloud resources → All resources cleaned up
```

## Multi-Provider Example

```yaml
apiVersion: compute.example.org/v1alpha1
kind: XVirtualMachine
spec:
  parameters:
    region: us-east-1
    size: medium
    team: platform

---
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: virtualmachines.aws.compute.example.org
spec:
  compositeTypeRef:
    apiVersion: compute.example.org/v1alpha1
    kind: XVirtualMachine
  resources:
  - name: ec2-instance
    base:
      apiVersion: ec2.aws.upbound.io/v1beta1
      kind: Instance
      spec:
        forProvider:
          ami: ami-0c55b159cbfafe1f0
          instanceType: t3.medium
    patches:
    - fromFieldPath: spec.parameters.region
      toFieldPath: spec.forProvider.region
    - fromFieldPath: spec.parameters.size
      toFieldPath: spec.forProvider.instanceType
      transforms:
      - type: map
        map:
          small: t3.nano
          medium: t3.medium
          large: t3.large
```
