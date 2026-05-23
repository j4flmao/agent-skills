---
name: security-container-security
description: >
  Use this skill when asked about container security, image scanning, Trivy, Grype, Clair, Snyk, Dockerfile security, admission control, Kyverno, OPA, runtime security, Falco, Tracee, CVE management, container signing, Cosign, SBOM, or distroless images. This skill enforces: image scanning in CI with severity gates, Dockerfile hardening with multi-stage builds and distroless bases, Kubernetes admission control policies, runtime security monitoring with Falco, image signing with Cosign, and SBOM generation. Do NOT use for: host OS security, network security policies, or Kubernetes RBAC design.
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
Build a container security program spanning image scanning
(Trivy, Grype, Clair, Snyk), Dockerfile hardening
(distroless, multi-stage, non-root), admission control
(Kyverno, OPA/Gatekeeper), runtime monitoring (Falco, Tracee),
image signing (Cosign), and SBOM generation.

## Agent Protocol

### Trigger
Exact user phrases: "container security", "image scanning",
"Trivy", "Grype", "Clair", "Snyk", "Dockerfile security",
"admission control", "Kyverno", "OPA", "runtime security",
"Falco", "Tracee", "container CVE", "distroless",
"multi-stage build", "image hardening", "K8s security",
"container vulnerability", "Cosign", "image signing",
"SBOM", "container admission", "pod security".

### Input Context
Before activating, verify:
- Container registry (Docker Hub, ECR, GCR, GAR, ACR)
- Orchestration platform (Kubernetes, ECS, Nomad)
- CI/CD platform and image build pipeline
- Existing security tools and incident history
- Compliance standards (PCI DSS, SOC 2, HIPAA)
- Image volume (number of images, build frequency)

### Output Artifact
Container security policy with image scanning config,
admission rules, runtime monitoring as YAML files.

