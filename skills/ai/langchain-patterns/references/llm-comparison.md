# LangChain vs Direct LLM Calls

## Decision Framework

```
How simple is your LLM usage?
  ├─ Single call, no context, no tools ──► Direct call
  ├─ Multi-turn conversation ──► LangChain (memory)
  ├─ RAG pipeline ──► LangChain (retriever + chain)
  ├─ Tool-using agent ──► LangChain (agent framework)
  └─ Complex workflow ──► LangChain + LangGraph
```

---

## Comparison Table

| Criteria | LangChain (LCEL) | Direct LLM Calls |
|---|---|---|
| **Boilerplate** | Pre-built abstractions | Manual implementation |
| **Composability** | Pipe (`\|`) operator | Manual function chaining |
| **Streaming** | `astream()`, `astream_events()` | Manual async iteration |
| **Retry** | `.with_retry()`, `with_fallback()` | Manual try/except/backoff |
| **Callbacks** | 20+ event hooks | Manual instrumentation |
| **Observability** | LangSmith auto-tracing | Manual tracing |
| **Memory** | Pluggable backends | Manual state management |
| **Tool Calling** | `create_tool_calling_agent` | Parse function calls manually |
| **Testing** | `FakeListLLM`, `MockRetriever` | Mock HTTP client |
| **Caching** | `set_llm_cache()` global | Manual cache layer |
| **Output Parsing** | `StrOutputParser`, `PydanticOutputParser` | Manual parsing |
| **Package Size** | 30+ dependencies | 1-2 dependencies |
| **Learning Curve** | Medium (Runnable, LCEL concepts) | Low (raw API) |
| **Debugging** | Opaque without tracers | Full request/response visibility |
| **Customization** | Constrained by abstractions | Full control |
| **Performance** | ~5-15% overhead | Minimal overhead |
| **Best For** | Complex pipelines, multi-step agents | Simple chat, microservices |

---

## When to Use Direct Calls

### 1. Simple Single-Turn Chat

```python
# Direct — 7 lines
import openai

client = openai.OpenAI()
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
)
return response.choices[0].message.content

# LangChain — 9 lines (more abstraction than needed)
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

llm = ChatOpenAI(model="gpt-4o")
response = llm.invoke([HumanMessage(content="Hello")])
return response.content
```

### 2. Microservice with Simple Transform

```python
# Direct — clean, minimal
@app.post("/translate")
async def translate(text: str, target: str) -> str:
    response = await async_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": f"Translate to {target}. Output only translation."},
            {"role": "user", "content": text},
        ],
        max_tokens=200,
    )
    return response.choices[0].message.content.strip()
```

### 3. Max-Throughput Batch Processing

```python
import asyncio
import openai
from asyncio import Semaphore

sem = Semaphore(10)

async def classify(text: str) -> str:
    async with sem:
        resp = await async_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": f"Classify: {text}"}],
            max_tokens=10,
        )
        return resp.choices[0].message.content

results = await asyncio.gather(*[classify(t) for t in texts])
```

---

## When to Use LangChain

### 1. RAG Pipeline

```python
# LangChain — composition wins
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt | llm | StrOutputParser()
)

async for event in rag_chain.astream_events(question, version="v2"):
    if event["event"] == "on_chat_model_stream":
        yield event["data"]["chunk"].content

# Direct — 40+ lines for equivalent
async def rag_direct(question: str):
    docs = await retriever.ainvoke(question)
    context = format_docs(docs)
    messages = [
        {"role": "system", "content": f"Context:\n{context}"},
        {"role": "user", "content": question},
    ]
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        stream=True,
    )
    async for chunk in response:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
```

### 2. Tool-Using Agent

```python
# LangChain — built-in framework
agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, max_iterations=10)
result = executor.invoke({"input": "What's the weather in Paris and calculate 2+2"})

# Direct — manual tool-calling loop
def agent_direct(query: str) -> str:
    messages = [{"role": "user", "content": query}]
    for _ in range(10):
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=tool_schemas,
        )
        msg = response.choices[0].message
        if not msg.tool_calls:
            return msg.content
        messages.append(msg)
        for tc in msg.tool_calls:
            result = tool_map[tc.function.name](**json.loads(tc.function.arguments))
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result,
            })
    return "Max iterations reached"
```

### 3. Multi-Turn with Memory

```python
# LangChain — pluggable persistence
memory = ConversationBufferMemory(return_messages=True)
conversation = ConversationChain(llm=llm, memory=memory)

# Direct — manual history management
history = []
def chat(message: str) -> str:
    history.append({"role": "user", "content": message})
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=history,
    )
    reply = response.choices[0].message.content
    history.append({"role": "assistant", "content": reply})
    return reply
```

### 4. Complex Multi-Step Workflow

