---
name: blockchain-ethereum
description: >
  Use this skill when asked about Ethereum internals, EVM deep dive, Ethereum consensus layer, execution clients, staking, EIPs, layer-2 scaling, account abstraction, PBS/MEV-Boost, EVM opcodes, and Ethereum protocol development. Languages: Go, Rust, C#, C++, Solidity. Covers EVM architecture (opcodes, gas metering, memory/storage model, EOF), execution clients (geth, reth, Nethermind, Erigon), consensus layer (Casper FFG, LMD-GHOST, beacon chain, attestation), staking and validators (32 ETH, withdrawal credentials, MEV-Boost, DVT, ePBS), account abstraction (ERC-4337, EntryPoint, paymasters, UserOp mempool), critical EIPs (1559, 4844, 4337, 3529, 2718), and L2 scaling (Optimism, Arbitrum, ZKsync, StarkNet, validium, data availability). Do NOT use for: Bitcoin protocol (use blockchain-bitcoin), non-EVM blockchains (use blockchain-core), or smart contract development (use blockchain-application).
version: "1.1.0"
author: "j4flmao"
license: "MIT"
tags: [blockchain, ethereum, evm, consensus, phase-blockchain]
---

# Blockchain Ethereum

## Purpose
Guide to Ethereum protocol engineering covering execution layer, consensus layer, staking, L2 scaling, and protocol evolution through EIPs. Covers both client implementation and protocol-level design.

## Agent Protocol

### Trigger
"Ethereum", "EVM", "Ethereum Virtual Machine", "opcode", "gas", "Ethereum consensus", "beacon chain", "Casper", "LMD-GHOST", "execution client", "geth", "reth", "Nethermind", "Erigon", "Ethereum staking", "validator", "MEV-Boost", "EIP", "EIP-1559", "EIP-4844", "EIP-4337", "account abstraction", "ERC-4337", "EntryPoint", "paymaster", "UserOp", "PBS", "proposer builder separation", "ePBS", "FOCIL", "Ethereum L2", "rollup", "Optimism", "Arbitrum", "ZKsync", "StarkNet", "layer 2", "data availability", "blob", "Ethereum light client"

### Input Context
- Ethereum layer (execution/consensus/L2)
- Client implementation (geth/reth/Nethermind/Erigon)
- Protocol component (EVM/staking/EE/etc.)
- EIP/research area
- Performance requirements (TPS, latency, cost budget)

### Output Artifact
Technical analysis or implementation guide covering the specified Ethereum protocol component with architecture, mechanisms, and trade-offs.

### Response Format
1. **Scope**: execution layer vs consensus layer vs L2 vs EIP
2. **Architecture**: client implementation, component breakdown, data flow
3. **Key mechanisms**: fork choice, finality, fee mechanism, staking
4. **Implementation**: relevant code patterns, configuration, optimization
5. **Trade-offs**: security vs performance, decentralization vs throughput
6. **Integration**: how the component interacts with other Ethereum layers

### Completion Criteria
- Architecture covers the specific layer with correct component references
- Mechanisms accurately reflect current Ethereum spec (as of latest hard fork)
- Implementation references real client code where applicable
- Trade-offs analyzed with specific metrics
- Future directions (upcoming EIPs, research areas) identified

### Max Response Length
5000 tokens

## Decision Trees

### Ethereum Layer Architecture
```
Ethereum interaction type:
├── Running a node?
│   ├── Full node → Any EL + any CL client
│   │   ├── Go experience → geth + lighthouse
│   │   ├── Rust experience → reth + lodestar
│   │   ├── C#/.NET → Nethermind + teku
│   │   ├── Archival focus → Erigon + any CL
│   │   └── Resource constrained → reth + nimbus (lightest)
│   ├── Validator node → EL + CL + validator client
│   │   └── 32 ETH bonded per validator
│   └── Light node → Helios or similar (trustless, minimal resources)
├── Developing dApps?
│   ├── EVM interaction → eth_call, eth_sendRawTransaction
│   ├── Account abstraction → ERC-4337 EntryPoint
│   └── L2 deployment → OP Stack, Arbitrum Nitro, ZK stack
└── Protocol research?
    ├── EVM changes → EIP process (consider EOF, account abstraction)
    ├── Consensus changes → ePBS, FOCIL, SSF, Orbit SSF
    └── L1→L2 → 4844 blobs, based rollups, preconfirmations
```

### Client Selection Decision
```
Node requirements:
├── Mainnet, most popular → geth (Go) — reference implementation
├── High performance, sync speed → reth (Rust) — 2-3x faster sync
├── Enterprise, .NET ecosystem → Nethermind (C#) — good monitoring
├── Archival node, optimized storage → Erigon (Go) — 50% less storage
└── Lightweight, embedded → reth or custom Go light client
```

### L2 Selection
```
Scaling need:
├── EVM-equivalent, mature → Optimism OP Stack
├── EVM-equivalent, fast → Arbitrum Nitro (multi-round fraud proof)
├── EVM-equivalent, ZK → Scroll, Linea (zkEVM type 2/3)
├── ZK, custom VM → ZKsync Era (zkEVM type 4)
├── ZK, STARK-based → StarkNet (Cairo VM)
└── Data availability only → EigenDA, Celestia (for sovereign rollups)
```

## EVM Architecture

