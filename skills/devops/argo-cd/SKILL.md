---
name: devops-argo-cd
description: |
  Trigger: "ArgoCD", "Argo CD", "GitOps", "GitOps deployment", "ArgoCD app",
  "ArgoCD project", "sync policy", "auto-sync", "ArgoCD application set",
  "ArgoCD rollback", "declarative GitOps"
  Exclusion: Not for general Kubernetes manifests — use kubernetes-patterns.
version: 1.0.0
author: j4flmao
license: MIT
compatibility:
  cli: true
  core: true
  editor: true
  api: true
tags: [devops, gitops, argocd, kubernetes, phase-7]
---

# devops-argo-cd

## Purpose
Manage GitOps workflows using ArgoCD — declarative Kubernetes deployments with auto-sync, ApplicationSets, multi-cluster, RBAC, SSO, and progressive delivery patterns.

## Agent Protocol

### Trigger
Any user message referencing ArgoCD, GitOps, sync policies, ApplicationSets, rollback, or multi-cluster GitOps deployments.

### Input Context
Desired ArgoCD operation: application definition, sync strategy, project scoping, ApplicationSet generator type, or multi-cluster registration.

### Output Artifact
ArgoCD Application/AppProject/ApplicationSet manifests as YAML, plus sync policy, RBAC configuration, and cluster registration commands.

### Response Format
YAML manifests with inline explanations. Usage examples and CLI commands where applicable.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
Application synced, health check passing. RBAC and project scoping applied. Multi-cluster registration verified.

### Max Response Length
8000 tokens.

## Components

### Architecture in Depth
API server: exposes gRPC and REST API, handles authentication via SSO/OIDC/local users, enforces RBAC, serves web UI. Deployed as Deployment with 2+ replicas in HA mode. Repo server: caches Git repos locally, generates manifests by running Kustomize/Helm/Jsonnet, supports 3+ simultaneous connections per repo. Stateless — can scale horizontally. Application controller: runs reconciliation loop every 3 minutes, compares desired state (from Git) vs live state (from cluster), computes diff, applies sync when out of sync. Stateful — uses Redis for deduplication. Redis: in-memory cache for dedup, memoization, and UI state. HA uses Redis sentinel for failover. Dex/OIDC: delegates authentication to external identity providers (Azure AD, Google, GitHub, GitLab, LDAP, SAML).

### CRD Reference
Application: source repo URL, target revision, path, destination cluster/namespace, sync policy (automated/manual), sync options (CreateNamespace, PruneLast, ApplyOutOfSyncOnly, RespectIgnoreDifferences), health checks. AppProject: source repo allowlist, destination cluster/namespace allowlist, resource allowlist, role definitions with JWT tokens for CI systems. ApplicationSet: generator (list, git, cluster, SCM, pull request, matrix), template (Application spec with template variables), sync policy (preserve resources on delete).

### Sync Wave and Hook Patterns
Wave -5 to -3: CRDs, Namespaces, PriorityClasses. Wave -2 to -1: Secrets (SealedSecrets/External Secrets), ServiceAccounts, RBAC. Wave 0: ConfigMaps, Services, PVCs (dependencies). Wave 1-3: Deployments, StatefulSets, DaemonSets (workloads). Wave 4: HPA, VPA, PDB (autoscaling). Wave 5: Ingress, Gateway, ServiceMonitor (exposure). Wave 10: cleanup jobs. Within same wave: resources apply in parallel. Sync hooks: PreSync (blocking — runs before wave 0), Sync (alongside resources), PostSync (after all waves succeed), SyncFail (on failure). Jobs must complete successfully for sync to proceed.
ArgoCD comprises five components: API server (UI + API endpoints, RBAC enforcement), repo server (caches Git repos, generates manifests via Kustomize/Helm/Jsonnet), application controller (reconciles desired vs live state, 3-minute reconciliation loop), Redis cache (for dedup and memoization), and Dex/ OIDC integration for SSO. All components run in the argocd namespace. HA mode deploys redundant replicas for API server, repo server, and application controller.

### 2. CRDs: Application, AppProject, ApplicationSet
Application: defines source repo, destination cluster, sync policy, sync options, health checks. AppProject: scopes Applications to teams, restricts source repos, destination clusters/namespaces, and allowed resources, includes role-based access for CI systems. ApplicationSet: generates Applications dynamically from generators (list, git, cluster, SCM, pull request, matrix) — each generator item produces one Application manifest from a template.

### 3. Sync Strategies
Manual sync: controlled rollout, apply-out-of-sync-only option for selective syncing, requires explicit sync button or CLI command. Automated sync with prune: ArgoCD auto-syncs when Git changes, deletes resources not in Git, best for standard deployments. Automated sync without prune: syncs changes but does not delete resources, safer for stateful workloads. Self-heal: automatically reverts manual cluster changes to match Git. Sync options: CreateNamespace=true, PruneLast=true, SkipDryRunOnMissingResource, RespectIgnoreDifferences, ApplyOutOfSyncOnly.

