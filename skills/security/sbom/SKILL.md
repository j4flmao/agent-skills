---
name: security-sbom
description: >
  Use this skill when asked about SBOM, software bill of materials, dependency graph, SPDX, CycloneDX, supply chain security, component inventory, or dependency analysis. This skill enforces: SBOM generation in CycloneDX/SPDX formats, dependency vulnerability correlation with severity gating, license compliance checks, and attestation signing. Do NOT use for: static code analysis (SAST), container image scanning, or secret detection.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, supply-chain, phase-10]
---

# Security SBOM

## Purpose
Design an SBOM generation pipeline with format selection, vulnerability correlation, license compliance, and policy enforcement for software supply chain security.

## Agent Protocol

### Trigger
Exact user phrases: "SBOM", "software bill of materials", "dependency graph", "SPDX", "CycloneDX", "supply chain", "component inventory", "dependency analysis", "license compliance", "vulnerability correlation", "attestation", "dependency tree", "syft", "cyclonedx", "spdx".

### Input Context
Before activating, verify:
- Package managers in use (npm, pip, Maven, Go modules, Cargo, NuGet)
- CI/CD platform and build pipeline integration points
- Existing dependency management (Dependabot, Renovate, Snyk)
- Compliance requirements (license policies, export controls, attestation)
- Artifact registry (Docker Hub, ECR, GAR, Artifactory)

### Output Artifact
SBOM pipeline configuration as YAML and policy files.

### Response Format
```yaml
# SBOM generation step
# Policy rules
# CI pipeline config
```
```json
# Attestation payload template
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] SBOM format selected (CycloneDX default, SPDX for regulatory)
- [ ] Generation tool configured (Syft, CycloneDX CLI, Trivy)
- [ ] Vulnerability correlation source configured (OSV, NVD, GHSA)
- [ ] License compliance rules defined
- [ ] Attestation signing configured (Sigstore, in-toto)
- [ ] CI pipeline integration with policy gates

### Max Response Length
250 lines of configuration and policy.

## Workflow

### Step 1: Format Selection
CycloneDX: default choice — de facto standard, rich dependency tree, tooling ecosystem, supported by OWASP. SPDX: regulatory/legal contexts (ISO 5962:2021). Generate both when compliance requires SPDX. Store SBOM alongside build artifacts in artifact registry. SBOM per: service image, library package, deployment artifact.

### Step 2: Generation Tool
Syft: best for container images and filesystems, supports all major ecosystems. CycloneDX CLI: language-agnostic, integrates with build tools (Maven plugin, npm plugin). Trivy: image scan + SBOM generation in one tool. Run: `syft packages <image> -o cyclonedx-json` for containers, `cyclonedx-bom -o bom.xml` for project sources.

### Step 3: Vulnerability Correlation
Source: OSV.dev (primary, fastest updates), NVD (comprehensive, slower), GHSA (GitHub-specific). Correlate by package name and version range. Severity: CRITICAL (CVSS 9.0-10.0), HIGH (7.0-8.9), MEDIUM (4.0-6.9), LOW (0.1-3.9). Policy: block on critical + high in production, warn on medium, allow low. Exclude dev dependencies from production scans.

### Step 4: License Compliance
Check every dependency license against allowlist: MIT, Apache-2.0, BSD-2/3-Clause, ISC, Unlicense. Block on: GPL-3.0 (copyleft), AGPL (network copyleft), unknown/no-license. Flag for review: LGPL, MPL, EPL. Store license policy in `.license-policy.yml`. Generate compliance report per release.

### Step 5: Attestation
Sign SBOM with Sigstore (cosign): `cosign attest --predicate bom.json --type cyclonedx <image>`. Store attestation in OCI registry alongside image. Verify: `cosign verify-attestation --type cyclonedx <image>`. In-toto layout for multi-step build attestation chain.

### Step 6: CI Pipeline Integration
Generate SBOM after build, before image push. Store SBOM in artifact registry with image tag. Verify attestation in deployment pipeline. Gate: reject deployment if CRITICAL vulnerabilities unpatched for >7 days. Monthly full dependency audit with SBOM diff report.

## Rules
- SBOM generated for every production artifact, every build
- CycloneDX JSON format as default, SPDX if regulatory
- Vulnerability database refreshed every 4 hours in CI
- License allowlist enforced at PR time, not release time
- Attestation signed with Sigstore, verified before deployment
- Dev dependencies excluded from production SBOM
- SBOM retention: current + last 3 releases
- Supply chain policy reviewed quarterly

## References
- `references/sbom-formats.md` — SPDX, CycloneDX format comparison, tooling ecosystem
- `references/dependency-management.md` — Generation strategies, vulnerability correlation, license policy enforcement

## Handoff
`security-container-security` for image scanning integration
`devops-ci-cd` for pipeline configuration and artifact storage
