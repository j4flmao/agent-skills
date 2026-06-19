---
name: blockchain-data-indexing
description: >
  Blockchain indexing covering The Graph subgraphs, Dune Analytics, Goldsky pipelines, ChainIndex custom indexers, and ETL event-warehousing patterns for blockchain data. Covers event-driven indexing, reorg handling, data source templates, and multi-chain data aggregation. Do NOT use for: web3 frontend data fetching (use blockchain-web3), smart contract development (use blockchain-application), or general ETL (out of scope).
version: 2.0.0
author: j4flmao
license: MIT
tags:
  - blockchain
  - indexing
  - data
  - subgraph
  - dune
  - phase-blockchain
---

# Blockchain Data Indexing

## Purpose
Guide the selection and implementation of blockchain data indexing solutions. Covers The Graph subgraphs, Dune Analytics queries, Goldsky pipelines, and custom indexer architecture for transforming raw on-chain data into queryable formats.

## Agent Protocol

### Trigger Keywords
"blockchain indexer", "subgraph", "The Graph", "Dune Analytics", "Dune", "Goldsky", "ChainIndex", "indexer architecture", "event indexing", "event handler", "call handler", "block handler", "data source template", "dynamic data source", "spellbook", "decoded table", "pipeline", "mirror", "ETL blockchain", "reorg handling", "chain reorg", "log polling", "event-driven indexing", "fromBlock", "toBlock", "healing"

### Input Context
- Blockchain and chain(s) to index
- Data to extract (events, calls, state, traces)
- Query patterns (analytical, real-time, historical)
- Infrastructure preferences (managed service vs self-hosted)
- Budget constraints (gas costs, infrastructure costs)
- Reorg tolerance (confirmation depth)

### Output Artifact
Indexing architecture recommendation with configuration, schema design, and production operational plan.

### Response Format
1. **Recommendation**: tool/protocol fitting the use case (The Graph, Dune, Goldsky, ChainIndex, hybrid)
2. **Architecture**: indexing pipeline (source chain → data source → transformation → storage → query layer)
3. **Configuration snippet**: YAML/SQL/AssemblyScript excerpt (subgraph.yaml, Dune query, Goldsky pipeline, event handler)
4. **Reorg & safety**: how design handles reorgs, missing blocks, data consistency
5. **Alternatives/trade-offs**: when another approach is better and why

### Completion Criteria
- Indexing tool selected with justification against alternatives
- Event schema designed with all indexed fields for efficient filtering
- Reorg handling modeled with confirmation depth and unwind logic
- Query patterns optimized (time-range filters, pagination, aggregations)
- Monitoring metrics defined (indexing lag, reorgs, error rate)

### Max Response Length
4000 tokens

## Decision Trees

### Indexing Tool Selection
```
Indexing needs:
├── Standard EVM event/call/block indexing?
│   ├── YES → The Graph (subgraphs)
│   │   ├── Public subgraph → Use hosted service or decentralized network
│   │   └── Private subgraph → Self-hosted graph-node
│   └── NO → Evaluate alternatives
├── SQL-based data exploration?
│   ├── YES → Dune Analytics
│   │   ├── Pre-decoded contracts → Use spellbook / crypto_ tables
│   │   └── Custom contracts → Submit decoded contract request
│   └── NO → Consider other tools
├── Real-time + complex transformations?
│   ├── YES → Goldsky
│   │   ├── Simple pipelines → Goldsky Pipeline (YAML declarative)
│   │   └── Complex joins/aggregation → Goldsky Mirror (SQL)
│   └── NO → The Graph or Dune
├── Full control over schema and storage?
│   ├── YES → ChainIndex or custom indexer
│   │   ├── ChainIndex → Go-based custom indexer framework
│   │   └── Custom → Any stack (Rust, Python, Node) + any DB (Postgres, ClickHouse)
│   └── NO → Managed service (The Graph, Goldsky)
└── Multi-chain aggregation needed?
    ├── YES → Goldsky Mirror or custom (subgraphs per chain + aggregation layer)
    └── NO → Single-chain subgraph or Dune query
```

