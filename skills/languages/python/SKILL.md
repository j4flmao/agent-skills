---
name: python
description: >
  Use this skill when the user asks about Python build tools, packaging,
  dependency management, virtual environments, type annotations, async/await,
  testing, or production deployment. Focus on tooling and ecosystem — not
  language syntax.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [python, language, build, packaging]
---

# Python

## Purpose
Guide for Python build tools, package management, virtual environments, type annotations, async patterns, testing, and production deployment.

## Agent Protocol

### Trigger
Keywords: `python build`, `pip`, `poetry`, `uv`, `pyproject.toml`, `venv`, `mypy`, `pytest`, `async python`, `celery`, `fastapi`, `django`.

### Input Context
- Project type (CLI tool, web API, data pipeline, library)
- Build system (setuptools, poetry, pdm, uv)
- Python version requirements
- Deployment target (serverless, container, VPS)

### Output Artifact
Build configuration, dependency management setup, project structure, test configuration, and deployment config tailored to project type.

## Decision Trees

### Build Tool Selection
```
Project type?
├── Library (distributed on PyPI)
│   ├── Simple → setuptools + pyproject.toml (built-in, no extra deps)
│   └── Modern → hatchling / flit (fast, standards-compliant)
├── Application (web API, CLI tool, service)
│   ├── Python 3.12+ → uv (fastest, unified, Rust-based)
│   ├── Large monorepo → PDM (PEP 582, no virtualenv needed)
│   └── Team standard → Poetry (lock file, dependency resolution, publish)
└── Data science / ML → conda / mamba (binary packages, CUDA support)
```

### Virtual Environment Strategy
```
Deployment context?
├── Containerized (Docker) → single venv in container, no system Python
├── Local development → pyenv + virtualenv / uv venv (isolated per project)
├── CI/CD → fresh venv per run (cache pip/uv between runs)
└── Monorepo → PDM workspace / hatch.env per project
```

### Async Framework Selection
```
Web API needed?
├── High-performance async API → FastAPI (async-native, Pydantic, OpenAPI)
├── Full-featured web app → Django (sync, async-capable since 3.0, ORM, admin)
├── Lightweight async → Starlette (minimal, FastAPI foundation)
├── Real-time / WebSocket → FastAPI + WebSocket / Socket.IO
└── Background tasks → Celery + Redis/RabbitMQ or FastAPI BackgroundTasks
```

## Build & Package Management

### pyproject.toml (Modern Standard)
```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "myproject"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.100",
    "pydantic>=2.0",
    "sqlalchemy>=2.0",
]

[project.optional-dependencies]
dev = ["pytest>=8", "mypy>=1.0", "ruff>=0.1"]
prod = ["uvicorn[standard]", "gunicorn"]

[tool.ruff]
line-length = 100
select = ["E", "F", "I", "N", "W", "UP", "B"]
ignore = ["E501"]

[tool.mypy]
strict = true
python_version = "3.11"
```

### Poetry
```toml
[tool.poetry]
name = "myproject"
version = "0.1.0"
python = "^3.11"

[tool.poetry.dependencies]
fastapi = "^0.100"
pydantic = "^2.0"

[tool.poetry.group.dev.dependencies]
pytest = "^8.0"
ruff = "^0.1"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

```bash
poetry new myproject
poetry add fastapi
poetry add --group dev pytest
poetry run python -m myproject
poetry build
poetry publish
```

### uv (Fastest, Rust-based)
```bash
# Install
curl -LsSf https://astral.sh/uv/install.sh | sh

# Commands
uv init myproject
uv add fastapi
uv add --dev pytest
uv sync
uv run python -m myproject
uv pip install -r requirements.txt  # pip-compatible
```

## Language-Specific Patterns

### Type Annotations (PEP 484+)
```python
from collections.abc import Sequence
from typing import assert_never, Literal, Never, TypeAlias, override

UserID: TypeAlias = int
Status: TypeAlias = Literal["active", "inactive", "banned"]

