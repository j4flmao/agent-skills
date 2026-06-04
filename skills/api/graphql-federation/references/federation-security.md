# Federation Security

## Overview
Security in a federated GraphQL architecture requires a layered approach: authenticate at the router, authorize at the subgraph level, validate inputs everywhere, and protect against common GraphQL attacks.

## Authentication at the Router

### JWT Validation with Apollo Router
```yaml
# router.yaml — JWT authentication
authentication:
  jwt:
    jwks_urls:
      - https://auth.example.com/.well-known/jwks.json
    issuer: https://auth.example.com/
    audiences:
      - my-api

headers:
  all:
    request:
      - propagate:
          matching: .*
      - insert:
          name: "x-user-id"
          value: "{{ authentication.jwt.sub }}"
      - insert:
          name: "x-user-roles"
          value: "{{ authentication.jwt.claims.roles }}"
```

### Custom Authentication Plugin
```rust
// router plugin for custom auth
use apollo_router::plugin::Plugin;
use apollo_router::services::supergraph;

struct AuthPlugin {
    api_key: String,
}

#[async_trait]
impl Plugin for AuthPlugin {
    async fn supergraph_service(
        &self,
        service: supergraph::BoxService,
    ) -> supergraph::BoxService {
        service
            .map_request(|mut req: supergraph::Request| {
                let headers = req.router_request.headers();
                if let Some(token) = headers.get("authorization") {
                    req.context.insert("token", token.to_str().unwrap());
                }
                req
            })
            .map_response(|res| res)
            .boxed()
    }
}
```

## Subgraph-Level Authorization

### User Context Propagation
```typescript
// Apollo Gateway context
const gateway = new ApolloGateway({
  supergraphSdl,
  buildService({ name, url }) {
    return new AuthenticatedDataSource({ url })
  },
})

class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    request.http.headers.set('x-user-id', context.userId)
    request.http.headers.set('x-user-roles', JSON.stringify(context.roles))
  }
}
```

### @requiresScopes Directive (Apollo)
```graphql
# Custom authorization directive
directive @requiresScopes(scopes: [String!]!) on FIELD_DEFINITION

type Query {
  adminData: [Secret!]! @requiresScopes(scopes: ["admin:read"])
  userEmail(id: ID!): String @requiresScopes(scopes: ["user:email"])
}
```

### Subgraph Authorization Check
```typescript
// GraphQL resolver with authorization
const resolvers = {
  Query: {
    adminData: async (_, __, { userId, roles }) => {
      if (!roles.includes('admin')) {
        throw new GraphQLError('Forbidden', {
          extensions: { code: 'FORBIDDEN', http: { status: 403 } },
        })
      }
      return db.getSecretData()
    },
    orders: async (_, { userId }, context) => {
      // Users can only see their own orders
      if (context.userId !== userId && !context.roles.includes('admin')) {
        throw new GraphQLError('Forbidden', {
          extensions: { code: 'FORBIDDEN' },
        })
      }
      return db.getOrders(userId)
    },
  },
}
```

## Rate Limiting

### Router-Level Rate Limiting
```yaml
# router.yaml rate limiting
rate_limiting:
  global:
    capacity: 1000
    time_window: 60s
  per_user:
    capacity: 100
    time_window: 60s
  per_operation:
    - operation: "Login"
      capacity: 10
      time_window: 60s
    - operation: "CreateOrder"
      capacity: 50
      time_window: 60s
```

### Cost-Based Rate Limiting
```graphql
# Define query costs
type Query {
  expensiveQuery: [Data!]! @cost(weight: "10")
  cheapQuery: [Data!]! @cost(weight: "1")
}
```

```yaml
# router.yaml cost limits
cost_limits:
  max_cost: 100
  max_depth: 10
  reject_on_limit_exceeded: true
```

## Query Depth and Complexity

### Depth Limiting
```typescript
// Apollo Server depth limiting
const depthLimit = require('graphql-depth-limit')

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(10)],
})
```

### Complexity Analysis
```typescript
const { createComplexityLimitRule } = require('graphql-validation-complexity')

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    createComplexityLimitRule(1000, {
      onCost: cost => console.log(`Query cost: ${cost}`),
      formatErrorMessage: cost => `Query too complex: ${cost}. Max: 1000`,
    }),
  ],
})
```

## Entity Resolution Security

### Entity Batching Limits
```rust
// Router entity caching and limits
#[derive(Clone)]
struct EntityConfig {
    max_entities_per_request: usize,
    cache_ttl_seconds: u64,
}

impl EntityConfig {
    fn validate_entities(&self, entities: &[Representation]) -> Result<()> {
        if entities.len() > self.max_entities_per_request {
            return Err(Error::TooManyEntities)
        }
        Ok(())
    }
}
```

### Secure Reference Resolution
```typescript
// Validate entity references before resolution
const resolvers = {
  User: {
    __resolveReference(ref, context) {
      // Validate the reference
      if (!ref.id || typeof ref.id !== 'string') {
        return null
      }

      // Ensure user can access this entity
      if (!context.canAccessUser(ref.id)) {
        return null
      }

      return db.users.findById(ref.id)
    },
  },
}
```

