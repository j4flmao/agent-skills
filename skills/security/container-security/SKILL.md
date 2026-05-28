---
name: security-container-security
description: >
  Use this skill when asked about container security, image scanning, Trivy, Grype, Clair, Snyk, Dockerfile security, admission control, Kyverno, OPA, runtime security, Falco, Tracee, CVE management, container signing, Cosign, SBOM, or distroless images. This skill enforces: image scanning in CI with severity gates, Dockerfile hardening with multi-stage builds and distroless bases, Kubernetes admission control policies, runtime security monitoring with Falco, image signing with Cosign, and SBOM generation. Do NOT use for: host OS security, network security policies, or Kubernetes RBAC design.
version: "1.1.0"
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
Build a container security program spanning image scanning (Trivy, Grype, Clair, Snyk), Dockerfile hardening (distroless, multi-stage, non-root), admission control (Kyverno, OPA/Gatekeeper), runtime monitoring (Falco, Tracee), image signing (Cosign), and SBOM generation.

## Agent Protocol

### Trigger
Exact user phrases: "container security", "image scanning", "Trivy", "Grype", "Clair", "Snyk", "Dockerfile security", "admission control", "Kyverno", "OPA", "runtime security", "Falco", "Tracee", "container CVE", "distroless", "multi-stage build", "image hardening", "K8s security", "container vulnerability", "Cosign", "image signing", "SBOM", "container admission", "pod security".

### Input Context
Before activating, verify:
- Container registry (Docker Hub, ECR, GCR, GAR, ACR)
- Orchestration platform (Kubernetes, ECS, Nomad)
- CI/CD platform and image build pipeline
- Existing security tools and incident history
- Compliance standards (PCI DSS, SOC 2, HIPAA)
- Image volume (number of images, build frequency)

### Output Artifact
Container security policy with image scanning config, admission rules, runtime monitoring as YAML files.

