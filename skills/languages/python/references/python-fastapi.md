# FastAPI Web Framework Guide

## Project Setup

```toml
# pyproject.toml
[project]
name = "my-api"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.110",
    "uvicorn[standard]>=0.29",
    "sqlalchemy>=2.0",
    "asyncpg>=0.29",
    "alembic>=1.13",
    "pydantic>=2.5",
    "pydantic-settings>=2.1",
    "httpx>=0.27",
    "python-jose[cryptography]>=3.3",
]
```

## Application Structure

```
app/
├── __init__.py
├── main.py                  # FastAPI app creation
├── config.py                # Settings
├── database.py              # DB engine + session
├── models/                  # SQLAlchemy models
│   ├── __init__.py
│   ├── user.py
│   └── order.py
├── schemas/                 # Pydantic schemas
│   ├── __init__.py
│   ├── user.py
│   └── order.py
├── api/                     # Route handlers
│   ├── __init__.py
│   ├── router.py            # Main router
│   ├── users.py
│   └── orders.py
├── services/                # Business logic
│   ├── __init__.py
│   ├── user_service.py
│   └── order_service.py
├── dependencies.py          # Dependency injection
├── middleware.py             # Custom middleware
├── exceptions.py             # Custom exceptions
└── tasks.py                  # Background tasks
```

## Configuration with Pydantic Settings

```python
# app/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    app_name: str = "My API"
    debug: bool = False

    database_url: str
    redis_url: str = "redis://localhost:6379"

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    cors_origins: list[str] = ["*"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

## FastAPI Application Factory

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import engine, create_tables
from app.api.router import api_router
from app.exceptions import setup_exception_handlers

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    settings = get_settings()
    await create_tables()
    yield
    # Shutdown
    await engine.dispose()

def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        lifespan=lifespan,
    )

    # Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routes
    app.include_router(api_router, prefix="/api/v1")

    # Exception handlers
    setup_exception_handlers(app)

    return app

app = create_app()
```

## Database with Async SQLAlchemy

```python
# app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

class Base(DeclarativeBase):
    pass

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_session() -> AsyncSession:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

## Models & Schemas

```python
# app/models/order.py
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    SHIPPED = "shipped"
    CANCELLED = "cancelled"

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total = Column(Float, nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)

    customer = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")

# app/schemas/order.py
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0, le=100)

class OrderCreate(BaseModel):
    customer_id: int
    items: list[OrderItemCreate] = Field(min_length=1)

class OrderRead(BaseModel):
    id: int
    customer_id: int
    total: float
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

## Route Handlers

```python
# app/api/orders.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_session
from app.schemas.order import OrderCreate, OrderRead
from app.services.order_service import OrderService
from app.dependencies import get_current_user
from typing import Annotated

router = APIRouter(prefix="/orders", tags=["orders"])

@router.get("/{order_id}", response_model=OrderRead)
async def get_order(
    order_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    service = OrderService(session)
    order = await service.get_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: OrderCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    service = OrderService(session)
    return await service.create(data)
```

## Dependency Injection

```python
# app/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.config import get_settings

security = HTTPBearer()

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> dict:
    settings = get_settings()
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        return {"id": int(user_id), **payload}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
```

## Error Handling

```python
# app/exceptions.py
from fastapi import Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

class AppException(Exception):
    def __init__(self, message: str, code: str, status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code

def setup_exception_handlers(app):
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                }
            },
        )

    @app.exception_handler(ValidationError)
    async def validation_exception_handler(request: Request, exc: ValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Invalid request data",
                    "details": exc.errors(),
                }
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "internal_error",
                    "message": "An unexpected error occurred",
                }
            },
        )
```
