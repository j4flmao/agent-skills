# Custom Component Development

## Creating Custom Runnables

### Full Runnable Implementation

```python
from langchain_core.runnables import Runnable
from langchain_core.runnables.config import RunnableConfig
from typing import Any, Iterator, AsyncIterator, Optional

class RateLimitedRunnable(Runnable[str, str]):
    """Wraps any runnable with rate limiting."""

    def __init__(self, runnable: Runnable, max_per_minute: int = 30):
        self.runnable = runnable
        self.max_per_minute = max_per_minute
        self.call_timestamps: list[float] = []

    def _check_rate_limit(self):
        import time
        now = time.time()
        window_start = now - 60
        self.call_timestamps = [t for t in self.call_timestamps if t > window_start]
        if len(self.call_timestamps) >= self.max_per_minute:
            sleep_time = self.call_timestamps[0] - window_start
            if sleep_time > 0:
                time.sleep(sleep_time)
        self.call_timestamps.append(now)

    def invoke(self, input: str, config: RunnableConfig | None = None) -> str:
        self._check_rate_limit()
        return self.runnable.invoke(input, config)

    async def ainvoke(self, input: str, config: RunnableConfig | None = None) -> str:
        self._check_rate_limit()
        return await self.runnable.ainvoke(input, config)

    def batch(self, inputs: list, config: RunnableConfig | None = None) -> list:
        results = []
        for inp in inputs:
            self._check_rate_limit()
            results.append(self.runnable.invoke(inp, config))
        return results

    def stream(self, input: str, config: RunnableConfig | None = None) -> Iterator[str]:
        self._check_rate_limit()
        yield from self.runnable.stream(input, config)

    async def astream(self, input: str, config: RunnableConfig | None = None) -> AsyncIterator[str]:
        self._check_rate_limit()
        async for chunk in self.runnable.astream(input, config):
            yield chunk

# Usage
rate_limited = RateLimitedRunnable(llm, max_per_minute=50)
```

### Streaming-Only Runnable

```python
class TokenBufferRunnable(Runnable[str, str]):
    """Buffers tokens and yields groups for reduced overhead."""

    def __init__(self, runnable: Runnable, buffer_size: int = 5):
        self.runnable = runnable
        self.buffer_size = buffer_size

    def invoke(self, input: str, config: RunnableConfig | None = None) -> str:
        return self.runnable.invoke(input, config)

    def stream(self, input: str, config: RunnableConfig | None = None) -> Iterator[str]:
        buffer = ""
        for chunk in self.runnable.stream(input, config):
            buffer += chunk
            if len(buffer) >= self.buffer_size:
                yield buffer
                buffer = ""
        if buffer:
            yield buffer

    async def astream(self, input: str, config: RunnableConfig | None = None) -> AsyncIterator[str]:
        buffer = ""
        async for chunk in self.runnable.astream(input, config):
            buffer += chunk
            if len(buffer) >= self.buffer_size:
                yield buffer
                buffer = ""
        if buffer:
            yield buffer

# Chain with custom streaming
buffered_llm = TokenBufferRunnable(llm, buffer_size=10)
chain = prompt | buffered_llm | parser
```

---

## Custom Callback Handlers