### Response Format
```yaml
# Trivy scan config
# Dockerfile best practice rules
# Kyverno admission policies
# Falco rules
# Cosign signing config
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output -- why use many token when few do trick.

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
Trivy: primary scanner for container images. Fast, offline capable, broad CVE coverage. `trivy image --severity CRITICAL,HIGH --exit-code 1 --format sarif <image>`.

Grype: secondary scanner for cross-reference. Integrates with Syft for SBOM-based scanning. `grype myapp:latest --only-fixed --fail-on critical`.

Clair: registry-based scanning via Clair v4 and Quay. Scans on push and on schedule.

Snyk: developer-friendly with IDE integration. Provides fix advice and reachability analysis.

Policy gates: CRITICAL -> block build, fix immediately. HIGH -> block if fixable version exists. MEDIUM -> warn with PR comment. LOW -> info, log only.

Scan at build time and rescan daily for new CVEs. Store results as attestation in registry. Output SARIF for GitHub Code Scanning integration.

### Step 2: Dockerfile Hardening
Base image selection: Distroless for production: `gcr.io/distroless/base`. Scratch for statically linked Go binaries. Alpine for tooling and utility images.

Multi-stage pattern: Builder stage with full SDK and build tools. Runtime stage with minimal dependencies only. Builder stage never ships to registry.

User: `USER 10001:10001` -- never root. Filesystem: `COPY --chown=10001:10001`. Packages: pin exact versions, clean cache. `rm -rf /var/cache/apk/*` for Alpine.

HEALTHCHECK: 30s interval, 3s timeout. Labels for provenance tracking: `org.opencontainers.image.source`, `org.opencontainers.image.revision`.

Security: `RUN --mount=type=bind` for secrets. Never use build args for secrets. .dockerignore excludes node_modules, .git, .env, test.

### Step 3: SBOM Generation
Syft: generate SBOM as build artifact. `syft packages <image> -o cyclonedx-json > sbom.cdx.json`.

Store SBOM in registry alongside image. Attest with Cosign for non-repudiation.

Grype scans SBOM directly without pulling image: `grype sbom:sbom.cdx.json`.

Formats: CycloneDX and SPDX supported. Use SBOM for vulnerability matching, license checks, supply chain transparency, software inventory. Policy: no image deployable without SBOM.

### Step 4: Image Signing with Cosign
Sign image digest after scan passes. `cosign sign --keyless <image>`.

Keyless mode uses OIDC from CI provider. GitHub, GitLab, Google identities supported. No key management burden.

Signature stored in registry alongside image. Verify before admission: `cosign verify --keyless <image>`.

Attest scan results and SBOM: `cosign attest --keyless --type cyclonedx sbom.cdx.json <image>`.

Policy: only signed images with passing scans deployable. Key-based signing for air-gapped environments.

### Step 5: Admission Control
Kyverno: Kubernetes-native admission policies. Policy types: Validate (deny if violated), Mutate (auto-modify spec), Generate (create resources), VerifyImages (require Cosign).

Key policies:
- Require image from approved registry
- Require Cosign signature verification
- Block privileged containers
- Enforce read-only root filesystem
- Require CPU and memory resource limits
- Block hostNetwork and hostPID
- Require runAsNonRoot: true
- Drop all Linux capabilities

OPA/Gatekeeper: alternative using Rego language. Better for complex cross-resource policies.

Dry-run mode: 7 days before enforcement. Audit violations, tune rules, then enforce.

Pod Security Standards: Restricted profile. Audit -> warn -> enforce rollout sequence.

### Step 6: Runtime Security
Falco: syscall-level monitoring. Driver: `driver.kind=modern-bpf` for performance.

Default rules:
- Shell spawned inside container
- Write to sensitive paths (/etc/shadow, /var/lib/kubelet)
- Outbound connection to unknown IP
- Privilege escalation via setuid
- Unexpected process from web server
- Container with privileged flag

Tracee: eBPF-based runtime security. Signature detection for kernel exploits. Behavioral analysis for fileless execution. Container breakout detection.

Alert pipeline: Falco -> Falcosidekick -> AlertManager -> Slack or PagerDuty. Critical alerts trigger automatic pod termination.

### Step 7: Vulnerability Management SLA
CRITICAL: patch within 24 hours. Mitigate with WAF rule or network policy if no fix. HIGH: patch within 7 days. MEDIUM: patch within 30 days. LOW: patch within 90 days.

Exception process: Documented justification with compensating control. Expiry date of max 30 days. Approval from security lead.

Tracking dashboard: Vulnerability age by severity. Image count affected. Fixable vs unfixable breakdown. Exception count and age.

Daily scan of deployed images for new CVEs. Alert on new critical or high findings. Auto-create tickets for fixable vulnerabilities.

## Architecture / Decision Trees

### Security Architecture Options

| Architecture | Pros | Cons | Best For |
|---|---|---|---|
| Shift-left (CI scanning only) | Fast, developer-owned | No runtime coverage | Startups, small teams |
| Runtime + CI | Full coverage, defense in depth | Higher ops cost | Regulated, enterprise |
| Registry scanning only | No CI integration, passive | Delayed detection | Existing registries |
| Admission control only | Enforces at deploy time | Blocks bad images without finding them | Compliance enforcement |

### Scanner Decision Tree

| Tool | Speed | Coverage | Integration | Best For |
|---|---|---|---|---|
| Trivy | Fast | OS + language libs | CI, CD, registry | Primary scanner |
| Grype | Medium | OS + language libs | CLI, SBOM | Secondary cross-ref |
| Clair | Slow (registry) | OS packages | Quay, registry | Registry-based orgs |
| Snyk | Fast | OS + libs + IaC | IDE, CI, registry | Developer experience |
| Docker Scout | Fast | OS + libs | Docker only | Docker Hub users |

### Runtime Security Tool Comparison

| Tool | Mechanism | Performance Impact | Detection | Best For |
|---|---|---|---|---|
| Falco | Syscall (kernel module/eBPF) | < 5% CPU | System calls, file access | General container security |
| Tracee | eBPF | < 3% CPU | Signatures, behavior | Advanced threat detection |
| Aqua | Agent + eBPF | < 5% CPU | Full stack (K8s, network) | Enterprise security platform |
| Sysdig Secure | Agent + eBPF | < 5% CPU | Falco-based + forensics | Performance monitoring + security |

### Admission Control Decision Tree

| Tool | Language | Complexity | Best For |
|---|---|---|---|
| Kyverno | YAML | Low | Kubernetes-native teams |
| OPA/Gatekeeper | Rego | Medium | Complex policies, multi-platform |
| Custom webhook | Any | High | Special requirements |

## Common Pitfalls

### Pitfall 1: Scanning Only at Build Time
Images scanned at build time can have new CVEs discovered hours later. Daily rescan of registry is mandatory. Deployed images must be rescanned. Alert on new critical vulnerabilities in running images.

### Pitfall 2: Ignoring Base Image Updates
Using the same base image for months accumulates vulnerabilities. Update base images monthly minimum. Use automated base image update tools. Pin base image SHA for reproducibility.

### Pitfall 3: Admission Control Without Dry Run
Enforcing admission policies without dry-run breaks existing workloads. Use dry-run mode for 7-14 days before enforcement. Audit violations, tune rules, notify teams.

### Pitfall 4: Runtime Security Without Alerting
Falco detects events but they go to /var/log/syslog by default. Without alert pipeline, events are invisible. Configure Falcosidekick. Route critical alerts to PagerDuty.

### Pitfall 5: Blocking All Vulnerabilities
Blocking every CVE with a gate causes deployment delays. Gate on CRITICAL/HIGH only. Allow MEDIUM/LOW with warnings. Have exception process for false positives.

### Pitfall 6: Not Signing Images Before Deployment
Signing after deployment is too late -- unsigned images already running. Sign images as post-scan step in CI. Verify signatures in admission controller.

### Pitfall 7: Running as Root in Production
Root in container has unnecessary privileges. If container is compromised, attacker gets root on host kernel. Always use non-root USER. Drop all capabilities.

### Pitfall 8: SBOM as Afterthought
SBOM generated once and forgotten. SBOM must be generated per build, stored alongside image, used for vulnerability scanning. Attest SBOM with Cosign.

## Best Practices

### Image Security
- Always pin base image versions (no latest)
- Use distroless or scratch for production
- Multi-stage builds with builder stage never shipped
- Run as non-root user
- Read-only root filesystem
- Drop all Linux capabilities
- HEALTHCHECK instruction in every image
- LABEL for provenance tracking

### CI/CD Security Pipeline
1. Build image (multi-stage)
2. Scan with Trivy (fail on CRITICAL+HIGH)
3. Generate SBOM with Syft
4. Sign image with Cosign
5. Attest scan results and SBOM
6. Push to registry
7. Deploy through admission control
8. Runtime monitoring with Falco
9. Daily rescan deployed images

### Admission Policy Minimum Set
- Require from approved registry only
- Require Cosign signature
- Block privileged containers
- Enforce read-only root filesystem
- Require CPU/memory limits
- Block hostNetwork, hostPID, hostIPC
- Require runAsNonRoot: true
- Drop all capabilities
- Block seccomp unconfined
- Require seccomp profile (RuntimeDefault)

### Vulnerability Management
- SLA: CRITICAL 24h, HIGH 7d, MEDIUM 30d, LOW 90d
- Exception process: documented, approved, 30-day expiry
- Daily rescan of all deployed images
- Auto-create tickets for new critical CVEs
- Track vulnerability age and fix rate

## Compared With

### Container Security vs Host Security
Container security: image scanning, admission control, runtime security within containers, registry security. Host security: OS hardening, kernel patches, network security at host level. Containers share host kernel, so host security is foundational. Both needed for defense in depth.

### Trivy vs Snyk vs Grype
Trivy: fastest, broadest CVE coverage, offline-capable, free, MIT license. Snyk: best developer experience, IDE integration, fix advice, commercial. Grype: SBOM-native, Syft integration, air-gapped capable, free, Apache license. Use Trivy as primary, Grype for cross-ref, Snyk for developer workflows.

### Kyverno vs OPA/Gatekeeper
Kyverno: K8s-native YAML policies, simpler, auto-generation, mutate support. OPA/Gatekeeper: Rego language, more expressive, cross-platform, larger community. Kyverno for K8s-only. OPA for multi-platform.

### Keyless vs Key-Based Signing
Keyless (Cosign OIDC): no key management, CI provider identity, cloud CI suitable. Key-based: full control, air-gapped, offline verification, key management overhead. Keyless for cloud-native. Key-based for regulated/air-gapped.

## Operations & Maintenance

### Daily Operations
- Verify scan pipeline runs successfully
- Check for new critical CVEs in deployed images
- Review Falco alerts (critical + warnings)
- Verify admission controller enforcing

### Weekly Operations
- Review vulnerability exceptions and expiry
- Tune Falco rules (false positive reduction)
- Update base images
- Review admission audit logs
- Patch confirmed vulnerabilities

### Monthly Operations
- Full image registry rescan
- Report vulnerability metrics (age, fix rate, count by severity)
- Update scanner databases
- Test Cosign verification pipeline
- Validate SBOM generation

### Security Incident Response
1. Detect: Falco alert or vulnerability scan finding
2. Assess: criticality, affected images, running instances
3. Contain: patch image, redeploy, isolate compromised pods
4. Investigate: root cause analysis
5. Remediate: update base images, add scanning rules, tune policies
6. Document: incident report, preventive measures

## Rules
- No root user in container runtime
- No latest tag -- use semantic versioning or commit SHA
- Distroless base for production images
- Image scan on every build, daily rescan of registry
- Admission controller blocks unsigned images
- Falco alerts routed to security team within 1 minute
- Vulnerability exceptions expire after 30 days
- Build stage never ships to registry
- SBOM generated and stored for every image
- CVE fix prioritized by severity and fixability
- Admission policies dry-run for 7 days before enforcement
- Base images updated monthly minimum
- CRITICAL vulnerabilities patched within 24 hours
- Keyless signing for cloud CI, key-based for air-gapped
- Registry access restricted to approved publishers only

## References
- references/container-security-fundamentals.md -- Container Security Fundamentals
- references/container-security-advanced.md -- Container Security Advanced Topics
- references/container-vulnerability-scanning.md -- Container Vulnerability Scanning
- references/image-security.md -- Image Security
- references/runtime-security.md -- Runtime Security
- references/admission-controller-policies.md -- Admission Controller Policies
- references/container-image-security.md -- Container Image Security
- references/container-runtime-security.md -- Container Runtime Security

## Handoff
security-secrets-management for credential injection
security-api-security for gateway and service mesh policies
