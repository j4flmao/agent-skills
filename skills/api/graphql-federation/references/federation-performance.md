# Federation Performance Optimization

## Query Planning Overhead

### Plan Generation Cost
```graphql
# Expensive query — multiple fetch boundaries
query {
  me {
    orders {
      items {
        product {
          reviews {
            author { name }
          }
        }
      }
    }
  }
}
```

### Plan Cache Configuration
```yaml
query_planning:
  cache:
    enabled: true
    size: 10000
    ttl: 3600
  experimental_plans: false
  incremental_delivery:
    enable_single_entity: true
```

### Warming the Plan Cache
```python
import asyncio
from graphql_client import GraphQLClient

async def warm_cache(client: GraphQLClient, queries: list[str]):
    tasks = []
    for query in queries:
        tasks.append(client.execute(query))
    await asyncio.gather(*tasks)

# Warm with common queries on deploy
common_queries = [
    "query { me { id name } }",
    "query { products(first: 10) { id name price } }",
]
```

## Subgraph Performance

### Subgraph Latency Budgeting

| Subgraph | P99 Target | Query Complexity | Caching |
|----------|-----------|-----------------|---------|
| accounts | 50ms | Low | Session |
| products | 100ms | Medium | Redis |
| reviews | 200ms | High | CDN |
| inventory | 50ms | Low | Local |

### Connection Pooling
```python
# FastAPI subgraph
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost/db",
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False,
)
```

### Batch Loading (DataLoader)
```python
from dataloader import DataLoader

class ReviewLoader(DataLoader):
    async def batch_load(self, keys: list[str]) -> list[list[dict]]:
        results = await db.execute(
            select(Review).where(Review.product_id.in_(keys))
        )
        grouped = defaultdict(list)
        for review in results:
            grouped[review.product_id].append(review)
        return [grouped.get(k, []) for k in keys]

# In resolver
@resolver.field("reviews")
async def resolve_reviews(product: dict, loader=RevDL):
    return await loader.load(product["id"])
```

### N+1 Prevention
```python
# BAD — N+1 queries
@resolver.field("reviews")
async def resolve_reviews(product: dict):
    return await db.execute(
        select(Review).where(Review.product_id == product["id"])
    )

# GOOD — batch with DataLoader
reviews_loader = ReviewLoader()
```

## Router Performance

### Router Resource Allocation
```yaml
# Apollo Router dedicated instance
resources:
  requests:
    cpu: "2"
    memory: "2Gi"
  limits:
    cpu: "4"
    memory: "4Gi"

# Tuning
router:
  max_buffered_bytes: 4096
  max_concurrent_requests: 500
```

### HTTP Keep-Alive
```yaml
traffic_shaping:
  all:
    http2:
      keepalive_interval: 30s
      keepalive_timeout: 10s
    connection_pool:
      max_size: 100
      idle_ttl: 60s
```

### Compression
```yaml
traffic_shaping:
  all:
    compression:
      enabled: true
      brotli: true
      gzip: false
      level: 6
      minimum_size: 1024
```

## Reducing Fetch Boundaries

### @provides Strategy
```graphql
# Products subgraph already has name, so no extra fetch
type Query {
  topProducts: [Product!]!
}

extend type Product @key(fields: "id") {
  id: ID! @external
  name: String! @external
  price: Float! @provides(fields: "currency")
}
```

### Denormalization for Hot Fields
```python
# Instead of fetching user name from accounts subgraph every time
# Store it in the reviews subgraph
class Review(Model):
    id: str
    content: str
    product_id: str
    author_id: str
    author_name: str  # Denormalized copy
```

### Front-End Batching
```graphql
# BAD — separate queries
query { me { name } }
query { me { orders { id } } }

# GOOD — single query
query { me { name orders { id } } }
```

## Caching Strategies

### Apollo Router Cache
```yaml
cache:
  subgraph:
    ttl: 10s
    enabled: true
  in_memory:
    limit: 10000
  redis:
    urls: ["redis://redis-cache:6379"]
```

### Entity Cache
```yaml
entity_cache:
  enabled: true
  ttl: 60s
  max_entities: 50000
```

### Per-Query Cache Rules
```yaml
cache:
  rules:
    - query: "topProducts"
      max_age: 300
      scope: PUBLIC
    - query: "me"
      max_age: 30
      scope: PRIVATE
```

