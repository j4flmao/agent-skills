---
name: ai-langchain-patterns
description: >
  Use this skill when working with LangChain, LlamaIndex, chains, LCEL, retrievers, agents, tools, callbacks, Runnable interface, document loaders, text splitters, vector stores, memory, or LangSmith.
  This skill enforces: LCEL composition, retriever strategy selection, agent architecture, memory management, document pipeline design, streaming configuration.
  Do NOT use for: prompt engineering, fine-tuning, model evaluation, vector database operations, non-LangChain frameworks.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, langchain, framework, phase-11]
---

# LangChain Patterns Agent

## Purpose
Designs LangChain architectures with LCEL pipelines, multi-strategy retrieval, tool-calling agents, memory management, streaming, and production guardrails — production-grade LLM chains.

## Agent Protocol

### Trigger
User request includes: LangChain, LlamaIndex, chains, LCEL, retriever, agent, tool, callback, Runnable, document loader, text splitter, vector store, memory, LangSmith, deep LangChain patterns.

### Protocol
1. Clarify task type (RAG, agent, chain, tool-use) and LLM provider.
2. Select LCEL composition pattern (sequence, parallel, streaming, branching).
3. Design retriever strategy (base, multi-query, ensemble, compression, parent-document).
4. Choose agent type (tool-calling, ReAct, custom) and define tools with validated schemas.
5. Configure memory (conversation buffer, summary, window, entity, token-bounded).
6. Set up document pipeline (loaders, splitters, transformers).
7. Wire streaming and event handlers.
8. Add production guardrails: retry, circuit breaker, cost tracking, observability.

## Output
LangChain architecture with chain/retriever/agent patterns, memory strategy, streaming setup, production config.

### Response Format
```
## LangChain Architecture
### LCEL Pipeline
Type: {RunnableSequence/RunnableParallel/RunnableBranch}
Steps: [{step1}, {step2}, ...]
Streaming: {async/event handlers} | Batch Size: {N}

### Retriever
Strategy: {base/multi-query/ensemble/compression/parent-document}
Retrievers: [{type, top-K, params}]
Final Top-K: {N}

### Agent
Type: {tool-calling/ReAct/custom}
Tools: [{name, description, schema}]
Max Iterations: {N} | Max Execution Time: {seconds}
Early Stopping: {generate/error}

### Memory
Type: {conversation/summary/buffer/window/entity}
Window Size: {N turns} | Summary LLM: {model}
Entity Store: {enabled/disabled}

### Document Pipeline
Loaders: [{source, type}]
Splitter: {strategy} | Chunk Size: {tokens} | Overlap: {tokens}
Transformer: {type, params}

### Production
Retry: {strategy} | Cache: {type}
Tracing: {LangSmith project}
Cost Tracking: {enabled}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] LCEL pipeline uses RunnableSequence/RunnableParallel/RunnableBranch as appropriate.
- [ ] Retriever strategy matches data distribution and query patterns.
- [ ] Agent tools have validated schemas and error handling.
- [ ] Memory strategy bounds token consumption.
- [ ] Document pipeline handles source heterogeneity.
- [ ] Streaming is wired for production (async generators or event handlers).
- [ ] Error handling and retry logic are specified.
- [ ] LangSmith tracing is configured for observability.

---

## Decision Trees

### Chain Type Decision Tree

```
Is it a single-turn Q&A?
  ├─ With external knowledge ──► RAG chain (retriever + prompt + llm)
  ├─ No external knowledge ────► LLM chain (prompt + llm + parser)
  └─ Multiple docs ───────────► Stuff/MapReduce/Refine chain
Is it multi-turn conversation?
  ├─ With memory ──► ConversationChain + memory
  ├─ With retrieval ──► ConversationalRetrievalChain
  └─ With tools ──► Agent with memory
Is it structured output?
  ├─ JSON ──► LCEL + JsonOutputParser
  ├─ Pydantic ──► LCEL + PydanticOutputParser
  └─ Enum/category ──► RunnableBranch or RouterChain
Is it long document processing?
  ├─ Single doc ──► Stuff chain (if fits context)
  ├─ Summarize ──► MapReduce / Refine chain
  └─ Extract ──► LCEL + structured extraction
