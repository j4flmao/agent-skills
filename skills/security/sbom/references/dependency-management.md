# Dependency Management

## SBOM Generation

### Generation Tools
- Syft: best for container images and filesystems. Multi-language detection. Supports all major ecosystems.
- Trivy: image scanner with SBOM output. Unified scanning + SBOM.
- CycloneDX plugins: `cyclonedx-maven-plugin`, `cyclonedx-gradle-plugin`, `@cyclonedx/bom`.
- `go-sbom`: Go ecosystem specific.

### Generation Strategy
Run after build, before image push. Generate per artifact: service binary, container image, library package. Store SBOM in registry alongside artifact. Tag: `app:v1.0.0.sbom.cyclonedx.json`.

### CI Integration
```yaml
- name: Generate SBOM
  run: syft packages ${{ env.IMAGE }} -o cyclonedx-json > bom.json
- name: Store SBOM
  uses: actions/upload-artifact@v4
  with:
    name: sbom
    path: bom.json
```

## Vulnerability Correlation

### Data Sources
- OSV.dev: primary — fastest CVE updates, broad coverage (PyPI, npm, Go, Maven, NuGet, RubyGems, crates.io).
- NVD: comprehensive — NIST-maintained, slower updates, all CVEs.
- GHSA: GitHub Advisory Database — curated, includes GitHub-specific security advisories.
- Cross-reference: match across multiple sources for better coverage.

### Correlation Tools
- Grype: vulnerability scanner, uses multiple sources, correlates against SBOM.
- Trivy: fast scanning, vulnerability DB + SBOM generation.
- OSV-Scanner: Google tool, queries OSV.dev, best for open source.
- Dependency-Track: enterprise SBOM analysis platform with continuous monitoring.

### Severity Mapping
- CRITICAL: CVSS 9.0-10.0, immediate action required
- HIGH: CVSS 7.0-8.9, fix within 7 days
- MEDIUM: CVSS 4.0-6.9, fix within 30 days
- LOW: CVSS 0.1-3.9, fix within 90 days

## License Compliance

### License Categories
Allowlist: MIT, Apache-2.0, BSD-2/3-Clause, ISC, Unlicense, CC0-1.0, Zlib, Python-2.0.
Restricted: LGPL-2.0/3.0, MPL-2.0, EPL-2.0, CDDL-1.0 (require legal review).
Blocklist: GPL-2.0/3.0, AGPL-3.0, BUSL-1.1, SSPL-1.0, unknown/no-license.

### Policy Enforcement
```yaml
# .license-policy.yml
allowlist:
  - MIT
  - Apache-2.0
  - BSD-*
blocklist:
  - GPL-*
  - AGPL-*
required:
  - field: license
    value: allowlisted
action: block_build
```

## Policy Enforcement

### Gate Rules
- Block build on CRITICAL vulnerabilities (unfixable → manual exception)
- Block build on blocked licenses
- Warn on HIGH vulnerabilities, auto-approve if fix available
- Allow MEDIUM/LOW with documentation
- Enforce at PR time via CI check
- Full policy audit weekly

### Exception Handling
Document: CVE ID, risk assessment, mitigating controls, expiry date (max 30 days). Route: developer → security team approval. Auto-revoke: when patch becomes available. Track: open exceptions in security dashboard.

### Continuous Monitoring
Rescan SBOM daily for new CVEs. Compare against existing SBOMs in registry. Alert on new critical/high vulnerabilities in deployed artifacts. Monthly policy review with exception audit.
