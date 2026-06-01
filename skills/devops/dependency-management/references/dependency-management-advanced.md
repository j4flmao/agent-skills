# Dependency Management Advanced Topics

## Introduction
Advanced dependency management covers supply chain security with SLSA, custom package registries, organization-wide policy enforcement, and Renovate advanced configuration.

## Supply Chain Security with SLSA
SLSA (Supply Chain Levels for Software Artifacts) framework: build integrity, provenance, and reproducibility. SLSA Level 1: provenance shows how package was built. SLSA Level 2: signed provenance, hosted build. SLSA Level 3: hardened build, provenance prevents tampering. SLSA Level 4: two-person review, hermetic builds. Implement SLSA with GitHub Actions, Sigstore, and cosign.

## Custom Package Registries
Private npm registry: GitHub Packages, Verdaccio, JFrog Artifactory. Private PyPI: devpi, AWS CodeArtifact. Private Maven: Nexus, Artifactory, GitLab Package Registry. Registry mirroring for rate-limit avoidance. Access tokens with least privilege per project. Registry replication for HA and DR.

## Organization-Wide Policy
Trusted package sources: only allow packages from verified registries. License compliance: allow only MIT, Apache-2.0, BSD; block GPL/AGPL if needed. Vulnerability thresholds: fail CI on critical and high CVEs. Deprecation detection: alert on deprecated packages. Version pinning enforcement: no ranges in production builds.

## Renovate Advanced Configuration
Custom regex manager for non-standard dependencies (Docker, Helm, custom). Presets for org-wide standardization. Package rules with file path matching for monorepos. Update types granularity: pin, digest, patch, minor, major. Replacement and alias rules. Onboarding configuration for new repositories. Dependency dashboard for centralized visibility.

## Automated Dependency Audits
SBOM generation with CycloneDX or SPDX format. SBOM upload to dependency track for continuous monitoring. License compliance scanning in CI. Malicious package detection (Socket.dev, npm audit signatures). Binary authorization for production deployments.

## Monorepo Dependency Management
Workspace-aware dependency updates (npm workspaces, pnpm, lerna). Cross-project dependency compatibility matrix. Shared lock file vs per-package lock files. Dependency graph visualization for impact analysis. Cyclical dependency detection and resolution.

## References
- dependency-management-fundamentals.md -- Fundamentals
- dependabot-setup.md -- Dependabot Setup
- renovate-config.md -- Renovate Configuration
- update-strategies.md -- Update Strategies
- vulnerability-scanning.md -- Vulnerability Scanning
