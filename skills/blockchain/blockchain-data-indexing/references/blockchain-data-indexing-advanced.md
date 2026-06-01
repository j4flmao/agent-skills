# Blockchain Data Indexing Advanced Topics

## Reorg Handling Strategies

### Confirmation Depth
Choose confirmation depth based on finality model: Ethereum PoS (2+ slots, ~12 seconds), Bitcoin PoW (6+ blocks, ~1 hour), Solana (32+ slots, ~1.6 seconds), Cosmos (instant, 0 confirmations needed). Unconfirmed data is subject to reorganization.

### Unwind Logic
When a reorg occurs, the indexer must revert blocks in reverse order: remove indexed data from reorged blocks, then apply new blocks in correct order. Snapshot-based states make this efficient — save state periodically and replay from last snapshot.

## Multi-Chain Aggregation

### Cross-Chain Data Joins
Index data from multiple chains independently, then join in a unified query layer. Goldsky Mirror and custom Postgres/FDW setups support cross-chain queries. Challenge: different chains have different block times, finality models, and data formats.

### Unified Schema Design
Create a chain-agnostic schema for cross-chain analysis. Example: standard `token_transfers` table across all EVM chains with chain_id column. Abstract chain-specific details into a metadata layer.

## Performance Optimization

### Batch Processing
Process blocks in batches (100-1000 blocks at a time) instead of one-at-a-time. This reduces RPC call overhead and database write amplification. Batch size depends on event density — higher density batches should be smaller to avoid memory pressure.

### Sharding
For high-traffic contracts, shard indexing by block ranges. Multiple worker processes index different block ranges in parallel. Merge results in the database layer. Coordinate via a shared offset tracker.

### Caching
Cache frequently queried data points: current prices, TVL aggregates, top holders. Invalidation strategy depends on data freshness requirements. For real-time dashboards, cache TTL should be < 1 minute.
