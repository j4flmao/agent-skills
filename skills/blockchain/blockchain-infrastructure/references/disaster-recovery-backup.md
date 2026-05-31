# Disaster Recovery & Backup for Blockchain Infrastructure

## Overview

Blockchain infrastructure presents unique disaster recovery (DR) challenges. Unlike traditional databases, blockchain nodes must maintain exact state with the network—replaying from genesis is impractical for archive nodes with multi-terabyte state. This reference covers backup strategies, disaster recovery planning, node state snapshots, validator key escrow, and automated failover for blockchain infrastructure components.

## Core Architecture Concepts

### Blockchain DR Taxonomy

| Disaster Type | Impact | RTO Target | RPO Target |
|---|---|---|---|
| Node data corruption | Invalid state, sync failure | 1-4 hours | < 1 hour |
| Hardware failure (bare-metal) | Complete node loss | 2-8 hours | 0 (re-sync) |
| Cloud provider region outage | Multi-node loss | 30 min - 2 hours | < 5 min |
| Validator key compromise | Slashing risk | Immediate (key rotation) | N/A |
| RPC DDoS / traffic spike | Service degradation | 5-15 min (auto-scale) | N/A |
| Chain reorganization | State reversion | N/A (protocol-driven) | N/A |

### Recovery Point vs Recovery Time

- **Archive nodes**: RPO is critical (days of re-sync). Use daily snapshots + WAL-based incremental backups.
- **Full nodes**: RPO less critical. Can re-sync in 6-48 hours depending on chain. Snapshots preferred over re-sync for sub-4-hour RTO.
- **Validator nodes**: RPO is irrelevant (state is ephemeral). Focus on validator key availability and slashing protection.
- **RPC nodes**: Stateless from the node's perspective (caches excluded). RTO depends on load balancer and DNS failover speed.

## Architecture Decision Trees

### Backup Strategy Decision Tree

```
Backup strategy needed
├── Node type?
│   ├── Archive node → Daily LZ4-compressed snapshot + WAL archive
│   ├── Full node → Weekly snapshot + peer-based re-sync fallback
│   └── Validator node → No state backup (re-sync from genesis), key backup only
├── Storage backend?
│   ├── Local NVMe → rsync to cold storage (S3/GCS/Backblaze)
│   ├── Cloud volume → EBS snapshot / PersistentVolume snapshot
│   └── Bare-metal → Custom script → tar/rsync → object storage
└── RPO requirement?
    ├── < 1 hour → Continuous incremental backup (ZFS send/receive or WAL archiving)
    ├── < 1 day → Daily snapshot
    └── > 1 day → Re-sync from genesis (no backup needed)
```

### DR Runbook Decision Tree

```
Node failure detected
├── Data corruption?
│   ├── Yes → Restore from latest snapshot → verify sync status → redirect traffic
│   ├── Yes (no snapshot) → Peer-based re-sync → estimate time → communicate ETA
│   └── No → Hardware/process failure → restart service → check logs
├── RPC unavailable?
│   ├── Single node → LB removes from pool → investigate → restore or replace
│   ├── Multi-node → Failover to secondary region → auto-scale → investigate
│   └── All nodes → DNS failover to backup provider → emergency deploy
└── Validator failure?
    ├── Missed attestation → Check logs → restart → verify signing
    ├── Double-sign risk → Emergency key rotation → report incident
    └── Key lost → Retrieve from HSM/KMS backup → re-import → restart
```

## Implementation Strategies

### Blockchain Node Snapshots

The most reliable DR strategy for large blockchain nodes is periodic snapshots:

```bash
# Ethereum archive node snapshot (Geth)
# Stop node, create snapshot, restart
geth snapshot --datadir /data/geth
tar -I lz4 -cf /backup/geth-$(date +%Y%m%d).tar.lz4 /data/geth

# Restore
tar -I lz4 -xf /backup/geth-20250101.tar.lz4 -C /data/
geth --datadir /data/geth
```

**Snapshot strategies by client**:

| Client | Snapshot Method | Size (Archive) | Frequency | Restore Time |
|---|---|---|---|---|
| Geth (Ethereum) | `geth snapshot` + tar | 2-12 TB | Daily | 2-6 hours |
| Lighthouse (Beacon) | Database cold copy | 200-500 GB | Weekly | 30 min |
| Solana | `solana-validator --snapshot-interval-slots` | 50-200 GB | Every epoch | 15 min |
| Cosmos / CometBFT | UnsafeResetAll + statesync | 10-100 GB | Statesync | 10 min |
| Polygon Edge / Bor | `bor snapshot` | 1-5 TB | Daily | 1-3 hours |

