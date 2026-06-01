# Crossplane Fundamentals

## Overview
Crossplane is an open-source Kubernetes add-on that enables platform teams to provision and manage cloud infrastructure using Kubernetes APIs. It extends Kubernetes with custom resources representing cloud services (databases, buckets, clusters, networks).

## Core Concepts

### Control Plane Architecture
Crossplane runs as a set of controllers in a Kubernetes cluster. It introduces three layers: Providers (connect to cloud APIs), Managed Resources (individual cloud resources), and Composite Resources (custom abstractions combining multiple resources).

### Providers
Providers are Kubernetes controllers that manage specific cloud resources. Each provider corresponds to a cloud platform (provider-aws, provider-azure, provider-gcp). Providers install CRDs for each cloud service. They handle authentication, API calls, and state reconciliation.

### Managed Resources
A Managed Resource (MR) is a Kubernetes custom resource representing a single cloud resource. Example: an RDSInstance CR corresponds to an AWS RDS database. MRs are created, updated, and deleted via kubectl or GitOps, and Crossplane reconciles them with the cloud provider.

### Composite Resources (XRs)
Composite Resources (XRs) are custom API abstractions defined by platform teams. An XR combines multiple Managed Resources into a single Kubernetes object. Example: a CompositePostgreSQL XR creates a VPC, subnet, RDS instance, secret, and service account from a single claim.

### Claims
Claims are namespaced Kubernetes resources that developers use to request infrastructure. A claim references a CompositeResourceDefinition and provides input parameters. Claims enable self-service infrastructure without exposing cloud details.

## Key Components

### Composition
Composition defines how a Composite Resource is implemented. It specifies which Managed Resources to create, how they connect, and how parameters are passed. Compositions can use patches, transforms, and conditions.

### XRD (CompositeResourceDefinition)
XRD defines the schema for a Composite Resource. It specifies the API version, kind, and validation schema. Claims are automatically generated from XRD definitions.

### Package Manager
Crossplane packages bundle providers, configurations, and functions into OCI images. Packages are installed via Crossplane CLI or Kubernetes manifests. Enable versioned, distributable infrastructure components.

## Basic Configuration

### RDS Instance via Crossplane
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
      name: aws-secret
      key: credentials
---
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: my-database
spec:
  forProvider:
    region: us-east-1
    dbInstanceClass: db.t3.medium
    engine: postgres
    engineVersion: "16"
    masterUsername: admin
    allocatedStorage: 100
    skipFinalSnapshot: false
  writeConnectionSecretToRef:
    name: db-conn
    namespace: my-app
```

## Best Practices
- Define Composite Resources for standard infrastructure patterns.
- Use Claims to provide self-service infrastructure for developers.
- Version your Compositions and XRDs for upgrade management.
- Store Crossplane configuration in Git for GitOps workflows.
- Use ProviderConfigs for cloud credential management.
- Monitor Crossplane resource status for drift detection.
- Test Compositions in non-production environment first.

## References
- crossplane-advanced.md -- Advanced Crossplane topics
- compositions.md -- Compositions Guide
- providers.md -- Provider Configuration
- composite-resources.md -- Composite Resource Definitions
- crossplane-gitops.md -- Crossplane with GitOps
