---
name: blockchain-core
description: >
  Use this skill when asked about blockchain fundamentals, consensus mechanisms, PoW, PoS, gas, staking, blockchain data structures, DAG consensus, Avalanche, MEV, PBS, economic security, blockchain node implementation. Languages: C++, Go. Covers core protocol engineering including consensus algorithms (Nakamoto, PBFT, HotStuff, Snowman, DAG-BFT), MEV taxonomy and supply chain (PBS, ePBS, MEV-Boost, FOCIL), cryptographic primitives (hashing, ECDSA, BLS, Merkle proofs), state machine design (UTXO, account model), mempool and transaction pool, P2P networking, and blockchain storage engines. Do NOT use for: smart contract development (use blockchain-application), web3 frontend integration (use blockchain-web3), or general cryptography outside blockchain context.
version: "1.1.0"
author: "j4flmao"
license: "MIT"
tags: [blockchain, core, consensus, cryptography, protocol, state-machine, phase-blockchain]
---

# Blockchain Core

## Purpose
Guide core blockchain protocol engineering covering consensus mechanisms, state machine design, P2P networking, mempool architecture, MEV economics, and node implementation. This skill enables building and analyzing blockchain protocols from first principles.

## Agent Protocol

### Trigger
"blockchain core", "consensus mechanism", "proof of work", "proof of stake", "PoW", "PoS", "DAG consensus", "Avalanche consensus", "Snowman", "Hashgraph", "gas", "staking", "MEV", "miner extractable value", "PBS", "proposer builder separation", "MEV-Boost", "ePBS", "blockchain node", "C++ blockchain", "Go blockchain", "blockchain protocol", "mempool", "transaction pool", "block finality", "blockchain data structure", "merkle tree", "cryptography blockchain", "p2p blockchain", "blockchain state machine", "economic security", "fork choice rule", "finality gadget", "light client"

### Input Context
- Consensus family (Nakamoto/BFT/hybrid/DAG)
- State machine model (UTXO/account/WASM)
- Network topology (permissionless/permissioned/hybrid)
- Performance requirements (TPS, finality time, node requirements)
- Security model (adversary threshold, economic security assumptions)
- Implementation language (Go/Rust/C++)

### Output Artifact
Protocol architecture specification: consensus mechanism with fork choice rule, state machine design, network layer architecture, mempool policy, security analysis, implementation plan.

### Response Format
1. **Architecture overview**: consensus family + state model + network topology + finality model
2. **Key mechanisms**: fork choice rule, block production, validation, finality
3. **State machine**: UTXO or account model, state transition function, state storage
4. **Network layer**: gossip protocol, peer discovery, block propagation
5. **Security & economics**: adversary model, economic security, MEV exposure
6. **Implementation guidance**: language choice, database backend, key data structures

### Completion Criteria
- Consensus mechanism specification includes: finality type, fork choice rule, adversary threshold
- State machine design specifies state transition function and storage layout
- Network layer defines gossip protocol and peer discovery mechanism
- Security analysis covers: 51% attacks, long-range attacks, selfish mining, eclipse attacks
- Implementation plan specifies: language, database, networking library, testing approach

### Max Response Length
5000 tokens

## Decision Trees

### Consensus Protocol Selection
```
Blockchain type:
├── Permissionless (anyone can validate)
│   ├── Need high throughput (>1000 TPS)?
│   │   ├── YES → DAG-based (Avalanche, Hashgraph, Narwhal)
│   │   └── NO → Nakamoto consensus
│   │       ├── PoW → Bitcoin, Litecoin (energy-intensive, simple)
│   │       └── PoS → Ethereum, Cosmos (energy-efficient, complex)
│   ├── Need fast finality (<1 sec)?
│   │   ├── YES → BFT-based (Tendermint, HotStuff, Jolteon)
│   │   └── NO → Nakamoto probabilistic finality
│   └── Need low node requirements?
│       ├── YES → PoS with light client support
│       └── NO → Full node with archival storage
├── Permissioned (known validators)
│   ├── Crash fault tolerance → Raft, Paxos
│   └── Byzantine fault tolerance → PBFT, IBFT, HotStuff
└── Hybrid → Nominated PoS (Polkadot), Leased PoS (Waves)
```

### State Machine Model
```
├── UTXO model (Bitcoin)
│   ├── Pros: Parallelizable, private, simple validation
│   ├── Cons: State bloat, complex smart contracts
│   └── Use: Value transfer, UTXO-based smart contracts (Cardano)
├── Account model (Ethereum)
│   ├── Pros: Intuitive, composable, efficient smart contracts
│   ├── Cons: Replay protection needed, sequential nonce
│   └── Use: General purpose smart contracts
└── Hybrid (Solana, Aptos)
    ├── Account-based with parallel execution
    └── Requires static read/write set declaration
```

### MEV Strategy
```
Protocol stage:
├── Design phase (new chain):
│   ├── Prevent MEV → Threshold encryption, commit-reveal, FOCIL
│   ├── Democratize MEV → PBS (ePBS for native inclusion)
│   └── Ignore MEV → Legacy design (high MEV extraction)
└── Existing chain:
    ├── Validator → MEV-Boost relay integration
    ├── Searcher → Flashbots, private mempool, backrun strategies
    └── User → MEV-aware routing (CowSwap, 1inch fusion)
```

## Consensus Mechanisms