```python
from langchain.callbacks.base import BaseCallbackHandler
from typing import Any, Dict, Optional
from uuid import UUID

class MetricsCallback(BaseCallbackHandler):
    """Collects detailed metrics per chain run."""

    def __init__(self):
        self.runs: dict[str, dict] = {}

    def on_chain_start(self, serialized: Dict[str, Any], inputs: Dict[str, Any],
                       run_id: UUID, **kwargs: Any) -> Any:
        self.runs[str(run_id)] = {
            "type": "chain",
            "name": serialized.get("name", "unknown"),
            "start_time": __import__("time").time(),
            "inputs": {k: str(v)[:100] for k, v in inputs.items()},
        }

    def on_llm_start(self, serialized: Dict[str, Any], prompts: list[str],
                     run_id: UUID, **kwargs: Any) -> Any:
        self.runs[str(run_id)] = {
            "type": "llm",
            "model": serialized.get("kwargs", {}).get("model_name", "unknown"),
            "start_time": __import__("time").time(),
            "prompt_length": sum(len(p) for p in prompts),
        }

    def on_llm_end(self, response, run_id: UUID, **kwargs: Any) -> Any:
        if rid := self.runs.get(str(run_id)):
            rid["end_time"] = __import__("time").time()
            rid["duration_ms"] = (rid["end_time"] - rid["start_time"]) * 1000
            usage = response.llm_output.get("token_usage", {}) if response.llm_output else {}
            rid["input_tokens"] = usage.get("prompt_tokens", 0)
            rid["output_tokens"] = usage.get("completion_tokens", 0)

    def on_tool_start(self, serialized: Dict[str, Any], input_str: str,
                      run_id: UUID, **kwargs: Any) -> Any:
        self.runs[str(run_id)] = {
            "type": "tool",
            "name": serialized.get("name", "unknown"),
            "start_time": __import__("time").time(),
            "input": input_str[:200],
        }

    def on_tool_end(self, output: str, run_id: UUID, **kwargs: Any) -> Any:
        if rid := self.runs.get(str(run_id)):
            rid["end_time"] = __import__("time").time()
            rid["duration_ms"] = (rid["end_time"] - rid["start_time"]) * 1000
            rid["output_length"] = len(output)

    def get_report(self) -> dict:
        total_cost = 0
        model_calls = {}
        for rid, data in self.runs.items():
            if data["type"] == "llm":
                model = data["model"]
                model_calls.setdefault(model, {"calls": 0, "input_tokens": 0,
                                                "output_tokens": 0, "duration_ms": []})
                model_calls[model]["calls"] += 1
                model_calls[model]["input_tokens"] += data.get("input_tokens", 0)
                model_calls[model]["output_tokens"] += data.get("output_tokens", 0)
                model_calls[model]["duration_ms"].append(data.get("duration_ms", 0))
        duration_list = [d.get("duration_ms", 0) for d in self.runs.values() if "duration_ms" in d]
        return {
            "model_calls": model_calls,
            "total_runs": len(self.runs),
            "total_duration_ms": sum(duration_list),
            "p50_duration_ms": sorted(duration_list)[len(duration_list) // 2] if duration_list else 0,
        }

    def clear(self):
        self.runs.clear()
```

---

## Custom Memory Backend

```python
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage, message_to_dict, messages_from_dict
from typing import list

class MongoDBChatMessageHistory(BaseChatMessageHistory):
    """Persistent chat history using MongoDB."""

    def __init__(
        self,
        session_id: str,
        connection_string: str = "mongodb://localhost:27017",
        database: str = "langchain",
        collection: str = "chat_history",
    ):
        from pymongo import MongoClient
        self.session_id = session_id
        self.client = MongoClient(connection_string)
        self.db = self.client[database]
        self.collection = self.db[collection]
        self._messages = self._load_messages()

    def _load_messages(self) -> list[BaseMessage]:
        doc = self.collection.find_one({"session_id": self.session_id})
        if doc and "messages" in doc:
            return messages_from_dict(doc["messages"])
        return []

    def _save_messages(self):
        data = {
            "session_id": self.session_id,
            "messages": messages_to_dict(self._messages),
            "updated_at": __import__("time").time(),
        }
        self.collection.update_one(
            {"session_id": self.session_id},
            {"$set": data},
            upsert=True,
        )

    @property
    def messages(self) -> list[BaseMessage]:
        return self._messages

    def add_message(self, message: BaseMessage) -> None:
        self._messages.append(message)
        self._save_messages()

    def add_messages(self, messages: list[BaseMessage]) -> None:
        self._messages.extend(messages)
        self._save_messages()

    def clear(self) -> None:
        self._messages = []
        self.collection.delete_one({"session_id": self.session_id})

    async def aadd_message(self, message: BaseMessage) -> None:
        self._messages.append(message)
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(self.client.address)
        db = client.get_database(self.db.name)
        coll = db[self.collection.name]
        await coll.update_one(
            {"session_id": self.session_id},
            {"$set": {"messages": messages_to_dict(self._messages),
                       "updated_at": __import__("time").time()}},
            upsert=True,
        )

    async def aget_messages(self) -> list[BaseMessage]:
        return self._messages

    async def aclear(self) -> None:
        self._messages = []
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(self.client.address)
        db = client.get_database(self.db.name)
        coll = db[self.collection.name]
        await coll.delete_one({"session_id": self.session_id})
```