```

### Memory Type Decision Tree

```
Does the conversation need full history?
  ├─ Yes, short (< 10 turns) ──► ConversationBufferMemory
  ├─ Yes, long (10+ turns) ────► ConversationSummaryMemory
  └─ Yes, bounded budget ─────► ConversationBufferWindowMemory
Does it need entity tracking?
  ├─ Entity extraction required ──► ConversationEntityMemory
  └─ Hybrid approach ──► WindowMemory + entity extraction callback
Does it need persistence?
  ├─ Session-level ──► RedisChatMessageHistory (with TTL)
  ├─ Durable storage ───► PostgresChatMessageHistory
  ├─ Dev/local ──► SQLChatMessageHistory (SQLite)
  └─ Custom ──► Subclass BaseChatMessageHistory
Is memory shared across users/sessions?
  ├─ Shared context ──► Redis with session_id scoping
  └─ Per-user ──► Session ID isolation in all backends
```

### Retriever Type Decision Tree

```
Are queries typically well-specified?
  ├─ Yes, clear intent ──► Base retriever (dense / BM25)
  ├─ No, ambiguous ──► MultiQueryRetriever (N=3 min)
  └─ Multi-lingual ──► MultiQueryRetriever with translation variants
Do you have multiple retrieval methods?
  ├─ Dense + sparse ──► EnsembleRetriever (weighted fusion)
  └─ Use weights: semantic corpus → dense-heavy, keyword corpus → sparse-heavy
Do you need to reduce noise?
  ├─ Documents are long/noisy ──► ContextualCompressionRetriever
  ├─ LLM-based compression ──► LLMChainExtractor
  └─ Embedding-based filtering ──► EmbeddingsFilter
Do you need full document context?
  └─ Small chunks for search, big chunks for reading ──► ParentDocumentRetriever
```

---

## Decision Functions

### Chain Type Selector

```python
from typing import Literal

ChainArch = Literal["rag", "llm", "conversational", "structured",
                     "map_reduce", "refine", "stuff", "agent"]

def select_chain_architecture(
    has_knowledge_base: bool,
    is_multi_turn: bool,
    needs_structured_output: bool,
    document_count: int = 0,
    document_size_tokens: int = 0,
) -> ChainArch:
    if has_knowledge_base and not is_multi_turn:
        return "rag"
    if has_knowledge_base and is_multi_turn:
        return "agent"
    if needs_structured_output:
        return "structured"
    if is_multi_turn:
        return "conversational"
    if document_count > 1:
        return "map_reduce" if document_size_tokens > 4000 else "stuff"
    return "llm"

def select_memory_type(
    expected_turns: int,
    needs_entity_tracking: bool,
    max_token_budget: int = 4000,
) -> str:
    if needs_entity_tracking:
        return "entity"
    if expected_turns > 20 and max_token_budget < 8000:
        return "summary"
    if expected_turns > 10:
        return "window"
    return "buffer"

def select_retriever_strategy(
    ambiguity_level: float,
    has_sparse_retriever: bool,
    has_dense_retriever: bool,
    noise_tolerance: float,
) -> str:
    if ambiguity_level > 0.7:
        return "multi_query"
    if has_sparse_retriever and has_dense_retriever:
        return "ensemble"
    if noise_tolerance < 0.3:
        return "compression"
    return "base"
```

---

## Architectural Patterns

### Pattern 1: RAG Chain

```python
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_template(
    "Answer using only this context:\n{context}\n\nQuestion: {question}"
)

def format_docs(docs):
    return "\n\n".join(d.page_content for d in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)
```

### Pattern 2: Conversational RAG with History

```python
from langchain_core.messages import HumanMessage, AIMessage
from operator import itemgetter

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant. Use context if provided."),
    ("placeholder", "{chat_history}"),
    ("human", "{question}"),
])

def serialize_history(messages):
    return [HumanMessage(content=m["input"]) if m["role"] == "user"
            else AIMessage(content=m["output"])
            for m in messages]

conversational_rag = (
    RunnablePassthrough.assign(
        chat_history=lambda x: serialize_history(x.get("chat_history", [])),
        context=lambda x: format_docs(retriever.invoke(x["question"])),
    )
    | prompt
    | llm
    | StrOutputParser()
)
```

### Pattern 3: Multi-Step Reasoning Chain

```python
decomposition_prompt = ChatPromptTemplate.from_template(
    "Break this question into sub-questions:\n{question}"
)
answer_prompt = ChatPromptTemplate.from_template(
    "Context: {context}\nQuestion: {sub_q}\nAnswer:"
)
synthesis_prompt = ChatPromptTemplate.from_template(
    "Synthesize these answers into a final response:\n{answers}\n\nOriginal question: {question}"
)

