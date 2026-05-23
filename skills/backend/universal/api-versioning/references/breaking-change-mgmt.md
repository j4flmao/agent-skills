# Breaking Change Management

## What Constitutes a Breaking Change

| Change | Breaking? |
|--------|-----------|
| Removing a field | Yes |
| Renaming a field | Yes |
| Changing a field type | Yes |
| Making a required field optional | No |
| Adding an optional field | No |
| Changing error codes | Yes |
| Relaxing input constraints | No |
| Tightening input constraints | Yes |

## Deprecation Policy

1. **Announce**: Communicate deprecation 6+ months before removal.
2. **Header warning**: Add `Sunset` and `Deprecation` headers.

```python
from fastapi import Response

@v1.get("/users")
async def list_users(response: Response):
    response.headers["Deprecation"] = "true"
    response.headers["Sunset"] = "Sat, 01 Jan 2027 00:00:00 GMT"
    # ...
```

3. **Monitor**: Track usage via `Deprecation` header logging.
4. **Migrate**: Provide migration guides and parallel run support.
5. **Remove**: After sunset date, return `410 Gone`.

## Parallel Running

Run old and new versions concurrently during migration. Route via gateway:

```yaml
# envoy.yaml
routes:
- match: { prefix: "/v1/users" }
  route: { cluster: users_v1 }
- match: { prefix: "/v2/users" }
  route: { cluster: users_v2 }
```

## Graceful Degradation

- Support `Prefer` header: `Prefer: version=2` with fallback to latest.
- Return `300 Multiple Choices` with available versions in the body.

## Communication

- Publish a changelog in your API docs.
- Maintain a migration guide for each major version.
- Use API lifecycle hooks to notify tenants individually.
