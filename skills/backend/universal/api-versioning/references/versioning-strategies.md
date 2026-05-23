# API Versioning Strategies

## URI Path Versioning (`/v1/`, `/v2/`)

Most straightforward. Version is part of the URL path.

```python
from fastapi import APIRouter

v1 = APIRouter(prefix="/v1")
v2 = APIRouter(prefix="/v2")

@v1.get("/users")
async def list_users_v1(): ...

@v2.get("/users")
async def list_users_v2(): ...
```

**Pros**: Cache-friendly, easy to route, explicit.  
**Cons**: URL pollution, client hard-coding.

## Header Versioning (`Accept` header)

Use custom media types: `application/vnd.myapp.v1+json`.

```python
from fastapi import Request, HTTPException

def get_version(request: Request) -> int:
    accept = request.headers.get("accept", "")
    for v in [3, 2, 1]:
        if f"vnd.myapp.v{v}" in accept:
            return v
    raise HTTPException(406)
```

**Pros**: Clean URLs, content negotiation.  
**Cons**: Harder to test from a browser, opaque to cache layers.

## Query Parameter Versioning

`GET /users?version=1`

**Pros**: Simple to implement.  
**Cons**: Pollutes query string, easily forgotten, no caching differentiation.

## Content Negotiation

Combine media type with schema version in the body. Useful for graph/mutation APIs:

```json
{"data": {...}, "schema_version": "2024-01-01"}
```

## Semantic Versioning for APIs

Use `MAJOR.MINOR.PATCH`:
- **MAJOR**: Breaking change (new endpoint contract).
- **MINOR**: Backward-compatible addition.
- **PATCH**: Bug fix, no contract change.

Document the version in your OpenAPI spec and release notes.
