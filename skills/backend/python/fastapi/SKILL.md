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
Structure FastAPI applications with Clean Architecture. Pydantic at boundaries only. Domain entities are pure Python dataclasses. FastAPI routers are thin.

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
  core/
    config.py                          -- Pydantic Settings
    security.py                        -- Auth dependencies
  domain/
    entities.py                        -- Pure dataclasses. No framework code.
    repositories.py                    -- ABC classes (interfaces)
    services.py                        -- Domain services
  application/
    use_cases/
      create_user.py                   -- One use case per file
  infrastructure/
    database/
      models.py                        -- SQLAlchemy ORM models
      repositories.py                  -- Implement domain ABCs
      session.py                       -- Session factory
  schemas/
    user.py                            -- Pydantic request/response schemas
    common.py                          -- Shared schemas (pagination, error)
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
```

### Step 3: Repository Interface (ABC) and Implementation
```python
# domain/repositories.py
from abc import ABC, abstractmethod
from domain.entities import User

class UserRepository(ABC):
    @abstractmethod
    async def find_by_id(self, id: UUID) -> User | None: ...
    @abstractmethod
    async def save(self, user: User) -> None: ...

# infrastructure/database/repositories.py
class SqlAlchemyUserRepository(UserRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, id: UUID) -> User | None:
        model = await self.session.get(UserModel, id)
        return self._to_domain(model) if model else None

    async def save(self, user: User) -> None:
        model = UserModel(id=user.id, email=user.email, name=user.name)
        self.session.add(model)
        await self.session.commit()
```

### Step 4: Pydantic Schemas (API Boundary Only)
```python
from pydantic import BaseModel, EmailStr

class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str

    def to_domain(self) -> User:
        return User.create(email=self.email, name=self.name)

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    is_active: bool

    @classmethod
    def from_domain(cls, user: User) -> "UserResponse":
        return cls(id=str(user.id), email=user.email, name=user.name, is_active=user.is_active)
```

### Step 5: FastAPI Endpoint
```python
from fastapi import APIRouter, Depends

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    request: CreateUserRequest,
    use_case: CreateUserUseCase = Depends(get_create_user_use_case),
):
    user = await use_case.execute(request.to_domain())
    return UserResponse.from_domain(user)
```

## Rules
- FastAPI routers are thin. Input validation in Pydantic schemas. Business logic in use cases. Data access in repositories.
- Domain entities are pure Python dataclasses. No Pydantic validators, no SQLAlchemy annotations, no framework imports.
- Pydantic schemas exist ONLY at the API boundary (src/schemas/). Never import them in domain or application layers.
- Use Depends() for dependency injection. Never instantiate dependencies inside routers.
- One file per endpoint resource in api/v1/endpoints/.
- All business logic lives in use cases. Zero business logic in routers or repository implementations.

## References
- `references/fastapi-structure.md` — FastAPI project structure and app setup

## Handoff
No artifact produced.
Next skill: backend-testing — test FastAPI with pytest.
Carry forward: router structure, dependency injection setup, ORM choice (SQLAlchemy/Prisma).
