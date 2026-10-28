# Light Clients and SPV Verification

How clients verify chain data without running a full node: Bitcoin SPV and compact block filters, Ethereum's sync-committee light client, and state proofs. Covers the trust assumptions of each, so you can pick the right one for wallets, bridges and embedded devices.

## Spectrum of Verification

| Mode | Verifies | Trusts | Resource cost |
|------|----------|--------|---------------|
| Full node | Every rule, all state | Nothing beyond code and genesis | High |
| Light client (header + proofs) | Header chain + Merkle proofs for queried data | Majority of work/stake behaves honestly; at least one honest peer | Low |
| Trusted RPC | Nothing | The RPC operator | Minimal |

A light client is a large step up from a trusted RPC: a dishonest server can withhold data but cannot forge it without breaking the consensus assumption.

## Bitcoin

### SPV (headers + Merkle proofs)
1. Download the 80-byte header chain; verify PoW and difficulty retargeting, pick most cumulative work.
2. For a transaction of interest, obtain a Merkle branch from the tx to the header's `merkleRoot`.
3. Count confirmations as depth below the tip.

SPV proves inclusion, not validity: a light client cannot see whether the block's other rules were followed and relies on miners enforcing them.

### BIP37 bloom filters (avoid)
Clients sent bloom filters of their addresses to peers. This leaked wallet addresses and let peers burden servers; Bitcoin Core disables serving them by default (`peerbloomfilters=0`).

### BIP157/158 compact block filters (current)
Servers compute a Golomb-coded set filter per block covering output scripts and spent outpoints' scripts. Clients:

```text
1. sync headers
2. sync filter headers (BIP157 chain of filter hashes) from several peers
3. download filters, test locally against own scripts
4. fetch full blocks only for matches
```

Privacy improves because the server never learns what the client is looking for. Enable serving in Bitcoin Core:

```ini
# bitcoin.conf
blockfilterindex=1
peerblockfilters=1
```

Mismatching filter headers between peers signal a lying peer; fetch the block and compute the filter to settle it.

### Electrum-style servers
Electrum protocol servers (ElectrumX, Fulcrum, electrs) index by script hash. Lightweight and fast, but the server learns the client's addresses; run your own server for privacy.

## Ethereum

### Sync-committee light client (Altair onward)
- A sync committee of 512 validators is selected every 256 epochs (about 27 hours).
- The committee signs each beacon block header with an aggregated BLS signature.
- A light client that knows the current committee verifies the aggregate signature and follows the header chain; each `LightClientUpdate` also carries a Merkle proof of the next committee.

```text
bootstrap: trusted checkpoint (weak subjectivity) → LightClientBootstrap(current_sync_committee + proof)
loop:      LightClientUpdate / FinalityUpdate / OptimisticUpdate
           verify: participation ≥ 2/3 for finality acceptance, BLS aggregate, Merkle branches
```

The bootstrap checkpoint must come from a trusted source (your own node, multiple providers, or a social checkpoint), because PoS has no objective "most work" rule for a fresh client.

### Execution data via proofs
With a verified beacon header you get the execution payload's `stateRoot`. Then query untrusted RPC and verify:

| Data | Proof |
|------|-------|
| Account balance/nonce/code hash | `eth_getProof` account proof against `stateRoot` |
| Storage slot | `eth_getProof` storage proof against the account's `storageRoot` |
| Transaction / receipt | Trie proof against `transactionsRoot` / `receiptsRoot` |
| Call result | Re-execute locally with proved state (what Helios does) |

```bash
# fetch account + storage proof at a specific block
cast proof 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  0x0000000000000000000000000000000000000000000000000000000000000000 \
  --block finalized --rpc-url "$RPC_URL"
```

Verify the returned account RLP against the trusted `stateRoot` with a Merkle-Patricia proof verifier (e.g. `@ethereumjs/trie` `verifyProof`, `alloy-trie`, or the client library you use).

### Implementations
- Helios (Rust): sync-committee light client exposing a local JSON-RPC that verifies data from an untrusted RPC.
- Lodestar provides a TypeScript light client and the `@lodestar/prover` verified-provider wrapper.
- Consensus clients serve the light client protocol (`/eth/v1/beacon/light_client/*` REST endpoints) where enabled.

## Light Clients in Bridges and Contracts

On-chain light clients verify another chain's headers inside a smart contract:

| Approach | Notes |
|----------|-------|
| Direct header verification | Feasible for cheap verification (e.g. Tendermint/CometBFT ed25519 commits in IBC) |
| ZK light clients | Prove sync-committee signature verification in a SNARK; verify the SNARK on-chain |
| Multisig/oracle attestations | Not a light client; trust is the signer set |

IBC uses light clients for Cosmos chains; bridge security depends on whether the verifier is a real light client or a committee of signers.

## Threats and Mitigations

| Threat | Mitigation |
|--------|------------|
| Eclipse (all peers malicious) | Multiple independent peers/providers; compare tips |
| Stale checkpoint (PoS) | Bootstrap within the weak subjectivity period; refresh from trusted sources |
| Data withholding | Retry other peers; light clients detect absence, not forgery |
| Address privacy leakage | Compact filters or own server, not bloom filters/public Electrum |

## Checklist

- [ ] Trust model chosen consciously (full, light, trusted RPC)
- [ ] Bitcoin: compact block filters, cross-check filter headers across peers
- [ ] Ethereum: trusted bootstrap checkpoint, verify BLS aggregate and Merkle branches
- [ ] Every RPC response used for value decisions verified with a proof
- [ ] Bridges: verifier type documented (light client vs signer set)
