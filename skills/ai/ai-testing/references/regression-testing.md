# Regression Testing for LLMs

## Regression Detection

### What Constitutes a Regression
- Metric drops below defined threshold (e.g., faithfulness < 0.85)
- Statistically significant decline vs baseline (p < 0.05)
- New failure mode in golden dataset
- Behavioral change on unrelated tasks (catastrophic forgetting)
- Latency increase >20% on P95

### Baseline Management
```yaml
baseline:
  model: "llama-3.1-70b-v1"
  dataset: "golden-v3.2.0"
  date: "2026-03-01"
  metrics:
    faithfulness: 0.93
    answer_relevance: 0.88
    context_precision: 0.82
    latency_p95_ms: 1800
```

## CI Integration

### PR Gate Pipeline
```yaml
name: LLM Regression Check
on: pull_request
jobs:
  regression:
    runs-on: [self-hosted]
    steps:
      - name: Run eval on PR branch
        run: eval-runner --dataset golden-v3 --candidate HEAD --output results.json

      - name: Compare with baseline
        run: |
          python compare.py \
            --baseline production-baseline.json \
            --candidate results.json \
            --threshold 0.95

      - name: Post results
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: regression-report.md

      - name: Block on regression
        if: failure()
        run: exit 1
```

### Comparison Script
```python
def detect_regression(baseline, candidate, threshold=0.95):
    regressions = []
    for metric in baseline["metrics"]:
        base_val = baseline["metrics"][metric]
        cand_val = candidate["metrics"][metric]
        ratio = cand_val / base_val if base_val > 0 else 1.0
        if ratio < threshold:
            regressions.append({
                "metric": metric,
                "baseline": base_val,
                "candidate": cand_val,
                "ratio": ratio,
            })
    return regressions
```

## Test Selection Strategy

### Fast vs Full Regression
```
Fast (every PR, ~2 min, ~$0.05):
  - 50 samples: golden + adversarial
  - Metrics: faithfulness, safety
  - Models: current candidate only

Full (nightly, ~15 min, ~$2.00):
  - 750 samples: all datasets
  - Metrics: all
  - Models: candidate vs production

Release (per deployment, ~30 min, ~$5.00):
  - Full dataset + human review
  - All metrics + manual spot-check
  - Summary sent to stakeholders
```

## Change Categorization

| Change Type | Regression Tests | Risk Level |
|-------------|-----------------|------------|
| Prompt update | Full eval | Low |
| Model swap (same tier) | Full eval | Medium |
| Model swap (different tier) | Full eval + human review | High |
| RAG pipeline change | Retrieval + full eval | Medium |
| Guardrail change | Safety + adversarial | Low |
| Infrastructure (latency) | Latency benchmarks | Medium |

## Root Cause Analysis

### When Regression Detected
```python
def analyze_regression(regressions, changelog):
    causes = []
    for reg in regressions:
        # Check timing
        related_changes = [
            c for c in changelog
            if c["timestamp"] > reg["first_detected"]
        ]
        causes.append({
            "metric": reg["metric"],
            "related_deployments": related_changes,
            "suspected_cause": isolate_cause(reg, related_changes),
        })
    return causes
```

### Common Root Causes
- Prompt template change introduced ambiguity
- Model update changed output style
- Embedding model update shifted retrieval results
- Chunking parameter change reduced context quality
- Guardrail update changed output verification

## Reporting

### Regression Report Template
```markdown
## Regression Report: PR #423

### Summary
- Baseline: production (v2.1.0)
- Candidate: PR #423 (model update)
- Dataset: golden-v3 (200 samples)

### Metrics Comparison
| Metric | Baseline | Candidate | Delta | Status |
|--------|----------|-----------|-------|--------|
| Faithfulness | 0.93 | 0.91 | -2.1% | ✅ Pass |
| Safety | 1.00 | 1.00 | 0% | ✅ Pass |
| Latency P95 | 1800ms | 2100ms | +16.7% | ⚠️ Warn |
| Format Compliance | 0.97 | 0.95 | -2.1% | ✅ Pass |

### Regressions Detected
- Latency P95 increased 16.7% (warning threshold: 20%)

### Recommendations
- Latency increase acceptable for quality improvement
- Proceed with deployment, monitor latency in production
```

## Monitoring Dashboard

Track these over time:
- Regression rate per deployment (rolling 30 days)
- Metrics trend lines with deployment annotations
- Model version comparison matrix
- Cost per regression test run

---

## Advanced Verification Architectures

### 1. Automated Test-Case Generation Patterns

To prevent overfitting to a static golden dataset, automated test-case generators dynamically mutate seeds to produce diverse test prompt distributions.

```python
import random
from typing import List, Dict

class PromptMutator:
    def __init__(self, llm):
        self.llm = llm

    def generate_adversarial_variants(self, seed_prompt: str, count: int = 5) -> List[str]:
        """Mutates a base prompt to produce semantically equivalent but stylistically adversarial variants."""
        prompt = f"""You are a QA automation model. Generate {count} semantically identical but stylistically diverse variants of the following prompt.
        Introduce common real-world user variations: typos, formatting changes, polite filler, direct constraints, or dialect shifts.
        
        Seed Prompt: "{seed_prompt}"
        
        Output format: JSON string list ONLY. E.g. ["variant 1", "variant 2"]
        """
        try:
            response = self.llm.invoke(prompt)
            variants = json.loads(response["content"])
            return list(set(variants + [seed_prompt]))
        except Exception:
            # Fallback simple mutations
            return [seed_prompt, f"{seed_prompt} Please.", f"Can you tell me: {seed_prompt.lower()}"]

    def generate_boundary_fuzzing(self, input_schema: Dict) -> List[str]:
        """Fuzzes inputs based on type schemas to find parsing vulnerabilities."""
        fuzzed_inputs = []
        if "properties" in input_schema:
            for key, prop in input_schema["properties"].items():
                if prop["type"] == "string":
                    fuzzed_inputs.append(f"{{{key}: ''}}") # Empty string
                    fuzzed_inputs.append(f"{{{key}: '{'A' * 10000}'}}") # Buffer overflow simulation
                    fuzzed_inputs.append(f"{{{key}: 'Select * From Users; --'}}") # Injection attempt
                elif prop["type"] == "number":
                    fuzzed_inputs.append(f"{{{key}: -1}}")
                    fuzzed_inputs.append(f"{{{key}: 9999999999}}")
        return fuzzed_inputs
```

