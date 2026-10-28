# Ethereum Peer-to-Peer Networking (devp2p, libp2p, PeerDAS)

Ethereum runs two P2P networks: the execution layer's **devp2p** network (transactions, historical blocks, state sync) and the consensus layer's **libp2p** network (blocks, attestations, blobs/data columns). This reference explains the protocols, ports, message types and operational tuning.

## Overview

| Layer | Discovery | Transport | Application protocols |
|---|---|---|---|
| Execution (EL) | discv4, discv5 (UDP), DNS lists (EIP-1459) | RLPx over TCP (ECIES handshake, framed, Snappy) | `eth/68`, `eth/69` (Fusaka), `snap/1` |
| Consensus (CL) | discv5 with ENR records | libp2p over TCP and QUIC, Noise encryption, yamux/mplex muxing | gossipsub v1.1+ topics, req/resp protocols |

Default ports: EL 30303 TCP/UDP; CL 9000 TCP/UDP (QUIC often on 9001 UDP). Open them inbound for healthy peering.

## Node Identity: ENR
Ethereum Node Records (EIP-778) are signed key/value records: `id`, `secp256k1` public key, `ip`, `tcp`, `udp`, and for CL `eth2` (fork digest), `attnets`/`syncnets` subnet bitfields, and PeerDAS custody information.
```
enr:-Iu4QH...   # base64 encoded; decode with `devp2p enrdump` (geth tools) or enr libraries
```

## Execution Layer: eth Protocol

Since the Merge the EL no longer gossips blocks; it receives blocks from the CL via the Engine API. The `eth` protocol carries:

| Message | Purpose |
|---|---|
| `Status` | Handshake: network ID, genesis, fork ID (EIP-2124), head |
| `NewPooledTransactionHashes` | Announce tx hashes with types and sizes (eth/68) |
| `GetPooledTransactions` / `PooledTransactions` | Fetch announced transactions (blob txs are only announced, never broadcast in full) |
| `Transactions` | Direct broadcast of small transactions to a subset of peers |
| `GetBlockHeaders`, `GetBlockBodies`, `GetReceipts` | Historical sync |

`eth/69` (EIP-7642) removes total difficulty from the handshake, reports available history range, and drops bloom from receipts on the wire, supporting history expiry.

`snap/1` serves contiguous ranges of accounts, storage and bytecode with proofs for snap sync.

### Fork ID (EIP-2124)
`CRC32(genesis hash || fork block/timestamps)` plus next fork; peers on incompatible forks disconnect quickly, which is why both sides must upgrade before a fork.

## Consensus Layer: Gossipsub

Topics are named `/eth2/<fork_digest>/<name>/ssz_snappy`.

| Topic | Content |
|---|---|
| `beacon_block` | Signed beacon blocks |
| `beacon_aggregate_and_proof` | Aggregated attestations |
| `beacon_attestation_{subnet}` | 64 attestation subnets; validators subscribe as needed |
| `sync_committee_{subnet}`, `sync_committee_contribution_and_proof` | Sync committee messages |
| `voluntary_exit`, `proposer_slashing`, `attester_slashing`, `bls_to_execution_change` | Operations |
| `blob_sidecar_{subnet}` | Deneb/Electra: full blobs with KZG proofs |
| `data_column_sidecar_{subnet}` | Fulu (PeerDAS): erasure-coded columns |

Gossipsub v1.1 adds peer scoring (penalizing invalid or late messages), flood publishing and mesh maintenance. Messages are validated before forwarding (signature, slot window, duplicates), so invalid data does not propagate.

### Req/Resp protocols
`/eth2/beacon_chain/req/<name>/<version>/ssz_snappy`, e.g. `status`, `goodbye`, `ping`, `metadata`, `beacon_blocks_by_range`, `beacon_blocks_by_root`, `blob_sidecars_by_range`, `data_column_sidecars_by_range`.

## PeerDAS (Fusaka, EIP-7594)

- Each blob is extended with Reed–Solomon erasure coding; the extended data matrix is split into 128 columns with cell-level KZG proofs.
- Nodes custody a subset of columns (a minimum of 4 custody groups for regular nodes; validators custody more as their attached stake grows, and supernodes custody all).
- Nodes sample columns from peers to be confident the full data is available without downloading every blob.
- Any 50% of columns allows reconstruction of the full data; supernodes and reconstructing nodes heal missing columns.
- Result: bandwidth per node grows much more slowly than total blob throughput, which allowed the BPO increases to 10/15 and 14/21 blobs per block.

## Operational Tuning

| Setting | Guidance |
|---|---|
| Peer counts | Defaults (EL around 50, CL around 100 depending on client) are sensible; raising them increases bandwidth |
| NAT | Forward ports or set `--nat extip:<ip>` (geth) / `--enr-address` (Lighthouse) so peers can dial you |
| Bandwidth | Validators need stable upload; blob/column traffic scales with BPO parameters |
| Subscribe-all-subnets | Only for infrastructure (relays, supernodes); much higher bandwidth |
| Static/trusted peers | Pin your own nodes (e.g. EL-to-EL in a cluster) with `--bootnodes` / `trusted-peers` |
| Clock | Run NTP/chrony; late messages are penalized by peer scoring |

### Diagnostics
```bash
# EL (geth console)
geth attach --exec 'admin.peers.length' /data/geth/geth.ipc
# CL Beacon API
curl -s localhost:5052/eth/v1/node/peer_count
curl -s localhost:5052/eth/v1/node/identity | jq .data.enr
curl -s localhost:5052/eth/v1/node/syncing
```
Monitor: peer count, inbound vs. outbound peers, gossip message validation failures, attestation inclusion delay, missed blocks.

## Security Considerations
- Eclipse attacks: an attacker monopolizing a node's peers can feed it a false view. Mitigate with inbound connectivity, diverse peers, and checkpoint sync from trusted sources.
- DoS: clients rate-limit req/resp and score peers; do not disable these limits.
- Privacy: validator IPs can be linked to validator indices via gossip timing; large operators use sentry nodes or distributed setups.

## Checklist
- [ ] EL and CL P2P ports reachable inbound
- [ ] NTP synchronized
- [ ] Peer counts and gossip health monitored
- [ ] Clients upgraded together so fork digests/IDs match
- [ ] Bandwidth budget reviewed after each BPO change
