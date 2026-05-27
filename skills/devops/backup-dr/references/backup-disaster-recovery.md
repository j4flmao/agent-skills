# Backup and Disaster Recovery

## Backup Strategies

```yaml
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
    includedResources:
      - '*'
    excludedResources:
      - events
      - events.events.k8s.io
    ttl: 720h
    storageLocation: default
    volumeSnapshotLocations:
      - default
    defaultVolumesToRestic: true
  useOwnerReferencesInBackup: true
```

## Manual Backup

```yaml
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: pre-upgrade-backup
  namespace: velero
spec:
  includedNamespaces:
    - production
  labelSelector:
    matchLabels:
      app: critical-service
  storageLocation: default
  volumeSnapshotLocations:
    - default
  ttl: 720h
  hooks:
    resources:
      - name: quiesce-db
        label:
          matchLabels:
            app: postgres
        pre:
          - exec:
              container: postgres
              command:
                - pg_dumpall
                - -U
                - postgres
              onError: Fail
              timeout: 60s
        post:
          - exec:
              container: postgres
              command:
                - psql
                - -U
                - postgres
                - -c
                - "SELECT pg_wal_replay_resume()"
              onError: Fail
              timeout: 30s
```

## Disaster Recovery Workflow

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: disaster-recovery
spec:
  destination:
    namespace: dr
    server: https://dr-cluster.example.com
  project: dr
  source:
    path: kubernetes/overlays/dr
    repoURL: https://github.com/org/infrastructure.git
    targetRevision: dr-config
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: dr-plan
  namespace: velero
data:
  rto: "4h"
  rpo: "24h"
  regions:
    primary: us-east-1
    secondary: us-west-2
  failover_steps: |
    1. Promote secondary DNS records
    2. Restore latest Velero backup
    3. Validate data integrity
    4. Switch traffic to DR cluster
    5. Run health checks
    6. Notify stakeholders
```

## Key Points

- Schedule automated backups with appropriate retention
- Use Velero for Kubernetes backup and restore
- Implement backup hooks for database consistency
- Test restore procedures regularly
- Define RTO and RPO for all services
- Store backups in separate geographic region
- Use encrypted storage for backup data
- Implement cross-region replication
- Automate failover and failback procedures
- Document DR runbook with step-by-step instructions
- Conduct annual DR drills with stakeholders
- Monitor backup success rates and storage usage
