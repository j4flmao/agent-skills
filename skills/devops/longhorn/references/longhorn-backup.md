# Longhorn Backup & DR

## Backup Types
- **Snapshot**: Instant, K8s-native, stored on local disk.
- **Backup**: Sent to remote target (S3, NFS, SMB).

## Backup Schedule
- Hourly snapshots (retain 24).
- Daily backup to S3 (retain 7).
- Weekly backup to S3 (retain 4).
- Monthly backup to S3 (retain 12).

## DR Procedure
1. Create DR volume in secondary cluster from backup.
2. Activate DR volume when primary fails.
3. Redirect application PVC to DR volume.
4. When primary recovered, reverse sync DR volume back.
