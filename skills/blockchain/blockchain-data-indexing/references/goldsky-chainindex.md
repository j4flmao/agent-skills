# Goldsky & ChainIndex Reference

## Goldsky Overview

Goldsky provides a managed indexing platform with two primary products:
- **Subgraph hosting** — managed The Graph subgraph deployment.
- **Mirror** — declarative ETL pipeline builder for custom blockchain data pipelines.

## Pipeline Architecture

Every Goldsky pipeline follows: **Source → Transformation → Sink**

```yaml
# goldsky-pipeline.yaml
name: my-dex-pipeline
version: "1.0"
sources:
  - name: uniswap-pools
    type: subgraph
    subgraph_id: QmX...
    chain: ethereum-mainnet
    startBlock: 15000000
transformations:
  - name: enrich-swaps
    type: sql
    sql: |
      SELECT
        pool_id,
        block_time,
        amount0 / 1e18 AS amount0_eth,
        amount1 / 1e18 AS amount1_eth
      FROM source
    depends_on:
      - uniswap-pools
sinks:
  - name: warehouse
    type: postgres
    table: swaps
    depends_on:
      - enrich-swaps
```

### Source types

- `subgraph` — read from a deployed subgraph.
- `evm-logs` — raw event logs.
- `evm-traces` — raw call traces.
- `evm-blocks` — block headers.

### Transformation types

- `sql` — SQL-based transformation (Trino engine).
- `javascript` — custom JS transform for complex logic.
- `filter` — predicate-based row filtering.

### Sink types

- `postgres` — write to a managed Postgres database.
- `bigquery` — stream to Google BigQuery.
- `s3` — write Parquet files to S3.
- `webhook` — POST transformed data to an endpoint.
- `subgraph` — write back to a subgraph (for nested indexing).

## Subgraph Hosting (Managed vs Dedicated)

| Feature        | Managed                | Dedicated              |
|----------------|------------------------|------------------------|
| Infrastructure | Shared (multi-tenant)  | Single-tenant cluster  |
| SLA            | Best effort            | Guaranteed uptime      |
| RPC            | Goldsky-managed        | Custom RPC endpoint    |
| Cost           | Per-query              | Monthly flat rate      |
| Best for       | Prototypes, low volume | Production, high volume|

## Mirror (Custom Pipeline Builder)

Mirror is Goldsky's pipeline-as-code tool. Example:

```yaml
# mirror-pipeline.yaml
name: cross-chain-liquidity
version: "1.0"
sources:
  - name: eth-swaps
    type: subgraph
    subgraph_id: subnet_eth
    chain: ethereum-mainnet
  - name: arb-swaps
    type: subgraph
    subgraph_id: subnet_arb
    chain: arbitrum-one
transformations:
  - name: union
    type: sql
    sql: |
      SELECT * FROM eth_swaps
      UNION ALL
      SELECT * FROM arb_swaps
sinks:
  - name: aggregated
    type: postgres
    table: aggregated_swaps
```

### Migration handling

```yaml
transformations:
  - name: v2-migration
    type: sql
    sql: |
      -- Handle schema changes with COALESCE for backward compat
      SELECT
        id,
        COALESCE(amount_usd, amount_eth * price) AS amount_usd,
        block_time
      FROM source
```

## Performance Optimization

- **Start block pinning** — always set `startBlock` to the earliest relevant block.
- **Batch size** — configure `batchSize: 10000` for historical backfills.
- **Parallelism** — set `parallelism: 4` for multi-source pipelines.
- **Filter early** — push down filters into SQL transforms to reduce row volume.

## ChainIndex (Custom Indexer Design)

ChainIndex is a framework for building custom blockchain indexers. Use when you need:

- Custom storage schema (not GraphQL).
- Fine-grained reorg handling.
- Batch/historical processing.
- Non-EVM chain support.

### ChainIndex pipeline specification

```yaml
# chainindex-config.yaml
indexer:
  name: custom-token-indexer
  chain: ethereum
  rpc_url: ${RPC_URL}
  startBlock: 18000000
  confirmationBlocks: 64  # wait for 64 confirmations
  batchSize: 5000
handlers:
  - event: Transfer(address,address,uint256)
    contract: "0x..."
    handler: handleTransfer
  - event: Approval(address,address,uint256)
    contract: "0x..."
    handler: handleApproval
storage:
  type: postgres
  schema: custom_token
reorg:
  strategy: unwind
  maxDepth: 256
  checkInterval: 50
  notifyUrl: ${WEBHOOK_URL}
```

### ChainIndex handler example (TypeScript)

```typescript
import { EventHandler, ReorgEvent } from "@chainindex/sdk"

export const handleTransfer: EventHandler = async (event, db) => {
  await db.query(
    `INSERT INTO transfers (tx_hash, from_addr, to_addr, amount, block_number)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tx_hash, log_index) DO NOTHING`,
    [
      event.transactionHash,
      event.params.from,
      event.params.to,
      event.params.value.toString(),
      event.blockNumber,
    ]
  )
}

export const onReorg: ReorgEvent = async (fromBlock, toBlock, db) => {
  await db.query(
    `DELETE FROM transfers WHERE block_number > $1 AND block_number <= $2`,
    [toBlock, fromBlock]
  )
}
```

### When to use ChainIndex over The Graph

| Criterion            | The Graph              | ChainIndex               |
|----------------------|------------------------|--------------------------|
| Query layer          | GraphQL only           | SQL / any                |
| Storage schema       | Auto from `schema.graphql` | Full control          |
| Reorg handling       | Automatic (up to 256)  | Configurable             |
| Batch processing     | Limited                | Full support             |
| Non-EVM chains       | No                     | Yes (with custom adapter)|
| Dynamic contracts    | Templates              | Manual config            |