---

## Custom Document Transformer

```python
from langchain_core.document_transformers import BaseDocumentTransformer
from langchain_core.documents import Document

class CodeSanitizer(BaseDocumentTransformer):
    """Removes sensitive patterns from code documents."""

    def __init__(self, patterns: list[str] = None):
        self.patterns = patterns or [
            r'(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*["\'][^"\']+["\']',
            r'-----BEGIN (RSA |EC )?PRIVATE KEY-----.*?-----END (RSA |EC )?PRIVATE KEY-----',
            r'AWS[A-Z0-9]{20}',
        ]

    def transform_documents(
        self, documents: list[Document], **kwargs: Any
    ) -> list[Document]:
        import re
        transformed = []
        for doc in documents:
            cleaned = doc.page_content
            for pattern in self.patterns:
                cleaned = re.sub(pattern, "[REDACTED]", cleaned)
            transformed.append(Document(page_content=cleaned, metadata=doc.metadata))
        return transformed

    async def atransform_documents(
        self, documents: list[Document], **kwargs: Any
    ) -> list[Document]:
        return self.transform_documents(documents, **kwargs)

# Usage in pipeline
sanitizer = CodeSanitizer()
chain = loader | splitter | sanitizer | embeddings
```

---

## Custom Retriever

```python
from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document
from typing import list

class TimeWeightedRetriever(BaseRetriever):
    """Retrieves documents with recency boost."""

    def __init__(self, base_retriever: BaseRetriever, decay_days: float = 7.0):
        super().__init__()
        self.base_retriever = base_retriever
        self.decay_days = decay_days

    def _get_relevant_documents(self, query: str) -> list[Document]:
        import time
        docs = self.base_retriever.invoke(query)
        now = time.time()
        for doc in docs:
            ts = doc.metadata.get("timestamp", 0)
            age_days = (now - ts) / 86400 if ts else 0
            recency = 1.0 / (1.0 + age_days / self.decay_days)
            original_score = doc.metadata.get("score", 1.0)
            doc.metadata["combined_score"] = original_score * 0.7 + recency * 0.3
        # Sort by combined score
        docs.sort(key=lambda d: d.metadata.get("combined_score", 0), reverse=True)
        return docs

    async def _aget_relevant_documents(self, query: str) -> list[Document]:
        import time
        docs = await self.base_retriever.ainvoke(query)
        now = time.time()
        for doc in docs:
            ts = doc.metadata.get("timestamp", 0)
            age_days = (now - ts) / 86400 if ts else 0
            recency = 1.0 / (1.0 + age_days / self.decay_days)
            original_score = doc.metadata.get("score", 1.0)
            doc.metadata["combined_score"] = original_score * 0.7 + recency * 0.3
        docs.sort(key=lambda d: d.metadata.get("combined_score", 0), reverse=True)
        return docs

# Usage
time_weighted = TimeWeightedRetriever(
    base_retriever=vectorstore.as_retriever(),
    decay_days=30,
)
```

---

## Custom Agent Toolkit

