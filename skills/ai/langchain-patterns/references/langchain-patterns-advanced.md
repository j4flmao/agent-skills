# LangChain Patterns Advanced Topics

## Custom Runnable Components

### Subclassing Runnable

```python
from langchain_core.runnables import Runnable
from langchain_core.runnables.config import RunnableConfig
from typing import Any, Iterator, AsyncIterator

class DocumentEnricher(Runnable[str, str]):
    """Enriches documents with external data before LLM processing."""
    
    def __init__(self, enrichment_api: str, cache_ttl: int = 3600):
        self.api = enrichment_api
        self.cache: dict[str, str] = {}
        self.cache_ttl = cache_ttl

    def invoke(self, input: str, config: RunnableConfig | None = None) -> str:
        enriched = self._fetch_cached(input)
        return f"Context:\n{input}\n\nEnrichment:\n{enriched}"

    async def ainvoke(self, input: str, config: RunnableConfig | None = None) -> str:
        enriched = await self._fetch_cached_async(input)
        return f"Context:\n{input}\n\nEnrichment:\n{enriched}"

    def stream(self, input: str, config: RunnableConfig | None = None) -> Iterator[str]:
        yield self.invoke(input, config)

    async def astream(self, input: str, config: RunnableConfig | None = None) -> AsyncIterator[str]:
        yield await self.ainvoke(input, config)

    def _fetch_cached(self, query: str) -> str:
        import time
        now = time.time()
        if query in self.cache:
            ts, val = self.cache[query]
            if now - ts < self.cache_ttl:
                return val
        result = self._call_api(query)
        self.cache[query] = (time.time(), result)
        return result

    def _call_api(self, query: str) -> str:
        import requests
        resp = requests.post(self.api, json={"query": query}, timeout=5)
        return resp.json().get("enrichment", "")

    async def _fetch_cached_async(self, query: str) -> str:
        import aiohttp, asyncio
        async with aiohttp.ClientSession() as session:
            async with session.post(self.api, json={"query": query}) as resp:
                data = await resp.json()
                return data.get("enrichment", "")

# Usage
enricher = DocumentEnricher("https://enrich.internal/api")
chain = enricher | prompt | llm | parser
```

### RunnableLambda with Complex Logic

```python
from langchain_core.runnables import RunnableLambda, RunnablePassthrough

def multi_stage_validate(data: dict) -> dict:
    if not data.get("query"):
        raise ValueError("query required")
    data["query"] = data["query"].strip()
    data["sanitized"] = True
    data["timestamp"] = __import__("time").time()
    return data

def log_and_track(data: dict) -> dict:
    duration = __import__("time").time() - data.pop("timestamp", 0)
    print(f"Query: {data['query'][:50]}... Duration: {duration:.2f}s")
    return data

validation_chain = (
    RunnableLambda(multi_stage_validate)
    .assign(context=retriever)
    .assign(formatted_context=lambda x: format_docs(x["context"]))
    | RunnableLambda(log_and_track)
    | prompt | llm | parser
)
```

### Custom Output Parser

```python
from langchain_core.output_parsers import BaseOutputParser
from typing import Optional

class StructuredCitationParser(BaseOutputParser[dict]):
    """Parses responses with inline citations like [1], [2]."""
    
    def parse(self, text: str) -> dict:
        import re
        citations = re.findall(r'\[(\d+)\]', text)
        clean_text = re.sub(r'\s*\[(\d+)\]', '', text)
        return {
            "answer": clean_text.strip(),
            "citations": list(set(int(c) for c in citations)),
        }

    @property
    def _type(self) -> str:
        return "citation_parser"

parser = StructuredCitationParser()
chain = prompt | llm | parser
result = chain.invoke({"question": "What is RAG?"})
# {'answer': 'RAG is...', 'citations': [1, 3, 5]}
```

---

## Advanced Agent Patterns

### Adding Memory to Tool-Calling Agent

```python
from langchain.memory import ConversationSummaryMemory
from langchain_core.prompts import MessagesPlaceholder

memory = ConversationSummaryMemory(
    llm=llm,
    return_messages=True,
    memory_key="chat_history",
    max_token_limit=2000,
)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant with tools."),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

agent = create_tool_calling_agent(llm, tools, prompt)
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    memory=memory,
    max_iterations=15,
    return_intermediate_steps=True,
)

# Memory persists across calls
r1 = agent_executor.invoke({"input": "Hi, I'm working on project X"})
r2 = agent_executor.invoke({"input": "What project am I working on?"})  # Remembers
```

