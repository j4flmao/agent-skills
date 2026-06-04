# LCEL (LangChain Expression Language) Patterns

## Runnable Interface

Every component in LangChain implements the Runnable interface with these methods:
- `.invoke(input)` — synchronous single call
- `.batch(inputs)` — synchronous batched calls
- `.stream(input)` — synchronous stream of output chunks
- `.ainvoke(input)` — async single call
- `.abatch(inputs)` — async batched calls
- `.astream(input)` — async stream of output chunks
- `.astream_events(input, version)` — async stream with structured events

## RunnableSequence

Linear chain of runnables where output of step N becomes input to step N+1.

```python
chain = RunnableSequence([retriever, prompt, llm, output_parser])
# Shorthand with |
chain = retriever | prompt | llm | output_parser
```

Use `.pipe()` for explicit chaining. Always prefer `|` operator for readability.

## RunnableParallel

Execute runnables in parallel, produce dict of results.

```python
parallel = RunnableParallel(
    context=retriever,
    date=date_runnable,
    question=RunnablePassthrough()
)
chain = parallel | prompt | llm | output_parser
```

### State Transmission via Passthroughs

`.assign()` appends new keys without replacing existing ones. Use for incremental pipeline state across non-linear pipeline steps.

```python
chain = (
    RunnablePassthrough.assign(
        context=lambda x: retriever.invoke(x["question"]),
        history=lambda x: memory.load_memory_variables(x)["history"]
    )
    | prompt
    | llm
    | output_parser
)
```

In complex scenarios, state must be passed down a chain without modifications while parallel branches compute intermediate values:

```python
from langchain_core.runnables import RunnablePassthrough, RunnableParallel

# Propagating raw inputs alongside downstream transformations
pipeline = RunnableParallel(
    raw_input=RunnablePassthrough(),
    processed_query=lambda x: x["query"].strip().lower()
).assign(
    retrieved_docs=lambda state: retriever.invoke(state["processed_query"])
).assign(
    generation=lambda state: generator_chain.invoke({
        "context": state["retrieved_docs"],
        "query": state["raw_input"]["query"]
    })
)
```

## RunnableBinding

Pre-configure runtime arguments without creating a new chain.

```python
llm.bind(stop=["\n\n"], tools=tool_schemas)
prompt.bind(messages=[SystemMessage(content="Be concise")])
```

## RunnableBranch & State Fallback Routing

Conditional routing based on input. Takes list of (condition, runnable) pairs plus default.

```python
branch = RunnableBranch(
    (lambda x: len(x["query"]) > 100, long_query_chain),
    (lambda x: "code" in x["query"], code_chain),
    default_chain
)
```

For advanced dynamic routing based on runtime state, implement a routing function inside a `RunnableLambda`:

```python
from langchain_core.runnables import RunnableLambda

def route_by_intent(state):
    intent = state["intent"].strip().lower()
    if "billing" in intent:
        return billing_chain
    elif "technical" in intent:
        return technical_chain
    else:
        return general_chain

routing_chain = (
    RunnablePassthrough.assign(intent=intent_classifier_chain)
    | RunnableLambda(route_by_intent)
)
```

## Streaming Patterns

### LangChain v0.2+ streaming with astream_events:

```python
async for event in chain.astream_events(input, version="v2", include_names=["my_llm"]):
    if event["event"] == "on_chat_model_stream":
        yield event["data"]["chunk"]
    elif event["event"] == "on_retriever_end":
        context = event["data"]["output"]
```

### Streaming with callbacks:

```python
class StreamHandler(BaseCallbackHandler):
    def on_llm_new_token(self, token: str, **kwargs):
        yield token
```

## Custom Runnables & Validation

Subclass `Runnable` or use `RunnableLambda` for arbitrary functions.

```python
from langchain_core.runnables import RunnableLambda

def validate_query(query: str) -> str:
    assert len(query) > 0, "Empty query"
    return query

validate = RunnableLambda(validate_query)
chain = validate | retriever | prompt | llm
```

### Complex Input Validation & Transformation Stream

Create custom Runnables with Pydantic schemas to validate states during intermediate chain runs:

```python
from typing import Dict, Any
from pydantic import BaseModel, Field
from langchain_core.runnables import RunnableConfig, RunnableSerializable

class PipelineState(BaseModel):
    query: str = Field(..., min_length=3)
    user_id: str
    auth_token: str

class StateValidatorRunnable(RunnableSerializable[Dict[str, Any], Dict[str, Any]]):
    def invoke(self, input: Dict[str, Any], config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        # Validate input schema
        state = PipelineState(**input)
        # Perform authorization checks
        if not self._check_auth(state.user_id, state.auth_token):
            raise PermissionError("Unauthorized pipeline state")
        return state.model_dump()

    def _check_auth(self, user_id: str, token: str) -> bool:
        # Auth logic
        return len(token) > 5
```

## Configuration, Fallbacks & Retries

```python
chain.with_config(
    run_name="my-chain",
    tags=["production"],
    metadata={"user_id": user_id, "session_id": session_id}
)
```

### Robust Fault Tolerance

```python
robust_chain = chain.with_retry(
    retry_if_exception_type=(openai.RateLimitError, TimeoutError),
    wait_exponential_jitter=True,
    stop_after_attempt=3
).with_fallbacks([
    backup_chain,
    fallback_static_response_chain
])
```

## Key Points

- Execute parallel tasks with `RunnableParallel` to optimize throughput and wall-clock time.
- Use `RunnablePassthrough.assign()` to preserve downstream state variables across steps.
- Configure runtime settings dynamically via `with_config` or bind tools using `bind`.
- Route inputs to specialized pipelines via `RunnableBranch` or a custom routing `RunnableLambda`.
- Implement Pydantic validation via custom `RunnableSerializable` classes to catch pipeline drift.
- Ensure production robustness using `.with_retry()` and `.with_fallbacks()`.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->
