# Advanced GitOps Operations: Progressive Delivery, Promotion Pipelines, Diffing and Controller Scaling

Topics for running GitOps at scale that are not covered by the sibling references (ApplicationSets, sync phases/hooks, multi-cluster, secrets, DR, security hardening, Image Updater): progressive delivery under GitOps, multi-stage promotion tooling, diff customization, Argo CD controller scaling and operational guardrails.

## Progressive Delivery with Argo Rollouts

Git declares the desired version; Argo Rollouts controls how traffic moves to it.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata: {name: payments}
spec:
  replicas: 10
  selector: {matchLabels: {app: payments}}
  template:
    metadata: {labels: {app: payments}}
    spec:
      containers:
      - name: app
        image: registry.example.com/payments@sha256:4b1c...
  strategy:
    canary:
      canaryService: payments-canary
      stableService: payments-stable
      trafficRouting:
        nginx: {stableIngress: payments}
      steps:
      - setWeight: 10
      - analysis:
          templates: [{templateName: success-rate}]
      - setWeight: 50
      - pause: {duration: 10m}
      - setWeight: 100
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata: {name: success-rate}
spec:
  metrics:
  - name: success-rate
    interval: 1m
    count: 5
    successCondition: result[0] >= 0.99
    failureLimit: 1
    provider:
      prometheus:
        address: http://prometheus.monitoring:9090
        query: |
          sum(rate(http_requests_total{app="payments",role="canary",code!~"5.."}[2m]))
          / sum(rate(http_requests_total{app="payments",role="canary"}[2m]))
```

GitOps interplay:
- An aborted rollout leaves Git declaring the new version while the cluster runs stable; Argo CD shows the Rollout as `Degraded`. Resolve by reverting the commit (or fixing forward), not by manual edits.
- Flux users use Flagger for the same pattern.

## Multi-Stage Promotion Pipelines

| Approach | Description |
|---|---|
| PR-based (Renovate/bots/CI) | Each stage is a commit to that environment's directory; approvals via code review |
| Kargo | Declarative stages and promotion of "freight" (image + chart + config versions) across environments, with verification steps |
| Flux image automation | Image policies update tags in Git per environment |
| Argo CD Image Updater | Writes back image updates to Git or Application parameters |

Promotion rules: promote the exact artifact digests verified in the previous stage; gate prod with automated checks (Rollouts analysis, smoke tests) plus approval; record promotion metadata in commit messages.

## Diff Customization

Fields mutated by controllers or webhooks cause permanent `OutOfSync`. Prefer narrow ignores:

```yaml
spec:
  ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers: [/spec/replicas]              # HPA owns replicas
  - group: admissionregistration.k8s.io
    kind: MutatingWebhookConfiguration
    jqPathExpressions: ['.webhooks[]?.clientConfig.caBundle']
  syncPolicy:
    syncOptions:
    - RespectIgnoreDifferences=true             # also skip these fields during sync
```

System-wide equivalents go in `argocd-cm` (`resource.customizations.ignoreDifferences.<group_kind>`). With server-side apply and `managedFieldsManagers`, Argo CD can ignore fields owned by specific managers.

Server-side diff (`argocd.argoproj.io/compare-options: ServerSideDiff=true`) computes diffs via dry-run apply on the API server, matching admission/defaulting behavior more closely.

## Resource Tracking

Argo CD 3.0 changed the default resource tracking method from label to annotation (`argocd.argoproj.io/tracking-id`), avoiding label length limits and conflicts with other tools. When upgrading from 2.x, review the upgrade notes: the tracking method change and RBAC changes (e.g. fine-grained `update`/`delete` permissions no longer implicitly covering an Application's managed resources) can alter behavior.

## Scaling Argo CD

| Component | Lever |
|---|---|
| application-controller | Shard by cluster: `controller.sharding.algorithm` (`legacy`, `round-robin`, `consistent-hashing`), replicas via StatefulSet; tune `controller.status.processors` and `controller.operation.processors` |
| repo-server | More replicas; `reposerver.parallelism.limit`; cache manifests (Redis); avoid heavy Helm/Kustomize plugins per render |
| Reconciliation | `timeout.reconciliation` (default 180 s polling) plus Git webhooks for immediate refresh |
| Large monorepos | Manifest-generate-paths annotation (`argocd.argoproj.io/manifest-generate-paths`) so a commit only refreshes affected apps |
| Redis | HA Redis for large installations |

Monitor `argocd_app_reconcile` duration, `argocd_app_sync_total` by phase, repo-server `argocd_git_request_duration_seconds`, and workqueue depth.

## Operational Guardrails

- Sync windows (AppProject `syncWindows`) to block automated syncs during freezes; allow manual override for incidents.
- Prune protection: `argocd.argoproj.io/sync-options: Prune=false` on critical resources (PVCs, namespaces with data); `Delete=false` to keep resources when an Application is removed.
- Orphaned resource monitoring per AppProject to detect unmanaged objects.
- Notifications (Argo CD Notifications) on sync failure, degraded health, and drift.
- Policy checks in CI (kubeconform, Kyverno CLI/Conftest) before merge, not only at admission.

## Break-Glass Procedure

1. Disable auto-sync for the affected Application (`argocd app set <app> --sync-policy none`) or use a sync window.
2. Apply the emergency change in the cluster; record it.
3. Commit the same change to Git; re-enable auto-sync; verify `Synced`.

Self-heal will otherwise revert the emergency change within minutes.

## Pitfalls
- Broad `ignoreDifferences` (whole `spec`) hiding real drift.
- Manual rollback in the cluster while Git still declares the bad version.
- Single application-controller managing hundreds of clusters without sharding.
- Promotion by rebuilding images per environment instead of promoting digests.
- Upgrading Argo CD major versions without reading tracking/RBAC change notes.

## Checklist
- [ ] Progressive delivery with automated analysis for critical services
- [ ] Promotion pipeline moves verified digests with approvals for prod
- [ ] Narrow, documented `ignoreDifferences`; server-side diff where useful
- [ ] Controller sharding and repo-server scaling sized to fleet
- [ ] Sync windows, prune protection and notifications configured
- [ ] Break-glass procedure documented and practiced
