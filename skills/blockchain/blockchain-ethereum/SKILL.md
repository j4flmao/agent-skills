---
name: blockchain-ethereum
description: >
  Use this skill when asked about Ethereum internals, EVM deep dive, Ethereum consensus layer, execution clients, staking, EIPs, layer-2 scaling, Ethereum Virtual Machine opcodes, and Ethereum protocol development. Languages: Go, Rust, C#, C++, Solidity. Covers EVM architecture (opcodes, gas metering, memory/storage model, EOF), execution clients (geth, reth, Nethermind, Erigon), consensus layer (Casper FFG, LMD-GHOST, beacon chain, attestation), staking and validators (32 ETH, withdrawal credentials, MEV-Boost, DVT), critical EIPs (1559, 4844, 4337, 3529, 2718), and L2 scaling (Optimism, Arbitrum, ZKsync, StarkNet, validium, data availability). Do NOT use for: Bitcoin protocol (use blockchain-bitcoin), non-EVM blockchains (use blockchain-core), or smart contract development (use blockchain-application).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [blockchain, ethereum, evm, consensus, phase-blockchain]
---

# blockchain-ethereum

## Trigger
"Ethereum", "EVM", "Ethereum Virtual Machine", "opcode", "gas", "Ethereum consensus", "beacon chain", "Casper", "LMD-GHOST", "execution client", "geth", "reth", "Nethermind", "Erigon", "Ethereum staking", "validator", "MEV-Boost", "EIP", "EIP-1559", "EIP-4844", "EIP-4337", "Ethereum L2", "rollup", "Optimism", "Arbitrum", "ZKsync", "StarkNet", "layer 2", "data availability", "blob"

## Rules
1. Ethereum is a modular blockchain: execution layer (EVM) + consensus layer (beacon chain) — they run as separate clients
2. Use Go for geth (most popular EL), Rust for reth (fastest), C# for Nethermind (enterprise), Go for Erigon (archival efficient)
3. LMD-GHOST is the fork choice rule; Casper FFG provides finality; they work together as Gasper
4. EIP-1559 changed fee market: base fee burned, priority fee to validator, blocks target 50% full
5. Always consider L1 vs L2 tradeoffs: security guarantees, finality, cost, latency
6. Reference specific implementations (geth source, reth architecture) for deep technical accuracy
7. Use the references in `references/` for deep technical detail

## Response Format
1. **Scope**: execution layer vs consensus layer vs L2
2. **Architecture**: client implementation, component breakdown, data flow
3. **Key mechanisms**: fork choice, finality, fee mechanism, staking
4. **Implementation**: relevant code patterns, configuration, optimization
5. **Trade-offs**: security vs performance, decentralization vs throughput

## Phase
blockchain → blockchain-ethereum
