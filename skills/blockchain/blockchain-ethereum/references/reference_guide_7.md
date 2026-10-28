# Ethereum Sync Modes and Light Clients

How Ethereum nodes catch up with the chain (checkpoint sync, snap sync, staged sync, full sync, archive) and how light clients verify the chain with sync committees instead of downloading it. Includes trust assumptions and setup commands.

## Two Layers Sync Separately

```
CL syncs the beacon chain (from a checkpoint) -> tells EL the head via Engine API
EL syncs execution state/history to that head (snap/staged sync), then follows block by block
```
The EL reports `SYNCING` to `engine_newPayload` until it has the state; the CL keeps following the head optimistically ("optimistic sync") and validators must not attest to unverified payloads.

## Consensus Layer: Checkpoint Sync

Weak subjectivity: a new node cannot safely sync proof-of-stake from genesis alone because old validator keys could create alternative histories. Nodes start from a recent finalized state.

```bash
lighthouse bn --network mainnet \
  --checkpoint-sync-url https://<trusted-beacon-endpoint> \
  --execution-endpoint http://127.0.0.1:8551 --execution-jwt /secrets/jwt.hex
```
- Use a provider you trust, or several, and compare the finalized block root with another source (block explorers, a friend's node, community checkpoint lists).
- Backfill of historical beacon blocks happens in the background; it can be disabled on some clients when history is not needed.

## Execution Layer Sync Modes

| Mode | Clients | How | Result |
|---|---|---|---|
| Snap sync | geth (default), Nethermind (snap), Besu (snap/checkpoint) | Download headers/bodies/receipts, fetch flat state ranges with proofs, then heal the trie | Full node with recent state |
| Staged sync | reth, Erigon | Pipeline stages: headers, bodies, sender recovery, execution, hashing, merkle, indexes | Full or archive node; executes all blocks |
| Full sync | Most clients | Execute every block from genesis, keeping recent state | Slow; verifies everything |
| Archive | Erigon, reth, geth (path-based archive in newer versions), Nethermind | Keep all historical state | Historical `eth_call`, traces at any block |

History expiry: clients increasingly drop pre-Merge bodies and receipts by default (EIP-4444 partial expiry); archive and indexing use cases should confirm history retention flags or use era1 files/Portal Network.

## Hardware Expectations (mainnet, approximate; check client docs)
| Node | Disk | Notes |
|---|---|---|
| Full EL + CL | 2 TB+ fast NVMe SSD recommended | Growth continues; plan for 4 TB |
| Archive (reth/Erigon) | Several TB | Larger with traces/indexes |
| RAM | 16–32 GB | More helps caches |
| Network | Stable broadband, unmetered | Upload matters for validators |
HDDs and network-attached disks are generally too slow for EL state access.

## Light Clients (Altair Sync Committees)

A sync committee of 512 validators is selected every 256 epochs (about 27 hours). Members sign each slot's head block root. Light clients:
1. Start from a trusted checkpoint (block root) and fetch a `LightClientBootstrap` containing the current sync committee and a Merkle branch to the state root.
2. Follow `LightClientUpdate` / `LightClientFinalityUpdate` / `LightClientOptimisticUpdate` messages, verifying the aggregate BLS signature of more than 2/3 of the committee (supermajority policy is client-defined; the spec requires at least 1/3 participation for updates, and implementations commonly prefer supermajority).
3. Rotate to the next committee using a Merkle proof of `next_sync_committee`.
4. Obtain the execution payload header (`execution` field, Capella+) and therefore the execution `stateRoot`.
5. Verify RPC responses with `eth_getProof` against that state root.

Beacon API endpoints for light clients:
```
GET /eth/v1/beacon/light_client/bootstrap/{block_root}
GET /eth/v1/beacon/light_client/updates?start_period=..&count=..
GET /eth/v1/beacon/light_client/finality_update
GET /eth/v1/beacon/light_client/optimistic_update
```

### Trust model
- Light clients trust that the sync committee is honest (economic assumption; sync committee misbehavior is not slashable in the current spec, which is a known weakness).
- They are much safer than blindly trusting one RPC, but weaker than a full node.

### Implementations
| Project | Notes |
|---|---|
| Helios (a16z, Rust) | Local verifying RPC proxy; wallets point at `localhost` instead of a remote RPC |
| Lodestar light client (TypeScript) | Browser/Node.js usage; `@lodestar/light-client` and prover packages |
| Nimbus light client | Can drive an EL in light mode |
| Portal Network clients (Trin, Fluffy, Shisui, Ultralight) | Serve history, state and beacon light-client data over a DHT |

```bash
helios ethereum --execution-rpc $UNTRUSTED_RPC_URL \
  --consensus-rpc https://<beacon-light-client-endpoint> \
  --checkpoint 0x<recent finalized block root>
# then use http://127.0.0.1:8545 as a verifying RPC
```
Check current flags with `helios ethereum --help`; options change between releases.

## Optimistic Sync and Safety
- While the EL is syncing, the CL imports blocks optimistically and marks them unverified.
- Validator clients must not attest or propose on optimistic heads; clients enforce this automatically.
- RPC consumers should check `eth_syncing` and CL `/eth/v1/node/syncing` (`is_optimistic`, `el_offline`) before trusting responses.

## Common Sync Problems
| Symptom | Likely cause |
|---|---|
| EL stuck "waiting for beacon client" | CL not connected to Engine API (JWT mismatch, wrong URL) |
| Snap sync never finishes healing | Slow disk (IOPS); insufficient peers |
| CL checkpoint sync fails | Endpoint does not serve finalized state for this fork; wrong network |
| Frequent "head behind" | Clock drift, bandwidth saturation, overloaded host |

## Checklist
- [ ] Checkpoint from a trusted, cross-checked source
- [ ] NVMe storage sized with headroom
- [ ] Sync status and optimistic flags checked before serving RPC
- [ ] Light-client or multi-RPC verification for wallets/bridges that cannot run full nodes
- [ ] History retention settings match indexing needs
