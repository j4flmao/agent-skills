---
name: blockchain-core
description: >
  Use this skill when asked about blockchain fundamentals, consensus mechanisms, PoW, PoS, gas, staking, blockchain data structures, DAG consensus, Avalanche, MEV, PBS, economic security, blockchain node implementation. Languages: C++, Go. Covers core protocol engineering including consensus algorithms (Nakamoto, PBFT, HotStuff, Snowman, DAG-BFT), MEV taxonomy and supply chain (PBS, ePBS, MEV-Boost, FOCIL), cryptographic primitives (hashing, ECDSA, BLS, Merkle proofs), state machine design (UTXO, account model), mempool and transaction pool, P2P networking, and blockchain storage engines. Do NOT use for: smart contract development (use blockchain-application), web3 frontend integration (use blockchain-web3), or general cryptography outside blockchain context.
version: "2.0.0"
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

### Finality Type Decision
```
Finality guarantee needed:
├── Probabilistic (Nakamoto)
│   ├── Finality probability increases with confirmations
│   ├── Bitcoin: 6 confirmations = 99.9% confidence
│   ├── Pros: Simple, partition-resistant
│   └── Cons: No deterministic finality
├── Deterministic instant (BFT)
│   ├── Finality after 2/3+ supermajority
│   ├── Tendermint: 1-3 second finality
│   ├── Pros: Instant finality, predictable
│   └── Cons: Requires validator set, liveness-break if <2/3 online
├── Economic (PoS checkpoints)
│   ├── Finality after economic commitment
│   ├── Ethereum Casper FFG: ~13 min finality
│   └── Pros: Finality without BFT overhead
└── Probabilistic DAG (Avalanche)
    ├── Very high confidence after 3 rounds
    └── ~1 second to confidence >99.99%
```

### Mempool Architecture Decision
```
Tx ordering strategy:
├── Public mempool (Ethereum, Bitcoin)
│   ├── All pending txs visible to all → MEV extraction
│   ├── Fee-based ordering (gas price auction)
│   └── Policy: RBF, CPFP, eviction
├── Private mempool (Flashbots, Dark Forest)
│   ├── Txs visible only to select validators/builders
│   ├── MEV-protected, privacy of strategy
│   └── Cost: fees to private relay
├── No mempool (Solana, Aurora)
│   ├── Txs forwarded directly to current leader
│   ├── Leader orders txs in block
│   └── Pros: No MEV from frontrunning in mempool
└── Encrypted mempool (threshold encrypted)
    ├── Txs encrypted, decrypted only at block production
    └── Shutter Network, FCFS linear ordering
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

### HotStuff (Libra/Diem Successor)
```go
// HotStuff: 3-chain protocol (prepare → pre-commit → commit)
// Leader-based BFT with linear message complexity O(n)
// Each round has a leader; pipelined for efficiency
// Used in: Diem, Sui (Narwhal/Tusk), Flow
type HotStuffState struct {
    View          uint64    // Current view number
    HighQC        QuorumCert // Highest known quorum certificate
    PreparedBlock *Block
    LockedBlock   *Block
}
```

### DAG Consensus (Avalanche)
- Snow consensus: Repeated subsampling of validators
  - Query k validators (k=20), wait for alpha response (≥15)
  - If confident, commit; if conflict, switch; else repeat
  - Typically converges in 3-5 rounds
- DAG structure: Multiple blocks referenced, not just linear chain
  - Each block references multiple parents (DAG)
  - No global ordering — DAG order determined by consensus
- Finality: Probabilistic but very high confidence after few rounds
- Throughput: ~4,500 TPS on Avalanche mainnet
- Subnets: Isolated application-specific networks with own validators

## Data Structures

### Merkle Patricia Trie (Ethereum)
```
Trie: Radix tree with 16-ary branching
├── Extension node: common prefix path (hex encoded)
├── Branch node: 16 children + value (17-element node)
├── Leaf node: key suffix + value
└── Root: Merkle hash of entire state tree

Lookup: O(n) where n = key length (not O(log n))
    keccak256(account) → traverse trie path
    Each node lookup: hash → leveldb read

Proof: O(log n) branch nodes for inclusion proof
    Merkle proof size: ~1KB for Ethereum state
    Verify: compute hashes up stack, compare to state root
```

### UTXO Set (Bitcoin)
```
UTXO = map[OutPoint]UTXOEntry
OutPoint: txid (32B) + vout (4B)
UTXOEntry: scriptPubKey + amount + height + coinbase flag