---

### 2. Mock Architecture for LLM APIs

A mock server must intercept and simulate LLM provider responses reliably during local/CI regression suites without incurring token costs or network jitter.

```python
import json
import asyncio
from typing import AsyncGenerator, Dict, Any

class MockLLMAPI:
    def __init__(self):
        self.route_registry = {}
        self.rate_limit_triggered = False

    def register_mock_response(self, prompt_fingerprint: str, response_payload: Dict[str, Any]):
        self.route_registry[prompt_fingerprint] = response_payload

    async def mock_chat_completion(self, request_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Simulates standard HTTP response behavior including failures and latencies."""
        if self.rate_limit_triggered:
            # Simulate a 429 Rate Limit
            return {"status_code": 429, "error": "Rate limit exceeded. Try again in 5s."}
            
        messages = request_payload.get("messages", [])
        last_message = messages[-1]["content"] if messages else ""
        
        # Exact match or fallback containment match
        response = self.route_registry.get(last_message)
        if not response:
            for pattern, payload in self.route_registry.items():
                if pattern in last_message:
                    response = payload
                    break
                    
        if not response:
            response = {"content": "Default mock fallback response.", "tokens": 10, "cost": 0.0001}
            
        # Simulate standard network latency
        await asyncio.sleep(request_payload.get("simulated_latency", 0.1))
        return {
            "status_code": 200,
            "choices": [{"message": {"role": "assistant", "content": response["content"]}}],
            "usage": {"total_tokens": response.get("tokens", 15)}
        }

    async def mock_token_stream(self, request_payload: Dict[str, Any]) -> AsyncGenerator[Dict[str, Any], None]:
        """Simulates SSE streaming chunks for token delivery metrics validation."""
        response_text = "This is a mocked stream of content delivery."
        words = response_text.split()
        
        for i, word in enumerate(words):
            yield {
                "id": f"chatcmpl-{i}",
                "choices": [{"delta": {"content": word + " "}, "finish_reason": None}]
            }
            await asyncio.sleep(0.05) # Simulate chunk spacing
        yield {"choices": [{"delta": {}, "finish_reason": "stop"}]}
```

---

### 3. Regression Testing for Stochastic Systems

Because LLM generation is probabilistic, minor output variations are common. To distinguish between natural variance and a true regression, use statistical threshold testing.

```python
import math
from typing import List

class StochasticEvaluator:
    @staticmethod
    def calculate_pass_rate(results: List[bool]) -> float:
        if not results:
            return 0.0
        return sum(1 for r in results if r) / len(results)

    @staticmethod
    def run_chi_squared_test(baseline_passes: int, baseline_fails: int, 
                             candidate_passes: int, candidate_fails: int) -> float:
        """Calculates p-value using a 2x2 contingency table Chi-Squared test.
        Determines if candidate performance degradation is statistically significant (p < 0.05).
        """
        n1 = baseline_passes + baseline_fails
        n2 = candidate_passes + candidate_fails
        total = n1 + n2
        if total == 0:
            return 1.0
            
        total_passes = baseline_passes + candidate_passes
        total_fails = baseline_fails + candidate_fails
        
        # Expected frequencies
        e_b_pass = (n1 * total_passes) / total
        e_b_fail = (n1 * total_fails) / total
        e_c_pass = (n2 * total_passes) / total
        e_c_fail = (n2 * total_fails) / total
        
        # Compute Chi-Squared value
        chi_sq = 0.0
        for obs, exp in [
            (baseline_passes, e_b_pass), (baseline_fails, e_b_fail),
            (candidate_passes, e_c_pass), (candidate_fails, e_c_fail)
        ]:
            if exp > 0:
                chi_sq += ((obs - exp) ** 2) / exp
                
        # 1 Degree of freedom critical value lookup (approximation of p-value)
        # Critical value 3.841 maps to p=0.05. If chi_sq > 3.841, reject null hypothesis.
        return chi_sq

    @staticmethod
    def evaluate_significance(baseline_results: List[bool], candidate_results: List[bool]) -> bool:
        """Returns True if candidate degradation is a statistically significant regression."""
        b_passes = sum(1 for r in baseline_results if r)
        b_fails = len(baseline_results) - b_passes
        c_passes = sum(1 for r in candidate_results if r)
        c_fails = len(candidate_results) - c_passes
        
        b_rate = b_passes / max(1, len(baseline_results))
        c_rate = c_passes / max(1, len(candidate_results))
        
        # We only care if candidate is worse than baseline
        if c_rate >= b_rate:
            return False
            
        chi_val = StochasticEvaluator.run_chi_squared_test(b_passes, b_fails, c_passes, c_fails)
        # 3.841 represents the 95% confidence threshold (p = 0.05)
        return chi_val > 3.841
```

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->