### ZFS-Based Incremental Backups

For bare-metal deployments with ZFS, use send/receive for efficient incremental backups:

```bash
# Create ZFS dataset for node data
zfs create -o mountpoint=/data/ethereum tank/ethereum

# Initial full send to backup server
zfs send tank/ethereum@snap-$(date +%Y%m%d) | ssh backup-server "zfs receive tank-backup/ethereum"

# Subsequent incremental sends
zfs send -i tank/ethereum@snap-yesterday tank/ethereum@snap-today | ssh backup-server "zfs receive tank-backup/ethereum"
```

### Cloud-Based Volume Snapshots

For cloud-based K8s deployments, use CSI snapshotting:

```yaml
# Kubernetes VolumeSnapshot for node PVC
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: geth-mainnet-snapshot-20250101
spec:
  volumeSnapshotClassName: csi-hostpath-snapclass
  source:
    persistentVolumeClaimName: geth-mainnet-data
```

```yaml
# Scheduled snapshot with Velero/CloudCasa
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: blockchain-node-backup
spec:
  schedule: "0 2 * * *"
  template:
    includedNamespaces:
      - blockchain
    ttl: 720h  # 30 days retention
```

## Integration Patterns

### Multi-Layer DR Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Global Load Balancer                │
│              (DNS failover / Anycast)                  │
├────────────────────────┬─────────────────────────────┤
│   Primary Region       │   Secondary Region           │
│   ├─ RPC Node A        │   ├─ RPC Node D             │
│   ├─ RPC Node B        │   ├─ RPC Node E             │
│   └─ RPC Node C        │   └─ RPC Node F             │
│   ├─ Snapshot Server   │   ├─ Snapshot Server         │
│   │  (daily backup)    │   │  (replica from primary)  │
│   └─ Archive Node      │   └─ Archive Node (warm)     │
└────────────────────────┴─────────────────────────────┘
```

### Validator Key Escrow Pattern

Validator keys require multi-layered backup with strict access control:

```
┌─────────────────────────────────────────────────────────────┐
│                    Validator Key Escrow                       │
├──────────────┬──────────────────┬────────────────────────────┤
│  Hot Wallet  │  Warm Backup     │  Cold Storage              │
│  (KMS)       │  (HSM + Backup)  │  (Paper/Mnemonic)         │
│              │                  │                            │
│  ┌────────┐  │  ┌────────────┐  │  ┌──────────────────────┐  │
│  │ AWS    │  │  │ YubiHSM2   │  │  │ Encrypted mnemonic   │  │
│  │ KMS    │  │  │ + backup   │  │  │ in bank vault /      │  │
│  │ daily  │  │  │ key share   │  │  │ safety deposit box   │  │
│  └────────┘  │  └────────────┘  │  └──────────────────────┘  │
└──────────────┴──────────────────┴────────────────────────────┘
```

## Performance Optimization

### Snapshot Compression Tradeoffs

| Compression | Ratio | Speed (GB/min) | Restore Speed | Recommended For |
|---|---|---|---|---|
| None (raw copy) | 1x | 1000+ | Instant | Local disk clone |
| LZ4 (fast) | 1.5-2x | 800-1000 | 500-800 | Daily snapshots, NVMe backup |
| Zstandard (zstd) | 2-3x | 300-500 | 200-400 | Object storage backup |
| gzip | 2-4x | 50-100 | 40-80 | Cold archival backup |
| LZMA (xz) | 3-5x | 10-20 | 5-15 | Long-term archival only |

### Incremental vs Full Snapshot Cost Analysis

| Node Type | Full Snapshot Size | Daily Incremental | Monthly Cost (S3) | Monthly Cost (Glacier) |
|---|---|---|---|---|
| ETH Archive Node | 12 TB | 50-100 GB | $300-400 | $50-80 |
| ETH Full Node | 1-2 TB | 10-20 GB | $30-50 | $5-10 |
| Solana Validator | 200 GB | 2-5 GB | $10-15 | $2-3 |
| Cosmos Full Node | 100 GB | 1-3 GB | $5-10 | $1-2 |

## Security Considerations

### Backup Encryption

All off-site backups must be encrypted:

```bash
# Encrypt snapshot before upload
gpg --symmetric --cipher-algo AES256 --batch --passphrase-file /vault/passphrase \
  -o geth-snapshot-20250101.tar.lz4.gpg geth-snapshot-20250101.tar.lz4

