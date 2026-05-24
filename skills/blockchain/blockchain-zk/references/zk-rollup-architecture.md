# ZK Rollup Architecture

## Overview

A ZK rollup is a Layer 2 scaling solution that bundles thousands of
transactions into a single batch and submits a succinct validity proof to
L1. The proof attests that the batch's state transition was executed
correctly. This reference covers the pipeline, data compression, security
mechanisms, and a comparison of major ZK rollup architectures.

---

## 1. Sequencer → Prover → Verifier Pipeline

### Sequencer

The sequencer is the first stage in the pipeline. It:

- Receives user transactions (from L2 RPC or L1 inbox).
- Orders transactions into a block (or mini-batch).
- Executes the state transition (EVM or custom VM).
- Produces an **execution trace** (witness) for the prover.

| Task | Responsibility |
|------|---------------|
| Tx ordering | FIFO, priority gas, or MEV-aware |
| State execution | Stateless (no L1 write) until proven |
| Witness generation | Outputs pre/post state for prover |
| L1 submission | Submits batch commitments (tx hashes, state roots) |

### Prover

The prover is computationally the most expensive component. It:

- Consumes the execution trace and circuit description.
- Runs the constraint generation and proof creation.
- May use GPU, FPGA, or ASIC acceleration.

| Prover Type | Hardware | Speed (1M constraints) | Cost |
|-------------|----------|------------------------|------|
| WASM (snarkjs) | CPU-only | ~30 s | Free |
| Native (rapidsnark) | CPU | ~2 s | Free |
| GPU (CUDA) | NVIDIA A100 | ~100 ms | $1–5/hr |
| FPGA | Xilinx | ~50 ms | $5–10/hr |
| ASIC | Custom | ~10 ms | High NRE |

### Verifier

The verifier is a smart contract on L1. It:

- Checks the zk-SNARK/STARK proof against the batch commitment.
- Updates the L2 state root if the proof validates.
- Processes L1→L2 messages (deposits, forced txs).

```
         ┌──────────┐    Execution Trace    ┌──────────┐
  Txs ──►│Sequencer  │──────────────────────►│  Prover  │
         │           │                       │          │
         │  (Execute)│    State Diff + Root   │ (Prove)  │
         └─────┬─────┘                       └────┬─────┘
               │ Batch Commitment                  │ Proof
               ▼                                   ▼
         ┌─────────────────────────────────────────────┐
         │             L1 Verifier Contract            │
         │   - verify(proof, public_inputs) → bool      │
         │   - updateStateRoot(newRoot)                  │
         └─────────────────────────────────────────────┘
```

---

## 2. Compression Techniques

### Batch Submission Data

Every batch submission to L1 includes:

- **State root** after batch (32 B).
- **Batch hash** (32 B) or concatenated tx hashes.
- **Public inputs** to the proof (varies, ~100–500 B).
- **Proof** (~200 B Groth16 to ~4 kB Halo2).

Optimization goal: minimize bytes posted to L1 calldata.

### Calldata Optimization

| Technique | Savings | How |
|-----------|---------|-----|
| Tx compression | ~40% | Replace 20 B addresses with 4 B indices |
| Tx aggregation | ~70% | Bundle 256 txs into one batch update |
| State diff publishing | ~80% | Only account/storage deltas, not full state |
| EIP-4848 blob data | ~90% | Use blob-carrying transactions (temporary data) |
| Proto-danksharding | ~95% | 128 kB blobs per block, ~18 day expiry |

### EIP-4848 / Blob Transactions

As of the Dencun upgrade (EIP-4844, March 2024), rollups can post batch
data to **blobs** instead of calldata. Blobs are cheaper (target ~0.001
ETH per blob vs. ~0.01+ ETH for calldata equivalent) and are automatically
pruned after ~18 days.

```
Pre-4844:  calldata = 0.01 ETH per batch (permanent storage)
Post-4844: blob      = 0.001 ETH per batch (ephemeral storage)
```

### Batch Compression Pipeline

```
N txs
  │
  ▼  (Signature aggregation)
N aggregated sigs → 1 BLS sig (48 B)
  │
  ▼  (Address compression)
N 20-byte addresses → N 4-byte indices into account table
  │
  ▼  (State diff)
Full state writes → key-value diffs with RLE encoding
  │
  ▼  (Blob payload)
Compressed batch → blob (max 128 kB)
```

---

## 3. Security Mechanisms

### Forced Transactions

Users can bypass the sequencer by submitting transactions directly to the
L1 rollup contract. The sequencer **must** include these in the next batch
or face a timeout penalty.

```
User → L1 contract.forceTransaction(tx)
                 │
                 ▼
            Sequencer deadline (e.g., 24h)
                 │
            ┌────┴────┐
            ▼         ▼
        Included   Not included
        in batch   → user can
                   withdraw to L1
                   (escape hatch)
```

### Escape Hatches

If the sequencer goes offline or becomes malicious:

1. **Force inclusion period passes** (typically 1–7 days).
2. Users submit Merkle proofs of their L2 balances to the L1 contract.
3. L1 contract releases funds to the user on L1.
4. Sequencer loses bond (slashing).

