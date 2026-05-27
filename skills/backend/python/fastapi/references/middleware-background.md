# Middleware, Background Tasks, and WebSockets in FastAPI

## Overview
FastAPI provides built-in support for middleware, background tasks, and WebSocket connections. These features handle cross-cutting concerns, async processing, and real-time communication.

## Middleware

### Basic Middleware
```python
from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware
import time

app = FastAPI()

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response
```

### Class-Based Middleware
```python
class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        elapsed = time.time() - start
        response.headers["X-Execution-Time"] = f"{elapsed:.3f}s"
        return response

class CORSMiddleware:
    def __init__(self, app, origins: list[str]):
        self.app = app
        self.origins = origins

    async def __call__(self, request: Request, call_next):
        if request.method == "OPTIONS":
            response = Response()
            response.headers["Access-Control-Allow-Origin"] = ", ".join(self.origins)
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            return response
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response

app.add_middleware(TimingMiddleware)
```

### Authentication Middleware
```python
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

class AuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, jwt_service):
        super().__init__(app)
        self.jwt_service = jwt_service

    async def dispatch(self, request: Request, call_next):
        if request.url.path in ["/docs", "/openapi.json", "/health"]:
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing auth token")

        token = auth_header.split(" ")[1]
        try:
            payload = self.jwt_service.verify(token)
            request.state.user = payload
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")

        return await call_next(request)
```

### Rate Limiting Middleware
```python
from collections import defaultdict
import asyncio

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        now = time.time()
        window_start = now - self.window_seconds

        self.requests[client_ip] = [
            t for t in self.requests[client_ip] if t > window_start
        ]

        if len(self.requests[client_ip]) >= self.max_requests:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")

        self.requests[client_ip].append(now)
        return await call_next(request)
```

## Background Tasks

### Single Background Task
```python
from fastapi import BackgroundTasks

def send_welcome_email(email: str, user_name: str):
    import smtplib
    with smtplib.SMTP("smtp.example.com") as server:
        server.sendmail(
            "noreply@example.com",
            email,
            f"Welcome {user_name}!".encode(),
        )

@app.post("/users/")
async def create_user(user: UserCreate, background_tasks: BackgroundTasks):
    db_user = await user_service.create(user)
    background_tasks.add_task(send_welcome_email, user.email, user.name)
    return db_user
```

### Multiple Background Tasks
```python
@app.post("/orders/")
async def create_order(order: OrderCreate, background_tasks: BackgroundTasks):
    db_order = await order_service.create(order)

    background_tasks.add_task(
        notification_service.send_confirmation,
        db_order.id,
        db_order.user_email,
    )
    background_tasks.add_task(
        analytics_service.track_order,
        db_order.id,
        db_order.total,
    )
    background_tasks.add_task(
        inventory_service.reserve_items,
        db_order.items,
    )

    return db_order
```

### Background Task as Dependency
```python
from fastapi import Depends

async def get_background_tasks():
    return BackgroundTasks()

@app.post("/reports/")
async def generate_report(
    report_type: str,
    background_tasks: BackgroundTasks = Depends(get_background_tasks),
):
    task_id = str(uuid4())
    background_tasks.add_task(
        report_generator.generate,
        task_id,
        report_type,
    )
    return {"task_id": task_id, "status": "processing"}
```

### Error Handling in Background Tasks
```python
import logging
from functools import wraps

def handle_background_errors(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            logging.error(f"Background task failed: {e}", exc_info=True)
            # Send to error tracking
            await error_tracker.capture(e)
    return wrapper

class OrderService:
    @handle_background_errors
    async def process_refund(self, order_id: str):
        order = await self.get_order(order_id)
        await payment_gateway.refund(order.transaction_id)
        await self.notify_customer(order.user_email, "Refund processed")
```

## WebSockets

### Basic WebSocket
```python
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        print("Client disconnected")
```

### WebSocket Connection Manager
```python
from typing import Dict, Set

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        self.active_connections[user_id].discard(websocket)
        if not self.active_connections[user_id]:
            del self.active_connections[user_id]

    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            for ws in self.active_connections[user_id]:
                await ws.send_json(message)

    async def broadcast(self, message: dict):
        for connections in self.active_connections.values():
            for ws in connections:
                await ws.send_json(message)

    async def broadcast_to_room(self, room: str, message: dict):
        for user_id in self.active_connections:
            for ws in self.active_connections[user_id]:
                if ws in self.rooms.get(room, set()):
                    await ws.send_json(message)

manager = ConnectionManager()
```

### Authenticated WebSocket
```python
@app.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    token = websocket.headers.get("authorization", "").replace("Bearer ", "")
    if not token:
        await websocket.close(code=4001)
        return

    try:
        user = await verify_token(token)
    except Exception:
        await websocket.close(code=4001)
        return

    await manager.connect(user.id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data["type"] == "message":
                await manager.send_to_user(
                    data["target_user_id"],
                    {"type": "message", "from": user.id, "content": data["content"]},
                )
            elif data["type"] == "typing":
                await manager.send_to_user(
                    data["target_user_id"],
                    {"type": "typing", "from": user.id},
                )
    except WebSocketDisconnect:
        manager.disconnect(user.id, websocket)
```

## Lifespan Events

### Startup and Shutdown
```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.db = await create_database_pool()
    app.state.cache = await create_cache_connection()
    app.state.queue = await create_queue_connection()
    yield
    # Shutdown
    await app.state.db.close()
    await app.state.cache.close()
    await app.state.queue.close()

app = FastAPI(lifespan=lifespan)
```

### Startup Event (Legacy)
```python
@app.on_event("startup")
async def startup():
    app.state.db = await database.connect()
    app.state.redis = await redis.connect()

@app.on_event("shutdown")
async def shutdown():
    await app.state.db.disconnect()
    await app.state.redis.close()
```

## Exception Handling

### Custom Exception Handler
```python
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message": exc.detail,
                "status_code": exc.status_code,
            }
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request data",
                "details": exc.errors(),
            }
        },
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
            }
        },
    )
```

## Middleware Ordering

### Correct Middleware Stack
```python
app.add_middleware(CORSMiddleware, origins=["*"])
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
app.add_middleware(HTTPSRedirectMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)
app.add_middleware(AuthMiddleware, jwt_service=jwt)
app.add_middleware(RateLimitMiddleware, max_requests=100)
app.add_middleware(TimingMiddleware)
```

## Key Points
- Middleware processes all requests/responses for cross-cutting concerns
- BackgroundTasks run after response is sent without blocking
- WebSocket connections use the same dependency injection system
- ConnectionManager pattern handles multiple concurrent WebSocket connections
- Lifespan context manager replaces on_event for startup/shutdown
- Exception handlers provide consistent error responses
- Background tasks should have their own error handling
- Rate limiting middleware prevents abuse at the application level
- Auth middleware protects routes while allowing public paths
- WebSocket authentication happens at connection time
