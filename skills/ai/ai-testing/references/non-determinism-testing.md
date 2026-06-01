# Non-Determinism Testing for LLMs

## The Non-Determinism Problem

LLM outputs vary across invocations even with identical inputs. Sources of variance include:

| Source | Control Mechanism | Residual Variance |
|--------|------------------|-------------------|
| Sampling temperature | Set temperature=0.0 | Non-deterministic in practice (GPU, batching) |
| Random seed | Set seed explicitly | Framework-dependent; not all models support |
| Tokenizer | Fixed tokenizer | Identical |
| Model weights | Fixed checkpoint | Identical |
| Floating-point arithmetic | Same hardware/GPU type | ~0.1% output difference across runs |
| API load balancing | N/A (outside control) | Different model versions may serve requests |

### Implications for Testing

Traditional software testing assumes determinism: same input → same output → pass/fail is binary.
LLM testing must account for stochastic behavior by:
1. Running multiple samples per test case
2. Using statistical pass/fail criteria
3. Reporting confidence intervals alongside pass rates

## Statistical Testing Framework

### Bootstrap Confidence Intervals

```python
import numpy as np
from typing import Callable, Any

class NonDeterministicTester:
    def __init__(self, model_fn: Callable, n_samples: int = 10,
                 confidence_level: float = 0.95, bootstrap_iterations: int = 1000):
        self.model_fn = model_fn
        self.n_samples = n_samples
        self.confidence_level = confidence_level
        self.bootstrap_iterations = bootstrap_iterations

    async def test_with_confidence(self, input_text: str,
                                    assertion_fn: Callable[[str], bool]) -> dict:
        """Run N samples and compute bootstrap CI on pass rate."""

        outputs = await asyncio.gather(*[
            self.model_fn(input_text) for _ in range(self.n_samples)
        ])

        # Compute per-sample pass/fail
        passes = np.array([1 if assertion_fn(o) else 0 for o in outputs])
        observed_rate = passes.mean()

        # Bootstrap resampling
        bootstrap_rates = []
        rng = np.random.default_rng(seed=42)
        for _ in range(self.bootstrap_iterations):
            sample = rng.choice(passes, size=self.n_samples, replace=True)
            bootstrap_rates.append(sample.mean())

        bootstrap_rates = np.array(sorted(bootstrap_rates))

        # Percentile confidence interval
        alpha = 1 - self.confidence_level
        lower_idx = int(self.bootstrap_iterations * alpha / 2)
        upper_idx = int(self.bootstrap_iterations * (1 - alpha / 2))
        ci_lower = bootstrap_rates[lower_idx]
        ci_upper = bootstrap_rates[upper_idx]

        return {
            "input": input_text,
            "n_samples": self.n_samples,
            "pass_rate": observed_rate,
            "ci_lower": ci_lower,
            "ci_upper": ci_upper,
            "confidence_level": self.confidence_level,
            "all_outputs": outputs,
            "per_sample_passes": passes.tolist(),
            "stable_estimate": (ci_upper - ci_lower) < 0.3,
        }

    def required_samples_for_precision(self, target_margin: float = 0.05,
                                        assumed_rate: float = 0.9) -> int:
        """
        Calculate minimum samples needed for desired CI precision.
        Uses normal approximation: n = (z^2 * p * (1-p)) / margin^2
        """
        from scipy import stats
        z = stats.norm.ppf(1 - (1 - self.confidence_level) / 2)
        n = (z**2 * assumed_rate * (1 - assumed_rate)) / target_margin**2
        return int(np.ceil(n))
```

### Sequential Hypothesis Testing

Stop testing early when confident in pass/fail:

