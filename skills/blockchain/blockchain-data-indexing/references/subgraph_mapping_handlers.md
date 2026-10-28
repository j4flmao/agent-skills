# Subgraph Mapping Handlers (AssemblyScript)

Writing the mapping code that turns chain data into subgraph entities: event, call, and block handlers, contract calls, dynamic data sources, determinism rules, performance, and unit testing with Matchstick. Schema design is in `the_graph_graphql_schemas.md`.

## 1. Handler Types

| Handler | Trigger | Use | Notes |
|---|---|---|---|
| Event handler | Log matching an event signature | Most indexing | Fast; supported on all EVM networks |
| Call handler | Function call to the contract | Functions without events | Needs trace support (Parity-style traces); not available on many networks; slower |
| Block handler | Every block, or filtered (`polling` every N blocks, `once` at start, `call` filter) | Periodic snapshots, initialization | Unfiltered block handlers are expensive |

Manifest excerpt:

```yaml
mapping:
  kind: ethereum/events
  apiVersion: 0.0.9               # match the version your graph-cli generates
  language: wasm/assemblyscript
  entities: [Token, Account, Balance, Transfer]
  abis:
    - name: ERC20
      file: ./abis/ERC20.json
  eventHandlers:
    - event: Transfer(indexed address,indexed address,uint256)
      handler: handleTransfer
  blockHandlers:
    - handler: handleDailySnapshot
      filter:
        kind: polling
        every: 7200
  file: ./src/token.ts
```

## 2. Event Handler

```typescript
import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
import { Transfer as TransferEvent, ERC20 } from "../generated/Token/ERC20"
import { Token, Account, Balance, Transfer } from "../generated/schema"

const ZERO = BigInt.zero()

export function handleTransfer(event: TransferEvent): void {
  let token = getOrCreateToken(event.address)

  let id = event.transaction.hash.concatI32(event.logIndex.toI32())
  let transfer = new Transfer(id)
  transfer.token = token.id
  transfer.from = getOrCreateAccount(event.params.from).id
  transfer.to = getOrCreateAccount(event.params.to).id
  transfer.value = event.params.value
  transfer.blockNumber = event.block.number
  transfer.timestamp = event.block.timestamp
  transfer.transactionHash = event.transaction.hash
  transfer.save()

  if (event.params.from != Address.zero()) {
    adjustBalance(token, event.params.from, event.params.value.neg(), event.block.number)
  }
  if (event.params.to != Address.zero()) {
    adjustBalance(token, event.params.to, event.params.value, event.block.number)
  }
}

function adjustBalance(token: Token, owner: Address, delta: BigInt, block: BigInt): void {
  let id = token.id.concat(owner)
  let bal = Balance.load(id)
  if (bal == null) {
    bal = new Balance(id)
    bal.token = token.id
    bal.account = getOrCreateAccount(owner).id
    bal.amount = ZERO
  }
  bal.amount = bal.amount.plus(delta)
  bal.updatedAtBlock = block
  bal.save()
}

function getOrCreateAccount(addr: Address): Account {
  let acc = Account.load(addr)
  if (acc == null) {
    acc = new Account(addr)
    acc.save()
  }
  return acc
}
```

Notes:
- `Entity.load(id)` returns `null` when absent; AssemblyScript requires the explicit null check before use.
- `loadInBlock(id)` reads only entities created/updated in the current block and is cheaper when that is sufficient.
- Every field marked non-null in the schema must be set before `save()`, or indexing fails.

## 3. Contract Calls

```typescript
function getOrCreateToken(address: Address): Token {
  let token = Token.load(address)
  if (token != null) return token

  let contract = ERC20.bind(address)
  token = new Token(address)
  let symbol = contract.try_symbol()
  token.symbol = symbol.reverted ? "UNKNOWN" : symbol.value
  let name = contract.try_name()
  token.name = name.reverted ? "UNKNOWN" : name.value
  let decimals = contract.try_decimals()
  token.decimals = decimals.reverted ? 18 : decimals.value
  token.totalSupply = BigInt.zero()
  token.save()
  return token
}
```