### Parallel Tool Execution Agent

```python
from langgraph.graph import StateGraph, END

class AgentState(TypedDict):
    messages: list
    next_actions: list
    tool_results: dict

def decide_actions(state: AgentState) -> AgentState:
    """LLM decides which tools to call in parallel."""
    response = llm_with_tools.invoke(state["messages"])
    state["next_actions"] = parse_tool_calls(response)
    return state

def execute_tools(state: AgentState) -> AgentState:
    """Execute all tool calls in parallel."""
    import asyncio
    async def run():
        tasks = {tc.name: tool_map[tc.name].ainvoke(tc.args)
                 for tc in state["next_actions"]}
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        state["tool_results"] = dict(zip(tasks.keys(), results))
        return state
    return asyncio.run(run())

def synthesize(state: AgentState) -> AgentState:
    """Combine tool results and generate final response."""
    result_text = "\n".join(
        f"{name}: {res}" for name, res in state["tool_results"].items()
        if not isinstance(res, Exception)
    )
    state["messages"].append(AIMessage(content=result_text))
    final = llm.invoke(state["messages"])
    state["messages"].append(final)
    return state

# LangGraph workflow
graph = StateGraph(AgentState)
graph.add_node("decide", decide_actions)
graph.add_node("execute", execute_tools)
graph.add_node("synthesize", synthesize)
graph.add_edge("decide", "execute")
graph.add_edge("execute", "synthesize")
graph.add_conditional_edges(
    "synthesize",
    lambda s: "end" if is_final(s) else "decide",
    {"end": END, "continue": "decide"},
)
graph.set_entry_point("decide")
app = graph.compile()
```

### Custom Planning Agent

```python
from langchain.agents import AgentExecutor, BaseSingleActionAgent
from langchain.schema import AgentAction, AgentFinish

class PlanningAgent(BaseSingleActionAgent):
    def __init__(self, llm, tools, planner_llm=None):
        self.llm = llm
        self.tools = {t.name: t for t in tools}
        self.planner_llm = planner_llm or llm

    @property
    def input_keys(self):
        return ["input"]

    def plan(self, intermediate_steps, **kwargs):
        from langchain_core.prompts import ChatPromptTemplate
        prompt = ChatPromptTemplate.from_template(
            "Goal: {input}\n\nAvailable tools: {tool_names}\n\n"
            "Previous steps: {history}\n\n"
            "What is the single next action? Output: Action: tool_name\nAction Input: args"
        )
        history = "\n".join(
            f"Thought: {s[0].tool}\nObservation: {str(s[1])[:200]}"
            for s in intermediate_steps[-5:]  # windowed history
        )
        response = self.planner_llm.invoke(prompt.format(
            input=kwargs["input"],
            tool_names=", ".join(self.tools.keys()),
            history=history or "None yet",
        ))
        return self._parse_action(response.content)

    def _parse_action(self, text: str) -> AgentAction | AgentFinish:
        import re
        if "Final Answer:" in text:
            return AgentFinish(
                return_values={"output": text.split("Final Answer:")[1].strip()},
                log=text,
            )
        match = re.search(r"Action:\s*(\w+)\nAction Input:\s*(.+)", text, re.DOTALL)
        if match:
            return AgentAction(tool=match.group(1), tool_input=match.group(2).strip(), log=text)
        return AgentFinish(return_values={"output": text}, log=text)

agent = PlanningAgent(llm, tools)
executor = AgentExecutor(agent=agent, tools=tools, max_iterations=10)
```

---

## Graph-Based Workflows with LangGraph

### Stateful Multi-Step RAG

