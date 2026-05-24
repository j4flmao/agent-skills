# GitLab CI Container Integration

## Overview

GitLab provides integrated container capabilities including a built-in Container Registry, multiple build methods (Docker-in-Docker, Kaniko), container scanning, and SBOM generation.

## GitLab Container Registry

### Registry Structure
```
registry.gitlab.com/
└── myorg/
    └── my-project/
        ├── latest
        ├── v1.0.0
        └── v1.1.0
```

### Authenticating
```yaml
# Automatic authentication (CI_JOB_TOKEN)
variables:
  CI_REGISTRY: registry.gitlab.com
  CI_REGISTRY_IMAGE: $CI_REGISTRY/$CI_PROJECT_PATH

# Manual authentication
before_script:
  - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
```

### Docker-in-Docker Build
```yaml
# .gitlab-ci.yml
variables:
  DOCKER_TLS_CERTDIR: ""
  DOCKER_HOST: tcp://docker:2375
  DOCKER_DRIVER: overlay2

services:
  - docker:dind

build-image:
  stage: package
  image: docker:25
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA .
    - docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA $CI_REGISTRY_IMAGE:latest
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

### Multi-Stage Docker Build
```yaml
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
```

### Multi-Architecture Builds
```yaml
build-multiarch:
  stage: package
  image: docker:25
  services:
    - docker:dind
  variables:
    DOCKER_CLI_EXPERIMENTAL: enabled
  before_script:
    - docker run --privileged --rm tonistiigi/binfmt --install all
    - docker buildx create --use
  script:
    - docker buildx build
        --platform linux/amd64,linux/arm64
        --tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
        --tag $CI_REGISTRY_IMAGE:latest
        --push
        .
```

## Kaniko Build

Kaniko builds container images without Docker daemon access (no privileged mode needed).

### Basic Kaniko Build
```yaml
build-kaniko:
  stage: package
  image:
    name: gcr.io/kaniko-project/executor:v1.21.0
    entrypoint: [""]
  script:
    - /kaniko/executor
      --context=./
      --dockerfile=Dockerfile
      --destination=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
      --destination=$CI_REGISTRY_IMAGE:latest
      --cache=true
      --cache-ttl=168h
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

### Kaniko with Cache Repository
```yaml
build-kaniko-cached:
  stage: package
  image:
    name: gcr.io/kaniko-project/executor:v1.21.0
    entrypoint: [""]
  variables:
    KANIKO_CACHE: $CI_REGISTRY_IMAGE/cache
  script:
    - /kaniko/executor
      --context=./
      --dockerfile=Dockerfile
      --destination=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
      --cache=true
      --cache-repo=$KANIKO_CACHE
      --cache-dir=/cache
      --compressed-caching=false
```

### Kaniko Arguments Reference
```bash
# Key Kaniko flags
--context=.                          # Build context
--dockerfile=Dockerfile              # Dockerfile path
--destination=registry/image:tag     # Push destination (repeatable)
--cache=true                         # Enable layer caching
--cache-repo=registry/cache          # Separate cache repository
--cache-ttl=168h                     # Cache TTL
--compressed-caching=false           # Disable gzip for faster cache
--snapshot-mode=redo                 # File snapshot mode
--build-arg=VERSION=1.0              # Build args
--target=production                  # Multi-stage target
--oci-layout-path=/tmp/layers        # OCI layout output
```

## Container Scanning

### Trivy Scanner
```yaml
container-scanning:
  stage: security
  image:
    name: docker.io/aquasec/trivy:0.50
    entrypoint: [""]
  variables:
    TRIVY_USERNAME: $CI_REGISTRY_USER
    TRIVY_PASSWORD: $CI_REGISTRY_PASSWORD
  script:
    - trivy image
        --severity HIGH,CRITICAL
        --ignore-unfixed
        --format table
        $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  allow_failure: true
```

### Integrated Container Scanning
```yaml
include:
  - template: Jobs/Container-Scanning.gitlab-ci.yml

container_scanning:
  variables:
    CI_APPLICATION_REPOSITORY: $CI_REGISTRY_IMAGE
    CI_APPLICATION_TAG: $CI_COMMIT_SHORT_SHA

# Container scanning with custom severity
container_scanning:
  variables:
    CS_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
    CS_DISABLE_LANGUAGE_VULNERABILITY_SCAN: "true"
    CS_SEVERITY_THRESHOLD: high
```

## SBOM Generation

### CycloneDX SBOM
```yaml
generate-sbom:
  stage: security
  image:
    name: cyclonedx/cyclonedx-node:latest
    entrypoint: [""]
  script:
    - cyclonedx-bom -o gl-sbom-$CI_COMMIT_SHORT_SHA.cdx.xml
  artifacts:
    paths:
      - gl-sbom-*.cdx.xml
    reports:
      cyclonedx: gl-sbom-$CI_COMMIT_SHORT_SHA.cdx.xml
```

### Syft SBOM Generator
```yaml
generate-sbom-syft:
  stage: security
  image:
    name: anchore/syft:latest
    entrypoint: [""]
  script:
    - syft $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA -o cyclonedx-json > sbom.cdx.json
  artifacts:
    paths:
      - sbom.cdx.json
    reports:
      cyclonedx: sbom.cdx.json
```

### Dependency List with Job Token
```yaml
upload-sbom:
  stage: deploy
  image: alpine:3.19
  script:
    - apk add --no-cache curl
    - |
      curl --header "JOB-TOKEN: $CI_JOB_TOKEN" \
        --upload-file sbom.cdx.json \
        "$CI_API_V4_URL/projects/$CI_PROJECT_ID/packages/cyclonedx"
```

## Container Build Best Practices

### Optimize Dockerfile
```dockerfile
# Use specific versions
FROM node:20-alpine AS builder

# Cache package install separately from source
COPY package*.json ./
RUN npm ci --only=production

# Copy source last (changes most often)
COPY . .

# Final stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Security: run as non-root
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3
  CMD node healthcheck.js

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Layer Caching Optimization
```yaml
# .gitlab-ci.yml
variables:
  DOCKER_BUILDKIT: 1
  BUILDKIT_INLINE_CACHE: 1

build-with-cache:
  stage: package
  image: docker:25
  services:
    - docker:dind
  script:
    - docker build
        --cache-from $CI_REGISTRY_IMAGE:latest
        --tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
        --tag $CI_REGISTRY_IMAGE:latest
        --push
        .
```

### Image Size Reduction
```yaml
# Use distroless base images
FROM gcr.io/distroless/nodejs20-debian12

# Or alpine with only runtime deps
FROM node:20-alpine
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
```

## Best Practices

1. **Prefer Kaniko** over Docker-in-Docker for better security (no privileged mode).
2. **Use multi-stage builds** to minimize final image size.
3. **Tag with commit SHA** for traceability, plus semantic version tags.
4. **Enable container scanning** on every push to main.
5. **Generate SBOM** for every release image.
6. **Use cache repositories** with Kaniko to speed up repeat builds.
7. **Pin base image versions** — never use `:latest` in Dockerfiles.
8. **Set resource limits** on build containers to prevent OOM.