# Upload to object storage with encryption-at-rest
rclone copy geth-snapshot-20250101.tar.lz4.gpg s3:blockchain-backups/ --s3-server-side-encryption AES256
```

### Key Management for DR

- **Validator keys**: Back up encrypted keystore JSON + withdrawal mnemonic to HSM. Never store plaintext keys off-device.
- **RPC authentication keys**: Store in Vault/KMS with DR access policy. Replicate across regions.
- **Infrastructure credentials**: Use cross-region IAM roles / service accounts with restricted DR permissions.
- **Backup access**: Implement 4-eyes approval for restore operations. Maintain access audit log.

## Operational Excellence

### DR Drill Schedule

| Drill Type | Frequency | Scope | Success Criteria |
|---|---|---|---|
| Snapshot restore | Monthly | Single node restored from snapshot | Full sync within RTO |
| Region failover | Quarterly | DNS + LB switch to secondary region | RPC latency < 2s |
| Key escrow drill | Quarterly | Validator key restored from HSM backup | Successful attestation |
| Full DR exercise | Bi-annually | Simulate complete region loss | All services operational in 2nd region |
| Chain reorg drill | Bi-annually | Simulate reorg, verify indexer handling | No data inconsistency |

### Runbook Template

```markdown
## Incident: Node Data Corruption

1. **Detect**: Sync lag alert, block import errors in logs
2. **Verify**: Check `eth_syncing`, compare block hash with peers
3. **Contain**: Remove node from load balancer pool
4. **Assess**: Check last known good snapshot time
5. **Restore**: 
   - Stop node: `systemctl stop geth`
   - Restore data dir from snapshot
   - Start node: `systemctl start geth`
   - Verify sync: `geth attach --exec "eth.syncing"`
6. **Validate**: Check peer count, block import, RPC responses
7. **Resume**: Add back to load balancer pool
8. **Post-mortem**: Determine root cause of corruption
```

### Monitoring Metrics for DR Readiness

- `blockchain_backup_last_success_timestamp` — time of last successful backup
- `blockchain_backup_size_bytes` — backup size for capacity planning
- `blockchain_backup_duration_seconds` — backup runtime
- `blockchain_restore_test_timestamp` — last successful restore drill
- `blockchain_snapshot_age_seconds` — current lag from chain tip to latest snapshot
- `blockchain_sync_progress` — restore-in-progress tracking metric

## Testing Strategy

### Restore Testing

```python
# Automated restore testing script
def test_snapshot_restore(snapshot_path: str, chain_type: str, expected_block: int):
    # 1. Mount fresh volume
    # 2. Extract snapshot to data directory
    # 3. Start node client with --syncmode=snap
    # 4. Wait for import to complete
    # 5. Query block number via RPC
    # 6. Assert block_number >= expected_block
    # 7. Assert peer_count > 0
    # 8. Clean up volume
    pass
```

**Test scenarios**:
- Restore archive node from full snapshot
- Restore full node from incremental backup chain
- Multi-region failover with live traffic
- Validator key restoration and signing verification
- Simultaneous node + RPC layer recovery

## Common Pitfalls

| Pitfall | Consequence | Prevention |
|---|---|---|
| Only testing backup (never restore) | Backup is silently corrupted | Monthly restore drills |
| Ignoring chain reorg in backup strategy | Restored to orphaned chain tip | Snapshot at finalized block only |
| Plaintext keys in backup archive | Catastrophic key compromise | GPG encrypt all off-site backups |
| Single-region backup storage | No DR during region outage | Cross-region / cross-cloud replication |
| No backup for genesis config | Cannot reconstruct chain params | Version-controlled genesis files |
| Relying solely on cloud snapshots | Vendor lock-in, no portability | Object storage exports in parallel |
| Overlooking validator slashing during DR | Double-sign during failover | Always use slashing protection DB |
| Snapshot during inconsistent state | Restored to corrupt state | Flush DB / checkpoint before snapshot |

## Key Takeaways

1. **Archive nodes need daily snapshots** — re-syncing 10+ TB from genesis is not viable for sub-24-hour RTO.
2. **Never backup validator state** — only backup validator keys (encrypted) and withdrawal credentials.
3. **Test restores monthly** — a backup that has never been restored is not a backup.
4. **Encrypt all off-site backups** — use GPG symmetric AES256 or cloud KMS envelope encryption.
5. **ZFS send/receive is optimal** for bare-metal incremental backups with near-zero overhead.
6. **Cross-region redundancy** is mandatory for production RPC infrastructure — DNS failover alone is insufficient without warm standby nodes.
7. **Maintain a DR runbook per chain** — each blockchain has different sync mechanics, snapshot tools, and finality models.
8. **Automate DR drills** — manual recovery is error-prone under incident pressure. Script all recovery steps.