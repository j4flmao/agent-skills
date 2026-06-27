---
name: gitops
description: >
  Use this skill when the user says 'GitOps', 'ArgoCD', 'Flux', 'Git as source
  of truth', 'sync policy', 'drift detection', 'multi-env GitOps', 'Application
  CRD', 'Kustomize', 'Helm with GitOps', 'sync waves', 'phased rollouts'.
  Covers: declarative deployments, ArgoCD setup, Flux setup, sync strategies,
  drift detection, multi-environment promotion, secrets in GitOps.
  Do NOT use this for: plain Kubernetes manifests (use kubernetes-patterns),
  CI pipeline design, or monorepo tooling.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [devops, gitops, argocd, flux, phase-5]
---

# GitOps

## Purpose
Manage Kubernetes deployments using Git as the single source of truth with ArgoCD or Flux. Covers repository structure, application definitions, sync policies, environment promotion, drift detection, and secret management.

## Framework and Methodology

### GitOps Principles
1. Declarative Description: The entire system is described declaratively.
2. Version Controlled and Immutable: The desired state is stored in Git.
3. Automatically Applied: Software agents pull changes from Git.
4. Continuously Reconciled: Agents correct drift between desired and actual state.

### Reconciliation Loop
```
Git (desired state) -> GitOps Controller watches repo
  -> Compares with cluster state
  -> Detects drift (manual change or config divergence)
  -> Applies desired state to cluster
  -> Reports sync status
  -> Loops continuously (default every 3-5 minutes)
```

### Pull vs Push Model
Pull-based (GitOps native): Agent in cluster pulls from Git. Cluster initiates all changes. No external access to cluster API needed. More secure.

Push-based (CI/CD traditional): CI system pushes to cluster. Cluster API exposed to CI system. Higher blast radius (CI compromise = cluster compromise).

Recommendation: Always use pull-based for production.

## Agent Protocol

### Trigger
Exact user phrases: "GitOps", "ArgoCD", "Flux", "Git as source of truth", "sync policy", "drift detection", "Application CRD", "sync waves".

### Input Context
- GitOps tool (ArgoCD vs Flux).
- Cluster access (kubeconfig, OIDC, AWS EKS).
- Deployment structure (monorepo vs multi-repo, Kustomize vs Helm).
- Environment promotion model (staging to prod).

### Output Artifact
Application CRDs, Flux Kustomization/HelmRelease YAMLs, sync policies, directory structure.

### Response Format
YAML manifests with no extraneous explanation.

No preamble. No postamble. No explanations.

### Completion Criteria
- GitOps tool configured (ArgoCD Application or Flux Kustomization).
- Sync policy defined (auto-sync with prune, self-heal).
- Source repository and path configured.
- Destination cluster and namespace set.
- Drift detection and remediation configured.

## Architecture / Decision Trees

### Tool Selection: ArgoCD vs Flux

| Feature | ArgoCD | Flux |
|---|---|---|
| Reconciliation | Every 3 min (default) | Configurable interval |
| UI | Rich web UI, SSO | CLI-only (no GUI) |
| Sync Waves | Annotations | depends-on |
| Rollback | One-click via UI | git revert |
| Multi-cluster | ApplicationSet CRD | Kustomization per cluster |
| Secret encryption | SOPS plugin | SOPS native |
| Blue/green, canary | AnalysisTemplate + Argo Rollouts | None (requires Flagger) |
| SSO | Built-in (OIDC, Dex, GitHub, GitLab) | Dex/External |
| RBAC | Project-level, fine-grained | K8s RBAC |
| Weight | Medium (CRD-heavy) | Lightweight |
| Community | Large, CNCF graduated | Large, CNCF graduated |
| Learning curve | Moderate | Lower |

### Repository Structure Decision Tree
- Monorepo (single repo for all environments): Recommended for most teams.
  - base/ (common config shared across environments)
  - overlays/dev/, overlays/staging/, overlays/prod/ (env-specific)
- Multi-repo (separate repo per environment): Stronger isolation, more management overhead.
  - infra-dev/, infra-prod/
- App config + app source in same repo: Simple, but couples CI/CD.
- App config separate from app source: Recommended. GitOps repo only has deployment config.

### Environment Promotion Strategy

| Method | Description | Best For |
|---|---|---|
| Branch per env | dev branch = dev cluster, main = prod | Simple, clear separation |
| Path per env | Single branch, overlays/dev = dev cluster | Kustomize native |
| Tag-based | Git tag triggers promotion to next env | Release engineering |
| PR-based | PR merges promote between environments | Review-driven |

