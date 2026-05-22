# GraphQL Schema Design

## Naming Conventions
- **Types**: PascalCase (`UserProfile`, `OrderItem`)
- **Fields/Arguments**: camelCase (`firstName`, `createdAt`)
- **Enums**: UPPER_SNAKE_CASE (`ORDER_STATUS_PENDING`, `ROLE_ADMIN`)
- **Input types**: Suffix `Input` (`CreateUserInput`)
- **Payload types**: Suffix `Payload` (`CreateUserPayload`)
- **Union members**: Describe the error (`NotFoundError`, `UnauthorizedError`)
- **Interfaces**: Prefix `I` optional, prefer suffix `Interface` (`NodeInterface`)

## Nullability
- List fields: always non-null list with non-null items: `[Type!]!`
- ID fields: always `ID!` (non-null)
- Optional fields: nullable only when semantically optional
- Never nullable: `id`, `createdAt`, `updatedAt`

## Relay Connection Pattern
```graphql
type Query {
  users(first: Int, after: String, last: Int, before: String): UserConnection!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

## Mutation Input/Output Pattern
```graphql
input CreateUserInput {
  clientMutationId: String
  email: String!
  name: String!
}

type CreateUserPayload {
  clientMutationId: String
  error: CreateUserError
  user: User
}

union CreateUserError = EmailTakenError | ValidationError
```

## Best Practices
- One query field per root entity type
- Arguments for filtering, sorting, pagination on list queries
- Depth limit: 7 levels maximum
- Complexity limit: 1000 points per query
- N+1 prevention via DataLoader is mandatory
