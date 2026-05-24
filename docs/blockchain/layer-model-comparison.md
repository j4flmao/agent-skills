# Blockchain Layer Model Comparison

## Architecture Types

### Nakamoto Consensus (Bitcoin)

```
Chain: Linear, longest chain rule
Finality: Probabilistic (6+ confirmations)
Fork choice: Most accumulated PoW
Throughput: 7 tps (limited by block size 4MB + 10min interval)
Security: 51% hash power attack, cost ~$300K/hr (ASIC)
```

### Gasper Consensus (Ethereum)

```
Chain: Linear, LMD-GHOST fork choice
Finality: Casper FFG finality after 2 epochs (~12.8min)
Fork choice: Latest message driven, heaviest subtree
Throughput: 15-30 tps L1 (limited by 30M gas/12s)
Security: 33%++ slashable equivocation, 66% finality revert
Rollup capacity: 2,000+ tps via L2 (blobs EIP-4844)
```

### Proof of History (Solana)

```
Chain: PoH sequence (VDF ticks) with Tower BFT on top
Finality: Deterministic after PoH + Tower (~400ms)
Fork choice: PoH height + Tower vote weighting
Throughput: 2,000-4,000 tps (peak 50k+ with GPU)
Security: 33% stake Byzantine (Tower BFT)
Unique: Global clock via SHA-256 chain, parallel execution
```

### BFT Consensus (Cosmos SDK)

```
Chain: Linear, Tendermint BFT (PBFT variant)
Finality: Instant after 2/3+ precommits (~2-7s)
Fork choice: N/A (no forks, BFT deterministic)
Throughput: 1,000-10,000 tps (application dependent)
Security: 33% Byzantine (safety), 33% liveness
Interop: IBC for multi-chain communication
```

### DAG-Based (Avalanche, Hedera)

| Chain | Structure | Finality | Throughput | Security |
|-------|-----------|----------|------------|----------|
| Avalanche | DAG (mempool) + Snowman chain | ~1-2s (probabilistic BFT) | 4,500 tps | 51% collision resistance |
| Hedera | Hashgraph DAG | 3-5s (aBFT) | 10,000+ tps | ABFT, 1/3 Byzantine |
| Fantom | Lachesis DAG | ~1s (aBFT) | 2,000+ tps | 33% Byzantine |

## Comprehensive Comparison

| Property | Bitcoin | Ethereum | Solana | Cosmos | Avalanche | Cardano |
|----------|---------|----------|--------|--------|-----------|---------|
| Consensus | PoW | PoS | PoH+Tower | BFT | Snowman | Ouroboros |
| State Model | UTXO | Account | Account | Account | UTXO+Account | eUTxO |
| VM | Script | EVM | SVM (BPF) | CosmWasm/evm | EVM | Plutus |
| Smart Contracts | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Native Tokens | BTC | ETH | SOL | ATOM | AVAX | ADA |
| TPS (L1) | 7 | 15-30 | 2,000-4,000 | 1,000-10k | 4,500 | 250-1,000 |
| Block Time | 10min | 12s | 400ms | 2-7s | 1-2s | 20s |
| Finality | 1hr | 12.8min | 0.4s | 2-7s | 1-2s | 20s |
| Validators | Miners | 1M+ stakers | 2k validators | 100-300 | 1.5k validators | SPOs |
| Lang | C++ | Go/Rust/Solidity | Rust/C | Go/Rust | Solidity/Rust | Haskell/Plutus |

## Systemic Trade-offs

- **Throughput vs Decentralization**: Higher TPS → higher validator requirements → fewer validators
- **Finality vs Latency**: Deterministic finality needs more communication rounds → higher latency
- **Programmability vs Security**: Turing-complete VMs → more attack surface → higher audit cost
- **Composability vs Isolation**: Shared state (Ethereum) → atomic composability → single point failure

## Related Skills

- Consensus mechanisms → `blockchain-core/references/consensus-deep-dive.md`
- Bitcoin → `blockchain-bitcoin/`
- Ethereum → `blockchain-ethereum/`
- Solana → `blockchain-solana/`
- Cross-chain → `blockchain-cross-chain/`
