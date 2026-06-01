# Blockchain Core Advanced Topics

## Advanced Consensus Mechanisms

### HotStuff (Libra/Diem)
BFT consensus with linear communication complexity (O(n) vs PBFT's O(n^2)). Three phases: prepare, pre-commit, commit. Leader-based with round-robin rotation. Used in Diem and Sui (Narwhal variant).

### Avalanche Consensus
Repeated subsampling: a node queries k random validators for preferred chain. If >α respond with same, update confidence. After β consecutive confident rounds, finalize. No leader, no round-robin. Metastability ensures convergence.

### DAG-Based Consensus (Narwhal & Tusk)
Separate data dissemination (Narwhal DAG) from ordering (Tusk consensus). Blocks are vertices in a DAG. Consensus orders the DAG by electing leaders per round. High throughput (130K+ tps) with BFT guarantee. Used in Sui.

## MEV Deep Dive

### MEV Supply Chain Actors
1. **Searchers**: Identify and extract MEV opportunities
2. **Builders**: Construct blocks from searcher bundles + public txns
3. **Relays**: Forward blocks from builders to proposers (MEV-Boost)
4. **Proposers**: Select highest-paying valid block
5. **Solver networks**: Off-chain competition for user orders (CowSwap)

### MEV Mitigation Strategies
| Strategy | Description | Adoption |
|---|---|---|
| MEV-Boost | Out-of-protocol PBS | Ethereum mainnet (90%+ validators) |
| ePBS | In-protocol PBS | In research (Ethereum) |
| FOCIL | Forced inclusion lists | In research |
| Shutter | Threshold encrypted mempool | Gnosis Chain |
| SUAVE | MEV-specific chain | Flashbots (in development) |
| Fair sequencing | Order-fairness from consensus | Espresso, Astria |

## Advanced State Management

### State Pruning
Archive nodes: store all historical state. Full nodes: prune old state, keep recent state + checkpoints. Snapshot sync: download recent state directly from peers (not replay from genesis). Stateless clients: verify blocks without storing state (witness-based).

### State Rent / Gas
Ethereum: SSTORE costs approximate rent for storage. NEAR: explicit state rent based on bytes stored. Solana: rent-exempt accounts (min 2 years rent). MultiversX: storage rent based on data size.