### Opcode Categories
```solidity
// Arithmetic: ADD, SUB, MUL, DIV, MOD, EXP
// Comparison: LT, GT, EQ, ISZERO
// Bitwise: AND, OR, XOR, NOT, SHL, SHR, SAR
// Storage: SLOAD (2100 cold, 100 warm), SSTORE (20000+)
// Memory: MLOAD, MSTORE (3 gas)
// Environment: ADDRESS, BALANCE, CALLER, ORIGIN, CALLVALUE
// Block: BLOCKHASH, COINBASE, TIMESTAMP, NUMBER, PREVRANDAO (after merge)
// Control: JUMP, JUMPI, JUMPDEST, STOP, RETURN, REVERT
// Contract creation: CREATE, CREATE2
// Calls: CALL, STATICCALL, DELEGATECALL, CALLCODE
```

### Gas Cost Table (Key Operations)
| Operation | Gas Cost | Notes |
|---|---|---|
| Base tx | 21,000 | Simple ETH transfer |
| SLOAD (cold) | 2,100 | First read of storage slot in tx |
| SLOAD (warm) | 100 | Subsequent reads in same tx |
| SSTORE (new) | 22,100 | Write to zero → non-zero |
| SSTORE (update) | 5,000 | Write to non-zero → non-zero |
| SSTORE (zero) | 2,900 | Write to non-zero → zero (refund 4,800) |
| CALL | 7,000 | Plus gas stipend if value sent |
| CREATE | 32,000 | Contract deployment base |
| SHA-256 | 60 + 12/word | Precompile at 0x02 |
| BN254 pairing | 45,000 + 34,000/point | Precompile at 0x08 |

## Consensus Layer

### Beacon Chain Architecture
```go
// Attestation flow: validator observes head → signs attestation → gossiped → included in block
type Attestation struct {
    AggregationBits []byte          // Which validators attest
    Data            AttestationData
    Signature       BLSSignature    // Aggregated BLS sig
}

type AttestationData struct {
    Slot            uint64
    Index           uint64          // Committee index
    BeaconBlockRoot Hash            // LMD-GHOST vote
    Source          Checkpoint      // Casper FFG source
    Target          Checkpoint      // Casper FFG target
}
```

### Fork Choice (LMD-GHOST)
```go
func ForkChoice(block Node, store Store) Node {
    head := block
    for {
        children := store.GetChildren(head.Root)
        if len(children) == 0 {
            return head
        }
        // Weighted by attestation votes
        best := children[0]
        for _, child := range children[1:] {
            if child.Weight > best.Weight {
                best = child
            }
        }
        head = best
    }
}
```

### Finality (Casper FFG)
```go
// Justification: 2/3 supermajority on (source, target) checkpoint pair
// Finalization: consecutive justified checkpoints (source → target justified, target → target+1 justified)
// Reorg depth: finalized checkpoints cannot be reorged (economic security)
```

## Critical EIPs

| EIP | Title | Impact |
|---|---|---|
| 1559 | Fee market change | Base fee burned, priority fee, block target 50% full |
| 2718 | Typed transaction envelope | Transaction type prefix, extensible tx format |
| 2929 | Gas cost increases for state access | Cold SLOAD 2100, warm SLOAD 100 |
| 3529 | Reduction in refunds | Reduced SELFDESTRUCT and SSTORE refunds |
| 3651 | Warm COINBASE | COINBASE address starts warm (saves 2100 gas) |
| 4337 | Account abstraction | UserOp mempool, EntryPoint contract, paymasters |
| 4788 | Beacon block root in EVM | BEACON_ROOT opcode for L1→L2 bridges |
| 4844 | Proto-danksharding | Blob-carrying transactions for L2 data availability |
| 5656 | MCOPY opcode | Memory copy opcode (3 gas) |

## Rules
1. Ethereum is a modular blockchain: execution layer (EVM) + consensus layer (beacon chain)
2. Use Go for geth (most popular), Rust for reth (fastest), C# for Nethermind, Go for Erigon
3. LMD-GHOST is fork choice; Casper FFG provides finality; together as Gasper
4. EIP-1559: base fee burned, priority fee to validator, blocks target 50% full
5. Always consider L1 vs L2 tradeoffs: security guarantees, finality, cost, latency
6. Reference specific implementations for deep technical accuracy
7. Account for MEV in protocol design — PBS/MEV-Boost is currently non-consensus
8. L2 security derives from L1 data availability — verify L2 state roots on L1
9. Staking: 32 ETH per validator, withdrawal credentials point to execution address
10. Protocol upgrades via EIP process — each fork bundles multiple EIPs

## References
  - references/account-abstraction-erc4337.md — Account Abstraction (ERC-4337) Deep Dive
  - references/blockchain-ethereum-advanced.md — Blockchain Ethereum Advanced Topics
  - references/blockchain-ethereum-fundamentals.md — Blockchain Ethereum Fundamentals
  - references/eips-deep-dive.md — Critical EIPs Deep Dive
  - references/eth-consensus-layer.md — Ethereum Consensus Layer (Beacon Chain)
  - references/evm-deep-dive.md — EVM Deep Dive
  - references/execution-clients.md — Execution Clients
  - references/layer2-scaling.md — Layer-2 Scaling
  - references/pbs-mev-boost.md — Proposer-Builder Separation & MEV-Boost
  - references/staking-and-validator.md — Staking and Validators
  - references/ethereum-light-clients.md — Ethereum Light Clients
  - references/blob-transactions-4844.md — Blob Transactions (EIP-4844)

## Phase
blockchain → blockchain-ethereum
