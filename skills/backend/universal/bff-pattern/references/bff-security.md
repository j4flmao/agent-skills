# BFF Security

## Auth at the BFF Layer

The BFF is the security perimeter. Authenticate and authorize at the BFF — never pass raw credentials to downstream services.

```python
from fastapi import Request, HTTPException
import jwt

async def authenticate(request: Request):
    token = request.headers.get("authorization", "").removeprefix("Bearer ")
    try:
        payload = jwt.decode(token, JWKS, algorithms=["RS256"])
        request.state.user = payload["sub"]
        request.state.scopes = payload.get("scopes", [])
    except jwt.PyJWTError:
        raise HTTPException(401)
```

## Session Management

- BFF issues its own session token (opaque or JWT).
- Session is bound to the BFF domain — mobile and web tokens are not interchangeable.
- Short-lived access tokens + long-lived refresh tokens.

## Downstream Auth

BFF authenticates to downstream services via:

- **mTLS**: Service-to-service mutual TLS.
- **Service tokens**: Short-lived, scoped tokens for BFF identity.
- **User impersonation**: Forward user context as JWT or header.

```python
async def call_downstream(url, user_context):
    headers = {
        "X-User-ID": user_context["sub"],
        "X-Scopes": ",".join(user_context["scopes"]),
        "Authorization": f"Bearer {service_token()}",
    }
    return await http_client.get(url, headers=headers)
```

## Security Boundaries

| Layer | Responsibility |
|-------|---------------|
| API Gateway | TLS termination, rate limiting |
| BFF | Auth, validation, aggregation |
| Microservice | Business logic, resource authorization |

## Additional Measures

- Input validation at BFF (never trust the client).
- Output sanitization (filter sensitive fields per client type).
- CORS restricted to BFF's own origin.
- Rate limiting per user + per BFF.
