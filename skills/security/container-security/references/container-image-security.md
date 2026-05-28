# Container Image Security

## Overview

Container image security covers the entire image lifecycle from build through registry storage to deployment. This reference provides deep technical guidance on image scanning strategies, Dockerfile hardening, multi-stage builds, base image selection, SBOM generation, image signing (Cosign), vulnerability management, image registry security, and CI/CD security pipeline integration.

## Image Scanning Deep Dive

### Scanner Architecture

All container image scanners follow a similar architecture:

1. Image Fetch: Pull image layers from registry or local Docker daemon
2. Layer Extraction: Decompress and analyze each image layer
3. Package Identification: Identify OS packages (dpkg, rpm, apk) and language-specific libraries (npm, pip, gem, jar)
4. CVE Matching: Match identified packages against vulnerability databases (NVD, OSV, GitHub Advisories)
5. Severity Classification: Assign severity (CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN) based on CVSS scores
6. Result Output: Generate report in SARIF, JSON, HTML, or table format

### Trivy Configuration

```yaml
trivy_config:
  scan:
    scanners: ["vuln", "secret", "misconfig"]
    severity: ["CRITICAL", "HIGH", "MEDIUM"]
    ignore_unfixed: false
    vuln_type: ["os", "library"]
    format: sarif
    output: trivy-results.sarif
    exit_code: 1
    skip_dirs: ["/usr/share/doc", "/usr/share/man"]
    timeout: 10m
  image:
    scan: myapp:latest
    cache_dir: /tmp/trivy-cache
    db_repository: ghcr.io/aquasecurity/trivy-db:2
    slow: true
```

**Scanning Strategy per Pipeline Stage**

| Stage | Scanner | Severity Gate | Action |
|---|---|---|---|
| Developer workstation | Trivy CLI | HIGH | Warning, fix before commit |
| CI commit/build | Trivy + Grype | CRITICAL | Block build |
| CI PR | Trivy | HIGH | PR comment with results |
| Registry push | Trivy + Cosign attest | CRITICAL+HIGH | Block push if failed |
| Registry (scheduled) | Trivy | CRITICAL | Create Jira ticket |
| Deployment (admission) | Kyverno (verify attestation) | N/A | Block if no valid attestation |

### Grype Configuration

```yaml
grype_config:
  scan:
    scope: all-layers
    sbom: sbom.cdx.json
    fail_on_severity: critical
    only_fixed: true
    exclude:
      - CVE-2023-1234
      - CVE-2023-5678
  db:
    auto_update: true
    max_allowed_build_age: 24h
```

## Dockerfile Hardening Guide

### Base Image Selection

| Image | Size | Security | Best For |
|---|---|---|---|
| scratch | ~0 MB | Best (empty) | Statically linked Go binaries |
| distroless/base | ~20 MB | Very High | Production containers |
| distroless/static | ~2 MB | Very High | Static binaries |
| alpine:3.19 | ~7 MB | High | Tooling, utility images |
| ubuntu:22.04 (slim) | ~80 MB | Medium | Development, compatibility |
| ubuntu:22.04 | ~200 MB | Low | Full-featured base |

**Rule of thumb**: Distroless or scratch for production. Alpine for most tooling. Full images only in build stages.

### Production Dockerfile Example

```dockerfile
# Build stage with full SDK
FROM golang:1.22-alpine AS builder
RUN apk add --no-cache git ca-certificates
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags='-w -s -extldflags=-static' -o /app

# Runtime stage - minimal attack surface
FROM gcr.io/distroless/static:nonroot
COPY --from=builder /app /app
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3
  CMD ["/app", "healthcheck"]
LABEL org.opencontainers.image.source=https://github.com/org/myapp
LABEL org.opencontainers.image.revision=sha
LABEL org.opencontainers.image.created=date
ENTRYPOINT ["/app"]
```

### Dockerfile Hardening Checklist

