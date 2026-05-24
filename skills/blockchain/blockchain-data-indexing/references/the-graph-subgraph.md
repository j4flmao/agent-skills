# The Graph — Subgraph Reference

## Overview

A subgraph indexes EVM chain data via a manifest (`subgraph.yaml`), a GraphQL schema (`schema.graphql`), and AssemblyScript/TypeScript mappings. Indexed data is served over a GraphQL endpoint.

## Subgraph Manifest (`subgraph.yaml`)

```yaml
specVersion: 1.0.0
indexerHints:
  prune: auto
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: UniswapV3Factory
    network: mainnet
    source:
      address: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
      abi: Factory
      startBlock: 12369621
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - PoolCreated
      abis:
        - name: Factory
          file: ./abis/Factory.json
      eventHandlers:
        - event: PoolCreated(indexed address,indexed address,indexed uint24,int24,address)
          handler: handlePoolCreated
      file: ./src/mapping.ts
templates:
  - kind: ethereum
    name: Pool
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
      file: ./src/mapping.ts
```

### Key fields

- `specVersion` — subgraph manifest spec (currently `1.0.0`).
- `dataSources[].source.startBlock` — must be set to a real block. Avoid `0` in production.
- `dataSources[].network` — chain name (`mainnet`, `goerli`, `polygon`, `arbitrum-one`, etc.).
- `templates` — dynamic data sources; instantiated at runtime via `DataSourceTemplate.create()`.
- `indexerHints.prune` — `auto` (default) or `never`; controls historical data pruning.

## Schema Definition (`schema.graphql`)

```graphql
type PoolCreated @entity {
  id: ID!
  token0: Bytes!
  token1: Bytes!
  fee: Int!
  tickSpacing: Int!
  pool: Bytes!
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  transactionHash: Bytes!
}

type Swap @entity {
  id: ID!
  pool: Pool!
  sender: Bytes!
  recipient: Bytes!
  amount0: BigDecimal!
  amount1: BigDecimal!
  sqrtPriceX96: BigInt!
  liquidity: BigInt!
  tick: BigInt
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  transactionHash: Bytes!
}
```

### Entity rules

- Every entity must have an `id: ID!` field.
- Use `Bytes` for addresses and hashes.
- Use `BigInt` for large integers; `BigDecimal` for decimals (fix scaling in mappings).
- `@entity` decorator persists the type; types without it are just GraphQL types.
- Relations: `Pool!` (required) or `[Swap!]! @derivedFrom(field: "pool")` for reverse lookups.

## Mappings (AssemblyScript / TypeScript)

```typescript
import { BigInt, Address, log } from "@graphprotocol/graph-ts"
import {
  PoolCreated as PoolCreatedEvent,
  Factory,
} from "../generated/Factory/Factory"
import { PoolCreated } from "../generated/schema"
import { Pool as PoolTemplate } from "../generated/templates"

export function handlePoolCreated(event: PoolCreatedEvent): void {
  let entity = new PoolCreated(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.token0 = event.params.token0
  entity.token1 = event.params.token1
  entity.fee = event.params.fee
  entity.tickSpacing = event.params.tickSpacing
  entity.pool = event.params.pool
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  // Create dynamic data source for the new pool
  PoolTemplate.create(event.params.pool)
}
```

### Mappings API

- **Event handlers**: `handle<EventName>(event: <EventName>Event)` — fired on matching log.
- **Call handlers**: `handle<CallName>(call: <CallName>Call)` — fired on function calls.
- **Block handlers**: `handleBlock(block: EthereumBlock)` — fired on every block (use sparingly).
- **Store API**: `entity.save()`, `entity.load()`, `store.remove()`.
- **Caveat**: AssemblyScript is a subset of TypeScript; no `async/await`, limited standard lib.

## Dynamic Data Sources (Templates)

```typescript
import { Pool as PoolTemplate } from "../generated/templates"

// Instantiate a new data source at runtime
PoolTemplate.create(event.params.pool)
// Optional: start at a specific block
PoolTemplate.createWithContext(event.params.pool, event.block.number)
```

Used when the set of contracts is not known at deploy time (e.g. factory contracts).

## Event signature format in manifest

```
event: Transfer(indexed address,indexed address,uint256)
```

The indexed keyword must match the contract ABI exactly.

## IPFS file handling

```yaml
dataSources:
  - kind: file
    name: ipfs-cat
    mapping:
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      file:
        - /ipfs/QmX...
        handler: handleFile
```

Use `ipfs.cat(hash)` inside the handler to retrieve raw bytes.

## Network handling (multi-chain)

```yaml
dataSources:
  - kind: ethereum
    name: Contract
    network: polygon  # also: mainnet, arbitrum-one, optimism, base, gnosis, avalanche
```

### Supported networks

| Chain        | Network name          |
|--------------|-----------------------|
| Ethereum     | `mainnet`             |
| Polygon      | `polygon`             |
| Arbitrum One | `arbitrum-one`        |
| Optimism     | `optimism`            |
| Base         | `base`                |
| Avalanche C  | `avalanche`           |
| Gnosis Chain | `gnosis`              |

## Complete working subgraph example

```yaml
# subgraph.yaml
specVersion: 1.0.0
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: MyContract
    network: mainnet
    source:
      address: "0xabc..."
      abi: MyContract
      startBlock: 15000000
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Item
      abis:
        - name: MyContract
          file: ./abis/MyContract.json
      eventHandlers:
        - event: ItemCreated(uint256,address)
          handler: handleItemCreated
      file: ./src/mapping.ts
```

```graphql
# schema.graphql
type Item @entity {
  id: ID!
  owner: Bytes!
  createdAt: BigInt!
}
```

```typescript
// src/mapping.ts
import { ItemCreated as ItemCreatedEvent } from "../generated/MyContract/MyContract"
import { Item } from "../generated/schema"

export function handleItemCreated(event: ItemCreatedEvent): void {
  let item = new Item(event.params.id.toString())
  item.owner = event.params.owner
  item.createdAt = event.block.timestamp
  item.save()
}
```

## Deploying

```bash
# Authenticate
graph auth --product hosted-service <ACCESS_TOKEN>

# Build
graph codegen && graph build

# Deploy
graph deploy --product hosted-service <GITHUB_USER>/<SUBGRAPH_NAME>

# Deploy to Subgraph Studio
graph deploy --studio <SUBGRAPH_NAME>
```

## Resources

- [The Graph docs](https://thegraph.com/docs/en/)
- [GraphQL API docs](https://thegraph.com/docs/en/querying/graphql-api/)
