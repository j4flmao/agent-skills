# FastAPI Dependency Injection Patterns

## FastAPI Depends() Patterns

### Service Injection
```python
from fastapi import Depends, HTTPException, status

class OrderService:
    def __init__(self, repo: OrderRepository):
        self.repo = repo

    async def get_order(self, order_id: UUID) -> Order:
        order = await self.repo.find_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail='Order not found')
        return order

# Dependency factory
async def get_order_service(repo: OrderRepository = Depends(get_order_repo)) -> OrderService:
    return OrderService(repo)

# In router
@router.get('/orders/{order_id}')
async def get_order(
    order_id: UUID,
    service: OrderService = Depends(get_order_service)
):
    return await service.get_order(order_id)
```

### Request-Scoped Dependencies
```python
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    payload = decode_jwt(token)
    user = await user_repo.find_by_id(payload['sub'])
    if not user:
        raise HTTPException(status_code=401)
    return user

async def get_user_service(
    user: User = Depends(get_current_user),
    repo: OrderRepository = Depends(get_order_repo),
) -> UserService:
    return UserService(user=user, repo=repo)
```

### Override for Testing
```python
# In tests
app.dependency_overrides[get_order_service] = lambda: MockOrderService()

# Clear after test
app.dependency_overrides.clear()
```

## DI Layers

```python
# Layer 1: Application config (singleton)
async def get_settings() -> Settings:
    return Settings()

# Layer 2: Infrastructure (singleton per connection)
async def get_db_session(settings: Settings = Depends(get_settings)) -> AsyncSession:
    async with async_session_factory() as session:
        yield session

# Layer 3: Repository (request-scoped)
async def get_order_repo(session: AsyncSession = Depends(get_db_session)) -> OrderRepository:
    return SqlAlchemyOrderRepository(session)

# Layer 4: Service (request-scoped)
async def get_order_service(
    repo: OrderRepository = Depends(get_order_repo),
    bus: EventBus = Depends(get_event_bus),
) -> OrderService:
    return OrderService(repo=repo, event_bus=bus)

# Layer 5: Endpoint
@router.post('/orders')
async def create_order(
    command: CreateOrderRequest,
    service: OrderService = Depends(get_order_service),
):
    return await service.place_order(command)
```

## Lifespan Management

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    engine = create_async_engine(settings.DATABASE_URL)
    app.state.engine = engine
    yield
    # Shutdown
    await engine.dispose()
```
