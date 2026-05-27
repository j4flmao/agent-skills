# Prompt Performance Tuning

## Overview
Prompt performance tuning optimizes prompt structure, token usage, and model parameters to improve quality, latency, and cost. Effective tuning balances task accuracy with token efficiency and response time.

## Token Efficiency

### Reducing Prompt Length
```python
class TokenOptimizer:
    def count_tokens(self, text: str, model: str = "gpt-4") -> int:
        import tiktoken
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))

    def optimize_system_prompt(self, prompt: str, preserve: list[str]) -> str:
        lines = prompt.split("\n")
        optimized = []
        for line in lines:
            if any(kw in line for kw in preserve):
                optimized.append(line)
                continue
            if len(line.split()) > 5:
                shortened = self._shorten_line(line)
                if len(shortened.split()) >= 3:
                    optimized.append(shortened)
            else:
                optimized.append(line)
        return "\n".join(optimized)

    def _shorten_line(self, line: str) -> str:
        removals = ["please", "kindly", "you should", "you need to", "make sure to", "always"]
        for phrase in removals:
            line = line.replace(phrase, "")
        return line.strip()

    def optimize_few_shot(self, examples: list[dict], max_tokens: int = 500) -> list[dict]:
        optimized = []
        total_tokens = 0
        for ex in examples:
            ex_tokens = self.count_tokens(str(ex))
            if total_tokens + ex_tokens <= max_tokens:
                optimized.append(ex)
                total_tokens += ex_tokens
        return optimized
```

## Parameter Tuning

### Temperature and Sampling
```python
class ParameterTuner:
    def __init__(self, model_fn):
        self.model = model_fn

    def tune_temperature(self, prompt: str, temperatures: list[float], eval_fn, n: int = 5) -> dict:
        results = {}
        for temp in temperatures:
            scores = []
            for _ in range(n):
                output = self.model(prompt, temperature=temp)
                score = eval_fn(output)
                scores.append(score)
            results[temp] = {
                "mean": statistics.mean(scores),
                "std": statistics.stdev(scores) if len(scores) > 1 else 0,
                "scores": scores,
            }
        return results

    def find_optimal_params(self, prompt: str, param_grid: dict, eval_fn) -> dict:
        best_score = 0
        best_params = {}

        for temp in param_grid.get("temperature", [0]):
            for top_p in param_grid.get("top_p", [1]):
                for presence_penalty in param_grid.get("presence_penalty", [0]):
                    output = self.model(prompt, temperature=temp, top_p=top_p, presence_penalty=presence_penalty)
                    score = eval_fn(output)

                    if score > best_score:
                        best_score = score
                        best_params = {
                            "temperature": temp,
                            "top_p": top_p,
                            "presence_penalty": presence_penalty,
                        }

        return {"best_score": best_score, "best_params": best_params}
```

## Response Format Optimization

### Structured Output
```python
class ResponseOptimizer:
    def enforce_json_output(self, prompt: str, schema: dict) -> str:
        schema_str = json.dumps(schema, indent=2)
        optimized = f"""
{prompt.strip()}

Respond ONLY with valid JSON matching this schema:
{schema_str}

JSON Response:
"""
        return optimized

    def enforce_enum_output(self, prompt: str, options: list[str]) -> str:
        options_str = ", ".join(options)
        return f"{prompt.strip()}\n\nChoose one: {options_str}\n\nAnswer:"

    def extract_structured(self, output: str, format: str) -> dict:
        if format == "json":
            json_match = re.search(r'\{.*\}', output, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        return {"raw": output}
```

## Context Window Optimization

