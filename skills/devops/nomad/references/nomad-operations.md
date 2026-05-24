# Nomad Operations

## Cluster Management

### Backup and Restore

```bash
# Backup state (from server leader)
nomad operator snapshot save backup.snap

# Restore state
nomad operator snapshot restore backup.snap

# Automated backup (cron)
0 */6 * * * nomad operator snapshot save /backups/nomad-$(date +\%Y\%m\%d-\%H\%M).snap
```

| Data | Backup Method | Recovery |
|------|---------------|----------|
| Job specs | Git (source of truth) | `nomad job run` from Git |
| Cluster state | Snapshot (Raft) | Restore snapshot |
| Node attributes | Rebuilt on restart | Client re-registers |
| ACL policies | Backup + Git | `nomad acl policy apply` |

### Upgrade Procedure

```bash
# 1. Check current version
nomad node status

# 2. Upgrade servers one at a time (stanza)
kill -SIGTERM $(pgrep nomad)
# Restart with new binary
nomad server ... &

# 3. Verify quorum
nomad operator raft list-peers

# 4. Upgrade clients (batch by datacenter)
# Drain node first
nomad node drain -enable -no-deadline <node-id>

# Upgrade binary, restart
# Re-enable node
nomad node drain -disable <node-id>
```

### Monitoring

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Raft leader | Nomad server /metrics | No leader for 1min |
| Raft peer count | Nomad server /metrics | < 3 peers |
| Heartbeat miss | Nomad server /metrics | > 10% miss rate |
| Node eligibility | `nomad node status` | < 50% eligible |
| Allocation status | Prometheus + nomad_exporter | > 10% failed |
| Queue depth | `nomad eval status` | > 100 pending |

## Autoscaler Operations

```yaml
# Horizontal scaling policy
scale "web-app" {
  enabled = true
  min     = 3
  max     = 20
  horizontal {
    check "cpu_utilization" {
      strategy = "target-value"
      target   = 70
    }
  }
}
```

## Node Management

| Operation | Command | Effect |
|-----------|---------|--------|
| Drain | `nomad node drain -enable -no-deadline <node>` | Migrate allocations, stop new |
| Eligibility | `nomad node eligibility -disable <node>` | No new allocations |
| Purge | `nomad node drain -disable <node> -purge` | Remove node from cluster |
| Status | `nomad node status -verbose <node>` | Detailed node info |

## Cluster Sizing

| Cluster Size | Server Count | Quorum Required |
|-------------|-------------|----------------|
| Dev | 1 | 1 |
| Small | 3 | 2 |
| Medium | 5 | 3 |
| Large | 7 | 4 |

Storage: BoltDB on SSD, 20GB+ recommended per server.
