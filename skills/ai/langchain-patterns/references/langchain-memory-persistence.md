# LangChain Memory Persistence

## Overview
Memory persistence in LangChain enables agents and chains to maintain state across conversations, sessions, and restarts. The right persistence strategy depends on data volume, access patterns, and consistency requirements.

## Memory Types

### ConversationBufferMemory
```python
from langchain.memory import ConversationBufferMemory
from langchain_core.messages import HumanMessage, AIMessage

memory = ConversationBufferMemory(return_messages=True)

memory.chat_memory.add_message(HumanMessage(content="Hello"))
memory.chat_memory.add_message(AIMessage(content="Hi there!"))

# Load history
history = memory.load_memory_variables({})
print(history["history"])
# [HumanMessage(content="Hello"), AIMessage(content="Hi there!")]

# Clear
memory.clear()
```

### ConversationSummaryMemory
```python
from langchain.memory import ConversationSummaryMemory

summary_memory = ConversationSummaryMemory(
    llm=fake_llm,
    return_messages=True,
    buffer="The conversation covers general greetings and introductions.",
)

summary_memory.save_context(
    {"input": "What is machine learning?"},
    {"output": "Machine learning is a subset of AI..."}
)

# Loads summarized history
history = summary_memory.load_memory_variables({})
```

### ConversationBufferWindowMemory
```python
from langchain.memory import ConversationBufferWindowMemory

window_memory = ConversationBufferWindowMemory(
    k=5,  # Keep last 5 exchanges
    return_messages=True,
)

for i in range(10):
    window_memory.save_context(
        {"input": f"Message {i}"},
        {"output": f"Response {i}"}
    )

# Only last 5 messages retained
history = window_memory.load_memory_variables({})
assert len(history["history"]) == 10  # Each exchange is 2 messages, k=5 means 10 messages
```

### Entity Memory
```python
from langchain.memory import ConversationEntityMemory

entity_memory = ConversationEntityMemory(llm=fake_llm)
entity_memory.save_context(
    {"input": "My name is Alice and I work at Acme Corp"},
    {"output": "Nice to meet you Alice!"}
)

entities = entity_memory.load_memory_variables({})
print(entities)
```

## Persistent Storage

### Redis Backed Memory
```python
from langchain_community.chat_message_histories import RedisChatMessageHistory
from langchain.memory import ConversationBufferMemory

message_history = RedisChatMessageHistory(
    session_id="user-session-123",
    url="redis://localhost:6379/0",
    ttl=86400,  # 24 hours
)

memory = ConversationBufferMemory(
    chat_memory=message_history,
    return_messages=True,
    memory_key="chat_history",
)

# Persisted across restarts
memory.save_context({"input": "Hello"}, {"output": "Hi there!"})

# Load from Redis on next invocation
loaded = memory.load_memory_variables({})
```

### PostgreSQL Backed Memory
```python
from langchain_community.chat_message_histories import PostgresChatMessageHistory

pg_history = PostgresChatMessageHistory(
    session_id="user-456",
    connection_string="postgresql://user:pass@localhost:5432/langchain",
    table_name="message_store",
)

memory = ConversationBufferMemory(
    chat_memory=pg_history,
    return_messages=True,
)

# Automatic persistence
memory.save_context({"input": "Remember this"}, {"output": "I will!"})

# Async support
async def save_and_load():
    async with PostgresChatMessageHistory(
        session_id="user-789",
        connection_string="postgresql://user:pass@localhost:5432/langchain",
    ) as history:
        await history.aadd_message(HumanMessage(content="Async test"))
        messages = await history.aget_messages()
        return messages
```

### SQLite Backed Memory
```python
from langchain_community.chat_message_histories import SQLChatMessageHistory

sql_history = SQLChatMessageHistory(
    session_id="local-dev",
    connection_string="sqlite:///memory.db",
)

memory = ConversationBufferMemory(
    chat_memory=sql_history,
    return_messages=True,
    output_key="output",
)
```

## Custom Persistence

### Custom Storage Backend
```python
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage, message_to_dict, messages_from_dict

class S3ChatMessageHistory(BaseChatMessageHistory):
    def __init__(self, session_id: str, bucket: str, prefix: str = "chat_history/"):
        self.session_id = session_id
        self.bucket = bucket
        self.key = f"{prefix}{session_id}.json"
        self._messages = self._load()

    def _load(self) -> list[BaseMessage]:
        try:
            import boto3
            s3 = boto3.client("s3")
            response = s3.get_object(Bucket=self.bucket, Key=self.key)
            data = json.loads(response["Body"].read())
            return messages_from_dict(data)
        except Exception:
            return []

    def _save(self):
        import boto3
        s3 = boto3.client("s3")
        data = json.dumps(messages_to_dict(self._messages))
        s3.put_object(Bucket=self.bucket, Key=self.key, Body=data)

    @property
    def messages(self) -> list[BaseMessage]:
        return self._messages

    def add_message(self, message: BaseMessage) -> None:
        self._messages.append(message)
        self._save()

    def clear(self) -> None:
        self._messages = []
        self._save()
```

### Async Custom Backend
```python
import aioredis
from langchain_core.chat_history import BaseChatMessageHistory

class AsyncRedisHistory(BaseChatMessageHistory):
    def __init__(self, session_id: str, redis_url: str = "redis://localhost:6379"):
        self.session_id = session_id
        self.redis_url = redis_url
        self._messages = []

    @property
    def messages(self) -> list[BaseMessage]:
        return self._messages

    async def _get_redis(self):
        return await aioredis.from_url(self.redis_url)

    async def aload(self):
        redis = await self._get_redis()
        data = await redis.get(f"chat:{self.session_id}")
        if data:
            self._messages = messages_from_dict(json.loads(data))

    async def aadd_message(self, message: BaseMessage) -> None:
        self._messages.append(message)
        redis = await self._get_redis()
        data = json.dumps(messages_to_dict(self._messages))
        await redis.setex(f"chat:{self.session_id}", 86400, data)

    async def aclear(self) -> None:
        self._messages = []
        redis = await self._get_redis()
        await redis.delete(f"chat:{self.session_id}")
```

## Memory in Chains

```python
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory

chain = ConversationChain(
    llm=fake_llm,
    memory=ConversationBufferMemory(
        return_messages=True,
        memory_key="history",
    ),
    verbose=True,
)

response1 = chain.run("Hello, I'm Alice")
response2 = chain.run("What's my name?")  # Should remember "Alice"
```

## Memory Management

### Token Limit Management
```python
from langchain.memory import ConversationTokenBufferMemory

token_memory = ConversationTokenBufferMemory(
    llm=fake_llm,
    max_token_limit=1000,  # Trim when exceeding
    return_messages=True,
)

# Automatically trims oldest messages when token limit exceeded
token_memory.save_context({"input": "Long message..."}, {"output": "Response..."})
```

## Key Points
- BufferMemory stores all messages (unbounded, use with caution)
- SummaryMemory uses LLM to compress history (best for long conversations)
- WindowMemory keeps last N exchanges (fixed token budget)
- EntityMemory extracts and tracks named entities
- Redis: best for session-level persistence with TTL
- PostgreSQL: best for durable long-term storage
- SQLite: best for local development and single-user apps
- Custom backends can use S3, MongoDB, or any key-value store
- Async backends recommended for production I/O
- Token limit management prevents context overflow
- Session ID scoping isolates conversations
- TTL-based expiry for transient conversations
- Serialization format: LangChain messages <-> dict/JSON
