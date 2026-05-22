# Logging Schema

## Required Fields
```json
{
  "timestamp": "2025-01-15T10:30:00.123Z",
  "level": "INFO",
  "logger": "checkout.service",
  "message": "Order created successfully",
  "structuredContext": {
    "traceId": "abc123def456",
    "spanId": "span-789",
    "userId": "user_98765",
    "requestId": "req_4444",
    "service": "checkout-service",
    "version": "1.2.3",
    "environment": "production",
    "correlationId": "corr_abc123"
  }
}
```

## Additional Context Fields
```json
{
  "orderId": "ord_55555",
  "amount": 49.99,
  "currency": "USD",
  "paymentMethod": "card"
}
```

## Error Log Fields
```json
{
  "level": "ERROR",
  "message": "Payment processing failed",
  "error": {
    "type": "PaymentDeclinedError",
    "message": "Card declined: insufficient funds",
    "code": "INSUFFICIENT_FUNDS",
    "stack": "PaymentDeclinedError: ..."
  },
  "orderId": "ord_55555"
}
```

## Log Level Usage
| Level | When | Example |
|-------|------|---------|
| ERROR | Request cannot be served | DB connection failed, validation failed |
| WARN | Degradation but served | Circuit breaker opened, fallback used |
| INFO | State transition | User created, order placed, payment confirmed |
| DEBUG | Development detail | Query params, function args, variable dump |

## Best Practices
- Message is a human-readable summary — put details in structured fields
- Use lowercase for field names (consistent with JSON conventions)
- Never log the same data in message and structured fields
- Keep structured field values small (<1KB per log entry)
- Index timestamp and correlationId in log aggregation system