def retrieve_for_each(sub_questions: str, retriever):
    questions = [q.strip() for q in sub_questions.split("\n") if q.strip()]
    contexts = [format_docs(retriever.invoke(q)) for q in questions]
    return "\n\n".join(contexts)

multi_step_chain = (
    RunnablePassthrough.assign(
        sub_questions=decomposition_prompt | llm | StrOutputParser()
    )
    .assign(context=lambda x: retrieve_for_each(x["sub_questions"], retriever))
    .assign(answers=answer_prompt | llm | StrOutputParser())
    .assign(final=synthesis_prompt | llm | StrOutputParser())
)
```

### Pattern 4: Parallel Multi-Source Retrieval

```python
from langchain_core.runnables import RunnableParallel

parallel_retrieval = RunnableParallel(
    wiki=wiki_retriever,
    docs=internal_docs_retriever,
    web=web_search_retriever,
)

def fuse_sources(sources: dict) -> str:
    parts = []
    for src, docs in sources.items():
        for d in docs:
            d.metadata["source_type"] = src
            parts.append(d)
    return format_docs(sorted(parts, key=lambda x: x.metadata.get("score", 0), reverse=True)[:10])

fused_rag = (
    {"context": parallel_retrieval | fuse_sources, "question": RunnablePassthrough()}
    | prompt | llm | StrOutputParser()
)
```

### Pattern 5: Conditional Routing (RunnableBranch)

```python
from langchain_core.runnables import RunnableBranch

tech_prompt = ChatPromptTemplate.from_template("Answer tech question: {query}")
general_prompt = ChatPromptTemplate.from_template("Answer: {query}")
code_prompt = ChatPromptTemplate.from_template("Write code for: {query}")

branch_chain = RunnableBranch(
    (lambda x: any(tag in x["query"].lower() for tag in ["python", "java", "code"]),
     code_prompt | llm | StrOutputParser()),
    (lambda x: any(tag in x["query"].lower() for tag in ["server", "api", "database"]),
     tech_prompt | llm | StrOutputParser()),
    general_prompt | llm | StrOutputParser(),
)
```

### Pattern 6: Tool-Calling Agent

```python
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate

@tool
def search_kb(query: str, top_k: int = 5) -> str:
    """Search the knowledge base. Use for factual questions."""
    results = vectorstore.similarity_search(query, k=top_k)
    return "\n\n".join(d.page_content for d in results)

@tool
def calculator(expression: str) -> str:
    """Evaluate a math expression. Use for calculations."""
    try:
        import ast, operator
        ops = {ast.Add: operator.add, ast.Sub: operator.sub,
               ast.Mult: operator.mul, ast.Div: operator.truediv}
        tree = ast.parse(expression, mode="eval")
        return str(eval(compile(tree, "", "eval")))
    except Exception as e:
        return f"Error: {e}"

tools = [search_kb, calculator]
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant with tools. Use them when needed."),
    ("placeholder", "{chat_history}"),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

agent = create_tool_calling_agent(llm, tools, prompt)
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    max_iterations=10,
    max_execution_time=30,
    early_stopping_method="generate",
    handle_parsing_errors=True,
    return_intermediate_steps=True,
)
```

### Pattern 7: Streaming with astream_events

```python
from typing import AsyncIterator

async def stream_response(chain, input_data: dict) -> AsyncIterator[dict]:
    async for event in chain.astream_events(input_data, version="v2"):
        kind = event["event"]
        if kind == "on_chat_model_stream":
            chunk = event["data"]["chunk"]
            if hasattr(chunk, "content") and chunk.content:
                yield {"type": "token", "content": chunk.content}
        elif kind == "on_retriever_end":
            docs = event["data"]["output"]
            yield {"type": "sources", "documents": [
                {"content": d.page_content[:200], "source": d.metadata.get("source", ""),
                 "score": d.metadata.get("score", 0.0)} for d in docs
            ]}
        elif kind == "on_tool_end":
            yield {"type": "tool_result", "name": event.get("name", ""),
                   "output": str(event["data"]["output"])[:200]}
        elif kind == "on_chain_end":
            yield {"type": "done"}