### Indexing Strategy
```
Data freshness requirements:
├── Real-time (< 1 min latency) → Event-driven indexing, 1 confirmation
├── Near real-time (< 5 min) → Event-driven, 6 confirmations
├── Batch (hourly) → Block-based polling, full confirmation
└── Historical (one-time) → fromBlock scan with batch processing

Reorg handling:
├── 0-1 confirmation → Unwind + reindex on reorg (high risk)
├── 6 confirmations → Standard safe zone, minimal reorgs
├── 12+ confirmations → Very safe, rare reorgs (Ethereum)
└── Finality gadget → No reorg risk (Cosmos, Solana)

Data volume:
├── < 100 events/day → Subgraph or Dune query (free tier)
├── 100-10K events/day → Subgraph (hosted), Goldsky Pipeline
├── 10K-1M events/day → Goldsky Mirror, self-hosted graph-node
└── 1M+ events/day → Custom indexer (Rust/Python + ClickHouse)
```

## Subgraph Architecture (The Graph)

### subgraph.yaml
```yaml
specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: UniswapV3Factory
    network: mainnet
    source:
      address: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
      abi: Factory
      startBlock: 12369621  # Pin to deployment block
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Pool
        - Token
      abis:
        - name: Factory
          file: ./abis/Factory.json
      eventHandlers:
        - event: PoolCreated(indexed address,indexed address,indexed uint24,int24,address)
          handler: handlePoolCreated
      file: ./src/mapping.ts
```

### Schema Design (schema.graphql)
```graphql
type Pool @entity {
  id: ID!
  token0: Token!
  token1: Token!
  feeTier: BigInt!
  liquidity: BigInt!
  sqrtPrice: BigInt!
  createdAtTimestamp: BigInt!
  createdAtBlockNumber: BigInt!
}

type Token @entity {
  id: ID!  # token address
  symbol: String!
  name: String!
  decimals: Int!
  totalSupply: BigInt!
  volumeUSD: BigDecimal!
}
```

### AssemblyScript Mapping Handler
```typescript
import { PoolCreated } from "../generated/Factory/Factory"
import { Pool, Token } from "../generated/schema"
import { fetchTokenMetadata } from "./helpers"

export function handlePoolCreated(event: PoolCreated): void {
  let token0 = Token.load(event.params.token0.toHexString())
  if (!token0) {
    token0 = fetchTokenMetadata(event.params.token0)
    token0.save()
  }
  let token1 = Token.load(event.params.token1.toHexString())
  if (!token1) {
    token1 = fetchTokenMetadata(event.params.token1)
    token1.save()
  }

  let pool = new Pool(event.params.pool.toHexString())
  pool.token0 = token0.id
  pool.token1 = token1.id
  pool.feeTier = event.params.fee
  pool.liquidity = BigInt.zero()
  pool.sqrtPrice = BigInt.zero()
  pool.createdAtTimestamp = event.block.timestamp
  pool.createdAtBlockNumber = event.block.number
  pool.save()
}
```

### Dynamic Data Sources
```yaml
# Template for dynamically created contracts (e.g., Uniswap pools)
templates:
  - name: Pool
    kind: ethereum
    network: mainnet
    source:
      abi: Pool
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Swap
        - Mint
        - Burn
      abis:
        - name: Pool
          file: ./abis/Pool.json
      eventHandlers:
        - event: Swap(indexed address,indexed address,int256,int256,uint160,uint128,int24)
          handler: handleSwap
        - event: Mint(indexed address,indexed address,int24,int24,uint128,uint256,uint256)
          handler: handleMint
      file: ./src/pool-mapping.ts
```

```typescript
// In mapping.ts — create dynamic data source on PoolCreated
import { DataSourceContext, dataSource } from "@graphprotocol/graph-ts"
import { Pool } from "../generated/templates"

export function handlePoolCreated(event: PoolCreated): void {
  // ... entity creation ...
  // Create dynamic data source for the pool
  Pool.create(event.params.pool)
}
```