Efficient storage: LevelDB with O(1) lookups
~80M UTXOs on Bitcoin mainnet (~8GB)
UTXO cache: 500MB-2GB RAM for hot UTXOs

Operations:
  - Spend: delete UTXO from set (SSTORE in account models ≠ delete)
  - Create: add new UTXO entries
  - Coinbase maturity: 100 blocks before coinbase UTXO can be spent
```

### Mempool Data Structure
```go
type Mempool struct {
    byFee     *heap.MinHeap    // Sorted by fee rate (sat/vB or gwei/gas)
    byTime    *list.List       // Sorted by entry time
    byTxID    map[Hash]*Tx     // O(1) lookup by transaction hash
    ancestors map[Hash][]Hash  // CPFP ancestor sets
    descendants map[Hash][]Hash // CPFP descendant sets
}

// Bitcoin total mempool size: ~300MB (default maxmempool=300MB)
// Ethereum pending tx count: ~10,000-50,000 typical
// Eviction policy:
//   Bitcoin: by descendant fee rate (lowest first)
//   Ethereum: by gas price (lowest first, price bump for replacement)
```

## MEV & Economic Security

### MEV Supply Chain
1. **User**: Submits transaction to public mempool
2. **Searcher**: Monitors mempool, finds profitable opportunities
   - Backrun: identify pending tx, submit follow-up tx that profits
   - Sandwich: frontrun + backrun a target tx
   - Liquidation: monitor health factors, submit liquidation tx
3. **Builder**: Aggregates searcher bundles + public txns
   - Builds full block, orders for max fee revenue
   - Optimistic relaying: send block to relay before full validation
4. **Relay**: Connects builders to proposers (MEV-Boost)
   - Validates block structure before forwarding
   - Bid privacy: encrypted until proposer's slot
5. **Proposer (Validator)**: Selects highest-bid block

### Economic Security
```
PoW: Cost to attack = hashrate * electricity + hardware cost
  Bitcoin: ~$300K/hour to sustain 51% attack (rented hashrate)
  Defense: economic disincentive (attack destroys coin value)

PoS: Cost to attack = 1/3 of total staked value (slashed)
  Ethereum: ~$30B staked → attack cost ~$10B (slashed)
  Defense: inactivity leak, social consensus for recovery

Economic finality:
  Finality when reorganization cost exceeds attack budget
  For PoS: after finality gadget, reorganization forks the entire chain
  For PoW: after N confirmations, reorg cost = N * block_reward * hashrate_share
```

### MEV Types
| MEV Type | Description | Example |
|----------|-------------|---------|
| DEX arbitrage | Price differences across AMMs | Buy low on Uniswap, sell high on Sushiswap |
| Sandwich | Frontrun + backrun trade | Buy before user, sell after user's trade |
| Liquidation | Liquidate undercollateralized positions | Aave/Compound health factor triggers |
| JIT liquidity | Insert liquidity before swap, remove after | Uniswap v3 concentrated liquidity |
| Time-bandit | Reorganize chain to extract MEV | Reorg last N blocks for profitable txns |
| Multi-block MEV | Control consecutive blocks | Validator with multiple consecutive proposals |

### MEV Mitigation Strategies
```
Protocol level:
├── Threshold encryption (Shutter): Txs encrypted, decrypted at block production
├── FOCIL (Forced Inclusion Lists): Validators force tx inclusion
├── ePBS (In-protocol PBS): Consensus-level proposer-builder separation
├── Single-slot finality: No time for reorg-based MEV
└── Uniform random ordering: Tx order determined by randomness, not fee

Application level:
├── Commit-reveal: Submit commitment, reveal later
├── Batch auctions (CowSwap): CoW mechanism for order matching
├── Slippage protection: minOutputAmount in all swaps
└── Private mempool (Flashbots): Bypass public mempool
```

## P2P Networking

### Network Topology Comparison
```go
// Gossip protocol options:
// 1. Full mesh (Ethereum devp2p): Every node connects to ~50 peers
//    - Tx gossip: hash → request → receive (not full tx propagation)
//    - Block propagation: header + body (compact blocks)

// 2. Kademlia DHT (libp2p): Structured overlay network
//    Used by: IPFS, Polkadot, Filecoin
//    - O(log n) lookup for peer discovery
//    - Efficient routing to specific content

// 3. Tree propagation (Solana Turbine):
//    - Data split into fragments, propagated via tree
//    - Each node receives from parent, forwards to children
//    - O(log n) depth for full network propagation