```yaml
dockerfile_hardening:
  base_image:
    - Use distroless or scratch for production
    - Pin exact image digest (never use latest tag)
    - Minimize base image footprint
    - Multi-stage build with separate build and runtime stages
  user:
    - USER 10001:10001 (non-root, known uid)
    - Never use root in runtime stage
    - Running as non-root prevents container breakout escalation
  filesystem:
    - COPY --chown=10001:10001 for owned files
    - READONLY root filesystem (enforced at runtime)
    - Mount writable paths as volumes explicitly
    - .dockerignore file to exclude unnecessary files
  packages:
    - Pin exact package versions (apk add package=1.2.3)
    - Remove cache after install (rm -rf /var/cache/apk/*)
    - Minimize installed packages (only what is needed at runtime)
  secrets:
    - Docker buildkit --secret flag (not build args)
    - Never hardcode credentials in Dockerfile
    - No secrets in image layers (even if removed later)
  metadata:
    - HEALTHCHECK instruction required
    - LABEL for provenance (source, revision, created)
    - EXPOSE for documentation purposes
    - STOPSIGNAL SIGTERM for graceful shutdown
```

## SBOM Generation and Management

### Syft Configuration

```yaml
syft_config:
  packages:
    catalogers: [all]
    exclude_patterns:
      - /usr/share/doc/**
      - /usr/share/man/**
  output:
    format: cyclonedx-json
    file: sbom.cdx.json
  attest: true
```

### SBOM Formats

| Format | Standard Body | Support | Best For |
|---|---|---|---|
| CycloneDX | OWASP | Broad (OWASP, tooling) | Vulnerability matching, supply chain |
| SPDX | Linux Foundation | Broad (legal, compliance) | License compliance |
| SWID | ISO/IEC | Limited | Enterprise asset management |

**Policy Requirements**
- No image deployable without SBOM
- SBOM must be generated per build (not per release)
- SBOM must be stored in registry alongside image
- SBOM must be signed (Cosign attestation)
- SBOM must be rescanable (Grype can scan SBOM directly)

## Image Signing with Cosign

### Keyless Signing (Recommended for Cloud CI)

```yaml
cosign_keyless:
  identity_providers:
    - GitHub OIDC
    - GitLab OIDC
    - Google Cloud Workload Identity
    - Azure Workload Identity
  workflow:
    - Build image
    - Scan image (Trivy, Grype)
    - Sign image: cosign sign --keyless IMAGE
    - Attest scan results: cosign attest --keyless --type sarif scan.sarif IMAGE
    - Attest SBOM: cosign attest --keyless --type cyclonedx sbom.cdx.json IMAGE
    - Push image to registry
```

### Key-Based Signing (Air-Gapped / Regulated)

```yaml
cosign_key_based:
  keys:
    generate: cosign generate-key-pair
    storage: KMS (AWS KMS, GCP KMS, Azure Key Vault)
    public_key_distribution: Admission controller config
  key_rotation:
    period: 90 days
    overlap: 72 hours
```

## Image Registry Security

### Registry Access Control

```yaml
registry_security:
  authentication:
    push: Only CI/CD system accounts may push
    pull: Pull from specific namespaces per team
    admin: Registry admin access restricted to platform team
  authorization:
    - Namespace-based access control per team
    - Immutable tags to prevent overwrite
    - Vulnerability scanning at push time
    - Quarantine images with critical CVEs automatically
  network:
    - Registry accessible only via private network
    - VPC endpoint or private link for cloud registries
    - Rate limiting per client
```

## Vulnerability Management Process

### SLA by Severity

| Severity | Patch Window | Action | Exception |
|---|---|---|---|
| CRITICAL | 24 hours | Patch immediately, canary deploy | 30-day max, security lead approval |
| HIGH | 7 days | Schedule in current sprint | 30-day max, tech lead approval |
| MEDIUM | 30 days | Schedule in backlog | 90-day max |
| LOW | 90 days | Track in inventory | N/A |

### Vulnerability Tracking Dashboard

**Metrics to Track**
1. Total vulnerabilities by severity (across all images)
2. Vulnerability age (days since discovery)
3. Fixable vs unfixable breakdown
4. Image count affected per CVE
5. Exception count and by-team distribution
6. Mean time to remediate (MTTR) by severity

## Image Provenance

### OCI Labels

