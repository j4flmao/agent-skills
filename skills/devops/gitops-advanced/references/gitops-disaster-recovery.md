# GitOps Advanced: Disaster Recovery

## Overview

GitOps provides a natural foundation for disaster recovery because the desired state is always recorded in a Git repository. When a cluster fails, the same Git repository that described the original state can recreate it. However, effective disaster recovery with GitOps requires more than just re-applying manifests — it demands careful architecture around stateful data, secrets, cluster-specific configuration, and recovery ordering. This reference provides deep architecture for disaster recovery strategies built on GitOps principles.

## Core Architecture Concepts

### GitOps Recovery Model

The fundamental recovery model for GitOps is based on state immutability and declarative reconciliation:

`
Primary Cluster Failure
    ↓
1. Assess: Is Git repository intact? (Source of Truth)
2. Bootstrap: Provision new cluster
3. Reconcile: ArgoCD/Flux synchronizes from Git
4. Restore: Recover stateful data (databases, volumes)
5. Validate: Verify all applications healthy
6. Switch: Update DNS/load balancer to new cluster
`

### Git as the Recovery Backbone

In a GitOps disaster recovery scenario, Git serves multiple critical functions:

| Git Function | Recovery Role | Requirements |
|-------------|---------------|--------------|
| Desired state | Cluster manifests, application configs | Multi-region Git replication |
| Configuration | Environment-specific values, secrets encrypted | Sealed secrets, SOPS, external-secrets |
| Cluster definition | Cluster API manifests, node configuration | Git-based cluster provisioning |
| Policy definitions | OPA/Kyverno policies for post-recovery validation | Policy-as-code in same repo |
| Infrastructure | Terraform/Crossplane manifests | Infrastructure-as-code co-located |
| Documentation | Runbooks, recovery procedures | Accessible even when cluster is down |

### Decision Tree: Recovery Strategy

`
Recovery Strategy Selection
├── Same region, new cluster → Full GitOps sync + data restore from backup
├── Different region, active-passive → Warm standby cluster, pre-synced
├── Different region, active-active → Multi-cluster GitOps, instant failover
├── Multi-cloud → Cloud-agnostic manifests, cloud-specific overlays
└── On-prem to cloud → Different infrastructure provider, config adapters needed
`

## Architecture Decision Trees

### Stateful Data Recovery

`
Database Recovery Strategy
├── Managed cloud database (RDS, Cloud SQL)
│   ├── Automated cross-region snapshot → Point-in-time recovery
│   └── Replica promotion → Read replica becomes primary
├── Self-managed Kubernetes database (operator-managed)
│   ├── Backup via operator → Restore from backup in new cluster
│   └── Cross-region replication → Failover with async replication
└── External database (not in K8s)
    └── DNS update to reconnect → Application connects to new DB endpoint
`

### Secret Recovery

`
Secret Restoration Strategy
├── External Secrets Operator → Secrets pulled from vault after cluster recreation
├── Sealed Secrets → Encrypted secrets in Git, decrypted by controller in new cluster
├── SOPS + Flux → Age/GPG encrypted secrets, decrypted during sync
├── Vault CSI Provider → Secrets mounted from Vault, no Git storage
└── Cloud secret manager → AWS Secrets Manager, GCP Secret Manager via provider
`

### Network Recovery

`
Cluster Network Recovery
├── Load balancer recreation → DNS failover to new LB (cloud LB or MetalLB)
├── Service mesh recovery → Istio control plane rebuilding, mTLS re-establishment
├── Ingress reconfiguration → New ingress controller, TLS certificate reprovisioning
├── Network policy restoration → Git-managed policies re-applied during sync
└── Multi-cluster connectivity → ClusterMesh, Skupper, or Submariner re-peering
`

## Implementation Strategies

### Warm Standby Cluster with GitOps

A warm standby cluster maintains current state by continuously syncing from the same Git repository but receives no production traffic:

`yaml
# ArgoCD ApplicationSet for warm standby
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: cluster-apps
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            cluster-role: active
  template:
    metadata:
      name: '{{name}}-apps'
    spec:
      source:
        repoURL: https://github.com/team/gitops-config
        targetRevision: main
      destination:
        server: '{{server}}'
        namespace: '{{name}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
---
# Standby cluster sync policy
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: standby-apps
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            cluster-role: standby
  template:
    metadata:
      name: '{{name}}-standby'
    spec:
      source:
        repoURL: https://github.com/team/gitops-config
        targetRevision: main
      destination:
        server: '{{server}}'
        namespace: '{{name}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        # Standby syncs but resources may be scaled down
        managedNamespaceMetadata:
          labels:
            failover-ready: "true"
`