### Secret Management Decision Tree
- External Secrets Operator + cloud provider (AWS Secrets Manager, GCP Secret Manager): Best for cloud-native, syncs secrets automatically.
- SealedSecrets: Encrypt secrets in Git, decrypt at cluster. Good for offline GitOps.
- SOPS: Encrypt individual fields in YAML. Works with ArgoCD and Flux. Flexible but manual.
- Vault (HashiCorp): Full secret management, dynamic secrets, rotation. Complex setup.

## Core Workflow

### Step 1: Repository Structure (Kustomize)
```
infra-repo/
  base/
    kustomization.yaml
    deployment.yaml
    service.yaml
    ingress.yaml
    configmap.yaml
  overlays/
    dev/
      kustomization.yaml
      deployment-patch.yaml
      configmap-dev.yaml
    staging/
      kustomization.yaml
      deployment-patch.yaml
      configmap-staging.yaml
    prod/
      kustomization.yaml
      deployment-patch.yaml
      configmap-prod.yaml
      hpa.yaml
```

### Step 2: ArgoCD Application
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-dev
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/org/infra.git
    targetRevision: main
    path: overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app-dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - PruneLast=true
      - ApplyOutOfSyncOnly=true
      - RespectIgnoreDifferences=true
      - ServerSideApply=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
    - group: autoscaling
      kind: HorizontalPodAutoscaler
      jsonPointers:
        - /spec/metrics
```

### Step 3: Flux Kustomization
```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/org/infra.git
  ref:
    branch: main
  ignore: |
    .github/
    .gitignore
    *.md
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-dev
  namespace: flux-system
spec:
  interval: 5m
  path: ./overlays/dev
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-app
  wait: true
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: my-app-dev
  postBuild:
    substitute:
      env: dev
      image_tag: latest
    substituteFrom:
      - kind: ConfigMap
        name: cluster-vars
  dependsOn:
    - name: infrastructure
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-prod
  namespace: flux-system
spec:
  interval: 5m
  path: ./overlays/prod
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-app
  dependsOn:
    - name: my-app-dev
  decryption:
    provider: sops
    secretRef:
      name: sops-gpg
```

### Step 4: Sync Waves (ArgoCD)
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-app
  annotations:
    argocd.argoproj.io/sync-wave: "-5"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: my-app
  annotations:
    argocd.argoproj.io/sync-wave: "-3"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: my-app
  annotations:
    argocd.argoproj.io/sync-wave: "-2"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
  annotations:
    argocd.argoproj.io/sync-wave: "0"
---
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: my-app
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

### Step 5: External Secrets
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: my-app
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: my-app-sa
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: my-app
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: /prod/my-app/db-password
    - secretKey: API_KEY
      remoteRef:
        key: /prod/my-app/api-key
```

### Step 6: ArgoCD ApplicationSet (Multi-Cluster)
```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            environment: dev
  template:
    metadata:
      name: 'my-app-{{name}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/org/infra.git
        targetRevision: main
        path: 'overlays/{{metadata.labels.environment}}'
      destination:
        server: '{{server}}'
        namespace: 'my-app-{{metadata.labels.environment}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

### Step 7: Kustomize Overlays
```yaml
# overlays/prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: my-app-prod

bases:
  - ../../base

patchesStrategicMerge:
  - deployment-patch.yaml
  - hpa.yaml

configMapGenerator:
  - name: app-config
    behavior: merge
    literals:
      - NODE_ENV=production
      - LOG_LEVEL=info
      - API_URL=https://api.example.com

images:
  - name: my-app
    newTag: v1.2.3

replicas:
  - name: my-app
    count: 5

commonLabels:
  environment: production
  team: backend