```python
# LangChain + LangGraph — declarative state machine
class ResearchState(TypedDict):
    question: str
    sub_questions: list
    search_results: dict
    synthesis: str
    citations: list

def decompose(state): ...
def search(state): ...
def synthesize(state): ...
def finalize(state): ...

graph = StateGraph(ResearchState)
# Add nodes and edges...
app = graph.compile()

# Direct — imperative spaghetti
async def research_direct(question: str) -> str:
    sub_qs = await decompose(question)
    results = {}
    for sq in sub_qs:
        results[sq] = await search(sq)
    synthesis = await synthesize(question, results)
    citations = extract_citations(synthesis)
    return format_output(synthesis, citations)
```

---

## LangChain Overhead Analysis

### Performance Impact

| Operation | Direct | LangChain | Overhead |
|---|---|---|---|
| Single LLM call | 2.1ms (client latency) | 2.8ms | ~33% |
| Simple chain (prompt → llm → parser) | — | 3.1ms | ~48% |
| RAG (retriever → prompt → llm → parser) | — | 5-15ms overhead | Variable |
| Agent (10 iterations) | — | 20-100ms | Complex routing |

**Note**: Overhead is per-call and negligible compared to LLM latency (500ms-30s). LangChain overhead only matters for sub-100ms operations.

### Dependency Weight

```
Direct:        openai              → ~0.5MB
LangChain:     langchain           → ~5MB
               langchain-core      → ~2MB
               langchain-openai    → ~0.5MB
               Total               → ~8MB + transitive deps
```

---

## Hybrid Approach

```python
class HybridLLMService:
    """Use direct calls for simple ops, LangChain for complex pipelines."""

    def __init__(self):
        import openai
        from langchain_openai import ChatOpenAI
        from langchain_core.runnables import RunnablePassthrough

        self.client = openai.AsyncOpenAI()
        self.lc_llm = ChatOpenAI(model="gpt-4o")

    async def simple_chat(self, message: str) -> str:
        """Single-turn: direct call."""
        resp = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": message}],
            max_tokens=500,
        )
        return resp.choices[0].message.content

    async def rag_query(self, question: str) -> str:
        """RAG: LangChain pipeline."""
        rag_chain = await self._build_rag_chain()
        return await rag_chain.ainvoke({"question": question})

    async def _build_rag_chain(self):
        from langchain_core.prompts import ChatPromptTemplate
        prompt = ChatPromptTemplate.from_template(
            "Context:\n{context}\n\nQuestion: {question}"
        )
        return (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt | self.lc_llm | StrOutputParser()
        )

    async def agent_task(self, task: str) -> str:
        """Agent: LangChain agent framework."""
        from langchain.agents import create_tool_calling_agent, AgentExecutor
        agent = create_tool_calling_agent(self.lc_llm, self.tools, self.agent_prompt)
        executor = AgentExecutor(agent=agent, tools=self.tools, max_iterations=10)
        result = await executor.ainvoke({"input": task})
        return result["output"]
```

---

## Migration Path: Direct → LangChain

```python
# Phase 1: Start direct
async def answer(question: str) -> str:
    resp = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": question}],
    )
    return resp.choices[0].message.content

# Phase 2: Add output parser
from langchain_core.output_parsers import StrOutputParser
parser = StrOutputParser()

async def answer(question: str) -> str:
    resp = await client.chat.completions.create(...)
    return await parser.aparse(resp.choices[0].message.content)

# Phase 3: Add prompt template
from langchain_core.prompts import ChatPromptTemplate
prompt = ChatPromptTemplate.from_template("Answer: {question}")
messages = prompt.format_messages(question=question)

# Phase 4: Full LCEL chain
chain = prompt | ChatOpenAI(model="gpt-4o") | parser
result = await chain.ainvoke({"question": question})
```

---

## Key Points

- **Use Direct** for: single-turn chat, microservices, simple transforms, max-throughput batch processing, minimal dependencies.
- **Use LangChain** for: RAG pipelines, tool-using agents, multi-turn conversations with memory, complex multi-step workflows, needing observability/callbacks.
- LangChain overhead (~2-15ms) is negligible compared to LLM latency (~500ms-30s).
- Hybrid approaches work best: direct for simple calls, LangChain for complex pipelines.
- LangChain's value grows with pipeline complexity — the more steps, the more abstraction pays off.
- Direct calls are easier to debug (full request/response visibility) and have fewer dependencies.
- LangChain provides production features (retry, caching, tracing) that require manual effort with direct calls.
- Start simple (direct), add LangChain incrementally as complexity demands.
- For teams, LangChain's standardized patterns improve code consistency and reduce context-switching.
- Always benchmark both approaches on your specific workload before making architectural decisions.
