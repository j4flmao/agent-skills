# FastAPI Project Structure

```
src/
├── main.py
├── config.py
├── domain/
│   ├── __init__.py
│   ├── entities/
│   │   ├── __init__.py
│   │   └── order.py
│   ├── value_objects/
│   │   ├── __init__.py
│   │   └── money.py
│   ├── repositories/
│   │   ├── __init__.py
│   │   └── order_repository.py  (ABC)
│   └── services/
│       ├── __init__.py
│       └── order_service.py
├── application/
│   ├── __init__.py
│   ├── use_cases/
│   │   ├── __init__.py
│   │   └── place_order.py
│   └── dto/
│       ├── __init__.py
│       └── place_order.py
├── infrastructure/
│   ├── __init__.py
│   ├── persistence/
│   │   ├── __init__.py
│   │   ├── database.py
│   │   └── postgres_order_repo.py
│   ├── auth/
│   │   ├── __init__.py
│   │   └── jwt.py
│   └── messaging/
│       ├── __init__.py
│       └── rabbitmq.py
├── api/
│   ├── __init__.py
│   ├── deps.py
│   ├── routes/
│   │   ├── __init__.py
│   │   └── orders.py
│   └── middleware.py
└── tests/
    ├── __init__.py
    ├── unit/
    └── integration/
```

## FastAPI App
```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from src.api.routes import orders
from src.infrastructure.persistence.database import dispose_db, init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await dispose_db()

app = FastAPI(title="Order Service", version="1.0.0", lifespan=lifespan)
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
```