### CDN Caching for Public Queries
```yaml
# Apollo Router middleware
headers:
  all:
    response:
      - set:
          name: "Cache-Control"
          value: "{context.cache_control}"
```

## Schema Design for Performance

### Avoid Deep Nesting
```graphql
# BAD — 4 fetch hops
type Query {
  me: User!
}
type User @key(fields: "id") {
  orders: [Order!]!
}
type Order @key(fields: "id") {
  items: [OrderItem!]!
}
type OrderItem @key(fields: "id") {
  product: Product!
}

# GOOD — flatten at query level
type Query {
  myOrderItems: [OrderItem!]!
}
type OrderItem @key(fields: "id") {
  product: Product!
}
```

### Limit List Sizes
```graphql
type Query {
  products(first: Int = 10, after: String): ProductConnection!
  reviews(productId: ID!, first: Int = 5): ReviewConnection!
}

type ProductConnection {
  edges: [ProductEdge!]!
  pageInfo: PageInfo!
}
```

### Avoid High-Volume Fields
```graphql
# BAD — returns 1000+ items with every fetch
type User @key(fields: "id") {
  allActions: [Action!]!
}

# GOOD — paginated
type User @key(fields: "id") {
  actions(first: Int!, after: String): ActionConnection!
}
```

## Telemetry and Monitoring

### OpenTelemetry Tracing
```yaml
telemetry:
  tracing:
    otlp:
      endpoint: http://otel-collector:4318
      protocol: http
    propagation:
      context: cloudtrace
    sampling:
      default: 0.1
      subgraphs:
        accounts: 1.0
        reviews: 0.01
```

### Key Metrics

| Metric | What It Tells | Action |
|--------|--------------|--------|
| `apollo_router_query_planning_duration_ms` | Plan generation time | Cache warm, tune complexity |
| `apollo_router_subgraph_request_duration_ms` | Per-subgraph latency | Optimize slow subgraphs |
| `apollo_router_fetch_count` | Fetch boundaries per query | Denormalize, add @provides |
| `apollo_router_cache_hit_ratio` | Cache effectiveness | Adjust TTL, warm cache |
| `apollo_router_error_rate` | Failure by subgraph | Fix failing subgraph |

### Performance Budgets
```yaml
performance_budget:
  max_fetch_count: 5
  max_query_depth: 8
  max_latency_p99_ms: 500
  max_cost_per_query: 100
```

## Load Testing

### k6 Scenario
```javascript
import http from 'k6/http';

export const options = {
  scenarios: {
    federation_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
    },
  },
};

const query = `query { topProducts { id name price reviews { content } } }`;

export default function () {
  const payload = JSON.stringify({ query });
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };
  http.post('http://router:4000/graphql', payload, params);
}
```

### Key Metrics to Track
- Router CPU and memory under load
- Subgraph connection pool exhaustion
- Query plan cache eviction rate
- P99 latency per operation
- Error rate by subgraph

## Bottleneck Resolution

### Common Bottlenecks

| Symptom | Likely Cause | Solution |
|---------|-------------|---------|
| High P99 but low P50 | Occasional slow subgraph | Add subgraph timeout, circuit breaker |
| Increasing latency over time | Connection pool exhaustion | Increase pool size, add replicas |
| Spikes in fetch count | Missing @provides | Add @provides for hot fields |
| High plan cache miss | Query variety too high | Use wildcard, normalize queries |
| Router OOM | Schema too large | Split router, prune unused types |

### Circuit Breaker Configuration
```yaml
traffic_shaping:
  subgraphs:
    reviews:
      circuit_breaker:
        error_threshold: 0.5
        request_volume_threshold: 20
        sleep_window: 30s
        half_open_requests: 5
```

## Key Points
- Query plan cache reduces planning overhead significantly
- DataLoader eliminates N+1 queries across subgraphs
- @provides reduces fetch boundaries by embedding fields
- Router resource tuning (connection pool, compression) improves throughput
- Caching at multiple layers (router, subgraph, CDN) reduces latency
- Deeply nested schemas increase fetch hops — flatten where possible
- OpenTelemetry tracing identifies per-subgraph bottlenecks
- Circuit breakers prevent cascading failures from slow subgraphs
- Load test with realistic query patterns to validate performance budgets

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with Apollo Federation v2 directives, supergraph schema compositions, query planning, and entity resolution patterns.
-->
