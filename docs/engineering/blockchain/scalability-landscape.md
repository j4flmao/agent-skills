# Blockchain Scalability Landscape

## Approaches Comparison

```
                    Scalability Solutions
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
    Layer 1            Layer 2           Sidechains
        │                  │                  │
  ┌─────┴─────┐      ┌────┴────┐         ┌───┴───┐
  │           │      │         │         │       │
Block Size  Sharding Rollup   State    Plasma  PoS Chain
Increase            (ZK/OP)  Channel   (Polygon)
```

## Layer 1 Scaling

### Block Size / Gas Limit Increase

| Chain | Original | Current | Approach |
|-------|----------|---------|----------|
| Bitcoin | 1MB | 4MB (SegWit) | Weight units |
| Ethereum | 15M gas | 30M gas (London) | +100% increase |
| Bitcoin Cash | 1MB | 32MB | Direct block size |

### Sharding

| Type | Description | Example |
|------|-------------|---------|
| State sharding | Each shard maintains subset of state | Ethereum Danksharding |
| Execution sharding | Shards execute independently | Near Nightshade |
| Storage sharding | Shards store subset of history | EIP-4444 (history expiry) |
| Data sharding | Blobs for L2 data availability | EIP-4844 Proto-Danksharding |

## Layer 2 Scaling

### Rollups

| Property | Optimistic Rollup | ZK Rollup |
|----------|------------------|------------|
| Proof | Fraud proof (7d dispute window) | Validity proof (instant) |
| Finality | ~7 days (withdraw) | ~minutes (proof generation) |
| Cost | ~$0.10-0.50 per tx | ~$0.01-0.10 per tx |
| EVM compatible | Fully (Arbitrum, Optimism) | Partial (zkSync), Full (Scroll) |
| Security | Same as L1 (fraud proof) | Math/Computational (ZK proof) |
| Examples | Arbitrum, OP Mainnet, Base | zkSync, StarkNet, Scroll |

### State Channels

- Unlimited off-chain transactions, 2 on-chain
- Use case: payments (Lightning), gaming (State Channels)
- Limitation: requires both parties online, complex routing

### Plasma

- Off-chain execution, Merkle root on L1
- Use case: asset transfers (Plasma Cash)
- Limitation: mass exit problem, data availability

## Hybrid / Other Approaches

| Approach | Mechanism | Throughput | Example |
|----------|-----------|------------|---------|
| Validium | ZK proof off-chain data | 10,000+ tps | StarkEx (dYdX, ImmutableX) |
| Volition | Mix of Rollup + Validium | Configurable | zkSync Era |
| DAG | Parallel block production | 10,000+ tps | Avalanche, Hedera |
| PoH + Parallel Exec | Global clock + GPU | 50,000+ tps (peak) | Solana |

## Data Availability (DA)

- **On-chain**: L1 calldata/blobs (Ethereum blobs = ~0.5 MB/slot)
- **EigenDA**: Restaking-based DA layer (EigenLayer AVS), 2 MB/s
- **Celestia**: Modular DA layer, 2-4 MB/block, data availability sampling (DAS)
- **Avail**: Polygon's DA layer, DAS, 2 MB/block
- **NEAR DA**: DA from sharded L1

## Comparison by Metric

| Solution | Throughput | Finality | Security | Trust Assumptions | Maturity |
|----------|------------|----------|----------|-------------------|----------|
| L1 Sharding | 100,000 tps | L1 finality | L1 security | None | Low (Danksharding) |
| ZK Rollup | 2,000 tps | Minutes | L1 + math | Prover | High (zkSync) |
| OP Rollup | 2,000 tps | 7d | L1 + watcher | Challenger | High (Arbitrum) |
| Validium | 10,000 tps | Minutes | L1 + math + DA | Data committee | Medium |
| State Channel | Unlimited | Instant | Participants | Both online | High (Lightning) |
| Sidechain | 10,000 tps | Seconds | Sidechain consensus | Validators | High (Polygon) |
| DAG | 10,000 tps | Seconds | DAG consensus | Validators | Medium |

## Related Skills

- Ethereum L2 → `blockchain-ethereum/references/layer2-scaling.md`
- ZK rollup → `blockchain-zk/references/zk-rollup-architecture.md`
- zkEVM types → `blockchain-zk/references/zkevm-types.md`
- Cross-chain → `blockchain-cross-chain/`
- Shared sequencer → `blockchain-cross-chain/references/shared-sequencer.md`
