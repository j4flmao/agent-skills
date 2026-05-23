# Integration Architectures

## Architecture Patterns

| Pattern | Coupling | Scalability | Complexity | Use Case |
|---------|----------|-------------|------------|----------|
| Point-to-Point | Tightest | Low | Low | Simple 1:1 integrations |
| Hub-and-Spoke | Medium | Medium | Medium | Centralized ESB/API gateway |
| Message Bus | Loose | High | High | Event-driven systems |
| Microservices | Loose | Very High | Very High | Distributed systems |
| Data Mesh | Loose | Very High | Very High | Large-scale data sharing |

## Hub-and-Spoke (API Gateway)

### Architecture
```
Service A ──→ API Gateway ──→ Service B
Service C ──→ API Gateway ──→ Service D
              │
              ├──→ Auth (JWT validation)
              ├──→ Rate Limiting
              ├──→ Routing
              └──→ Monitoring
```

### Gateway Responsibilities
```
Authentication: Validate tokens, API keys
Rate Limiting: Per-client, per-endpoint quotas
Routing: Forward to appropriate backend
Transformation: Request/response format conversion
Monitoring: Logging, metrics, tracing
Caching: Response caching for read-heavy endpoints
```

### Implementation
```yaml
# Kong API Gateway config
services:
  - name: order-service
    url: http://orders.internal:8080
    routes:
      - paths: ["/api/orders"]
        methods: ["GET", "POST"]
    plugins:
      - name: rate-limiting
        config:
          minute: 100
          hour: 1000
      - name: jwt
        config:
          claims_to_verify: ["exp", "nbf"]
```

## Event-Driven (Message Bus)

### Architecture
```
Producer ──→ Message Bus ──→ Consumer A
                         ──→ Consumer B
                         ──→ Consumer C
                         ──→ Dead Letter Queue
```

### Event Schema
```json
{
  "event_id": "evt_abc123",
  "event_type": "order.created",
  "event_version": "1.0",
  "producer": "order-service",
  "timestamp": "2026-03-15T10:30:00Z",
  "payload": {
    "order_id": "ord_456",
    "customer_id": "cus_789",
    "total": 99.99,
    "items": [{"sku": "PROD-001", "qty": 2}]
  },
  "trace_id": "tracer_xyz"
}
```

### Guarantees
```
At-least-once: Duplicates possible, idempotent consumers
Exactly-once: Dedup at producer or consumer with idempotency keys
Ordered: Partition by entity ID, single consumer per partition
```

## Microservices Integration

### Communication Patterns
```
Synchronous: REST/gRPC for request-response
  - Best for: queries, commands needing immediate confirmation
  - Risk: cascading failures, latency chains

Asynchronous: Events/queues for state changes
  - Best for: decoupled workflows, notifications
  - Risk: eventual consistency, debugging complexity
```

### Service Mesh
```yaml
# Istio VirtualService
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
    - orders
  http:
    - route:
        - destination:
            host: orders
            subset: v2
          weight: 10
        - destination:
            host: orders
            subset: v1
          weight: 90
    - timeout: 5s
    - retries:
        attempts: 3
        perTryTimeout: 2s
```

## Integration Testing

### Contract Testing
```yaml
# Pact consumer contract
consumer: "web-frontend"
provider: "order-service"
interactions:
  - description: "Create order request"
    request:
      method: POST
      path: "/api/orders"
      body:
        customer_id: "cus_789"
        items: [{"sku": "PROD-001", "qty": 2}]
    response:
      status: 201
      body:
        order_id: like("ord_")
        status: "created"
```

### Testing Strategy
```
Unit: Single integration component (gateway plugin, transformer)
Contract: Consumer-driven contract tests between services
Integration: End-to-end flow across 2+ services
Smoke: Health check after deployment
Load: Performance under expected traffic
```
