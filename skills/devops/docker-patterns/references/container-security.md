# Container Security

Container security encompasses image hardening, runtime protection, access control, and vulnerability management.

## Non-Root User

Always run containers as a non-root user:

```dockerfile
# Alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Debian/Ubuntu
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

# Distroless (already non-root)
USER nonroot

# Specify UID for consistency
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
USER 1001
```

### Runtime Enforcement

```yaml
apiVersion: v1
kind: Pod
spec:
  securityContext:
    runAsUser: 1001
    runAsGroup: 1001
    fsGroup: 1001
  containers:
    - name: app
      securityContext:
        allowPrivilegeEscalation: false
        runAsUser: 1001
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
```

## Read-Only Root Filesystem

```dockerfile
# In Dockerfile
RUN mkdir -p /data /tmp && \
    chown -R appuser:appgroup /data /tmp

# In Kubernetes
securityContext:
  readOnlyRootFilesystem: true
  runAsUser: 1001
  # Write to ephemeral volume
volumeMounts:
  - mountPath: /tmp
    name: tmp
volumes:
  - name: tmp
    emptyDir: {}
```

## Capability Drop

```dockerfile
# Docker run
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE myapp

# Docker Compose
services:
  app:
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE

# Kubernetes
securityContext:
  capabilities:
    drop: ["ALL"]
    add: ["NET_BIND_SERVICE"]
```

### Linux Capabilities Reference

| Capability | Risk | Default? | Use Case |
|------------|------|----------|----------|
| `CHOWN` | Low | Container | Change file ownership |
| `NET_BIND_SERVICE` | Low | Container | Bind to privileged ports (<1024) |
| `SYS_ADMIN` | High | None | Mount, namespace operations |
| `NET_ADMIN` | Medium | None | Network configuration |
| `SYS_PTRACE` | Medium | None | Debugging, tracing processes |

## Seccomp

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": ["read", "write", "exit", "exit_group", "futex",
                 "nanosleep", "clock_gettime", "mmap", "munmap",
                 "brk", "openat", "close", "fstat", "lseek",
                 "getdents64", "newfstatat", "writev", "preadv"],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

```yaml
# Kubernetes
securityContext:
  seccompProfile:
    type: RuntimeDefault
```

## AppArmor

```yaml
metadata:
  annotations:
    container.apparmor.security.beta.kubernetes.io/app: runtime/default

spec:
  containers:
    - name: app
      securityContext:
        appArmorProfile:
          type: RuntimeDefault
```

## Image Scanning

### Trivy

```bash
# Scan single image
trivy image myapp:latest

# Scan with severity filter
trivy image --severity HIGH,CRITICAL myapp:latest

# Scan filesystem
trivy fs --scanners vuln,secret,misconfig .

# Scan repository
trivy repo https://github.com/org/myapp

# Output formats
trivy image --format sarif --output report.sarif myapp:latest
trivy image --format cyclonedx --output sbom.json myapp:latest

# CI integration
trivy image --exit-code 1 --severity CRITICAL myapp:latest
```

### Grype

```bash
# Scan image
grype myapp:latest

# Scan with output
grype myapp:latest -o json > vulnerabilities.json

# Scan directory
grype dir:.

# SBOM generation
syft myapp:latest -o spdx-json > sbom.spdx.json
grype sbom:sbom.spdx.json
```

## Dockerfile Security Checklist

```dockerfile
FROM gcr.io/distroless/static-debian12:nonroot
ARG TARGETOS TARGETARCH

# Copy only the binary
COPY --chown=nonroot:nonroot bin/server /app/server

# No shell, no package manager
# No setuid/setgid binaries
# Single layer for binary

USER nonroot
EXPOSE 8080

# Read-only root by default with distroless

ENTRYPOINT ["/app/server"]
```

## Kubernetes Pod Security Standards

```yaml
apiVersion: v1
kind: Namespace
metadata:
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
  namespace: restricted
spec:
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      securityContext:
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: app
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            runAsUser: 1001
            seccompProfile:
              type: RuntimeDefault
```

## Runtime Security Tools

| Tool | Purpose | Deployment |
|------|---------|------------|
| Falco | Runtime threat detection | DaemonSet |
| Tracee | System call tracing | DaemonSet |
| AppArmor | MAC profile enforcement | Node-level |
| SELinux | MAC for RHEL/CentOS | Node-level |

Layered security (build-time + runtime + network) provides defense in depth for containerized workloads.
