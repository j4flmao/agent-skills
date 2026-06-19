# Supply Chain Security

## Threat Model

### Attack Vector 1: Dependency Confusion
- Package with same name as private package uploaded to public registry
- Build tool resolves to public (malicious) package due to higher version or priority
- **Mitigation**: pin dependencies, use private registries, enforce scoped packages (`@org/`)

### Attack Vector 2: Typosquatting
- Malicious package with similar name to popular package (`requets` vs `requests`)
- Developer makes typo and installs malicious package
- **Mitigation**: package allowlisting, careful review, automated typosquatting detection

### Attack Vector 3: Compromised Upstream
- Popular open-source maintainer account compromised
- Malicious code injected in new version
- **Mitigation**: pin exact versions, review diffs, use SCA tools with behavior analysis

### Attack Vector 4: Build Pipeline Compromise
- CI/CD system compromised, injecting malicious code during build
- **Mitigation**: SLSA compliance, signed provenance, isolated builds

## Defense in Depth
1. **SBOM generation**: Know every component in your software
2. **SCA scanning**: Continuously scan SBOM for vulnerabilities
3. **Dependency pinning**: Lock exact versions (lockfiles)
4. **Package verification**: Verify package hashes and signatures
5. **Private registries**: Use proxy registries (Artifactory, Nexus) with allowlisting
6. **Build integrity**: SLSA framework, signed attestations
7. **Continuous monitoring**: New vulnerabilities are discovered daily — rescan regularly

## Key Points
- Supply chain attacks target dependencies, build pipelines, and registries
- SBOM is the foundation for supply chain visibility
- Defense in depth: SBOM + SCA + pinning + verification + monitoring
- SLSA framework provides build integrity levels
- Dependency confusion and typosquatting are common attack vectors
- Private proxy registries with allowlisting reduce supply chain risk
- Rescan SBOMs continuously as new vulnerabilities are discovered
