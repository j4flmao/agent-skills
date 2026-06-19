---
name: blockchain-ethereum
description: >
  Use this skill when asked about Ethereum internals, EVM deep dive, Ethereum consensus layer, execution clients, staking, EIPs, layer-2 scaling, account abstraction, PBS/MEV-Boost, EVM opcodes, and Ethereum protocol development. Languages: Go, Rust, C#, C++, Solidity. Covers EVM architecture (opcodes, gas metering, memory/storage model, EOF), execution clients (geth, reth, Nethermind, Erigon), consensus layer (Casper FFG, LMD-GHOST, beacon chain, attestation), staking and validators (32 ETH, withdrawal credentials, MEV-Boost, DVT, ePBS), account abstraction (ERC-4337, EntryPoint, paymasters, UserOp mempool), critical EIPs (1559, 4844, 4337, 3529, 2718), and L2 scaling (Optimism, Arbitrum, ZKsync, StarkNet, validium, data availability). Do NOT use for: Bitcoin protocol (use blockchain-bitcoin), non-EVM blockchains (use blockchain-core), or smart contract development (use blockchain-application).
version: "2.0.0"
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

### Validator Infrastructure Decision
```
Validator operations:
├── Solo staking (32 ETH, self-operated)
│   ├── Pros: Maximum rewards, no counterparty risk
│   └── Cons: Requires 32 ETH, technical operation, uptime monitoring
├── Staking pools (Lido, Rocket Pool)
│   ├── Lido: stETH token, permissioned node operators, ~30% of staked ETH
│   ├── Rocket Pool: rETH token, permissionless node operators, 8-32 ETH needed
│   └── Cons: Trust in pool smart contracts, MEV revenue sharing
├── DVT (Distributed Validator Technology)
│   ├── SSV Network: DVT multi-operator validators
│   ├── Obol: Distributed validator cluster
│   └── Pros: Fault tolerance, geographic distribution
└── CEX staking (Coinbase, Binance)
    └── Convenient but centralized, regulatory risk
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
| BLAKE2f | Variable | Precompile at 0x09 |
| KZG verification | 50,000 | PINTICE precompile (EIP-4844) |

### EVM Memory Model
```
Stack: 1024-element max, 256-bit words
  - Operations consume from top of stack
  - DUP1-16, SWAP1-16 for manipulation
  - Stack overflow at 1024 elements → revert

Memory: Linear byte array, expandable
  - MLOAD/MSTORE: 3 gas (plus 3 gas per 32-byte word expansion)
  - MCOSTY (EIP-5656): 3 gas for memory copy
  - Memory expansion cost: highest accessed address dictates total cost

Storage: Persistent 256-bit key-value store
  - 2^256 slots of 32 bytes each
  - slot = keccak256(key) for mapping entries
  - Packed storage: multiple variables in one slot if < 32 bytes

Calldata: Read-only input data for transaction/call
  - CALLDATALOAD, CALLDATASIZE, CALLDATACOPY
  - 4 gas per non-zero byte, 16 gas per zero byte (EIP-2028)
  - 16 gas per non-zero byte for calldata in tx data
```

### EOF (Ethereum Object Format)
Proposed EVM upgrade (Prague hard fork): separates code from data, adds section-based structure, enables static jumps, removes CODECOPY/CODESIZE gas issues. EOF contracts have preamble, code sections, data section. Backward-incompatible — only new EOF contracts. Benefits: improved gas metering, better static analysis, simplified client implementation.

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
// Epoch boundary: every 32 slots (6.4 minutes)
// Finality time: typically 2 epochs (12.8 minutes) after block proposal
```

### Validator Responsibilities
```
Per epoch (6.4 minutes, 32 slots):
├── Propose block (1 validator per slot, ~32K validators)
│   ├── Must include: EL block, attestations, slashings, deposits
│   └── Rewards: base reward * (effective balance / 32) * proposer_weight
├── Attest to head (all validators in one of 64 committees per slot)
│   ├── Vote for: LMD-GHOST head (latest block), FFG source, FFG target
│   └── Rewards: base reward * (effective balance / 32) * attestation_weight
└── Slashable offenses:
    ├── Double vote: included in two different blocks for same target
    ├── Surround vote: surrounds another vote (source > target or vice versa)
    └── Proposer slashing: two different blocks proposed for same slot
```

