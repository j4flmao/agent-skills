# Reading Chain Data at Scale: Multicall, Logs and Event Decoding

Efficient read patterns for dApps and backends: batching contract reads with Multicall3, paginating `eth_getLogs`, decoding events with viem, choosing between direct RPC and indexers, and keeping reads consistent across blocks.

## Choosing a Read Path

| Need | Path |
|------|------|
| A few current values (balance, allowance) | Direct `readContract` / `multicall` |
| Many values at one block | `multicall` with `blockNumber` pinned |
| Historical events for one contract, bounded range | `getLogs` with pagination |
| Cross-contract history, aggregation, search | Indexer (own pipeline, The Graph, Ponder, Envio, Goldsky) |
| Real-time updates | `watchContractEvent` / `eth_subscribe` + periodic reconciliation |

## Multicall3

Multicall3 is deployed at `0xcA11bde05977b3631167028862bE2a173976CA11` on most EVM chains; viem chain definitions include it.

```ts
import { erc20Abi } from 'viem'

const blockNumber = await publicClient.getBlockNumber()
const tokens = [USDC, WETH, DAI] as const

const results = await publicClient.multicall({
  blockNumber,                         // one consistent snapshot
  allowFailure: true,                  // one failing call does not fail the batch
  contracts: tokens.flatMap((address) => [
    { address, abi: erc20Abi, functionName: 'balanceOf', args: [owner] },
    { address, abi: erc20Abi, functionName: 'decimals' },
  ]),
})

for (const [i, r] of results.entries()) {
  if (r.status === 'failure') logger.warn({ call: i, err: r.error.shortMessage }, 'multicall item failed')
}
```

Notes:
- `allowFailure: true` returns `{ status, result | error }` per call; `false` throws on the first failure.
- viem splits large batches by `batchSize` (bytes of calldata); providers also limit `eth_call` gas and response size.
- Pinning `blockNumber` avoids mixing values from different blocks.
- Automatic batching: `createPublicClient({ batch: { multicall: true } })` coalesces concurrent `readContract` calls into multicalls.

## Paginating `eth_getLogs`

Providers cap block range and result count (limits differ by provider and plan). Page by block range and shrink the window on "too many results" errors.

```ts
import { parseAbiItem } from 'viem'

const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')

async function* transfersTo(token: `0x${string}`, to: `0x${string}`, fromBlock: bigint, toBlock: bigint) {
  let step = 5_000n
  let start = fromBlock
  while (start <= toBlock) {
    const end = start + step - 1n > toBlock ? toBlock : start + step - 1n
    try {
      const logs = await publicClient.getLogs({ address: token, event: transferEvent, args: { to }, fromBlock: start, toBlock: end })
      yield* logs
      start = end + 1n
      if (step < 50_000n) step *= 2n
    } catch (err) {
      if (step === 1n) throw new Error(`getLogs failed for single block ${start}: ${String(err)}`)
      step = step / 2n > 0n ? step / 2n : 1n     // shrink and retry same start
    }
  }
}
```

- Filter by `address` and indexed topics (`args`) server-side; unfiltered scans are slow and expensive.
- Only `indexed` parameters are filterable (max 3 per event, plus the signature topic).
- Persist the last processed block; resume from it.
- Logs near the head can be reorged out; re-scan the last N blocks or key by block hash (see blockchain-core `reference_guide_2.md`).

## Decoding

```ts
import { decodeEventLog, parseEventLogs } from 'viem'

// all logs of a receipt, typed by ABI
const events = parseEventLogs({ abi: erc20Abi, logs: receipt.logs, eventName: 'Transfer' })
for (const e of events) {
  // e.args.from, e.args.to, e.args.value are typed
}

// single raw log
const decoded = decodeEventLog({ abi: erc20Abi, data: log.data, topics: log.topics })
```

ERC-20 and ERC-721 `Transfer` share the same signature hash; ERC-721 indexes `tokenId` (4 topics) while ERC-20 has `value` in data (3 topics). Decode with the right ABI by checking topic count or contract interface.

## Real-Time Watching

```ts
const unwatch = publicClient.watchContractEvent({
  address: token,
  abi: erc20Abi,
  eventName: 'Transfer',
  args: { to: treasury },
  onLogs: (logs) => queue.push(logs),
  onError: (err) => logger.error({ err }, 'watch failed'),
})
```

Over HTTP, viem polls (`pollingInterval`); over WebSocket it subscribes. Subscriptions drop on reconnects; always reconcile with a `getLogs` backfill from the last processed block after reconnect.

## Consistency Rules

| Problem | Rule |
|---------|------|
| Values from different blocks combined | Pin `blockNumber` for related reads |
| Load-balanced RPC returns different heads | Use the same provider/session for a read sequence or pin block numbers |
| UI flicker after a write | Invalidate queries on receipt, then refetch at `receipt.blockNumber` or later |
| Reorged logs | Track `removed` logs and block hashes |

## Indexer vs RPC

| Factor | Direct RPC | Indexer |
|--------|-----------|---------|
| Setup | None | Pipeline or hosted service |
| Query flexibility | Per contract/topic only | SQL/GraphQL joins, aggregates |
| Latency to new data | Lowest | Seconds behind head typically |
| Reorg handling | Your code | Indexer's responsibility (verify how) |
| Cost at scale | Many RPC calls | Storage + compute |

## Checklist

- [ ] Related reads batched with Multicall3 at a pinned block
- [ ] `getLogs` paginated with adaptive range, filtered by address and indexed args
- [ ] Events decoded via ABI (`parseEventLogs`), not manual slicing
- [ ] Watchers backed by backfill on reconnect
- [ ] Indexer adopted when queries span many contracts or need aggregation
