# Audit Trail

## Structured Audit Events

Every audit event must capture:

```json
{
  "id": "evt_abc123",
  "timestamp": "2026-05-23T10:15:30Z",
  "actor": {"id": "user_42", "type": "human"},
  "action": "order.cancel",
  "resource": {"type": "order", "id": "ord_789"},
  "context": {"ip": "203.0.113.1", "user_agent": "..."},
  "changes": {"status": {"from": "active", "to": "cancelled"}},
  "result": "success"
}
```

## Emitting Events

```python
import structlog

logger = structlog.get_logger()

async def cancel_order(order_id: str, user_id: str):
    old = await get_order(order_id)
    await execute_cancel(order_id)
    logger.info("order.cancel", actor=user_id, resource=f"order:{order_id}",
                 changes={"status": {"from": old.status, "to": "cancelled"}})
```

## Storage

- **Immutable store**: Append-only table, no UPDATE/DELETE allowed.
- **Separate schema**: `audit_log` schema isolated from application data.
- **WAL append**: Write-ahead log for guaranteed delivery.

## Tamper Evidence

### Chain Hashes (Merkle Tree)

```python
import hashlib

def chain_hash(prev_hash: str, event: dict) -> str:
    content = f"{prev_hash}|{json.dumps(event, sort_keys=True)}"
    return hashlib.sha256(content.encode()).hexdigest()
```

Each event stores `prev_hash`. A tampered event breaks the entire chain.

### Periodic Anchor

Periodically hash the latest chain head and publish to a public ledger (e.g., Ethereum, blockchain timestamping service).

## Querying

- Index by `actor`, `resource.type`, `action`, `timestamp`.
- Support time-range scans.
- API: paginated, filterable.

```sql
SELECT * FROM audit_log
WHERE actor_id = 'user_42'
  AND timestamp >= NOW() - INTERVAL '30 days'
ORDER BY timestamp DESC;
```
