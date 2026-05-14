# Loki Setup Reference

## LogQL Examples

```logql
# Error rate per service
sum(rate({job="orders"} |= "error" [5m])) by (service)

# Specific trace
{job="orders"} |= "trace_id=abc123"

# Recent errors
{namespace="production"} |= "ERROR" |= "orders"
```

## Retention
- 30 days in object store.
- 7 days in BoltDB index.