### Response Format
```yaml
# Trivy scan config
# Dockerfile best practice rules
# Kyverno admission policies
# Falco rules
# Cosign signing config
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.
Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Image scanning configured in CI with severity-gated policy
- [ ] Dockerfile follows hardening checklist
- [ ] Admission controller deployed with policy rules
- [ ] Runtime monitoring configured with Falco rules
- [ ] Image signing and verification configured (Cosign)
- [ ] Vulnerability management SLA defined
- [ ] SBOM generation integrated into build pipeline
- [ ] CVE exception process documented

### Max Response Length
300 lines of configuration.

## Workflow

### Step 1: Image Scanning - CI Pipeline
Trivy: primary scanner for container images.
Fast, offline capable, broad CVE coverage.
`trivy image --severity CRITICAL,HIGH --exit-code 1 --format sarif <image>`.

Grype: secondary scanner for cross-reference.
Integrates with Syft for SBOM-based scanning.
`grype myapp:latest --only-fixed --fail-on critical`.

Clair: registry-based scanning via Clair v4 and Quay.
Scans on push and on schedule.

Snyk: developer-friendly with IDE integration.
Provides fix advice and reachability analysis.

Policy gates:
CRITICAL → block build, fix immediately.
HIGH → block if fixable version exists.
MEDIUM → warn with PR comment.
LOW → info, log only.

Scan at build time and rescan daily for new CVEs.
Store results as attestation in registry.
Output SARIF for GitHub Code Scanning integration.

### Step 2: Dockerfile Hardening
Base image selection:
Distroless for production: `gcr.io/distroless/base`.
Scratch for statically linked Go binaries.
Alpine for tooling and utility images.

Multi-stage pattern:
Builder stage with full SDK and build tools.
Runtime stage with minimal dependencies only.
Builder stage never ships to registry.

User: `USER 10001:10001` — never root.
Filesystem: `COPY --chown=10001:10001`.
Packages: pin exact versions, clean cache.
`rm -rf /var/cache/apk/*` for Alpine.

HEALTHCHECK: 30s interval, 3s timeout.
Labels for provenance tracking:
`org.opencontainers.image.source`
`org.opencontainers.image.revision`

Security: `RUN --mount=type=bind` for secrets.
Never use build args for secrets.
.dockerignore excludes node_modules, .git, .env, test.

### Step 3: SBOM Generation
Syft: generate SBOM as build artifact.
`syft packages <image> -o cyclonedx-json > sbom.cdx.json`.

Store SBOM in registry alongside image.
Attest with Cosign for non-repudiation.

Grype scans SBOM directly without pulling image:
`grype sbom:sbom.cdx.json`.

Formats: CycloneDX and SPDX supported.
Use SBOM for vulnerability matching, license checks,
supply chain transparency, software inventory.

Policy: no image deployable without SBOM.

### Step 4: Image Signing with Cosign
Sign image digest after scan passes.
`cosign sign --keyless <image>`.

Keyless mode uses OIDC from CI provider.
GitHub, GitLab, Google identities supported.
No key management burden.

Signature stored in registry alongside image.
Verify before admission:
`cosign verify --keyless <image>`.

Attest scan results and SBOM:
`cosign attest --keyless --type cyclonedx sbom.cdx.json <image>`.

Policy: only signed images with passing scans deployable.
Key-based signing for air-gapped environments.

### Step 5: Admission Control
Kyverno: Kubernetes-native admission policies.
Policy types: Validate (deny if violated),
Mutate (auto-modify spec), Generate (create resources),
VerifyImages (require Cosign).

Key policies:
- Require image from approved registry
- Require Cosign signature verification
- Block privileged containers
- Enforce read-only root filesystem
- Require CPU and memory resource limits
- Block hostNetwork and hostPID
- Require `runAsNonRoot: true`
- Drop all Linux capabilities

OPA/Gatekeeper: alternative using Rego language.
Better for complex cross-resource policies.

Dry-run mode: 7 days before enforcement.
Audit violations, tune rules, then enforce.

Pod Security Standards: Restricted profile.
Audit → warn → enforce rollout sequence.

### Step 6: Runtime Security
Falco: syscall-level monitoring.
Driver: `driver.kind=modern-bpf` for performance.

Default rules:
- Shell spawned inside container
- Write to sensitive paths (/etc/shadow, /var/lib/kubelet)
- Outbound connection to unknown IP
- Privilege escalation via setuid
- Unexpected process from web server
- Container with privileged flag

Tracee: eBPF-based runtime security.
Signature detection for kernel exploits.
Behavioral analysis for fileless execution.
Container breakout detection.

Alert pipeline:
Falco → Falcosidekick → AlertManager → Slack or PagerDuty.
Critical alerts trigger automatic pod termination.
Investigation alerts trigger annotation and logging.

### Step 7: Vulnerability Management SLA
CRITICAL: patch within 24 hours.
Mitigate with WAF rule or network policy if no fix.

HIGH: patch within 7 days.
MEDIUM: patch within 30 days.
LOW: patch within 90 days.

Exception process:
Documented justification with compensating control.
Expiry date of max 30 days.
Approval from security lead.

Tracking dashboard:
Vulnerability age by severity.
Image count affected.
Fixable vs unfixable breakdown.
Exception count and age.

Daily scan of deployed images for new CVEs.
Alert on new critical or high findings.
Auto-create tickets for fixable vulnerabilities.

## Rules
- No root user in container runtime
- No `latest` tag — use semantic versioning or commit SHA
- Distroless base for production images
- Image scan on every build, daily rescan of registry
- Admission controller blocks unsigned images
- Falco alerts routed to security team within 1 minute
- Vulnerability exceptions expire after 30 days
- Build stage never ships to registry
- SBOM generated and stored for every image
- CVE fix prioritized by severity and fixability

## References
- `references/image-security.md`
  Trivy, Grype, Clair, Snyk, Dockerfile hardening,
  distroless, multi-stage, Cosign, SBOM
- `references/runtime-security.md`
  Falco, Tracee, admission control, Kyverno, OPA,
  seccomp, AppArmor, Pod Security Standards
- `references/admission-controller-policies.md`
  Policy categories, Pod Security Standards, policy engine comparison
- `references/container-vulnerability-scanning.md`
  Scanning strategy by stage, severity thresholds, image best practices

## Handoff
`security-secrets-management` for credential injection
`security-api-security` for gateway and service mesh policies
