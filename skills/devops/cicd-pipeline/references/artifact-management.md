# Artifact Management in CI/CD

## Artifact Types
Build artifacts: compiled binaries, jar files, Docker images. Package artifacts: npm, pip, Maven, NuGet packages. Container images: OCI-compliant images in registry. Terraform plans: binary plan files for apply. SBOM: software bill of materials for audit. Test reports: JUnit XML, coverage reports, screenshots.

## Artifact Storage
Registry: container registry (ECR, GCR, Docker Hub), package registry (Artifactory, Nexus, GitHub Packages). Object storage: S3/GCS/Blob for large artifacts. Retention: latest 10 builds, 30-day old builds removed. Immutable tags: prevent overwrite of published artifacts. Versioning: enable on artifact storage for recovery.

## Container Image Management
Tagging strategy: git-sha (immutable), branch (latest), semver (release). Multi-architecture: manifest lists for amd64 + arm64. Caching: remote cache in registry for faster builds. Scan on push: vulnerability scanning before tag promotion. Provenance: attestations for build metadata and source.

## Artifact Promotion
Pipeline stages: build → test → staging → production. Tag promotion: promote specific artifact version through environments. Approval gates: manual or automated between environments. Rollback: promote previous artifact version. SBOM promotion: ensure SBOM follows artifact.

## Artifact Cleanup
Scheduled cleanup: remove old builds, unused layers, stale tags. Cleanup policy: age-based (30 days), count-based (keep 100), tag-based (preserve latest). Layer cleanup: remove untagged layers from registry. Cost optimization: reduce storage costs with cleanup policy. Automation: scripted cleanup with registry API.

## Integrity Verification
Checksums: SHA256 of artifact stored alongside. Signing: cosign or GPG signature for authenticity. Verification in pipeline: verify signature before deployment. Provenance: attestation of build process and source. SBOM verification: match dependency list with policy.

## References
- cicd-pipeline-fundamentals.md -- Fundamentals
- deployment-strategies.md -- Deployment
- pipeline-security.md -- Pipeline Security
- multi-environment.md -- Multi-Environment
- pipeline-optimization.md -- Optimization
