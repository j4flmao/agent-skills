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

---

## OpenTelemetry GenAI Semantic Conventions

For standardized, vendor-neutral telemetry, implement the OpenTelemetry GenAI Semantic Conventions. This ensures trace outputs integrate natively with Grafana Tempo, Datadog, Dynatrace, New Relic, and Honeycomb.

### Key Span Attributes

| Attribute Name | Type | Description / Example |
|---|---|---|
| `gen_ai.system` | string | AI platform name (`openai`, `anthropic`, `cohere`, `huggingface`) |
| `gen_ai.request.model` | string | Target model requested (`gpt-4o`, `claude-3-5-sonnet`) |
| `gen_ai.response.model` | string | Exact model that serviced the request (`gpt-4o-2024-05-13`) |
| `gen_ai.request.temperature` | double | Temperature parameter used (e.g. `0.7`) |
| `gen_ai.request.max_tokens` | int | Maximum tokens requested |
| `gen_ai.usage.input_tokens` | int | Count of tokens in prompt request |
| `gen_ai.usage.output_tokens` | int | Count of tokens generated in response |
| `gen_ai.client.token` | string | Client API identifier or project key |

### Standardized Event Structure
To capture input prompts and output responses without bloating span attributes, store messages inside Span Events with structured attributes:
*   Event Name: `gen_ai.content.prompt`
    *   `gen_ai.prompt.role`: `user` | `system` | `assistant` | `tool`
    *   `gen_ai.prompt.content`: Raw content string (ensure PII is redacted)
*   Event Name: `gen_ai.content.completion`
    *   `gen_ai.completion.role`: `assistant`
    *   `gen_ai.completion.content`: Raw generated text response

### Implementation Example: OpenTelemetry Instrumentor

Here is a production-ready OpenTelemetry client wrapper that conforms to GenAI semantic conventions, tracking prompt/completion events and token metrics.

```python
import time
from typing import Dict, Any, List
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

# Initialize tracer
tracer = trace.get_tracer("genai-application-tracer")

class InstrumentedLLMClient:
    def __init__(self, system: str, model: str):
        self.system = system
        self.model = model

    def chat_completion(
        self, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.7, 
        max_tokens: int = 1024,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        
        span_name = f"chat {self.system}"
        
        with tracer.start_as_current_span(
            span_name,
            kind=trace.SpanKind.CLIENT
        ) as span:
            # Set standard GenAI attributes
            span.set_attribute("gen_ai.system", self.system)
            span.set_attribute("gen_ai.request.model", self.model)
            span.set_attribute("gen_ai.request.temperature", temperature)
            span.set_attribute("gen_ai.request.max_tokens", max_tokens)
            
            # Enrich with application metadata
            if metadata:
                for key, val in metadata.items():
                    span.set_attribute(f"app.metadata.{key}", val)
            
            # Record prompt events
            for idx, msg in enumerate(messages):
                span.add_event(
                    name="gen_ai.content.prompt",
                    attributes={
                        "gen_ai.prompt.index": idx,
                        "gen_ai.prompt.role": msg.get("role", "user"),
                        "gen_ai.prompt.content": self._redact_pii(msg.get("content", ""))
                    }
                )
                
            start_time = time.perf_counter()
            try:
                # Actual LLM SDK Call Execution
                response = self._execute_llm_call(messages, temperature, max_tokens)
                latency_ms = (time.perf_counter() - start_time) * 1000
                
                # Record response attributes
                span.set_attribute("gen_ai.response.model", response["model"])
                span.set_attribute("gen_ai.usage.input_tokens", response["usage"]["prompt_tokens"])
                span.set_attribute("gen_ai.usage.output_tokens", response["usage"]["completion_tokens"])
                span.set_attribute("app.latency_ms", latency_ms)
                
                # Record completion event
                span.add_event(
                    name="gen_ai.content.completion",
                    attributes={
                        "gen_ai.completion.role": "assistant",
                        "gen_ai.completion.content": response["choices"][0]["message"]["content"]
                    }
                )
                span.set_status(Status(StatusCode.OK))
                return response
                
            except Exception as e:
                span.record_exception(e)
                span.set_status(Status(StatusCode.ERROR, str(e)))
                raise e

    def _execute_llm_call(self, messages, temp, max_toks) -> Dict[str, Any]:
        # Mocking downstream provider call
        return {
            "model": f"{self.model}-mocked-prod",
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "This is a structured response."
                }
            }],
            "usage": {
                "prompt_tokens": 120,
                "completion_tokens": 45
            }
        }

    def _redact_pii(self, text: str) -> str:
        # Simple regex placeholder for production PII scrubber (emails, SSNs, phone numbers)
        import re
        email_pattern = r"[\w\.-]+@[\w\.-]+\.\w+"
        return re.sub(email_pattern, "[REDACTED_EMAIL]", text)
```

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenTelemetry, LLM tracing conventions, and real-time observability pipelines.
-->
