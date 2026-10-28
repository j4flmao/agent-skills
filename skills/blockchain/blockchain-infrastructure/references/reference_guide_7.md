# Solana RPC Node Operations

Operating Solana RPC nodes (non-voting) for application backends and indexers: client choices, key flags, system tuning, account indexes, Geyser streaming, and monitoring. Validator (voting) operations share most of this but add vote account and identity key management.

## Client Landscape

| Client | Notes |
|--------|-------|
| Agave (`agave-validator`) | Anza-maintained continuation of the original Solana Labs validator; most RPC nodes run it |
| Frankendancer | Firedancer networking/block production components combined with Agave runtime |
| Firedancer | Independent full client from Jump; adoption growing |
| Jito-Solana | Agave fork with MEV block engine integration, common among validators |

The binary was renamed from `solana-validator` to `agave-validator`; scripts referencing the old name need updates.

## Hardware Expectations

Solana RPC nodes are among the most demanding blockchain workloads: high core-count CPUs with strong single-thread performance, very large RAM (hundreds of GB for RPC with account indexes), multiple NVMe drives, and high-bandwidth unmetered networking. Take current minimums from Anza's validator requirements; RPC nodes with full account indexes need more memory than voting validators.

Recommended disk layout:

| Mount | Contents |
|-------|----------|
| `/mnt/ledger` | Ledger (blocks, shreds) |
| `/mnt/accounts` | AccountsDB (highest IOPS) |
| `/mnt/snapshots` (optional) | Snapshots |

Separate NVMe devices for ledger and accounts avoid I/O contention.

## System Tuning

```bash
# /etc/sysctl.d/21-agave-validator.conf
net.core.rmem_default = 134217728
net.core.rmem_max = 134217728
net.core.wmem_default = 134217728
net.core.wmem_max = 134217728
vm.max_map_count = 1000000
fs.nr_open = 1000000
```

```ini
# systemd unit
[Service]
LimitNOFILE=1000000
LimitMEMLOCK=2000000000
```

UDP buffer sizes matter because Solana uses UDP/QUIC heavily (Turbine, gossip, TPU). Disable swap or keep it minimal for predictable latency.

## RPC Node Command Line

```bash
agave-validator \
  --identity /home/sol/rpc-identity.json \
  --no-voting \
  --ledger /mnt/ledger \
  --accounts /mnt/accounts \
  --entrypoint entrypoint.mainnet-beta.solana.com:8001 \
  --entrypoint entrypoint2.mainnet-beta.solana.com:8001 \
  --known-validator <trusted-validator-pubkey-1> \
  --known-validator <trusted-validator-pubkey-2> \
  --only-known-rpc \
  --expected-genesis-hash 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d \
  --dynamic-port-range 8000-8025 \
  --rpc-bind-address 0.0.0.0 \
  --rpc-port 8899 \
  --private-rpc \
  --full-rpc-api \
  --limit-ledger-size \
  --account-index program-id \
  --account-index spl-token-owner \
  --account-index spl-token-mint \
  --wal-recovery-mode skip_any_corrupted_record \
  --log /home/sol/agave.log
```

| Flag | Purpose |
|------|---------|
| `--no-voting` | RPC node; no vote account needed |
| `--known-validator` + `--only-known-rpc` | Fetch snapshots only from trusted validators |
| `--expected-genesis-hash` | Guard against joining the wrong cluster |
| `--full-rpc-api` | Enables the full JSON-RPC method set |
| `--private-rpc` | Do not advertise the RPC port in gossip |
| `--limit-ledger-size` | Bound ledger disk use (keeps recent shreds) |
| `--account-index` | Enables `getProgramAccounts` / token-owner queries efficiently; costs RAM |
| `--enable-rpc-transaction-history` | Serve historical transactions from local ledger (needs much more disk); often offloaded to BigTable or an indexer instead |

WebSocket pubsub is served on the RPC port + 1 (8900) by default.

## Startup and Snapshots

- Nodes start from a snapshot downloaded from known validators, then replay to the tip. Restarting from a local recent snapshot is much faster.
- Keep enough disk for full and incremental snapshots.
- Monitor catch-up: `agave-validator --ledger /mnt/ledger monitor` and `solana catchup <identity-pubkey>`.

## Geyser Plugins for Streaming

Polling RPC for account changes is expensive. Geyser plugins stream account, slot, and transaction updates directly from the validator:

```bash
agave-validator ... --geyser-plugin-config /home/sol/yellowstone-grpc.json
```

- Yellowstone gRPC (Triton One) is a widely used open-source plugin; Kafka and PostgreSQL plugins exist.
- Plugins run in-process: a buggy or slow plugin can stall the node. Pin plugin versions compatible with the exact validator version.

## Serving Traffic

- Put nodes behind a proxy that understands JSON-RPC: per-method rate limits, block `getProgramAccounts` without filters on public endpoints, cap `getSignaturesForAddress` limits.
- Route `sendTransaction` to nodes with good leader connectivity; consider staked connections (stake-weighted QoS) or a transaction-landing service for high-priority flows.
- Health: `getHealth` returns `ok` when within a slot threshold of the cluster; use it as readiness.

```bash
curl -s localhost:8899 -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

## Monitoring

| Metric | Why |
|--------|-----|
| Slot lag vs cluster (`getSlot` vs reference) | Freshness |
| `getHealth` status | Readiness |
| RPC latency per method | Proxy and capacity planning |
| Accounts disk IOPS and latency | Most common bottleneck |
| Memory usage | Account indexes grow with chain state |
| Packet drops / UDP errors | Network tuning issues |

Agave can push metrics to InfluxDB via `SOLANA_METRICS_CONFIG`; many operators also run node exporters and log-based dashboards.

## Upgrades

- Follow Anza/Firedancer release announcements; mainnet often requires a minimum version by a deadline (feature activations).
- Restart during low traffic; a restart from a local snapshot reduces downtime.
- Test new versions on a canary RPC node first.

## Pitfalls

- Shared disk for ledger and accounts → falling behind the cluster.
- Enabling every account index without the RAM to support it.
- Public `getProgramAccounts` without filters exhausting the node.
- Default UDP buffer sizes causing packet loss and slow catch-up.

## Checklist

- [ ] Hardware sized from current Anza guidance; separate NVMe for accounts and ledger
- [ ] sysctl and file/memory limits applied
- [ ] Known validators and expected genesis hash configured
- [ ] Account indexes chosen deliberately
- [ ] Geyser for streaming instead of heavy polling
- [ ] JSON-RPC proxy with method-level limits
- [ ] Slot-lag alerts and canary upgrades
