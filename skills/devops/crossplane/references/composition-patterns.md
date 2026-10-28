# Crossplane Composition Patterns (Pipeline Mode + function-patch-and-transform)

A Composition tells Crossplane which resources to create for a composite resource (XR). Since Crossplane v1.17 the native `mode: Resources` patch-and-transform engine was deprecated, and Crossplane v2 removed it: every Composition is a **pipeline of composition functions**. Patch-and-transform still exists, as `function-patch-and-transform`. This reference covers its patch and transform syntax and the composition patterns built on it. Writing custom functions (Go, Python, KCL, templates) is covered in `composition-functions.md`.

## Crossplane v2 Changes That Affect Compositions

| Area | v1.x | v2 |
|------|------|----|
| Composition mode | `Resources` (native P&T) or `Pipeline` | `Pipeline` only |
| XR scope | Cluster-scoped XR + namespaced Claim | XRs are namespaced by default (`spec.scope: Namespaced`); `LegacyCluster` keeps claims for migration |
| XRD API | `apiextensions.crossplane.io/v1` | `apiextensions.crossplane.io/v2` |
| Composed resources | Managed resources only | Any Kubernetes resource (Deployments, ConfigMaps, MRs) |

Check the installed version (`kubectl get deploy -n crossplane-system crossplane -o jsonpath='{.spec.template.spec.containers[0].image}'`) before copying examples between versions.

## Install the Function

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Function
metadata:
  name: function-patch-and-transform
spec:
  package: xpkg.crossplane.io/crossplane-contrib/function-patch-and-transform:v0.11.2
---
apiVersion: pkg.crossplane.io/v1
kind: Function
metadata:
  name: function-auto-ready
spec:
  package: xpkg.crossplane.io/crossplane-contrib/function-auto-ready:v0.7.3
```

Versions shown were current in October 2026; pin exact tags and upgrade deliberately.

## Minimal Pipeline Composition

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: postgres-aws
  labels:
    provider: aws
spec:
  compositeTypeRef:
    apiVersion: platform.example.org/v1alpha1
    kind: PostgresInstance
  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
        resources:
          - name: rds
            base:
              apiVersion: rds.aws.upbound.io/v1beta1
              kind: Instance
              spec:
                forProvider:
                  engine: postgres
                  engineVersion: "16"
                  instanceClass: db.t3.micro
                  allocatedStorage: 20
                  skipFinalSnapshot: true
            patches:
              - type: FromCompositeFieldPath
                fromFieldPath: spec.parameters.region
                toFieldPath: spec.forProvider.region
    - step: automatically-detect-ready
      functionRef:
        name: function-auto-ready
```

Steps run in order; each receives the desired state produced by the previous step.

## Patch Types

| Type | Direction | Typical use |
|------|-----------|-------------|
| `FromCompositeFieldPath` | XR → composed | Pass parameters down |
| `ToCompositeFieldPath` | composed → XR | Surface IDs/endpoints in XR `status` |
| `CombineFromComposite` | several XR fields → one composed field | Build names, ARNs |
| `CombineToComposite` | several composed fields → one XR field | Build a connection URL in status |
| `FromEnvironmentFieldPath` / `ToEnvironmentFieldPath` | environment ↔ composed | Shared per-cluster config (needs an environment-loading step) |
| `CombineFromEnvironment` / `CombineToEnvironment` | combine with environment | |
| `PatchSet` | reuse a named list of patches | DRY across resources |

### Optional vs Required Source Fields

```yaml
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.storageGB
  toFieldPath: spec.forProvider.allocatedStorage
  policy:
    fromFieldPath: Required   # default is Optional: patch is skipped if field missing
```

`Required` fails the step when the field is absent, which surfaces bad input instead of silently using the base value.

## Transform Types (function-patch-and-transform syntax)

```yaml
transforms:
  # map: lookup table
  - type: map
    map:
      small: db.t3.micro
      medium: db.t3.large
      large: db.r6g.xlarge

  # match: literal or regexp patterns with a fallback
  - type: match
    match:
      patterns:
        - type: literal
          literal: prod
          result: true
        - type: regexp
          regexp: '^stag.*'
          result: false
      fallbackValue: false

  # string: Format, Convert (ToUpper/ToLower/ToBase64/FromBase64/ToJson/ToSha256...), TrimPrefix/TrimSuffix, Regexp, Join, Replace
  - type: string
    string:
      type: Format
      fmt: "%s-db"

  - type: string
    string:
      type: Regexp
      regexp:
        match: '^arn:aws:iam::(\d+):.*'
        group: 1

  # math: Multiply, ClampMin, ClampMax
  - type: math
    math:
      type: Multiply
      multiply: 1024

  # convert: change type
  - type: convert
    convert:
      toType: int64          # string | int | int64 | bool | float64 | object | array
```

