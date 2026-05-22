# Apollo Federation

## Federation Directives
- `@key(fields: "id")` — Primary key on an entity for cross-subgraph resolution
- `@extends` — Type extends an entity defined in another subgraph
- `@external` — Field defined in another subgraph, referenced locally
- `@provides(fields: "name")` — Subgraph can resolve the field without querying another subgraph
- `@requires(fields: "price")` — Subgraph needs the specified fields from another subgraph

## Entity Resolution Pattern
```graphql
type Product @key(fields: "id") {
  id: ID!
  name: String!
  price: Float!
}

type Query {
  product(id: ID!): Product
}

# Resolver implements __resolveReference
# product(id: "1") and Product.__resolveReference({ id: "1" }) return same shape
```

## Gateway Configuration
```yaml
gateway:
  serviceList:
    - name: accounts
      url: http://accounts/graphql
    - name: products
      url: http://products/graphql
    - name: reviews
      url: http://reviews/graphql
  queryPlan:
    maxRetries: 3
    retryDelay: 100ms
```

## Best Practices
- Each subgraph owns its domain data
- Entities are shared across subgraphs via `@key`
- Subgraphs are independently deployable
- Gateway handles query planning and stitching
- Subgraph schemas validated against supergraph schema on deploy
- Use Apollo Studio for schema checks and operation registry
