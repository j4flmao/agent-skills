# Dune Analytics Reference

## Overview

Dune Analytics provides a SQL-based query engine (Databricks SQL) over decoded blockchain data. It supports Ethereum and 20+ other chains via `crypto_` tables, raw tables, and the Spellbook abstraction layer.

## Query Engine

Dune uses **Databricks SQL** dialect. Key differences from standard SQL:

- `double` instead of `float`/`real`
- `array<type>` for arrays
- `struct<field: type, ...>` for structs
- `LATERAL VIEW EXPLODE()` for unnesting arrays
- `DATE_TRUNC('day', timestamp)` — first arg is string, not interval
- `POWER(10, 18)` instead of `1e18` for decimal math
- `uint256` is stored as `string` — cast with `try_cast(value AS decimal(38,0))`

## Core Data Tables

### Raw tables (per chain)

| Table                          | Description                          |
|--------------------------------|--------------------------------------|
| `ethereum.blocks`              | Block headers                        |
| `ethereum.transactions`        | Transaction data                     |
| `ethereum.logs`                | Raw event logs (un-decoded)          |
| `ethereum.traces`              | Internal call traces                 |

Replace `ethereum` with `polygon`, `arbitrum`, `optimism`, `bnb`, `avalanche_c`, `base`, `gnosis`, etc.

### Important raw columns

```sql
SELECT
  block_number,
  block_time,
  tx_hash,
  topic0, topic1, topic2, topic3,  -- log event sig & indexed params
  data,                             -- unindexed event params (hex)
  contract_address
FROM ethereum.logs
WHERE topic0 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'  -- Transfer
  AND block_time >= now() - interval '7' day
```

## Decoded Tables (ABI-based)

When a contract's ABI has been submitted to Dune, decoded tables are available:

```sql
-- Decoded event:
SELECT * FROM uniswap_v3_ethereum.Pool_evt_Swap
WHERE block_time >= now() - interval '7' day

-- Decoded function call:
SELECT * FROM uniswap_v3_ethereum.Pool_call_mint
WHERE call_success = TRUE
```

Decoded table naming convention: `<project>_<chain>.<Contract>_evt_<Event>` or `_call_<Function>`.

## Spellbook (Abstracted Models)

Spellbook is Dune's open-source transformation layer. Use `spellbook` schema models for curated, tested abstractions:

```sql
-- DEX trades across all chains
SELECT * FROM spellbook.trades

-- ERC-20 transfers
SELECT * FROM spellbook.erc20_ethereum.evt_Transfer

-- NFT trades
SELECT * FROM spellbook.nft.trades
```

Key spellbook models:

| Model               | Description                     |
|---------------------|---------------------------------|
| `spellbook.trades`  | Normalized DEX trades           |
| `spellbook.lending.lending` | Lending protocol events   |
| `spellbook.nft.trades` | NFT marketplace trades        |
| `spellbook.daoharvest` | DAO treasury models         |

## All Chains Views

Use `crypto_` cross-chain views when querying across multiple networks:

```sql
SELECT * FROM crypto_ethereum.transactions  -- same as ethereum.transactions
SELECT * FROM crypto_polygon.transactions
```

Cross-chain helpers in `crypto_` schema auto-union data from all indexed chains where available.

## Parameterized Queries

```sql
-- Use double curly braces for parameters
SELECT
  block_time,
  tx_hash,
  amount / POWER(10, 18) AS amount_eth
FROM ethereum.transactions
WHERE "{{Token}}" = token_symbol
  AND block_time >= '{{StartDate}}'
  AND block_time < '{{EndDate}}'
ORDER BY block_time DESC
```

Parameters are set via the Dune UI or API.

## Materialized Views (Query Credits)

Queries can incrementally update. Dune auto-refreshes based on freshness settings:

- `freshness: daily` — refreshes once per day (free).
- `freshness: every 6 hours` — uses query credits.
- `freshness: every hour` — uses more query credits.

## Dune API

```bash
curl -H "x-dune-api-key: $DUNE_API_KEY" \
  "https://api.dune.com/api/v1/query/{{execution_id}}/results"
```

### API endpoints

| Endpoint                          | Method | Description               |
|-----------------------------------|--------|---------------------------|
| `/api/v1/query/execute/:id`       | POST   | Execute a saved query     |
| `/api/v1/query/:id/results`       | GET    | Get results               |
| `/api/v1/query/:id/status/:exec`  | GET    | Check execution status    |
| `/api/v1/query/:id/results/:exec` | GET    | Get results by execution  |

Rate limit: 10 req/min for free tier, 20 req/min for pro.

## Example: TVL Query

```sql
WITH deposits AS (
  SELECT
    DATE_TRUNC('day', evt_block_time) AS day,
    SUM(amount / POWER(10, 18)) AS deposit_eth
  FROM lending_pool_ethereum.LendingPool_evt_Deposit
  GROUP BY 1
),
withdrawals AS (
  SELECT
    DATE_TRUNC('day', evt_block_time) AS day,
    SUM(amount / POWER(10, 18)) AS withdraw_eth
  FROM lending_pool_ethereum.LendingPool_evt_Withdraw
  GROUP BY 1
)
SELECT
  COALESCE(d.day, w.day) AS day,
  SUM(COALESCE(d.deposit_eth, 0) - COALESCE(w.withdraw_eth, 0))
    OVER (ORDER BY COALESCE(d.day, w.day)) AS tvl_eth
FROM deposits d
FULL OUTER JOIN withdrawals w ON d.day = w.day
ORDER BY 1
```

## Example: DEX Volume Query

```sql
SELECT
  DATE_TRUNC('day', block_time) AS day,
  project,
  SUM(amount_usd) AS volume_usd
FROM spellbook.trades
WHERE block_time >= now() - interval '30' day
  AND blockchain = 'ethereum'
GROUP BY 1, 2
ORDER BY 1, 3 DESC
```

## Creating Dashboards

1. Write and save a query in Dune.
2. Add visualizations (bar, line, area, pie, table, counter).
3. Create a dashboard from the "New Dashboard" button.
4. Add saved visualizations to the dashboard.
5. Configure refresh interval and sharing settings.

## Best Practices

- **Prefer spellbook models** over raw decoded tables when available.
- **Use `now() - interval`** instead of hard-coded dates for auto-refreshing dashboards.
- **Cast `uint256` string columns** with `try_cast(value AS decimal(38,0))`.
- **Avoid `SELECT *`** on wide decoded tables — specify columns for performance.
- **Use `LATERAL VIEW EXPLODE()`** for array columns (multi-token transfers, etc.).
- **Join on `block_number` + `tx_hash`** for log→transaction lookups.