- Calls (`eth_call`) execute at the block being processed and are slow; cache results in entities and call once.
- Use `try_` variants for calls that may revert (non-standard tokens); a reverting non-`try_` call fails the subgraph.
- Some tokens return `bytes32` instead of `string` for `symbol`/`name`; handle with an alternate ABI if needed.

## 4. Dynamic Data Sources (Templates)

Factory pattern: index contracts created at runtime (pairs, vaults).

```typescript
import { DataSourceContext } from "@graphprotocol/graph-ts"
import { PairCreated } from "../generated/Factory/Factory"
import { Pair as PairTemplate } from "../generated/templates"

export function handlePairCreated(event: PairCreated): void {
  let ctx = new DataSourceContext()
  ctx.setBytes("factory", event.address)
  PairTemplate.createWithContext(event.params.pair, ctx)
}
```

Inside template handlers, `dataSource.address()` and `dataSource.context()` give the instance address and context. Templates start indexing from the block in which they were created; earlier events of that contract are not processed.

## 5. Determinism Rules

Subgraphs must produce identical results on every indexer:
- No randomness, wall-clock time, or network access (other than the deterministic APIs graph-ts provides, such as IPFS/file data sources under their rules).
- Derive all time from `event.block.timestamp`.
- Use `BigInt`/`BigDecimal` for amounts; avoid floating-point.

## 6. Logging and Debugging

```typescript
import { log } from "@graphprotocol/graph-ts"
log.warning("transfer with zero value tx={} logIndex={}", [
  event.transaction.hash.toHexString(), event.logIndex.toString()])
```

`log.critical` aborts indexing; use it only for invariant violations you want to stop on. Check indexing status and errors through the indexing status API or Subgraph Studio logs.

## 7. Performance

| Practice | Effect |
|---|---|
| Event handlers instead of call/block handlers | Large speedup; traces and per-block processing are costly |
| Immutable entities for events | Faster writes and queries |
| `Bytes` IDs with `concat`/`concatI32` | Avoid string building and hex conversions |
| Minimize `eth_call`s, cache in entities | Calls dominate sync time |
| Filtered block handlers (`polling`) | Avoid per-block work |
| `startBlock` at contract deployment | Skips empty history |
| Declared `eth_call`s in the manifest (`calls:` on event handlers, newer spec versions) | Lets graph-node prefetch calls in parallel |

## 8. Unit Testing with Matchstick

```typescript
import { assert, clearStore, describe, test, newMockEvent } from "matchstick-as/assembly/index"
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { Transfer as TransferEvent } from "../generated/Token/ERC20"
import { handleTransfer } from "../src/token"

function createTransfer(from: string, to: string, value: i32): TransferEvent {
  let ev = changetype<TransferEvent>(newMockEvent())
  ev.parameters = new Array()
  ev.parameters.push(new ethereum.EventParam("from", ethereum.Value.fromAddress(Address.fromString(from))))
  ev.parameters.push(new ethereum.EventParam("to", ethereum.Value.fromAddress(Address.fromString(to))))
  ev.parameters.push(new ethereum.EventParam("value", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(value))))
  return ev
}

describe("handleTransfer", () => {
  test("mint credits receiver balance", () => {
    let to = "0x0000000000000000000000000000000000000002"
    let ev = createTransfer("0x0000000000000000000000000000000000000000", to, 100)

    handleTransfer(ev)

    assert.entityCount("Transfer", 1)
    clearStore()
  })
})
```

Token metadata calls must be mocked with `createMockedFunction` for the contract address used by `newMockEvent()`. Run with `graph test`.

## Pitfalls

- Non-null schema fields left unset before `save()`.
- Non-`try_` contract calls on contracts that can revert.
- Call handlers on networks without trace support.
- Unfiltered block handlers for periodic work.
- Assuming templates backfill history before their creation block.

## Checklist

- [ ] Event handlers used wherever events exist.
- [ ] All entity fields set; null checks after `load`.
- [ ] Contract calls minimized, cached, and `try_`-guarded.
- [ ] Deterministic logic only; time from block data.
- [ ] Matchstick tests for each handler, including mints, burns, and edge values.