### Recovery Procedure Automation

Automated recovery procedures executed via ArgoCD Workflow or Tekton:

`yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  name: cluster-recovery
spec:
  entrypoint: recover
  templates:
    - name: recover
      steps:
        - - name: validate-git
            template: validate-git-source
        - - name: provision-cluster
            template: provision-cluster
        - - name: bootstrap-gitops
            template: bootstrap-argocd
        - - name: sync-apps
            template: sync-applications
        - - name: restore-data
            template: restore-stateful-data
        - - name: validate-recovery
            template: validate-cluster-health
        - - name: switch-traffic
            template: update-dns-failover

    - name: validate-git-source
      container:
        image: alpine/git
        command: [sh, -c]
        args:
          - |
            git clone https://github.com/team/gitops-config /tmp/config
            cd /tmp/config
            git verify-commit HEAD
            echo "Git repository verified"

    - name: provision-cluster
      container:
        image: hashicorp/terraform
        command: [sh, -c]
        args:
          - |
            cd /infra/clusters/new-region
            terraform init
            terraform apply -auto-approve
            echo "Cluster provisioned: "

    - name: bootstrap-argocd
      container:
        image: bitnami/kubectl
        command: [sh, -c]
        args:
          - |
            kubectl create namespace argocd
            kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
            kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd
            echo "ArgoCD bootstrapped"

    - name: sync-applications
      container:
        image: argoproj/argocd
        command: [sh, -c]
        args:
          - |
            argocd login --core
            argocd app sync -l app.kubernetes.io/part-of=production --prune
            argocd app wait -l app.kubernetes.io/part-of=production --health
            echo "All applications synced"

    - name: restore-stateful-data
      container:
        image: velero/velero
        command: [sh, -c]
        args:
          - |
            velero restore create --from-backup production-latest
            velero restore describe production-latest
            echo "Data restored"

    - name: validate-cluster-health
      container:
        image: bitnami/kubectl
        command: [sh, -c]
        args:
          - |
            # Validate cluster health
            kubectl get nodes
            kubectl get pods -A --field-selector status.phase!=Running
            # Validate application health
            kubectl get applications.argoproj.io -A
            echo "Cluster health validated"

    - name: update-dns-failover
      container:
        image: hashicorp/terraform
        command: [sh, -c]
        args:
          - |
            cd /infra/dns
            terraform init
            terraform apply -auto-approve -var="target_cluster=new-region"
            echo "DNS updated to new cluster"
`

## Integration Patterns

### Backup Integration with Velero

Velero backups capture Kubernetes resources and persistent volumes. GitOps provides the resource definitions; Velero provides the data snapshots:

`yaml
# Velero backup schedule for GitOps-managed cluster
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    includedNamespaces:
      - production
      - staging
    excludedResources:
      - events
      - nodes
    ttl: 720h  # 30 days
    storageLocation: s3-backups
    volumeSnapshotLocations:
      - aws-ebs-snapshots
    hooks:
      resources:
        - name: quiesce-database
          label:
            app.kubernetes.io/component: database
          pre:
            - exec:
                container: database
                command:
                  - pg_dumpall
                  - -f
                  - /tmp/backup.sql
          post:
            - exec:
                container: database
                command:
                  - rm
                  - /tmp/backup.sql
`

### Stateful Workload Recovery

Stateful workloads require coordinated recovery between GitOps (resource definitions) and backup tools (data):

1. GitOps syncs first: Deployments, Services, PVC templates, and ConfigMaps are created from Git
2. Data restoration: Velero or similar restores PV data into the new PVCs
3. Operator reconciliation: Database operators detect empty volumes and restore from backup
4. Application validation: Health checks verify data consistency

## Security Considerations

### Git Repository Security for DR

The Git repository is the single most critical asset for disaster recovery. If the repository is unavailable or compromised, recovery may be impossible:

- Multi-region Git replication: Mirror repositories in at least two geographic regions
- Offline backup: Daily Git backup to cold storage (S3 Glacier, tape)
- Repository signing: All commits signed, verified during recovery
- Access control: Emergency read-only access for DR team, separate from daily credentials
- Audit trail: All repository access logged for security review

### Secret Recovery Security

During disaster recovery, secret management must be re-established before applications can start:

| Secret Type | Recovery Method | Security Consideration |
|-------------|----------------|------------------------|
| TLS certificates | cert-manager + Let's Encrypt | Rate limits on certificate issuance |
| Database passwords | External Secrets + Vault | Vault must be available before apps |
| API keys | Sealed Secrets in Git | Sealed secret encryption key must be backed up |
| Service account tokens | Kubernetes native | Token controller auto-generates on pod start |
| Cloud credentials | Workload Identity / IRSA | Cloud IAM must be configured in new cluster |

## Operational Excellence

### DR Testing with GitOps

Regular testing ensures the recovery procedure works:

| Test Type | Frequency | Method |
|-----------|-----------|--------|
| Cluster recreation | Quarterly | Create new cluster from GitOps config, measure time-to-healthy |
| Data restore | Monthly | Restore from backup to isolated environment, validate data |
| Secret rehydration | Monthly | Simulate vault outage, verify secrets recoverable |
| DNS failover | Bi-annually | Switch traffic to DR cluster, measure propagation |
| Full DR exercise | Annually | Complete failover, run on DR for 48+ hours, fail back |

### DR Runbook Structure

Each GitOps-managed cluster should have a DR runbook in the same repository as the cluster config:

`
clusters/
├── production-us-east/
│   ├── cluster-config.yaml
│   ├── apps/
│   ├── infrastructure/
│   └── dr/
│       ├── runbook.md          # Step-by-step recovery procedure
│       ├── recovery-order.yaml # Resource sync ordering
│       ├── contacts.yaml       # Emergency contacts
│       └── validation-tests.sh # Post-recovery validation script
`

## Testing Strategy

### DR Validation Testing

| Test | Expected Behavior | Failure Scenario |
|------|------------------|------------------|
| Cluster loss | New cluster synced and healthy within SLA | Git repo unreachable |
| Region outage | Traffic fails over to secondary region | DNS propagation delay |
| Data corruption | Application reverts to last good state from backup | Backup corrupted |
| Secret loss | Secrets recreated from Sealed Secrets/Vault | Encryption key lost |
| Git repo compromise | Recovery blocked, manual intervention required | Signing keys compromised |
| Operator loss | Operator re-installed and reconciling | Operator-specific backup required |
| Network policy loss | Policies re-applied, isolation restored | Policy conflicts |

## Common Pitfalls

| Pitfall | Impact | Prevention |
|---------|--------|------------|
| Assuming Git repo is always available | DR fails when Git is also unavailable | Multi-region Git mirror, offline backup |
| Ignoring stateful data | Applications start but data is lost | Velero or operator-managed backups |
| Hardcoded cluster-specific values | Manifests fail for new cluster | Cluster overlays, parameterization |
| Secret bootstrap ordering | Secrets required before applications start | Dependency ordering in sync waves |
| DNS TTL too high | Traffic continues to failed cluster | Low TTL during DR window |
| Untested recovery procedure | Recovery fails under real pressure | Quarterly DR testing |
| Missing operator backup | Operators cannot be reinstalled | Operator versions pinned in Git |
| Load balancer recreation delay | Applications running but unreachable | Pre-create LB DNS entries |
| Certificate rate limiting | TLS cert issuance blocked | Pre-provision wildcard certs |
| Monitoring gap during DR | No visibility into recovery progress | DR-specific dashboards and alerts |

## Key Takeaways

- Git is the source of truth for disaster recovery; its availability and integrity are the highest priority for DR readiness
- Stateful data recovery is the hardest problem — GitOps handles stateless workloads trivially, but databases require backup tooling integration
- Secrets must be recoverable without the original cluster; use external secrets management or encrypted secrets in Git
- Warm standby clusters pre-synced from Git reduce recovery time from hours to minutes
- Cluster-specific configuration (node IPs, DNS names, storage classes) requires parameterization through overlays or Kustomize
- DR procedures must be automated through workflows and tested regularly — manual procedures fail under pressure
- Recovery ordering matters: infrastructure first, then operators, then applications, then data restore
- The Git repository itself needs disaster recovery planning — mirror it across regions and back it up offline
- DNS failover is often the bottleneck; plan for propagation delay and use low TTLs during failover
- Post-recovery validation must verify not just that applications are running, but that data is consistent and correct
- DR testing should be a scheduled, automated exercise, not an annual fire drill
- The best DR strategy minimizes the difference between normal operations and recovery — GitOps naturally provides this alignment
