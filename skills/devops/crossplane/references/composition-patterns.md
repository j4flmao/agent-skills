# Crossplane Composition Patterns

## Overview

Compositions are the heart of Crossplane — they define how composite resources (XRs) are broken down into managed resources. This reference covers patches, transforms, patch sets, and advanced composition patterns.

## Patch Types

Crossplane supports several patch types, each serving a different purpose:

| Patch Type | Description |
|-----------|-------------|
| `FromCompositeFieldPath` | Copy field from XR to managed resource |
| `ToCompositeFieldPath` | Copy field from managed resource to XR |
| `CombineFromComposite` | Combine multiple XR fields into one managed resource field |
| `CombineToComposite` | Combine multiple managed resource fields into one XR field |
| `Environment` | Read from or write to environment configuration |

## Transform Types

| Transform | Description |
|-----------|-------------|
| `map` | Map values using a lookup table |
| `match` | Regex-based replacement |
| `string` | String operations (prefix, suffix, fmt) |
| `convert` | Type conversion |
| `math` | Multiply or add |
| `regex` | Regex extract and assemble |

## Basic Patch Examples

### Direct Field Mapping
```yaml
patches:
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.region
  toFieldPath: spec.forProvider.region
```

### Conditional Patching
```yaml
patches:
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.storageGB
  toFieldPath: spec.forProvider.allocatedStorage
  policy:
    fromFieldPath: Optional  # Don't error if field is missing
```

## Transform Patterns

### Map Transform
```yaml
patches:
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.tier
  toFieldPath: spec.forProvider.instanceType
  transforms:
  - type: map
    map:
      development: t3.nano
      staging: t3.medium
      production: m5.xlarge
    # Optional: set default for unmapped values
    # fallbackValue: t3.micro
```

### String Transform
```yaml
patches:
- type: FromCompositeFieldPath
  fromFieldPath: metadata.labels[crossplane.io/claim-name]
  toFieldPath: metadata.name
  transforms:
  - type: string
    string:
      fmt: "%s-database-instance"
      # Or use prefix/suffix:
      # prefix: "platform-"
      # suffix: "-managed"
```

### Convert Transform
```yaml
patches:
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.storageGB
  toFieldPath: spec.forProvider.allocatedStorage
  transforms:
  - type: convert
    convert: Multiply  # Multiply by 1 (same)
    # Other modes: ToString, ToInteger, ToBoolean
```

### Math Transform
```yaml
patches:
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.storageGB
  toFieldPath: spec.forProvider.allocatedStorage
  transforms:
  - type: math
    multiply: 1073741824  # Convert GB to bytes for some providers
```

### Regex Transform
```yaml
patches:
- type: FromCompositeFieldPath
  fromFieldPath: metadata.labels[crossplane.io/claim-namespace]
  toFieldPath: spec.forProvider.tags
  transforms:
  - type: regex
    regex:
      match: "^([a-z]+)-([a-z]+)$"
      group: 0  # Entire match
      # Or assemble multiple groups
      # group: 0
      # assemble: "{1}-{2}-platform"
```

## Patch Sets

Reuse common patch groups across multiple resources.

```yaml
spec:
  patchSets:
  - name: commonTags
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.environment
      toFieldPath: spec.forProvider.tags.Environment
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.team
      toFieldPath: spec.forProvider.tags.Team
    - type: FromCompositeFieldPath
      fromFieldPath: metadata.labels[crossplane.io/claim-name]
      toFieldPath: spec.forProvider.tags.ClaimName

  - name: connectionDetails
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: metadata.labels[crossplane.io/claim-namespace]
      toFieldPath: spec.writeConnectionSecretToRef.namespace
    - type: FromCompositeFieldPath
      fromFieldPath: metadata.labels[crossplane.io/claim-name]
      toFieldPath: spec.writeConnectionSecretToRef.name

  resources:
  - name: rds-instance
    base:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      spec: { }
    patches:
    - type: PatchSet
      patchSetName: commonTags
    - type: PatchSet
      patchSetName: connectionDetails

  - name: elasticache-cluster
    base:
      apiVersion: elasticache.aws.upbound.io/v1beta1
      kind: Cluster
      spec: { }
    patches:
    - type: PatchSet
      patchSetName: commonTags
```