class User:
    id: UserID
    status: Status

    @override  # PEP 698 (Python 3.12+)
    def __str__(self) -> str: ...

def process_users(users: Sequence[User]) -> list[User]:
    ...

# Narrowing with TypeGuard
def is_active(user: User) -> TypeGuard[User]:
    return user.status == "active"

# Never type for exhaustive matching
def assert_exhaustive(x: Never) -> Never:
    raise RuntimeError(f"Unexpected: {x}")
```

### Async/Await Patterns
```python
import asyncio
from asyncio import TaskGroup, Semaphore

# Structured concurrency (Python 3.11+)
async def process_all():
    async with TaskGroup() as tg:
        for item in items:
            tg.create_task(process(item))

# Semaphore for rate limiting
sem = Semaphore(10)

async def rate_limited_fetch(url: str) -> bytes:
    async with sem:
        return await fetch(url)

# Async context manager
class DatabaseConnection:
    async def __aenter__(self): ...
    async def __aexit__(self, *args): ...

# Task timeout
async def fetch_with_timeout():
    try:
        async with asyncio.timeout(5.0):
            return await fetch()
    except TimeoutError:
        return fallback
```

### Pydantic for Data Validation
```python
from pydantic import BaseModel, Field, EmailStr, SecretStr, field_validator

class OrderCreate(BaseModel):
    user_id: int = Field(gt=0)
    email: EmailStr
    items: list[str] = Field(min_length=1)
    coupon: str | None = None
    api_key: SecretStr  # Never serialized by default

    @field_validator("items")
    @classmethod
    def validate_items(cls, v: list[str]) -> list[str]:
        if len(v) > 100:
            raise ValueError("max 100 items per order")
        return v

# Serialization
order = OrderCreate(user_id=1, email="a@b.com", items=["book"], api_key="secret")
data = order.model_dump(mode="json", exclude={"api_key"})
```

## Testing & Tooling

### Pytest Patterns
```python
import pytest
from pytest import approx, fixture, mark

@fixture
def db_session():
    session = create_session()
    yield session
    session.rollback()
    session.close()

@mark.parametrize("input,expected", [
    (1, 2), (2, 4), (3, 6),
])
def test_double(input: int, expected: int):
    assert double(input) == expected

# Async test
@mark.asyncio
async def test_async_fetch():
    result = await fetch_data()
    assert result.status == 200

# Mock with monkeypatch
def test_api_call(monkeypatch):
    monkeypatch.setattr("app.api.fetch", lambda: {"data": "mocked"})
    ...
```

### Ruff (Linter + Formatter)
```bash
# Fastest Python linter (Rust-based, replaces flake8 + isort + black)
ruff check .                    # Lint
ruff check --fix .              # Auto-fix
ruff format .                   # Format (black-compatible)
ruff check --preview .          # Preview rules
```

### Mypy Strict Mode
```bash
mypy src/ --strict --python-version 3.11
# Generate stubs for untyped libraries
 stubgen -p untyped_lib -o stubs/
