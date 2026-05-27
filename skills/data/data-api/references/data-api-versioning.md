# Data API Versioning

## Versioning Strategies

Data APIs require careful versioning to evolve schemas without breaking consumers.

### URL Path Versioning

```python
from fastapi import APIRouter, Depends
from datetime import datetime

v1_router = APIRouter(prefix="/api/v1")
v2_router = APIRouter(prefix="/api/v2")

@v1_router.get("/users")
async def get_users_v1():
    return [{"id": 1, "name": "Alice", "email": "alice@example.com"}]

@v2_router.get("/users")
async def get_users_v2():
    return [{
        "id": 1,
        "profile": {
            "first_name": "Alice",
            "last_name": "Smith",
            "email": "alice@example.com",
        },
        "metadata": {
            "created_at": "2024-01-15T10:00:00Z",
            "updated_at": "2024-06-20T14:30:00Z",
        }
    }]
```

### Header Versioning

```python
from enum import Enum

class APIVersion(Enum):
    V1 = "2024-01-01"
    V2 = "2024-06-01"

class VersionNegotiator:
    def __init__(self):
        self.handlers: dict[APIVersion, dict[str, Callable]] = {}

    def register_handler(self, version: APIVersion, path: str, handler: Callable):
        if version not in self.handlers:
            self.handlers[version] = {}
        self.handlers[version][path] = handler

    def resolve(self, version_header: str, path: str) -> Callable:
        requested = APIVersion(version_header)
        available = sorted(self.handlers.keys(), reverse=True)

        for version in available:
            if version.value <= requested.value and path in self.handlers[version]:
                return self.handlers[version][path]

        raise VersionNotFoundError(f"No handler for {path} at version {requested}")
```

## Deprecation Policy

```python
from datetime import datetime, timedelta
from enum import Enum

class DeprecationStatus(Enum):
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    SUNSET = "sunset"
    REMOVED = "removed"

class VersionLifecycle:
    def __init__(self):
        self.endpoints: dict[str, EndpointLifecycle] = {}

    def deprecate(self, endpoint: str, sunset_date: datetime):
        self.endpoints[endpoint] = EndpointLifecycle(
            status=DeprecationStatus.DEPRECATED,
            deprecated_at=datetime.utcnow(),
            sunset_date=sunset_date,
            migration_guide=f"/docs/migration/{endpoint.replace('/', '_')}.md",
        )

    def is_deprecated(self, endpoint: str) -> DeprecationStatus | None:
        lifecycle = self.endpoints.get(endpoint)
        if not lifecycle:
            return None
        if lifecycle.sunset_date < datetime.utcnow():
            return DeprecationStatus.SUNSET
        return lifecycle.status
```

## Migration Support

```python
class SchemaMigration:
    def __init__(self, from_version: str, to_version: str):
        self.from_version = from_version
        self.to_version = to_version
        self.transforms: list[Transform] = []

    def add_transform(self, transform: Transform):
        self.transforms.append(transform)

    def migrate(self, data: dict) -> dict:
        result = data.copy()
        for transform in self.transforms:
            result = transform.apply(result)
        return result

class ResponseTransformer:
    def __init__(self):
        self.migrations: dict[tuple[str, str], SchemaMigration] = {}

    def register_migration(self, migration: SchemaMigration):
        key = (migration.from_version, migration.to_version)
        self.migrations[key] = migration

    def transform_response(
        self, response: dict, from_version: str, to_version: str
    ) -> dict:
        # Chain migrations to reach target version
        current = from_version
        result = response
        while current != to_version:
            next_version = self._next_version(current, to_version)
            migration = self.migrations.get((current, next_version))
            if migration:
                result = migration.migrate(result)
            current = next_version
        return result
```

## Key Points

- Use URL path versioning for public APIs, header versioning for internal
- Define explicit deprecation policy with minimum 6-month sunset period
- Provide migration guides for every breaking change
- Support concurrent versions with separate handler registrations
- Transform responses between versions for backward compatibility
- Monitor deprecated endpoint usage and communicate with consumers
- Sunset endpoints only after verifying zero traffic for 30 days
- Include sunset headers in deprecated endpoint responses
- Version the response schema independently from the request
- Test all migration paths between consecutive versions
