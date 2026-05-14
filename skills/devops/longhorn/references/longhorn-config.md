# Longhorn Configuration Reference

## Key Settings

| Setting | Default | Production | Rationale |
|---|---|---|---|
| replica-count | 3 | 3 | Production min |
| default-data-path | /var/lib/longhorn | /data/longhorn | Separate disk |
| backup-target | "" | s3://bucket | Required for DR |
| stale-replica-timeout | 30 | 30 | Minutes |
| replica-auto-balance | disabled | best-effort | Rebalance on node add |
| data-locality | disabled | best-effort | Local read performance |
