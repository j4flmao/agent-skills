# Crossplane Package Management

## Overview

Crossplane packages distribute providers, configurations, and functions as OCI-compliant images via registries. Packages enable versioning, dependency management, and reusable platform components.

## Package Types

| Type | Description | Installation |
|------|-------------|-------------|
| **Provider** | Provider packages (e.g., provider-aws) | `apiVersion: pkg.crossplane.io/v1, kind: Provider` |
| **Configuration** | XRD + Composition definitions | `apiVersion: pkg.crossplane.io/v1, kind: Configuration` |
| **Function** | Composition Functions | `apiVersion: pkg.crossplane.io/v1, kind: Function` |

## Provider Packages

### Installing a Provider
```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws
spec:
  package: xpkg.upbound.io/upbound/provider-aws:v1.4.0
  revisionActivationPolicy: Automatic
  packagePullPolicy: IfNotPresent
  packagePullSecrets:
  - name: dockerhub-creds
  ignoreCrossplaneConstraints: false
```

### Monitoring Provider Status
```bash
# Check provider installation
kubectl get provider
kubectl get provider-revision

# View provider status
kubectl describe provider provider-aws

# Check installed CRDs from provider
kubectl get crd | grep aws.upbound.io
```

## Configuration Packages

Configuration packages bundle XRDs, Compositions, and claims into deployable units.

### Creating a Configuration Package

#### Step 1: Package Structure
```
my-platform-config/
├── crossplane.yaml           # Package metadata
├── package/
│   ├── xrd/
│   │   └── postgresql.yaml   # XRD definitions
│   ├── composition/
│   │   ├── aws-composition.yaml
│   │   └── gcp-composition.yaml
│   └── composition/
│       └── functions/
│           └── test-function.yaml
```

#### Step 2: Package Metadata
```yaml
# crossplane.yaml
apiVersion: meta.pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: my-platform-config
  annotations:
    description: "Platform database configuration package"
    provider: upbound
spec:
  crossplane:
    version: ">=1.14.0-0"
  dependsOn:
  - provider: xpkg.upbound.io/upbound/provider-aws-ec2
    version: ">=v1.0.0"
  - provider: xpkg.upbound.io/upbound/provider-aws-rds
    version: ">=v1.0.0"
  - function: xpkg.upbound.io/crossplane-contrib/function-go-templating
    version: ">=v0.3.0"
```

#### Step 3: Build and Push
```bash
# Build the package
crossplane xpkg build \
  --package-root=. \
  --embed-runtime-image=xcowboy/xplane-base:v1.14 \
  --output=my-platform-config.xpkg

# Push to registry
crossplane xpkg push \
  registry.example.com/platform/my-platform-config:v1.0.0 \
  -f my-platform-config.xpkg

# Tag as latest
crossplane xpkg push \
  registry.example.com/platform/my-platform-config:latest \
  -f my-platform-config.xpkg
```

### Installing a Configuration Package
```yaml
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: my-platform-config
spec:
  package: registry.example.com/platform/my-platform-config:v1.0.0
  revisionActivationPolicy: Automatic
  skipDependencyResolution: false
```

## Function Packages

Composition Functions extend Crossplane with custom resource transformation logic.

### Installing a Function
```yaml
apiVersion: pkg.crossplane.io/v1
kind: Function
metadata:
  name: function-go-templating
spec:
  package: xpkg.upbound.io/crossplane-contrib/function-go-templating:v0.3.0
  runtimeConfigRef:
    apiVersion: pkg.crossplane.io/v1beta1
    kind: DeploymentRuntimeConfig
    name: function-config
```

### Function Runtime Config
```yaml
apiVersion: pkg.crossplane.io/v1beta1
kind: DeploymentRuntimeConfig
metadata:
  name: function-config
spec:
  deploymentTemplate:
    spec:
      selector: {}
      template:
        spec:
          containers:
          - name: package-runtime
            resources:
              requests:
                cpu: 200m
                memory: 256Mi
              limits:
                cpu: 500m
                memory: 512Mi
```

## Package Dependencies

Crossplane automatically resolves and installs package dependencies.

### Declaring Dependencies
```yaml
# crossplane.yaml
spec:
  dependsOn:
  - provider: xpkg.upbound.io/upbound/provider-aws
    version: ">=v1.0.0"
  - function: xpkg.upbound.io/crossplane-contrib/function-auto-ready
    version: ">=v1.0.0"
  - configuration: xpkg.upbound.io/my-org/common-resources
    version: "~v0.5.0"
```

### Dependency Constraints
- `>=v1.0.0` — Minimum version
- `~v0.5.0` — Compatible version range (>=0.5.0, <0.6.0)
- `^v1.0.0` — Semver compatible (>=1.0.0, <2.0.0)
- `v1.0.0` — Exact version

## Private Registries

### Registry Credentials
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: private-registry-creds
  namespace: crossplane-system
type: kubernetes.io/dockerconfigjson
stringData:
  .dockerconfigjson: |
    {
      "auths": {
        "registry.example.com": {
          "auth": "base64-encoded-user:pass"
        }
      }
    }
```

### Global Registry Config
```yaml
apiVersion: pkg.crossplane.io/v1beta1
kind: Lock
metadata:
  name: crossplane-lock
spec:
  ignoreCrossplaneConstraints: false
```

## Package Versioning Strategy

```
my-platform-config/
├── v1.0.0/          # Initial release
├── v1.1.0/          # Adding new resource type (minor)
├── v1.2.0/          # More composition options (minor)
└── v2.0.0/          # Breaking XRD schema change (major)
```

### Semantic Versioning Rules
- **Major**: Breaking changes to XRD schemas, removed fields
- **Minor**: New resources, optional XRD fields, new compositions
- **Patch**: Bug fixes, improved patches/transforms, documentation

## Package Lifecycle

### Updating Packages
```yaml
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: my-platform-config
spec:
  package: registry.example.com/platform/my-platform-config:v1.1.0
  revisionActivationPolicy: Automatic
  revisionHistoryLimit: 3  # Keep 3 old revisions
```

### Rolling Back
```yaml
# Revert to previous version
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: my-platform-config
spec:
  package: registry.example.com/platform/my-platform-config:v1.0.0
  revisionActivationPolicy: Manual  # Review before activation
```

### Deleting a Package
```bash
kubectl delete configuration my-platform-config
# Or using the provider API
kubectl delete provider provider-aws
```

## Package Repositories with Upbound

### Upbound Registry
```bash
# Login to Upbound
upbound login

# Build and publish
upbound xpkg build --package-root=. --name my-config
upbound xpkg push xpkg.upbound.io/my-org/my-config:v1.0.0
```

### Self-Hosted Registry
```yaml
# Using a private OCI registry (e.g., ECR, GCR, Harbor)
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws
spec:
  package: 123456789012.dkr.ecr.us-east-1.amazonaws.com/crossplane/provider-aws:v1.4.0
  packagePullSecrets:
  - name: ecr-registry-cred
```

## Best Practices

1. **Always pin versions** in package dependencies — never use `latest`.
2. **Use a package lock file** to ensure reproducible installs.
3. **Separate concerns** — one configuration package per domain (database, networking, compute).
4. **Test packages** in a dev cluster before promoting to production.
5. **Use `revisionActivationPolicy: Manual`** for production to control rollout timing.
6. **Set `revisionHistoryLimit`** to avoid accumulating too many revisions.
7. **Document dependencies** clearly in package metadata annotations.
8. **Sign packages** with cosign for supply chain security.