```dockerfile
LABEL org.opencontainers.image.source=https://github.com/org/myapp
LABEL org.opencontainers.image.revision=$(git rev-parse HEAD)
LABEL org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)
LABEL org.opencontainers.image.version=$(git describe --tags)
LABEL org.opencontainers.image.title=myapp
LABEL org.opencontainers.image.licenses=MIT
```

### SLSA Levels

| SLSA Level | Requirements | Verification |
|---|---|---|
| SLSA 1 | Build script, provenance generated | Provenance exists |
| SLSA 2 | Hosted CI/CD, signed provenance | Signature verified |
| SLSA 3 | Hermetic builds, no user-controlled steps | All inputs pinned |
| SLSA 4 | Two-party verification, reproducible | Full SLSA compliance |

## Distroless vs Alpine vs Scratch

| Aspect | Scratch | Distroless | Alpine | Ubuntu |
|---|---|---|---|---|
| Size | ~0 MB | ~20 MB | ~7 MB | ~200 MB |
| Shell | No | No | Yes (busybox) | Yes (bash) |
| Package manager | No | No | Yes (apk) | Yes (apt) |
| C library | External | gLibc | musl | gLibc |
| Debuggability | None | Minimal | Good | Excellent |
| CVEs | None | Very few | Moderate | Many |
| Best for | Go static binary | Go, Java, Python, Node.js | Tooling, CLIs | Development, complex apps |

## Multi-Architecture Image Building

### Buildx Configuration

```yaml
buildx_config:
  builder: docker-container
  platforms:
    - linux/amd64
    - linux/arm64
    - linux/arm/v7
  cache:
    type: registry
    ref: registry.example.com/cache:buildcache
  outputs:
    type: image,push=true
```

### Manifest Creation and Management

```yaml
manifest_workflow:
  build_and_push:
    - docker buildx build --platform linux/amd64,linux/arm64 -t app:v1.0 --push .
  attest:
    - cosign attest --keyless --type cyclonedx sbom.cdx.json app:v1.0
  verify:
    - cosign verify --keyless app:v1.0
```

### Platform-Specific Base Images

```yaml
platform_base_images:
  linux_amd64:
    base: gcr.io/distroless/static:nonroot-amd64
    variant: x86_64
  linux_arm64:
    base: gcr.io/distroless/static:nonroot-arm64
    variant: aarch64
  linux_arm_v7:
    base: arm32v7/debian:bookworm-slim
    variant: armv7l
```

## CI/CD Security Pipeline

### GitHub Actions Pipeline

```yaml
name: Secure Build Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  secure-build:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: registry.example.com

      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          format: cyclonedx-json
          output-file: sbom.cdx.json

      - name: Scan Build Dependencies
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          format: sarif
          output: trivy-fs-results.sarif
          severity: CRITICAL,HIGH

      - name: Build and Push
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: registry.example.com/myapp:${{ github.sha }}
          sbom: true
          provenance: true

      - name: Scan Image
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: image
          image-ref: registry.example.com/myapp:${{ github.sha }}
          format: sarif
          output: trivy-image-results.sarif
          severity: CRITICAL,HIGH
          exit-code: 1

      - name: Sign Image
        uses: sigstore/cosign-installer@v3
      - run: |
          cosign sign --keyless --yes registry.example.com/myapp:${{ github.sha }}

      - name: Attest SBOM
        run: |
          cosign attest --keyless --type cyclonedx --yes sbom.cdx.json registry.example.com/myapp:${{ github.sha }}

      - name: Upload SARIF Results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-image-results.sarif
```

### GitLab CI Pipeline

