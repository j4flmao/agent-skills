---
name: security-sbom
description: >
  Use this skill when asked about SBOM, software bill of materials, dependency
  graph, SPDX, CycloneDX, supply chain security, component inventory, or dependency
  analysis. This skill enforces: SBOM generation in CycloneDX/SPDX formats,
  dependency vulnerability correlation with severity gating, license compliance
  checks, and attestation signing. Do NOT use for: static code analysis (SAST),
  container image scanning, or secret detection.
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
Design an SBOM generation pipeline with format selection, vulnerability correlation, license compliance, and policy enforcement for software supply chain security. Every build produces a signed, verifiable inventory of all components.

## SBOM Formats

### CycloneDX
De facto standard for software supply chain security. OWASP project. JSON and XML formats. Rich dependency tree with parent-child relationships. Supports: components, services, vulnerabilities, licenses, pedigree (patch/backport info), external references (advisory URLs, issue tracker), properties (custom key-value metadata), formula (dependency computation evidence). Best for: CI/CD integration, vulnerability correlation tooling, automated policy enforcement. JSON preferred — wider tool support, easier to diff and query with jq.

### SPDX (ISO/IEC 5962:2021)
International standard for software package data exchange. RDF/XML, tag-value, JSON, YAML, and XLSX formats. Stronger on legal and license documentation. Supports: package provenance, file-level licensing, cross-reference integrity (package verification codes), annotation by different agents. Best for: regulatory compliance, legal review, export control documentation. Mandatory for US federal government software procurement (EO 14028).

### SPDX 2.3 vs 3.0
SPDX 2.3 (current stable): flat package list, document-centric model, proven tooling ecosystem, widely adopted. SPDX 3.0 (emerging): profile system (licensing, security, usage, build), core namespace for interoperability, relationship types describing build inputs/outputs, AI/ML dataset profiles, better support for composite SBOMs (SBOM-of-SBOMs). Migration path: generate SPDX 2.3 now, add SPDX 3.0 alongside as tooling matures. Both share the same licensing model.

## Generation Tools

### Syft
Best for container images and filesystem scans. Supports all major ecosystems (npm, pip, Maven, Go, Cargo, NuGet, RPM, APK, etc.). Output: CycloneDX JSON/XML, SPDX JSON/Tag-Value, Syft custom JSON. Usage: `syft packages <image> -o cyclonedx-json` for container scans, `syft dir:. -o cyclonedx-json` for source tree scans. Fast (~1-3 seconds), no daemon dependency. Integrates with Grype for vulnerability scanning in one pipeline.

### Trivy
Unified scanner (SBOM + vulnerability + secrets + IaC). Can generate SBOM and scan it in a single pass. Usage: `trivy image --format cyclonedx --output bom.json <image>`. Generates attestation-compatible output with embedded vulnerability results. Slower than Syft alone but reduces tool count.

### CycloneDX CLI
Language-agnostic, integrates with build tools via plugins. Plugins: `cyclonedx-maven-plugin` (Maven), `cyclonedx-npm` (npm), `cyclonedx-gradle` (Gradle), `cyclonedx-pip` (pip), `cyclonedx-go` (Go modules). Generates SBOM during build, capturing exact resolved dependency versions. Usage: `cyclonedx-bom -o bom.xml --include-compile-scope`. More accurate than post-hoc scanning because it uses the build tool's resolved dependency tree.

## CI/CD Pipeline Integration

Generate SBOM after successful build, before artifact push. Store alongside the artifact in the registry. Propagate through environments for deployment-time policy checks.

```yaml
# GitHub Actions example
jobs:
  build:
    steps:
      - run: syft packages . -o cyclonedx-json > bom.json
      - run: cosign attest --predicate bom.json --type cyclonedx $IMAGE
      - run: trivy image --severity CRITICAL,HIGH --exit-code 1 $IMAGE
```

Policy gates: block promotion from dev→staging if CRITICAL vulns, block staging→prod if any HIGH vulns older than 7 days without patch. Weekly full re-scan with SBOM diff report for drift detection.

## Vulnerability Correlation

### Data Sources
- OSV.dev: primary source. Fastest update cycle (usually within hours of CVE publication). Google-maintained. API: `https://api.osv.dev/v1/query`. Supports all major ecosystems.
- NVD: comprehensive, slower updates (days to weeks). NIST-maintained. API: `https://services.nvd.nist.gov/rest/json/cves/2.0`. References CWE classifications and CVSS 3.1 scores.
- GHSA: GitHub Advisory Database. Best GitHub integration. Access via GitHub API. Often includes proof-of-concept references.
- Snyk: commercial vulnerability feed with proprietary research. Faster coverage for zero-days. Requires license.

### Severity Gating
| Severity | CVSS Range | Policy |
|---|---|---|
| CRITICAL | 9.0–10.0 | Block build. Patch SLA: 48 hours |
| HIGH | 7.0–8.9 | Block promotion to prod. Patch SLA: 7 days |
| MEDIUM | 4.0–6.9 | Warn. Review at next triage |
| LOW | 0.1–3.9 | Allow. Log for quarterly audit |

### Correlation Process
1. Parse SBOM to extract package name, version, ecosystem.
2. Query OSV/NVD for known vulnerabilities matching package + version constraint.
3. Augment with reachability analysis (reachable from application code?).
4. Filter false positives (non-exploitable, mitigated by configuration).
5. Apply policy gates based on severity × reachability × environment.

