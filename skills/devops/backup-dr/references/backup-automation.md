# Backup Automation

## Velero Installation

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cloud-credentials
  namespace: velero
data:
  cloud: <base64-encoded-credentials>

---
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: default
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: backups-prod
    prefix: velero
  config:
    region: us-east-1
    s3ForcePathStyle: "false"
    s3Url: https://s3.amazonaws.com

---
apiVersion: velero.io/v1
kind: VolumeSnapshotLocation
metadata:
  name: default
  namespace: velero
spec:
  provider: aws
  config:
    region: us-east-1
```

## Backup Validation

```python
import subprocess
import json
from datetime import datetime, timedelta

def list_backups(namespace: str = "velero") -> list:
    """List all Velero backups."""
    result = subprocess.run(
        ["velero", "get", "backup", "-o", "json"],
        capture_output=True, text=True
    )
    backups = json.loads(result.stdout)
    return [
        {
            "name": b["metadata"]["name"],
            "status": b["status"].get("phase"),
            "created": b["status"].get("startTimestamp"),
            "expires": b["status"].get("expiration"),
        }
        for b in backups["items"]
    ]

def validate_recent_backup(namespace: str = "velero", max_age_hours: int = 24) -> bool:
    """Validate that a recent successful backup exists."""
    backups = list_backups(namespace)
    cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)

    recent_valid = [
        b for b in backups
        if b["status"] == "Completed"
        and datetime.fromisoformat(b["created"].replace("Z", "+00:00")) > cutoff
    ]

    return len(recent_valid) > 0
```

## Restore Testing

```yaml
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: dr-test-restore
  namespace: velero
spec:
  backupName: pre-upgrade-backup
  restorePVs: true
  namespaceMapping:
    production: production-dr-test
  labelSelector:
    matchLabels:
      app: critical-service
  restoreStatus:
    includedResources:
      - pods
      - services
      - deployments
  hooks:
    resources:
      - name: validate-service
        label:
          matchLabels:
            app: critical-service
        post:
          - exec:
              container: app
              command:
                - curl
                - -f
                - http://localhost:8080/health
              timeout: 10s
```

## Key Points

- Install Velero with cloud provider credentials
- Configure BackupStorageLocation for each provider
- Use VolumeSnapshotLocation for persistent volumes
- Automate backup validation with scripts
- Test restore process in isolated namespace
- Monitor backup completion and storage consumption
- Implement backup retention policies
- Use namespace mapping for restore isolation
- Validate application health after restore
- Document restore procedures with exact commands
- Schedule regular DR drills every quarter
- Use GitOps for DR infrastructure configuration