## Combine Patches

### CombineFromComposite
```yaml
# Combine multiple XR fields into one value on managed resource
patches:
- type: CombineFromComposite
  combine:
    variables:
    - fromFieldPath: spec.parameters.name
    - fromFieldPath: spec.parameters.environment
    strategy: string
    string:
      fmt: "%s-%s-db"
  toFieldPath: spec.forProvider.dbName
```

### CombineToComposite
```yaml
# Combine managed resource fields into one XR field
patches:
- type: CombineToComposite
  combine:
    variables:
    - fromFieldPath: status.atProvider.arn
    - fromFieldPath: status.atProvider.engine
    strategy: string
    string:
      fmt: "arn:%s:engine:%s"
  toFieldPath: status.connectionEndpoint
  policy:
    fromFieldPath: Required
```

## Advanced Composition Patterns

### Conditionally Include Resources
```yaml
resources:
- name: read-replica
  base:
    apiVersion: rds.aws.upbound.io/v1beta1
    kind: Instance
    spec:
      forProvider:
        engine: postgres
        dbInstanceClass: db.t3.small
  patches:
  - type: FromCompositeFieldPath
    fromFieldPath: spec.parameters.region
    toFieldPath: spec.forProvider.region
  # Use patch policy to conditionally apply
  - type: FromCompositeFieldPath
    fromFieldPath: spec.parameters.readReplica
    toFieldPath: spec.forProvider.enabled
    policy:
      fromFieldPath: Optional
```

### Multi-Cloud Composition with Selectors
```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xpostgresqlinstances.aws.database.example.org
  labels:
    provider: aws
    engine: postgres
---
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xpostgresqlinstances.gcp.database.example.org
  labels:
    provider: gcp
    engine: postgres
---
# Claim uses compositionSelector instead of ref:
spec:
  compositionSelector:
    matchLabels:
      engine: postgres
    # Automatically selects based on provider context
```

### Nested Compositions
```yaml
# Composition that references another XR
resources:
- name: networking-stack
  base:
    apiVersion: network.example.org/v1alpha1
    kind: XVPC
    spec:
      parameters:
        cidrBlock: 10.0.0.0/16
  patches:
  - type: FromCompositeFieldPath
    fromFieldPath: spec.parameters.region
    toFieldPath: spec.parameters.region
    policy:
      fromFieldPath: Required

- name: compute-stack
  base:
    apiVersion: compute.example.org/v1alpha1
    kind: XCluster
    spec:
      parameters:
        nodeCount: 3
  patches:
  - type: FromCompositeFieldPath
    fromFieldPath: spec.parameters.environment
    toFieldPath: spec.parameters.environment
```

## Composition Validation

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: validated-composition
spec:
  compositeTypeRef:
    apiVersion: database.example.org/v1alpha1
    kind: XPostgreSQLInstance

  # Validate before provisioning
  validate: true

  resources:
  - name: rds-instance
    base:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      spec:
        forProvider:
          engine: postgres
          autoMinorVersionUpgrade: true
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.storageGB
      toFieldPath: spec.forProvider.allocatedStorage
      policy:
        fromFieldPath: Required
        validate: true  # Validate field exists

    readinessChecks:
    - type: NonEmpty
      fieldPath: status.atProvider.arn
    - type: MatchCondition
      matchCondition:
        type: Ready
        status: "True"
```

## Best Practices

1. **Use Patch Sets** for common tagging and labeling patterns across all resources in a composition.
2. **Prefer map transforms** for environment-to-size mappings instead of embedding provider-specific details in XRDs.
3. **Always validate** with XRD schema — use `minimum`, `maximum`, `enum`, `pattern` in OpenAPI schema.
4. **Use composition selectors** over composition refs to allow automatic selection based on labels.
5. **Set fallback values** in transforms to handle missing fields gracefully.
6. **Document complex transforms** with annotations on the Composition resource.
7. **Version compositions** independently from XRDs by using different composition names.
8. **Test compositions** in a dev environment before promoting to production.
