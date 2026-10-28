---
name: python-fastapi-architecture
description: >
  Use this skill when the user says 'FastAPI structure', 'FastAPI architecture', 'FastAPI folder', 'FastAPI clean arch', 'FastAPI router', 'FastAPI dependency injection', 'Python backend structure', or when building a FastAPI application. This skill enforces: Clean Architecture folder structure (api/core/domain/application/infrastructure/schemas), Pydantic schemas at the API boundary only, Depends for DI, repository pattern with ABC, pure domain entities with dataclasses. Requires FastAPI in dependencies. Do NOT use for: Django projects, Flask, or non-Python backend stacks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, python, fastapi, phase-2]
---

# Python FastAPI Architecture

## Purpose
Structure FastAPI applications with Clean Architecture. Pydantic at boundaries only. Domain entities are pure Python dataclasses. FastAPI routers are thin. Dependency injection via Depends.

## Agent Protocol

### Trigger
Exact user phrases: "FastAPI structure", "FastAPI architecture", "FastAPI folder", "FastAPI clean arch", "FastAPI router", "FastAPI dependency injection", "Python backend structure".

### Input Context
Before activating, verify:
- requirements.txt or pyproject.toml has fastapi dependency.
- The feature or module being created is known.

### Output Artifact
No file output. Produces folder structure and code examples as text.

### Response Format
Folder structure:
```
src/
  main.py
  api/v1/endpoints/
  core/
  domain/
  application/use_cases/
  infrastructure/database/
  schemas/
```

Code: module-level only. No import statements.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] src/ directory structure follows Clean Architecture.
- [ ] Domain entities are pure Python (dataclasses). No Pydantic. No SQLAlchemy.
- [ ] Pydantic schemas exist only in src/schemas/ (API boundary).
- [ ] Repository interfaces are ABCs in domain/.
- [ ] Repository implementations use SQLAlchemy in infrastructure/.
- [ ] FastAPI routers use Depends() for DI.
- [ ] One endpoint file per resource in api/v1/endpoints/.

### Max Response Length
Folder structure: unlimited. Code: 15 lines per example.

## Architecture Decision Trees

### FastAPI vs Django vs Flask

| Criterion | FastAPI | Django | Flask |
|-----------|---------|--------|-------|
| Async | Native (async def) | Partial (3.1+ async) | Limited (async extra) |
| Validation | Pydantic (built-in) | DRF Serializers | Manual / Flask-Marshmallow |
| Performance | High (Starlette + Uvicorn) | Moderate | Low |
| DI system | Depends() | No built-in | Flask-Injector |
| Ecosystem | Growing | Largest | Large |
| Auto-docs | OpenAPI (built-in) | DRF-YASG | Flask-Smorest |

Decision: Async + type safety + auto-docs → FastAPI. Full framework ecosystem → Django. Microservice/simple → FastAPI. Legacy or simple → Flask.

### Clean Architecture vs Simple Router Structure

| Criterion | Clean Architecture | Simple Router |
|-----------|-------------------|---------------|
| Project size | Large (5+ modules) | Small (1-3 modules) |
| Team size | 3+ developers | 1-2 developers |
| Testability | High (isolated layers) | Moderate |
| Boilerplate | More files per module | Less files per module |
| Domain complexity | Complex business rules | Simple CRUD |

Decision: Complex domain with business rules → Clean Architecture. Simple CRUD or small project → Simple Router with services.

## Workflow

### Step 1: Create Folder Structure
```
src/
  main.py                              -- FastAPI app creation, middleware, startup
  api/
    v1/
      __init__.py
      router.py                        -- Include all v1 routers
      endpoints/
        users.py                       -- One file per resource
        orders.py
  core/
    config.py                          -- Pydantic Settings
    security.py                        -- Auth dependencies
    dependencies.py                    -- Shared dependencies
  domain/
    entities.py                        -- Pure dataclasses. No framework code.
    repositories.py                    -- ABC classes (interfaces)
    services.py                        -- Domain services
  application/
    use_cases/
      create_user.py                   -- One use case per file
      get_user.py
  infrastructure/
    database/
      models.py                        -- SQLAlchemy ORM models
      repositories.py                  -- Implement domain ABCs
      session.py                       -- Session factory
    external/
      email_service.py
  schemas/
    user.py                            -- Pydantic request/response schemas
    common.py                          -- Shared schemas (pagination, error)
    order.py
tests/
  test_api/
    test_users.py
  test_application/
    test_create_user.py
```

