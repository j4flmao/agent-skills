---
name: blockchain-bitcoin
description: >
  Use this skill when asked about Bitcoin internals, Bitcoin Core, Bitcoin Script, Taproot, mining, Proof of Work, Lightning Network, BIP standards, Ordinals, BRC-20, Runes, Bitcoin L2s (Stacks, RSK, Babylon), and Bitcoin protocol development. Languages: C++, Rust, Python, Clarity. Covers Bitcoin Core C++ implementation (validation, mempool, wallet, P2P), Bitcoin Script opcodes and programming (P2PKH, P2SH, P2WSH, Taproot MAST), token protocols (Ordinals inscriptions, BRC-20, Runes), PoW mining mechanics (SHA-256d, difficulty adjustment, ASICs, Stratum), L2 scaling (Lightning Network, Stacks Clarity, RSK EVM, Babylon staking), and BIP standards (BIP-32/39/44/84/86/174/340/341/342). Do NOT use for: Ethereum protocol (use blockchain-ethereum), smart contract development (use blockchain-application), or general blockchain patterns (use blockchain-patterns).
version: "1.1.0"
author: "j4flmao"
license: "MIT"
tags: [blockchain, bitcoin, pow, mining, phase-blockchain]
---

# Blockchain Bitcoin

## Purpose
Guide Bitcoin protocol engineering, Bitcoin Core development, Bitcoin Script programming, mining infrastructure, Lightning Network implementation, and Bitcoin L2 ecosystem. Covers the full stack from consensus protocol to application layer.

## Agent Protocol

### Trigger
"Bitcoin", "Bitcoin Core", "bitcoind", "Bitcoin Script", "BTC script", "Taproot", "Bitcoin opcode", "P2PKH", "P2SH", "P2WSH", "mining Bitcoin", "Proof of Work Bitcoin", "SHA-256d", "ASIC mining", "Stratum", "Lightning Network", "LN", "HTLC", "onion routing", "channel", "Ordinals", "inscription", "BRC-20", "Runes", "Bitcoin NFT", "Bitcoin L2", "Stacks", "Clarity", "RSK", "Rootstock", "Babylon", "Bitcoin staking", "BIP standard", "BIP-32", "BIP-39", "BIP-44", "BIP-340", "BIP-341", "BIP-342", "PSBT", "Bitcoin mempool", "UTXO", "Bitcoin C++", "Bitcoin protocol"

### Input Context
- Layer (consensus/wallet/L2/application)
- Bitcoin Core version for implementation reference
- Script requirements (Taproot vs legacy, opcode set)
- Security model (trust assumptions, finality requirements)
- Performance requirements (TPS, confirmation time, cost)

### Output Artifact
Technical specification covering: scope, architecture, key mechanisms, implementation approach, and L2 integration where applicable.

### Response Format
1. **Scope**: consensus layer vs wallet vs L2 vs application protocol
2. **Architecture**: Bitcoin Core component breakdown, data flow, key source files
3. **Key mechanisms**: PoW difficulty, Script execution, UTXO set management
4. **Implementation**: C++ patterns, data structures, optimization techniques
5. **Layer 2**: Lightning Network architecture, channel lifecycle, or L2 integration

### Completion Criteria
- Consensus rules correctly referenced from Bitcoin Core source (src/validation.cpp)
- Script operations specify witness vs legacy, opcode restrictions
- Security model accounts for probabilistic finality (6+ confirmations)
- Implementation respects Bitcoin's conservative upgrade philosophy
- Layer 2 design addresses griefing and channel force-close scenarios

### Max Response Length
5000 tokens

## Decision Trees

### Protocol Layer Decision
```
Bitcoin-related task:
├── Consensus protocol?
│   ├── Block validation → src/validation.cpp (CheckBlock, ConnectBlock)
│   ├── Transaction validation → src/consensus/tx_verify.cpp
│   ├── PoW verification → src/pow.cpp (CheckProofOfWork, GetNextWorkRequired)
│   └── Mempool policy → src/txmempool.cpp (accept limits, replace-by-fee)
├── Wallet operations?
│   ├── Key management → BIP-32/39/44/84/86 derivation paths
│   ├── Transaction building → src/wallet/wallet.cpp (CreateTransaction)
│   ├── PSBT → BIP-174 (Partially Signed Bitcoin Transaction)
│   └── Descriptors → Output script descriptors (BIP-380+)
├── Layer 2?
│   ├── Lightning Network → HTLC, channel lifecycle, routing
│   ├── Stacks → Clarity smart contracts, PoX consensus
│   ├── RSK → EVM-compatible sidechain with merge mining
│   └── Babylon → Bitcoin staking, restaking security
└── Token/application protocol?
    ├── Ordinals → Inscription (envelope OP_FALSE OP_IF OP_PUSH ... OP_ENDIF)
    ├── BRC-20 → JSON inscription-based token standard
    └── Runes → UTXO-based token protocol by Casey Rodarmor
```

### Script Standard Decision
```
Output script type:
├── Pay-to-Public-Key-Hash (P2PKH): Legacy, address starts with 1
├── Pay-to-Script-Hash (P2SH): Multi-sig, address starts with 3
├── Pay-to-Witness-Public-Key-Hash (P2WPKH): SegWit, address starts with bc1q
├── Pay-to-Witness-Script-Hash (P2WSH): SegWit multi-sig, bc1q
├── Pay-to-Taproot (P2TR): Taproot, address starts with bc1p
│   ├── Single key → Key path spend (default, cheapest)
│   └── Script tree → Script path spend via MAST tree
└── Recommendation: Always prefer P2TR (Taproot) for new addresses
```