```yaml
stages:
  - sbom
  - scan
  - build
  - sign

generate-sbom:
  stage: sbom
  image: anchore/syft:latest
  script:
    - syft dir:. -o cyclonedx-json=sbom.cdx.json
  artifacts:
    paths: [sbom.cdx.json]

scan-dependencies:
  stage: scan
  image: aquasec/trivy:latest
  script:
    - trivy fs --format sarif --output trivy-results.sarif --severity CRITICAL,HIGH .
  artifacts:
    paths: [trivy-results.sarif]

build-image:
  stage: build
  image: docker:latest
  services: [docker:dind]
  script:
    - docker buildx create --use
    - docker buildx build --push --provenance=true --sbom=true -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .

sign-image:
  stage: sign
  image: sigstore/cosign:latest
  variables:
    COSIGN_EXPERIMENTAL: "1"
  script:
    - cosign sign --keyless --yes $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - cosign attest --keyless --type cyclonedx --yes sbom.cdx.json $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## Supply Chain Levels for Software Artifacts (SLSA)

### SLSA Build Levels Explained

```yaml
slsa_levels:
  level_1:
    requirements:
      - Build script exists
      - Provenance generated
    verification:
      - Check provenance existence
      - Verify build script exists in repository
    implementation:
      - docker buildx with --provenance=true
      - Generate attestation in CI/CD

  level_2:
    requirements:
      - Hosted CI/CD (GitHub Actions, GitLab CI)
      - Signed provenance
    verification:
      - Verify provenance signature
      - Validate CI/CD pipeline configuration
    implementation:
      - Use GitHub Actions OIDC
      - cosign sign with keyless

  level_3:
    requirements:
      - No user-controlled build steps
      - All dependencies pinned and verified
      - Hermetic builds
    verification:
      - Build isolation verification
      - Dependency origin verification
    implementation:
      - Docker build with --network=none
      - Pin base image digests
      - Pin all package versions
      - Use buildkit --export-cache for deterministic builds

  level_4:
    requirements:
      - Two-party review required
      - Reproducible builds
      - Full SLSA attestation
    verification:
      - Reproducibility verification in separate environment
      - Dual attestation from independent builders
    implementation:
      - Build twice in isolated environments
      - Compare image digests
      - Independent signing by two CI systems
```

### Provenance Attestation Format

```json
{
  "_type": "https://in-toto.io/Statement/v1",
  "predicateType": "https://slsa.dev/provenance/v1",
  "subject": [{
    "name": "registry.example.com/myapp",
    "digest": {"sha256": "abc123..."}
  }],
  "predicate": {
    "buildDefinition": {
      "buildType": "https://github.com/actions/workflow/v1",
      "externalParameters": {
        "workflow": ".github/workflows/build.yml",
        "commit": "a1b2c3d4"
      },
      "resolvedDependencies": [{
        "uri": "git+https://github.com/org/myapp",
        "digest": {"gitCommit": "a1b2c3d4"}
      }]
    },
    "runDetails": {
      "builder": {
        "id": "https://github.com/actions/runner/github-hosted"
      },
      "metadata": {
        "invocationId": "12345-67890"
      }
    }
  }
}
```

## Admission Controller Verification

### Kyverno Image Verification Policy

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image
spec:
  validationFailureAction: Enforce
  webhookTimeoutSeconds: 30
  rules:
    - name: verify-cosign-signature
      match:
        any:
          - resources:
              kinds: [Pod]
      verifyImages:
        - image: registry.example.com/*
          keyless:
            subject: "https://github.com/org/myapp/.github/workflows/build.yml@refs/heads/main"
            issuer: "https://token.actions.githubusercontent.com"
          attestors:
            - entries:
                - keyless:
                    subject: "https://github.com/org/myapp/.github/workflows/build.yml@refs/heads/main"
                    issuer: "https://token.actions.githubusercontent.com"
          attestations:
            - predicateType: "https://slsa.dev/provenance/v1"
              name: slsa-provenance
            - predicateType: "https://cyclonedx.org/bom"
              name: sbom
              conditions:
                all:
                  - key: "{{ components.length }}"
                    operator: GreaterThanOrEquals
                    value: 50
        - image: registry.example.com/*
          required: false
          verifyDigest: true
          mutateDigest: true
          imageRegistry:
            auth: dockerconfigjson
```

### Ratify Policy

```yaml
apiVersion: config.ratify.deislabs.io/v1beta1
kind: Policy
metadata:
  name: ratify-policy
spec:
  policies:
    - name: verify-signature
      artifactType: application/vnd.dev.cosign.artifact.sig.v1+json
      verifier: cosign
      policy:
        keyless:
          - subject: "https://github.com/org/myapp/.github/workflows/build.yml@refs/heads/main"
            issuer: "https://token.actions.githubusercontent.com"
    - name: verify-sbom
      artifactType: application/vnd.cyclonedx
      verifier: sbom
      policy:
        minComponents: 50
    - name: verify-vulnerability
      artifactType: application/vnd.cyclonedx
      verifier: vuln
      policy:
        maxSeverity: medium
        allowUnfixable: false
```