### Reward and Penalty Calculations
```
Base reward = effective_balance * (base_reward_factor) / sqrt(total_active_balance)
base_reward_factor = 64
Total reward per epoch = base_reward * (proposer_weight + attestation_weight + ...)
Proposer weight: 8/64 of base reward per proposed block
Attestation weight: 26/64 for source vote, 14/64 for target vote, 14/64 for head vote

Inactivity leak: when chain hasn't finalized for >4 epochs
  - Penalty increases quadratically over time
  - Max penalty: up to 60%+ of stake during prolonged inactivity
```

## Critical EIPs

| EIP | Title | Impact |
|-----|-------|--------|
| 1559 | Fee market change | Base fee burned, priority fee, block target 50% full |
| 2718 | Typed transaction envelope | Transaction type prefix, extensible tx format |
| 2929 | Gas cost increases for state access | Cold SLOAD 2100, warm SLOAD 100 |
| 3529 | Reduction in refunds | Reduced SELFDESTRUCT and SSTORE refunds |
| 3651 | Warm COINBASE | COINBASE address starts warm (saves 2100 gas) |
| 4337 | Account abstraction | UserOp mempool, EntryPoint contract, paymasters |
| 4788 | Beacon block root in EVM | BEACON_ROOT opcode for L1→L2 bridges |
| 4844 | Proto-danksharding | Blob-carrying transactions for L2 data availability |
| 5656 | MCOPY opcode | Memory copy opcode (3 gas) |
| 6780 | SELFDESTRUCT cleanup | SELFDESTRUCT only sends ETH, doesn't delete code |

### Upcoming EIPs (Prague/Electra)
| EIP | Title | Purpose |
|-----|-------|---------|
| 7002 | Execution layer withdrawal | Validator exits triggered from execution layer |
| 7251 | Compound consolidation | Validator max balance increases from 32 to 2048 ETH |
| 7549 | Move committee index out of attestation | Reduces attestation size, aggregation efficiency |
| 6110 | Supply validator deposits on execution layer | Deposit flow on EL instead of CL |
| 7685 | General purpose execution layer requests | Standardized EL→CL request format |
| 7702 | Set EOA account code | Temporary delegation for smart contract wallets |
| 7691 | Blob count increase | Increase max blob count per block for L2 scaling |

## Account Abstraction (ERC-4337)

### Architecture Components
```typescript
// ERC-4337 flow:
// 1. User creates UserOp off-chain (signs with wallet)
// 2. User sends UserOp to bundler (separate mempool)
// 3. Bundler bundles multiple UserOps into a single transaction
// 4. Bundler submits to EntryPoint.handleOps()
// 5. EntryPoint calls account contract's validateUserOp()
// 6. Account contract verifies signature and pays gas (or via paymaster)

interface UserOperation {
    sender: string;           // Account contract address
    nonce: uint256;           // Anti-replay, sequential
    initCode: bytes;          // Account deployment code (if not deployed)
    callData: bytes;          // Intended execution data
    callGasLimit: uint256;    // Gas for execution
    verificationGasLimit: uint256; // Gas for verification
    preVerificationGas: uint256;  // Gas for bundler overhead
    maxFeePerGas: uint256;    // EIP-1559 max fee
    maxPriorityFeePerGas: uint256; // EIP-1559 priority fee
    paymasterAndData: bytes;  // Paymaster contract + data (if using paymaster)
    signature: bytes;         // User signature
}
```

### Paymaster Types
| Type | Mechanism | Use Case |
|------|-----------|----------|
| Verifying paymaster | Off-chain approval flow | Sponsored transactions for specific users |
| Token paymaster | Swap tokens for gas | Pay gas in ERC-20 instead of ETH |
| Deposit paymaster | Pre-deposit ETH | Enterprise accounts with gas budget |
| Hybrid | Deposit + verification | Tiered access for users |

## L2 Scaling

### Rollup Comparison
| Feature | Optimism (OP) | Arbitrum (Nitro) | ZKsync Era | StarkNet |
|---------|---------------|------------------|------------|----------|
| Type | Optimistic | Optimistic | ZK (Type 4) | ZK (Type 4) |
| VM | EVM (OVM) | EVM (WAVM) | zkEVM (Synchrony) | Cairo VM |
| Fraud proof | Multi-round (ZKP) | Multi-round (bisection) | N/A (validity proof) | N/A (validity proof) |
| Challenge period | 7 days | 7 days | N/A | N/A |
| State commitment | L1 calldata/blobs | L1 calldata/blobs | L1 calldata/blobs | L1 calldata (compress) |
| Sequencer | Centralized (planned) | Centralized (planned) | Centralized | Centralized |
| Withdrawal time | ~7 days | ~7 days | ~30 min | ~30 min |

