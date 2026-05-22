---
name: security-container-security
description: >
  Use this skill when asked about container security, image scanning, Trivy, Grype, Dockerfile security, admission control, Kyverno, OPA, runtime security, Falco, or CVE management in containers. This skill enforces: image scanning in CI with severity gates, Dockerfile hardening with multi-stage builds and distroless bases, Kubernetes admission control policies, and runtime security monitoring. Do NOT use for: host OS security, network security policies, or Kubernetes RBAC design.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, devops, containers, phase-10]
---

# Security Container Security

## Purpose
Build a container security program spanning image scanning, Dockerfile hardening, admission control, and runtime monitoring.

## Agent Protocol

### Trigger
Exact user phrases: "container security", "image scanning", "Trivy", "Grype", "Dockerfile security", "admission control", "Kyverno", "OPA", "runtime security", "Falco", "container CVE", "distroless", "multi-stage build", "image hardening", "K8s security", "container vulnerability".

### Input Context
Before activating, verify:
- Container registry (Docker Hub, ECR, GCR, GAR, ACR)
- Orchestration platform (Kubernetes, ECS, Nomad)
- CI/CD platform and image build pipeline
- Existing security tools and incident history
- Compliance standards (PCI DSS, SOC 2, HIPAA)

### Output Artifact
Container security policy with image scanning config, admission rules, runtime monitoring as YAML files.

### Response Format
```yaml
# Trivy scan config
# Dockerfile best practice rules
# Kyverno admission policies
# Falco rules
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Image scanning configured in CI with severity-gated policy
- [ ] Dockerfile follows hardening checklist (multi-stage, distroless, non-root)
- [ ] Admission controller deployed with policy rules
- [ ] Runtime monitoring configured with Falco rules
- [ ] Image signing and verification configured (cosign)
- [ ] Vulnerability management SLA defined

### Max Response Length
300 lines of configuration.

## Workflow

### Step 1: Image Scanning
Trivy: primary scanner — fast, offline, broad coverage. Run in CI: `trivy image --severity CRITICAL,HIGH --exit-code 1 <image>`. Grype: secondary scanner for cross-reference. Policy: CRITICAL → block build, HIGH → block if fixable, MEDIUM → warn, LOW → info. Scan on every build, rescan images daily for new CVEs. Store scan results in registry as attestation.

### Step 2: Dockerfile Hardening
Base image: distroless or scratch for production, Alpine for tooling. Multi-stage: build stage with full SDK, runtime stage with minimal deps. User: `USER 10001:10001` — never root. Packages: pin versions, remove package manager cache, no build tools in final stage. Healthcheck: `HEALTHCHECK --interval=30s CMD curl -f http://localhost:8080/health`. Labels: maintainer, source commit, security scan link.

### Step 3: Image Signing
Cosign: sign image digest after scan passes. Keyless: `cosign sign --keyless <image>` using OIDC. Store signature in registry. Verify before admission: `cosign verify --keyless <image>`. Attestation: scan results signed and stored alongside image. Policy: only signed images with passing scans are deployable.

### Step 4: Admission Control
Kyverno: kubernetes-native admission policies. Rules: require image from approved registry, require cosign verification, block privileged containers, enforce read-only root filesystem, require resource limits, block host network/pid. OPA/Gatekeeper: alternative for Rego policy language. Dry-run mode for 7 days before enforcement.

### Step 5: Runtime Security
Falco: syscall-level monitoring. Rules: shell spawned in container, outbound network to unknown IP, write to sensitive paths (/etc/shadow, /var/lib/kubelet), privilege escalation attempt, unexpected process execution (spawned by web server). Alert: Kubernetes audit event → Falco → AlertManager → Slack/PagerDuty. Response: auto-terminate pod, annotate for investigation.

### Step 6: Vulnerability Management SLA
CRITICAL: patch within 24 hours, mitigate (WAF rule, network policy) if no fix. HIGH: patch within 7 days. MEDIUM: patch within 30 days. LOW: patch within 90 days. Tracking: dashboard of vulnerability age by severity, image count, fixability. Exceptions: documented with justification, expiry date, and compensating control.

## Rules
- No root user in container runtime
- No `latest` tag — use semantic versioning or commit SHA
- Distroless base for production images
- Image scan on every build, daily rescan of registry
- Admission controller blocks unsigned images
- Falco alerts routed to security team within 1 minute
- Vulnerability exceptions expire after 30 days
- Build stage never ships to registry

## References
- `references/image-security.md` — Trivy, Grype, Dockerfile best practices, multi-stage builds, distroless
- `references/runtime-security.md` — Falco, admission control, Kyverno, OPA, seccomp, AppArmor

## Handoff
`security-secrets-management` for secure credential injection into containers
`security-api-security` for API gateway and service mesh security policies
