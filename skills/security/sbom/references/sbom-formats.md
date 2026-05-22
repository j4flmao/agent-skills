# SBOM Formats

## CycloneDX

### Format Overview
Version: 1.5 (latest). Format: JSON (preferred) or XML. Schema: standardized, rich metadata, dependency graph support. Properties: extends core spec with name-value pairs for custom metadata.

### Key Fields
```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "version": 1,
  "metadata": { "timestamp": "2026-05-22T12:00:00Z" },
  "components": [{
    "type": "library",
    "name": "express",
    "version": "4.18.2",
    "purl": "pkg:npm/express@4.18.2",
    "licenses": [{"license": {"id": "MIT"}}]
  }],
  "dependencies": [{"ref": "pkg:npm/express@4.18.2", "dependsOn": []}]
}
```

### Tooling
- Syft: `syft packages <image> -o cyclonedx-json`
- CycloneDX CLI: `cyclonedx-bom -o bom.json`
- Gradle plugin: `org.cyclonedx.bom`
- Maven plugin: `cyclonedx-maven-plugin`
- npm: `@cyclonedx/bom`

### When to Use
Default for all cases. Best ecosystem support. Rich dependency graph. OWASP-backed format.

## SPDX

### Format Overview
Version: 2.3 (latest). Format: JSON, YAML, RDF/XML, tag:value. ISO 5962:2021 standard. Focus: license compliance, copyright information, provenance.

### Key Fields
```json
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "my-app-sbom",
  "creationInfo": {
    "created": "2026-05-22T12:00:00Z"
  },
  "packages": [{
    "SPDXID": "SPDXRef-Package-express-4.18.2",
    "packageName": "express",
    "packageVersion": "4.18.2",
    "packageLicenseDeclared": "MIT",
    "packageLicenseConcluded": "MIT"
  }]
}
```

### Tooling
- Syft: `syft packages <image> -o spdx-json`
- SPDX tools: Java-based validation and conversion

### When to Use
Required for regulatory compliance. Legal reviews. Government contracts.

## Format Comparison

| Feature | CycloneDX | SPDX |
|---------|-----------|------|
| Primary focus | Security vulnerability | License compliance |
| Dependency graph | Rich (nested) | Flat (package list) |
| Format | JSON, XML | JSON, YAML, RDF/XML, tag:value |
| Standard body | OWASP | Linux Foundation |
| ISO standard | No | ISO 5962:2021 |
| Vulnerability correlation | Via services | Via package info |
| Tool support | Extensive | Good |
| Best for | Default choice | Regulatory compliance |

## Multi-Format Strategy
Generate both: CycloneDX for security tooling, SPDX for compliance. Use Syft for generation — supports both formats from single scan. Store both in artifact registry alongside the image.
