# Dead Letter Queue

## DLQ Architecture

```
Event → Main Queue → Consumer (retry 3x)
                           ↓ failure
                      Dead Letter Queue → Alert → Manual Reprocess
```

## When Messages Go to DLQ

- Consumer throws unhandled exception after exhausting retries.
- Message format invalid (deserialization failure).
- Business rule violation that cannot be auto-resolved.
- Downstream dependency unavailable beyond retry window.
- Poison message (consistently causes failure).

## DLQ Message Schema

```json
{
  "originalMessage": { /* full original event */ },
  "error": "Connection refused to payment service",
  "errorType": "System.Net.Sockets.SocketException",
  "failedAt": "2026-05-23T10:30:00Z",
  "retryCount": 3,
  "consumerId": "payment-service-v2",
  "traceId": "abc-123-def"
}
```

## DLQ Monitoring

| Metric | Alert Threshold | Action |
|--------|----------------|--------|
| DLQ message count | > 10 | Investigate root cause |
| DLQ growth rate | > 5/min | Page on-call |
| DLQ age | > 1 hour | Escalate to team |
| Failed consumer | Any | Check consumer health |

## DLQ Reprocessing

After fixing the root cause, reprocess DLQ messages:

1. Fix the consumer bug or downstream dependency.
2. Replay DLQ messages to the main queue (or directly to consumer).
3. Monitor for repeated failures.
4. If same messages fail again, investigate — the fix was incomplete.

## DLQ Best Practices

- Every queue has a DLQ. No exceptions.
- DLQ messages include the full original payload plus error context.
- DLQ has no TTL — messages stay until manually resolved.
- Alert on DLQ accumulation, not just presence.
- Automate DLQ reprocessing for known transient issues.
- Document DLQ reprocedure in the service runbook.