```

## Anti-Patterns

### Anti-Pattern 1: Direct Cluster Changes
Someone runs kubectl edit and changes drift. Self-heal reverts it without warning, confusing the team. Always change in Git. Educate team that Git is the single source of truth.

### Anti-Pattern 2: Plain-Text Secrets in Git
Anyone with repo access sees production secrets. Secrets in Git are visible in commit history forever. Use SealedSecrets, External Secrets Operator, or SOPS.

### Anti-Pattern 3: Missing Prune:true
Resources removed from Git stay in the cluster because prune is disabled. Orphaned resources accumulate and drift grows. Enable prune on all sync policies.

### Anti-Pattern 4: Self-Heal Without Communication
Self-heal silently reverts manual changes without notifying anyone. Monitor sync status and alert on out-of-sync states. Document self-heal behavior in team runbook.

### Anti-Pattern 5: Overly Complex Directory Structure
Too many Kustomize layers make changes error-prone and hard to reason about. Keep base simple. Use overlays per environment. Avoid deep nesting.

### Anti-Pattern 6: No Sync Wave Ordering
Deployments start before ConfigMaps exist, causing application startup failures. Use sync-wave annotations (ArgoCD) or depends-on (Flux) for resource ordering.

### Anti-Pattern 7: No Drift Monitoring
Self-heal silently reverts changes without notification, masking operational issues. Monitor sync status and alert on OutOfSync state or SyncFailed.

### Anti-Pattern 8: Using :latest as Tag
No traceability of what version is deployed. Rollback is impossible. Pin to specific branch, tag, or commit hash. Use semantic versioning for releases.

## Production Considerations

### Security
- Never store raw secrets in Git -- use SealedSecrets, External Secrets, or SOPS.
- Use network policies to restrict pod-to-pod communication.
- Enable audit logging on GitOps controller.
- Use RBAC to restrict who can modify GitOps Application CRDs.
- Enable branch protection on GitOps repo (require PRs to main).
- Use signed commits for GitOps repo changes.

### Monitoring and Alerts
- Monitor sync status: alert on OutOfSync and SyncFailed states.
- Monitor sync duration: alert if sync takes longer than 5 minutes.
- Track reconciliation loop health.
- Set up Slack/PagerDuty alerts for sync failures.
- Review sync logs for errors.

### Disaster Recovery
1. Git repo has full history -- revert commit to roll back.
2. Recreate cluster from scratch by applying GitOps config to new cluster.
3. Back up ArgoCD/Flux controller state.
4. Document recovery procedure and test quarterly.

## Rules
- Never apply changes directly to the cluster -- always push to Git first.
- Always enable prune:true in automated sync policies.
- Use selfHeal:true to remediate drift automatically.
- Pin targetRevision to a branch, tag, or commit -- never omit it.
- Every environment gets its own overlay or directory.
- Use sync waves / depends-on to order resource creation.
- Store secrets in SealedSecrets, External Secrets, or SOPS -- never plain text.
- Monitor sync status and alert on OutOfSync or SyncFailed.
- Use branch protection on GitOps repo.
- Apply GitOps config to staging before production.
- Document rollback procedure (revert Git commit).
- Use ApplicationSet (ArgoCD) or multi-Kustomization (Flux) for multi-cluster.
- Never use :latest as image tag -- pin to specific version.
- Validate Kustomize/Helm output in CI before merging.

## Compared With

### ArgoCD vs Flux vs Helm-only vs kubectl apply
ArgoCD: reconciliation, drift detection, UI, sync waves, SSO, heavyweight. Flux: reconciliation, lightweight, SOPS native, depends-on, lighter. Helm-only: no reconciliation or drift detection, good for simple deployments. kubectl apply: manual, no reconciliation, not recommended for production.

### GitOps vs Traditional CI/CD Push
GitOps (pull-based): agent in cluster pulls desired state from Git. No cluster API exposed to CI. Lower blast radius. Traditional (push-based): CI pushes directly to cluster. Cluster API must be accessible from CI. Higher risk if CI is compromised.

## References
- references/argocd-setup.md -- ArgoCD Setup
- references/flux-setup.md -- Flux Setup
- references/gitops-advanced.md -- Gitops Advanced Topics
- references/gitops-fundamentals.md -- Gitops Fundamentals
- references/gitops-principles.md -- GitOps Principles
- references/sync-strategies.md -- Sync Strategies
- references/gitops-workflow-environments.md -- GitOps Workflow Environments
- references/gitops-security-compliance.md -- GitOps Security and Compliance

## Handoff
After completing this skill:
- Next skill: kubernetes-patterns -- pod specs, services, ingress
- Pass context: Git repo URL, overlay paths, environment structure

## Architecture Decision Trees

### Push-based vs Pull-based Deployments

| Decision | Push-based (CI/CD pushes) | Pull-based (ArgoCD/Flux) |
|---|---|---|
| Trigger | CI pipeline completion | Git repo change (commit) |
| Drift detection | Manual or CI-scheduled | Continuous reconciliation |
| Network model | CI → Cluster API | Cluster pulls from Git |
| Secret handling | CI secrets injected | Sealed secrets, SOPS, ESO |
| RBAC | CI service account | Cluster-local controller |
| Best for | Simple, single-env | Multi-env, compliance-heavy |

### Single Repo vs Config Repo per Environment

| Aspect | Single Repo | Per-Environment Repos |
|---|---|---|
| Atomicity | One commit for all envs | Multiple commits/PRs |
| Promotion | Branch/tag promotion | Cross-repo promotion |
| Auditing | Per-path | Per-repo |
| Complexity | Simple | Higher (sync between repos) |
| Access control | Same access to all envs | Isolated per environment |
| Rollback | Revert commit | Revert per-env commit |

## Implementation Patterns

### YAML: ArgoCD Application with Sync Policy

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/acme/config.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - PruneLast=true
      - ApplyOutOfSyncOnly=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

### YAML: Flux Kustomization with Health Checks

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-config
  namespace: flux-system
spec:
  interval: 5m
  path: ./overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: config-repo
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: app
      namespace: production
  postBuild:
    substitute:
      environment: production
      region: us-east-1
    substituteFrom:
      - kind: ConfigMap
        name: cluster-vars
  dependsOn:
    - name: cluster-infra
```

