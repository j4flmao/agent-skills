---
name: blockchain-core
description: >
  Use this skill when asked about blockchain fundamentals, consensus mechanisms, PoW, PoS, gas, staking, blockchain data structures, DAG consensus, Avalanche, MEV, PBS, economic security, blockchain node implementation. Languages: C++, Go. Covers core protocol engineering including consensus algorithms (Nakamoto, PBFT, HotStuff, Snowman, DAG-BFT), MEV taxonomy and MEV supply chain (PBS, ePBS, MEV-Boost, FOCIL), cryptographic primitives (hashing, ECDSA, BLS, Merkle proofs), state machine design (UTXO, account model), mempool and transaction pool, P2P networking, and blockchain storage engines. Do NOT use for: smart contract development (use blockchain-application), web3 frontend integration (use blockchain-web3), or general cryptography outside blockchain context.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [blockchain, core, consensus, cryptography, protocol, state-machine, phase-blockchain]
---

# blockchain-core

## Trigger
"blockchain core", "consensus mechanism", "proof of work", "proof of stake", "PoW", "PoS", "DAG consensus", "Avalanche consensus", "Snowman", "Hashgraph", "gas", "staking", "MEV", "miner extractable value", "PBS", "proposer builder separation", "MEV-Boost", "ePBS", "blockchain node", "C++ blockchain", "Go blockchain", "blockchain protocol", "mempool", "transaction pool", "block finality", "blockchain data structure", "merkle tree", "cryptography blockchain", "p2p blockchain", "blockchain state machine", "economic security"

## Rules
1. Use C++ for performance-critical blockchain node implementations (Bitcoin Core, geth C++ parts, EOS)
2. Use Go for production blockchain nodes (go-ethereum, Tendermint/Cosmos, Hyperledger Fabric)
3. Prefer BFT-based consensus for permissioned networks, Nakamoto consensus for permissionless
4. Always consider state machine design (UTXO vs account model) based on use case
5. Follow established blockchain architecture patterns — do not invent custom consensus without rigorous analysis
6. Reference specific blockchain implementations (Bitcoin, Ethereum, Cosmos, Solana) for real-world context
7. Use the references in `references/` for deep technical detail

## Response Format
1. **Architecture overview**: consensus family + state model + network topology
2. **Key mechanisms**: finality, fork choice, security assumptions, economic security
3. **Implementation guidance**: C++ or Go patterns, database backend, networking
4. **Trade-offs**: security vs performance, decentralization vs throughput, latency vs finality

## References
- references/blockchain-data-structures.md — Block structure, headers, and on-disk formats
- references/consensus-deep-dive.md — Nakamoto, BFT, HotStuff, and Snowman consensus
- references/cryptography-foundations.md — Core cryptography primitives for blockchain
- references/dag-consensus.md — DAG-based consensus (Avalanche, Hashgraph)
- references/economic-security-mev.md — MEV taxonomy, PBS, and economic security
- references/gas-and-staking.md — Gas metering, fee models, and staking mechanics
- references/node-implementation.md — Bitcoin Core, geth, and node architecture
- references/p2p-networking.md — Peer discovery, gossip, and block propagation
- references/state-machines.md — UTXO, account model, and state transitions

## Phase
blockchain → blockchain-core