```python
class SequentialTester:
    def __init__(self, model_fn: Callable, alpha: float = 0.05, beta: float = 0.20,
                 h0_pass_rate: float = 0.85, h1_pass_rate: float = 0.95):
        self.model_fn = model_fn
        self.alpha = alpha  # Type I error (false positive)
        self.beta = beta    # Type II error (false negative)
        self.h0 = h0_pass_rate  # Null hypothesis: unacceptable quality
        self.h1 = h1_pass_rate  # Alternative hypothesis: acceptable quality

    async def test_sequentially(self, input_text: str, assertion_fn: Callable[[str], bool],
                                  max_samples: int = 50) -> dict:
        """
        SPRT (Sequential Probability Ratio Test) for LLM output quality.
        """
        import math

        passes = 0
        failures = 0
        log_ratio = 0.0

        # SPRT boundaries
        log_upper = math.log((1 - self.beta) / self.alpha)       # Accept H1
        log_lower = math.log(self.beta / (1 - self.alpha))       # Accept H0

        for i in range(1, max_samples + 1):
            output = await self.model_fn(input_text)
            if assertion_fn(output):
                passes += 1
            else:
                failures += 1

            # Log-likelihood ratio for Bernoulli
            n = passes + failures
            p_hat = passes / n if n > 0 else 0.5

            # H1: p = h1_pass_rate, H0: p = h0_pass_rate
            if passes > 0 and failures > 0:
                like_h1 = (self.h1**passes) * ((1 - self.h1)**failures)
                like_h0 = (self.h0**passes) * ((1 - self.h0)**failures)
                if like_h0 > 0:
                    log_ratio = math.log(like_h1 / like_h0)
                else:
                    log_ratio = float('inf')

            if log_ratio >= log_upper:
                return {
                    "decision": "ACCEPT",
                    "samples_used": n,
                    "pass_rate": p_hat,
                    "h0_rejected": True,
                    "confidence": 1 - self.alpha,
                }
            elif log_ratio <= log_lower:
                return {
                    "decision": "REJECT",
                    "samples_used": n,
                    "pass_rate": p_hat,
                    "h0_rejected": False,
                    "confidence": 1 - self.beta,
                }

        # Indecisive — fall back to standard test
        return {
            "decision": "INCONCLUSIVE",
            "samples_used": max_samples,
            "pass_rate": passes / max_samples,
            "recommendation": "increase max_samples or adjust thresholds",
        }
```

## Consistency Testing Strategy

### Output Stability Measurement

```python
class ConsistencyAnalyzer:
    def __init__(self, embedder):
        self.embedder = embedder

    async def measure_stability(self, model_fn: Callable, input_text: str,
                                 n_runs: int = 20) -> dict:
        """Measure output variance across multiple identical invocations."""

        outputs = await asyncio.gather(*[
            model_fn(input_text) for _ in range(n_runs)
        ])

        # Compute pairwise semantic similarity
        embeddings = await asyncio.gather(*[
            self.embedder.encode(o) for o in outputs
        ])

        similarities = []
        for i in range(len(embeddings)):
            for j in range(i + 1, len(embeddings)):
                sim = float(np.dot(embeddings[i], embeddings[j]) / (
                    np.linalg.norm(embeddings[i]) * np.linalg.norm(embeddings[j])
                ))
                similarities.append(sim)

        avg_similarity = np.mean(similarities)
        std_similarity = np.std(similarities)
        min_similarity = min(similarities)

        return {
            "n_runs": n_runs,
            "mean_pairwise_similarity": avg_similarity,
            "std_pairwise_similarity": std_similarity,
            "min_pairwise_similarity": min_similarity,
            "outputs": outputs,
            "stable": avg_similarity > 0.90 and min_similarity > 0.70,
        }

    async def test_rephrased_consistency(self, model_fn: Callable,
                                           query_variations: list[str]) -> dict:
        """
        Test that semantically equivalent inputs produce semantically
        equivalent outputs.
        """
        outputs = await asyncio.gather(*[
            model_fn(q) for q in query_variations
        ])

        embeddings = await asyncio.gather(*[
            self.embedder.encode(o) for o in outputs
        ])

        # All-pairs similarity
        n = len(outputs)
        similarities = np.zeros((n, n))
        for i in range(n):
            for j in range(n):
                sim = float(np.dot(embeddings[i], embeddings[j]) / (
                    np.linalg.norm(embeddings[i]) * np.linalg.norm(embeddings[j])
                ))
                similarities[i][j] = sim

        mean_sim = similarities[np.triu_indices(n, k=1)].mean()
        min_sim = similarities[np.triu_indices(n, k=1)].min()

        return {
            "query_variations": query_variations,
            "outputs": outputs,
            "mean_similarity": mean_sim,
            "min_similarity": min_sim,
            "consistency_matrix": similarities.tolist(),
            "consistent": mean_sim > 0.85 and min_sim > 0.70,
        }
```

## Hallucination Testing

### Groundedness Verification

