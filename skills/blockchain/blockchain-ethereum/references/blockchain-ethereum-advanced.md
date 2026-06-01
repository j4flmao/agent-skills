# Blockchain Ethereum Advanced Topics

## EVM Deep Dive

### EVM Memory Model
**Stack**: 1024-element max, 256-bit words. **Memory**: Linear byte array, expandable (3 gas per word expansion). **Storage**: Persistent 256-bit key-value store, 32-byte slots. **Calldata**: Read-only input data.

### EOF (Ethereum Object Format)
Proposed EVM upgrade: separates code from data, adds section-based structure, enables static jumps, removes CODECOPY/CODESIZE gas issues. EOF contracts have preamble, code sections, data section. Backward-incompatible — only new EOF contracts.

### Precompiled Contracts
Addresses 0x01-0x0F are precompiled (not EVM, native implementation):
- 0x01: ecrecover (ECDSA public key recovery, 3000 gas)
- 0x02: SHA-256 (60 + 12/word gas)
- 0x03: RIPEMD-160 (600 + 120/word gas)
- 0x05: BigInt modular exponentiation (variable, complex pricing)
- 0x06-08: BN254 pairing (curve operations for ZK proofs)

## PBS and MEV

### MEV-Boost
Out-of-protocol proposer-builder separation. Validators run mev-boost middleware. Relays forward the highest-bid block from builders. 90%+ of validators use MEV-Boost. Non-consensus (relay can censor without penalty).

### ePBS (In-Protocol PBS)
Proposed in-protocol PBS: proposer commits to a block, builders bid for execution rights, proposer includes winning bid. No relays, no trust assumptions. Still in research (Ethereum Pectra+).

### FOCIL (Forced Inclusion Lists)
Validators publish a list of transactions that must be included in the next block. Prevents builder censorship. Each validator's inclusion list is independent. The winning builder must include transactions from all inclusion lists.

## L2 Scaling

### Rollup Taxonomy
| Type | Fraud Proof | Validity Proof | Data on L1 |
|---|---|---|---|
| Optimistic rollup | Yes (7d challenge) | No | Calldata/blobs |
| ZK rollup | No | Yes (ZK proof) | Calldata/blobs |
| Validium | No | Yes | Off-chain (DAC) |
| Plasma | Yes (exit game) | No | Commits only |

### Based Rollups
Rollups that use L1 proposers as their sequencer. No separate sequencer set. L1 proposers include L2 transactions in their L1 blocks. Inherits L1 liveness and decentralization. Challenge: latency (L1 block time = L2 block time).

### Preconfirmations
Before a transaction is included in an L1 block, a preconfirmation service guarantees execution at a specific future slot. User receives a signed commitment. If the proposer doesn't include it, the preconfirmer is slashed. Enables sub-second user experience on L2s.