### 4. Sync Waves
Annotation `argocd.argoproj.io/sync-wave` controls ordering: lower waves execute first. Wave -5 to -1: infrastructure setup (namespaces, secrets, CRDs). Wave 0: core services (configmaps, service accounts). Wave 1-5: application workloads. Wave 10+: cleanup jobs. Resources in same wave apply in parallel. Wave ordering critical for dependency management.

### 5. Sync Hooks
PreSync: runs before sync — database migrations, pre-deployment validation. Sync: runs during sync — standard resources. PostSync: runs after successful sync — smoke tests, notifications, cache invalidation. SyncFail: runs on sync failure — cleanup, rollback, notification. Skip: runs only on first sync. Hook delete policies: HookSucceeded, HookFailed, BeforeHookCreation. Hook Jobs must complete successfully for sync to proceed (PreSync blocks sync until complete).

### 6. Multi-Cluster Management
Register external clusters via `argocd cluster add <context>` or declarative cluster secrets. Cluster generator in ApplicationSet iterates all registered clusters automatically. Hub-and-spoke model: single ArgoCD control plane manages multiple workload clusters. Cluster-specific config via config overlays in ApplicationSet template. In-cluster deployment for single-cluster setups, hub-spoke for multi-cluster. Cluster labels enable targeted ApplicationSet generation.

### 7. RBAC and SSO
RBAC policies in argocd-rbac-cm ConfigMap: map OIDC groups/roles to API/UI permissions (readonly, admin, custom). SSO via Dex (OIDC, SAML, LDAP, GitHub, GitLab, Microsoft, Google) or built-in OIDC. Project roles for CI system access with JWT tokens — scoped to specific applications. Policy format: p, role, resource, action, object, effect.

### 8. Rollback
View deployment history: `argocd app get myapp-prod`. Rollback to revision: `argocd app rollback myapp-prod --prune <REVISION_ID>`. Rollback with sync policy override: `argocd app rollback myapp-prod --sync-policy=manual <REVISION_ID>`. ArgoCD deletes the diff between current and target revision and reapplies the target. Revision history limit configured via `spec.revisionHistoryLimit`.

### 9. Kustomize/Helm Integration
Kustomize: ArgoCD natively renders Kustomize overlays by pointing source path to the overlay directory. Helm: supports `helm repo add`, values files from same repo or external, `--set` parameters via spec.source.helm.parameters. Jsonnet and plain YAML also supported. Configuration management tool auto-detected from repo contents.

### 10. Pull vs Push Deployment
Push model (traditional CI/CD): CI pipeline runs kubectl/helm to deploy. Pull model (GitOps): CI pipeline only builds and pushes images, ArgoCD detects drift from Git and pulls into cluster. Pull model advantages: no cluster credentials in CI, Git remains single source of truth, drift detection runs continuously. Hybrid: CI updates Git with new image tag, ArgoCD pulls the change.

## Advanced Patterns

### Pull vs Push Deployment Model
Push model (traditional): CI pipeline runs kubectl/helm to deploy directly to cluster, CI has cluster admin credentials stored as secrets, no drift detection, manual reconciliation when cluster is out of sync. Pull model (GitOps): CI pipeline only builds and pushes images to registry and updates Git with new image tag, ArgoCD detects drift from Git and pulls into cluster, no cluster credentials in CI environment, Git remains single source of truth, continuous drift detection every 3 minutes. Hybrid: CI updates Git repo with new manifest (image tag, config change), ArgoCD auto-syncs the change. Never: CI deploys directly to cluster AND updates Git — dual-source-of-truth causes sync conflicts.

### Multi-Cluster Architecture Patterns
Hub-and-spoke: single ArgoCD control plane manages multiple workload clusters. Cluster generator in ApplicationSet iterates all registered clusters. Benefits: single UI/API, consistent policy, centralized audit. Drawbacks: control plane is single point of failure, network latency to remote clusters. Regional hub: ArgoCD control plane per region, manages clusters within that region. Benefits: lower latency, regional autonomy, fault isolation. Drawbacks: duplicated configuration, inconsistent policy risk. Federated: each cluster has its own ArgoCD, ApplicationSets across clusters via Git. Benefits: full autonomy, simplest failure isolation. Drawbacks: duplicated effort, no centralized view.

### Disaster Recovery for ArgoCD
Backup ArgoCD config: export all Applications, AppProjects, and argocd-cm/argocd-rbac-cm configmaps. Backup Redis: Redis data is ephemeral — ArgoCD will re-sync from Git on restart. Restore: apply backed-up configmaps -> ArgoCD reconnects to clusters -> re-syncs all applications. Cluster recovery: register new cluster, ArgoCD applies all Applications from Git. Multi-cluster ArgoCD: deploy ArgoCD in 2+ regions, each manages its region's clusters. Git is the source of truth — ArgoCD itself is replaceable.

