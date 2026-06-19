# SBOM Advanced Topics

## Introduction
Advanced SBOM covers multi-layered SBOMs (application + OS + infrastructure), SBOM aggregation at enterprise scale, supply chain attestation with in-toto, vulnerability exploitation scoring (EPSS correlation), and emerging SLSA (Supply-chain Levels for Software Artifacts) frameworks.

## Multi-Layered SBOM
An application's full supply chain includes multiple layers:

```
┌─────────────────────────────┐
│ Application Source SBOM     │ ← npm/pip/go.mod dependencies
├─────────────────────────────┤
│ Container Image SBOM        │ ← base image + packages + app
├─────────────────────────────┤
│ Infrastructure SBOM         │ ← IaC dependencies, provider versions
├─────────────────────────────┤
│ Runtime SBOM                │ ← Dynamic dependencies loaded at runtime
└─────────────────────────────┘
```

## SBOM Aggregation
At enterprise scale, aggregate SBOMs from all services into a central inventory:
- Each service generates its own SBOM during build
- Central SBOM aggregator collects and merges all SBOMs
- Vulnerability scanning runs against the aggregated inventory
- Cross-service dependency mapping identifies shared vulnerable components
- Impact analysis: "Which services use Log4j 2.14.0?"

## EPSS Correlation
Exploit Prediction Scoring System (EPSS) combined with SBOM enables prioritization:
- CVSS severity (NVD): base severity of the vulnerability
- EPSS (FIRST.org): probability of exploitation in the next 30 days
- SBOM: which components are actually in use
- Priority = EPSS score + CVSS severity + business criticality

```python
def prioritize_vulnerabilities(sbom_vulns: list[dict]) -> list[dict]:
    """Prioritize SBOM vulnerabilities by EPSS + CVSS + criticality."""
    for vuln in sbom_vulns:
        epss = get_epss_score(vuln["cve_id"])
        cvss = vuln.get("cvss_score", 0)
        biz_criticality = vuln.get("component_criticality", 5)
        vuln["priority"] = epss * 0.4 + (cvss / 10) * 0.3 + (biz_criticality / 10) * 0.3
    return sorted(sbom_vulns, key=lambda v: v["priority"], reverse=True)
```

## SLSA Framework
SLSA (Supply-chain Levels for Software Artifacts) provides a security framework:
- **SLSA 1**: Build process documented, provenance generated
- **SLSA 2**: Signed provenance, hosted build, tamper-resistant
- **SLSA 3**: Isolated build, no human influence, hardened builder
- **SLSA 4**: Two-person review, hermetic build, reproducible

## Key Points
- Multi-layered SBOMs cover source, container, infrastructure, and runtime
- Central SBOM aggregation enables enterprise-wide vulnerability inventory
- EPSS correlation improves vulnerability prioritization over CVSS alone
- SLSA framework provides build integrity levels for supply chain security
- SBOM sharing with trusted partners enables coordinated vulnerability response
- SBOMs must be signed and attested for authenticity verification
- Automated policy enforcement: block deployments with critical vulnerabilities
- in-toto attestations provide end-to-end supply chain integrity
