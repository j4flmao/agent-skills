# Message Routing Patterns

## Routing Pattern Comparison

| Pattern | Flexibility | Complexity | Use Case |
|---------|-------------|------------|----------|
| Content-Based | High | Medium | Order routing by type |
| Header-Based | Medium | Low | Priority-based routing |
| Topic-Based | High | Low | Pub-sub event distribution |
| Rule-Based | Very High | High | Complex business rules |
| Recipient List | Medium | Low | Broadcast to known list |
| Splitter | High | Medium | Batch processing |

## Content-Based Routing

### When to Use
- Route based on message payload fields
- Business rules determine destination
- Multiple target systems per message type

### Implementation
```python
def route_order(message):
    order_type = message["payload"]["type"]
    region = message["payload"]["region"]

    if order_type == "standard":
        if region == "EU":
            return "queue.orders.eu"
        return "queue.orders.default"
    elif order_type == "express":
        return "queue.orders.express"
    elif order_type == "digital":
        return "queue.orders.digital"
    else:
        return "queue.orders.dead-letter"
```

## Header-Based Routing

### When to Use
- Metadata-driven routing decisions
- Routing doesn't require payload inspection
- Performance-critical routing

### Implementation
```java
// Spring Cloud Stream
@StreamListener(Sink.INPUT)
public void handle(Message<Order> message) {
    String priority = message.getHeaders().get("priority");
    String tenant = message.getHeaders().get("tenant_id");

    if ("critical".equals(priority)) {
        criticalOrderChannel.send(message);
    } else {
        standardOrderChannel.send(message);
    }
}
```

## Topic-Based Routing

### When to Use
- Pub-sub event distribution
- Multiple independent consumers
- Event-driven architectures

### Topic Structure
```
events.{domain}.{action}.{version}
events.order.created.v1
events.order.updated.v2
events.payment.refunded.v1
```

## Rule-Based Routing

### When to Use
- Complex routing conditions
- Dynamic rule changes
- Business user managed rules

### Rules Engine Integration
```yaml
rules:
  - name: route_high_value_eu
    condition: order.value > 10000 AND order.region == "EU"
    destination: queue.compliance-review
  - name: route_fraud_suspicious
    condition: order.risk_score > 0.8
    destination: queue.fraud-review
  - name: route_digital_goods
    condition: order.type == "digital"
    destination: queue.digital-fulfillment
```

## Dead Letter Queue Strategy

### DLQ Configuration
```yaml
dead-letter:
  max_retries: 3
  retry_backoff: [1s, 5s, 30s]
  dlq_name: "integrations.dead-letter"
  alert_threshold: 10
  alert_interval: 5m
  manual_intervention: true
```

### DLQ Processing
- Log all DLQ messages with context
- Alert ops when DLQ depth > threshold
- Replay tool for fixed messages
- Weekly DLQ review meeting
