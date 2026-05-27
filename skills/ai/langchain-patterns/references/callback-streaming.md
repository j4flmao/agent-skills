# Callbacks and Streaming

## Overview

LangChain callbacks and streaming enable observability, monitoring, and real-time user interaction. This reference covers callback systems, event-based streaming, async generators, custom handlers, and production monitoring integration for LangChain applications.

## Callback System Architecture

### Base Callback Handler

```python
from langchain.callbacks.base import BaseCallbackHandler
from typing import Any, Dict, List, Optional
from uuid import UUID

class LoggingCallbackHandler(BaseCallbackHandler):
    def __init__(self):
        self.logs: List[Dict] = []

    def on_llm_start(self, serialized: Dict, prompts: List[str], **kwargs):
        self.logs.append({
            "event": "llm_start",
            "prompts": prompts[:1],
            "run_id": kwargs.get("run_id"),
        })

    def on_llm_end(self, response, **kwargs):
        self.logs.append({
            "event": "llm_end",
            "generations": len(response.generations),
            "token_usage": response.llm_output.get("token_usage", {}) if response.llm_output else {},
        })

    def on_chain_start(self, serialized: Dict, inputs: Dict, **kwargs):
        self.logs.append({
            "event": "chain_start",
            "name": serialized.get("name", "unknown"),
            "inputs": {k: str(v)[:100] for k, v in inputs.items()},
        })

    def on_chain_end(self, outputs: Dict, **kwargs):
        self.logs.append({
            "event": "chain_end",
            "output_keys": list(outputs.keys()),
        })

    def on_tool_start(self, serialized: Dict, input_str: str, **kwargs):
        self.logs.append({
            "event": "tool_start",
            "tool": serialized.get("name", "unknown"),
            "input": input_str[:200],
        })

    def on_tool_end(self, output: str, **kwargs):
        self.logs.append({
            "event": "tool_end",
            "output_length": len(output),
        })

    def on_retriever_start(self, query: str, **kwargs):
        self.logs.append({"event": "retriever_start", "query": query[:100]})

    def on_retriever_end(self, documents, **kwargs):
        self.logs.append({
            "event": "retriever_end",
            "num_docs": len(documents),
            "doc_sources": [d.metadata.get("source", "unknown") for d in documents],
        })

class TokenCountingCallback(BaseCallbackHandler):
    def __init__(self):
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.total_cost = 0.0

    def on_llm_end(self, response, **kwargs):
        usage = response.llm_output.get("token_usage", {}) if response.llm_output else {}
        self.total_input_tokens += usage.get("prompt_tokens", 0)
        self.total_output_tokens += usage.get("completion_tokens", 0)

    def get_summary(self) -> Dict:
        return {
            "input_tokens": self.total_input_tokens,
            "output_tokens": self.total_output_tokens,
            "total_tokens": self.total_input_tokens + self.total_output_tokens,
        }
```

## Streaming with Async Events

### Stream Events API

```python
from langchain_core.runnables import RunnableConfig
from typing import AsyncIterator

class StreamingChain:
    def __init__(self, chain):
        self.chain = chain

    async def stream_with_events(self, input_data: Dict) -> AsyncIterator[Dict]:
        async for event in self.chain.astream_events(
            input_data,
            version="v2",
            include_names=["retriever", "llm"],
        ):
            kind = event["event"]
            if kind == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                if hasattr(chunk, "content"):
                    yield {"type": "token", "content": chunk.content}
            elif kind == "on_retriever_end":
                docs = event["data"]["output"]
                yield {
                    "type": "sources",
                    "documents": [
                        {
                            "content": d.page_content[:200],
                            "source": d.metadata.get("source", "unknown"),
                            "score": d.metadata.get("score", 0),
                        }
                        for d in docs
                    ],
                }
            elif kind == "on_chain_end":
                yield {"type": "done", "event": "chain_complete"}

    async def stream_tokens(self, input_data: Dict) -> AsyncIterator[str]:
        async for chunk in self.chain.astream(input_data):
            if hasattr(chunk, "content"):
                yield chunk.content
            elif isinstance(chunk, str):
                yield chunk
```

### Streaming with Runnable Generator

```python
from langchain_core.runnables import RunnableGenerator
from typing import Iterator

def token_generator(input_stream: Iterator[str]) -> Iterator[str]:
    buffer = ""
    for token in input_stream:
        buffer += token
        if len(buffer) >= 5:
            yield buffer
            buffer = ""
    if buffer:
        yield buffer

def event_generator(inputs: Dict) -> Iterator[Dict]:
    yield {"event": "start", "timestamp": __import__("time").time()}
    retrieval_result = retrieve(inputs["query"])
    yield {"event": "retrieved", "sources": len(retrieval_result)}
    generation = generate_with_context(inputs["query"], retrieval_result)
    yield {"event": "result", "output": generation}
    yield {"event": "end", "timestamp": __import__("time").time()}

streaming_runnable = RunnableGenerator(event_generator)
```

