# Blockchain Core Fundamentals

## Blockchain Data Structure

### Block Anatomy
Each block contains: header (metadata + previous block hash + merkle root + timestamp + nonce + difficulty target) and body (list of valid transactions). The hash of each block includes the previous block's hash, forming an immutable chain. Modifying any transaction in any block changes all subsequent block hashes.

### Merkle Trees
Binary tree where leaves are transaction hashes and each internal node is the hash of its two children. Root is a single hash representing all transactions. Merkle proofs enable lightweight verification of transaction inclusion with O(log n) data.

## Consensus Fundamentals

### CAP Theorem for Blockchains
Blockchains prioritize Consistency (all nodes see same state) and Partition Tolerance (network splits don't break the system). Availability is traded off — during network partitions, some nodes may not process new transactions until the partition heals.

### Finality Types
- **Probabilistic finality**: Confirmation probability increases with each new block (Bitcoin PoW, ~6 blocks for 99.9% confidence)
- **Economic finality**: Cost of reverting exceeds the benefit (PoS, finality after 2/3 validator vote)
- **Instant finality**: No forks possible after block is added (BFT, requires 2/3+ honest validators)

## Network Topology

### Peer-to-Peer Architecture
Each node connects to 8-125 peers. Transactions and blocks are gossiped via flood fill (Bitcoin) or mesh networks (libp2p). Peer discovery uses DNS seeds, hardcoded nodes, and address relay. NAT traversal via UPnP.

### Transaction Propagation
Transactions are validated before relay. Invalid transactions are dropped at the receiving node (not relayed). Each node maintains a mempool of valid unconfirmed transactions. Mempool policy varies by node (not consensus-critical).

## State Models

### UTXO Model
State is a set of Unspent Transaction Outputs. Each UTXO has: amount (satoshis), script (spending condition). Transactions consume UTXOs and create new ones. Pros: parallelizable validation, inherent privacy. Cons: state bloat, complex smart contracts.

### Account Model
State is a mapping of addresses to balances and contract storage. Each transaction is an instruction from one account. Pros: intuitive, composable, efficient for smart contracts. Cons: sequential nonce, replay protection needed, state bloat from contract storage.
