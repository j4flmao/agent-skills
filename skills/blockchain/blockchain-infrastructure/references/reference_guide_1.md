# Ethereum Execution and Consensus Client Pairing

Since the Merge, every Ethereum node is two processes: an execution-layer (EL) client that runs the EVM and state, and a consensus-layer (CL) beacon node that follows proof-of-stake. This reference covers how to pair them, authenticate the Engine API, sync quickly, and keep client diversity. Hardware sizing and Ansible roles are in `node-deployment.md`.

## Client Options

| Layer | Clients | Notes |
|-------|---------|-------|
| Execution | Geth (Go), Nethermind (C#), Besu (Java), Erigon (Go), Reth (Rust) | Differ in disk footprint, archive support, RPC performance |
| Consensus | Lighthouse (Rust), Prysm (Go), Teku (Java), Nimbus (Nim), Lodestar (TS), Grandine (Rust) | Any CL works with any EL through the Engine API |

Client diversity: a bug in a client used by more than two-thirds of validators can finalize an invalid chain. Prefer minority clients for new deployments and run mixed pairs across a fleet.

## How the Pair Communicates

```
          P2P (devp2p, 30303 tcp/udp)            P2P (libp2p, e.g. 9000 tcp/udp)
                    │                                       │
            ┌───────┴────────┐  Engine API (8551, JWT) ┌─────┴─────────┐
 JSON-RPC ← │ Execution (EL) │ ◄────────────────────── │ Beacon node   │ → Beacon API (REST)
 (8545)     └────────────────┘                         └───────────────┘
                                                              │
                                                     Validator client (optional)
```

- The CL drives the EL with `engine_newPayload` and `engine_forkchoiceUpdated`.
- The Engine API is authenticated with a shared 32-byte hex JWT secret; both processes read the same file.
- Without a synced CL, the EL cannot follow the chain head.

## Generating the JWT Secret

```bash
openssl rand -hex 32 | tr -d '\n' > /secrets/jwt.hex
chmod 600 /secrets/jwt.hex
```

Mount the same file into both containers; never expose port 8551 beyond the host or pod.

## Example: Geth + Lighthouse

```bash
geth \
  --mainnet \
  --datadir /data/geth \
  --syncmode snap \
  --http --http.addr 0.0.0.0 --http.port 8545 --http.api eth,net,web3 \
  --http.vhosts '*' \
  --ws --ws.addr 0.0.0.0 --ws.port 8546 --ws.api eth,net,web3 \
  --authrpc.addr 127.0.0.1 --authrpc.port 8551 --authrpc.jwtsecret /secrets/jwt.hex \
  --metrics --metrics.addr 0.0.0.0 --metrics.port 6060
```

```bash
lighthouse bn \
  --network mainnet \
  --datadir /data/lighthouse \
  --execution-endpoint http://127.0.0.1:8551 \
  --execution-jwt /secrets/jwt.hex \
  --checkpoint-sync-url https://<trusted-checkpoint-provider> \
  --http --http-address 0.0.0.0 --http-port 5052 \
  --metrics
```

Bind `--http.addr 0.0.0.0` only when a proxy or network policy restricts who can reach it; otherwise use `127.0.0.1`.

## Example: Nethermind + Teku (docker compose)

```yaml
services:
  nethermind:
    image: nethermind/nethermind:<pinned-version>
    command:
      - --config=mainnet
      - --datadir=/data
      - --JsonRpc.Enabled=true
      - --JsonRpc.Host=0.0.0.0
      - --JsonRpc.EngineHost=0.0.0.0
      - --JsonRpc.EnginePort=8551
      - --JsonRpc.JwtSecretFile=/secrets/jwt.hex
    volumes: ["./nethermind:/data", "./secrets:/secrets:ro"]
    ports: ["30303:30303/tcp", "30303:30303/udp"]
  teku:
    image: consensys/teku:<pinned-version>
    command:
      - --network=mainnet
      - --data-path=/data
      - --ee-endpoint=http://nethermind:8551
      - --ee-jwt-secret-file=/secrets/jwt.hex
      - --checkpoint-sync-url=https://<trusted-checkpoint-provider>/eth/v2/debug/beacon/states/finalized
      - --rest-api-enabled=true
    volumes: ["./teku:/data", "./secrets:/secrets:ro"]
    ports: ["9000:9000/tcp", "9000:9000/udp"]
```

Pin exact image tags; upgrade deliberately before each network upgrade.

## Sync Strategies

| Layer | Mode | Effect |
|-------|------|--------|
| CL | Checkpoint sync | Starts from a recent finalized state; minutes instead of days. Verify the checkpoint block root against a second source |
| EL | Snap sync (Geth), fast/snap (Nethermind, Besu) | Downloads recent state, then heals; days → hours |
| EL | Full sync from genesis | Re-executes every block; needed for archive nodes in some clients |
| EL | Staged sync (Erigon, Reth) | Pipelined stages; efficient archive builds |

Checkpoint sync providers are trust assumptions: use one you operate or a well-known community endpoint, and cross-check the finalized root.

## Health Checks

```bash
# EL: false once synced
curl -s -X POST localhost:8545 -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_syncing","params":[]}'

# CL: is_syncing=false and el_offline=false
curl -s localhost:5052/eth/v1/node/syncing

# CL peers
curl -s localhost:5052/eth/v1/node/peer_count
```

Use these as readiness signals behind load balancers. Liveness should check the process, not sync state, or a long resync triggers restart loops.

## Network Upgrades

- Every hard fork (for example Dencun in 2024, Pectra in 2025, Fusaka in late 2025) requires both EL and CL releases that support it before the fork epoch.
- Subscribe to client release channels; schedule upgrades on testnets first.
- A node on an outdated client follows a minority chain after the fork.

## Ports Summary

| Port | Process | Exposure |
|------|---------|----------|
| 30303 tcp/udp | EL P2P | Public |
| 9000 tcp/udp (Lighthouse/Teku default; others differ) | CL P2P | Public |
| 8545 / 8546 | EL JSON-RPC / WS | Private or behind RPC proxy |
| 8551 | Engine API | Localhost/pod only |
| 5052 (Lighthouse), 5051 (Teku), 3500 (Prysm) | Beacon REST API | Private |
| 6060, 5054, 8008 (varies) | Metrics | Monitoring network only |

## Pitfalls

- Different JWT files for EL and CL → `Unauthorized` errors and a stalled node.
- One CL shared by several ELs or vice versa; each EL needs its own CL (multiplexers exist but add risk).
- Running EL without a CL and wondering why it never syncs.
- Not opening P2P ports → few peers, slow sync, missed attestations for validators.

## Checklist

- [ ] EL and CL from minority clients where possible, versions pinned
- [ ] Shared JWT secret, mode 600, Engine API not exposed
- [ ] Checkpoint sync from a trusted, cross-checked source
- [ ] Readiness based on `eth_syncing` and beacon `/node/syncing`
- [ ] P2P ports reachable; RPC ports private
- [ ] Upgrade calendar tracked for every network fork
