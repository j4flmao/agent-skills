# Federated Tracing & Observability

## Overview
In a federated GraphQL architecture, a single client request may fan out to multiple subgraphs. Distributed tracing is essential to understand query latency, identify bottlenecks, and debug cross-subgraph issues.

## OpenTelemetry Setup

### Apollo Router OTLP Export
```yaml
# router.yaml
telemetry:
  tracing:
    otlp:
      endpoint: http://otel-collector:4318
      protocol: http
      # Batch export configuration
      batch_processor:
        max_export_batch_size: 512
        scheduled_delay_millis: 5000
        max_queue_size: 2048
    propagation:
      # Propagate trace context to subgraphs
      context: cloudtrace
      forward:
        - "traceparent"
        - "x-cloud-trace-context"
        - "x-b3-traceid"
        - "x-datadog-trace-id"
    sampling:
      default: 0.1          # 10% sample for most subgraphs
      subgraphs:
        accounts: 1.0       # 100% sample for critical subgraph
        reviews: 0.01       # 1% sample for high-volume subgraph
```

### Subgraph Trace Propagation
```typescript
// Apollo Server subgraph — forward trace headers
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

app.use('/graphql', expressMiddleware(server, {
  context: async ({ req }) => {
    // Extract trace context from incoming request
    const traceparent = req.headers['traceparent'];
    const tracestate = req.headers['tracestate'];

    return {
      traceparent,
      tracestate,
      // Pass to resolvers for child spans
      tracer: openTelemetry.tracer,
    };
  },
}));
```

### Manual Subgraph Instrumentation
```typescript
const resolvers = {
  Query: {
    users: async (_, __, { tracer }) => {
      const span = tracer.startSpan('users.query', {
        attributes: { 'db.system': 'postgresql' },
      });
      try {
        const users = await db.users.findAll();
        span.setStatus({ code: SpanStatusCode.OK });
        return users;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        throw err;
      } finally {
        span.end();
      }
    },
  },
  User: {
    __resolveReference: async (ref, { tracer }) => {
      // Trace entity resolution separately
      return tracer.startActiveSpan('entity_resolution.user', (span) => {
        span.setAttribute('entity.id', ref.id);
        return db.users.findById(ref.id);
      });
    },
  },
};
```

## Apollo Studio Integration

### Router to Studio Export
```yaml
telemetry:
  apollo:
    graphs:
      - graph_ref: my-graph@current
        key: ${APOLLO_KEY}
    # What data to send to Studio
    field_usage: true          # Track field-level usage
    operation_counts: true     # Track operation frequency
    send_traces: true          # Send operation traces
    allow_errors: true         # Send traces with errors
```

### Studio Trace Waterfall Interpretation
```
Operation: getUserWithOrders
Total: 245ms

  ├─ Query Planning: 12ms (5%)           ← Plan cache miss → warm cache
  ├─ Accounts Subgraph: 45ms (18%)        ← __resolveReference + fields
  │   ├─ HTTP Round Trip: 3ms
  │   ├─ __resolveReference: 28ms        ← DB query time
  │   └─ Field Resolution: 14ms
  ├─ Orders Subgraph: 188ms (77%)        ← BOTTLENECK
  │   ├─ HTTP Round Trip: 2ms
  │   ├─ __resolveReference: 5ms
  │   └─ Field Resolution: 181ms        ← Slow DB query or N+1
  └─ Response Assembly: 2ms (1%)
```

## Key Metrics

### Router-Level Metrics

| Metric | Source | Alert Threshold | Action |
|--------|--------|----------------|--------|
| `apollo_router_query_planning_duration_ms` | Router | > 50ms avg | Warm plan cache, normalize queries |
| `apollo_router_subgraph_request_duration_ms` | Router | P99 > 500ms | Optimize or scale subgraph |
| `apollo_router_fetch_count` | Router | > 10 per query | Add @provides, flatten schema |
| `apollo_router_cache_hit_ratio` | Router | < 0.8 | Increase cache size/TTL |
| `apollo_router_error_rate` | Router | > 1% | Check failing subgraph |
| `apollo_router_entities_per_request` | Router | > 100 | Rate limit entity resolution |

### Subgraph-Level Metrics

| Metric | Source | Alert Threshold | Action |
|--------|--------|----------------|--------|
| Subgraph P50 latency | Subgraph metrics | > 100ms | Optimize resolvers, add caching |
| Subgraph P99 latency | Subgraph metrics | > 500ms | Scale subgraph, add connection pooling |
| `__resolveReference` latency | Custom span | > 50ms | Optimize entity lookup queries |
| DB query duration | Subgraph tracing | > 200ms | Add indexes, tune queries |
| Error rate | Subgraph metrics | > 1% | Debug and fix |

### Dashboard Configuration (Prometheus + Grafana)
```yaml
# prometheus rules for federation
groups:
  - name: federation
    rules:
      - alert: HighSubgraphLatency
        expr: |
          histogram_quantile(0.99,
            rate(apollo_router_subgraph_request_duration_ms_bucket[5m])
          ) > 500
        for: 5m
        labels:
          severity: warning

      - alert: CompositionErrorRate
        expr: |
          rate(apollo_router_composition_error_total[5m]) > 0
        for: 1m
        labels:
          severity: critical

      - alert: PlanCacheMissSpike
        expr: |
          rate(apollo_router_query_plan_cache_miss_total[5m])
          /
          rate(apollo_router_query_plan_cache_hit_total[5m])
          > 0.2
        for: 10m
        labels:
          severity: warning
```

## Distributed Trace Context Propagation

### Supported Propagation Formats
```yaml
# router.yaml
telemetry:
  tracing:
    propagation:
      context: cloudtrace   # Primary format
      forward:              # Forward to subgraphs as headers
        - "traceparent"     # W3C Trace Context
        - "x-cloud-trace-context"  # Google Cloud Trace
        - "x-b3-traceid"    # Zipkin B3
        - "x-datadog-trace-id"  # Datadog
```

### Subgraph Trace ID Logging
```typescript
// Include trace IDs in structured logs for correlation
const resolvers = {
  Query: {
    orders: async (_, args, { tracer }) => {
      const span = trace.getSpan(context);
      const traceId = span.spanContext().traceId;
      const spanId = span.spanContext().spanId;

      logger.info({
        message: 'Fetching orders',
        traceId,
        spanId,
        userId: args.userId,
      });

      return db.orders.findByUserId(args.userId);
    },
  },
};
```

## Custom Router Telemetry Plugins

### Rhai Script for Custom Metrics
```rust
// router Rhai script — track query patterns
fn supergraph_service(service) {
    service.map_request(|request| {
        // Track query type
        let operation = request.query.operation;
        if operation == "mutation" {
            request.context.mutations_count += 1;
        }
        request
    });
    service.map_response(|response| {
        if response.status_code != 200 {
            request.context.error_count += 1;
        }
        response
    });
}
```

## Key Points
- Federated tracing reveals per-subgraph latency breakdowns in a single request
- Apollo Router exports traces via OTLP to any OpenTelemetry-compatible backend
- Sampled tracing reduces overhead — use 100% for critical subgraphs, 1% for high-volume
- Apollo Studio provides field usage heatmaps and operation trace waterfalls
- Propagate trace context to subgraphs via headers (W3C traceparent, B3, Datadog)
- Alert on plan cache misses, high subgraph latency, and composition errors
- Custom Rhai scripts can add domain-specific metrics without deploying new routers
- GraphQL cost analysis (demand control) prevents expensive queries from degrading performance