## Image Caching Strategies

### Cache Types

```yaml
cache_strategies:
  registry_cache:
    description: Push build cache to registry alongside image
    image: registry.example.com/cache:buildcache
    mode: max
    config:
      type: registry
      ref: registry.example.com/cache:buildcache
    pros:
      - Works in multi-node CI
      - Cache persists beyond runner lifetime
    cons:
      - Slower than local cache
      - Consumes registry storage

  inline_cache:
    description: Embed cache metadata in image itself
    config:
      type: inline
    pros:
      - Simple, no extra registry resource
      - Always available with image
    cons:
      - Only exports cache, cannot import
      - Larger image manifest

  github_cache:
    description: Use GitHub Actions cache backend
    config:
      type: gha
    pros:
      - Fast (local to runner)
      - No extra infrastructure
    cons:
      - Limited to 10GB
      - Cache eviction policy

  s3_cache:
    description: Use S3-compatible storage for cache
    config:
      type: s3
      bucket: buildkit-cache-bucket
      region: us-east-1
      prefix: buildcache
    pros:
      - Shared across all CI nodes
      - Large storage capacity
    cons:
      - Requires S3 infrastructure
      - Network latency for cache fetch
```

### Cache Optimization Tips

```yaml
cache_optimization:
  layer_ordering:
    - Copy dependency files first (go.mod, package.json)
    - Install dependencies as separate layer
    - Copy source code last
    - Use RUN --mount=type=cache for package manager caches
  mount_cache_examples:
    npm:
      - RUN --mount=type=cache,target=/root/.npm npm ci
    pip:
      - RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt
    apt:
      - RUN --rm -rf /var/lib/apt/lists/*
    go:
      - RUN --mount=type=cache,target=/go/pkg/mod go mod download
  cache_busting:
    - Change base image digest triggers full rebuild
    - Separate dependencies and source for cache efficiency
    - Use cache-to/cache-from for distributed builds
```

## BuildKit Advanced Features

### Secret Mounts (BuildKit)

```dockerfile
# Access secret during build without including in layers
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci

# Mount SSH agent for private dependency access
RUN --mount=type=ssh \
    go mod download

# Mount cache directories for package managers
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt
```

### Build Arguments vs Secrets

```dockerfile
# BAD: Secret exposed in build arg (visible in history)
ARG API_KEY
RUN echo $API_KEY > /etc/config

# GOOD: BuildKit secret mount (not in layers)
RUN --mount=type=secret,id=api-key \
    cat /run/secrets/api-key > /etc/config

# BAD: Token in COPY
COPY .npmrc /root/.npmrc

# GOOD: Secret mount with target
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci
```

### Dockerfile Best Practices with BuildKit

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN apk add --no-cache tini
WORKDIR /app

# Dependencies layer: cached unless package.json changes
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

# Build layer: cached unless source changes
FROM deps AS build
COPY . .
RUN npm run build

# Production layer: minimal
FROM gcr.io/distroless/nodejs20-debian12:nonroot
COPY --from=deps --chown=10001:10001 /app/node_modules ./node_modules
COPY --from=build --chown=10001:10001 /app/dist ./dist
COPY --from=base /sbin/tini /sbin/tini
USER 10001
ENTRYPOINT ["/sbin/tini", "--", "node", "dist/server.js"]
```

## Image Scanning in Air-Gapped Environments

### Offline Vulnerability Database

```yaml
air_gapped_scanning:
  db_sync:
    tool: trivy
    command: |
      # On internet-connected machine
      trivy image --download-db-only --cache-dir /tmp/trivy-db

      # Transfer to air-gapped environment
      tar czf trivy-db.tar.gz -C /tmp/trivy-db .
      scp trivy-db.tar.gz user@air-gapped-host:/tmp/

      # On air-gapped machine
      tar xzf /tmp/trivy-db.tar.gz -C /home/trivy/trivy-db
    env:
      TRIVY_CACHE_DIR: /home/trivy/trivy-db
      TRIVY_NO_PROGRESS: "true"
    schedule: "Daily sync via approved transfer mechanism"

  db_artifacts:
    - trivy-offline-db:version-2
    - grype-offline-db:latest
    - nvd-json-feed:2024

  verification:
    - Database checksum verification on transfer
    - Database age check (fail if older than 48h)
    - Fallback to last known good database