```

### Pattern 8: Callback for Cost Tracking

```python
from langchain.callbacks.base import BaseCallbackHandler
from collections import defaultdict

class CostTrackingHandler(BaseCallbackHandler):
    MODEL_COSTS = {
        "gpt-4o": {"input": 2.50 / 1e6, "output": 10.00 / 1e6},
        "gpt-4o-mini": {"input": 0.15 / 1e6, "output": 0.60 / 1e6},
        "claude-sonnet-4-20250514": {"input": 3.00 / 1e6, "output": 15.00 / 1e6},
        "claude-haiku-3-5-20241022": {"input": 0.80 / 1e6, "output": 4.00 / 1e6},
    }

    def __init__(self):
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.total_cost = 0.0
        self.model_name = "unknown"
        self.run_counts = defaultdict(int)

    def on_llm_start(self, serialized, prompts, **kwargs):
        self.model_name = serialized.get("kwargs", {}).get("model_name", "unknown")
        self.run_counts[self.model_name] += 1

    def on_llm_end(self, response, **kwargs):
        usage = response.llm_output.get("token_usage", {}) if response.llm_output else {}
        inp = usage.get("prompt_tokens", 0)
        out = usage.get("completion_tokens", 0)
        self.total_input_tokens += inp
        self.total_output_tokens += out
        costs = self.MODEL_COSTS.get(self.model_name, {"input": 0, "output": 0})
        self.total_cost += inp * costs["input"] + out * costs["output"]

    def get_report(self) -> dict:
        return {
            "model": self.model_name,
            "calls": self.run_counts[self.model_name],
            "input_tokens": self.total_input_tokens,
            "output_tokens": self.total_output_tokens,
            "total_tokens": self.total_input_tokens + self.total_output_tokens,
            "estimated_cost_usd": round(self.total_cost, 6),
        }
```

### Pattern 9: Production RAG with Caching and Tracing

```python
from langchain.globals import set_llm_cache
from langchain.cache import RedisCache
from langchain.callbacks.tracers import LangChainTracer
from langchain_core.runnables import RunnableConfig

set_llm_cache(RedisCache(redis_client))

tracer = LangChainTracer(project_name="my-rag-prod")

def invoke_with_observability(question: str, user_id: str) -> str:
    config = RunnableConfig(
        callbacks=[CostTrackingHandler(), tracer],
        metadata={"user_id": user_id, "env": "production"},
        tags=["rag", "production"],
    )
    return rag_chain.invoke({"question": question}, config=config)
```

---

## Production Considerations

### Error Handling Strategy

| Error Type | Detection | Recovery | Retry Strategy |
|---|---|---|---|
| RateLimitError | Exception from provider | Exponential backoff + jitter | 3 attempts, 1s-10s |
| APITimeoutError | Request timeout | Circuit breaker after 5 failures | 30s cooldown |
| ContextLengthExceeded | Token count in callback | Truncate oldest messages | Immediate retry |
| BadRequestError | Exception from provider | Validate input schema | No retry |
| ToolExecutionError | Tool raises exception | Return structured error string | No retry |

### Circuit Breaker Pattern

```python
class CircuitBreaker:
    def __init__(self, threshold: int = 5, recovery_timeout: float = 30.0):
        self.threshold = threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.last_failure = 0.0
        self.state = "closed"

    def __call__(self, func):
        async def wrapper(*args, **kwargs):
            if self.state == "open":
                if (time.time() - self.last_failure) > self.recovery_timeout:
                    self.state = "half-open"
                else:
                    return {"error": "service_unavailable",
                            "message": "Circuit breaker open. Please retry later."}
            try:
                result = await func(*args, **kwargs)
                if self.state == "half-open":
                    self.state = "closed"
                    self.failures = 0
                return result
            except Exception:
                self.failures += 1
                self.last_failure = time.time()
                if self.failures >= self.threshold:
                    self.state = "open"
                raise
        return wrapper
```

### LangSmith Trace Configuration

```python
from langsmith import Client
from langchain.callbacks.tracers import LangChainTracer
from langchain_core.tracers.context import tracing_v2_enabled

client = Client()

# Option 1: Per-call tracing
tracer = LangChainTracer(
    project_name="my-project",
    client=client,
)
result = chain.invoke(input, config={"callbacks": [tracer]})

# Option 2: Context manager
with tracing_v2_enabled(project_name="my-project"):
    result = chain.invoke(input)

