# Ethereum Receipts, Event Logs and Indexing

How events are emitted by the EVM, encoded in receipts, summarized by bloom filters, and consumed reliably by indexers with reorg handling.

## Logs in the EVM

Opcodes `LOG0`..`LOG4` emit a log with the current contract address, 0 to 4 32-byte topics, and arbitrary data.
- Gas: 375 base + 375 per topic + 8 per data byte, plus memory expansion.
- Logs are not readable by contracts; they exist only in receipts.
- Reverted calls discard their logs.

### Solidity events
```solidity
event Transfer(address indexed from, address indexed to, uint256 value);
// topic0 = keccak256("Transfer(address,address,uint256)")
//        = 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
// topic1 = from (left-padded to 32 bytes), topic2 = to, data = abi.encode(value)
```
- `indexed` parameters become topics (max 3, or 4 for `anonymous` events which omit topic0).
- Indexed dynamic types (`string`, `bytes`, arrays, structs) are stored as `keccak256` of their encoding, so the original value cannot be recovered from the topic.
- Events with the same signature from different contracts are distinguished only by address; always filter by address for tokens.

## Receipts

Each transaction produces a receipt; type-2+ receipts are typed like transactions.

```
receipt = [status, cumulativeGasUsed, logsBloom, logs]
log     = [address, [topic0, ...], data]
```
RPC receipts add derived fields: `transactionHash`, `blockNumber`, `gasUsed`, `effectiveGasPrice`, `blobGasUsed`, `blobGasPrice`, `contractAddress`, `logIndex` per log.

`logIndex` is the index within the block, not within the transaction.

## Bloom Filters
- Each receipt and header has a 2048-bit `logsBloom`. For each log address and topic, 3 bits are set from `keccak256` of the value.
- Blooms give fast negative answers ("this block definitely has no matching log") and are used by clients for `eth_getLogs`.
- As gas limits rose, block blooms saturate and lose usefulness; clients increasingly use their own log indexes. Do not rely on header blooms in application logic.

## Querying Logs

```ts
import { createPublicClient, http, parseAbiItem } from "viem";
import { mainnet } from "viem/chains";

const client = createPublicClient({ chain: mainnet, transport: http(process.env.RPC_URL) });

const logs = await client.getLogs({
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
  args: { to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
  fromBlock: 21_000_000n,
  toBlock: 21_002_000n,
});
```

```bash
cast logs --from-block 21000000 --to-block 21002000 \
  --address 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  'Transfer(address indexed from, address indexed to, uint256 value)' --rpc-url $RPC_URL
```

Topic filter semantics: `[A, null, [B, C]]` means topic0 = A AND topic2 IN (B, C).

## Building a Reliable Indexer

```
loop:
  head = eth_getBlockByNumber("finalized" or "latest")
  for range in chunks(lastProcessed+1 .. head, size):
      logs = eth_getLogs(range, filters)
      verify each block hash (parentHash chain) against stored hashes
      on mismatch -> reorg: roll back to common ancestor, re-index
      write logs + block hash + cursor in ONE database transaction
```

Design rules:
- **Idempotency**: unique key `(chain_id, block_hash, log_index)` or `(tx_hash, log_index)`; upserts.
- **Cursor**: store last processed block number and hash.
- **Reorgs**: either index only `finalized` blocks (simple, about 13 minutes behind) or index `latest` and handle reorgs by comparing parent hashes; WebSocket subscriptions flag `removed: true` logs.
- **Range sizing**: adaptive chunks; shrink on provider "too many results" errors.
- **Backfill vs. live**: separate workers; backfill with archive-capable or log-indexed nodes.
- **Decoding**: keep ABIs versioned per contract address and block range (upgrades change events).

### Schema example (PostgreSQL)
```sql
CREATE TABLE erc20_transfer (
  chain_id     BIGINT  NOT NULL,
  block_number BIGINT  NOT NULL,
  block_hash   BYTEA   NOT NULL,
  tx_hash      BYTEA   NOT NULL,
  log_index    INTEGER NOT NULL,
  token        BYTEA   NOT NULL,
  from_addr    BYTEA   NOT NULL,
  to_addr      BYTEA   NOT NULL,
  amount       NUMERIC(78,0) NOT NULL,
  PRIMARY KEY (chain_id, block_hash, log_index)
);
CREATE INDEX ON erc20_transfer (chain_id, token, block_number);
CREATE INDEX ON erc20_transfer (chain_id, to_addr, block_number);
```
`NUMERIC(78,0)` holds any `uint256`.

## Tooling Options
| Tool | Model |
|---|---|
| The Graph (subgraphs) | Declarative mappings, hosted/decentralized indexing |
| Ponder, Envio, Subsquid | TypeScript/hosted indexers with reorg handling |
| Self-built on reth ExEx / geth live tracing | In-process, lowest latency |
| Dune, Allium, BigQuery public datasets | Analytics SQL over decoded tables |

## Traces vs. Logs
Logs only show what contracts chose to emit. Internal ETH transfers and calls without events require traces (`debug_traceTransaction` with `callTracer`, or `trace_block`). Use traces for full balance accounting.

## Pitfalls
- Filtering only by topic0 and treating any contract's `Transfer` as a known token.
- Assuming log order across blocks without `(blockNumber, logIndex)` sorting.
- Missing logs during provider failover (gaps); verify continuity by block numbers.
- Decoding indexed strings as values (they are hashes).

## Checklist
- [ ] Filters include contract addresses
- [ ] Idempotent writes keyed by block hash and log index
- [ ] Reorg detection by parent-hash continuity
- [ ] Adaptive `eth_getLogs` range sizing and retries
- [ ] Traces used where events are insufficient
