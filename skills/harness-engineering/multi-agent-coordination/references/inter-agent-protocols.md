# Inter-Agent Communication Protocols Reference Guide

## Overview

Inter-agent protocols define how agents exchange information, coordinate actions, and
maintain consistent state across a multi-agent system. This guide covers message schemas,
request/response patterns, publish/subscribe messaging, event broadcasting, protocol
buffers for agents, and the Agent2Agent (A2A) protocol specification.

---

## 1. Message Schema Standards

### Universal Agent Message Format

Every inter-agent message must conform to a standard envelope schema that ensures
routing, traceability, and compatibility.

```
┌───────────────────────────────────────────────────────────────┐
│                     MESSAGE ENVELOPE                          │
├──────────────┬────────────────────────────────────────────────┤
│ Header       │ message_id, correlation_id, causation_id      │
│              │ source_agent, target_agent, timestamp          │
│              │ message_type, priority, ttl                    │
├──────────────┼────────────────────────────────────────────────┤
│ Metadata     │ content_type, encoding, schema_version        │
│              │ retry_count, trace_id, span_id                │
├──────────────┼────────────────────────────────────────────────┤
│ Payload      │ Typed content specific to message_type        │
├──────────────┼────────────────────────────────────────────────┤
│ Signature    │ Optional HMAC or JWT for authentication       │
└──────────────┴────────────────────────────────────────────────┘
```

### JSON Schema Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AgentMessage",
  "type": "object",
  "required": ["header", "payload"],
  "properties": {
    "header": {
      "type": "object",
      "required": ["message_id", "source_agent", "target_agent", "message_type", "timestamp"],
      "properties": {
        "message_id": {
          "type": "string",
          "format": "uuid",
          "description": "Unique identifier for this message"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid",
          "description": "Groups related messages in a conversation"
        },
        "causation_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the message that caused this message"
        },
        "source_agent": {
          "type": "string",
          "description": "Identifier of the sending agent"
        },
        "target_agent": {
          "type": "string",
          "description": "Identifier of the receiving agent (or '*' for broadcast)"
        },
        "message_type": {
          "type": "string",
          "enum": [
            "task_request",
            "task_response",
            "task_status",
            "event_notification",
            "heartbeat",
            "discovery_request",
            "discovery_response",
            "state_sync",
            "error"
          ]
        },
        "timestamp": {
          "type": "string",
          "format": "date-time"
        },
        "priority": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9,
          "default": 5
        },
        "ttl_seconds": {
          "type": "integer",
          "minimum": 0,
          "description": "Time-to-live in seconds; 0 means no expiry"
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "content_type": {
          "type": "string",
          "default": "application/json"
        },
        "schema_version": {
          "type": "string",
          "default": "1.0.0"
        },
        "retry_count": {
          "type": "integer",
          "default": 0
        },
        "trace_id": {
          "type": "string",
          "format": "uuid"
        },
        "span_id": {
          "type": "string"
        }
      }
    },
    "payload": {
      "type": "object",
      "description": "Message-type-specific content"
    },
    "signature": {
      "type": "string",
      "description": "Optional HMAC-SHA256 or JWT signature"
    }
  }
}
```

### Python Message Models

```python
import uuid
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from enum import Enum
from datetime import datetime, timezone


class MessageType(Enum):
    TASK_REQUEST = "task_request"
    TASK_RESPONSE = "task_response"
    TASK_STATUS = "task_status"
    EVENT_NOTIFICATION = "event_notification"
    HEARTBEAT = "heartbeat"
    DISCOVERY_REQUEST = "discovery_request"
    DISCOVERY_RESPONSE = "discovery_response"
    STATE_SYNC = "state_sync"
    ERROR = "error"


class MessagePriority(Enum):
    LOWEST = 0
    LOW = 2
    NORMAL = 5
    HIGH = 7
    CRITICAL = 9


@dataclass
class MessageHeader:
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    correlation_id: Optional[str] = None
    causation_id: Optional[str] = None
    source_agent: str = ""
    target_agent: str = ""
    message_type: MessageType = MessageType.TASK_REQUEST
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    priority: int = MessagePriority.NORMAL.value
    ttl_seconds: int = 0


@dataclass
class MessageMetadata:
    content_type: str = "application/json"
    schema_version: str = "1.0.0"
    retry_count: int = 0
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    span_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])


