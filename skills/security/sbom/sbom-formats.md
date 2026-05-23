# SBOM Formats

## CycloneDX

OWASP standard for SBOM representation. Latest version: 1.5. JSON and XML formats.

### Key Capabilities
- **Components**: name, version, publisher, supplier, licenses, hashes, purl (package URL), cpe (CPE), SWID tag, dependency relationships (parent-child). Supports operating system packages, libraries, files, devices, services.
- **Services**: endpoints, authentication type, trust zone, data classification. Capture external API dependencies that are not software components.
- **Vulnerabilities**: embedded vulnerability data within the SBOM itself. ID, source advisory URL, CVSS score, CWE, affected version range, remediation advice. Enables self-contained vulnerability reporting without external lookup.
- **Formulation**: build and transformation steps. Records how each component was produced — compiler used, build tool, environment variables. Useful for reproducible builds.
- **Pedigree**: patch ancestry, ancestor commits, provenance. Crucial for downstream distributions that patch upstream components.
- **Properties**: custom key-value metadata for ecosystem-specific information. npm scope, Maven classifier, NuGet target framework.

### Tool Ecosystem
- Generation: Syft, CycloneDX CLI, Trivy, ORT (OSS Review Toolkit), Tern, Docker SBOM.
- Plugins: Maven (`cyclonedx-maven-plugin`), Gradle (`cyclonedx-gradle`), npm (`@cyclonedx/cyclonedx-npm`), pip (`cyclonedx-python`), Go (`cyclonedx-gomod`), Rust (`cargo-cyclonedx`), .NET (`CycloneDX` NuGet).
- Consumption: Dependency Track, OWASP Dependency Check, Snyk, Grype, Trivy, FOSSA, Renovate (SBOM-aware dependency updates).
- Validation: cyclonedx-cli `validate` command, CycloneDX schema (`bom-1.5.schema.json`). Always validate generated SBOMs before publishing.

### Structure
```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "metadata": { "timestamp": "2025-01-15T10:30:00Z" },
  "components": [
    {
      "type": "library",
      "name": "lodash",
      "version": "4.17.21",
      "purl": "pkg:npm/lodash@4.17.21",
      "licenses": [ { "license": { "id": "MIT" } } ]
    }
  ],
  "dependencies": [
    { "ref": "pkg:npm/my-app@1.0.0", "dependsOn": ["pkg:npm/lodash@4.17.21"] }
  ]
}
```

## SPDX (ISO/IEC 5962:2021)

International standard for software package data exchange. Multiple formats: tag-value, RDF/XML, JSON, YAML, XLSX.

### Key Capabilities
- **Package information**: name, version, supplier, originator, download location, package verification code (SHA1 of all files concatenated). Supports filesystem-level granularity (individual file licenses).
- **File-level licensing**: each file can have its own license, copyright text, and notice. Essential for projects with mixed-licensing contributions, embedded third-party code, or auto-generated files under different terms.
- **Snippets**: portions of files with independent licensing. Used for inline code from different sources, algorithm implementations with separate licenses, configuration templates.
- **Relationships**: DESCRIBES, CONTAINS, DEPENDS_ON, BUILT_FROM, PATCH_FOR, GENERATED_FROM, DATA_OF, AMENDS. Rich relationship model to describe how components interact.
- **Annotations**: reviewer notes, timestamp, annotator identity. Multiple annotators can add notes independently. Used for audit trails and compliance reviews.
- **Cross-reference integrity**: package verification codes allow consumers to verify the package has not been modified since the SBOM was created. Each file SHA1 provides file-level integrity.

### Formats
- **Tag-value**: human-readable line format. Good for manual review and git diffs. One tag per line, value is rest of line. Example: `PackageName: lodash\nPackageVersion: 4.17.21`.
- **RDF/XML**: machine-readable, integrates with semantic web tooling. Most verbose. Supports inference and linked data queries.
- **JSON**: best balance of tooling support and human readability. Preferred for CI/CD integration. Same structure as tag-value but in JSON.
- **YAML**: most human-readable. Good for configuration files and small projects. Limited tooling support compared to JSON.
- **XLSX**: spreadsheet format for legal team review. Contains all tag-value fields in tabular form with sheet per namespace.

### Structure (JSON)
```json
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "my-app-1.0.0.spdx.json",
  "packages": [
    {
      "SPDXID": "SPDXRef-Package-lodash",
      "name": "lodash",
      "versionInfo": "4.17.21",
      "licenseConcluded": "MIT",
      "packageVerificationCode": { "value": "..." }
    }
  ],
  "relationships": [
    {
      "spdxElementId": "SPDXRef-DOCUMENT",
      "relationshipType": "DESCRIBES",
      "relatedSpdxElement": "SPDXRef-Package-lodash"
    }
  ]
}
```

## SPDX 2.3 vs 3.0

| Aspect | SPDX 2.3 | SPDX 3.0 |
|---|---|---|
| Model | Document-centric (flat top-level fields) | Profile-based (modular namespaces) |
| Relationships | Flat list of relationships | Typed relationship objects with properties |
| Security | Not native (use "ExternalRef" for advisory URLs) | Built-in security profile with vulnerability objects |
| Licensing | File-level and package-level | Same model, extended with AI/ML dataset profiles |
| Build info | Not supported | Build profile with provenance and SLSA levels |
| SBOM nesting | Single SBOM document | SBOM-of-SBOMs via composite relationships |
| Tooling maturity | Broad, stable | Emerging, active development |
| Migration path | Current standard | Add alongside 2.3; migrate when tooling matures |

## Format Selection Guide

| Requirement | Choose |
|---|---|
| General supply chain security | CycloneDX JSON |
| Regulatory compliance (US EO 14028) | SPDX 2.3 JSON |
| Legal/license review | SPDX (any format, add XLSX for lawyers) |
| Vulnerability correlation automation | CycloneDX JSON (native vuln embedding) |
| Build pipeline integration | CycloneDX (more plugins) |
| Government/procurement | SPDX (ISO standard) |
| AI/ML component inventory | SPDX 3.0 (AI profile) |
| Fine-grained file licensing | SPDX (file and snippet model) |

Generate both when requirements overlap — Syft can output CycloneDX and SPDX simultaneously from a single scan. Dual format provides maximum compatibility without extra cost.