```

## Anti-Patterns

- **setup.py when pyproject.toml is sufficient**: Use `pyproject.toml` alone (PEP 621). Keep `setup.py` only for dynamic builds
- **requirements.txt without lock file**: Use `poetry.lock` or `uv.lock` for reproducible installs. Never ship without pinned deps
- **Mutable default arguments**: `def f(x=[]):` — list shared across calls. Use `None` default with `=`...
- **Global mutable state**: Module-level lists/dicts mutate across requests. Use dependency injection or context vars
- **Bare `except:`**: Catches `SystemExit`, `KeyboardInterrupt`. Always `except Exception:`
- **Not using `__slots__` for data classes**: Each instance wastes dict overhead. Use `@dataclass(slots=True)` (Python 3.10+)
- **Sync I/O in async context**: `requests.get()` blocks event loop. Use `httpx.AsyncClient()` or `aiohttp`
- **No type annotations on public API**: Makes library unusable for consumers. Always annotate public functions
- **`pip install` outside venv**: Corrupts system Python. Always activate venv or use `pip install --user`
- **Threading for CPU-bound work**: GIL limits parallelism. Use `multiprocessing` or `asyncio` for I/O, `ProcessPoolExecutor` for CPU

## Performance Patterns
- Use `__slots__` for memory-heavy classes (saves ~50% memory per instance)
- `asyncio.gather()` over sequential awaits for independent I/O
- `functools.lru_cache` / `functools.cache` for idempotent pure functions
- `array.array` / `numpy` over list for numeric data
- `io.BytesIO` over string concatenation for building large responses
- Profile with `py-spy` (sampling, no code change) or `cProfile`
- `__pypackage__` for C extensions in hot paths (Rust with PyO3 / maturin)

## FastAPI Project Structure

A production FastAPI application should be organized by domain, not by file type. Instead of `controllers/`, `models/`, `services/`, use `orders/`, `users/`, `billing/` — each with its own router, schemas (Pydantic), services, and tests. Use dependency injection for shared services: `Depends(get_db_session)`, `Depends(get_current_user)`. Lifespan events (FastAPI 0.93+): use `@asynccontextmanager` lifespan for startup/shutdown (database connections, background tasks). Middleware chain: CORS → TrustedHost → GZip → Session → RateLimit → Router. Exception handlers: register custom handlers for HTTPException, ValidationError, and unhandled exceptions — all return structured JSON errors.

## Async SQLAlchemy 2.0

SQLAlchemy 2.0 introduces native async support with `async_sessionmaker`. Pattern: create engine with `create_async_engine()`, create session factory with `async_sessionmaker(bind=engine)`, use `async with get_session() as session` in endpoints. Query style: use the 2.0 style `select()` statement (not legacy `Query` API). `select(User).where(User.id == id)` — always await `session.execute()`. Use `result.scalar_one()` for single object, `result.scalars().all()` for list. Relationship loading: use `selectinload()` for eager loading (prevents N+1). Migrations: Alembic with async support — set `sqlalchemy.url` in alembic.ini to the async connection string. Connection pooling: `pool_size=10, max_overflow=20` for most apps.

## Background Tasks & Celery

For tasks that outlive the request-response cycle (email sending, image processing, report generation):
- **FastAPI BackgroundTasks**: simple, runs after response, no persistence, lost on crash. Use for: log cleanup, cache invalidation.
- **Celery + Redis/RabbitMQ**: persistent task queue, retries, scheduling, monitoring with Flower. Use for: email confirmation, PDF generation, webhook delivery, scheduled jobs.

Celery pattern: define tasks in a `tasks/` module, separate from your API. `@shared_task(bind=True, max_retries=3, default_retry_delay=300)` allows task retry with exponential backoff. Use `self.replace()` for task chaining. Result backend: store task results in Redis for polling status. Periodic tasks: Celery Beat with `schedule` crontab. Task monitoring: `celery -A app.tasks flower --port=5555` shows task status, timing, and failures.

## ASGI vs WSGI Deployment

Deploy ASGI apps (FastAPI, Starlette) differently than WSGI apps (Django, Flask):
- **ASGI**: Uvicorn (single process) → Gunicorn + Uvicorn workers (multi-process) → Nginx/Traefik reverse proxy
- **WSGI**: Gunicorn (workers) → Nginx — or uWSGI with emperor mode

ASGI config: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 --limit-max-requests 10000 — for production. Docker: use `uvicorn` directly, expose port, set `--proxy-headers` and `--forwarded-allow-ips="*"` when behind nginx. Health check: add a `/health` endpoint returning 200. Graceful shutdown: `uvicorn` handles SIGTERM by waiting for in-flight requests to complete (timeout_graceful_shutdown config).

## Testing with Pytest Advanced Patterns

Beyond basic tests: (a) `pytest-asyncio` with `@pytest.mark.asyncio` for async test functions, (b) `pytest-cov` for coverage reports with branch coverage, (c) `pytest-xdist` for parallel test execution (`-n auto`), (d) `pytest-timeout` to prevent hung tests (`--timeout=30`), (e) `pytest-socket` to disable network calls in unit tests, (f) `pytest-env` to set required environment variables. Factory fixtures: use `factory_boy` to create test data (UserFactory, OrderFactory) with `Faker` attributes. Integration tests: use `Testcontainers` for real PostgreSQL/Redis in Docker, or `httpx.AsyncClient` with `ASGITransport` for API testing without network.

## Code Examples — FastAPI with SQLAlchemy
```python
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")
    app.state.async_session = async_sessionmaker(engine, expire_on_commit=False)
    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(lifespan=lifespan)

