# FastAPI Advanced Patterns

## Advanced Dependencies

```python
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from typing import Annotated

# Dependency with parameters
class Pagination:
    def __init__(self, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
        self.page = page
        self.limit = limit
        self.offset = (page - 1) * limit

async def get_pagination(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> Pagination:
    return Pagination(page=page, limit=limit)

# Dependency with database session
async def get_db():
    async with async_session() as session:
        yield session

# Type-annotated dependencies
PaginationDep = Annotated[Pagination, Depends(get_pagination)]
SessionDep = Annotated[AsyncSession, Depends(get_db)]

@app.get("/orders")
async def list_orders(
    pagination: PaginationDep,
    db: SessionDep,
):
    result = await db.execute(
        select(Order).offset(pagination.offset).limit(pagination.limit)
    )
    return result.scalars().all()
```

## Advanced Lifespan

```python
from contextlib import asynccontextmanager
from typing import AsyncGenerator

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    # Startup
    app.state.redis = await aioredis.from_url("redis://localhost")
    app.state.cache = CacheClient()
    logger.info("Application started")

    yield

    # Shutdown
    await app.state.redis.close()
    await app.state.cache.close()
    logger.info("Application stopped")

app = FastAPI(lifespan=lifespan)
```

## Background Tasks

```python
from fastapi import BackgroundTasks

def send_notification(order_id: str, email: str):
    # Long-running task
    mailer.send(f"Order {order_id} confirmed", to=email)

@app.post("/orders")
async def create_order(
    order: OrderCreate,
    background_tasks: BackgroundTasks,
    db: SessionDep,
):
    db_order = await create_order_in_db(order, db)
    background_tasks.add_task(send_notification, db_order.id, order.email)
    return db_order
```

## WebSocket Handlers

```python
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, order_id: str):
        await websocket.accept()
        self.active.setdefault(order_id, []).append(websocket)

    def disconnect(self, websocket: WebSocket, order_id: str):
        self.active[order_id].remove(websocket)

    async def broadcast(self, order_id: str, message: dict):
        for connection in self.active.get(order_id, []):
            await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/orders/{order_id}")
async def websocket_endpoint(websocket: WebSocket, order_id: str):
    await manager.connect(websocket, order_id)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast(order_id, data)
    except WebSocketDisconnect:
        manager.disconnect(websocket, order_id)
```

## Middleware Stack

```python
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Custom middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response
```

## Exception Handlers

```python
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "body": exc.body,
        },
    )

@app.exception_handler(NotFoundError)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"message": str(exc)},
    )
```

## File Uploads

```python
from fastapi import UploadFile, File
import aiofiles

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    async with aiofiles.open(f"uploads/{file.filename}", "wb") as f:
        await f.write(content)
    return {"filename": file.filename, "size": len(content)}
```