### Reorg Handling in Subgraphs
```typescript
// Subgraphs handle reorgs via block-based detection
// Graph-node tracks chain head and detects reorgs via block hash changes
// On reorg: unwind entities to the fork block, reapply events

// BEST PRACTICE: Use block handlers for ordering-dependent data
// Event handlers are unordered within a block — use block handler for finality

// Reorg-safe pattern: store block hash in entity
export function handleSwap(event: Swap): void {
  let swap = new Swap(event.transaction.hash.toHexString() + "-" + event.logIndex.toString())
  // ... set fields ...
  swap.blockHash = event.block.hash.toHexString()  // Track for reorg detection
  swap.save()
}
```

## Dune Analytics Patterns

### Query Best Practices
```sql
-- Prefer spellbook models over raw decoded tables
-- Use crypto_ethereum / crypto_solana schema for decoded contracts
-- Always filter by block_date or block_time for performance

SELECT
    block_date,
    COUNT(*) AS tx_count,
    SUM(gas_used * gas_price / 1e18) AS total_eth_fees
FROM ethereum.transactions
WHERE block_date >= CURRENT_DATE - INTERVAL '30' DAY
  AND block_date < CURRENT_DATE
  AND success = TRUE
GROUP BY block_date
ORDER BY block_date

-- DEX trading volume by pair (Uniswap v3)
SELECT
    token0.symbol AS token0,
    token1.symbol AS token1,
    SUM(amount0) AS volume_token0,
    SUM(amount1) AS volume_token1,
    COUNT(*) AS swap_count
FROM uniswap_v3_ethereum.Pool_event_Swap
INNER JOIN tokens.erc20 AS token0
    ON Pool_event_Swap.token0 = token0.contract_address
INNER JOIN tokens.erc20 AS token1
    ON Pool_event_Swap.token1 = token1.contract_address
WHERE Pool_event_Swap.evt_block_time >= CURRENT_DATE - INTERVAL '7' DAY
GROUP BY 1, 2
ORDER BY swap_count DESC
```

### Spellbook Usage
- Refer to `spellbook` models for pre-aggregated data
- Use `erc20_evt_Transfer` for standardized token transfer queries
- Join using `evt_tx_hash` and `evt_index` for event-level joins
- Spellbook tables: `dex.trades`, `lending.liquidations`, `nft.trades`

## Goldsky Pipeline Config

### Pipeline Configuration
```yaml
name: uniswap-v3-mirror
sources:
  - name: ethereum_mainnet
    kind: ethereum
    chain_id: 1
    rpc_url: ${RPC_URL_MAINNET}
    start_block: 12369621
    confirmations: 6
transforms:
  - name: pool_created
    source: ethereum_mainnet
    kind: event
    address: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
    event: PoolCreated(indexed address,indexed address,indexed uint24,int24,address)
sinks:
  - name: postgres_db
    kind: postgres
    table: pools
    from: pool_created
```

### Mirror SQL Config
```sql
-- Goldsky Mirror: SQL-based transformation
-- Complex joins across multiple streams
CREATE MATERIALIZED VIEW pool_metrics AS
SELECT
    p.id,
    p.fee_tier,
    p.created_at,
    s.swap_count,
    s.total_volume_usd,
    s.last_swap_at
FROM pools p
LEFT JOIN (
    SELECT
        pool_id,
        COUNT(*) AS swap_count,
        SUM(amount_usd) AS total_volume_usd,
        MAX(block_time) AS last_swap_at
    FROM swaps
    GROUP BY pool_id
) s ON p.id = s.pool_id;
```

## Custom Indexer Architecture

### Design Patterns
```
Components:
├── Blockchain connector: RPC polling or WebSocket subscription
│   ├── Gas-efficient: filter by contract address and event signature
│   ├── Pagination: handle large ranges (eth_getLogs max 10K per call)
│   └── Reconnection: exponential backoff on connection failure
├── Event processor: parse logs, decode using ABI
│   ├── ABI cache: store abi definitions by contract address
│   ├── Typed events: generate typed event structs from ABI
│   └── Enrichment: add block timestamp, transaction metadata
├── Storage layer: write to database
│   ├── TimescaleDB/ClickHouse for time-series heavy workloads
│   ├── Postgres for relational queries
│   └── Message queue (Kafka, NATS) for downstream consumers
└── Query API: expose indexed data
    ├── GraphQL (Hasura, Postgraphile) for flexible queries
    ├── REST for simple key-value access
    └── WebSocket for real-time subscriptions
```

