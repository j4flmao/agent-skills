---
name: blockchain-ethereum
description: >
  Use this skill when asked about Ethereum internals, EVM deep dive, Ethereum consensus layer, execution clients, staking, EIPs, layer-2 scaling, account abstraction, PBS/MEV-Boost, Ethereum Virtual Machine opcodes, and Ethereum protocol development. Languages: Go, Rust, C#, C++, Solidity. Covers EVM architecture (opcodes, gas metering, memory/storage model, EOF), execution clients (geth, reth, Nethermind, Erigon), consensus layer (Casper FFG, LMD-GHOST, beacon chain, attestation), staking and validators (32 ETH, withdrawal credentials, MEV-Boost, DVT, ePBS), account abstraction (ERC-4337, EntryPoint, paymasters, UserOp mempool), critical EIPs (1559, 4844, 4337, 3529, 2718), and L2 scaling (Optimism, Arbitrum, ZKsync, StarkNet, validium, data availability). Do NOT use for: Bitcoin protocol (use blockchain-bitcoin), non-EVM blockchains (use blockchain-core), or smart contract development (use blockchain-application).
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
"Ethereum", "EVM", "Ethereum Virtual Machine", "opcode", "gas", "Ethereum consensus", "beacon chain", "Casper", "LMD-GHOST", "execution client", "geth", "reth", "Nethermind", "Erigon", "Ethereum staking", "validator", "MEV-Boost", "EIP", "EIP-1559", "EIP-4844", "EIP-4337", "account abstraction", "ERC-4337", "EntryPoint", "paymaster", "UserOp", "PBS", "proposer builder separation", "ePBS", "FOCIL", "Ethereum L2", "rollup", "Optimism", "Arbitrum", "ZKsync", "StarkNet", "layer 2", "data availability", "blob"

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

## References
  - references/account-abstraction-erc4337.md — Account Abstraction (ERC-4337) — Deep Dive
  - references/blockchain-ethereum-advanced.md — Blockchain Ethereum Advanced Topics
  - references/blockchain-ethereum-fundamentals.md — Blockchain Ethereum Fundamentals
  - references/eips-deep-dive.md — Critical EIPs — Deep Dive
  - references/eth-consensus-layer.md — Ethereum Consensus Layer — Beacon Chain
  - references/evm-deep-dive.md — EVM Deep Dive
  - references/execution-clients.md — Execution Clients
  - references/layer2-scaling.md — Layer-2 Scaling
  - references/pbs-mev-boost.md — Proposer-Builder Separation & MEV-Boost — Deep Dive
  - references/staking-and-validator.md — Staking and Validators
## Phase
blockchain → blockchain-ethereum
