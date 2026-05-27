# FastAPI WebSocket and Real-Time Patterns

## WebSocket Setup

### Basic WebSocket
```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

app = FastAPI()

html = """
<!DOCTYPE html>
<html>
<head>
    <title>Chat</title>
</head>
<body>
    <h1>WebSocket Chat</h1>
    <form action="" onsubmit="sendMessage(event)">
        <input type="text" id="messageText" autocomplete="off"/>
        <button>Send</button>
    </form>
    <ul id="messages"></ul>
    <script>
        var ws = new WebSocket("ws://localhost:8000/ws");
        ws.onmessage = function(event) {
            var messages = document.getElementById("messages");
            var message = document.createElement("li");
            message.textContent = event.data;
            messages.appendChild(message);
        };
        function sendMessage(event) {
            var input = document.getElementById("messageText");
            ws.send(input.value);
            input.value = "";
            event.preventDefault();
        }
    </script>
</body>
</html>
"""

@app.get("/")
async def get():
    return HTMLResponse(html)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        print("Client disconnected")
```

## Connection Manager

### Room-Based Manager
```python
from fastapi import WebSocket
from typing import Dict, Set
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room: str):
        await websocket.accept()
        if room not in self.active_connections:
            self.active_connections[room] = set()
        self.active_connections[room].add(websocket)

    def disconnect(self, websocket: WebSocket, room: str):
        if room in self.active_connections:
            self.active_connections[room].discard(websocket)
            if not self.active_connections[room]:
                del self.active_connections[room]

    async def broadcast_to_room(self, room: str, message: dict):
        if room not in self.active_connections:
            return
        dead = set()
        for connection in self.active_connections[room]:
            try:
                await connection.send_json(message)
            except WebSocketDisconnect:
                dead.add(connection)
        for d in dead:
            self.active_connections[room].discard(d)

    async def broadcast_to_all(self, message: dict):
        for room in list(self.active_connections.keys()):
            await self.broadcast_to_room(room, message)

    @property
    def room_count(self) -> int:
        return len(self.active_connections)

    def connection_count(self, room: str) -> int:
        return len(self.active_connections.get(room, set()))


manager = ConnectionManager()


@app.websocket("/ws/chat/{room}")
async def chat_websocket(websocket: WebSocket, room: str, username: str = "anonymous"):
    await manager.connect(websocket, room)
    try:
        await manager.broadcast_to_room(room, {
            "type": "system",
            "message": f"{username} joined the room",
        })
        while True:
            data = await websocket.receive_json()
            data["username"] = username
            data["type"] = "message"
            await manager.broadcast_to_room(room, data)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)
        await manager.broadcast_to_room(room, {
            "type": "system",
            "message": f"{username} left the room",
        })
```

## Authentication

### Token-Based Auth
```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query

app = FastAPI()

async def get_current_user_from_token(token: str = Query(...)):
    user = await verify_token(token)
    if not user:
        raise ValueError("Invalid token")
    return user

@app.websocket("/ws/protected")
async def protected_websocket(
    websocket: WebSocket,
    user: dict = Depends(get_current_user_from_token),
):
    await websocket.accept()
    await websocket.send_json({
        "type": "authenticated",
        "user_id": user["id"],
        "role": user["role"],
    })
    try:
        while True:
            data = await websocket.receive_json()
            data["user_id"] = user["id"]
            await process_message(user, data)
    except WebSocketDisconnect:
        print(f"User {user['id']} disconnected")
```

## Server-Sent Events (SSE)

### SSE Endpoint
```python
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
import asyncio
import json

app = FastAPI()

async def event_generator(request: Request):
    while True:
        if await request.is_disconnected():
            break
        yield f"data: {json.dumps({'time': __import__('datetime').datetime.now().isoformat()})}\n\n"
        await asyncio.sleep(1)

@app.get("/events")
async def sse_endpoint(request: Request):
    return StreamingResponse(
        event_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

# Client-side
# const eventSource = new EventSource('/events');
# eventSource.onmessage = (event) => {
#     const data = JSON.parse(event.data);
#     console.log(data.time);
# };
```

## Background Tasks with WebSocket

### Task Progress via WebSocket
```python
from fastapi import FastAPI, WebSocket, BackgroundTasks
import asyncio

app = FastAPI()
task_progress: dict[str, WebSocket] = {}

@app.websocket("/ws/task/{task_id}")
async def task_websocket(websocket: WebSocket, task_id: str):
    await websocket.accept()
    task_progress[task_id] = websocket
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        task_progress.pop(task_id, None)


async def long_running_task(task_id: str, total_steps: int):
    ws = task_progress.get(task_id)
    for i in range(total_steps):
        await asyncio.sleep(1)
        progress = int((i + 1) / total_steps * 100)
        if ws:
            try:
                await ws.send_json({
                    "type": "progress",
                    "task_id": task_id,
                    "progress": progress,
                    "current_step": i + 1,
                    "total_steps": total_steps,
                })
            except Exception:
                break

@app.post("/start-task")
async def start_task(background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    background_tasks.add_task(long_running_task, task_id, 10)
    return {"task_id": task_id}
```

## Real-Time Notifications

### Notification System
```python
from pydantic import BaseModel
from enum import Enum

class NotificationType(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"

class Notification(BaseModel):
    type: NotificationType
    title: str
    message: str
    timestamp: str = None
    action_url: str = None

class NotificationService:
    def __init__(self, manager: ConnectionManager):
        self.manager = manager

    async def notify_user(self, user_id: str, notification: Notification):
        await self.manager.broadcast_to_room(
            f"user:{user_id}",
            notification.model_dump(),
        )

    async def notify_team(self, team_id: str, notification: Notification):
        await self.manager.broadcast_to_room(
            f"team:{team_id}",
            notification.model_dump(),
        )

    async def broadcast_admin(self, notification: Notification):
        await self.manager.broadcast_to_room(
            "admins",
            notification.model_dump(),
        )
```

## Heartbeat / Keep-Alive

### Ping-Pong
```python
@app.websocket("/ws")
async def websocket_with_heartbeat(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(), timeout=30
                )
                if data == "ping":
                    await websocket.send_text("pong")
                else:
                    await process_message(data)
            except asyncio.TimeoutError:
                await websocket.send_text("ping")
                try:
                    pong = await asyncio.wait_for(
                        websocket.receive_text(), timeout=5
                    )
                    if pong != "pong":
                        break
                except asyncio.TimeoutError:
                    break
    except WebSocketDisconnect:
        pass
```

## Key Points
- FastAPI WebSocket handler supports accept, receive, send, and disconnect lifecycle
- Connection manager tracks per-room WebSocket connections for broadcasting
- Token-based authentication validates WebSocket connections on accept
- SSE provides unidirectional real-time events over HTTP
- Background tasks can push progress updates via WebSocket
- Notification service broadcasts typed notifications to rooms
- Heartbeat/ping-pong detects and cleans up stale connections
- JSON messaging enables structured data exchange over WebSocket
- WebSocket disconnect cleanup prevents memory leaks
