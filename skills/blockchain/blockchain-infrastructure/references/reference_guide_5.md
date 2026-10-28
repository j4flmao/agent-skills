# Layer 2 Rollup Node Infrastructure

Running your own nodes for Ethereum rollups (OP Stack chains such as OP Mainnet and Base, Arbitrum Nitro chains) to serve RPC traffic and verify the chain independently. Covers node components, L1 dependencies, configuration, and operational concerns. Sequencer and batcher operation for your own rollup is out of scope except where noted.

## Why Run Your Own L2 Node

- Independence from public RPC rate limits and outages.
- Lower latency for applications and indexers.
- Ability to verify L2 state derived from L1 data rather than trusting a provider.

## Architecture: L2 Nodes Depend on L1

```
            ┌──────────── L1 Ethereum ────────────┐
            │ Execution RPC      Beacon API (blobs)│
            └──────┬──────────────────┬───────────┘
                   │                  │
           ┌───────▼──────────────────▼───────┐
           │  Rollup node (derivation)         │  op-node / Nitro's inbox reader
           └───────┬───────────────────────────┘
                   │ Engine API (JWT)
           ┌───────▼───────────┐
           │ L2 execution       │  op-geth / op-reth / Nitro (Geth-based)
           └───────┬───────────┘
                   │ JSON-RPC
               apps / RPC proxy
```

An L2 node is only as reliable as its L1 sources. You need:

- An L1 execution RPC (full node is sufficient for following recent data).
- An L1 beacon API to fetch blob sidecars (EIP-4844), since rollups post data as blobs.
- For syncing from old L2 heights, blob data older than the beacon retention window (about 18 days) must come from an archival blob source or the node must start from a recent L2 snapshot.

## OP Stack Node

Components:

| Component | Role |
|-----------|------|
| `op-node` | Derives L2 blocks from L1 data, drives the EL via Engine API, gossips unsafe blocks over P2P |
| `op-geth` (or `op-reth`) | L2 execution client and JSON-RPC |

```bash
op-geth \
  --op-network=op-mainnet \
  --datadir=/data/op-geth \
  --syncmode=snap \
  --http --http.addr=0.0.0.0 --http.port=8545 --http.api=eth,net,web3 \
  --ws --ws.addr=0.0.0.0 --ws.port=8546 \
  --authrpc.addr=127.0.0.1 --authrpc.port=8551 --authrpc.jwtsecret=/secrets/jwt.hex \
  --rollup.sequencerhttp=https://mainnet-sequencer.optimism.io

op-node \
  --network=op-mainnet \
  --l1=https://l1-el.internal \
  --l1.beacon=https://l1-beacon.internal \
  --l2=http://127.0.0.1:8551 \
  --l2.jwt-secret=/secrets/jwt.hex \
  --syncmode=execution-layer \
  --rpc.addr=0.0.0.0 --rpc.port=9545
```

- `--rollup.sequencerhttp` forwards `eth_sendRawTransaction` to the chain's sequencer; your node does not order transactions.
- `--syncmode=execution-layer` lets op-geth snap-sync state, then op-node switches to derivation.
- For other OP Stack chains (Base and others in the Superchain registry), use their network names or provide the rollup config and genesis files published by the chain operator.

## Arbitrum Nitro Node

```bash
nitro \
  --parent-chain.connection.url=https://l1-el.internal \
  --parent-chain.blob-client.beacon-url=https://l1-beacon.internal \
  --chain.id=42161 \
  --http.addr=0.0.0.0 --http.port=8547 --http.api=net,web3,eth \
  --http.vhosts='*' --http.corsdomain='*'
```

- Nitro bundles derivation and execution in one binary; it forwards transactions to the sequencer feed operator.
- Initial sync usually starts from a published database snapshot (`--init.url` or newer `--init.*` options); check current docs for the recommended bootstrap method.
- Arbitrum One chain ID is 42161; Arbitrum Nova is 42170.
- Restrict `vhosts`/`corsdomain` when the port is reachable from outside a trusted network.

## Safety Levels of L2 Blocks

| Label (OP Stack) | Meaning |
|------------------|---------|
| `unsafe` | Received from sequencer via P2P, not yet on L1 |
| `safe` | Derived from data posted on L1 |
| `finalized` | Derived from finalized L1 blocks |

Applications handling high-value deposits should wait for `safe` or `finalized` (query `optimism_syncStatus` on op-node, or use block tags `safe`/`finalized` in `eth_getBlockByNumber`).

## Withdrawals and Fault Proofs

L2 → L1 withdrawals are finalized on L1 after the challenge window (OP Stack and Arbitrum fault-proof systems, typically 7 days on mainnet chains). Infrastructure that tracks withdrawals needs L1 archive-ish access to dispute game or outbox contracts and should not assume instant finality.

## Hardware and Storage

- L2 execution databases grow quickly on high-throughput chains; use NVMe and plan growth from chain-specific docs.
- Memory and CPU needs scale with chain throughput (Base and Arbitrum One are significantly busier than small OP Stack chains).
- Keep L1 sources close (same region) to minimize derivation latency.

## Upgrades

- Rollups upgrade on their own schedule (OP Stack network upgrades are activated by timestamp; Arbitrum upgrades via ArbOS versions). Running an outdated node after activation causes a halt or divergence.
- Subscribe to the chain operator's status page and release notes; upgrade in staging first.
- L1 hard forks can also require L2 node upgrades (e.g. changes to blob handling).

## Monitoring

| Signal | Source |
|--------|--------|
| Unsafe/safe/finalized head lag | `optimism_syncStatus`, block tags vs public reference |
| L1 RPC/beacon error rate | Node logs and metrics |
| Peer count (op-node P2P) | Metrics endpoint |
| Derivation pipeline errors / resets | Logs, metrics |
| Disk growth | Node exporter |

Alert if the `safe` head stops advancing while `unsafe` advances: usually an L1 or beacon data problem.

## Running Your Own Rollup (brief)

Additional components: sequencer (op-node in sequencer mode), batcher (`op-batcher`), proposer (`op-proposer`), and challenger for fault proofs, or Rollup-as-a-Service providers. These hold keys that post to L1: protect them with KMS/HSM, monitor their ETH balances, and alert on posting delays.

## Pitfalls

- L1 beacon endpoint missing or pruned too aggressively → derivation stalls.
- Treating `latest` (unsafe) blocks as final for deposits.
- Public RPC as the L1 source for a production L2 node; rate limits stall derivation.
- Missing a scheduled network upgrade.

## Checklist

- [ ] Dedicated L1 execution and beacon endpoints with redundancy
- [ ] Archival blob source or recent snapshot for bootstrapping
- [ ] JWT secret shared only between rollup node and L2 EL
- [ ] Applications use `safe`/`finalized` where value is at risk
- [ ] Upgrade calendar for both L2 and L1 forks
- [ ] Head-lag and derivation alerts