```python
from typing import TypedDict, Annotated, Sequence
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

class RAGState(TypedDict):
    messages: Annotated[Sequence, add_messages]
    question: str
    context: list
    sub_questions: list

def decompose(state: RAGState) -> RAGState:
    prompt = ChatPromptTemplate.from_template(
        "Break this question into retrieval sub-questions:\n{question}"
    )
    chain = prompt | llm | StrOutputParser()
    sub_qs = chain.invoke({"question": state["question"]}).split("\n")
    state["sub_questions"] = [q.strip() for q in sub_qs if q.strip()]
    return state

def retrieve(state: RAGState) -> RAGState:
    all_docs = []
    for sq in state["sub_questions"]:
        docs = retriever.invoke(sq)
        all_docs.extend(docs)
    state["context"] = all_docs
    return state

def generate(state: RAGState) -> RAGState:
    context = format_docs(state["context"])
    prompt = ChatPromptTemplate.from_template(
        "Context:\n{context}\n\nQuestion:\n{question}\n\nAnswer:"
    )
    chain = prompt | llm
    response = chain.invoke({"context": context, "question": state["question"]})
    state["messages"].append(response)
    return state

graph = StateGraph(RAGState)
graph.add_node("decompose", decompose)
graph.add_node("retrieve", retrieve)
graph.add_node("generate", generate)
graph.set_entry_point("decompose")
graph.add_edge("decompose", "retrieve")
graph.add_edge("retrieve", "generate")
graph.add_edge("generate", END)
app = graph.compile()

result = app.invoke({
    "messages": [],
    "question": "Compare Python and Rust for web development",
    "context": [],
    "sub_questions": [],
})
```

### Human-in-the-Loop Agent

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint import MemorySaver

class HumanLoopState(TypedDict):
    messages: list
    requires_approval: bool
    tool_calls: list

def propose_action(state: HumanLoopState) -> HumanLoopState:
    response = llm_with_tools.invoke(state["messages"])
    state["tool_calls"] = extract_tool_calls(response)
    state["requires_approval"] = len(state["tool_calls"]) > 0
    state["messages"].append(response)
    return state

def human_approval(state: HumanLoopState) -> HumanLoopState:
    """Graph pauses here. External system provides approval."""
    print(f"Proposed actions: {state['tool_calls']}")
    print("Waiting for approval...")
    # The checkpointer saves state; external system resumes with
    # {"approved": True/False} via app.update_state()
    return state

def execute_approved(state: HumanLoopState) -> HumanLoopState:
    for tc in state["tool_calls"]:
        result = tool_map[tc["name"]].invoke(tc["args"])
        state["messages"].append(ToolMessage(content=result, tool_call_id=tc["id"]))
    return state

def should_continue(state: HumanLoopState) -> str:
    state["requires_approval"] = False
    if is_final_answer(state["messages"][-1]):
        return "end"
    return "continue"

graph = StateGraph(HumanLoopState)
graph.add_node("propose", propose_action)
graph.add_node("approve", human_approval)
graph.add_node("execute", execute_approved)
graph.set_entry_point("propose")
graph.add_edge("propose", "approve")
graph.add_edge("approve", "execute")
graph.add_conditional_edges("execute", should_continue, {
    "end": END,
    "continue": "propose",
})
app = graph.compile(checkpointer=MemorySaver())
```

---

## Multi-Modal Chains

### Vision + Text Chain

```python
from langchain_core.messages import HumanMessage

def image_qa(image_url: str, question: str) -> str:
    """Use a multimodal model for image-based Q&A."""
    vision_llm = ChatOpenAI(model="gpt-4o", max_tokens=1024)
    message = HumanMessage(content=[
        {"type": "text", "text": question},
        {"type": "image_url", "image_url": {"url": image_url}},
    ])
    response = vision_llm.invoke([message])
    return response.content

class MultiModalRAG:
    def __init__(self, text_retriever, image_retriever):
        self.text_retriever = text_retriever
        self.image_retriever = image_retriever
        self.llm = ChatOpenAI(model="gpt-4o")

    def query(self, question: str) -> dict:
        text_docs = self.text_retriever.invoke(question)
        image_docs = self.image_retriever.invoke(question)
        messages = [HumanMessage(content=[
            {"type": "text", "text": f"Question: {question}\n\nContext:\n"
                                      f"{format_docs(text_docs)}"},
            *[{"type": "image_url",
               "image_url": {"url": doc.metadata["url"]}}
              for doc in image_docs[:3]],
        ])]
        response = self.llm.invoke(messages)
        return {"answer": response.content, "sources": text_docs + image_docs}
```

---

## Advanced Error Recovery

### Transactional Chain with Rollback

```python
class TransactionalChain:
    def __init__(self, primary, fallback, checkpoint_store=None):
        self.primary = primary
        self.fallback = fallback
        self.checkpoints = checkpoint_store or []

    def invoke(self, input_data: dict) -> dict:
        checkpoint = self._save_checkpoint(input_data)
        try:
            result = self.primary.invoke(input_data)
            self._commit(checkpoint)
            return {"status": "success", "data": result}
        except RetryableError:
            self._rollback(checkpoint)
            result = self.fallback.invoke(input_data)
            return {"status": "degraded", "data": result}
        except FatalError as e:
            self._rollback(checkpoint)
            return {"status": "failed", "error": str(e)}

    def _save_checkpoint(self, data):
        cp = {"data": deepcopy(data), "timestamp": time.time()}
        self.checkpoints.append(cp)
        return cp

    def _commit(self, checkpoint):
        checkpoint["committed"] = True

    def _rollback(self, checkpoint):
        logger.info(f"Rolling back: {checkpoint['timestamp']}")

