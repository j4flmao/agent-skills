# Docker Security Best Practices

## Overview
Docker security encompasses image security, runtime security, host configuration, and supply chain integrity. This reference covers secure Dockerfiles, image scanning, least privilege, secrets management, network security, and runtime protection.

## Secure Dockerfiles

### Minimal Base Images
```dockerfile
# Avoid: large base images with unnecessary tools
FROM ubuntu:latest  # 200MB+
FROM node:18        # 900MB+

# Prefer: minimal, distroless, or Alpine images
FROM alpine:3.18          # ~5MB
FROM gcr.io/distroless/nodejs18-debian11:latest
FROM scratch              # Completely empty

# Multi-stage builds for minimal final images
FROM golang:1.21 AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o myapp .

FROM scratch
COPY --from=builder /app/myapp /myapp
ENTRYPOINT ["/myapp"]
```

### Non-Root User
```dockerfile
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY --chown=nodejs:nodejs . .

# Drop privileges before running
USER nodejs

ENTRYPOINT ["node", "server.js"]
```

### Avoid Secrets in Build
```dockerfile
# BAD: Embedding secrets in image layers
ARG API_KEY
ENV API_KEY=$API_KEY
RUN echo "api_key=$API_KEY" > /app/config.yml

# GOOD: Use build secrets
# docker build --secret id=api_key,env=API_KEY -t myapp .
RUN --mount=type=secret,id=api_key \
    export API_KEY=$(cat /run/secrets/api_key) && \
    echo "api_key=$API_KEY" > /app/config.yml

# GOOD: Runtime secrets (Kubernetes/Docker Swarm)
# Don't bake secrets into images at all
```

## Image Security

### Image Scanning
```bash
# Scan with Docker Scout
docker scout quickview nginx:latest
docker scout cves nginx:latest
docker scout recommendations nginx:latest

# Scan with Trivy
trivy image nginx:latest
trivy image --severity CRITICAL,HIGH myapp:latest

# Scan in CI
trivy image --exit-code 1 --severity CRITICAL myapp:latest

# Scan with Snyk
snyk container test nginx:latest
snyk container monitor nginx:latest
```

### Image Signing
```bash
# Sign images with Docker Content Trust
export DOCKER_CONTENT_TRUST=1
docker push myrepo/myapp:latest

# Sign with cosign
cosign generate-key-pair
cosign sign --key cosign.key myrepo/myapp:latest
cosign verify --key cosign.pub myrepo/myapp:latest

# Attestations
cosign attest --type custom --predicate document.json myimage:latest
cosign verify-attestation --type custom --key cosign.pub myimage:latest
```

## Runtime Security

### Drop Capabilities
```yaml
# docker-compose.yml
services:
  app:
    image: myapp:latest
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
      - CHOWN
    # Only add specific capabilities needed
```

```bash
# docker run with capabilities
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE myapp
```

### Read-Only Root Filesystem
```yaml
services:
  app:
    image: myapp:latest
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
    volumes:
      - data:/data  # Writable volume for persistent data
```

### Security Options
```yaml
services:
  app:
    image: myapp:latest
    security_opt:
      - no-new-privileges:true
      - seccomp=seccomp-profile.json
      - apparmor=myapp-profile
    privileged: false
    user: "1001:1001"
```

## Network Security

### Network Isolation
```yaml
version: '3.8'

services:
  frontend:
    image: nginx:alpine
    networks:
      - public
    ports:
      - "80:80"

  app:
    build: .
    networks:
      - internal
    # No external ports exposed

  db:
    image: postgres:15
    networks:
      - internal
    # Not accessible from public network

networks:
  public:
    driver: bridge
  internal:
    driver: bridge
    internal: true  # No external access
```

## Secrets Management

### Docker Secrets
```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    secrets:
      - db_password
      - api_key
      - tls_cert
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    external: true  # Managed externally
  tls_cert:
    file: ./certs/app.crt
```

### Environment Variables
```dockerfile
# BAD: Hardcoded defaults
ENV DB_PASSWORD=default_password

# GOOD: No defaults for secrets
ENV DB_PASSWORD=""

# BAD: Multiple secrets in ARG
ARG DB_USER DB_PASSWORD API_KEY

# GOOD: Use build-time only ARGs for non-sensitive config
ARG BUILD_VERSION
ENV APP_VERSION=$BUILD_VERSION
```

## Supply Chain Security

### Image Pinning
```dockerfile
# BAD: Floating tags
FROM node:latest
FROM python:3.11

# GOOD: Pinned digests
FROM node:18.17.1-alpine@sha256:abc123def456...
FROM python:3.11.4-slim@sha256:def789ghi012...

# GOOD: Version pinning with minor patches
FROM node:18.17-alpine
FROM python:3.11-slim
```

### Verification
```bash
# Verify image provenance
cosign verify \
  --certificate-identity-regexp 'https://github.com/org/*' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  ghcr.io/org/myapp:latest

# SBOM generation
docker sbom myapp:latest > sbom.spdx.json

# Verify with SLSA
slsa-verifier verify-image \
  --source-uri github.com/org/repo \
  myapp:latest
```

## Logging and Monitoring

### Audit Logging
```bash
# Enable Docker daemon audit
auditctl -w /var/lib/docker -p wa
auditctl -w /etc/docker -p wa

# Docker events monitoring
docker events --filter 'type=container' --filter 'event=kill'
docker events --filter 'type=container' --filter 'event=privileged'

# Container syscall monitoring
docker run --security-opt seccomp=deny.json myapp
```

## Key Points
- Use minimal base images (Alpine, distroless, scratch)
- Never run containers as root - always use non-root users
- Drop all capabilities and add only required ones
- Mount filesystems read-only when possible
- Use multi-stage builds to minimize attack surface
- Pin image versions and verify signatures
- Scan images regularly for known vulnerabilities
- Isolate networks with internal-only segments
- Use secrets management instead of environment variables
- Enable no-new-privileges security option
- Implement SBOM generation for supply chain transparency
- Regularly audit running containers for compliance
- Sign images with cosign for integrity verification
