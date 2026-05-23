# SBOM Attestation

## In-Toto Attestation
`
Statement (predicate: https://spdx.dev/Document)
├── Subject: artifact digest (sha256)
├── Predicate: SPDX SBOM document
└── Signature: signed by build system
`

## Attestation Generation (cosign)
`ash
# Generate SBOM
trivy image --format cyclonedx myapp:latest > sbom.cdx.json

# Sign attestation
cosign attest --predicate sbom.cdx.json \
    --type cyclonedx myapp:latest

# Verify attestation
cosign verify-attestation --type cyclonedx myapp:latest
`

## SLSA Provenance
| SLSA Level | Requirements |
|------------|--------------|
| 1 | Documentation of build process |
| 2 | Signed provenance, hosted build |
| 3 | Hardened build, no user-controlled steps |
| 4 | Two-person review, hermetic builds |