## Input Validation

### Argument Validation
```graphql
# Use custom scalars for validation
scalar Email
scalar PhoneNumber
scalar URL

type Mutation {
  createUser(email: Email!, phone: PhoneNumber!): User!
}
```

```typescript
const { GraphQLScalarType, Kind } = require('graphql')

const EmailScalar = new GraphQLScalarType({
  name: 'Email',
  serialize: value => value,
  parseValue: value => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      throw new GraphQLError('Invalid email format')
    }
    return value
  },
  parseLiteral: ast => {
    if (ast.kind === Kind.STRING) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(ast.value)) {
        throw new GraphQLError('Invalid email format')
      }
      return ast.value
    }
    return null
  },
})
```

### Operation Allow List (Persisted Queries)
```yaml
# router.yaml persisted queries
persisted_queries:
  enabled: true
  mode: allow_only  # reject queries not in the list
  log_unknown: true
  store:
    type: redis
    url: redis://redis:6379
```

```typescript
// Apollo Gateway persisted queries
const gateway = new ApolloGateway({
  supergraphSdl,
  persistedQueries: {
    ttl: 300,
    cache: new InMemoryLRUCache({ maxSize: 10000 }),
  },
})
```

## Transport Security

### TLS Configuration
```yaml
# router.yaml TLS
tls:
  certificate:
    path: /etc/certs/server.crt
  key:
    path: /etc/certs/server.key
  client_authentication:
    required: true
    ca: /etc/certs/ca.crt
```

### Subgraph Service Security
```yaml
# Subgraph connection security
subgraphs:
  users:
    routing_url: https://users.internal.example.com/graphql
    tls:
      certificate:
        path: /etc/certs/client.crt
      key:
        path: /etc/certs/client.key
    retry:
      max_retries: 3
      delay: 100ms
```

## Audit Logging

### Request Audit
```typescript
// Audit logging middleware
class AuditLogger {
  async logRequest(context, operation, variables) {
    await db.auditLog.create({
      data: {
        userId: context.userId,
        operation: operation.operation,
        operationName: operation.name,
        variables: this.sanitizeVariables(variables),
        timestamp: new Date(),
        ip: context.ip,
      },
    })
  }

  sanitizeVariables(variables) {
    const sensitiveFields = ['password', 'token', 'secret', 'creditCard']
    const sanitized = { ...variables }
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]'
      }
    }
    return sanitized
  }
}
```

### Subgraph Data Access Audit
```typescript
// Track entity resolution across subgraphs
const resolvers = {
  User: {
    __resolveReference(ref, context) {
      context.auditLogger.logEntityAccess('User', ref.id, context.userId)
      return db.users.findById(ref.id)
    },
    email(parent, _, context) {
      context.auditLogger.logFieldAccess('User.email', parent.id, context.userId)
      return parent.email
    },
  },
}
```

## Denial of Service Protection

### Request Size Limits
```yaml
# router.yaml
limits:
  max_request_size: 1MB
  max_headers: 50
  max_header_size: 8KB
  max_query_length: 10000
```

### Timeout Configuration
```yaml
# router.yaml
subgraphs:
  timeout: 30s
  slow:
    users: 10s
    orders: 15s
    reviews: 5s

supergraph:
  timeout: 60s
```

## Secrets Management

### Environment Variables
```yaml
# router.yaml secrets
secrets:
  - APOLLO_KEY
  - JWT_SECRET
  - DATABASE_URL

authentication:
  jwt:
    jwks_url: ${JWT_JWKS_URL}
    secret: ${JWT_SECRET}
```

### Subgraph Credentials
```yaml
# router.yaml subgraph auth
subgraphs:
  users:
    routing_url: https://users.internal/graphql
    headers:
      - insert:
          name: "authorization"
          value: "Bearer ${USERS_SERVICE_TOKEN}"
  payments:
    routing_url: https://payments.internal/graphql
    headers:
      - insert:
          name: "x-api-key"
          value: "${PAYMENTS_API_KEY}"
```

## Security Headers

### Response Headers
```yaml
# router.yaml security headers
headers:
  all:
    response:
      - insert:
          name: "X-Content-Type-Options"
          value: "nosniff"
      - insert:
          name: "X-Frame-Options"
          value: "DENY"
      - insert:
          name: "Strict-Transport-Security"
          value: "max-age=31536000; includeSubDomains"
      - insert:
          name: "X-XSS-Protection"
          value: "1; mode=block"
```

## Key Points
- Authenticate at the router, authorize at the subgraph
- Propagate user context via trusted headers between services
- Rate limiting protects against abuse at multiple levels
- Query depth and complexity limits prevent expensive queries
- Entity resolution must validate references and enforce access control
- Custom scalars provide input validation at the schema level
- Persisted queries prevent arbitrary query execution
- TLS between router and subgraphs for transport security
- Audit logging tracks data access across the federated graph
- Request size limits, timeouts, and DoS protection are essential

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with Apollo Federation v2 directives, supergraph schema compositions, query planning, and entity resolution patterns.
-->