### Step 2: Domain Entity (Pure Python)
```python
from dataclasses import dataclass, field
from uuid import uuid4, UUID
from datetime import datetime

@dataclass
class User:
    id: UUID = field(default_factory=uuid4)
    email: str = ""
    name: str = ""
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)

    @classmethod
    def create(cls, email: str, name: str) -> "User":
        if not email or "@" not in email:
            raise ValueError("Invalid email")
        return cls(email=email, name=name)

    def deactivate(self) -> None:
        self.is_active = False

@dataclass
class Order:
    id: UUID = field(default_factory=uuid4)
    user_id: UUID = field(default_factory=uuid4)
    status: str = "pending"
    total: float = 0.0
    items: list = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)

    def add_item(self, product: str, price: float, quantity: int) -> None:
        self.items.append({"product": product, "price": price, "quantity": quantity})
        self.total += price * quantity

    def confirm(self) -> None:
        if not self.items:
            raise ValueError("Cannot confirm empty order")
        self.status = "confirmed"
```

### Step 3: Repository Interface (ABC) and Implementation
```python
# domain/repositories.py
from abc import ABC, abstractmethod
from uuid import UUID
from domain.entities import User

class UserRepository(ABC):
    @abstractmethod
    async def find_by_id(self, id: UUID) -> User | None: ...
    @abstractmethod
    async def find_by_email(self, email: str) -> User | None: ...
    @abstractmethod
    async def save(self, user: User) -> None: ...
    @abstractmethod
    async def find_all(self, skip: int = 0, limit: int = 20) -> tuple[list[User], int]: ...

# infrastructure/database/repositories.py
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

class SqlAlchemyUserRepository(UserRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, id: UUID) -> User | None:
        model = await self.session.get(UserModel, id)
        return self._to_domain(model) if model else None

    async def find_by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(UserModel).where(UserModel.email == email)
        )
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def save(self, user: User) -> None:
        model = UserModel(id=user.id, email=user.email, name=user.name)
        self.session.add(model)
        await self.session.commit()

    async def find_all(self, skip: int = 0, limit: int = 20) -> tuple[list[User], int]:
        result = await self.session.execute(
            select(UserModel).offset(skip).limit(limit)
        )
        models = result.scalars().all()
        total = await self.session.scalar(select(func.count(UserModel.id)))
        return [self._to_domain(m) for m in models], total or 0

    def _to_domain(self, model: UserModel) -> User:
        return User(id=model.id, email=model.email, name=model.name, is_active=model.is_active)
```

### Step 4: Pydantic Schemas (API Boundary Only)
```python
from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID
from datetime import datetime
from domain.entities import User

class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str

    def to_domain(self) -> User:
        return User.create(email=self.email, name=self.name)

class UpdateUserRequest(BaseModel):
    name: str | None = None
    is_active: bool | None = None

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    name: str
    is_active: bool
    created_at: datetime

    @classmethod
    def from_domain(cls, user: User) -> "UserResponse":
        return cls(id=str(user.id), email=user.email, name=user.name,
                   is_active=user.is_active, created_at=user.created_at)

class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    total: int
    page: int
    page_size: int
```

### Step 5: Use Case

```python
# application/use_cases/create_user.py
from domain.entities import User
from domain.repositories import UserRepository
from domain.services import EmailService

class CreateUserUseCase:
    def __init__(self, repo: UserRepository, email_service: EmailService):
        self.repo = repo
        self.email_service = email_service

    async def execute(self, email: str, name: str) -> User:
        existing = await self.repo.find_by_email(email)
        if existing:
            raise ValueError("Email already exists")
        user = User.create(email=email, name=name)
        await self.repo.save(user)
        await self.email_service.send_welcome(user)
        return user
```

### Step 6: FastAPI Endpoint and DI

```python
# api/v1/endpoints/users.py
from fastapi import APIRouter, Depends, Query

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=PaginatedResponse[UserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    use_case: GetUsersUseCase = Depends(get_get_users_use_case),
):
    users, total = await use_case.execute(page, page_size)
    return PaginatedResponse(
        data=[UserResponse.from_domain(u) for u in users],
        total=total, page=page, page_size=page_size,
    )

@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    request: CreateUserRequest,
    use_case: CreateUserUseCase = Depends(get_create_user_use_case),
):
    user = await use_case.execute(request.email, request.name)
    return UserResponse.from_domain(user)

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    use_case: GetUserUseCase = Depends(get_get_user_use_case),
):
    user = await use_case.execute(user_id)
    return UserResponse.from_domain(user)

# core/dependencies.py
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session

async def get_user_repo(session: AsyncSession = Depends(get_session)) -> UserRepository:
    return SqlAlchemyUserRepository(session)

async def get_create_user_use_case(
    repo: UserRepository = Depends(get_user_repo),
    email_service: EmailService = Depends(get_email_service),
) -> CreateUserUseCase:
    return CreateUserUseCase(repo, email_service)
```