## Bitcoin Script Patterns

### Taproot Key Path Spend
```c++
// Key path: Schnorr signature with internal pubkey
// No script revealed on-chain — looks like any other Taproot spend
// Witness: <signature>
```

### Taproot Script Path Spend
```c++
// Script tree MAST structure:
//    root = Taptweak(internal_key, merkle_root)
//    leaf_1: <pubkey> OP_CHECKSIG
//    leaf_2: OP_IF <pubkey> OP_CHECKSIG OP_ELSE <timelock> OP_CHECKSEQUENCEVERIFY OP_DROP <pubkey> OP_CHECKSIG OP_ENDIF
//
// Witness: <script> <control_block> <signature>
// Control block reveals: leaf version, merkle proof to root
```

### HTLC (Hashed TimeLock Contract) for Lightning
```c++
// HTLC Script (simplified):
// OP_IF
//     <redeem_pubkey> OP_CHECKSIG  // Payment preimage
// OP_ELSE
//     <timeout> OP_CHECKSEQUENCEVERIFY OP_DROP
//     <refund_pubkey> OP_CHECKSIG  // Timeout refund
// OP_ENDIF
```

## Mining & PoW Mechanics

### Difficulty Adjustment
```python
# Bitcoin difficulty: adjusts every 2016 blocks (~2 weeks)
# Target = previous_target * actual_time_span / expected_time_span (20160 min)
# Clamped to [1/4, 4] of previous difficulty
def calculate_difficulty(previous_target, actual_timespan):
    expected = 2016 * 10 * 60  # 2016 blocks * 10 min in seconds
    actual_timespan = clamp(actual_timespan, expected // 4, expected * 4)
    new_target = previous_target * actual_timespan // expected
    return new_target
```

### SHA-256d Block Hashing
```c++
// Block hash = SHA-256(SHA-256(block_header))
// block_header: version (4B) + prev_block (32B) + merkle_root (32B) + time (4B) + bits (4B) + nonce (4B)
// ASIC-optimized: ~100+ TH/s for modern miners
```

## Lightning Network Channel Lifecycle
1. **Open**: Funding transaction (2-of-2 multi-sig, both parties)
2. **Commitment**: Revocable transaction with asymmetric HTLCs
3. **Update**: New commitment tx invalidates old one via revocation keys
4. **HTLC**: Holds payments in-flight with timeout and preimage
5. **Close**:
   - Cooperative: Both sign closing tx, no timelocks
   - Force close: Single party broadcasts commitment tx, timelock enforced
   - Revoked close: Cheater loses all funds (breach remedy)

## Security Considerations

### Bitcoin-Specific Attack Vectors
- **51% attack**: Attacker controls >50% hashrate, can reorganize chain
- **Fee sniping**: Miner replaces transaction with higher-fee version
- **Finney attack**: Miner pre-mines block with double-spend
- **Race attack**: Unconfirmed transaction replaced in mempool
- **Replay attack**: Transaction valid on both old and new chain after fork
- **Eclipse attack**: Node isolated from honest peers
- **Timewarp attack**: Manipulating timestamp to reduce difficulty

### Mitigations
- Wait 6+ confirmations for high-value transactions
- Use replace-by-fee (RBF) signaling for unconfirmed
- BIP-68 relative locktime for Lightning commitment
- Anchor outputs for CPFP fee bumping in Lightning
- AssumeUTXO for fast new-node sync

## Rules
1. Bitcoin Core is written in C++ — reference src/validation.cpp, src/net_processing.cpp, src/wallet/
2. Bitcoin uses Nakamoto consensus (proof-of-work) with probabilistic finality — 6 confirmations ≈ 1 hour
3. All Bitcoin transactions use the UTXO model — no account abstraction
4. Taproot (BIP-340/341/342) is current standard for new Bitcoin scripts — use over legacy
5. Mempool is not part of consensus — each node implements its own replacement/eviction policies
6. Lightning Network operates as L2 with HTLCs, not on-chain for every payment
7. Always consider Bitcoin's conservative upgrade philosophy — don't propose radical changes
8. Ordinals/Runes are NOT protocol changes — they are interpretation layers on existing opcodes
9. For BIP standards, reference the specific BIP number and version
10. Mining economics must account for halving cycles (every 210,000 blocks)

## References
  - references/bip-standards.md — BIP Standards Reference
  - references/bitcoin-core-deep.md — Bitcoin Core Architecture
  - references/bitcoin-l2s.md — Bitcoin Layer 2s
  - references/bitcoin-script-and-taproot.md — Bitcoin Script & Taproot
  - references/blockchain-bitcoin-advanced.md — Blockchain Bitcoin Advanced Topics
  - references/blockchain-bitcoin-fundamentals.md — Blockchain Bitcoin Fundamentals
  - references/lightning-network.md — Lightning Network
  - references/mining-pow.md — Mining & Proof of Work
  - references/ordinals-runes.md — Ordinals, BRC-20 & Runes
  - references/bitcoin-security.md — Bitcoin Security Model
  - references/bitcoin-core-contributing.md — Contributing to Bitcoin Core

## Phase
blockchain → blockchain-bitcoin
