# Advanced Python Patterns

## Async/Await Advanced Patterns

### asyncio.gather vs TaskGroup
```python
import asyncio

# Python 3.11+ — Structured concurrency
async def process_all():
    async with asyncio.TaskGroup() as tg:
        task1 = tg.create_task(fetch_user(1))
        task2 = tg.create_task(fetch_orders(1))
        task3 = tg.create_task(fetch_recommendations(1))
    # All tasks complete here
    # If any task raised, exception propagates
    return task1.result(), task2.result(), task3.result()

# Pre-3.11 — asyncio.gather
async def process_all_gather():
    results = await asyncio.gather(
        fetch_user(1),
        fetch_orders(1),
        fetch_recommendations(1),
        return_exceptions=True,
    )
    user, orders, recs = results
    return user, orders, recs
```

### Async Context Managers
```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def database_session():
    session = await create_session()
    try:
        yield session
    finally:
        await session.close()

# Usage
async with database_session() as session:
    result = await session.execute(query)
```

### Asynchronous Iterators
```python
class AsyncPaginatedAPI:
    def __init__(self, base_url: str, page_size: int = 100):
        self.base_url = base_url
        self.page_size = page_size

    def __aiter__(self):
        self._page = 0
        self._has_more = True
        return self

    async def __anext__(self) -> dict:
        if not self._has_more:
            raise StopAsyncIteration
        self._page += 1
        data = await self._fetch_page(self._page)
        self._has_more = len(data) == self.page_size
        return data

    async def _fetch_page(self, page: int) -> list[dict]:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}?page={page}")
            return response.json()

# Usage
async for page in AsyncPaginatedAPI("https://api.example.com/users"):
    process_page(page)
```

## Dependency Injection Patterns

### Without Framework
```python
from dataclasses import dataclass
from collections.abc import Callable
from typing import Protocol

class Repository(Protocol):
    async def find_by_id(self, id: int) -> dict | None: ...

class DatabaseRepository:
    def __init__(self, session_factory: Callable):
        self._session_factory = session_factory

    async def find_by_id(self, id: int) -> dict | None:
        async with self._session_factory() as session:
            return await session.execute(select(Model).where(Model.id == id))

@dataclass
class UserService:
    repository: Repository
    cache: "CacheService | None" = None

    async def get_user(self, user_id: int) -> User | None:
        if self.cache:
            cached = await self.cache.get(f"user:{user_id}")
            if cached:
                return User(**cached)
        data = await self.repository.find_by_id(user_id)
        return User(**data) if data else None

# Wiring
def create_app():
    session_factory = async_sessionmaker(engine)
    repo = DatabaseRepository(session_factory)
    cache = RedisCache()
    service = UserService(repository=repo, cache=cache)
    return service
```

## Metaclasses & Descriptors

### Descriptor for Validation
```python
from typing import Any

class PositiveNumber:
    def __set_name__(self, owner: type, name: str) -> None:
        self._name = name

    def __get__(self, obj: Any, objtype: type | None = None):
        return obj.__dict__.get(self._name)

    def __set__(self, obj: Any, value: float) -> None:
        if value <= 0:
            raise ValueError(f"{self._name} must be positive, got {value}")
        obj.__dict__[self._name] = value

class Order:
    quantity = PositiveNumber()
    price = PositiveNumber()

    def __init__(self, quantity: float, price: float) -> None:
        self.quantity = quantity
        self.price = price
```

### Metaclass for Singleton Registry
```python
class RegistryMeta(type):
    _registry: dict[str, type] = {}

    def __new__(mcs, name: str, bases: tuple[type, ...], namespace: dict):
        cls = super().__new__(mcs, name, bases, namespace)
        if name != "BaseHandler":
            mcs._registry[name.lower()] = cls
        return cls

    @classmethod
    def get_handler(mcs, name: str) -> type:
        return mcs._registry[name]

class BaseHandler(metaclass=RegistryMeta):
    async def handle(self, event: dict) -> None:
        raise NotImplementedError

class OrderCreatedHandler(BaseHandler):
    async def handle(self, event: dict) -> None:
        print(f"Order created: {event['order_id']}")

# Usage
handler = RegistryMeta.get_handler("ordercreatedhandler")
await handler().handle(event)
```

## Caching Patterns

### functools.lru_cache
```python
from functools import lru_cache

@lru_cache(maxsize=128)
def expensive_computation(n: int) -> int:
    return n ** n

# Clear cache
expensive_computation.cache_clear()

# Check stats
hits, misses, maxsize, currsize = expensive_computation.cache_info()
```

### Custom Cache with TTL
```python
import time
from collections import OrderedDict

class TTLCache:
    def __init__(self, ttl_seconds: int = 300, maxsize: int = 1000):
        self._ttl = ttl_seconds
        self._maxsize = maxsize
        self._cache: OrderedDict[str, tuple[float, Any]] = OrderedDict()

    def get(self, key: str) -> Any | None:
        if key not in self._cache:
            return None
        expires, value = self._cache[key]
        if time.monotonic() > expires:
            del self._cache[key]
            return None
        self._cache.move_to_end(key)
        return value

    def set(self, key: str, value: Any) -> None:
        self._cache[key] = (time.monotonic() + self._ttl, value)
        self._cache.move_to_end(key)
        if len(self._cache) > self._maxsize:
            self._cache.popitem(last=False)

cache = TTLCache(ttl_seconds=60)
```

## Protocol & Structural Subtyping

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class JSONSerializable(Protocol):
    def to_json(self) -> str: ...

class User:
    def to_json(self) -> str:
        return f'{{"id": {self.id}, "name": "{self.name}"}}'

def serialize(obj: JSONSerializable) -> str:
    return obj.to_json()

# Works without explicit inheritance
user = User(id=1, name="Alice")
serialize(user)  # OK — User satisfies JSONSerializable protocol
isinstance(user, JSONSerializable)  # True (with @runtime_checkable)
```

## Performance Optimization

### Profiling
```python
# cProfile
python -m cProfile -o profile.stats my_script.py
python -m pstats profile.stats

# py-spy (sampling profiler, no code changes)
# py-spy record -o profile.svg -- python my_script.py

# Perf with context manager
from contextlib import contextmanager
import time

@contextmanager
def timed(name: str):
    start = time.perf_counter()
    yield
    elapsed = time.perf_counter() - start
    print(f"{name}: {elapsed*1000:.1f}ms")
```

### Memory Optimization
```python
# __slots__ for many instances
class Point:
    __slots__ = ("x", "y")  # No __dict__ overhead

    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

# array for numeric data
from array import array
numbers = array("d", [1.0, 2.0, 3.0])  # Double precision, compact

# __pypackage__ for hot paths (Rust with PyO3)
# Implemented in Rust, called from Python via maturin-built package
```
