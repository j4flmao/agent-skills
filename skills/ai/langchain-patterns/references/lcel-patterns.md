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

`.assign()` appends new keys without replacing existing ones. Use for incremental pipeline state.

```python
chain = (
    RunnablePassthrough()
    .assign(context=lambda x: retriever.invoke(x["question"]))
    | prompt
    | llm
    | output_parser
)
```

## RunnableBinding

Pre-configure runtime arguments without creating a new chain.

```python
llm.bind(stop=["\n\n"], tools=tool_schemas)
prompt.bind(messages=[SystemMessage(content="Be concise")])
```

## RunnableBranch

Conditional routing based on input. Takes list of (condition, runnable) pairs plus default.

```python
branch = RunnableBranch(
    (lambda x: len(x["query"]) > 100, long_query_chain),
    (lambda x: "code" in x["query"], code_chain),
    default_chain
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

## Custom Runnables

Subclass `Runnable` or use `RunnableLambda` for arbitrary functions.

```python
from langchain_core.runnables import RunnableLambda

def validate_query(query: str) -> str:
    assert len(query) > 0, "Empty query"
    return query

validate = RunnableLambda(validate_query)
chain = validate | retriever | prompt | llm
```

For stateful custom runnables, subclass `Runnable` and implement `invoke`/`ainvoke`.

## Configuration & Metadata

```python
chain.with_config(
    run_name="my-chain",
    tags=["production"],
    metadata={"user_id": user_id, "session_id": session_id}
)
```

Use for observability and cost tracking. Metadata propagates to LangSmith traces.

## Error Handling

```python
chain.with_retry(
    retry_if_exception_type=(openai.RateLimitError,),
    wait_exponential_jitter=True,
    stop_after_attempt=3
)
```

## Common Patterns

1. **Pre-processing + retriever + post-processing**: `.assign()` for computed fields
2. **Multi-step reasoning**: Chain multiple LLM calls with intermediate parsing
3. **Conditional branching**: `RunnableBranch` with lambda conditions
4. **Parallel retrieval**: `RunnableParallel` for multi-source retrieval with weighted fusion
5. **Fallback**: `chain.with_fallback(fallback_chain)` for degraded-mode operations
