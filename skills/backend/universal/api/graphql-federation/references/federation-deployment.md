# Federation Deployment

## Production Architecture

### Gateway Deployment
```yaml
# Apollo Router configuration
telemetry:
  exporters:
    tracing:
      otlp:
        endpoint: ${OTLP_ENDPOINT}
        protocol: grpc

headers:
  all:
    propagate:
      - authorization
      - x-request-id
      - x-user-id

cors:
  origins:
    - https://app.example.com
    - https://admin.example.com

traffic_shaping:
  subgraphs:
    users:
      timeout: 10s
      retry:
        max_retries: 3
        base_interval: 100ms
    orders:
      timeout: 5s
      retry:
        max_retries: 2
```

### Subgraph Deployment
```yaml
# Kubernetes subgraph deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: users-subgraph
spec:
  replicas: 3
  strategy:
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
```

## CI/CD Pipeline

### Supergraph Composition
```yaml
jobs:
  compose:
    steps:
      - uses: actions/checkout@v4
      - uses: apollographql/rover-cli-action@v1
      - run: |
          rover supergraph compose \
            --config ./supergraph.yaml \
            --output ./supergraph.graphql
      - uses: actions/upload-artifact@v4
        with:
          name: supergraph-schema
          path: ./supergraph.graphql
```

### Deployment Stages
```
Subgraph v2.0 → CI → Verify Tests → Canary (10%) → Full (50%) → 100%
                                                      ↓
                                          Composition Check → Gateway Update
```

## Service Health

### Health Checks
```yaml
livenessProbe:
  httpGet:
    path: /.well-known/apollo/server-health
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 5
```

### Monitoring
- Track query latency per subgraph
- Monitor composition error rate
- Alert on schema validation failures
- Measure gateway memory and CPU usage
- Log all GraphQL errors with context

## Version Management

### Schema Registry
- Each subgraph publishes its schema on deploy
- Supergraph composition uses latest compatible versions
- Version tags track which schemas are in each environment
- Breaking change detection gates production deployments

### Rollback Procedure
1. Revert subgraph to previous version
2. Re-compose supergraph without the problematic schema
3. Deploy updated supergraph to gateway
4. Verify all queries pass
5. Notify affected teams

## Security

### Authentication
- JWT validation at gateway level
- Subgraph-to-subgraph mTLS
- Service account tokens for internal communication
- Rate limiting per client and per operation

### Schema Security
- Operation cost limiting (max depth, max aliases)
- Field-level authorization in subgraphs
- Introspection disabled in production
- Persisted query allowlist for high-security environments

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with Apollo Federation v2 directives, supergraph schema compositions, query planning, and entity resolution patterns.
-->
