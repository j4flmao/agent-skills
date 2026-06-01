# GitHub Actions Advanced Topics

## Introduction
Advanced GitHub Actions covers custom actions, composite actions, reusable workflows at scale, self-hosted runners with auto-scaling, Actions OpenID Connect, and deployment environments.

## Custom Actions
Docker container actions: full environment control, slower startup. JavaScript actions: fast, runs on runner, uses @actions/core toolkit. TypeScript actions: compiled to JavaScript, typed. Composite actions: combine multiple steps into reusable unit. Action metadata: action.yml with inputs, outputs, runs definition. Testing actions with act and jest.

## Composite Actions
Replace duplicated step sequences across workflows. Support for inputs and outputs. Can use if conditions, but not jobs-level features. Use composite for: checkout, setup, lint, build, test patterns. Store in organization GitHub Actions repository. Version with semantic tags (v1, v1.2, v1.2.3).

## Reusable Workflows at Scale
Callable workflows with workflow_call trigger. Inputs typed as string, number, boolean, choice. Secrets passed by name. Strategy matrix integration for multi-version testing. Reusable workflow limits: max 10 inputs, 10 secrets, 4 levels deep. Organization-level sharing across repos.

## Self-Hosted Runner Auto-Scaling
Runner groups for environment isolation. Auto-scaling with actions-runner-controller (ARC) on Kubernetes. Ephemeral runners for per-job isolation. Azure VM Scale Set runners for dynamic provisioning. Linux/macOS/Windows runner image customization. Runner health monitoring and alerting.

## Actions OpenID Connect
OIDC for cloud provider authentication without static secrets. AWS: configure IAM role with OIDC trust. Azure: Azure AD workload identity federation. GCP: workload identity federation with GitHub's OIDC provider. HashiCorp Vault: JWT auth with OIDC. Short-lived credentials improve security posture.

## Deployment Environments
Environment protection rules: required reviewers, deployment gates. Environment variables and secrets scoped to environment. Deployment branches restriction per environment. Environment deployment history and audit log. Combined with reusable workflows for promotion pipeline.

## References
- github-actions-fundamentals.md -- Fundamentals
- workflows-auth.md -- Workflows and Auth
- marketplace-actions.md -- Marketplace Actions
- self-hosted-runners.md -- Self-Hosted Runners
- security-hardening.md -- Security Hardening