### Data Availability Options
```
Data posting:
├── Calldata (legacy): Store all L2 tx data as calldata on L1
│   └── Cost: ~16 gas/byte, expensive for high-throughput L2s
├── Blobs (EIP-4844): Dedicated blob-carrying transactions
│   ├── Cost: ~1-3 gas/byte (temporary, ~90% reduction)
│   ├── Blob size: 128KB per blob, max 6 blobs per block (post-Electra)
│   └── Retention: ~18 days (not stored permanently on L1)
├── EigenDA: External data availability layer
│   ├── Cost: Very low (off-chain DA with attestation)
│   └── Trust: EigenDA operator set (restaked ETH)
└── Celestia: Modular DA network
    ├── Cost: Low (dedicated DA blockchain)
    └── Trust: Celestia validator set
```

### Based Rollups
Rollups that use L1 proposers as their sequencer. No separate sequencer set. L1 proposers include L2 transactions in their L1 blocks. Inherits L1 liveness and decentralization. Challenge: latency (L1 block time = L2 block time). Projects: Taiko, ethOS. Preconfirmation services can provide sub-second user experience.

## Client Implementation Patterns

### Geth (Go) Architecture
```go
// Geth's struct node → etherbase → miner workflow
// Key internal packages:
// core/state: StateDB for account storage management
// core/vm: EVM interpreter (JIT for performance)
// eth: Ethereum protocol handler
// miner: Block producer (seal/consensus) + worker
// consensus/beacon: Engine API interface for CL

// ETH call flow for eth_call:
func (api *EthAPI) Call(args TransactionArgs, blockNrOrHash *rpc.BlockNumberOrHash) (hexutil.Bytes, error) {
    state, header, err := api.getState(blockNrOrHash)
    if err != nil { return nil, err }
    msg := args.ToMessage(api.b.BaseFee)
    result, err := api.b.CallContract(msg, header, state)
    return result, nil
}
```

### Reth (Rust) Architecture
```rust
// Reth uses staged sync pipeline:
// 1. Header stage: download block headers
// 2. Body stage: download block bodies (transactions)
// 3. Sender recovery stage: recover transaction senders
// 4. Execution stage: execute blocks, update state
// 5. Pruning stage: prune old state data

// Advantages over geth:
// - Staged pipeline enables parallel execution
// - Memory-mapped database (redb) reduces IO
// - Static dispatch for EVM (no interpreter overhead)
// - 2-3x faster initial sync
```

## Security Considerations

### Ethereum-Specific Attacks
| Attack | Description | Mitigation |
|--------|-------------|------------|
| Reorg | Chain reorganization before finality | Wait for finalization (>2 epochs) |
| Long-range attack | Attacker creates alternative chain from genesis | Weak subjectivity checkpoint, social consensus |
| Balance attack | Partition network + drain validators | Proposer boost (LMD-GHOST fix) |
| Verifier's dilemma | MEV-Boost relay censorship | FOCIL forced inclusion lists |
| L1→L2 withdrawal exploit | Exploit bridge before fraud proof window | Challenge period monitoring |
| Blob withholding | Sequencer withholds blob data | Blob forwarding network, KZG commitments |

### Staking Risk Matrix
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Slashing for double sign | Low (with monitoring) | 1 ETH + removal | Use DVT, separate machines |
| Inactivity leak | Medium (during long outage) | Up to 60% of stake | Failover node, alerting |
| Execution client bug | Low | Potential slashing | Run minority client |
| Consensus client bug | Low | Potential slashing | Run minority client |
| MEV-Boost relay failure | Medium | Missed MEV revenue | Multi-relay configuration |

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
11. Account abstraction (ERC-4337) separates signature verification from execution
12. EOF enables future EVM improvements by removing backward-compatibility constraints
13. Client diversity is critical — no single client should have >33% market share
14. MEV-Boost relay selection should prioritize decentralization, not just revenue
15. Blob transactions (EIP-4844) are temporary — full danksharding is the long-term goal

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
  - references/optimistic-vs-zk-rollups.md — Optimistic vs ZK Rollup Comparison

## Phase
blockchain → blockchain-ethereum
