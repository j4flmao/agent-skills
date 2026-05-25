# Federation Testing & Debugging

## Testing Strategy

### Unit Testing Subgraphs
```typescript
describe('UsersSubgraph', () => {
  it('resolves user entity by key', async () => {
    const result = await subgraph.executeQuery(`
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
          email
        }
      }
    `, { id: '123' })

    expect(result.data.user).toBeDefined()
    expect(result.data.user.name).toBe('John Doe')
  })
})
```

### Integration Testing with Gateway
```typescript
describe('Supergraph Integration', () => {
  it('resolves cross-subgraph query', async () => {
    const query = `
      query GetUserWithOrders($id: ID!) {
        user(id: $id) {
          name
          orders {
            total
            status
          }
        }
      }
    `
    const result = await gateway.execute(query, { id: '123' })
    expect(result.data.user.name).toBeDefined()
    expect(result.data.user.orders).toHaveLength(3)
  })
})
```

## Debugging Federation Issues

### Common Problems
| Issue | Symptom | Solution |
|-------|---------|----------|
| Entity resolution failure | Null fields on extended types | Check @key directives match across subgraphs |
| Composition error | Gateway fails to start | Validate all subgraph schemas individually |
| Field conflict | Multiple subgraphs define same field | Use @shareable or move to single subgraph |
| Missing @external | Entity referencing field from other subgraph | Add @external to referenced field |
| Circular reference | Subgraphs reference each other's entities | Break cycle with @provides directive |

### Query Planning
```graphql
# Enable query planning logging
query GetUserWithReviews($id: ID!) {
  user(id: $id) {
    name        # Users subgraph
    reviews {   # Reviews subgraph (entity lookup via @key)
      rating
      product { # Products subgraph (entity lookup)
        name
      }
    }
  }
}
```

## Performance Testing

### Query Cost Analysis
- Use Apollo Studio to analyze query costs
- Monitor subgraph response times
- Track gateway CPU/memory under load
- Identify expensive queries for optimization

### Load Testing
```yaml
# k6 load test for federated gateway
scenarios:
  mixed_queries:
    executor: ramping-vus
    startVUs: 0
    stages:
      - duration: 2m
        target: 100
      - duration: 5m
        target: 100
      - duration: 2m
        target: 0
```

## Debugging Tools

### Apollo Studio
- Trace individual requests across subgraphs
- View query plans and execution details
- Identify slow subgraph resolvers
- Monitor schema changes and composition health

### Local Development
- Run supergraph locally with rover dev
- Mock subgraphs for isolated testing
- Use federation-specific linting rules
- Validate schema changes before deployment