async def get_session() -> AsyncSession:
    async with app.state.async_session() as session:
        yield session

@app.get("/orders/{order_id}")
async def get_order(order_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
```

## Code Examples — Pytest with Fixtures
```python
import pytest
from httpx import AsyncClient, ASGITransport

@pytest.fixture
async def async_client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

@pytest.mark.asyncio
async def test_create_order(async_client):
    response = await async_client.post("/api/orders", json={
        "customer_id": 1,
        "items": [{"product_id": 1, "qty": 2}],
    })
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
```

### Dependency Management Comparison

| Tool | Python Req | Lock File | Speed | Virtual Env | Monorepo | Extras |
|------|-----------|-----------|-------|-------------|----------|--------|
| pip | Any | No (pip freeze) | Slow | venv | No | Built-in |
| pip-tools | Any | requirements.txt | Medium | venv | No | Compile + sync |
| Poetry | 3.8+ | poetry.lock | Medium | Auto | No | Build, publish |
| PDM | 3.8+ | pdm.lock | Medium | Optional | Workspaces | PEP 582 |
| uv | 3.8+ | uv.lock | Fastest | Auto | Workspaces | pip-compat |
| conda | Any | environment.yml | Slow | Auto | env per project | Binary packages |

Recommendation: use `uv` for new projects (2024+), Poetry for established teams, pip-tools for existing pip workflows, conda only for data science/ML with native dependencies.

### Async Framework Feature Comparison

| Feature | FastAPI | Django (async) | Starlette | Quart (Flask async) |
|---------|---------|----------------|-----------|---------------------|
| Async-native | Yes | Partial | Yes | Yes |
| Type validation | Pydantic | DRF serializers | None (add Pydantic) | Marshmallow |
| OpenAPI docs | Auto (Swagger UI) | DRF YASG | Manual | Manual |
| ORM | Any (SQLAlchemy) | Django ORM | Any | SQLAlchemy |
| Admin panel | Third-party | Built-in | None | None |
| WebSocket | Yes (Starlette) | Channels | Yes | Yes |
| Background tasks | Lifespan | Celery | Low-level | Celery |
| Maturity | 2018+ | 2005+ | 2018+ | 2020+ |

### Deployment Target Decision Tree
```
Deploying a Python web app?
├── Serverless → AWS Lambda + Mangum (FastAPI adapter)
│   Cold start: 200-500ms (provisioned concurrency: 50ms)
│   Limits: 10GB RAM, 15min timeout, 50MB zip + 250MB /tmp
│   Best for: low-traffic APIs, spiky workloads
├── Containers → Docker + ECS/GKE/Azure Containers
│   Use: gunicorn + uvicorn workers for ASGI, nginx sidecar for static
│   Best for: consistent traffic, long-running connections
├── VM / VPS → Docker Compose on single host
│   nginx reverse proxy, Let's Encrypt SSL
│   Best for: small teams, cost-effective at moderate scale
└── PaaS → Railway / Render / Fly.io
    Zero DevOps, auto-deploy from git, managed DB
    Best for: MVPs, small apps, internal tools
```

### Anti-Patterns (Expanded)

- **`__init__.py` as kitchen sink**: Importing everything in `__init__.py` creates circular imports. Keep it minimal or empty.
- **`from module import *`**: Pollutes namespace, makes mypy integrations impossible. Always explicit imports.
- **`os.environ` in module scope**: Read env vars on import — can't mock in tests. Use `os.getenv()` inside functions or `pydantic-settings`.
- **`datetime.now()` default in function signature**: `def f(t=datetime.now())` evaluated once at import. Use default `None` and set inside function.
- **Overusing `global` / nonlocal**: Makes functions stateful and untestable. Pass state explicitly.
- **Ignoring mypy strict mode**: `Any` propagates silently. Use `--strict` even on existing code gradually with `# type: ignore`.
- **Mixing `asyncio` styles**: `asyncio.run()` and `loop.run_until_complete()` in same project creates confusion. Pick one pattern.
- **Database queries in template rendering**: N+1 queries on every page load. Eager-load in the view layer.
- **Not pinning transitive dependencies**: Dependencies of dependencies change without notice. Use lock file.
- **`try: except: pass`**: Silently swallows errors. Always log or re-raise. At minimum `log.exception()`.

### Performance Optimization (Expanded)

- **`__slots__`**: Reduces memory ~50% per instance. Use for classes with many instances (ORM models, value objects).
- **Caching strategies**: `@functools.lru_cache` for pure functions, Redis/memcached for distributed caching, `functools.cache` (3.9+) for simple cases.
- **`__pypackage__` / C extensions**: Use Rust with PyO3/maturin for hot paths that can't be optimized in Python. 10-100x speedup on numeric operations.
- **`array.array` vs list**: Saves ~30x memory for large homogeneous numeric arrays. Use `numpy` if doing any math operations.
- **I/O multiplexing**: `asyncio.gather()` over sequential awaits for independent I/O. `asyncio.as_completed()` for first-result-wins patterns.
- **`__match_args__` for structural pattern matching (3.10+)**: Define custom match patterns for data classes.
- **Query optimization**: `selectinload()` vs `joinedload()` for SQLAlchemy relationships. selectinload issues 2 queries, joinedload does one JOIN — choose based on cardinality.
- **Request coalescing**: Cache identical concurrent requests with `aiocache` or `cachetools` with `TTLCache`.
- **String building**: `"".join(list)` over `+=` on strings. `io.StringIO` for large document construction.

### Security Patterns

- **`secrets` module over `random`**: Use `secrets.token_hex(32)` for tokens, keys, passwords. `random` is not cryptographic.
- **SQL injection defense**: Use parameterized queries with SQLAlchemy/psycopg2 — never f-string interpolation in SQL.
- **`pydantic.SecretStr`**: Sensitive data like API keys and passwords — `SecretStr` never serializes by default, masks in repr.
- **`python-jose` / `PyJWT`**: JWT validation with proper audience checking. Never accept `alg: 'none'` tokens.
- **`httpx` with TLS verification**: Never set `verify=False` in production. Use custom CA bundles if needed.
- **Rate limiting**: `slowapi` for FastAPI middleware rate limiting. Per-user/IP with Redis backend for distributed apps.

## References
- `references/type-annotations.md` — Advanced type annotations, generics, protocols
- `references/packaging-dependency.md` — Packaging, pyproject.toml, dependency management
- `references/python-fundamentals.md` — Python Fundamentals
- `references/python-advanced.md` — Advanced Python Patterns
- `references/python-fastapi.md` — FastAPI Web Framework Guide

## Implementation Patterns

### Pattern: Repository with Cached Query

```python
from functools import lru_cache
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_active_users(self, offset: int = 0, limit: int = 50) -> list[User]:
        result = await self.session.execute(
            select(User)
            .where(User.deleted_at.is_(None))
            .order_by(User.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())
```

### Pattern: Background Task with Celery and Monitoring

```python
from celery import Celery, Task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)
app = Celery('tasks', broker='redis://localhost:6379/0')

class MonitoredTask(Task):
    def on_success(self, retval, task_id, args, kwargs):
        logger.info(f"Task {task_id} succeeded", extra={"task_id": task_id})

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"Task {task_id} failed: {exc}", extra={"task_id": task_id})
        # Notify operations
        notify_ops_channel(f"Task {task_id} failed: {exc}")

@app.task(base=MonitoredTask, bind=True, max_retries=3, default_retry_delay=60)
def process_order(self, order_id: int):
    try:
        order = get_order(order_id)
        charge_payment(order)
        send_confirmation(order)
        logger.info("Order processed", extra={"order_id": order_id})
    except PaymentError as exc:
        raise self.retry(exc=exc)
```

## Production Considerations

### ASGI Deployment with Uvicorn
- Workers = `(2 * CPU cores) + 1` for sync workloads. `CPU cores * 2` for async.
- `--limit-max-requests 10000` — prevents memory creep. Worker restarts after N requests.
- Graceful shutdown: SIGTERM → Uvicorn stops accepting connections → waits for in-flight → exits.
- Health checks: `/health` endpoint returning `{"status": "ok"}` with DB connectivity check.

### Monitoring
- Prometheus metrics with `prometheus_fastapi_instrumentator`. Track: request count, latency, error rate.
- Structured logging: `python-json-logger` with `extra` for trace_id, user_id, tenant_id.
- Sentry for error tracking: `sentry_sdk.init()` with `traces_sample_rate=0.1`.
- Celery monitoring: Flower dashboard. Alert on queue depth > 1000, task failure rate > 5%.

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Fix |
|---|---|---|
| `from module import *` | Pollutes namespace. Breaks mypy. | Explicit imports. `__all__` in `__init__.py` |
| `except: pass` | Swallows KeyboardInterrupt, SystemExit. | `except Exception: log.exception()` or re-raise |
| Mutable default args | `def f(x=[])` — list shared across calls. | `def f(x=None): x = x or []` |
| `datetime.now()` at module level | Evaluated at import time. Freezes timestamp. | Call inside function. `default_factory` in dataclasses |
| Threading for CPU work | GIL limits to 1 core. | `multiprocessing` or `asyncio` for I/O |
| `os.environ` in module scope | Can't mock in tests. | `os.getenv()` inside functions or pydantic-settings |

## Performance Optimization

- `__slots__` on dataclasses: `@dataclass(slots=True)` — 50% memory reduction per instance.
- `asyncio.gather()` for concurrent I/O: 5x-10x throughput gain over sequential.
- `lru_cache` on pure functions: TTL via `cachetools.TTLCache` for time-sensitive caching.
- `io.StringIO` / `io.BytesIO` for string building in hot paths. Avoid `+=` concatenation.
- `numpy` vectorization over Python loops for numeric operations. 10x-100x speedup.
- `selectinload()` over `joinedload()` for to-many SQLAlchemy relationships. Prevents cartesian explosion.
- Query coalescing: `aiocache` with `RedisCache` for identical concurrent requests.

## Security Considerations

- SQLAlchemy parameterized queries: `session.execute(select(User).where(User.id == user_id))`. Never f-strings.
- JWT: `python-jose` with RS256. Validate `aud`, `iss`, `exp`, `iat`. Reject `alg: none`.
- Password hashing: `bcrypt` or `argon2-cffi`. Minimum 12 rounds for bcrypt.
- Secrets: pydantic-settings with `.env` file. Never commit `.env` to version control.
- CORS: FastAPI `CORSMiddleware` with explicit `allow_origins`. Never `["*"]` in production.
- Rate limiting: `slowapi` with in-memory or Redis backend. Apply to auth and write endpoints.
- Input validation: Pydantic models on all API endpoints. Strip HTML with `markupsafe`.
- HTTPS: enforce via middleware. Redirect HTTP to 301. HSTS header set.
- CSRF: token-based for form submissions. FastAPI apps using JWT don't need CSRF for API routes.
- Data retention: async cleanup job for expired sessions, OTP codes, temp files. GDPR compliance.