## License Compliance

Define license allowlist and enforce at pull request time, not release time.

```yaml
# .license-policy.yml
allow:
  - MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause
  - ISC, Unlicense, CC0-1.0, Zlib
block:
  - GPL-3.0, AGPL-3.0, SSPL
  - BUSL-1.1 (source-available, not open source)
  - any unknown/no-license
review:
  - LGPL-2.1, LGPL-3.0, MPL-2.0, EPL-2.0
  - CDDL-1.0, EUPL-1.2
```

Tools: `license_checker`, `askalono` (fast license detection), `scancode-toolkit` (comprehensive), built-in checkers in Snyk and FOSSA.

## SBOM Signing & Attestation

Sign SBOM to establish non-repudiation. Verify before deployment.

### Cosign (Sigstore)
```
cosign attest --predicate bom.json --type cyclonedx $IMAGE
cosign verify-attestation --type cyclonedx $IMAGE
```

Stores attestation in OCI registry as an attached artifact. Uses keyless signing (OIDC identity from GitHub/GitLab) or key-pair signing. No key distributed management overhead with keyless mode.

### In-Toto
Attestation framework for multi-step build pipelines. Each step produces a signed link (command, materials, products). Final layout verification ensures every step was performed by the right actor with the right inputs/outputs. Use with Sigstore for the signing layer.

### Attestation Verification
```yaml
# Deployment gate
step:
  verify-attestation:
    - signature matches expected identity
    - predicate type is cyclonedx
    - no CRITICAL vulnerabilities in attestation
    - license blocklist not violated
```

## SBOM Distribution

Store SBOM alongside the artifact it describes. Distribution options:
- OCI registry: store as an OCI artifact attached to the image. Discoverable with `cosign download attestation`. Preferred for container-based deployments.
- Dependency Track: open-source SBOM analysis platform. Accepts SBOM upload via API. Continuous monitoring against vulnerability databases. Notifications on new CVEs affecting deployed components.
- Harbor: container registry with built-in SBOM storage. Provides vulnerability reports linked to SBOM. Retention policy can automatically clean old SBOMs.
- Artifactory: universal package manager with SBOM support. Tag SBOM to build artifacts.

Retention: current release + last 3 releases. Weekly full SBOM regeneration for deployed artifacts to catch newly published vulnerabilities.

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
- [ ] SBOM distribution and retention configured

### Max Response Length
250 lines of configuration and policy.

## Workflow

### Step 1: Format Selection
CycloneDX default — de facto standard, rich dependency tree, broad tooling, OWASP-backed. SPDX for regulatory contexts (ISO 5962:2021). Generate both when compliance requires SPDX. Store SBOM alongside build artifacts in artifact registry. SBOM per: service image, library package, deployment artifact.

### Step 2: Generation Tool
Syft for container images and filesystems — fastest, broadest ecosystem support. CycloneDX CLI for build-time generation with resolved dependency graph. Trivy when unified SBOM + vulnerability scanning is preferred.

### Step 3: Vulnerability Correlation
Source: OSV.dev primary (fastest updates), NVD comprehensive (slower, CVSS 3.1), GHSA (GitHub ecosystem). Correlate by package name + version range. Apply severity gates per environment.

### Step 4: License Compliance
Every dependency checked against allowlist. Block copyleft and unknown licenses. Flag weak-copyleft for legal review. Store policy in version-controlled `.license-policy.yml`. Enforce at PR time.

### Step 5: Attestation
Sign SBOM with Sigstore Cosign. Keyless mode preferred. Verify attestation signature and predicate content before deployment. In-toto layout for multi-step build chains.

### Step 6: CI Pipeline Integration
Generate SBOM after build, before image push. Store in artifact registry. Verify attestation in deployment pipeline. Gate deployment on vulnerability policy. Monthly full dependency audit with SBOM diff report.

### Step 7: Distribution & Monitoring
Push SBOM to Dependency Track or Harbor for continuous monitoring. Configure alerts for new vulnerabilities on deployed components. Weekly re-scan of all active SBOMs. Retention: current + last 3 releases.

## Rules
- SBOM generated for every production artifact, every build
- CycloneDX JSON format as default, SPDX if regulatory
- Vulnerability database refreshed every 4 hours in CI
- License allowlist enforced at PR time, not release time
- Attestation signed with Sigstore, verified before deployment
- Dev dependencies excluded from production SBOM
- SBOM retention: current + last 3 releases
- Supply chain policy reviewed quarterly
- Generate SBOM during build (not post-hoc) for accuracy
- Correlate vulnerabilities by reachability when possible

## References
  - references/dependency-management.md — Dependency Management
  - references/sbom-advanced.md — Sbom Advanced Topics
  - references/sbom-attestation.md — SBOM Attestation
  - references/sbom-formats.md — SBOM Formats
  - references/sbom-fundamentals.md — Sbom Fundamentals
  - references/sbom-generation-tools.md — SBOM Generation Tools Comparison
  - references/sbom-policy-enforcement.md — SBOM Policy Enforcement Guide
  - references/supply-chain-attacks.md — Supply Chain Attack Patterns
## Handoff
`security-container-security` for image scanning integration
`devops-ci-cd` for pipeline configuration and artifact storage