```
    ┌──────────────┐
    │ L1 Escrow    │
    │ Contract     │
    │              │
    │ Balance[user]│◄── User submits Merkle proof
    │ = x ETH      │    of L2 balance
    └──────┬───────┘
           │
           ▼
        User sends x ETH
        from L1 escrow to own L1 address
```

### L1→L2 Messaging

```
User (L1)                   Bridge Contract               L2
   │                             │                        │
   │── deposit(10 ETH)──────────►│                        │
   │                             │── emit DepositEvent───►│
   │                             │                        │
   │                             │   Sequencer picks up   │
   │                             │   event, mints 10 ETH │
   │                             │   on L2                │
   │                             │                        │
```

The L1→L2 message is a **cross-chain event** that the sequencer must
include in the next batch. Sequencer's batch submission includes the
message inclusion proof.

### L2→L1 Withdrawal Flow

```
L2 User                         L2 State                        L1
   │                              │                              │
   │── withdraw(5 ETH)──────────►│                              │
   │                              │─ Update state root           │
   │                              │─ Emit Withdrawal event       │
   │                              │                              │
   │                              │  Batch proof submitted ─────►│
   │                              │                              │─ Verify proof
   │                              │                              │─ Update root
   │                              │                              │
   │── requestFinalize(proof) ─────────────────────────────────►│
   │                              │                              │─ Verify Merkle proof
   │                              │                              │  (tx inclusion in
   │                              │                              │   L2 state tree)
   │                              │                              │─ Release 5 ETH
   │                              │                              │
   │◄────────────────────────────────────────────────────────────│  ETH arrives
```

The withdrawal flow requires:

1. **Initiate** on L2 (burn tokens or lock in bridge).
2. **Batch inclusion** — the tx must be proven in a valid batch.
3. **Challenge period** — usually 1–7 days (allows fraud proof for
   non-ZK-rollups; for ZK rollups this is mainly for liveness).
4. **Finalize** on L1 — user submits a Merkle proof of the L2 withdrawal
   event inclusion in the finalized state root.
5. **Release** — L1 contract releases the tokens.

---

## 4. Architecture Comparison

### zkSync Era (Boojum)

```
Layer:          L1 → L2 Bridge → Sequencer → Prover (GPU) → L1 Verifier
Proof system:   STARK (Boojum) → SNARK wrap (Groth16)
State tree:     Sparse Merkle Tree (account-based)
Withdrawal:     24h finality
Compression:    State diffs + blob transactions
Sequencer:      Centralized (zkSync), decentralized planned
Prover:         Boojum GPU cluster
```

### StarkNet

```
Layer:          L1 → L2 Bridge → Sequencer → Prover → SHARP → L1 Verifier
Proof system:   STARK (Cairo AIR) → SNARK wrap
State tree:     Patricia Merkle (ordered)
Withdrawal:     ~2–4h finality (L1 reorg window)
Compression:    Execution trace diffs + blob
Sequencer:      Centralized (StarkWare), decentralized planned
Prover:         Stone / Sharingan (CPU + GPU)
SHARP:          Batching multiple proofs into one aggregate STARK
```

### Scroll

```
Layer:          L1 → L2 Bridge → Sequencer → Prover (PSE zkEVM) → L1 Verifier
Proof system:   PLONKish (custom) → Groth16 aggregation
State tree:     Hexary Patricia Trie (Ethereum-native)
Withdrawal:     ~30 min finality (prover time + aggregation)
Compression:    Full tx data + state diffs
Sequencer:      Centralized → decentralized (planned)
Prover:         GPU-accelerated, multi-node
```

### Comparison Table

| Feature | zkSync Era | StarkNet | Scroll |
|---------|------------|----------|--------|
| zkEVM Type | Type 3 | Type 4 (Cairo) | Type 1 |
| Proof system | STARK + Groth16 wrap | STARK + SNARK wrap | PLONKish + Groth16 |
| Prover time | ~3 min (GPU) | ~5 min (CPU) | ~30 min (GPU) |
| Finality (L1) | ~15 min | ~2h | ~1h |
| L1 gas per batch | ~300k | ~280k | ~400k |
| TPS (peak) | ~100 | ~200 | ~50 |
| State tree | SMT | Patricia | Hexary |
| Tx cost ($) | ~$0.01 | ~$0.002 | ~$0.05 |
| Trusted setup | Yes (Boojum) | No | Yes |
| Decentralized seq. | Planned | Planned | Planned |
| Escape hatch | 7-day | 7-day | 7-day |

## 5. Common Attack Vectors

| Attack | Mitigation |
|--------|-----------|
| Sequencer censorship | Forced tx mechanism |
| Prover stall | Slashing + escape hatch |
| Reorg attack | L1 finality window |
| State blowup costs | Storage rent / state expiry |
| Bad proof generation | Audit circuits, multiple provers |
| MEV extraction | Sequencing auction (PBS) |

## References

- ZK Rollup design patterns: https://blog.matter-labs.io/zk-rollup-design-3ac235cb9c69
- Scroll architecture: https://scroll.io/design
- StarkNet arch: https://docs.starknet.io/documentation/architecture_and_concepts/
- zkSync Era docs: https://era.zksync.io/docs/
- EIP-4844: https://eips.ethereum.org/EIPS/eip-4844
