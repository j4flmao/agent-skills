# CI/CD Pipeline Advanced Topics

## Introduction
Advanced CI/CD covers deployment strategies (blue-green, canary), pipeline optimization, security-hardened pipelines, monorepo pipelines, and multi-cloud deployment.

## Deployment Strategies
Blue-green deployment: maintain two identical environments. Route traffic from blue (current) to green (new) after validation. Instant rollback by switching back. Canary deployment: incrementally shift traffic percentage. Monitor error rates and latency after each increment. Automated rollback if metrics degrade. Rolling update: replace instances gradually. Least control, simplest setup. Feature flags: deploy code disabled, enable gradually.

## Pipeline Optimization
Parallel stages with needs DAG for maximum parallelism. Caching: dependency cache, Docker layer cache, build cache. Conditional execution with path filters. Concurrency limits to cancel redundant builds. Test splitting across parallel runners. Pipeline duration monitoring and SLOs.

## Security-Hardened Pipelines
Zero-trust pipeline: verify every artifact signature. OIDC-based cloud authentication (no static secrets). Supply chain Levels for Software Artifacts (SLSA) compliance. Signed commits and tags for all pipeline artifacts. SBOM generation per build. Vulnerability scanning before image promotion. Secrets detection in CI output.

## Monorepo Pipelines
Path-based triggering for component-specific builds. Matrix generation from monorepo structure. Cached dependency across all components. Distributed builds with artifact sharing. Change impact analysis to determine what to build.

## Multi-Cloud Deployment
Cloud-agnostic pipeline stages with provider-specific deploy steps. Terraform for multi-cloud infrastructure. Helm/Kustomize for multi-cloud Kubernetes. Provider matrix for cross-cloud testing. Pipeline orchestration across cloud boundaries.

## Pipeline as Code
Maintain pipeline definitions in version control. Use shared pipeline libraries for org-wide standards. Version pipeline definitions alongside application code. Review pipeline changes via pull requests. Test pipeline changes in sandbox environments.

## References
- cicd-pipeline-fundamentals.md -- Fundamentals
- pipeline-security.md -- Pipeline Security
- deployment-strategies.md -- Deployment Strategies
- pipeline-optimization.md -- Pipeline Optimization
- artifact-management.md -- Artifact Management