@dataclass
class AgentMessage:
    header: MessageHeader
    payload: Dict[str, Any]
    metadata: MessageMetadata = field(default_factory=MessageMetadata)
    signature: Optional[str] = None

    @staticmethod
    def create_request(
        source: str,
        target: str,
        payload: Dict[str, Any],
        priority: MessagePriority = MessagePriority.NORMAL,
        correlation_id: Optional[str] = None,
    ) -> "AgentMessage":
        return AgentMessage(
            header=MessageHeader(
                source_agent=source,
                target_agent=target,
                message_type=MessageType.TASK_REQUEST,
                priority=priority.value,
                correlation_id=correlation_id or str(uuid.uuid4()),
            ),
            payload=payload,
        )

    @staticmethod
    def create_response(
        request: "AgentMessage",
        source: str,
        payload: Dict[str, Any],
    ) -> "AgentMessage":
        return AgentMessage(
            header=MessageHeader(
                source_agent=source,
                target_agent=request.header.source_agent,
                message_type=MessageType.TASK_RESPONSE,
                correlation_id=request.header.correlation_id,
                causation_id=request.header.message_id,
                priority=request.header.priority,
            ),
            payload=payload,
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "header": {
                "message_id": self.header.message_id,
                "correlation_id": self.header.correlation_id,
                "causation_id": self.header.causation_id,
                "source_agent": self.header.source_agent,
                "target_agent": self.header.target_agent,
                "message_type": self.header.message_type.value,
                "timestamp": self.header.timestamp,
                "priority": self.header.priority,
                "ttl_seconds": self.header.ttl_seconds,
            },
            "metadata": {
                "content_type": self.metadata.content_type,
                "schema_version": self.metadata.schema_version,
                "retry_count": self.metadata.retry_count,
                "trace_id": self.metadata.trace_id,
                "span_id": self.metadata.span_id,
            },
            "payload": self.payload,
            "signature": self.signature,
        }
```

---

## 2. Request/Response Pattern

### Synchronous Request/Response

The most common inter-agent communication pattern. An agent sends a request and
waits for a response within a timeout window.

```
  Agent A                          Agent B
    │                                │
    │──── TaskRequest ──────────────►│
    │     (correlation_id: abc-123)  │
    │                                │
    │     [Agent B processes task]   │
    │                                │
    │◄─── TaskResponse ─────────────│
    │     (correlation_id: abc-123)  │
    │     (causation_id: req-msg-id) │
    │                                │
```

### Python Implementation

```python
import asyncio
from typing import Callable


