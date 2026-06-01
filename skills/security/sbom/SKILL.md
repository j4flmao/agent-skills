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

## SBOM Generation Examples

### Syft — Container Image SBOM
```bash
# Generate CycloneDX JSON SBOM for Docker image
syft packages registry.example.com/app:v1.2.3 \
  -o cyclonedx-json > bom.cdx.json

# Generate SPDX JSON SBOM
syft packages registry.example.com/app:v1.2.3 \
  -o spdx-json > bom.spdx.json

# Scan local directory for source-level SBOM
syft packages dir:. \
  -o cyclonedx-json > bom-source.cdx.json
```

### CycloneDX CLI — Build-Time SBOM (npm)
```bash
# Install CycloneDX plugin for npm
npm install -g @cyclonedx/cyclonedx-npm

# Generate SBOM during build
cyclonedx-npm --output-format JSON > bom.cdx.json
```

### Trivy — Unified SBOM + Vulnerability Scan
```bash
# Generate SBOM and scan in one pass
trivy image --format cyclonedx \
  --output bom.cdx.json \
  --severity CRITICAL,HIGH \
  registry.example.com/app:v1.2.3
```

### Python — SBOM Validation Script
```python
#!/usr/bin/env python3
"""Validate SBOM before deployment."""
import json
import sys

def validate_sbom(path: str) -> bool:
    with open(path) as f:
        sbom = json.load(f)
    
    components = sbom.get("components", [])
    for c in components:
        vulns = c.get("vulnerabilities", [])
        for v in vulns:
            if v.get("severity") == "critical":
                print(f"BLOCKED: {c['name']}@{c['version']} has {v['id']}")
                return False
    print(f"SBOM validated: {len(components)} components, 0 critical vulns")
    return True

if __name__ == "__main__":
    sys.exit(0 if validate_sbom(sys.argv[1]) else 1)
```

### GitHub Actions — Full SBOM Pipeline
```yaml
name: SBOM Pipeline
on:
  push:
    branches: [main]
jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          path: ./
          format: cyclonedx-json
          output-file: bom.cdx.json
      - name: Upload SBOM
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: bom.cdx.json
      - name: Vulnerability Scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: sbom
          scan-ref: bom.cdx.json
          severity: CRITICAL,HIGH
          exit-code: 1
      - name: Sign SBOM
        run: |
          cosign attest --predicate bom.cdx.json \
            --type cyclonedx \
            --keyless \
            registry.example.com/app:${{ github.sha }}
```

## SBOM Policy-as-Code

### OPA/Rego — SBOM Policy
```rego
package sbom.policy

# Block if any component has a critical vulnerability
default allow = false

allow {
    count(violations) == 0
}

violations[component] {
    component := input.components[_]
    vuln := component.vulnerabilities[_]
    vuln.severity == "critical"
}

# Block copyleft licenses
license_violations[component] {
    component := input.components[_]
    component.licenses[_].id == "GPL-3.0-only"
}
```

### Policy Enforcement in CI
```yaml
# .github/workflows/sbom-policy.yml
jobs:
  policy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check SBOM Policy
        run: |
          opa eval --data sbom-policy.rego \
            --input bom.cdx.json \
            "data.sbom.policy.allow"
```

## Supply Chain Attack Patterns

### Pattern 1: Dependency Confusion
Attacker publishes a malicious package to a public registry with the same name as a private/internal package. Package managers without scoping resolve to the public registry. Mitigation: use scoped packages (@org/package), enforce registry allowlisting, verify package provenance.

### Pattern 2: Typosquatting
Attacker registers packages with names similar to popular packages (e.g., `reqeusts` vs `requests`). Mitigation: use package lockfiles, enable 2FA for package publishing, monitor for lookalike packages.

### Pattern 3: Compromised Maintainer Account
Attacker takes over a maintainer's account and publishes a malicious update. Mitigation: package signing (Sigstore), multi-party publishing, npm OTP enforcement.

### Pattern 4: Malicious Transitive Dependency
A legitimate package depends on a compromised indirect dependency. Mitigation: SBOM analysis of full dependency tree, dependency pinning with hash verification, dependency auditing.

### Pattern 5: Tag Confusion
Attacker pushes a malicious tag to a registry that overrides an existing version. Mitigation: use digest-based references, enable tag immutability, sign releases.

## SBOM Maturity Model

### Level 1: Basic
- Manual dependency enumeration
- No SBOM generation
- No vulnerability correlation
- No license compliance checks
- No attestation

