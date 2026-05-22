# LLM Tracing

## LangSmith

### Core Concepts
- **Project**: Logical grouping of traces (e.g., by application or environment)
- **Run**: A single traced execution (LLM call, chain step, tool call)
- **Trace**: Tree of runs showing full execution path

### Setup

```python
import os
from langsmith import Client

os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "my-project"
os.environ["LANGCHAIN_API_KEY"] = "ls_..."

client = Client()
```

### Traced Components
- LLM calls (model, tokens, latency)
- Chains (RunnableSequence, RunnableParallel steps)
- Retrievers (query, top-k results, scores)
- Agents (thought, action, observation per step)
- Tools (invocation, input, output, error)

### Metadata

```python
chain.with_config(
    tags=["production", "v2.1"],
    metadata={
        "user_id": user_id,
        "session_id": session_id,
        "environment": "prod"
    }
)
```

### Trace Structure

```
Trace (root)
├── LLM Call (prompt, response, tokens, latency)
├── Retriever (query, top-k docs)
├── Tool Call (tool name, input, output)
└── Sub-chain (nested RunnableSequence)
```

### Evaluation
Create datasets in LangSmith. Run evaluators against traces. Compare model versions. Track regressions.

## LangFuse

### Core Concepts
- **Trace**: Top-level execution
- **Observation**: Span within a trace (LLM call, tool, sub-chain)
- **Score**: User feedback or evaluation result on a trace

### Setup

```python
from langfuse import Langfuse

langfuse = Langfuse(
    public_key="pk-...",
    secret_key="sk-...",
    host="https://cloud.langfuse.com"
)
```

### Tracing

```python
@langfuse.observe()
def my_chain(query: str) -> str:
    result = llm.invoke(query)
    return result

# Manual tracing
trace = langfuse.trace(name="my-trace", user_id=user_id)
generation = trace.generation(
    name="llm-call",
    model="gpt-4o",
    input=prompt,
    output=response,
    usage={"input": 150, "output": 50}
)
generation.end()
trace.update(input=query, output=result)
```

### Prompt Management
Store prompt templates in LangFuse. Version prompts. Deploy to production with one click. Link traces to prompt versions.

## Arize Phoenix

### Setup

```python
import phoenix as px
from openinference.instrumentation.openai import OpenAIInstrumentor

px.launch_app()
OpenAIInstrumentor().instrument()
```

### Trace Structure
- **Span ID**: Unique per call
- **Parent Span ID**: Nesting hierarchy
- **Attributes**: Model, tokens, latency, metadata
- **Status**: OK or ERROR with description

Drift detection: compare embedding distributions between baseline and production. Alert on drift score exceeding threshold.

## Trace Metadata Best Practices

Required metadata on every trace:
- `user_id`: Unique user identifier
- `session_id`: Conversation session
- `environment`: dev/staging/prod
- `model`: Model name and version
- `application`: Application/service name

Optional: `prompt_template_id`, `feature_flags`, `experiment_id`
