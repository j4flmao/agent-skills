# Blockchain Data Query Patterns

## Query Layer Architecture

Blockchain data querying sits between raw indexed data and application consumers. A well-designed query layer abstracts blockchain-specific complexities (reorgs, finality, event ordering) behind familiar database interfaces.

### Query Service Components

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  Consumer    │───▶│  Query API   │───▶│  Cache Layer │
│  (App/User)  │    │  (GraphQL/   │    │  (Redis/CDN) │
└─────────────┘    │   REST/gRPC) │    └──────┬───────┘
                   └──────┬───────┘           │
                          │                   │
                   ┌──────▼───────────────────▼───────┐
                   │      Query Router / Aggregator    │
                   │   (resolves data sources, joins)  │
                   └──────┬───────────────────┬───────┘
                          │                   │
              ┌───────────▼─────┐    ┌────────▼──────────┐
              │  Indexed DB     │    │  Full-Node RPC    │
              │  (PostgreSQL)   │    │  (direct chain    │
              │                 │    │   queries)        │
              └─────────────────┘    └───────────────────┘
```

## Query Patterns

### Time-Based Range Queries

```sql
-- Efficient time-range query using composite index
SELECT block_number, event_name, decoded_data
FROM decoded_events
WHERE contract_address = '0xabc...'
  AND block_timestamp >= NOW() - INTERVAL '7 days'
  AND block_timestamp < NOW()
ORDER BY block_number ASC, log_index ASC;
```

### Paginated Queries with Cursors

```typescript
async function queryEvents(
  contractAddress: string,
  eventSignature: string,
  cursor?: string,
  limit: number = 100
): Promise<QueryResult> {
  const query = `
    SELECT id, block_number, log_index, decoded_data
    FROM decoded_events
    WHERE contract_address = $1
      AND event_signature = $2
      ${cursor ? `AND (block_number, log_index) > ($3, $4)` : ''}
    ORDER BY block_number ASC, log_index ASC
    LIMIT $5
  `;
  const params = cursor
    ? [contractAddress, eventSignature, cursor.blockNumber, cursor.logIndex, limit]
    : [contractAddress, eventSignature, limit];

  const rows = await db.query(query, params);
  const nextCursor = rows.length === limit
    ? { blockNumber: rows[rows.length - 1].block_number, logIndex: rows[rows.length - 1].log_index }
    : null;

  return { data: rows, nextCursor };
}
```

### Multi-Contract Aggregation

```typescript
async function queryAggregatedBalances(
  walletAddress: string,
  tokenAddresses: string[],
  blockNumber?: number
): Promise<BalanceMap> {
  const query = blockNumber
    ? `SELECT DISTINCT ON (contract_address) contract_address, balance
       FROM token_balances
       WHERE wallet_address = $1
         AND contract_address = ANY($2::text[])
         AND block_number <= $3
       ORDER BY contract_address, block_number DESC`
    : `SELECT contract_address, balance
       FROM token_balances
       WHERE wallet_address = $1
         AND contract_address = ANY($2::text[])
         AND is_current = true`;

  const rows = await db.query(query, [walletAddress, tokenAddresses, blockNumber]);
  return rows.reduce((map, row) => {
    map[row.contract_address] = row.balance;
    return map;
  }, {} as BalanceMap);
}
```

### Full-Text Search on Events

```sql
-- Enable full-text search on decoded event data
ALTER TABLE decoded_events ADD COLUMN search_vector tsvector;

CREATE INDEX idx_event_search ON decoded_events USING GIN(search_vector);

-- Update search vector via trigger
CREATE OR REPLACE FUNCTION update_event_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.decoded_data::text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_search_vector
  BEFORE INSERT OR UPDATE ON decoded_events
  FOR EACH ROW EXECUTE FUNCTION update_event_search_vector();

-- Search query
SELECT block_number, decoded_data
FROM decoded_events
WHERE search_vector @@ to_tsquery('english', 'transfer & >1000')
ORDER BY block_number DESC
LIMIT 50;
```

## Caching Strategies

### Multi-Layer Cache

```typescript
class BlockchainQueryCache {
  private redis: Redis;
  private local: Map<string, CacheEntry>;

  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 60
  ): Promise<T> {
    // L1: Local in-memory cache (millisecond latency)
    const localEntry = this.local.get(key);
    if (localEntry && Date.now() - localEntry.timestamp < ttl * 1000) {
      return localEntry.data as T;
    }

    // L2: Redis cache (sub-millisecond latency)
    const cached = await this.redis.get(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      this.local.set(key, { data: parsed, timestamp: Date.now() });
      return parsed as T;
    }

    // L3: Database fetch (millisecond latency)
    const data = await fetcher();
    await this.redis.set(key, JSON.stringify(data), 'EX', ttl);
    this.local.set(key, { data, timestamp: Date.now() });
    return data;
  }

  invalidatePattern(pattern: string): void {
    this.local.clear();
    this.redis.del(pattern);
  }
}
```

### Cache Invalidation on Reorgs

```typescript
async function handleReorg(
  fromBlock: number,
  toBlock: number
): Promise<void> {
  // Invalidate all cached queries that include affected blocks
  await cache.invalidatePattern(`blocks:${fromBlock}-${toBlock}:*`);

  // Re-fetch and re-cache affected data
  const affectedContracts = await db.query(
    `SELECT DISTINCT contract_address
     FROM decoded_events
     WHERE block_number BETWEEN $1 AND $2`,
    [fromBlock, toBlock]
  );

  for (const { contract_address } of affectedContracts.rows) {
    await cache.invalidatePattern(`contract:${contract_address}:*`);
  }
}
```

## Query Optimization

### Materialized Views for Complex Queries

```sql
CREATE MATERIALIZED VIEW mv_daily_token_metrics AS
SELECT
  contract_address,
  DATE_TRUNC('day', block_timestamp) AS day,
  COUNT(*) AS event_count,
  COUNT(DISTINCT from_address) AS unique_senders,
  COUNT(DISTINCT to_address) AS unique_receivers,
  SUM(amount) AS total_volume
FROM decoded_events
WHERE event_signature = 'Transfer'
GROUP BY contract_address, DATE_TRUNC('day', block_timestamp);

CREATE UNIQUE INDEX idx_mv_daily_token_metrics
  ON mv_daily_token_metrics (contract_address, day);

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_token_metrics;
```

### Partitioned Tables

```sql
-- Partition by month for efficient range queries
CREATE TABLE decoded_events (
  id BIGSERIAL,
  block_number BIGINT NOT NULL,
  log_index INT NOT NULL,
  block_timestamp TIMESTAMPTZ NOT NULL,
  contract_address TEXT NOT NULL,
  decoded_data JSONB
) PARTITION BY RANGE (block_timestamp);

-- Create monthly partitions
SELECT PARTITION_NAME FROM CREATE_MONTHLY_PARTITIONS(
  'decoded_events', 'block_timestamp', '2024-01-01', 12
);
```

## Key Points

- Use cursor-based pagination over offset-based for blockchain data
- Composite indexes on (block_number, log_index) for ordered queries
- Multi-layer caching (local + Redis + DB) with reorg-aware invalidation
- Materialized views for complex aggregations refreshed concurrently
- Partition large event tables by time for query performance
- Full-text search vectors for decoded event data exploration