## Custom Streaming Handlers

### WebSocket Stream Handler

```python
import json
import asyncio
from typing import AsyncIterator

class WebSocketStreamHandler:
    def __init__(self, websocket):
        self.websocket = websocket

    async def send_stream(self, chain, input_data: Dict):
        async for event in chain.astream_events(input_data, version="v2"):
            event_type = event["event"]
            if event_type == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                if hasattr(chunk, "content"):
                    await self.websocket.send_json({
                        "type": "token",
                        "content": chunk.content,
                    })
            elif event_type == "on_chain_end":
                await self.websocket.send_json({
                    "type": "done",
                    "output": event["data"]["output"],
                })
            elif event_type == "on_chain_error":
                await self.websocket.send_json({
                    "type": "error",
                    "message": str(event["data"]["error"]),
                })
        await self.websocket.send_json({"type": "complete"})

    async def stream_with_cancel(self, chain, input_data: Dict):
        task = asyncio.create_task(self._stream_task(chain, input_data))
        try:
            async for msg in self.websocket:
                if msg.get("type") == "cancel":
                    task.cancel()
                    break
        except asyncio.CancelledError:
            task.cancel()
        finally:
            if not task.done():
                task.cancel()

    async def _stream_task(self, chain, input_data: Dict):
        async for event in chain.astream_events(input_data, version="v2"):
            await self.websocket.send_json(event)
```

### Server-Sent Events Handler

```python
from fastapi import Response
import asyncio

class SSEHandler:
    async def generate_sse(self, chain, input_data: Dict) -> Response:
        async def event_stream():
            async for event in chain.astream_events(input_data, version="v2"):
                event_type = event["event"]
                if event_type == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    if hasattr(chunk, "content") and chunk.content:
                        yield f"data: {json.dumps({'type': 'token', 'content': chunk.content})}\n\n"
                elif event_type == "on_chain_end":
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                elif event_type == "on_chain_error":
                    yield f"data: {json.dumps({'type': 'error', 'message': str(event['data']['error'])})}\n\n"
            yield "event: complete\ndata: \n\n"
        return Response(
            content=event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
```

## LangSmith Integration

### Custom Tracer

```python
from langsmith import Client, RunTree
from langchain.callbacks.tracers import LangChainTracer

class EnhancedTracer(LangChainTracer):
    def __init__(self, project_name: str = "default"):
        self.client = Client()
        super().__init__(client=self.client, project_name=project_name)

    def on_llm_end(self, response, **kwargs):
        super().on_llm_end(response, **kwargs)
        usage = response.llm_output.get("token_usage", {}) if response.llm_output else {}
        metadata = kwargs.get("metadata", {})
        metadata["input_tokens"] = usage.get("prompt_tokens", 0)
        metadata["output_tokens"] = usage.get("completion_tokens", 0)
        run_id = kwargs.get("run_id")
        if run_id:
            self.client.update_run(
                run_id=str(run_id),
                metadata=metadata,
            )
```

## Monitoring Metrics

### Performance Tracking

```python
from contextlib import contextmanager
import time

class LatencyTracker:
    def __init__(self):
        self.records: Dict[str, List[float]] = {}

    @contextmanager
    def track(self, operation: str):
        start = time.perf_counter()
        yield
        elapsed = (time.perf_counter() - start) * 1000
        if operation not in self.records:
            self.records[operation] = []
        self.records[operation].append(elapsed)

    def p50(self, operation: str) -> float:
        ops = self.records.get(operation, [])
        if not ops:
            return 0.0
        return sorted(ops)[len(ops) // 2]

    def p99(self, operation: str) -> float:
        ops = self.records.get(operation, [])
        if not ops:
            return 0.0
        return sorted(ops)[int(len(ops) * 0.99)]

    def summary(self) -> Dict:
        return {
            op: {"p50": self.p50(op), "p99": self.p99(op), "count": len(records)}
            for op, records in self.records.items()
        }
```

## Key Points

- Use astream_events API for granular streaming with event types and metadata.
- Implement custom callback handlers for logging, token counting, and metrics.
- Use WebSocket streaming for real-time bidirectional communication.
- Use SSE for server-to-client streaming with standard HTTP protocol.
- Always include cancellation support for streaming responses.
- Track latency per component (retriever, LLM, tool) for bottleneck identification.
- Log prompt and response pairs for debugging and evaluation datasets.
- Use LangSmith tracers for production observability and trace comparison.
- Implement backpressure handling for streaming to slow clients.
- Monitor stream duration and chunk delivery rate for performance optimization.
- Store trace data with session and user IDs for cost attribution.
- Use async generators for memory-efficient streaming of large responses.
- Handle connection drops gracefully with partial result recovery.
- Version streaming event schemas for backward compatibility.
- Test streaming with slow and unreliable network conditions.
