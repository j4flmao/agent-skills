# Layer-2 Scaling

## L2 Taxonomy

```
Layer 2
├── Rollups (data on L1)
│   ├── Optimistic Rollups
│   │   ├── Optimism (OP Stack)
│   │   ├── Arbitrum (Nitro)
│   │   ├── Base (OP Stack fork)
│   │   └── Blast (OP Stack fork)
│   └── ZK Rollups
│       ├── ZKsync (zkEVM)
│       ├── StarkNet (STARK-based)
│       ├── Scroll (zkEVM)
│       ├── Linea (zkEVM)
│       └── Polygon zkEVM
├── Validium (data off L1)
│   ├── Immutable X (StarkEx)
│   ├── Sorare (StarkEx)
│   └── DeGate
└── Plasma (limited, mostly deprecated)
```

## Optimistic Rollups

### Optimism OP Stack

Architecture:

```
User Tx ──► Sequencer ──► Op Node (EL) ──► Op Batch Submitter ──► L1 (Ethereum)
               │                │
               ▼                ▼
           L2 State         L1Inbox (canonical chain)
```

| Component | Role |
|-----------|------|
| **Sequencer** | Orders transactions, produces L2 blocks, provides immediate soft confirmations |
| **Op Node** | EL client (op-geth, op-erigon), processes blocks, maintains L2 state |
| **Op Batch Submitter** | Compresses L2 blocks → calldata/blobs on L1 |
| **L1Inbox** | L1 contract recording L2 batch data |
| **L2OutputOracle** | L1 contract storing L2 state roots |
| **Fault Proof** | Dispute resolution via interactive fraud proofs (Cannon) |

### Fault Proofs (Cannon, op-challenger)

```
Dispute Game:
  1. Assertor posts L2 state root with bond
  2. Challenger disputes within challenge period (7 days on mainnet)
  3. Binary search: bisect execution trace to find disagreement point
  4. Single instruction execution: run in MIPS emulator (Cannon)
  5. If assertor wrong: bond slashed, challenger rewarded
```

Challenge period: 7 days (mainnet), ~1 hour (testnet/op-sepolia).

### Arbitrum Nitro

| Feature | Arbitrum Nitro |
|---------|---------------|
| **Virtual machine** | AVM → WAVM (WebAssembly-based) |
| **Execution** | Geth core (standard EVM) inside WAVM |
| **Proving** | Interactive fraud proof via WAVM |
| **Gas model** | L1 calldata cost + L2 execution cost |
| **Sequencer** | Centralized (fast confirm), forced inclusion via L1 |

Stylus (upcoming): WASM-based contracts in Rust/C/C++ — 10-100x faster than EVM.

```
User Tx ──► Sequencer ──► Nitro Node ──► Inbox (L1)
               │               │
               ▼               ▼
           L2 State        L1 Messages
```

## ZK Rollups

### ZKsync (Era)

| Component | Description |
|-----------|-------------|
| **zkEVM** | Proves EVM equivalence via Bellman/KZG-based proof system |
| **Boojum** | Upgrade from Bellman to custom GPU-friendly proof system |
| **LLVM-based compiler** | Solidity → Yul → LLVM IR → zkEVM bytecode |
| **Prover** | GPU cluster generating SNARK proofs |
| **Validator** | L1 contract verifying proofs |

Architecture:

```
User Tx ──► Sequencer ──► zkEVM (execute) ──► Prover ──► Validator (L1)
               │                │                   │
               ▼                ▼                   ▼
           L2 State          Proof gen (30s–5m)   L1 verification
```

Transaction flow:
1. User sends tx to sequencer
2. Sequencer orders txs, executes in zkEVM
3. Batcher collects txs, creates batch commitment
4. Prover generates SNARK proof of batch correctness
5. Validator contract verifies proof on L1 (~400k gas)

### StarkNet

| Component | Description |
|-----------|-------------|
| **Cairo VM** | Native VM (not EVM) — provable execution |
| **SHARP** (Shared Prover) | Aggregates proofs across StarkNet + StarkEx + app chains |
| **STARK proofs** | Transparent (no trusted setup), post-quantum secure |
| **Cairo language** | Custom language, compiler generates proof artifacts |
| **KZG → FRI** | FRI-based polynomial commitment (vs KZG) |