```

### Private Registry Mirror for Air-Gapped

```yaml
air_gapped_registry:
  pull_through_cache:
    registry: harbor.airgap.internal
    proxy_cache:
      source: docker.io
      ttl: 720h
      authorized: true
  allowed_base_images:
    - harbor.airgap.internal/library/gcr.io/distroless/static:nonroot
    - harbor.airgap.internal/library/alpine:3.19
    - harbor.airgap.internal/library/ubuntu:22.04
  image_approval:
    - New images require security team approval
    - Approved digest list maintained in Git
    - Automated scanning on registry pull-through
```

## Image Lifecycle Management

### Image Retention Policy

```yaml
image_lifecycle:
  retention:
    untagged:
      age: 72 hours
      action: delete
    development:
      tags: [develop-*, feature-*]
      count: 50
      age: 14 days
    staging:
      tags: [staging-*, rc-*]
      count: 20
      age: 30 days
    production:
      tags: [v*, release-*]
      count: 100
      age: 365 days
    security_hold:
      tags: [secured-*]
      age: indefinite
  quarantine:
    trigger:
      - Critical CVE found in image
      - Invalid signature
      - Missing SBOM attestation
    action:
      - Move to quarantine namespace
      - Notify security team
      - Block deployment
    release:
      - Only after vulnerability verification
      - With security team approval