Transforms run in list order; a `convert` is often needed after a `string` transform before writing into an integer field.

## Patch Sets

```yaml
input:
  apiVersion: pt.fn.crossplane.io/v1beta1
  kind: Resources
  patchSets:
    - name: common
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.region
          toFieldPath: spec.forProvider.region
        - type: FromCompositeFieldPath
          fromFieldPath: metadata.labels[team]
          toFieldPath: spec.forProvider.tags.team
  resources:
    - name: rds
      base: { apiVersion: rds.aws.upbound.io/v1beta1, kind: Instance }
      patches:
        - type: PatchSet
          patchSetName: common
    - name: subnet-group
      base: { apiVersion: rds.aws.upbound.io/v1beta1, kind: SubnetGroup }
      patches:
        - type: PatchSet
          patchSetName: common
```

## Combine Patches

```yaml
- type: CombineFromComposite
  combine:
    variables:
      - fromFieldPath: spec.parameters.team
      - fromFieldPath: spec.parameters.env
    strategy: string
    string:
      fmt: "%s-%s-db"
  toFieldPath: metadata.annotations[crossplane.io/external-name]

- type: CombineToComposite
  combine:
    variables:
      - fromFieldPath: status.atProvider.address
      - fromFieldPath: status.atProvider.port
    strategy: string
    string:
      fmt: "%s:%d"
  toFieldPath: status.endpoint
```

The XRD must declare `status.endpoint` in its schema, or the write is pruned.

## Readiness

`function-auto-ready` marks the XR ready when all composed resources are ready. For resources without a `Ready` condition, set checks per resource:

```yaml
readinessChecks:
  - type: MatchCondition
    matchCondition:
      type: Synced
      status: "True"
  # other types: None, NonEmpty, MatchString, MatchInteger, MatchTrue, MatchFalse (with fieldPath)
```

## Selecting a Composition

```yaml
# XR picks a composition by labels instead of a fixed name
spec:
  crossplane:
    compositionSelector:
      matchLabels:
        provider: aws
        tier: standard
```

In v2 namespaced XRs, Crossplane machinery fields live under `spec.crossplane` (`compositionRef`, `compositionSelector`, `compositionUpdatePolicy`, `resourceRefs`). Legacy cluster-scoped XRs and claims keep them directly under `spec`.

## Conditional Resources

Patch-and-transform cannot conditionally omit a resource. Use a templating or logic step for that:

- `function-go-templating`: wrap a resource in `{{ if eq .observed.composite.resource.spec.parameters.ha true }}`.
- `function-kcl` or `function-python`: build the resource list in code.
- Keep P&T for the plain field mapping and put the conditional resources in a separate pipeline step.

## Nested XRs

A Composition can compose another XR (for example `XNetwork` inside `XCluster`). Pass parameters down with patches and read outputs back from the child XR `status` with `ToCompositeFieldPath`. Keep nesting shallow (two levels) so failures stay debuggable with `crossplane beta trace`.

## Validate and Render Locally

```bash
# Render the desired state without a cluster (needs Docker for functions)
crossplane render xr.yaml composition.yaml functions.yaml

# Include observed resources to test status patches
crossplane render xr.yaml composition.yaml functions.yaml --observed-resources=observed/

# Validate rendered output against provider CRD schemas
crossplane render xr.yaml composition.yaml functions.yaml > out.yaml
crossplane beta validate extensions/ out.yaml

# Inspect a live XR tree
crossplane beta trace postgresinstance.platform.example.org/orders-db -n team-a
```

## Pitfalls

| Pitfall | Effect | Fix |
|---------|--------|-----|
| Copying `mode: Resources` examples | Rejected in v2 | Move `resources:` into a `function-patch-and-transform` step |
| Writing to an XR status field not in the XRD | Silently pruned | Add the field to the XRD `status` schema |
| String value patched into integer field | Provider validation error | Add `convert` transform |
| Renaming a resource `name:` in the list | Crossplane treats it as a new resource and deletes the old one | Keep resource names stable |
| Forgetting a readiness step | XR never becomes Ready | Add `function-auto-ready` or explicit `readinessChecks` |

## Checklist

- [ ] `mode: Pipeline`, functions installed and version-pinned
- [ ] Required inputs use `policy.fromFieldPath: Required`
- [ ] Shared patches in `patchSets`
- [ ] Status outputs declared in the XRD schema
- [ ] `crossplane render` and `crossplane beta validate` run in CI
- [ ] Readiness handled for every composed resource
