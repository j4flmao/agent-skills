# Container Security Fundamentals

## Overview
Container security covers the entire container lifecycle: building secure images, scanning for vulnerabilities, runtime protection, and Kubernetes admission control. Containers introduce unique security challenges — shared kernel, mutable images, privileged escalation risks, and supply chain vulnerabilities.

## Core Concepts

### Concept 1: Image Security
Container images must be secure by default:
- **Minimal base images**: Use distroless or Alpine-based images to reduce attack surface
- **Vulnerability scanning**: Scan images for CVEs before deployment (Trivy, Grype, Snyk)
- **Image signing**: Sign images with cosign to verify authenticity and integrity
- **Immutable tags**: Use digest pinning (image@sha256:...) not mutable tags (:latest)
- **Layer analysis**: Minimize layers, remove build dependencies from final image

### Concept 2: Runtime Security
Protect running containers from attacks:
- **Read-only root filesystem**: Prevent unauthorized file writes
- **Drop capabilities**: Remove all capabilities, add back only needed ones
- **Seccomp profiles**: Limit system calls the container can make
- **AppArmor/SELinux**: Mandatory access control for container processes
- **Run as non-root**: Never run containers as root — use USER directive
- **Resource limits**: CPU/memory limits prevent DoS from compromised containers

### Concept 3: Kubernetes Security
Kubernetes-specific container security:
- **Pod Security Standards**: Restricted, baseline, privileged profiles
- **Network policies**: Default deny all ingress/egress, allow explicitly
- **RBAC**: Least privilege for service accounts and users
- **Admission controllers**: Validate and mutate pod specs (OPA/Gatekeeper, Kyverno)
- **Secrets management**: Mount secrets as volumes, not environment variables
- **Pod security context**: runAsNonRoot, readOnlyRootFilesystem, capabilities drop

## Implementation Guide

### Step 1: Build Secure Images
```dockerfile
# Multi-stage build for minimal attack surface
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Stage 2: Runtime (distroless)
FROM gcr.io/distroless/nodejs20-debian12
COPY --from=builder /app/dist /app
COPY --from=builder /app/node_modules /app/node_modules
USER nonroot:nonroot
WORKDIR /app
EXPOSE 3000
CMD ["dist/server.js"]
```

### Step 2: Vulnerability Scanning
```yaml
# CI pipeline — image scanning with Trivy
name: Container Security Scan
on: [pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .
      - name: Scan with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH
          exit-code: 1
```

### Step 3: Kubernetes Admission Control (Kyverno)
```yaml
# Kyverno policy — enforce security best practices
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-run-as-non-root
spec:
  validationFailureAction: enforce
  rules:
    - name: check-run-as-non-root
      match:
        resources:
          kinds: ["Pod"]
      validate:
        message: "Containers must run as non-root user"
        pattern:
          spec:
            securityContext:
              runAsNonRoot: true
            containers:
              - securityContext:
                  runAsNonRoot: true
                  allowPrivilegeEscalation: false
                  capabilities:
                    drop: ["ALL"]
                  readOnlyRootFilesystem: true
```

### Step 4: Secret Management in Kubernetes
```yaml
# External Secrets Operator — sync secrets from vault
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: db-credentials
  data:
    - secretKey: password
      remoteRef:
        key: secret/data/postgres
        property: password
```

## Best Practices
- Use minimal base images (distroless, Alpine) — reduce CVE surface by 80%+
- Scan images in CI before any deployment — fail builds on critical/high CVEs
- Sign images with cosign and verify signatures before deployment
- Drop all container capabilities, add back only required ones
- Run containers as non-root with read-only root filesystem
- Use Pod Security Standards (restricted profile) for all namespaces
- Implement network policies — default deny all traffic
- Use External Secrets Operator instead of Kubernetes Secrets for production
- Regular image scanning (weekly minimum) for newly discovered CVEs
- Pin base image digests for reproducible builds

## Common Pitfalls
- Using :latest or mutable tags in production (unintended base image changes)
- Running as root inside containers (container escape → host compromise)
- Storing secrets in environment variables (visible in kubectl describe, logs)
- Allowing privileged containers (defeats all container isolation)
- No resource limits (compromised container can DoS the node)
- Using full-featured base images (Ubuntu, Debian) with hundreds of unnecessary packages
- Not scanning images for known CVEs before production deployment
- Overly permissive network policies (allow all traffic between pods)

## Key Points
- Container security spans image, runtime, and orchestration layers
- Use minimal, distroless base images to reduce attack surface
- Scan images for CVEs in CI before deployment
- Drop all capabilities, run as non-root, read-only filesystem
- Enforce Pod Security Standards via admission controllers
- Use External Secrets Operator for Kubernetes secrets
- Implement least-privilege network policies
- Sign and verify container images for supply chain integrity
