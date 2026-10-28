# Node Storage, Sync Modes, and Pruning

Disk is the dominant cost and failure source for blockchain nodes. This reference covers storage layouts, state schemes, pruning, history expiry, and snapshot-based bootstrapping, mainly for Ethereum execution clients with notes for other chains. Backup policy is in `disaster-recovery-backup.md`.

## Node Profiles

| Profile | Keeps | Serves | Typical use |
|---------|-------|--------|-------------|
| Full (pruned state) | Recent state, all post-checkpoint blocks/receipts | Current-state RPC, recent logs | Wallet backends, validators |
| Archive | Historical state at every block | `eth_call`/`eth_getBalance` at any block, `debug_trace*` historically | Indexers, explorers, analytics |
| Minimal / history-expired | Recent state and limited history | Head-following, validation | Validators with small disks |

Archive needs are often overstated: most dapps need recent state plus logs. Check whether an indexer or a third-party archive provider is cheaper than operating archive nodes.

## Client Storage Characteristics

| Client | State model | Notes |
|--------|-------------|-------|
| Geth | Path-based state scheme (default since v1.14) | Prunes stale state continuously; hash scheme still available for legacy setups |
| Nethermind | Pruning modes (memory/full/hybrid) | Configurable full pruning triggers |
| Besu | Bonsai Tries (default) | Flat state, small footprint; Forest for archive |
| Erigon | Flat state, staged sync | Efficient archive; separate history snapshots |
| Reth | MDBX + static files | Efficient archive and full modes; configurable pruning |

Exact disk sizes change with chain growth and client releases; take current numbers from each client's documentation and add at least 30–50% headroom for growth and compaction.

## Hardware Rules

- NVMe SSDs with high sustained random IOPS and low latency are required for mainnet execution clients. Network-attached volumes with burst credits or HDDs fall behind the chain head.
- Prefer local NVMe (bare metal, instance storage) over network block storage; if using cloud block storage, provision IOPS explicitly.
- Keep the database on its own volume; logs and OS elsewhere.
- Use ext4 or XFS with `noatime`; ZFS is workable (useful for snapshots) but tune `recordsize` and compression for the database's page size.

```bash
# Benchmark random read IOPS before trusting a disk
fio --name=randread --filename=/data/fio.test --size=20G --bs=4k --rw=randread \
    --ioengine=libaio --iodepth=64 --direct=1 --runtime=60 --time_based --group_reporting
```

## Geth State Scheme and Pruning

```bash
# New node, path scheme (default on fresh datadir in recent Geth)
geth --mainnet --datadir /data/geth --state.scheme path --syncmode snap

# Archive node (keeps all historical state)
geth --mainnet --datadir /data/geth --syncmode full --gcmode archive
```

- The path scheme removes the need for offline `geth snapshot prune-state` runs, which applied only to the hash scheme.
- Switching scheme requires a fresh sync; it cannot be converted in place.
- Archive support in path mode has been evolving; verify in the release notes of the version you run before planning an archive deployment.

## History Expiry (EIP-4444)

Execution clients have begun dropping pre-Merge block bodies and receipts by default or as an option ("partial history expiry", rolled out during 2025). Consequences:

- `eth_getBlockByNumber` / `eth_getLogs` for old ranges may fail on default nodes.
- Indexers and explorers must configure full history retention explicitly or fetch history from Era files / other archival sources.
- Document which history range each node in an RPC pool serves and route old-range queries accordingly.

## Consensus Layer Storage

- Beacon nodes store blocks, states (periodic snapshots), and blobs.
- Blobs (EIP-4844) are retained only for a limited window (4096 epochs, about 18 days) by default; L2 nodes syncing from far back need an archival blob source.
- Checkpoint sync avoids downloading full beacon history; enable backfill only if you need historical blocks.

## Bootstrapping from Snapshots

Syncing from scratch can take hours to weeks. Options:

| Method | Trust | Speed |
|--------|-------|-------|
| Native snap/checkpoint sync | Trust-minimized | Hours for full nodes |
| Your own volume snapshot (ZFS/LVM/cloud snapshot of a stopped or consistent node) | You | Minutes to restore |
| Third-party data snapshot (tarball) | Provider | Fast, but you trust the data |

Taking consistent snapshots:

```bash
systemctl stop geth                         # or use filesystem-level atomic snapshot
zfs snapshot tank/geth@$(date +%Y%m%d)
systemctl start geth
zfs send -c tank/geth@20261027 | ssh backup zfs recv -F pool/geth
```

Stopping the client (or using an atomic filesystem snapshot) avoids a corrupted database. After restoring, the client catches up from the snapshot height.

## Other Chains

| Chain | Storage notes |
|-------|---------------|
| Bitcoin Core | `prune=<MiB>` keeps only recent blocks (incompatible with `txindex`); `-dbcache` speeds initial sync |
| Solana | Separate NVMe for accounts and ledger; `--limit-ledger-size` bounds ledger; very high IOPS needs |
| Cosmos SDK | `pruning` = `default`/`nothing`/`everything`/`custom` in `app.toml`; state sync for fast bootstrap |
| OP Stack L2 | op-geth state similar to Geth; also depends on L1 and beacon blob access |

## Capacity Planning

- Track disk usage growth rate per week from metrics (`node_filesystem_avail_bytes`).
- Alert at 80% used and forecast days-to-full; resizing under pressure risks corruption.
- Database compaction can temporarily need significant extra space.

## Pitfalls

- Cloud burstable volumes performing well during tests, then exhausting credits during sync.
- Copying a live database directory without stopping the client.
- Assuming every pool member serves full history after history expiry defaults changed.
- Running out of disk mid-compaction and corrupting the database.

## Checklist

- [ ] Profile (full/archive/history range) chosen per workload
- [ ] Local NVMe or provisioned-IOPS storage, benchmarked with fio
- [ ] State scheme and pruning mode documented per node
- [ ] History retention requirements explicit for indexers
- [ ] Consistent snapshot procedure tested end to end
- [ ] Disk growth alerts with forecast
