---
name: devops-crossplane
description: >
  Crossplane control plane for platform engineering teams.
  Covers: Crossplane providers, managed resources, composite resources (XRs), compositions, claims,
  packages, Composition Functions, multi-cluster abstractions, GitOps integration.
  Do NOT use for: Terraform, Pulumi, or other IaC tools without a control plane model.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, crossplane, platform-engineering, kubernetes, phase-5]
---

# Crossplane

## Purpose
Build a Kubernetes-native control plane that enables platform teams to offer standardized, self-service infrastructure abstractions to application teams.

## Agent Protocol

### Trigger
Exact user phrases: "Crossplane", "XRD", "composition", "composite resource", "claim", "managed resource", "provider", "Crossplane function", "configuration package", "platform engineering".

### Input Context
Before activating, verify:
- Existing Crossplane version and installed providers.
- Provider credential method (Upbound Universal Crossplane, native provider, secret).
- Composite Resource Definition (XRD) status — existing or new.
- Composition strategy: patches, transforms, functions.
- Target cloud providers (AWS, Azure, GCP).

### Output Artifact
Writes to YAML files: `XRD.yaml`, `Composition.yaml`, `Claim.yaml`, `ProviderConfig.yaml`, `Package.yaml`.

### Response Format
YAML manifests with Crossplane API versions, ready for `kubectl apply`.

### Completion Criteria
This skill is complete when:
- [ ] XRD defines the desired composite resource schema.
- [ ] Composition maps XRD fields to provider managed resources.
- [ ] Claim enables application team self-service.
- [ ] Package artifacts are structured for registry publishing.
- [ ] `kubectl get composite` shows the provisioned resources.

### Max Response Length
Direct file write. No response text.

## Quick Start
Define XRD with required/optional fields → Author Composition with patches → Apply ProviderConfig → Create Claim → Validate managed resources created → Package as Configuration for registry → Add Composition Functions for complex logic.

## When to Use This Skill
- Standardizing cloud resource provisioning across teams
- Enforcing organizational policies on infrastructure
- Building platform engineering abstractions on Kubernetes
- Multi-cloud abstraction with uniform APIs
- GitOps-driven infrastructure delivery

## Core Workflow

### Step 1: Define Composite Resource Definition
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
                  region:
                    type: string
                    enum: ["us-east-1", "eu-west-1"]
                    default: "us-east-1"
                  engineVersion:
                    type: string
                    default: "14"
```

### Step 2: Author Composition
```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xpostgresqlinstances.aws.database.example.org
spec:
  compositeTypeRef:
    apiVersion: database.example.org/v1alpha1
    kind: XPostgreSQLInstance
  resources:
  - name: rds-instance
    base:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      spec:
        forProvider:
          engine: postgres
          engineVersion: "14"
          dbInstanceClass: db.t3.medium
          allocatedStorage: 20
          publiclyAccessible: false
          skipFinalSnapshot: true
    patches:
    - fromFieldPath: spec.parameters.storageGB
      toFieldPath: spec.forProvider.allocatedStorage
    - fromFieldPath: spec.parameters.region
      toFieldPath: spec.forProvider.region
    - fromFieldPath: spec.parameters.engineVersion
      toFieldPath: spec.forProvider.engineVersion
  - name: security-group
    base:
      apiVersion: ec2.aws.upbound.io/v1beta1
      kind: SecurityGroup
      spec:
        forProvider:
          ingress:
          - fromPort: 5432
            toPort: 5432
            protocol: tcp
            cidrBlocks:
            - 10.0.0.0/8
    patches:
    - fromFieldPath: spec.parameters.region
      toFieldPath: spec.forProvider.region
```

### Step 3: Application Claim
```yaml
apiVersion: database.example.org/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: my-app-db
  namespace: team-alpha
spec:
  parameters:
    storageGB: 50
    region: us-east-1
    engineVersion: "15"
  compositionRef:
    name: xpostgresqlinstances.aws.database.example.org
  writeConnectionSecretToRef:
    name: db-conn
```

### Step 4: Provider Configuration
```yaml
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: aws-provider
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-creds
      key: creds
```

## Rules & Constraints
- Never allow claims to bypass composition — all resource creation must route through compositions.
- Always version XRDs and Compositions with `referenceable: true`.
- Use patch sets for repeated patch logic across multiple resources.
- Never embed raw provider credentials in provider configs — use IRSA or Workload Identity.
- Always set `writeConnectionSecretToRef` for database and credential resources.
- Use Composition Functions for complex transformation logic, not string manipulation in patches.
- Package configurations for registry publishing with semantic versioning.

## References
- `references/provider-architecture.md` — Providers, managed resources, XRs, compositions
- `references/composition-patterns.md` — Patches, transforms, patch sets, claims
- `references/package-management.md` — Packages, registry, configuration packages
- `references/composition-functions.md` — Go/Python/TypeScript functions, testing
- `references/enterprise-patterns.md` — Multi-cluster, multi-cloud, GitOps, RBAC

## Handoff
After completing this skill:
- Next skill: **devops-gitlab-ci** — CI/CD pipelines for Crossplane configuration packages
- Pass context: Provider version, XRD names, Composition labels, claim namespace convention