```python
class HallucinationDetector:
    def __init__(self, nli_model=None, llm_judge=None):
        self.nli = nli_model  # Natural language inference model (e.g., TrueTeacher, NLI)
        self.judge = llm_judge

    async def check_groundedness(self, response: str, context: list[str]) -> dict:
        """
        Decompose response into atomic claims and verify each against context.
        """
        # Step 1: Decompose response into atomic claims
        claims = await self._decompose_claims(response)

        # Step 2: Verify each claim against context
        claim_results = []
        supported_count = 0
        for claim in claims:
            result = await self._verify_claim(claim, context)
            claim_results.append(result)
            if result["supported"]:
                supported_count += 1

        groundedness = supported_count / len(claims) if claims else 1.0

        return {
            "response": response,
            "num_claims": len(claims),
            "supported_claims": supported_count,
            "groundedness_score": groundedness,
            "hallucination_rate": 1 - groundedness,
            "claim_details": claim_results,
            "hallucinated": groundedness < 0.8,
        }

    async def _decompose_claims(self, response: str) -> list[str]:
        """Split response into atomic, verifiable claims."""
        prompt = f"""Split the following text into individual factual claims.
Each claim must be exactly one verifiable fact.
Return as a JSON list of strings.

Text: {response}"""
        result = await self.judge.generate(prompt)
        try:
            return json.loads(result)
        except (json.JSONDecodeError, TypeError):
            return [response]  # fallback: treat whole response as one claim

    async def _verify_claim(self, claim: str, context: list[str]) -> dict:
        """Verify a single claim against context documents."""
        if self.nli:
            return await self._verify_nli(claim, context)
        else:
            return await self._verify_llm_judge(claim, context)

    async def _verify_nli(self, claim: str, context: list[str]) -> dict:
        """Use NLI model to check entailment."""
        best_score = 0.0
        for doc in context:
            result = self.nli.predict(premise=doc, hypothesis=claim)
            score = result.get("entailment", 0)
            best_score = max(best_score, score)

        return {
            "claim": claim,
            "supported": best_score > 0.5,
            "score": best_score,
            "method": "nli",
        }

    async def _verify_llm_judge(self, claim: str, context: list[str]) -> dict:
        """Use LLM judge for groundedness check."""
        context_text = "\n\n".join(context)
        prompt = f"""Context:
{context_text}

Claim: {claim}

Is this claim fully supported by the context?
Answer with only YES or NO, then the confidence score (0.0-1.0)."""
        result = await self.judge.generate(prompt)
        supported = result.strip().upper().startswith("YES")
        return {
            "claim": claim,
            "supported": supported,
            "method": "llm_judge",
        }
```

## Reporting Non-Deterministic Test Results

### Statistical Report Template

```markdown
## Non-Determinism Test Report

### Summary
- Model: gpt-4o-2026-03-01
- Temperature: 0.7
- Samples per test: 10
- Total tests: 50

### Aggregated Results
| Metric | Value | CI (95%) | Stable? |
|--------|-------|----------|---------|
| Pass Rate | 0.88 | [0.82, 0.94] | ✅ |
| Pass Rate (P0) | 0.95 | [0.91, 0.99] | ✅ |
| Pass Rate (P1) | 0.81 | [0.73, 0.89] | ⚠️ |
| Mean Consistency | 0.92 | [0.89, 0.95] | ✅ |

### Tests with High Variance
| Test ID | Category | Pass Rate | CI Width | Recommendation |
|---------|----------|-----------|----------|----------------|
| fact-042 | factuality | 0.50 | 0.42 | Increase samples to 25 |
| safe-018 | safety | 0.70 | 0.35 | Review assertion threshold |
| fmt-009 | format | 0.60 | 0.38 | Strengthen schema validation |

### Action Items
- fact-042 requires more samples or a more robust assertion
- safe-018 threshold may be too tight — review edge cases
- fmt-009 suggests format instability — consider constrained decoding
```

## Mitigation Strategies

| Strategy | When to Use | Trade-off |
|----------|-------------|-----------|
| temperature=0.0 | Deterministic tests, factuality checks | May miss stochastic failure modes |
| Constrained decoding | JSON format, structured output | Requires model support; may reduce quality |
| Multiple samples + majority vote | Safety, consistency checks | 5-10x cost increase |
| Statistical pass threshold | Any non-deterministic test | Requires careful threshold calibration |
| Sequential testing | Cost-sensitive scenarios | More complex implementation |
| Consistency bounds | Open-ended generation | Requires embedding model |
| Prompt ensembling | High-stakes outputs | Increases latency and cost |

## Key Points
- LLM outputs are inherently non-deterministic — tests must account for variance
- Use bootstrap confidence intervals to quantify estimate reliability
- Sequential testing (SPRT) reduces cost by stopping early when confident
- Measure output stability across identical invocations (with temperature>0)
- Test rephrased consistency to ensure semantically equivalent inputs → equivalent outputs
- Decompose responses into atomic claims for hallucination detection
- Report confidence intervals alongside pass rates, not just binary pass/fail
- Tests with high variance need more samples or better assertions
- temperature=0.0 does NOT guarantee determinism across API deploys or GPU runs
- Use constrained decoding for structured outputs to reduce format variance
- Track per-test variance over time to detect model behavior shifts
- Balance sample size against cost — use sequential testing for budget efficiency