# Option 3: Environment variables
# LANGCHAIN_TRACING_V2=true
# LANGCHAIN_PROJECT=my-project
# LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
```

### Cost Budget Manager

```python
class BudgetManager:
    def __init__(self, monthly_budget_usd: float):
        self.monthly_budget = monthly_budget_usd
        self.spent = 0.0
        self.daily_log: list[dict] = []

    def track(self, cost: float, operation: str):
        self.spent += cost
        self.daily_log.append({
            "timestamp": time.time(),
            "cost": cost,
            "operation": operation,
        })
        if self.spent > self.monthly_budget:
            logger.warning(f"Monthly budget ${self.monthly_budget} exceeded: ${self.spent:.2f}")
            return False
        return True

    def remaining(self) -> float:
        return max(0.0, self.monthly_budget - self.spent)

    def daily_spend(self) -> float:
        today = time.time() - 86400
        return sum(e["cost"] for e in self.daily_log if e["timestamp"] > today)
```

---

## Anti-Patterns

### Anti-Pattern 1: Over-Abstraction

```python
# BAD: Heavy inheritance for simple transformations
class QueryProcessor(BaseRunnable):
    def __init__(self, rules: list[Callable]):
        self.rules = rules
    def invoke(self, input: str, config: RunnableConfig | None = None) -> str:
        result = input
        for rule in self.rules:
            result = rule(result)
        return result

# GOOD: Direct RunnableLambda composition
chain = RunnableLambda(str.strip) | RunnableLambda(str.lower) | llm
```

### Anti-Pattern 2: Ignoring Async

```python
# BAD: Synchronous calls blocking async context
def handle_request(query: str):
    return chain.invoke(query)  # Blocks event loop

# GOOD: Async throughout
async def handle_request(query: str):
    return await chain.ainvoke(query)
```

### Anti-Pattern 3: Memory Leaks via Unbounded History

```python
# BAD: No bounds on memory
memory = ConversationBufferMemory(return_messages=True)  # Grows forever

# GOOD: Bounded memory
memory = ConversationBufferWindowMemory(k=10, return_messages=True)
# OR with token limit
from langchain.memory import ConversationTokenBufferMemory
memory = ConversationTokenBufferMemory(llm=llm, max_token_limit=4000)
```

### Anti-Pattern 4: Callback Spaghetti

```python
# BAD: Inline callbacks doing too much
chain.invoke(input, config={"callbacks": [
    handler_a, handler_b, handler_c, handler_d,
    handler_e, handler_f, handler_g,
]})

# GOOD: Composite handler
class CompositeHandler(BaseCallbackHandler):
    def __init__(self):
        self.logger = LoggingHandler()
        self.cost = CostTrackingHandler()
        self.latency = LatencyTrackingHandler()

    def on_llm_end(self, response, **kwargs):
        self.logger.on_llm_end(response, **kwargs)
        self.cost.on_llm_end(response, **kwargs)
        self.latency.on_llm_end(response, **kwargs)

chain.invoke(input, config={"callbacks": [CompositeHandler()]})
```

### Anti-Pattern 5: No Max Iterations on Agents

```python
# BAD: Agent can loop forever
executor = AgentExecutor(agent=agent, tools=tools)

# GOOD: Always bound iterations
executor = AgentExecutor(
    agent=agent, tools=tools,
    max_iterations=15, max_execution_time=30,
    early_stopping_method="generate",
)

# BAD: No return_intermediate_steps for debugging
executor = AgentExecutor(agent=agent, tools=tools, max_iterations=15)

# GOOD: Capture intermediate steps
executor = AgentExecutor(
    agent=agent, tools=tools,
    max_iterations=15,
    return_intermediate_steps=True,  # Debug agent reasoning
)
```

### Anti-Pattern 6: No Fallback Chain

```python
# BAD: Single point of failure
chain = retriever | prompt | llm | parser

# GOOD: Fallback chain for degraded mode
fallback_chain = prompt | fallback_llm | parser
chain = retriever | prompt | llm.with_fallback(fallback_llm) | parser
# Or full chain fallback
chain = primary.with_fallback(fallback)
```

### Anti-Pattern 7: Missing Input Validation

```python
# BAD: Assumes valid input
chain = prompt | llm | parser

# GOOD: Validate at entry point
from pydantic import BaseModel, Field

