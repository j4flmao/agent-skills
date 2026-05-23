# Supply Chain Attack Patterns

## Attack Vectors
| Attack | Description | Mitigation |
|--------|-------------|------------|
| Dependency confusion | Upload to public registry with same name as private package | Pin versions, scope resolution |
| Typosquatting | Similar name to popular package | Package verification, allowlists |
| Malicious maintainer | Compromised maintainer account | Multi-sig releases, code review |
| Build system compromise | Attacker modifies build pipeline | SLSA, provenance, hardened CI |
| Registry compromise | Attacker gains access to package registry | Mirror registries, pin hashes |

## Defense in Depth
| Layer | Tool | Practice |
|-------|------|----------|
| Development | Dependabot, Renovate | Automated dependency updates |
| Build | Trivy, Grype | Vulnerability scanning |
| Signing | Sigstore, cosign | Package signing and verification |
| Deploy | Admission controller | Only allow signed images |
| Runtime | Falco | Detect unexpected behavior |
| Audit | GUAC | Dependency graph analysis |