### Nakamoto Consensus (Bitcoin)
```go
// Simplified Bitcoin fork choice: most accumulated proof of work
func ForkChoice(blocks []Block) Block {
    best := blocks[0]
    for _, b := range blocks[1:] {
        if b.TotalWork() > best.TotalWork() {
            best = b
        }
    }
    return best
}
```

### BFT Consensus (Tendermint)
```go
// Tendermint consensus states: Propose → Pre-vote → Pre-commit → Commit
// 2f+1 validators needed (f = max faulty)
func ConsensusRound(height int64, round int32, state State) Decision {
    proposer := SelectProposer(height, round, state.Validators)
    block := proposer.Propose(height, round)
    prevotes := Broadcast(PrevoteMessage{BlockID: block.ID})
    if len(prevotes) > 2*len(state.Validators)/3 {
        precommits := Broadcast(PrecommitMessage{BlockID: block.ID})
        if len(precommits) > 2*len(state.Validators)/3 {
            return Commit{Block: block}
        }
    }
    return Nil // Timeout, next round
}
```

### DAG Consensus (Avalanche)
- Snow consensus: Repeated subsampling of validators
- DAG structure: Multiple blocks referenced, not just linear chain
- Finality: Probabilistic but very high confidence after few rounds
- Throughput: ~4,500 TPS on Avalanche mainnet

## Data Structures

### Merkle Patricia Trie (Ethereum)
- Trie: Radix tree with 16-ary branching
- Nodes: Extension, branch, leaf
- Root: Merkle hash of entire state
- Proof: O(log n) branch nodes for inclusion proof

### UTXO Set (Bitcoin)
```
UTXO = map[OutPoint]UTXOEntry
OutPoint: txid (32B) + vout (4B)
UTXOEntry: scriptPubKey + amount + height + coinbase flag
Efficient storage: LevelDB with O(1) lookups ~ 80M UTXOs on Bitcoin
```

### Mempool Data Structure
```go
type Mempool struct {
    byFee     *heap.MinHeap    // Sorted by fee rate (sat/vB)
    byTime    *list.List       // Sorted by entry time
    byTxID    map[Hash]*Tx     // O(1) lookup by transaction hash
    ancestors map[Hash][]Hash  // CPFP ancestor sets
    descendants map[Hash][]Hash // CPFP descendant sets
}
```

## Security & Economics

### MEV Supply Chain
1. **User**: Submits transaction to public mempool
2. **Searcher**: Monitors mempool, finds profitable opportunities
3. **Builder**: Aggregates searcher bundles + public txns
4. **Relay**: Connects builders to proposers (MEV-Boost)
5. **Proposer (Validator)**: Selects highest-bid block

### Economic Security
- PoW: Cost to attack = hashrate * electricity + hardware cost
- PoS: Cost to attack = 1/3 of total staked value (slashed)
- Security budget: Block rewards + fees must exceed attack cost
- Finality: Economic finality when reorganization cost exceeds attack budget

### MEV Types
| MEV Type | Description | Example |
|---|---|---|
| DEX arbitrage | Price differences across AMMs | Buy low on Uniswap, sell high on Sushiswap |
| Sandwich | Frontrun + backrun trade | Buy before user, sell after user's trade |
| Liquidation | Liquidate undercollateralized positions | Aave/Compound health factor triggers |
| JIT liquidity | Insert liquidity before swap, remove after | Uniswap v3 concentrated liquidity |
| Time-bandit | Reorganize chain to extract MEV | Reorg last N blocks for profitable txns |

## Production Considerations

### Node Implementation Patterns
- **Database**: LevelDB (Bitcoin), Pebble/LevelDB (Ethereum Go), RocksDB (Rust nodes)
- **Networking**: libp2p (IPFS/Cosmos/Polkadot), devp2p (Ethereum), custom TCP (Bitcoin)
- **Serialization**: Protocol Buffers, SSZ (Ethereum 2), custom binary (Bitcoin)
- **State sync**: Snapshot sync, warp sync, checkpoints
- **Block propagation**: Compact blocks, graphene, eris (DAG)

## Rules
1. Use C++ for performance-critical blockchain node implementations
2. Use Go for production blockchain nodes (go-ethereum, Tendermint/Cosmos)
3. Prefer BFT-based consensus for permissioned networks, Nakamoto for permissionless
4. Always consider state machine design (UTXO vs account) based on use case
5. Follow established blockchain architecture patterns — don't invent custom consensus without rigorous analysis
6. Reference specific blockchain implementations for real-world context
7. Always specify adversary model and security assumptions
8. Include MEV analysis in protocol design — MEV exists everywhere
9. Design for upgradeability — protocol upgrades require governance or hard forks
10. Consider light client support for accessibility

## References
  - references/blockchain-core-advanced.md — Blockchain Core Advanced Topics
  - references/blockchain-core-fundamentals.md — Blockchain Core Fundamentals
  - references/blockchain-data-structures.md — Blockchain Data Structures
  - references/consensus-deep-dive.md — Consensus Mechanisms Deep Dive
  - references/cryptography-foundations.md — Cryptography Foundations for Blockchain
  - references/dag-consensus.md — DAG-Based Consensus
  - references/economic-security-mev.md — Economic Security & MEV
  - references/gas-and-staking.md — Gas, Fees & Staking Mechanics
  - references/node-implementation.md — Node Implementation Deep Dive
  - references/p2p-networking.md — P2P Networking for Blockchain
  - references/state-machines.md — Blockchain State Machine Design
  - references/blockchain-fork-choice.md — Fork Choice Rules
  - references/light-client-protocols.md — Light Client Protocols

## Phase
blockchain → blockchain-core