### Bash: Sync Gate for GitOps Promotion

```bash
#!/usr/bin/env bash
promote_overlay() {
  local from_env=$1
  local to_env=$2

  git checkout -b "promote-$to_env-$(date +%s)"

  # Copy overlay config from source to target environment
  rsync -av "overlays/$from_env/" "overlays/$to_env/"
  find "overlays/$to_env/" -name "kustomization.yaml" -exec \
    sed -i "s/namespace: $from_env/namespace: $to_env/g" {} \;

  git add overlays/
  git commit -m "promote: $from_env → $to_env"
  git push origin HEAD

  # Create PR with labels
  gh pr create \
    --base main \
    --title "Promote $from_env → $to_env" \
    --label gitops,promotion \
    --body "Promoting configurations from $from_env to $to_env"
}
```

## Production Considerations

- Enable **automated sync with prune** — ensures Git is the single source of truth
- Implement **promotion gates** between environments using PR approvals and CI checks
- Use **SealedSecrets / SOPS / External Secrets Operator** — never store plaintext secrets in Git
- Configure **health checks** on sync operations to validate app readiness before completing sync
- Set **sync wave dependencies** for ordered resource creation (CRDs before CRs, namespaces first)
- Enable **notifications** (ArgoCD Notifications, Flux Alert) for sync failures and health degradation
- Use **Kustomize overlays** or **Helm values** per environment to avoid configuration duplication

## Anti-Patterns

- Storing **secrets in plaintext** in the Git repo — always encrypt with SOPS or use external secrets
- Running **manual kubectl apply** outside GitOps — creates drift that auto-sync will overwrite
- Using **monolithic Application** for everything — split by service for independent sync cycles
- Ignoring **sync wave ordering** — resources created in wrong order cause reconciliation failures
- Applying **ArgoCD/Flux** without backup recovery plan — if cluster dies, GitOps config is useless
- Setting **auto-sync with prune** on namespaces that contain unmanaged resources — data loss risk
- Overusing **`ignoreDifferences`** — masks real configuration drift and hides problems

## Performance Optimization

- Set **sync interval** appropriately (5m for apps, 15m for infra) — too frequent causes API pressure
- Use **ArgoCD ApplicationSet** with matrix generators to reduce Application CR count
- Configure **resource exclusion** in ArgoCD — ignore cluster-scoped resources managed by other teams
- Enable **Flux sharding** for large clusters to distribute reconciliation across multiple controllers
- Limit **sync history** — ArgoCD retains all sync results; prune old entries with cleanup cronjob
- Use **OCI Helm repositories** with Flux instead of Git-based HelmRelease for faster chart pulls
- Optimize **Kustomize build** time — avoid excessive remote bases that add network latency

## Security Considerations

- Restrict **ArgoCD/Flux API server** access with NetworkPolicy and OIDC SSO
- Use **GitHub/GitLab deploy keys** with read-only access for the GitOps controller
- Enable **webhook validation** to reject commits with unencrypted secrets or policy violations
- Audit **sync events** centrally — who triggered what sync and what changed in the cluster
- Set **RBAC** on ArgoCD projects to isolate teams to their namespaces
- Limit **ArgoCD projects** `sourceNamespaces` to prevent cross-team resource access
- Sign **Git commits** with GPG and enforce commit signing in the Git provider for traceability