### Reorg Handling in Custom Indexers
```python
# Custom indexer reorg handling strategy
class Indexer:
    def __init__(self, confirmations=6):
        self.confirmations = confirmations
        self.checkpoint_file = "checkpoint.json"

    def process_block(self, block_number: int):
        block = self.rpc.get_block(block_number, full_transactions=True)
        block_hash = block["hash"]

        # Check for reorg: compare block hash with stored parent hash
        last_processed = self.get_checkpoint()
        if last_processed and block["parentHash"] != last_processed["blockHash"]:
            # Reorg detected! Unwind to fork point
            fork_height = self.find_common_ancestor(block)
            self.unwind_to(fork_height)
            self.logger.warning(f"Reorg detected at {block_number}, unwound to {fork_height}")

        # Process only after confirmation depth
        if block_number <= self.latest_confirmed() - self.confirmations:
            self.process_events(block)
            self.save_checkpoint(block_number, block_hash)

    def find_common_ancestor(self, block):
        # Walk backwards until hash matches stored data
        traversed = 0
        while traversed < 100:  # max reorg depth
            stored = self.get_stored_block(block["number"])
            if stored and stored["hash"] == block["hash"]:
                return block["number"]
            block = self.rpc.get_block_by_hash(block["parentHash"])
            traversed += 1
        raise Exception(f"Deep reorg >100 blocks detected: {block['number']}")
```

## Rules
1. **Prefer The Graph for standard EVM event/call/block indexing** unless the user needs SQL-based exploration (Dune)
2. **Dune queries must use Databricks SQL syntax** and prefer `crypto_`/`ethereum_` tables or `spellbook` models over raw decoded tables
3. **Goldsky pipelines** should be declarative YAML source → transformation → sink; use Mirror for complex joins/multi-chain aggregation
4. **ChainIndex custom indexers** only when tight control over storage schema, reorg strategy, or batch processing is needed
5. **Always model reorg handling explicitly** — every design needs confirmation depth, unwind logic, and healing window
6. **Subgraph manifests must pin a specific startBlock** and use correct network; never leave `startBlock: 0` for production
7. **Never expose RPC URLs or API keys in code** — use environment variables
8. **Validate event signatures against known ABIs** before processing
9. **Index only the fields needed for queries** — excessive indexing wastes gas and storage
10. **Monitor indexing lag** — alert if lag exceeds acceptable threshold for the use case
11. **Dynamic data sources** are required for factory-deployed contracts (create new data source per deployment)
12. **AssemblyScript mappings** have limited gas — offload complex computation to post-processing
13. **Dune queries must include time-based filters** for performance (prevent full table scans)
14. **Custom indexers should batch writes** — single-row inserts are 100x slower than batch inserts
15. **Schema evolution** must handle backward-compatible changes (add nullable columns, not remove)

## References
  - references/blockchain-data-indexing-advanced.md — Blockchain Data Indexing Advanced Topics
  - references/blockchain-data-indexing-fundamentals.md — Blockchain Data Indexing Fundamentals
  - references/blockchain-data-query.md — Blockchain Data Query Patterns
  - references/dune-analytics.md — Dune Analytics Reference
  - references/event-processing.md — Blockchain Event Processing
  - references/goldsky-chainindex.md — Goldsky & ChainIndex Reference
  - references/indexer-architecture.md — Indexer Architecture Patterns
  - references/the-graph-subgraph.md — The Graph — Subgraph Reference
  - references/subgraph-performance-tuning.md — Subgraph Performance Tuning
  - references/multi-chain-indexing.md — Multi-Chain Indexing Strategies
  - references/custom-indexer-patterns.md — Custom Indexer Patterns

## Phase: blockchain → blockchain-data-indexing