Proof sizes:

| Proof System | Size | Verification Gas | Trusted Setup |
|-------------|------|------------------|---------------|
| SNARK (Groth16) | ~200 bytes | ~250k–400k | Yes (ceremony) |
| STARK (FRI) | ~100–200 KB | ~2–5M | No |

## Validium

**Data Availability:** off-L1 (vs rollup which posts data to L1 calldata/blobs).

| Aspect | Rollup | Validium |
|--------|--------|----------|
| Data on L1 | Yes (calldata or blobs) | No (DA committee or external) |
| Security | L1 security | Economic + committee security |
| Throughput | Limited by L1 DA capacity | Higher (unlimited by L1) |
| Trust | Trust-minimized | Trust DA committee |
| Withdrawal | Permissionless | DA committee permissioned |
| Example | Optimism, Arbitrum | Immutable X, DeGate |

## Data Availability Layers

### EigenDA

- **Restaking**: L1 validators restake ETH to secure DA layer
- **Dispersal**: Blob distributed to operators, KZG commitments verify availability
- **Verification**: Light nodes sample random chunks, check KZG proofs
- **Security**: Economic (slashing if operator withholds data)
- Integration: rollup posts blob commitments to L1, actual data to EigenDA

### Celestia

- **Modular DA**: Dedicated DA blockchain (Cosmos SDK)
- **Namespace Merkle Trees (NMT)**: Each rollup gets a namespace — only downloads relevant data
- **Light nodes**: Download block headers, sample erasure-coded data
- **Security**: Tendermint consensus (validator set)
- **Data root**: L1 bridge contract verifies Celestia state root

### Avail

- **Polygon-backed**: App-chain with dedicated validator set
- **Kate commitments + erasure coding**: For DAS
- **Faster finality**: ~3s block time, 1 epoch finality

## Comparison: L2 Types

| Metric | Optimistic | ZK Rollup | Validium |
|--------|-----------|-----------|----------|
| **Finality** | ~7 days (challenge) | Minutes (proof) | Minutes (validity proof) |
| **Security** | L1 + game theory | L1 + math (cryptographic) | L1 + economic |
| **Throughput** | ~10–50 TPS (L1-limited) | ~2k–5k TPS (prover-limited) | ~10k+ TPS |
| **Cost** | ~$0.01–0.10 | ~$0.02–0.20 | ~$0.001–0.01 |
| **Dev experience** | Solidity-native | EVM-compatible (or custom) | Solidity (some) |
| **Withdrawal delay** | 7 days (mainnet) | ~1 hour | Quick (DA-dependent) |
| **Trust assumptions** | Honest verifier | Proof system soundness | DA committee honest |
| **Maturity** | Production (2021+) | Production (2023+) | Production (2021+) |

## Cross-Chain Bridges Specific to L2s

### Native Bridge (Canonical)

- L1 contract holds L2 state roots
- L1→L2: deposit ETH/token via `L1StandardBridge`
- L2→L1: initiate withdrawal on L2, wait for finality (or proof)
- Assets: ETH, ERC-20 (canonical)

### L2 Messaging

```solidity
// Optimism L2→L1 message
function sendMessage(address target, bytes memory message) external {
    L2CrossDomainMessenger.sendMessage(target, message);
    // Sequencer includes in batch → L1 executes after challenge period
}
```

### Third-Party Bridges

| Bridge | Type | Trust |
|--------|------|-------|
| Across | Optimistic oracle | UMA optimistic oracle |
| Hop | AMM + canonical bridge | Liquidity providers |
| Stargate | Liquidity network | LayerZero + oracle |
| Synapse | Liquidity pool | Relayers + validators |

### Cross-Chain Intents

- **UniswapX**: User signs intent, filler executes across L2s, filler competes on execution
- **Across+**: Intents-based bridging with filler auctions
- **ERC-7683**: Cross-chain intent standard
