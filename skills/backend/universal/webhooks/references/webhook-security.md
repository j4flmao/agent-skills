# Webhook Security

## HMAC Signature Verification

Providers sign the payload with a shared secret using HMAC-SHA256. Always verify before processing.

```python
import hmac, hashlib

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

## Timing-Safe Comparison

Always use `compare_digest` (or equivalent) to prevent timing side-channel attacks. Never use `==` on strings.

## Common Header Patterns

| Provider | Header | Algorithm |
|----------|--------|-----------|
| Stripe | `stripe-signature` | HMAC-SHA256 |
| GitHub | `x-hub-signature-256` | HMAC-SHA256 |
| Twilio | `x-twilio-signature` | HMAC-SHA1 |

## Replay Protection

Include a timestamp in the payload and reject events older than a tolerance window (e.g., 5 minutes):

```python
import time
if abs(time.time() - event_timestamp) > 300:
    raise HTTPException(403, "Replay attack detected")
```

## Additional Hardening

- **HTTPS only**: Reject non-TLS connections at the load balancer.
- **IP allowlisting**: Restrict to known provider IP ranges (published by each provider).
- **Secret rotation**: Rotate secrets regularly. Support multiple active secrets during rotation windows.
- **Payload size limits**: Reject oversized payloads (>1 MB).
- **Logging**: Log all verification failures for audit.

## What *Not* to Do

- Do not log raw payloads or secrets.
- Do not skip verification in development environments — test with real signatures.
- Do not accept unauthenticated webhooks behind a reverse proxy without additional auth.