```python
from langchain.agents import Tool
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

class SlackToolkit:
    """Toolkit for Slack operations."""

    def __init__(self, bot_token: str):
        self.token = bot_token
        self.tools = self._create_tools()

    def _create_tools(self) -> list[BaseTool]:
        return [
            self._post_message_tool(),
            self._read_channel_tool(),
            self._search_messages_tool(),
        ]

    def _post_message_tool(self) -> BaseTool:
        class PostMessageInput(BaseModel):
            channel: str = Field(description="Channel ID or name")
            text: str = Field(description="Message text")

        def post_message(channel: str, text: str) -> str:
            from slack_sdk import WebClient
            client = WebClient(token=self.token)
            resp = client.chat_postMessage(channel=channel, text=text)
            return f"Message sent: {resp['ts']}"

        return Tool(
            name="slack_post_message",
            description="Post a message to a Slack channel. Use for announcements.",
            args_schema=PostMessageInput,
            func=post_message,
        )

    def _read_channel_tool(self) -> BaseTool:
        class ReadChannelInput(BaseModel):
            channel: str = Field(description="Channel ID")
            limit: int = Field(default=10, ge=1, le=100)

        def read_channel(channel: str, limit: int = 10) -> str:
            from slack_sdk import WebClient
            client = WebClient(token=self.token)
            resp = client.conversations_history(channel=channel, limit=limit)
            msgs = [f"{m['user']}: {m['text']}" for m in resp['messages']]
            return "\n".join(msgs) if msgs else "No messages"

        return Tool(
            name="slack_read_channel",
            description="Read recent messages from a Slack channel.",
            args_schema=ReadChannelInput,
            func=read_channel,
        )

    def _search_messages_tool(self) -> BaseTool:
        class SearchInput(BaseModel):
            query: str = Field(description="Search query")

        def search(query: str) -> str:
            from slack_sdk import WebClient
            client = WebClient(token=self.token)
            resp = client.search_messages(query=query)
            msgs = resp.get('messages', {}).get('matches', [])
            return "\n".join(f"{m['channel']['name']}: {m['text'][:200]}"
                           for m in msgs[:5]) or "No results"

        return Tool(
            name="slack_search",
            description="Search Slack messages. Use for finding past conversations.",
            args_schema=SearchInput,
            func=search,
        )
```

---

## Custom Retry Strategy

```python
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)
import logging
import openai
import httpx

class RetryStrategy:
    """Factory for common retry configurations."""

    @staticmethod
    def llm_retry():
        return retry(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=1, min=1, max=30),
            retry=retry_if_exception_type((
                openai.RateLimitError,
                openai.APITimeoutError,
                openai.APIConnectionError,
                httpx.TimeoutException,
            )),
            before_sleep=before_sleep_log(logging.getLogger(__name__), logging.WARNING),
        )

    @staticmethod
    def retry_with_circuit_breaker(threshold: int = 5, cooldown: int = 30):
        """Decorator that combines retry with circuit breaker."""
        failures = 0
        last_failure = 0.0

        def decorator(func):
            @retry(
                stop=stop_after_attempt(3),
                wait=wait_exponential(min=1, max=10),
                retry=retry_if_exception_type((
                    openai.RateLimitError,
                    openai.APITimeoutError,
                )),
            )
            def wrapper(*args, **kwargs):
                nonlocal failures, last_failure
                now = __import__("time").time()
                if failures >= threshold:
                    if now - last_failure < cooldown:
                        return {"error": "circuit_breaker_open",
                                "message": "Service temporarily unavailable"}
                    failures = 0
                try:
                    result = func(*args, **kwargs)
                    failures = 0
                    return result
                except Exception as e:
                    failures += 1
                    last_failure = now
                    raise
            return wrapper
        return decorator

# Usage
@RetryStrategy.llm_retry()
def safe_llm_call(messages):
    return llm.invoke(messages)
```

---

## Key Points

- Custom Runnables must implement `invoke` and `stream` (plus async variants) for full LCEL compatibility.
- Use `RunnableLambda` for simple functions — only subclass `Runnable` when you need state or lifecycle hooks.
- Custom callback handlers should be focused on a single concern: logging, metrics, cost, or tracing.
- Memory backends need `add_message`, `messages` property, and `clear` — plus async variants for production.
- Document transformers implement `transform_documents` and `atransform_documents`.
- Custom retrievers subclass `BaseRetriever` and implement `_get_relevant_documents` / `_aget_relevant_documents`.
- Toolkits group related tools and handle shared authentication/configuration.
- Retry strategies should be composable: wrap with tenacity for transient errors, circuit breaker for sustained failures.
- Always provide async variants for production components — blocking I/O in async context is a common failure.
- Test custom components with the standard Runnable test suite: invoke, stream, batch, and their async equivalents.