class QueryInput(BaseModel):
    text: str = Field(min_length=1, max_length=10000)
    user_id: str = Field(pattern=r"^user_\d+$")
    top_k: int = Field(ge=1, le=20, default=5)

def validate_input(data: dict) -> dict:
    validated = QueryInput(**data)
    return validated.model_dump()

chain = RunnableLambda(validate_input) | prompt | llm | parser
```

### Anti-Pattern 8: Mixed Sync/Async in Pipeline

```python
# BAD: Sync step in async pipeline
async def process(query: str):
    context = retriever.invoke(query)  # Sync call blocking event loop
    return await llm.ainvoke(context)

# GOOD: Consistent async
async def process(query: str):
    context = await retriever.ainvoke(query)
    return await llm.ainvoke(context)
```

---

## LangChain vs. Direct LLM Calls

| Aspect | LangChain (LCEL) | Direct LLM Calls |
|---|---|---|
| **Boilerplate** | Minimum for complex pipelines | Grows with each feature added |
| **Composability** | Pipe operator, Runnable interface | Manual function chaining |
| **Streaming** | Built-in via astream_events | Manual implementation |
| **Retry/Error Handling** | .with_retry(), with_fallback() | Manual try/except loops |
| **Callbacks** | Full event system | Manual instrumentation |
| **Observability** | LangSmith integration built-in | Custom metric collection |
| **Memory** | Pluggable memory backends | Manual state management |
| **Tool Calling** | Agent framework with validation | Manual function calling loop |
| **Testing** | Mock LLMs, FakeListLLM | Mock HTTP calls |
| **Caching** | Global set_llm_cache() | Manual cache layer |
| **Flexibility** | Constrained by Runnable interface | Full control over requests |
| **Dependency Weight** | Heavy (many sub-packages) | Minimal (single HTTP client) |
| **Learning Curve** | Medium (abstract concepts) | Low (direct API calls) |
| **Debugging** | Opaque if not using tracers | Easy to log raw requests |
| **Best For** | Complex multi-step pipelines | Simple single calls, microservices |

### When to Use Direct Calls

```python
# Simple chat completion — direct call is fine
import openai
response = openai.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": query}],
)
return response.choices[0].message.content
```

### When to Use LangChain

```python
# RAG with retrieval, memory, streaming — LangChain adds value
chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt | llm | StrOutputParser()
)
async for token in chain.astream_events({"question": query}, version="v2"):
    ...
```

---

## Rules
- Use RunnableParallel for independent branches, RunnableSequence for dependent steps.
- Always use .assign() over manual dict construction in LCEL.
- MultiQueryRetriever with N=3 is the minimum viable for ambiguous queries.
- EnsembleRetriever weights must sum to 1.0.
- Agents must have a max iteration limit to prevent infinite loops.
- Memory must have a token limit to avoid context overflow.
- Streaming is mandatory for chat applications.
- Always wrap LLM calls with retry logic for production.
- Track token usage and cost per user/session in production.
- Use with_fallback() for critical chains to handle model degradation.
- Validate all external input before it enters the pipeline.
- Keep callback handlers focused — one responsibility per handler.
- Use async consistently — never mix sync calls in async pipelines.
- Version prompt templates alongside code for traceability.
- Test chains with FakeListLLM; test agents with mock tool responses.

## References
  - references/callback-streaming.md — Callbacks and Streaming
  - references/document-pipeline.md — Document Pipeline
  - references/langchain-memory-persistence.md — LangChain Memory Persistence
  - references/langchain-patterns-advanced.md — Langchain Patterns Advanced Topics
  - references/langchain-patterns-fundamentals.md — Langchain Patterns Fundamentals
  - references/langchain-production.md — LangChain Production Deployment
  - references/langchain-testing.md — LangChain Testing
  - references/lcel-patterns.md — LCEL (LangChain Expression Language) Patterns
  - references/retriever-agent-patterns.md — Retriever & Agent Patterns
  - references/tool-integration.md — Tool Integration Patterns
  - references/custom-components.md — Custom Component Development
  - references/migration-guides.md — Migration Guides
  - references/llm-comparison.md — LangChain vs Direct LLM Calls

## Handoff
For vector database setup, hand off to `ai-vector-databases`. For MCP tool integration, hand off to `ai-mcp-patterns`. For observability, hand off to `ai-ai-observability`.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->

