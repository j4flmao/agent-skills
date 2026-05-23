# Webhook Setup

## Receiving Webhooks

Expose a stable HTTPS endpoint that accepts `POST` requests with a JSON body. Respond with `200 OK` within 5 seconds to acknowledge receipt.

```python
# FastAPI example
from fastapi import FastAPI, Request, HTTPException
app = FastAPI()

@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    # verify then process
    return {"received": True}
```

## Retry Strategies

| Strategy | Description |
|----------|-------------|
| Linear | Retry every N seconds (simple but wasteful) |
| Exponential Backoff | Delay doubles: 1s, 2s, 4s, 8s, … capped at max |
| Jitter | Add randomness to backoff to avoid thundering herd |

```python
import time, random

def retry_with_backoff(fn, max_retries=5):
    for attempt in range(max_retries):
        try:
            return fn()
        except Exception:
            if attempt == max_retries - 1:
                raise
            sleep = min(2 ** attempt + random.random(), 60)
            time.sleep(sleep)
```

## Idempotency

Deduplicate by `idempotency-key` in the header or a unique event `id` in the payload. Store processed IDs in a key-value store with TTL:

```python
processed = redis_client.get(f"webhook:{event_id}")
if processed:
    return {"status": "duplicate"}
await process_event(payload)
redis_client.setex(f"webhook:{event_id}", 86400, "done")
```

## Delivery Guarantees

- **At-least-once**: Provider retries on non-2xx. Consumer must deduplicate.
- **Dead-letter queue**: Events that fail after N retries go to DLQ for manual inspection.
- **Rate limiting**: Providers may throttle — consumer should queue and process later.

## Signature Verification

See `webhook-security.md` for HMAC verification details.