class RequestResponseChannel:
    """Bidirectional request/response communication channel."""

    def __init__(self, agent_id: str, timeout: float = 30.0):
        self.agent_id = agent_id
        self._timeout = timeout
        self._pending_responses: Dict[str, asyncio.Future] = {}
        self._handlers: Dict[str, Callable] = {}
        self._outbox: asyncio.Queue = asyncio.Queue()

    def register_handler(self, message_type: str, handler: Callable) -> None:
        """Register a handler for incoming messages of a specific type."""
        self._handlers[message_type] = handler

    async def send_request(
        self,
        target: str,
        payload: Dict[str, Any],
        timeout: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Send a request and wait for the response."""
        message = AgentMessage.create_request(
            source=self.agent_id,
            target=target,
            payload=payload,
        )
        correlation_id = message.header.correlation_id

        # Create a future for the response
        future: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending_responses[correlation_id] = future

        # Send the message
        await self._outbox.put(message)

        try:
            response = await asyncio.wait_for(
                future,
                timeout=timeout or self._timeout,
            )
            return response.payload
        except asyncio.TimeoutError:
            raise TimeoutError(
                f"No response from {target} within {timeout or self._timeout}s"
            )
        finally:
            self._pending_responses.pop(correlation_id, None)

    async def handle_incoming(self, message: AgentMessage) -> None:
        """Process an incoming message."""
        msg_type = message.header.message_type

        # Check if this is a response to a pending request
        if msg_type == MessageType.TASK_RESPONSE:
            corr_id = message.header.correlation_id
            if corr_id in self._pending_responses:
                self._pending_responses[corr_id].set_result(message)
                return

        # Otherwise, dispatch to the registered handler
        handler = self._handlers.get(msg_type.value)
        if handler:
            response_payload = await handler(message)
            if response_payload is not None:
                response = AgentMessage.create_response(
                    request=message,
                    source=self.agent_id,
                    payload=response_payload,
                )
                await self._outbox.put(response)


class RequestResponseWithRetry:
    """Request/response with automatic retry and exponential backoff."""

    def __init__(
        self,
        channel: RequestResponseChannel,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 30.0,
    ):
        self._channel = channel
        self._max_retries = max_retries
        self._base_delay = base_delay
        self._max_delay = max_delay

    async def send_with_retry(
        self, target: str, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send a request with exponential backoff retry."""
        last_error = None
        for attempt in range(self._max_retries + 1):
            try:
                return await self._channel.send_request(target, payload)
            except (TimeoutError, ConnectionError) as e:
                last_error = e
                if attempt < self._max_retries:
                    delay = min(
                        self._base_delay * (2 ** attempt),
                        self._max_delay,
                    )
                    await asyncio.sleep(delay)
        raise last_error
```

---

## 3. Publish/Subscribe Messaging

### Topic-Based Pub/Sub System

```
  Publisher A ──► Topic: "task.created"  ──► Subscriber X
  Publisher B ──► Topic: "task.completed"──► Subscriber Y
  Publisher A ──► Topic: "agent.health"  ──► Subscriber X
                                            Subscriber Z
```

### Python Implementation

```python
import asyncio
import re
from collections import defaultdict
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Pattern, Set


@dataclass
class Subscription:
    subscriber_id: str
    topic_pattern: str
    handler: Callable
    filter_fn: Optional[Callable] = None
    is_regex: bool = False
    _compiled: Optional[Pattern] = None

    def matches(self, topic: str) -> bool:
        """Check if a topic matches this subscription pattern."""
        if self.is_regex:
            if self._compiled is None:
                self._compiled = re.compile(self.topic_pattern)
            return bool(self._compiled.match(topic))
        # Support wildcard patterns: "task.*", "agent.#"
        pattern = self.topic_pattern.replace(".", r"\.").replace("*", r"[^.]+").replace("#", r".*")
        return bool(re.match(f"^{pattern}$", topic))


class PubSubBroker:
    """In-process publish/subscribe message broker for agent communication."""

    def __init__(self, max_queue_size: int = 10000):
        self._subscriptions: Dict[str, List[Subscription]] = defaultdict(list)
        self._all_subscriptions: List[Subscription] = []
        self._message_queue: asyncio.Queue = asyncio.Queue(maxsize=max_queue_size)
        self._running = False
        self._dead_letter_queue: List[AgentMessage] = []
        self._metrics = {
            "messages_published": 0,
            "messages_delivered": 0,
            "messages_dropped": 0,
        }

    def subscribe(
        self,
        subscriber_id: str,
        topic_pattern: str,
        handler: Callable,
        filter_fn: Optional[Callable] = None,
    ) -> str:
        """Subscribe to a topic pattern."""
        sub = Subscription(
            subscriber_id=subscriber_id,
            topic_pattern=topic_pattern,
            handler=handler,
            filter_fn=filter_fn,
            is_regex="*" in topic_pattern or "#" in topic_pattern,
        )
        self._subscriptions[topic_pattern].append(sub)
        self._all_subscriptions.append(sub)
        return f"{subscriber_id}:{topic_pattern}"

    def unsubscribe(self, subscriber_id: str, topic_pattern: str) -> None:
        """Unsubscribe from a topic pattern."""
        self._subscriptions[topic_pattern] = [
            s for s in self._subscriptions[topic_pattern]
            if s.subscriber_id != subscriber_id
        ]
        self._all_subscriptions = [
            s for s in self._all_subscriptions
            if not (s.subscriber_id == subscriber_id and s.topic_pattern == topic_pattern)
        ]

    async def publish(self, topic: str, message: AgentMessage) -> int:
        """Publish a message to a topic. Returns number of deliveries."""
        self._metrics["messages_published"] += 1
        matching_subs = [s for s in self._all_subscriptions if s.matches(topic)]

        if not matching_subs:
            self._dead_letter_queue.append(message)
            self._metrics["messages_dropped"] += 1
            return 0

        delivery_count = 0
        tasks = []
        for sub in matching_subs:
            if sub.filter_fn and not sub.filter_fn(message):
                continue
            tasks.append(asyncio.create_task(self._deliver(sub, message)))
            delivery_count += 1

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self._metrics["messages_delivered"] += delivery_count
        return delivery_count

    async def _deliver(self, sub: Subscription, message: AgentMessage) -> None:
        """Deliver a message to a subscriber."""
        try:
            await sub.handler(message)
        except Exception as e:
            logger.error(
                f"Delivery failed to {sub.subscriber_id} for topic "
                f"{sub.topic_pattern}: {e}"
            )

    def get_metrics(self) -> Dict[str, Any]:
        return dict(self._metrics)


# Usage example
async def example_pubsub():
    broker = PubSubBroker()

    async def on_task_created(msg: AgentMessage):
        print(f"Task created: {msg.payload}")

    async def on_any_task_event(msg: AgentMessage):
        print(f"Task event: {msg.header.message_type}")

    broker.subscribe("worker-1", "task.created", on_task_created)
    broker.subscribe("monitor", "task.*", on_any_task_event)

    msg = AgentMessage.create_request("supervisor", "*", {"task_id": "t-1"})
    await broker.publish("task.created", msg)
```

---

## 4. Event Broadcasting

### Broadcast Patterns

```
Broadcast Types:
─────────────────

1. Fan-Out Broadcast:    One sender → All receivers
2. Multicast:           One sender → Specific group of receivers
3. Anycast:             One sender → One receiver (best match)
4. Conditional Broadcast: One sender → Receivers matching criteria
```

### Python Implementation

```python
class BroadcastChannel:
    """Multi-pattern broadcast channel for agent communication."""

    def __init__(self):
        self._agents: Dict[str, Callable] = {}
        self._groups: Dict[str, Set[str]] = defaultdict(set)

    def register_agent(self, agent_id: str, handler: Callable) -> None:
        self._agents[agent_id] = handler

    def join_group(self, agent_id: str, group: str) -> None:
        self._groups[group].add(agent_id)

    def leave_group(self, agent_id: str, group: str) -> None:
        self._groups[group].discard(agent_id)

    async def fan_out(
        self, sender: str, message: AgentMessage, exclude_sender: bool = True
    ) -> Dict[str, Any]:
        """Broadcast to ALL registered agents."""
        targets = {
            aid: handler for aid, handler in self._agents.items()
            if not (exclude_sender and aid == sender)
        }
        return await self._send_to_all(targets, message)

    async def multicast(
        self, sender: str, group: str, message: AgentMessage
    ) -> Dict[str, Any]:
        """Send to all agents in a specific group."""
        member_ids = self._groups.get(group, set())
        targets = {
            aid: self._agents[aid]
            for aid in member_ids
            if aid in self._agents and aid != sender
        }
        return await self._send_to_all(targets, message)

    async def anycast(
        self, sender: str, group: str, message: AgentMessage
    ) -> Optional[Any]:
        """Send to one agent in the group (round-robin or random)."""
        import random
        member_ids = self._groups.get(group, set()) - {sender}
        if not member_ids:
            return None
        target_id = random.choice(list(member_ids))
        handler = self._agents.get(target_id)
        if handler:
            return await handler(message)
        return None

    async def conditional_broadcast(
        self,
        sender: str,
        message: AgentMessage,
        condition: Callable[[str], bool],
    ) -> Dict[str, Any]:
        """Broadcast only to agents matching a condition."""
        targets = {
            aid: handler for aid, handler in self._agents.items()
            if aid != sender and condition(aid)
        }
        return await self._send_to_all(targets, message)

    async def _send_to_all(
        self, targets: Dict[str, Callable], message: AgentMessage
    ) -> Dict[str, Any]:
        """Send message to all target agents and collect results."""
        results = {}
        tasks = {}
        for aid, handler in targets.items():
            tasks[aid] = asyncio.create_task(handler(message))

        for aid, task in tasks.items():
            try:
                results[aid] = await task
            except Exception as e:
                results[aid] = {"error": str(e)}
        return results
```

---

## 5. Protocol Buffers for Agents

### Proto3 Schema Definition

```protobuf
syntax = "proto3";

package agent.protocol;

import "google/protobuf/timestamp.proto";
import "google/protobuf/any.proto";
import "google/protobuf/struct.proto";

// ─── Core Message Types ───────────────────────────

message AgentMessageProto {
  MessageHeader header = 1;
  MessageMetadata metadata = 2;
  google.protobuf.Struct payload = 3;
  bytes signature = 4;
}

message MessageHeader {
  string message_id = 1;
  string correlation_id = 2;
  string causation_id = 3;
  string source_agent = 4;
  string target_agent = 5;
  MessageType message_type = 6;
  google.protobuf.Timestamp timestamp = 7;
  int32 priority = 8;
  int32 ttl_seconds = 9;
}

message MessageMetadata {
  string content_type = 1;
  string schema_version = 2;
  int32 retry_count = 3;
  string trace_id = 4;
  string span_id = 5;
}

enum MessageType {
  MESSAGE_TYPE_UNSPECIFIED = 0;
  TASK_REQUEST = 1;
  TASK_RESPONSE = 2;
  TASK_STATUS = 3;
  EVENT_NOTIFICATION = 4;
  HEARTBEAT = 5;
  DISCOVERY_REQUEST = 6;
  DISCOVERY_RESPONSE = 7;
  STATE_SYNC = 8;
  ERROR = 9;
}

// ─── Task Messages ────────────────────────────────

message TaskRequest {
  string task_id = 1;
  string task_type = 2;
  google.protobuf.Struct parameters = 3;
  int32 priority = 4;
  repeated string dependencies = 5;
  int32 timeout_seconds = 6;
  int32 max_retries = 7;
}

message TaskResponse {
  string task_id = 1;
  TaskStatus status = 2;
  google.protobuf.Struct result = 3;
  string error_message = 4;
  int64 execution_time_ms = 5;
}

enum TaskStatus {
  TASK_STATUS_UNSPECIFIED = 0;
  PENDING = 1;
  IN_PROGRESS = 2;
  COMPLETED = 3;
  FAILED = 4;
  CANCELLED = 5;
}

// ─── Discovery Messages ──────────────────────────

message DiscoveryRequest {
  string requesting_agent = 1;
  repeated string required_capabilities = 2;
  int32 min_capacity = 3;
}

message DiscoveryResponse {
  repeated AgentInfo available_agents = 1;
}

message AgentInfo {
  string agent_id = 1;
  repeated string capabilities = 2;
  int32 current_load = 3;
  int32 max_capacity = 4;
  float reliability_score = 5;
  AgentStatus status = 6;
}

enum AgentStatus {
  AGENT_STATUS_UNSPECIFIED = 0;
  ACTIVE = 1;
  BUSY = 2;
  DRAINING = 3;
  OFFLINE = 4;
}

// ─── Agent Service Definition ─────────────────────

service AgentService {
  rpc SendTask (TaskRequest) returns (TaskResponse);
  rpc StreamTasks (stream TaskRequest) returns (stream TaskResponse);
  rpc Discover (DiscoveryRequest) returns (DiscoveryResponse);
  rpc Heartbeat (HeartbeatRequest) returns (HeartbeatResponse);
}

message HeartbeatRequest {
  string agent_id = 1;
  AgentStatus status = 2;
  int32 current_load = 3;
}

message HeartbeatResponse {
  bool acknowledged = 1;
  repeated string pending_tasks = 2;
}
```

---

## 6. Agent2Agent (A2A) Protocol

### A2A Protocol Overview

The Agent2Agent protocol (inspired by Google's A2A specification) provides a
standardized way for heterogeneous agents to discover and communicate with each other.

```
A2A Communication Flow:
───────────────────────

1. Agent Card Discovery
   Client ──GET /.well-known/agent.json──► Server Agent
   Client ◄── AgentCard response ──────── Server Agent

2. Task Submission
   Client ──POST /tasks/send──────────► Server Agent
   Client ◄── Task object ────────────── Server Agent

3. Task Status Polling
   Client ──GET /tasks/{id}────────────► Server Agent
   Client ◄── Task status + artifacts ── Server Agent

4. Streaming (SSE)
   Client ──POST /tasks/sendSubscribe──► Server Agent
   Client ◄── SSE stream ─────────────── Server Agent
```

### Agent Card Schema

```json
{
  "name": "CodeReviewAgent",
  "description": "Specialized agent for automated code review",
  "url": "https://agents.example.com/code-review",
  "version": "1.0.0",
  "capabilities": {
    "streaming": true,
    "pushNotifications": false,
    "stateTransitionHistory": true
  },
  "authentication": {
    "schemes": ["bearer"],
    "credentials": null
  },
  "defaultInputModes": ["text/plain", "application/json"],
  "defaultOutputModes": ["text/plain", "application/json"],
  "skills": [
    {
      "id": "code-review",
      "name": "Code Review",
      "description": "Reviews code for bugs, style, and best practices",
      "tags": ["code", "review", "quality"],
      "examples": [
        "Review this Python function for potential issues",
        "Check this code for security vulnerabilities"
      ]
    },
    {
      "id": "refactor-suggestion",
      "name": "Refactoring Suggestions",
      "description": "Suggests code refactoring improvements",
      "tags": ["code", "refactor", "improvement"]
    }
  ]
}
```

### Python A2A Client Implementation

```python
import aiohttp
import json
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Dict, List, Optional


@dataclass
class A2AAgentCard:
    name: str
    description: str
    url: str
    version: str
    capabilities: Dict[str, bool]
    skills: List[Dict[str, Any]]
    authentication: Dict[str, Any] = field(default_factory=dict)
    default_input_modes: List[str] = field(
        default_factory=lambda: ["text/plain"]
    )
    default_output_modes: List[str] = field(
        default_factory=lambda: ["text/plain"]
    )


@dataclass
class A2ATask:
    id: str
    status: str  # submitted, working, input-required, completed, failed, canceled
    artifacts: List[Dict[str, Any]] = field(default_factory=list)
    history: List[Dict[str, Any]] = field(default_factory=list)


class A2AClient:
    """Client for the Agent2Agent protocol."""

    def __init__(self, base_url: str, auth_token: Optional[str] = None):
        self._base_url = base_url.rstrip("/")
        self._auth_token = auth_token
        self._session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        headers = {}
        if self._auth_token:
            headers["Authorization"] = f"Bearer {self._auth_token}"
        self._session = aiohttp.ClientSession(headers=headers)
        return self

    async def __aexit__(self, *args):
        if self._session:
            await self._session.close()

    async def discover(self) -> A2AAgentCard:
        """Discover agent capabilities via the agent card."""
        async with self._session.get(
            f"{self._base_url}/.well-known/agent.json"
        ) as resp:
            data = await resp.json()
            return A2AAgentCard(
                name=data["name"],
                description=data["description"],
                url=data["url"],
                version=data["version"],
                capabilities=data.get("capabilities", {}),
                skills=data.get("skills", []),
                authentication=data.get("authentication", {}),
            )

    async def send_task(
        self,
        message: str,
        skill_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> A2ATask:
        """Send a task to the agent."""
        payload = {
            "jsonrpc": "2.0",
            "method": "tasks/send",
            "params": {
                "id": str(uuid.uuid4()),
                "message": {
                    "role": "user",
                    "parts": [{"type": "text", "text": message}],
                },
            },
        }
        if session_id:
            payload["params"]["sessionId"] = session_id
        if skill_id:
            payload["params"]["metadata"] = {"skillId": skill_id}

        async with self._session.post(
            f"{self._base_url}/tasks/send", json=payload
        ) as resp:
            data = await resp.json()
            result = data.get("result", {})
            return A2ATask(
                id=result.get("id", ""),
                status=result.get("status", {}).get("state", "unknown"),
                artifacts=result.get("artifacts", []),
                history=result.get("history", []),
            )

    async def get_task(self, task_id: str) -> A2ATask:
        """Get the status of a previously submitted task."""
        payload = {
            "jsonrpc": "2.0",
            "method": "tasks/get",
            "params": {"id": task_id},
        }
        async with self._session.post(
            f"{self._base_url}/tasks/get", json=payload
        ) as resp:
            data = await resp.json()
            result = data.get("result", {})
            return A2ATask(
                id=result.get("id", ""),
                status=result.get("status", {}).get("state", "unknown"),
                artifacts=result.get("artifacts", []),
            )

    async def send_subscribe(
        self, message: str
    ) -> AsyncIterator[Dict[str, Any]]:
        """Send a task and subscribe to streaming updates via SSE."""
        payload = {
            "jsonrpc": "2.0",
            "method": "tasks/sendSubscribe",
            "params": {
                "id": str(uuid.uuid4()),
                "message": {
                    "role": "user",
                    "parts": [{"type": "text", "text": message}],
                },
            },
        }
        async with self._session.post(
            f"{self._base_url}/tasks/sendSubscribe",
            json=payload,
        ) as resp:
            async for line in resp.content:
                line = line.decode("utf-8").strip()
                if line.startswith("data:"):
                    data = json.loads(line[5:].strip())
                    yield data
```

### TypeScript A2A Server Implementation

```typescript
import express, { Request, Response } from "express";

interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities: Record<string, boolean>;
  skills: Array<{
    id: string;
    name: string;
    description: string;
    tags: string[];
  }>;
}

interface A2ATaskMessage {
  role: "user" | "agent";
  parts: Array<{ type: string; text?: string; data?: unknown }>;
}

interface A2ATaskState {
  id: string;
  sessionId?: string;
  status: {
    state: "submitted" | "working" | "input-required" | "completed" | "failed";
    message?: A2ATaskMessage;
  };
  artifacts: Array<{
    name: string;
    parts: Array<{ type: string; text?: string }>;
  }>;
  history: A2ATaskMessage[];
}

class A2AServer {
  private app = express();
  private tasks = new Map<string, A2ATaskState>();
  private agentCard: AgentCard;
  private taskHandler: (message: string) => Promise<string>;

  constructor(agentCard: AgentCard, handler: (msg: string) => Promise<string>) {
    this.agentCard = agentCard;
    this.taskHandler = handler;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    // Agent card discovery
    this.app.get("/.well-known/agent.json", (_req: Request, res: Response) => {
      res.json(this.agentCard);
    });

    // Task submission
    this.app.post("/tasks/send", async (req: Request, res: Response) => {
      const { params } = req.body;
      const taskId = params.id;
      const messageText = params.message.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("\n");

      const task: A2ATaskState = {
        id: taskId,
        status: { state: "working" },
        artifacts: [],
        history: [params.message],
      };
      this.tasks.set(taskId, task);

      try {
        const result = await this.taskHandler(messageText);
        task.status = {
          state: "completed",
          message: {
            role: "agent",
            parts: [{ type: "text", text: result }],
          },
        };
        task.artifacts.push({
          name: "response",
          parts: [{ type: "text", text: result }],
        });
      } catch (err: any) {
        task.status = {
          state: "failed",
          message: {
            role: "agent",
            parts: [{ type: "text", text: err.message }],
          },
        };
      }

      res.json({ jsonrpc: "2.0", result: task });
    });

    // Task status
    this.app.post("/tasks/get", (req: Request, res: Response) => {
      const { params } = req.body;
      const task = this.tasks.get(params.id);
      if (!task) {
        res.json({
          jsonrpc: "2.0",
          error: { code: -32001, message: "Task not found" },
        });
        return;
      }
      res.json({ jsonrpc: "2.0", result: task });
    });
  }

  listen(port: number): void {
    this.app.listen(port, () => {
      console.log(`A2A agent listening on port ${port}`);
    });
  }
}
```

---

## 7. Message Serialization Comparison

| Format          | Size    | Speed    | Schema | Human-Readable | Best For          |
|-----------------|---------|----------|--------|----------------|-------------------|
| JSON            | Large   | Medium   | Optional| Yes           | Development/debug |
| MessagePack     | Medium  | Fast     | No     | No             | High throughput   |
| Protocol Buffers| Small   | Fastest  | Required| No            | Production gRPC   |
| CBOR            | Small   | Fast     | Optional| No            | IoT/constrained   |
| Avro            | Small   | Fast     | Required| No            | Schema evolution   |

---

## 8. Communication Anti-Patterns

| Anti-Pattern | Description | Fix |
|---|---|---|
| Fire-and-Forget | Sending messages without confirmation | Use ack/nack or request/response |
| Message Explosion | Broadcasting everything to everyone | Use targeted routing and topics |
| Schema Drift | Changing message formats without versioning | Implement schema versioning |
| Tight Coupling | Agents depending on internal message structure | Use envelope pattern with typed payloads |
| Missing Correlation | No way to track related messages | Always include correlation_id |
| Unbounded Queues | No limit on pending messages per agent | Implement backpressure and queue limits |

---

## Cross-References

- Orchestration patterns: `orchestrator-patterns.md`
- Supervisor hierarchies: `supervisor-worker-hierarchies.md`
- Task decomposition: `dag-task-decomposition.md`
- Shared state: `state-sharing-mechanisms.md`
- Failure handling: `failure-rate-mitigation.md`
- Role design: `role-specialization-patterns.md`
- Consensus: `consensus-coordination.md`
