# Observability Tooling Comparison

## Overview
AI application observability requires specialized tools that understand LLM-specific concepts: tokens, prompts, chains, agents, and vector stores. This reference compares major tools across dimensions relevant to LLM application monitoring.

## Tool Comparison Matrix

| Feature | LangSmith | LangFuse | Weights & Biases | Arize AI | Datadog LLM Obs |
|---------|-----------|----------|------------------|----------|-----------------|
| Tracing | ✅ Native | ✅ Native | ⚠️ Limited | ✅ SDK | ✅ Beta |
| Prompts | ✅ Versioned | ✅ Versioned | ❌ | ✅ | ❌ |
| Feedback | ✅ | ✅ | ✅ | ✅ | ✅ |
| Costs | ✅ Per-run | ✅ Per-run | ✅ | ✅ | ✅ |
| Self-host | ✅ | ✅ | ❌ | ❌ | ❌ |
| CI/CD Eval | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| OpenTelemetry | ✅ | ✅ | ❌ | ✅ | ✅ |
| Pricing | Usage | Usage+Self | Seat-based | Usage | Included |
| Alerting | ⚠️ Basic | ⚠️ Basic | ✅ | ✅ | ✅ Native |

## Tool-Specific Integrations

### LangSmith
```python
from langsmith import Client, traceable
from langsmith.run_helpers import get_current_run

client = Client()

@traceable(project="my-app", run_type="chain")
def my_chain(input_data: dict) -> str:
    run = get_current_run()
    run.add_metadata({"user_id": input_data.get("user_id"), "session_id": input_data.get("session_id")})

    response = call_llm(input_data["query"])
    run.add_outputs({"output": response, "tokens": count_tokens(response)})

    return response

# Feedback collection
def record_feedback(run_id: str, score: int):
    client.create_feedback(
        run_id=run_id,
        key="user_rating",
        score=score,
        comment="User feedback from production",
    )

# Dataset creation from traces
def create_dataset_from_traces(project: str, n: int = 100):
    runs = client.list_runs(project_name=project, execution_order=1, limit=n)
    examples = []
    for run in runs:
        examples.append({
            "input": run.inputs["input_data"]["query"],
            "output": run.outputs["output"],
        })
    dataset = client.create_dataset(f"{project}-eval-set")
    client.create_examples(inputs=[e["input"] for e in examples],
                           outputs=[e["output"] for e in examples],
                           dataset_id=dataset.id)
```

### LangFuse
```python
from langfuse import Langfuse
from langfuse.decorators import observe, langfuse_context

langfuse = Langfuse()

@observe(name="my_agent", as_type="agent")
def my_agent(query: str, user_id: str):
    langfuse_context.update_current_trace(
        user_id=user_id,
        session_id=f"session-{user_id}",
        metadata={"environment": "production"},
    )

    with langfuse_context.span(name="retrieval", type="retrieval") as span:
        docs = retrieve_documents(query)
        span.update(input=query, output=len(docs))
        langfuse_context.update_current_observation(
            usage={"input": count_tokens(query), "output": 0}
        )

    with langfuse_context.generation(
        name="llm_call",
        model="gpt-4o",
        model_parameters={"temperature": 0.7},
    ) as gen:
        response = call_llm(query, docs)
        gen.update(
            input=query,
            output=response,
            usage={"input": 150, "output": 50, "unit": "TOKENS"},
        )

    langfuse_context.score_current_trace(
        name="response_quality",
        value=compute_quality(response),
    )
    return response
```

### OpenTelemetry-Based (Generic)
```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

resource = Resource.create({"service.name": "llm-app", "environment": "production"})
provider = TracerProvider(resource=resource)
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)

def tracked_llm_call(prompt: str, model: str):
    with tracer.start_as_current_span("llm.completion") as span:
        span.set_attribute("gen_ai.system", "openai")
        span.set_attribute("gen_ai.request.model", model)
        span.set_attribute("gen_ai.request.max_tokens", 1000)
        span.set_attribute("gen_ai.request.temperature", 0.7)
        span.set_attribute("gen_ai.prompt", prompt)

        response = openai_client.chat.completions.create(model=model, messages=[{"role": "user", "content": prompt}])

        span.set_attribute("gen_ai.response.model", response.model)
        span.set_attribute("gen_ai.usage.prompt_tokens", response.usage.prompt_tokens)
        span.set_attribute("gen_ai.usage.completion_tokens", response.usage.completion_tokens)
        span.set_attribute("gen_ai.usage.total_tokens", response.usage.total_tokens)

        return response.choices[0].message.content
```

## Evaluation Integration

### CI/CD with LangFuse
```python
class LangFuseEvalPipeline:
    def __init__(self):
        self.langfuse = Langfuse()

    def run_eval_on_dataset(self, dataset_name: str, model: str):
        dataset = self.langfuse.get_dataset(dataset_name)
        results = []

        for item in dataset.items:
            trace = self.langfuse.trace(
                name="eval_run",
                input=item.input,
                metadata={"dataset": dataset_name, "model": model},
            )
            output = call_llm(item.input, model)
            score = compute_metric(output, item.expected_output)

            trace.score(
                name="eval_accuracy",
                value=score,
                comment=f"Run against {dataset_name}",
            )
            results.append(score)

        return {"mean_score": statistics.mean(results), "results": results}
```

## Cost Monitoring Comparison

### LangSmith Cost Tracking
```python
def track_langsmith_costs(project: str, days: int = 7):
    runs = client.list_runs(project_name=project, start_time=datetime.now() - timedelta(days=days))
    costs = {"total": 0, "by_model": {}}

    for run in runs:
        if run.run_type == "llm":
            model = run.extra.get("model", "unknown")
            tokens = {
                "prompt": run.outputs.get("token_usage", {}).get("prompt_tokens", 0),
                "completion": run.outputs.get("token_usage", {}).get("completion_tokens", 0),
            }
            cost = calculate_cost(model, tokens["prompt"], tokens["completion"])
            costs["total"] += cost
            costs["by_model"].setdefault(model, {"calls": 0, "cost": 0, "tokens": 0})
            costs["by_model"][model]["calls"] += 1
            costs["by_model"][model]["cost"] += cost
            costs["by_model"][model]["tokens"] += tokens["prompt"] + tokens["completion"]

    return costs
```

## Selection Guide

| Condition | Recommended Tool |
|-----------|-----------------|
| LangChain user | LangSmith (native) |
| Self-hosted required | LangFuse (self-host option) |
| Already on Datadog | Datadog LLM Observability |
| ML experiment tracking | Weights & Biases |
| Production ML monitoring | Arize AI |
| Multi-cloud, multi-tool | OpenTelemetry + any backend |
| Budget constrained | LangFuse (self-host, free tier) |
| Need prompt management | LangSmith or LangFuse |
| Enterprise compliance | Datadog or Arize |

## Key Points
- LangSmith best for LangChain-heavy stacks
- LangFuse best for self-hosted and cost-sensitive deployments
- OpenTelemetry most portable across providers
- All tools support feedback collection for quality monitoring
- Cost tracking requires manual model pricing configuration
- Evaluate based on: tracing depth, prompt versioning, alerting, and pricing model
- Start with one tool, migrate only if specific needs unmet
- Most tools offer free tiers for evaluation
- Data residency requirements may dictate self-hosted options
- Consider API compatibility when choosing (OpenTelemetry standard)
