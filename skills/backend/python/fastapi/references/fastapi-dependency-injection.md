# FastAPI Dependency Injection

## Basic Dependencies

```python
from fastapi import Depends, FastAPI, Header, HTTPException
from typing import Annotated

app = FastAPI()

async def get_current_user(authorization: Annotated[str | None, Header()] = None):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    token = authorization.replace("Bearer ", "")
    user = await verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    return user

CurrentUser = Annotated[User, Depends(get_current_user)]

@app.get("/users/me")
async def read_current_user(user: CurrentUser):
    return user

@app.get("/users/{user_id}")
async def read_user(user_id: str, user: CurrentUser):
    if user.id != user_id and "admin" not in user.roles:
        raise HTTPException(status_code=403)
    return await get_user(user_id)
```

## Database Sessions

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

DbSession = Annotated[AsyncSession, Depends(get_db)]

@app.get("/items")
async def get_items(db: DbSession):
    result = await db.execute(select(Item))
    return result.scalars().all()
```

## Service Layer

```python
from abc import ABC, abstractmethod

class UserRepository(ABC):
    @abstractmethod
    async def find_by_id(self, user_id: str) -> User | None:
        pass

    @abstractmethod
    async def save(self, user: User) -> User:
        pass

class PostgresUserRepository(UserRepository):
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_by_id(self, user_id: str) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def save(self, user: User) -> User:
        self.db.add(user)
        await self.db.flush()
        return user

class UserService:
    def __init__(self, repo: UserRepository):
        self.repo = repo

    async def get_user(self, user_id: str) -> User:
        user = await self.repo.find_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404)
        return user

    async def create_user(self, data: CreateUserDto) -> User:
        existing = await self.repo.find_by_email(data.email)
        if existing:
            raise HTTPException(status_code=409, detail="Email exists")
        return await self.repo.save(User(**data.model_dump()))

def get_user_service(db: DbSession) -> UserService:
    repo = PostgresUserRepository(db)
    return UserService(repo)

UserServiceDep = Annotated[UserService, Depends(get_user_service)]

@app.get("/users/{user_id}")
async def get_user(user_id: str, service: UserServiceDep):
    return await service.get_user(user_id)
```

## Key Points

- Use Annotated with Depends for type-safe dependency injection
- Implement database sessions as context manager dependencies
- Use abstract repositories for testable service layers
- Compose dependencies through constructor injection
- Use dependency scoping (request, session, global)
- Handle errors with HTTPException in dependencies
- Use sub-dependencies for complex injection chains
- Cache expensive dependency results with @lru_cache
- Use dependencies for authentication and authorization
- Test dependencies with dependency overrides
- Use yield for cleanup in dependency lifecycle
- Use Header, Query, Path for request data extraction
