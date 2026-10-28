# Node Operations: Storage Modes, Pruning and Bootstrapping

Operational choices for running Bitcoin and Ethereum nodes: which storage mode to run, how pruning and history expiry work, how to bootstrap quickly without weakening security, and what to monitor. Client internals are in `node-implementation.md`.

## Storage Modes

| Mode | Keeps | Serves | Use for |
|------|-------|--------|---------|
| Archive | All blocks, all historical state | Any historical state query | Indexers, analytics, debugging old txs |
| Full (non-pruned history) | All blocks, recent state | Block history, current state | Explorers, most RPC |
| Pruned | Recent blocks and current state | Current state, recent blocks | Wallet backends, validators |
| Light | Headers + proofs on demand | Nothing to others | End-user devices |

Pick the cheapest mode that answers your queries. Historical `eth_call` at arbitrary old blocks, or `debug_traceTransaction` on old transactions, needs archive state (or a re-execution capable client).

## Bitcoin Core

```ini
# bitcoin.conf
server=1
txindex=1            # index all txs for getrawtransaction by txid; requires non-pruned node
blockfilterindex=1   # BIP158 filters for light clients / wallet rescans
dbcache=4096         # MiB of UTXO cache; larger speeds initial sync
# prune=550          # keep only the last ~550 MiB of blocks (minimum); incompatible with txindex
```

| Option | Effect |
|--------|--------|
| `prune=N` | Delete old block files beyond N MiB (min 550). Wallet rescans beyond kept range are impossible |
| `txindex=1` | Full tx index; disk cost; not allowed with pruning |
| `assumevalid` | Skip signature checks for ancestors of a release-pinned block during IBD (default on) |
| `blocksonly=1` | Do not relay unconfirmed txs; lower bandwidth |

### assumeUTXO
Bitcoin Core supports loading a UTXO snapshot (`loadtxoutset`) whose hash is hard-coded in the release. The node becomes usable at the snapshot height quickly, then validates history from genesis in the background and checks it reproduces the snapshot. Mainnet snapshot parameters were added in Bitcoin Core 28.

```bash
bitcoin-cli -rpcclienttimeout=0 loadtxoutset /data/utxo-840000.dat
bitcoin-cli getchainstates      # shows snapshot chainstate and background validation progress
```

## Ethereum

An Ethereum node is two processes: execution client (geth, Nethermind, Besu, Erigon, reth) and consensus client (Lighthouse, Prysm, Teku, Nimbus, Lodestar, Grandine), connected over the authenticated Engine API (JWT secret).

```bash
# geth execution client
geth --mainnet --syncmode snap \
     --http --http.addr 127.0.0.1 --http.api eth,net,web3 \
     --authrpc.addr 127.0.0.1 --authrpc.port 8551 --authrpc.jwtsecret /secrets/jwt.hex

# Lighthouse consensus client with checkpoint sync
lighthouse bn --network mainnet \
     --execution-endpoint http://127.0.0.1:8551 \
     --execution-jwt /secrets/jwt.hex \
     --checkpoint-sync-url "$TRUSTED_BEACON_API"
```

### Sync and state storage
| Concept | Notes |
|---------|-------|
| Snap sync (geth default) | Downloads a recent state snapshot and heals it; no historical state |
| Full sync | Executes every block from genesis; slower, still prunes old state unless archive |
| Path-based state scheme | geth's default storage scheme: keeps recent state layers and prunes automatically |
| Archive | Client-specific flags (geth `--gcmode archive`; Erigon and reth have archive as a natural mode) — check your client's docs for current options and disk needs |
| Checkpoint sync (CL) | Start from a recent finalized state fetched from a trusted beacon API; then backfill blocks |

### History expiry
EIP-4444 lets clients stop storing old block bodies and receipts. Execution clients began dropping pre-Merge history in 2025 (partial history expiry), with the data available from distributed archives (e.g. era files). Nodes that must serve old receipts or logs need history retention explicitly enabled or an external archive.

### Checkpoint trust
Checkpoint sync assumes the source gives you a canonical finalized state. Verify the block root against at least one independent source (another beacon API, a block explorer, your existing node) before relying on it. This is the PoS weak-subjectivity requirement in operational form.

## Hardware and Placement

| Resource | Guidance |
|----------|----------|
| Disk | Fast NVMe SSD with high random IOPS; spinning disks cannot keep up with Ethereum state access |
| Memory | Enough for client caches; more cache shortens initial sync |
| Network | Open P2P ports (Bitcoin 8333; Ethereum EL 30303 TCP/UDP, CL 9000 typical) for healthy peer counts |
| Clock | NTP/chrony synchronized; PoS duties are slot-timed |

Exact disk sizes grow continuously; take current figures from the client documentation at deployment time.

## Security

- Bind RPC to localhost or a private network; never expose admin/debug namespaces publicly.
- Protect the Engine API JWT secret; the Engine port must not be internet-facing.
- Put public RPC behind a proxy with method allow-lists, rate limits and request size limits.
- Run diverse clients across a fleet; a majority-client bug can split the chain.

## Monitoring

| Metric | Source |
|--------|--------|
| Head lag vs network | Compare local head with independent sources |
| Peer count | `getconnectioncount` / `net_peerCount`, CL peer metrics |
| Sync status | `getblockchaininfo.initialblockdownload` / `eth_syncing` |
| Finality lag | `finalized` vs `latest` |
| Disk growth & free space | Host metrics; alert well before full |
| Missed attestations/proposals (validators) | CL/validator client metrics |

Clients expose Prometheus metrics (`geth --metrics`, Lighthouse `--metrics`, Bitcoin via exporters).

## Checklist

- [ ] Storage mode matches query needs (archive only where required)
- [ ] Pruning/txindex/history settings documented per node role
- [ ] Bootstrap shortcuts (assumeUTXO, checkpoint sync) verified against independent sources
- [ ] RPC and Engine API not exposed publicly
- [ ] Head lag, peers, finality, disk monitored and alerted