# Usage
chain = TransactionalChain(
    primary=rag_chain,
    fallback=simple_llm_chain,
)
result = chain.invoke({"question": "Complex question needing RAG"})
```

### Adaptive Retrieval Strategy

```python
class AdaptiveRetriever:
    def __init__(self, strategies: dict, fallback_retriever):
        self.strategies = strategies  # {"dense": ..., "hybrid": ..., "compression": ...}
        self.fallback = fallback_retriever
        self.performance_log = []

    def retrieve(self, query: str, metadata: dict = None) -> list:
        strategy = self._select_strategy(query, metadata)
        try:
            docs = strategy.invoke(query)
            self._log(query, strategy.__class__.__name__, len(docs), success=True)
            return docs
        except Exception as e:
            self._log(query, strategy.__class__.__name__, 0, success=False, error=str(e))
            logger.warning(f"Strategy {strategy} failed: {e}. Falling back.")
            return self.fallback.invoke(query)

    def _select_strategy(self, query, metadata):
        # Short queries → dense; long/ambiguous → multi-query
        if metadata and metadata.get("ambiguous"):
            return self.strategies["multi_query"]
        if len(query.split()) < 3:
            return self.strategies["dense"]
        return self.strategies["hybrid"]

    def _log(self, query, strategy, count, success, error=None):
        self.performance_log.append({
            "query": query[:50], "strategy": strategy,
            "result_count": count, "success": success,
            "error": error, "timestamp": time.time(),
        })
```

---

## Performance Optimization

### Batching and Caching

```python
from langchain_core.caches import InMemoryCache
from langchain.globals import set_llm_cache

# Cache identical LLM calls
set_llm_cache(InMemoryCache())

# Redis cache for shared instances
from langchain.cache import RedisCache
set_llm_cache(RedisCache(redis_client))

# Custom cache key strategy
class SemanticCache(RedisCache):
    def _key(self, *args, **kwargs) -> str:
        import hashlib
        raw = str(args) + str(sorted(kwargs.items()))
        return f"llm_cache:{hashlib.sha256(raw.encode()).hexdigest()}"

# Batch processing
results = chain.batch(inputs, config={"max_concurrency": 5})
```

### Token Budget Management

```python
class TokenBudget:
    def __init__(self, max_tokens: int = 128000):
        self.max = max_tokens
        self.used = defaultdict(int)

    def reserve(self, operation: str, estimated_tokens: int) -> bool:
        """Reserve tokens before making a call. Returns False if over budget."""
        total = sum(self.used.values())
        if total + estimated_tokens > self.max:
            return False
        self.used[operation] += estimated_tokens
        return True

    def release(self, operation: str, actual_tokens: int):
        self.used[operation] = min(self.used[operation], actual_tokens)

    def reset(self):
        self.used.clear()

budget = TokenBudget(max_tokens=64000)
if budget.reserve("rag_query", 4000):
    answer = rag_chain.invoke(query)
    budget.release("rag_query", actual_tokens)
```

---

## Key Points

- Custom Runnables via subclassing enable full control over invoke/stream lifecycle.
- RunnableLambda wraps arbitrary functions into the LCEL pipeline.
- LangGraph enables complex state machines, cycles, and human-in-the-loop patterns.
- Parallel tool execution dramatically reduces agent latency for independent calls.
- Custom agents via subclassing BaseSingleActionAgent for non-standard routing logic.
- Multi-modal chains combine text + image + code processing in a single pipeline.
- Transactional patterns with checkpoints provide safe error recovery for critical chains.
- Adaptive retrieval strategies auto-select the best retriever based on query characteristics.
- Semantic caching with custom key functions can dramatically reduce duplicate calls.
- Token budget management prevents context overflow in long-running agent sessions.
- Always benchmark retrieval strategies on your domain data before production deployment.
- LangGraph checkpoints enable pause/resume workflows and durable agent execution.