### Step 7: App Entry Point

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.v1.router import api_router
from core.config import settings

app = FastAPI(title="My API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health():
    return {"status": "ok"}
```

## Implementation Patterns

### Pattern: Global Exception Handler

```python
# core/exceptions.py
class AppException(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: any = None):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details

# main.py — register handler
@app.exception_handler(AppException)
async def app_exception_handler(request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"success": False, "error": {"code": "VALIDATION_ERROR", "details": exc.errors()}},
    )
```

## Production Considerations

### Database Session Management
- Use `async_sessionmaker` with `expire_on_commit=False`
- Session per request via `Depends(get_session)` — never share sessions
- Connection pooling: `create_async_engine(pool_size=5, max_overflow=10)`

### Performance
- Use `ORJSONResponse` for faster JSON serialization: `pip install orjson`
- Enable `openapi_prefix` behind reverse proxy
- Background tasks via `BackgroundTasks` for non-critical operations
- Caching: `fastapi-cache` with Redis backend for expensive queries

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Pydantic in domain layer | Couples business logic to FastAPI | Domain uses dataclasses only |
| Business logic in routers | Untestable, duplicates | Use cases handle logic |
| Direct SQLAlchemy in routers | Leaks infrastructure | Repository pattern |
| Session per operation | Connection leak | Session per request via Depends |
| No type hints on Depends | Loses auto-complete | Type-annotate all Depends() params |
| Sync I/O in async endpoint | Blocks event loop | Use async DB driver (asyncpg, aiosqlite) |

## Security Considerations
- CORS: restrict origins, methods, headers in production
- Auth via `Depends()` — OAuth2PasswordBearer, JWT, API key
- Input validation: Pydantic at the boundary rejects malformed data
- Rate limiting: `slowapi` with Redis or middleware
- SQL injection: SQLAlchemy ORM is safe; raw queries via `text()` are parameterized
- Security headers: `Starlette` middleware for HSTS, XSS, CSP
- Secrets via Pydantic Settings from `.env` — never hardcoded

## Testing Strategies

```python
# tests/test_api/test_users.py
from httpx import AsyncClient, ASGITransport
import pytest
from main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_create_user(client):
    response = await client.post("/api/v1/users", json={
        "email": "test@test.com",
        "name": "Test User",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@test.com"
```

Use `httpx.AsyncClient` with ASGI transport for integration tests. Use `pytest-asyncio` for async test support. Use `pytest-cov` for coverage. Use `TestContainers` for PostgreSQL integration.

## Rules
- FastAPI routers are thin. Input validation in Pydantic schemas. Business logic in use cases. Data access in repositories.
- Domain entities are pure Python dataclasses. No Pydantic validators, no SQLAlchemy annotations, no framework imports.
- Pydantic schemas exist ONLY at the API boundary (src/schemas/). Never import them in domain or application layers.
- Use Depends() for dependency injection. Never instantiate dependencies inside routers.
- One file per endpoint resource in api/v1/endpoints/.
- All business logic lives in use cases. Zero business logic in routers or repository implementations.
- Async everywhere — use `async def` for all endpoints and Depends.
- Type-annotate all function parameters and return types.

## References
  - references/dependency-injection-patterns.md — FastAPI Dependency Injection Patterns
  - references/fastapi-advanced.md — FastAPI Advanced Patterns
  - references/fastapi-background.md — FastAPI Background Tasks
  - references/fastapi-dependency-injection.md — FastAPI Dependency Injection
  - references/fastapi-routing-patterns.md — FastAPI Routing Patterns
  - references/fastapi-structure.md — FastAPI Project Structure
  - references/fastapi-testing.md — FastAPI Testing
  - references/fastapi-websocket.md — FastAPI WebSocket and Real-Time Patterns
  - references/middleware-background.md — Middleware, Background Tasks, and WebSockets in FastAPI
  - references/testing-debugging.md — Testing and Debugging FastAPI Applications
## Handoff
No artifact produced.
Next skill: backend-testing — test FastAPI with pytest.
Carry forward: router structure, dependency injection setup, ORM choice (SQLAlchemy/Prisma).