// 4. GossipSub (libp2p): Mesh + gossip
//    - FloSin: Heartbeat-based mesh maintenance
//    - Used by: Ethereum CL, Filecoin
//    - Configurable: D (degree), D_lazy, D_high, D_low
```

## Fork Choice Rules

### Comparison
| Rule | Mechanism | Pros | Cons |
|------|-----------|------|------|
| Nakamoto | Most accumulated work | Simple, proven | Vulnerable to selfish mining |
| GHOST | Greedy Heaviest Observed Subtree | Handles uncle blocks | Less studied |
| LMD-GHOST | Latest Message Driven GHOST | Byzantine agreement friendly | Complex implementation |
| Tendermint | 2/3+ precommits | Instant finality | Liveness requires 2/3+ |
| Snowman (Avalanche) | Repeated subsampling | Fast finality, energy efficient | Novel, less tested |

## Production Considerations

### Node Implementation Patterns
- **Database**: LevelDB (Bitcoin), Pebble/LevelDB (Ethereum Go), RocksDB (Rust nodes)
- **Networking**: libp2p (IPFS/Cosmos/Polkadot), devp2p (Ethereum), custom TCP (Bitcoin)
- **Serialization**: Protocol Buffers, SSZ (Ethereum 2), custom binary (Bitcoin)
- **State sync**: Snapshot sync, warp sync, checkpoints
- **Block propagation**: Compact blocks, graphene, eris (DAG)

### Node Requirements by Chain
| Chain | Storage (Full) | Storage (Archive) | RAM | CPU | Sync Time |
|-------|---------------|-------------------|-----|-----|-----------|
| Bitcoin | 550GB | 5.5TB | 8GB | 8 cores | 2-3 days |
| Ethereum | 1TB | 12TB+ | 32GB | 16 cores | 1-3 days |
| Solana | 500GB | N/A | 128GB+ | 16 cores+GPU | 1-2 days |
| Cosmos | 100GB | 500GB | 8GB | 4 cores | 1 day |

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
11. Economic security must exceed cost of attack for the highest-value asset on chain
12. Mempool policy affects MEV extraction — private/encrypted mempools reduce extraction
13. Fork choice rule must be analyzed for selfish mining, balancing attacks, and ex post reorgs
14. DAG-based consensus achieves higher throughput at the cost of ordering complexity
15. Block propagation time is the critical bottleneck for permissionless consensus throughput

## Implementation Patterns

### Fork Choice Rule — LMD-GHOST (TypeScript)
```typescript
interface Block { hash: string; parentHash: string; height: number; weight: number; }
interface Attestation { validatorIndex: number; blockHash: string; weight: number; }

function lmdGhost(blocks: Map<string, Block>, attestations: Attestation[], genesis: string): string {
  const latest = new Map<number, string>();
  for (const a of attestations) latest.set(a.validatorIndex, a.blockHash);

  let current = genesis;
  while (true) {
    const children = [...blocks.values()].filter(b => b.parentHash === current);
    if (!children.length) break;
    let best = children[0], bestVotes = 0;
    for (const c of children) {
      let votes = 0;
      for (const [, vh] of latest) if (isAncestor(blocks, c.hash, vh)) votes++;
      if (votes > bestVotes) { bestVotes = votes; best = c; }
    }
    current = best.hash;
  }
  return current;
}

function isAncestor(blocks: Map<string, Block>, anc: string, hash: string): boolean {
  let cur = hash;
  while (cur) { if (cur === anc) return true; cur = blocks.get(cur)?.parentHash ?? ''; }
  return false;
}
```

### Mempool Ordering Policy (Go)
```go
type Mempool struct {
    txs             map[string]*Transaction
    byFee           *txHeap           // min-heap of effective tip
    accountNonces   map[string]uint64
    maxSize         int               // 50,000 txs
    minGasPrice     *big.Int          // anti-spam floor
    replacementPct  float64           // 10% bump for replace-by-fee
}

func (mp *Mempool) Add(tx *Transaction) bool {
    if len(mp.txs) >= mp.maxSize {
        // Evict cheapest tx from overpriced account
        cheapest := mp.byFee.Pop()
        delete(mp.txs, cheapest.Hash)
    }
    if tx.EffectiveTip.Cmp(mp.minGasPrice) < 0 { return false }
    mp.txs[tx.Hash] = tx
    mp.byFee.Push(tx)
    return true
}
```

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
  - references/transaction-ordering-policies.md — Transaction Ordering Policies
  - references/mempool-design-patterns.md — Mempool Design Patterns

## Phase
blockchain → blockchain-core
