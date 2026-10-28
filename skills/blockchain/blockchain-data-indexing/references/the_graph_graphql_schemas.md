# The Graph: GraphQL Schema Design and Query API

How to design `schema.graphql` for a subgraph (entity types, relationships, immutability, timeseries and aggregations, full-text search) and how clients query the resulting API efficiently. Mapping code is in `subgraph_mapping_handlers.md`; manifest and deployment in `the-graph-subgraph.md`.

## 1. Scalar Types

| Type | Use |
|---|---|
| `ID` | String IDs |
| `Bytes` | Addresses, hashes, and byte IDs (more compact and faster than hex strings) |
| `String`, `Boolean`, `Int` (32-bit), `Int8` (64-bit) | Ordinary values |
| `BigInt` | Token amounts, uint256 values |
| `BigDecimal` | Prices and ratios after decimal scaling |
| `Timestamp` | Microsecond timestamps; required for timeseries entities |

Use `Bytes` for `id` where the natural key is an address or `txHash + logIndex`.

## 2. Entity Design

```graphql
type Token @entity {
  id: Bytes!                      # token contract address
  symbol: String!
  name: String!
  decimals: Int!
  totalSupply: BigInt!
  holders: [Balance!]! @derivedFrom(field: "token")
}

type Account @entity {
  id: Bytes!                      # wallet address
  balances: [Balance!]! @derivedFrom(field: "account")
  transfersOut: [Transfer!]! @derivedFrom(field: "from")
  transfersIn: [Transfer!]! @derivedFrom(field: "to")
}

type Balance @entity {
  id: Bytes!                      # token address ++ account address
  token: Token!
  account: Account!
  amount: BigInt!
  updatedAtBlock: BigInt!
}

type Transfer @entity(immutable: true) {
  id: Bytes!                      # tx hash ++ log index
  token: Token!
  from: Account!
  to: Account!
  value: BigInt!
  blockNumber: BigInt!
  timestamp: BigInt!
  transactionHash: Bytes!
}
```

Rules:
- Store relationships on the "many" side (`Balance.token`) and expose the reverse with `@derivedFrom`. Derived fields are computed at query time and are not stored, which keeps writes cheap.
- Avoid large arrays stored on an entity (`[Transfer!]!` without `@derivedFrom`): every update rewrites the array.
- Mark event-like entities `@entity(immutable: true)`. They are written once and indexed and queried faster.
- Model join entities explicitly (`Balance`) for many-to-many relationships with attributes.

## 3. Timeseries and Aggregations

For metrics such as hourly volume, declare a timeseries entity and an aggregation; graph-node computes rollups.

```graphql
type SwapPoint @entity(timeseries: true) {
  id: Int8!
  timestamp: Timestamp!
  pool: Bytes!
  amountUSD: BigDecimal!
}

type PoolStats @aggregation(intervals: ["hour", "day"], source: "SwapPoint") {
  id: Int8!
  timestamp: Timestamp!
  pool: Bytes!
  volumeUSD: BigDecimal! @aggregate(fn: "sum", arg: "amountUSD")
  swapCount: Int8! @aggregate(fn: "count")
}
```

Query with `poolStats_collection(interval: hour, where: {pool: "0x..."})`. This feature needs a recent `specVersion`; check graph-node and graph-cli documentation for the minimum versions.

## 4. Full-Text Search

```graphql
type _Schema_
  @fulltext(
    name: "tokenSearch"
    language: en
    algorithm: rank
    include: [{ entity: "Token", fields: [{ name: "name" }, { name: "symbol" }] }]
  )
```

Query: `tokenSearch(text: "usd")`. Requires the `fullTextSearch` feature declared in the manifest.

## 5. Query API

graph-node generates, per entity, a single-entity field (`token(id:)`) and a collection field (`tokens(...)`).

```graphql
query TopHolders($token: String!, $lastId: Bytes) {
  balances(
    first: 100
    where: { token: $token, amount_gt: "0", id_gt: $lastId }
    orderBy: id
    orderDirection: asc
  ) {
    id
    account { id }
    amount
  }
}
```

| Feature | Syntax |
|---|---|
| Page size | `first` (default 100, maximum 1000) |
| Filters | `field`, `field_not`, `_gt`, `_gte`, `_lt`, `_lte`, `_in`, `_not_in`, `_contains`, `_starts_with`, `_ends_with` (and `_nocase` variants for strings) |
| Nested filters | `where: { token_: { symbol: "USDC" } }` |
| Boolean logic | `where: { or: [{ amount_gt: "100" }, { account: "0x..." }] }` |
| Sorting | `orderBy`, `orderDirection`; nested sort one level deep (`orderBy: token__symbol`) |
| Time travel | `block: { number: 19000000 }` or `block: { hash: "0x..." }` |
| Changed since | `where: { _change_block: { number_gte: 19000000 } }` |
| Indexing status | `_meta { block { number hash timestamp } hasIndexingErrors deployment }` |

## 6. Pagination

- Prefer cursor pagination with `id_gt` (or another indexed, unique, sortable field) over `skip`. Large `skip` values are slow and capped.
- Keep `orderBy` consistent with the cursor field.
- For full exports, stream through `id_gt` pages and pin `block: { number: N }` so all pages see the same chain state.

## 7. Consistency and Reorgs

- Subgraphs follow the chain head; recent blocks can be reverted by reorgs and graph-node rolls entities back automatically.
- Clients needing stability query at a block a few confirmations behind the head (`_meta.block.number - N`) and pass it as `block: { number }`.
- Check `_meta.hasIndexingErrors` and the indexed block before trusting data for decisions.

## 8. Schema Evolution

- Adding fields or entities requires redeploying a new subgraph version, which re-indexes (grafting can reuse data from a previous deployment for development, but is discouraged for production on the decentralized network).
- Make new fields nullable or give mappings a way to populate them for historical data.
- Version client queries; breaking changes need a coordinated client rollout.

## Pitfalls

- String IDs built from `toHex()` concatenations when `Bytes` IDs would be smaller and faster.
- Stored arrays of child IDs that grow without bound.
- Paginating with `skip` over large collections.
- Querying the chain head for financial decisions without confirmation depth.
- Forgetting that `BigInt`/`BigDecimal` values are returned as strings in JSON.

## Checklist

- [ ] `Bytes` IDs for address/hash keys; immutable event entities.
- [ ] Relationships on the many side with `@derivedFrom` reverses.
- [ ] Timeseries/aggregations for metrics instead of hand-rolled counters where supported.
- [ ] Cursor pagination with `id_gt` and a pinned block for exports.
- [ ] Clients check `_meta` for indexing errors and lag.
