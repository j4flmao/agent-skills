---
name: blockchain-bitcoin
description: >
  Use this skill when asked about Bitcoin internals, Bitcoin Core, Bitcoin Script, Taproot, mining, Proof of Work, Lightning Network, BIP standards, and Bitcoin protocol development. Languages: C++, Rust, Python. Covers Bitcoin Core C++ implementation (validation, mempool, wallet, P2P), Bitcoin Script opcodes and programming (P2PKH, P2SH, P2WSH, Taproot MAST), PoW mining mechanics (SHA-256d, difficulty adjustment, ASICs, Stratum), Lightning Network protocol (HTLC, onion routing, channel management, gossip), and BIP standards (BIP-32/39/44/84/86/174/340/341/342). Do NOT use for: Ethereum protocol (use blockchain-ethereum), smart contract development (use blockchain-application), or general blockchain patterns (use blockchain-patterns).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [blockchain, bitcoin, pow, mining, phase-blockchain]
---

# blockchain-bitcoin

## Trigger
"Bitcoin", "Bitcoin Core", "bitcoind", "Bitcoin Script", "BTC script", "Taproot", "Bitcoin opcode", "P2PKH", "P2SH", "P2WSH", "mining Bitcoin", "Proof of Work Bitcoin", "SHA-256d", "ASIC mining", "Stratum", "Lightning Network", "LN", "HTLC", "onion routing", "channel", "BIP standard", "BIP-32", "BIP-39", "BIP-44", "BIP-340", "BIP-341", "BIP-342", "PSBT", "Bitcoin mempool", "UTXO", "Bitcoin C++", "Bitcoin protocol"

## Rules
1. Bitcoin Core is written in C++ — reference its source code (src/validation.cpp, src/net_processing.cpp, src/wallet/) for implementation details
2. Bitcoin uses Nakamoto consensus (proof-of-work) with probabilistic finality — 6 confirmations ≈ 1 hour for finality
3. All Bitcoin transactions use the UTXO model — no account abstraction
4. Taproot (BIP-340/341/342) is the current standard for new Bitcoin scripts — use it over legacy scripts
5. The mempool is not part of consensus — each node implements its own replacement and eviction policies
6. Lightning Network operates as a Layer 2 with HTLCs, not on-chain transactions for every payment
7. Use the references in `references/` for deep technical detail

## Response Format
1. **Scope**: consensus layer vs wallet vs L2
2. **Architecture**: Bitcoin Core component breakdown, data flow, key files
3. **Key mechanisms**: PoW, difficulty, Script execution, UTXO set
4. **Implementation**: C++ patterns, data structures, optimization techniques
5. **Layer 2**: Lightning Network architecture, channel lifecycle

## Phase
blockchain → blockchain-bitcoin
