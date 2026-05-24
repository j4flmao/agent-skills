# Blockchain System Architecture

## Layered Model

```
┌─────────────────────────────────────────────────────┐
│                   Application Layer                   │
│  DeFi, NFTs, Gaming, Identity, DAO, Supply Chain     │
├─────────────────────────────────────────────────────┤
│                  Protocol Layer (L1/L2)               │
│  Smart Contracts, Token Standards, Cross-Chain Msg    │
├─────────────────────────────────────────────────────┤
│                Consensus & Execution Layer             │
│  State Machine, Tx Pool, VM (EVM/SVM/eUTxO), Finality│
├─────────────────────────────────────────────────────┤
│                Network Layer (P2P)                     │
│  Gossip, Discovery, Block Propagation, Sync            │
├─────────────────────────────────────────────────────┤
│                Data & Storage Layer                     │
│  Merkle Tree, State Trie, DB (LevelDB/PostgreSQL)      │
└─────────────────────────────────────────────────────┘
```

## Layer Breakdown by Chain

| Layer | Bitcoin | Ethereum | Solana | Cosmos |
|-------|---------|----------|--------|--------|
| Consensus | Nakamoto PoW | Gasper PoS (Casper+LMD) | PoH + Tower BFT | Tendermint BFT |
| Execution | Bitcoin Script | EVM | SeaLevel (SVM) | CosmWasm / EVM |
| State Model | UTXO | Account | Account | Account (IBC) |
| Finality | Probabilistic (~1hr) | Probabilistic (2 epochs) | Deterministic (~0.4s) | Deterministic (~2s) |
| Tx Order | MemPool → Block | MemPool → Beacon → Execution | Gulf Stream → PoH → Banking | MemPool → Proposer |

## Data Flow: Transaction Lifecycle

```
User → Sign Tx → Submit to RPC
  ↓
Mempool Validation (signature, nonce, balance, gas)
  ↓
Block Building (ordering, execution, state root)
  ↓
Block Propagation (gossip protocol)
  ↓
Block Validation (all nodes re-execute or verify proof)
  ↓
Finalization (fork choice rule)
  ↓
State Commitment (Merkle root in next block)
```

## System Properties

- **Security**: Economic (cost of attack > profit), Cryptographic (hash, sig, ZK), Protocol (finality, reorg resistance)
- **Decentralization**: Node count, hardware requirements, geographic distribution, validator set size
- **Scalability**: Tx throughput, state growth, bloat, L1 vs L2 capacity

## Cross-Layer Interactions

- L1 finality → L2 bridge delay → Application
- MEV at execution → Relays at consensus → Economic security
- State size → Node hardware requirements → Decentralization

## Related Skills

- Core protocol → `blockchain-core/`
- Consensus deep → `blockchain-core/references/consensus-deep-dive.md`
- State machines → `blockchain-core/references/state-machines.md`
- P2P networking → `blockchain-core/references/p2p-networking.md`
- Layer 2 scaling → `blockchain-ethereum/references/layer2-scaling.md`
- Cross-chain → `blockchain-cross-chain/`
- Zero-knowledge → `blockchain-zk/`
