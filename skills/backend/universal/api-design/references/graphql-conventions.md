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

## Rules
- Use DataLoader for N+1 prevention
- Implement query complexity limits
- Require auth at transport level, not per-resolver
- Paginate all list fields (Connection pattern)
- Deprecate with `@deprecated(reason: "...")`
