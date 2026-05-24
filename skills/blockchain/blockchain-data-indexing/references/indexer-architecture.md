# Indexer Architecture Patterns

## Overview

Blockchain indexers ingest on-chain data (blocks, transactions, logs, traces) into a queryable store. This reference covers the three dominant patterns: event-driven indexing, batch (EigenPhi/TrueBlocks), and full ETL pipelines.

## Event-Driven Indexing (Log Polling)

### Architecture

```
Chain RPC → Poll logs → Decode events → Store → Serve API
                ↑                          │
                └── Reorg detection ───────┘
```

### Core loop

```typescript
const CONFIRMATION_DEPTH = 64
let fromBlock = START_BLOCK

async function poll() {
  const latest = await provider.getBlockNumber()
  const toBlock = latest - CONFIRMATION_DEPTH

  if (fromBlock > toBlock) return // nothing new

  const logs = await provider.getLogs({
    address: TARGET_CONTRACT,
    topics: [EVENT_SIG],
    fromBlock,
    toBlock,
  })

  for (const log of logs) {
    const event = decodeLog(log)
    await store.insertEvent(event)
  }

  fromBlock = toBlock + 1
}
```

### Reorg handling

Chain reorganizations occur when a competing block is accepted. The indexer must:

1. **Detect** — compare chain tip hash periodically against stored hash.
2. **Unwind** — delete events above the common ancestor block.
3. **Replay** — re-index from the safe ancestor forward.

```typescript
async function checkReorg() {
  // Get the last indexed block's hash from storage
  const storedHash = await store.getBlockHash(fromBlock - 1)

  // Get the canonical hash from the node
  const canonicalHash = await provider.getBlock(fromBlock - 1).hash

  if (storedHash !== canonicalHash) {
    // Find common ancestor (binary search)
    const safeBlock = await findCommonAncestor(fromBlock - 1)

    // Unwind
    await store.deleteEventsAbove(safeBlock)

    // Reset fromBlock to safe ancestor
    fromBlock = safeBlock
  }
}
```

### Unwinding

```sql
-- Delete events from the reorged branch
DELETE FROM events
WHERE block_number > :safe_block
  AND block_number <= :unwound_block
```

## Batch Processing (EigenPhi, TrueBlocks)

### Architecture

```
RPC / Archive → Chunked block range → Parallel decode → Aggregation → Store
```

### TrueBlocks approach

TrueBlocks runs a local indexer that scans the chain in chunks:

```bash
chifra list --blocks 15000000-15001000 0xContractAddr
chifra export --fmt json 0xContractAddr
```

Process: scrape → index → serve. The scrape step extracts appearances, the index step builds a bloom-filtered index, and export replays the data.

### EigenPhi approach

EigenPhi processes transactions in parallel batches (typically 50-100 blocks), decoding all calls and logs within each batch:

```typescript
async function batchProcess(fromBlock: number, toBlock: number) {
  const blocks = await Promise.all(
    range(fromBlock, toBlock).map(b => provider.getBlockWithTransactions(b))
  )

  const events = blocks.flatMap(block =>
    block.transactions.flatMap(tx =>
      tx.logs?.map(log => decodeLog(log)) ?? []
    )
  )

  await store.bulkInsert(events)
}
```

### Benefits of batch processing

- Higher throughput (parallel RPC calls).
- Consistent snapshots (no partial block indexing).
- Easier reorg handling (re-process the entire batch if any block in the range reorgs).

## ETL Pipeline for Blockchain Data

### Full pipeline design

```
┌──────────┐   ┌──────────────┐   ┌──────────────┐   ┌───────────┐
│  Source  │ → │  Extract     │ → │  Transform   │ → │   Load    │
│ (RPC /   │   │ (raw blocks, │   │ (decode,     │   │ (DB /     │
│  P2P)    │   │  logs,       │   │  enrich,     │   │  Data     │
│          │   │  traces)     │   │  normalize)  │   │  Lake)    │
└──────────┘   └──────────────┘   └──────────────┘   └───────────┘
```

### ETL stages

#### 1. Extract

```typescript
// Raw block ingestion
async function extractBlocks(fromBlock: number, toBlock: number) {
  const blocks = []
  for (let b = fromBlock; b <= toBlock; b++) {
    const block = await provider.send("eth_getBlockByNumber", [
      `0x${b.toString(16)}`,
      true, // include full transactions
    ])
    blocks.push(block)
  }
  return blocks
}
```

Retry with exponential backoff on rate limits. Use archive nodes for historical data.

#### 2. Transform

```typescript
function transformBlock(block: RawBlock): TransformedBlock {
  return {
    number: parseInt(block.number, 16),
    hash: block.hash,
    timestamp: parseInt(block.timestamp, 16),
    transactions: block.transactions.map((tx: RawTx) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: BigInt(tx.value),
      gasUsed: parseInt(tx.gas, 16),
      status: tx.status === "0x1" ? "success" : "failed",
    })),
    logs: block.transactions.flatMap((tx: RawTx) =>
      (tx.logs ?? []).map(transformLog)
    ),
  }
}
```

#### 3. Load

```typescript
// Batch insert with conflict handling
async function loadBlocks(blocks: TransformedBlock[]) {
  const client = new Pool({ connectionString: process.env.DATABASE_URL })

  for (const block of blocks) {
    await client.query(
      `INSERT INTO blocks (number, hash, timestamp)
       VALUES ($1, $2, to_timestamp($3))
       ON CONFLICT (number) DO UPDATE
       SET hash = EXCLUDED.hash, timestamp = EXCLUDED.timestamp
       WHERE blocks.hash IS DISTINCT FROM EXCLUDED.hash`,
      [block.number, block.hash, block.timestamp]
    )
  }
  await client.end()
}
```

## Handling Reorgs, Missing Blocks, and Healing

### Reorg detection strategies

| Strategy            | Description                                     | Trade-off                     |
|---------------------|-------------------------------------------------|-------------------------------|
| Confirmation depth  | Wait N blocks before indexing                   | Simpler, higher latency       |
| Hash chain tracking | Store parent hash of each block; detect mismatch | Complex, lower latency        |
| L2 safe/finalized   | Use L2 safe/finalized labels                    | Only on OP Stack / Arbitrum   |

### Missing block healing

```typescript
// Detect gaps in indexed blocks
async function healGaps() {
  const indexed = await store.getIndexedBlockNumbers()
  const gaps = findGaps(indexed, currentBlock)

  for (const { from, to } of gaps) {
    const blocks = await extractBlocks(from, to)
    await loadBlocks(blocks.map(transformBlock))
  }
}
```

### fromBlock / toBlock healing

```typescript
// Backfill / heal a specific range
async function healRange(fromBlock: number, toBlock: number) {
  // Delete existing data in range
  await store.deleteEventsInRange(fromBlock, toBlock)

  // Re-index
  const logs = await provider.getLogs({ fromBlock, toBlock })
  await store.bulkInsert(logs.map(decodeLog))
}
```

## Comparison Matrix

| Pattern            | Latency | Throughput | Reorg safety    | Complexity |
|--------------------|---------|------------|-----------------|------------|
| Event-driven poll  | Low     | Medium     | Good (depth)    | Low        |
| Batch chunked      | Medium  | High       | Very good       | Medium     |
| Full ETL pipeline  | High    | Very high  | Best            | High       |
