# SBOM Fundamentals

## Overview
A Software Bill of Materials (SBOM) is a formal inventory of all components, libraries, dependencies, and their metadata in a software product. SBOMs enable vulnerability management, license compliance, and supply chain risk assessment. They are increasingly mandated by regulations (EO 14028, CISA guidance, EU Cyber Resilience Act).

## Core Concepts

### Concept 1: SBOM Formats
- **SPDX** (ISO/IEC 5962): The international standard — supports licenses, security, and provenance
- **CycloneDX**: OWASP project — designed for security use cases, supports vulnerabilities, pedigree
- **SWID**: ISO/IEC 19770-2 — primarily for software inventory and license management

### Concept 2: SBOM Essential Elements
- **Component name** and **version**: The specific software package
- **Supplier**: Creator or maintainer of the component
- **Dependencies**: Relationships between components (direct and transitive)
- **License information**: SPDX license identifiers
- **Hash** (SHA-256/512): Cryptographic identifier for integrity verification
- **Author**: Entity that created the SBOM

### Concept 3: SBOM Types by Depth
- **Build-time (source)**: Generated from package manager manifests during build
- **Runtime**: Captures dependencies loaded at runtime (includes dynamic linking)
- **Design**: Created during architecture phase (planned dependencies)
- **Analyzed**: Produced from binary analysis of compiled artifacts

### Concept 4: Vulnerability Correlation
SBOM enables automated vulnerability scanning by correlating components with known vulnerability databases:
- NVD (National Vulnerability Database)
- OSV (Open Source Vulnerabilities)
- GitHub Advisory Database
- Snyk, Sonatype, Black Duck databases

## Implementation Guide

### Step 1: Generate SBOM at Build Time
```yaml
# CycloneDX SBOM generation (GitHub Actions)
name: Generate SBOM
on:
  push:
    branches: [main]

jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Node.js dependencies
      - name: Generate CycloneDX SBOM (Node)
        run: |
          npm install -g @cyclonedx/cyclonedx-npm
          cyclonedx-npm --output-format JSON --output-file sbom.node.json

      # Python dependencies
      - name: Generate CycloneDX SBOM (Python)
        run: |
          pip install cyclonedx-bom
          cyclonedx-py --format json --output sbom.python.json

      # Go dependencies
      - name: Generate CycloneDX SBOM (Go)
        uses: CycloneDX/gh-gomod-generate-sbom@v1
        with:
          version: v1
          output: ./sbom.go.json

      # Merge all SBOMs
      - name: Merge SBOMs
        run: |
          pip install cyclonedx-bom-merge
          cyclonedx-merge --input-files sbom.*.json --output-format json --output-file sbom.merged.json

      - name: Upload SBOM
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.merged.json
```

### Step 2: SBOM Vulnerability Scan
```yaml
name: SBOM Vulnerability Scan
on:
  schedule:
    - cron: '0 6 * * *'  # Daily

jobs:
  vuln-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Download latest SBOM
        uses: actions/download-artifact@v4
        with:
          name: sbom
          path: .

      - name: Scan with Grype
        run: |
          grype sbom:./sbom.merged.json --output json > vuln_report.json

      - name: Scan with Trivy
        run: |
          trivy sbom ./sbom.merged.json --format json --output trivy_report.json

      - name: Check for critical vulnerabilities
        run: |
          critical_count=$(grep -c '"Critical"' vuln_report.json || true)
          if [ $critical_count -gt 0 ]; then
            echo "CRITICAL: $critical_count critical vulnerabilities found!"
            exit 1
          fi
```

### Step 3: SBOM JSON Example (CycloneDX)
```json
{
  "$schema": "http://cyclonedx.org/schema/bom-1.5.schema.json",
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "serialNumber": "urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79",
  "version": 1,
  "metadata": {
    "timestamp": "2026-06-19T10:00:00Z",
    "tools": [{
      "vendor": "CycloneDX",
      "name": "cyclonedx-npm",
      "version": "1.16.0"
    }],
    "component": {
      "type": "application",
      "name": "my-app",
      "version": "2.1.0",
      "swid": {
        "tagId": "my-app-2.1.0",
        "name": "my-app"
      }
    }
  },
  "components": [
    {
      "type": "library",
      "name": "express",
      "version": "4.18.2",
      "purl": "pkg:npm/express@4.18.2",
      "supplier": {
        "name": "OpenJS Foundation"
      },
      "licenses": [{
        "license": {
          "id": "MIT"
        }
      }],
      "hashes": [{
        "alg": "SHA-512",
        "content": "f6ea6426c5b2a5a2d1c3e8b7c9d0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8"
      }],
      "externalReferences": [
        {"url": "https://expressjs.com/", "type": "website"},
        {"url": "https://github.com/expressjs/express", "type": "vcs"}
      ]
    }
  ],
  "dependencies": [
    {
      "ref": "pkg:npm/my-app@2.1.0",
      "dependsOn": ["pkg:npm/express@4.18.2"]
    }
  ],
  "vulnerabilities": []
}
```

### Step 4: SBOM Attestation
```yaml
# Sign and attest SBOM with Sigstore/Cosign
name: SBOM Attestation
on:
  release:
    types: [published]

jobs:
  attest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate SBOM
        run: cyclonedx-npm --output-file sbom.json
      - name: Sign SBOM with Cosign
        run: |
          cosign sign-blob --key cosign.key sbom.json > sbom.json.sig
      - name: Attest with in-toto
        uses: in-toto/attest@v1
        with:
          subject: sbom.json
          predicate-type: "https://cyclonedx.org/predicate/v1"
          predicate: sbom.json
```

## Best Practices
- Generate SBOMs at build time — attach to every release artifact
- Include both direct and transitive dependencies
- Use a standard format (SPDX or CycloneDX) — avoid proprietary formats
- Include component hashes for integrity verification
- Automate vulnerability scanning of SBOMs (continuous, not just at release)
- Sign SBOMs to ensure authenticity and integrity
- Update SBOM on every release — version control SBOMs
- Include SBOMs in container images as metadata labels
- Exceed minimum regulatory requirements — include license, supplier, and provenance data
- Integrate SBOM generation into CI/CD pipeline — not a manual process

## Common Pitfalls
- SBOM generated only at release (not continuous) — security gaps between releases
- Missing transitive dependencies — undercounting true component count
- No hash for components — can't verify integrity
- Proprietary format — incompatible with tools and regulations
- No SBOM signing — authenticity can't be verified
- SBOM generated after build (not from build-time) — may not match deployed artifact
- SBOM for source but not container image — runtime dependencies missing
- No automated vulnerability scanning — SBOM is just a list without analysis
- Ignoring transitive dependency vulnerabilities — majority of risk is in transitive deps
- Not versioning SBOMs — can't track what changed between releases

## Key Points
- SBOM: inventory of all components, dependencies, and metadata in software
- Standard formats: SPDX (ISO 5962) and CycloneDX (OWASP)
- Essential elements: component name, version, supplier, license, hash, dependencies
- Generate SBOM at build time in CI/CD pipeline
- Automate vulnerability scanning of SBOMs continuously
- Sign SBOMs for authenticity and integrity
- Include SBOMs in release artifacts and container images
- Cover both direct and transitive dependencies
- Exceed minimum regulatory requirements
- Version control SBOMs to track changes between releases