```

### Harbor Retention Rule

```yaml
harbor_retention:
  rules:
    - id: 1
      scope:
        repository: myapp/*
      tag_count: 50
      most_recently_pushed: 50
      policy:
        days_since_last_pull: 30
      action: retain
    - id: 2
      scope:
        repository: myapp/*
      tag_count: 10
      most_recently_pushed: 10
      tag_filter: "v*"
      action: retain
    - id: 3
      scope:
        repository: myapp/*
      vulnerable: CRITICAL
      action: delete
```

## Secure Distribution Patterns

### OCI Distribution Referrers API

```yaml
oci_referrers:
  artifact_types:
    signature: application/vnd.dev.cosign.artifact.sig.v1+json
    sbom_cyclonedx: application/vnd.cyclonedx+json
    sbom_spdx: application/vnd.spdx+json
    attestation: application/vnd.in-toto+json
    vulnerability_report: application/vnd.aquasecurity.trivy.report.sarif+json
  referrer_api:
    query: |
      GET /v2/{repository}/referrers/{digest}?artifactType=application/vnd.cyclonedx+json
    response:
      - digest: sha256:abc...
        artifactType: application/vnd.cyclonedx+json
        annotations:
          org.opencontainers.image.created: "2024-01-01T00:00:00Z"
```

### OCI Artifact Patterns

```yaml
oci_artifacts:
  image_manifest:
    - config (image configuration)
    - layers (filesystem layers)
  referrers:
    - signature (Cosign)
    - SBOM (CycloneDX)
    - attestation (in-toto)
    - vulnerability report (SARIF)
    - scan result (Trivy)
  graph:
    description: "OCI referrers create a graph of artifacts attached to an image"
    example: |
      myapp@sha256:abc123
        ├── cosign.sig (signature)
        ├── sbom.cdx.json (CycloneDX SBOM)
        ├── provenance.json (SLSA provenance)
        ├── vuln-report.sarif (Trivy scan)
        └── policy-report.json (OPA evaluation)
```

## Image Layer Optimization

### Layer Count Minimization

```dockerfile
# BAD: Many layers, each adds size
RUN apt-get update
RUN apt-get install -y python3
RUN apt-get clean
RUN rm -rf /var/lib/apt/lists/*

# GOOD: Single layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# BAD: Order changes invalidate cache
COPY . .
COPY package.json package-lock.json ./

# GOOD: Dependencies layer cached independently
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
```

### Squash vs Multi-Stage

```yaml
layer_strategies:
  multi_stage:
    approach: |
      Use separate build and runtime stages.
      Builder stage has SDK, compiler, test tools.
      Runtime stage has only what is needed to run.
    example: "See multi-stage Dockerfile above"
    advantage: "Small final image, layer caching, no need for squash"
  squash:
    approach: |
      Combine all layers into one during build.
      docker build --squash -t myapp .
    advantage: "Smallest possible image, no intermediate layers"
    disadvantage: "No layer caching, slower builds, masks layer hygiene"
  recommendation: "Prefer multi-stage over squash"
```

### Binary Optimization

```dockerfile
# Go build with optimization
FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64 \
    go build -ldflags='-w -s -extldflags=-static' -o /app .
# -w: omit debug info
# -s: omit symbol table
# -extldflags=-static: fully static binary

# Node.js with production deps only
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --chown=node:node dist/ ./dist/
USER node
CMD ["node", "dist/server.js"]
```

## Compliance and Image Hardening Standards

### CIS Docker Benchmark - Image Section

```yaml
cis_benchmark_image:
  4.1:
    description: "Ensure a user for the container has been created"
    audit: docker inspect --format='{{.Config.User}}' IMAGE
    remediation: "Add USER instruction in Dockerfile"
    score: Automatic
  4.2:
    description: "Ensure HEALTHCHECK instructions have been added"
    audit: docker inspect --format='{{.Config.Healthcheck}}' IMAGE
    remediation: "Add HEALTHCHECK instruction"
    score: Automatic
  4.3:
    description: "Ensure content trust is enabled"
    audit: docker inspect --format='{{.Config.Labels}}' IMAGE
    remediation: "Sign images with Cosign"
    score: Manual
  4.4:
    description: "Ensure images are scanned for vulnerabilities"
    audit: Check vulnerability scanning reports
    remediation: "Integrate scanning in CI/CD"
    score: Manual
  4.5:
    description: "Ensure no sensitive information in image layers"
    audit: docker history IMAGE
    remediation: "Use BuildKit secrets, multi-stage builds"
    score: Manual
```

### NIST SP 800-190 Container Security Guidelines

```yaml
nist_800_190:
  image_source:
    - Use trusted, minimal base images
    - Scan all images for vulnerabilities
    - Sign and verify image integrity
    - Track image provenance
  image_build:
    - Use hardened build pipelines
    - Integrate security scanning in CI/CD
    - Maintain image inventory
    - Use immutable image tags
  image_storage:
    - Secure registry access
    - Encrypt image data at rest
    - Scan registry for vulnerabilities
    - Implement retention policies
  image_deploy:
    - Verify image signatures before deployment
    - Enforce run-time security policies
    - Monitor for known-bad images
    - Implement image approval workflow
```

## Image Security Metrics and KPIs

```yaml
security_metrics:
  image_hygiene:
    - metric: "Percentage of images with SBOM"
      target: "100%"
    - metric: "Percentage of signed images"
      target: "100%"
    - metric: "Percentage of images with base image pinned to digest"
      target: "100%"
    - metric: "Percentage of images using non-root user"
      target: "100%"
  vulnerability:
    - metric: "Critical CVE fix rate (within 24h)"
      target: "95%"
    - metric: "High CVE fix rate (within 7d)"
      target: "90%"
    - metric: "Mean time to remediate (MTTR)"
      target: "< 48h for critical"
    - metric: "Vulnerabilities per image (median)"
      target: "< 5"
  supply_chain:
    - metric: "SLSA level compliance"
      target: "Level 3+"
    - metric: "Images with provenance attestation"
      target: "100%"
    - metric: "Reproducible builds verified"
      target: "Key images only"
    - metric: "Base image freshness (days since update)"
      target: "< 30 days"
```

## References

- container-runtime-security.md -- Container Runtime Security
- container-security-fundamentals.md -- Container Security Fundamentals
- container-security-advanced.md -- Container Security Advanced Topics
- container-vulnerability-scanning.md -- Container Vulnerability Scanning
- image-security.md -- Image Security
- admission-controller-policies.md -- Admission Controller Policies
