# GraphQL Conventions

## Schema Design
```graphql
type Query {
  users(page: Int, limit: Int): UserConnection!
  user(id: ID!): User
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}

type User {
  id: ID!
  email: String!
  name: String!
  orders: [Order!]!
  createdAt: DateTime!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}
```

## Naming
- Types: PascalCase (`User`, `OrderConnection`)
- Fields: camelCase (`firstName`, `createdAt`)
- Enums: UPPER_SNAKE_CASE (`ORDER_STATUS`)
- Inputs: PascalCase + `Input` (`CreateUserInput`)
- Mutations: verb + noun (`createUser`, `updateOrder`)
- Interfaces: prefix with `Node` for relay (`Node`, `Entity`)
- Unions: PascalCase + `Result` (`MutationResult`, `PaymentResult`)

## Rules
- Use DataLoader for N+1 prevention
- Implement query complexity limits
- Require auth at transport level, not per-resolver
- Paginate all list fields (Connection pattern per Relay spec)
- Deprecate with `@deprecated(reason: "...")`
- Input types should be nullable for optional fields; never mix required and optional in the same field
- Return payload types for mutations rather than scalars (allows future field additions)

## Pagination Pattern
```graphql
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type OrderEdge {
  node: Order!
  cursor: String!
}
```

## Error Handling
```graphql
interface Error {
  message: String!
}

type NotFoundError implements Error {
  message: String!
  resourceId: ID!
}

type ValidationError implements Error {
  message: String!
  field: String!
}

union CreateUserResult = User | NotFoundError | ValidationError
```

## Security
- Depth limiting: max 6 levels
- Query cost analysis: assign weights to fields, reject queries exceeding budget
- Persisted queries only in production (disallow arbitrary query strings)
- Rate-limit by API key, not by user session
- Field-level authorization in resolver, not schema directive

## Anti-Patterns
- Returning entire domain models from mutations (use specific payload types)
- Exposing internal IDs; prefer opaque global IDs (base64-encoded typename + id)
- N+1 from resolvers calling ORM lazy loads; always batch with DataLoader
- Over-fetching sensitive fields; apply @requiresAuth or omit from schema entirely
- Using enums for frequently-changing values (use a scalar + validation instead)