## Rules
1. Git is single source of truth — manual cluster changes overwritten on sync.
2. ApplicationSets for multi-env / multi-cluster deployments.
3. Sync waves for dependency ordering across resources.
4. Health checks every 3 minutes default; customize via lua for custom CRDs.
5. Auto-sync with prune enabled by default for standard apps.
6. AppProject restricts source repos, dest clusters, and namespaces per team.
7. Sync hooks for pre/post sync tasks (db migrations, smoke tests).
8. Never commit encrypted secrets to Git — use SealedSecrets or External Secrets.
9. Pull model over push model — cluster credentials never in CI.
10. Revision history limit set to at least 10 for rollback capability.
11. Rollback is a deployment, not a revert — understand the diff before rolling back.
12. ArgoCD itself is disposable — Git is the source of truth, not ArgoCD's Redis.
13. Cluster secrets stored in argocd namespace with strict RBAC, never in Git.
14. ApplicationSet prune on delete: false for critical apps to prevent accidental deletion.
15. Repository secrets stored as k8s.io/basic-auth or k8s.io/ssh-auth secrets in argocd namespace.
16. ArgoCD notifications configured for sync failures, sync successes, and health changes.
17. Resource exclusions in argocd-cm prevent ArgoCD from managing cluster-internal resources.

## Config Management Plugins
Extend ArgoCD with custom configuration management tools via CMP (Config Management Plugin). Use cases: custom templating engine, SOPS-encrypted secrets decryption, custom resource generation, internal tool integrations. CMP setup: define plugin in argocd-cm ConfigMap under `configManagementPlugins`, specify command and arguments. Example: SOPS plugin runs `sops -d` on encrypted files before applying. CMP runs in repo server sidecar for isolation. Benefits: extends ArgoCD beyond Kustomize/Helm without modifying ArgoCD itself.

## Webhook Integration
Configure webhooks in Git provider (GitHub, GitLab, Bitbucket) for faster sync triggers. Without webhook: ArgoCD polls Git every 3 minutes — up to 3-minute delay before sync starts. With webhook: ArgoCD receives webhook notification within seconds of commit, starts sync immediately. Setup: configure webhook URL to ArgoCD API server endpoint `https://argocd.example.com/api/webhook`, optionally verify webhook secret. Benefits: near-instant sync, faster feedback loop for developers, reduced reconciliation latency for critical applications.

## Scenario Playbooks

### Onboarding a New Microservice
1. Create application directory in gitops repo: `apps/myapp/` with Kustomize overlay or Helm values
2. Add Kubernetes manifests: Deployment, Service, ConfigMap, HPA, PDB, ServiceMonitor
3. Create ArgoCD Application YAML: source path, destination namespace, sync policy with auto-sync
4. Option 1 — standalone Application: add to team's AppProject, commit and push, ArgoCD auto-discovers
5. Option 2 — ApplicationSet: if using git generator, new directory is auto-discovered
6. Verify sync: ArgoCD UI shows healthy status, pods running, ingress configured
7. Configure sync hooks: PreSync for DB migration, PostSync for smoke test
8. Set up monitoring: ServiceMonitor for Prometheus, Grafana dashboard, alert rules

### Migrating from CI Push to GitOps Pull
1. Phase 1 — Disable CI push: CI stops running kubectl/helm deploy, CI only builds images and pushes to registry
2. Phase 2 — CI updates Git: CI updates K8s manifest with new image tag in gitops repo (commit or PR)
3. Phase 3 — ArgoCD syncs: ArgoCD detects Git change (3-minute reconciliation loop), applies to cluster
4. Phase 4 — Validation: verify application health, rollback by reverting Git commit
5. Phase 5 — Cleanup: remove cluster credentials from CI, remove old deploy scripts, set up self-heal
6. Rollback plan: revert Git commit, ArgoCD auto-syncs previous state, no manual cluster intervention

### Handling Sync Failure
Symptoms: Application status shows "OutOfSync" with "Error" health status, sync hangs on hook. Diagnosis: check app details in ArgoCD UI, verify Git repo access, check repo server logs, verify destination cluster connectivity. Resolution: for sync error — fix manifest issue in Git, commit fix, auto-sync retries. For hook failure — check hook Job logs, fix migration/test, commit fix, ArgoCD retries on next sync. For cluster connectivity — verify kubeconfig, check cluster API health, re-register cluster if needed. Prevention: CI validation of manifests before commit, pre-sync hook smoke tests, canary deployments with auto-rollback.

## References
- [ArgoCD Setup](./references/argocd-setup.md) — installation, config, SSO, projects, cluster registration
- [ArgoCD Patterns](./references/argocd-patterns.md) — ApplicationSets, sync waves, hooks, rollback, blue-green, canary
- [ArgoCD Advanced](./references/argocd-advanced.md) — CMP, webhooks, multi-cluster DR, notifications, Argo Rollouts
- [ArgoCD Operations](./references/argocd-operations.md) — HA, scaling, backup/restore, upgrade, troubleshooting, performance

## Handoff
Hand off to ArgoCD when Application manifests or sync policies are needed. Hand off to kubernetes-patterns for general workload manifests. Hand off to helm-patterns for Helm chart-specific concerns. Hand off to observability for monitoring ArgoCD itself. Hand off to cicd-pipeline for ArgoCD integration with CI systems. Hand off to security for SSO configuration and RBAC policy design. Hand off to service-mesh for progressive delivery patterns with Argo Rollouts and Istio integration.
