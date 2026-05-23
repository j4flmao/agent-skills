# Supergraph Composition

## CI/CD Pipeline for Federation
`
Each subgraph CI:
Test → Build → Publish schema → (rover subgraph publish)

Composition CI:
Triggered by any subgraph publish
  → Fetch all subgraph schemas
  → Compose supergraph (rover supergraph compose)
  → Validate composition
  → Publish supergraph to router/gateway
  → Deploy router
`

## Composition Config
`yaml
federation_version: 2
subgraphs:
  accounts:
    routing_url: http://accounts:4001/graphql
    schema:
      file: ./schemas/accounts.graphql
  products:
    routing_url: http://products:4002/graphql
    schema:
      file: ./schemas/products.graphql
  orders:
    routing_url: http://orders:4003/graphql
    schema:
      file: ./schemas/orders.graphql
`

## Schema Checks
`ash
# Check if schema change is backward-compatible
rover subgraph check my-supergraph@current \
    --schema ./schema.graphql \
    --name accounts
`
"@ | Set-Content -Path "D:\j4flmao-org\skills\api\graphql-federation\references\supergraph-composition.md" -Encoding UTF8

@"
# Entity Resolution

## Reference Resolver Pattern (Apollo Server 4)
`	ypescript
const resolvers = {
    User: {
        __resolveReference(ref, context) {
            return context.dataSources.users.findById(ref.id);
        },
        orders(parent) {
            return context.dataSources.orders.findByUserId(parent.id);
        }
    }
};
`

## @requires Example
`graphql
# Shipping subgraph
type User @key(fields: "id") @extends {
    id: ID! @external
    shippingZip: String @external
    shippingRate: Float @requires(fields: "shippingZip")
}
`

## Entity Resolution Flow
1. Router receives query with User fields from multiple subgraphs
2. Router sends _entities query to Orders subgraph with epresentations
3. Orders subgraph calls __resolveReference with the representation
4. Returns resolved entity with requested fields
5. Router merges results from all subgraphs