### Level 2: Standardized
- SBOM generated per build (Syft/CycloneDX CLI)
- Vulnerability scanning with severity gates
- License allowlist enforced at PR time
- SBOM stored in artifact registry
- Weekly dependency updates (Dependabot/Renovate)

### Level 3: Advanced
- SBOM signed with Sigstore (keyless attestation)
- Vulnerability correlation with reachability analysis
- Policy-as-code for deployment gates (OPA)
- Continuous monitoring with Dependency Track
- Automated PR creation for vulnerable dependencies
- SBOM diff tracking for drift detection

### Level 4: Optimized
- Supply chain levels for software artifacts (SLSA L3+)
- In-toto attestation framework for build chain integrity
- Real-time vulnerability alerting with EPSS scoring
- Automated license compliance with legal workflow
- SBOM composition analysis (SBOM-of-SBOMs)
- Cross-org SBOM sharing and verification

## SBOM Operations

### Daily Operations
- Verify SBOM generation in build pipeline
- Review new vulnerability alerts from Dependency Track
- Check attestation signatures for all new artifacts

### Weekly Operations
- Full dependency audit with SBOM diff
- Update vulnerability databases
- Review license policy violations
- Triage new CVEs affecting deployed components

### Monthly Operations
- License policy review and updates
- SBOM retention cleanup (keep current + last 3)
- Supply chain security metrics report
- Vendor SBOM verification (third-party software)
- Penetration test of build pipeline integrity

### Incident Response
1. Detect: new CVE affecting deployed component, supply chain compromise notification, SBOM attestation verification failure
2. Assess: affected components, version range, exploitability (EPSS), reachability from application code
3. Contain: pin to safe version, patch/update, block vulnerable version in policy
4. Investigate: determine initial compromise vector, check for unauthorized code execution
5. Remediate: update all affected systems, revoke compromised signing keys if needed, rotate credentials
6. Notify: downstream consumers with SBOM update, regulatory bodies if applicable
7. Post-mortem: improve detection rules, update dependency management policy, harden build pipeline

## SBOM Anti-Patterns

### Anti-Pattern: Post-Hoc SBOM
Generating SBOM after deployment misses the purpose of vulnerability-aware deployment decisions. SBOM must be generated during build, before artifact push, and verified in the deployment pipeline.

### Anti-Pattern: No Vulnerability Correlation
Generating an SBOM but never scanning it for vulnerabilities defeats the purpose. Always correlate SBOM components against vulnerability databases (OSV, NVD, GHSA) at build time and continuously after deployment.

### Anti-Pattern: Ignoring Transitive Dependencies
SBOM that only includes direct dependencies misses the majority of the attack surface. Transitive dependencies account for 70-90% of vulnerabilities in modern applications. Include full dependency tree in the SBOM.

### Anti-Pattern: One-Time SBOM
Generating SBOM once at release and never refreshing it. New vulnerabilities are discovered daily. Deployed components must be continuously monitored against updated vulnerability databases. Weekly re-scan with automated alerting.

### Anti-Pattern: No Attestation
SBOM without cryptographic attestation can be modified or replaced by an attacker. Anyone could claim an artifact has a clean SBOM. Sign the SBOM with Sigstore/Cosign and verify before deployment.

### Anti-Pattern: Ignoring Build-Time vs Runtime SBOM
Build-time SBOM includes dev dependencies not present in production. Generate separate production SBOM that excludes dev dependencies. Container image SBOM represents what's actually deployed.

## Tool Comparison Matrix

| Feature | Syft | Trivy | CycloneDX CLI | FOSSA |
|---|---|---|---|---|
| SBOM formats | CycloneDX, SPDX | CycloneDX, SPDX | CycloneDX | CycloneDX, SPDX |
| Input types | Images, filesystems, repos | Images, repos, filesystems | Build plugins | Source repos |
| Speed | Fast (1-3s) | Medium (5-15s) | Fast (1-5s) | Slow (scan) |
| Vulnerability scan | Via Grype | Built-in | No | Built-in |
| License detection | Via Syft metadata | Yes | Yes | Yes |
| CI integration | GitHub Action, CLI | GitHub Action, CLI | Maven/Gradle/npm | Native CI |
| Attestation | Via Cosign | Via Cosign | No | No |
| Cost | Free (Apache 2.0) | Free (Apache 2.0) | Free | Commercial |
| Best for | Primary SBOM tool | Unified scanning | Build-time accuracy | Enterprise compliance |

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