```python
class ContextOptimizer:
    def __init__(self, max_context_tokens: int = 8000):
        self.max_tokens = max_context_tokens

    def optimize_context(self, context: str, query: str, model: str = "gpt-4") -> str:
        context_tokens = self.count_tokens(context)
        query_tokens = self.count_tokens(query)
        overhead = 500

        if context_tokens + query_tokens + overhead <= self.max_tokens:
            return context

        max_context = self.max_tokens - query_tokens - overhead
        return self._truncate_smart(context, max_context, model)

    def _truncate_smart(self, context: str, max_tokens: int, model: str) -> str:
        sections = context.split("\n\n")
        selected = []
        current_tokens = 0

        for section in sections:
            section_tokens = self.count_tokens(section, model)
            if current_tokens + section_tokens <= max_tokens:
                selected.append(section)
                current_tokens += section_tokens
            else:
                remaining = max_tokens - current_tokens
                if remaining > 50:
                    truncated = self.count_tokens(section[:remaining * 3], model)
                    selected.append(section[:truncated * 3])
                break

        return "\n\n".join(selected)

    def prioritize_context(self, context_sections: list[dict], query: str, max_tokens: int) -> list[dict]:
        scored = []
        for section in context_sections:
            relevance = self._compute_relevance(section["content"], query)
            scored.append((relevance, section))

        scored.sort(reverse=True)
        selected = []
        total_tokens = 0

        for relevance, section in scored:
            tokens = self.count_tokens(section["content"])
            if total_tokens + tokens <= max_tokens:
                selected.append(section)
                total_tokens += tokens

        return selected
```

## Latency Optimization

```python
class LatencyOptimizer:
    def __init__(self, model_fn):
        self.model = model_fn

    def measure_latency(self, prompt: str, n: int = 10) -> dict:
        latencies = []
        for _ in range(n):
            start = time.monotonic()
            self.model(prompt)
            latencies.append(time.monotonic() - start)

        return {
            "mean": statistics.mean(latencies),
            "p50": np.percentile(latencies, 50),
            "p95": np.percentile(latencies, 95),
            "p99": np.percentile(latencies, 99),
            "min": min(latencies),
            "max": max(latencies),
        }

    def optimize_for_latency(self, prompt: str, target_latency: float) -> str:
        current = self.measure_latency(prompt)["mean"]

        if current <= target_latency:
            return prompt

        strategies = [
            ("reduce_max_tokens", lambda p: self._set_max_tokens(p, 500)),
            ("simplify_instructions", lambda p: self._simplify(p)),
            ("remove_examples", lambda p: self._remove_examples(p)),
        ]

        optimized = prompt
        for name, strategy in strategies:
            optimized = strategy(optimized)
            latency = self.measure_latency(optimized)["mean"]
            if latency <= target_latency:
                return optimized

        return optimized
```

## Evaluation Metrics

```python
class PromptPerformanceReport:
    def generate(self, prompt: str, model_fn, test_cases: list[dict]) -> dict:
        latencies = []
        token_counts = []
        quality_scores = []

        for case in test_cases:
            start = time.monotonic()
            output = model_fn(prompt.format(**case))
            duration = time.monotonic() - start

            latencies.append(duration)
            token_counts.append(len(output.split()))
            quality_scores.append(case.get("eval_fn", lambda x: 1.0)(output))

        return {
            "latency": {
                "mean_ms": statistics.mean(latencies) * 1000,
                "p50_ms": np.percentile(latencies, 50) * 1000,
                "p95_ms": np.percentile(latencies, 95) * 1000,
            },
            "tokens": {
                "mean_output": statistics.mean(token_counts),
                "max_output": max(token_counts),
            },
            "quality": {
                "mean_score": statistics.mean(quality_scores),
                "min_score": min(quality_scores),
            },
            "cost_per_call": self._estimate_cost(prompt, statistics.mean(token_counts)),
        }
```

## Key Points
- Optimize system prompts to under 150 tokens without losing effectiveness
- Tune temperature per task type (0-0.3 deterministic, 0.7-1.0 creative)
- Enforce structured output formats for parseable results
- Prioritize context sections by relevance to the query
- Measure and optimize P50/P95 latency
- Target specific token budgets per prompt section
- Use grid search for parameter optimization
- Remove redundant instructions and examples
- Shorter prompts are faster and cheaper
- Monitor token efficiency ratio (output/input)
