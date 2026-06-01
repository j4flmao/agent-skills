# Blockchain Data Indexing Fundamentals

## Why Index Blockchain Data

Blockchains are optimized for validity (consensus), not queryability. Raw chain data is structured for efficient block production and verification, not for SQL queries, aggregations, or joins. Indexing transforms raw on-chain data (events, calls, state) into query-friendly formats.

### Raw Data Challenges
- Events are logs that require parsing ABI-encoded data
- Historical state queries require archive nodes
- Cross-contract data requires reconstructing relationships
- Time-series analysis requires scanning all blocks
- Real-time updates require log polling or subscriptions

### Indexed Data Benefits
- SQL or GraphQL queries instead of RPC calls
- Historical snapshots at any block height
- Aggregated metrics (TVL, volume, unique users)
- Cross-contract joined data
- Real-time updates via subscriptions

## Common Indexing Approaches

### Event-Driven (The Graph, Goldsky)
Subscribe to specific contract events via node RPC. Index events as they are emitted. Store transformed data in a queryable format. Event-driven approaches are low-latency (blocks → indexed within seconds) and use minimal resources (only index what you need).

### SQL-Based (Dune Analytics)
All decoded blockchain data is available in SQL-queryable tables. Users write raw SQL to extract, aggregate, and visualize data. No infrastructure to manage — data is already indexed. Best for analytical queries, dashboards, and ad-hoc exploration.

### Custom ETL (ChainIndex, bespoke)
Full control over the indexing pipeline. Extract raw data from full/archive node. Transform and load into custom schema in any database. Highest flexibility but highest operational overhead. Used when specific query patterns or storage optimizations are needed.
