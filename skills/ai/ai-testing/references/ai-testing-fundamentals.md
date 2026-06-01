# AI Testing Fundamentals

## Overview

AI/LLM testing differs fundamentally from traditional software testing. Outputs are probabilistic, non-deterministic, and context-dependent. This reference covers the foundational taxonomy, test type design, golden dataset principles, and evaluation methodology specific to LLM systems.

## LLM Testing Taxonomy

### Test Dimensions

| Dimension | What It Measures | Why It's Unique to LLMs |
|-----------|-----------------|------------------------|
| Factuality | Information correctness against ground truth | LLMs hallucinate — traditional software returns deterministic results |
| Safety | Harmful, biased, toxic, or policy-violating output | LLMs can generate novel harmful content not explicitly programmed |
| Consistency | Output stability across semantically equivalent inputs | Traditional software is deterministic; LLMs vary per invocation |
| Format | Structural compliance (JSON, schema, regex) | LLM structured output requires parsing — fragile without guarantees |
| Robustness | Graceful handling of edge cases (empty, adversarial, long inputs) | LLMs are sensitive to input perturbations in ways traditional code isn't |
| Latency | Response time distribution (P50, P95, P99) | LLM inference has higher variance than traditional API calls |
| Cost | Token consumption per query, per test run | LLM testing directly consumes API budget — costs scale linearly with test count |

### Priority Taxonomy

```
P0 (Gate — 100% required, blocks deployment)
├── Factuality: Core knowledge, business-critical facts
├── Safety: Refusal on harmful inputs, toxicity limits, bias bounds
└── Format: Critical structured outputs (payment parsing, medical codes)

P1 (Quality — ≥90% pass rate, blocks if below threshold)
├── Consistency: Top-K query groups with rephrased variants
├── Robustness: Edge cases, adversarial inputs, out-of-distribution queries
└── Format: Non-critical structured outputs

P2 (Monitor — tracked, non-blocking, trend-alerted)
├── Latency: P50/P95/P99 thresholds per model
├── Style: Tone, verbosity, persona adherence
└── Cost: Token efficiency per output category
```

## Golden Dataset Design Principles

### Dataset Composition

```
Golden Dataset
├── Core (60%): Highest-value, most-frequent production queries
│   ├── Factuality: Ground-truth verifiable statements
│   └── Safety: Known attack vectors, policy boundaries
├── Edge (20%): Boundary conditions, corner cases
│   ├── Empty / minimal input
│   ├── Very long input (>4K tokens)
│   ├── Special characters, Unicode, mixed scripts
│   └── Adversarial: jailbreak attempts, prompt injection
└── Drift (20%): Recent production samples refreshed per cycle
    ├── New query patterns from logs
    └── Regression-failing cases from previous runs
```

### Ground Truth Labeling Requirements

Every golden dataset entry must include:

```python
@dataclass
class GoldenExample:
    input: str
    expected_output: str | None  # None for safety/refusal tests
    category: Literal["factuality", "safety", "format", "consistency", "robustness"]
    priority: Literal["P0", "P1", "P2"]
    difficulty: Literal["easy", "medium", "hard"]
    source: Literal["human_curated", "production_sampled", "synthetic", "adversarial"]
    context: dict | None  # Retrieved documents, system prompt, conversation history
    tags: list[str]
    created_at: str  # ISO 8601
    superseded_by: str | None  # Version chain for test evolution
```

### Dataset Quality Gates

```python
def validate_golden_dataset(examples: list[GoldenExample]) -> dict:
    checks = {}

    # Minimum size
    checks["min_size"] = len(examples) >= 100

    # Category balance — no category < 10% or > 50%
    cats = Counter(e.category for e in examples)
    total = len(examples)
    checks["category_balance"] = all(
        0.1 <= count/total <= 0.5 for count in cats.values()
    )

    # Input uniqueness — no duplicate or near-duplicate inputs
    inputs = [e.input.strip().lower() for e in examples]
    checks["input_uniqueness"] = len(set(inputs)) / len(inputs) > 0.95

    # Freshness — at least 10% from last 30 days
    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
    recent = sum(1 for e in examples if e.created_at >= thirty_days_ago)
    checks["freshness"] = recent / total >= 0.1

    # Label consistency — all required fields populated
    missing = sum(1 for e in examples if e.expected_output is None and e.category != "safety")
    checks["label_completeness"] = missing == 0

    return checks
```

## Assertion Strategies for Probabilistic Outputs

### Assertion Type Selection by Output Type

| Output Type | Recommended Assertion | Rationale |
|-------------|---------------------|-----------|
| Classification label | ExactMatch | Deterministic expected value |
| Extractive QA | Contains / SemanticSimilarity | Multiple valid phrasings |
| Summarization | Faithfulness | Must be grounded in source |
| JSON structured output | JSONSchema + FieldAssertion | Structural + value constraints |
| Open-ended generation | LLM-as-Judge | Best automated proxy for quality |
| Code generation | CompileCheck + FunctionalTest | Executable verification |
| Refusal | RefusalAssertion | Phrase-based + semantic check |

### Statistical Assertion Pattern

For non-deterministic outputs, run N queries and assert on aggregate:

```python
class StatisticalAssertion:
    def __init__(self, name: str, sample_size: int = 5, min_pass_rate: float = 0.8):
        self.name = name
        self.sample_size = sample_size
        self.min_pass_rate = min_pass_rate

    async def evaluate(self, model_fn, input_text: str, assertion_fn) -> AssertionResult:
        outputs = await asyncio.gather(*[
            model_fn(input_text) for _ in range(self.sample_size)
        ])
        passes = sum(1 for o in outputs if assertion_fn(o))
        pass_rate = passes / self.sample_size
        return AssertionResult(
            name=self.name,
            passed=pass_rate >= self.min_pass_rate,
            score=pass_rate,
            details={
                "sample_size": self.sample_size,
                "passes": passes,
                "pass_rate": pass_rate,
                "threshold": self.min_pass_rate,
                "outputs": outputs,
            },
        )
```

## Evaluation Metrics Taxonomy

### Automated Metrics

| Metric | What It Captures | When To Use | Pitfall |
|--------|-----------------|-------------|---------|
| BLEU | N-gram overlap with reference | Translation, short-form generation | Penalizes valid paraphrasing |
| ROUGE-L | Longest common subsequence | Summarization | Misses semantic equivalence |
| BERTScore | Token-level cosine similarity with BERT embeddings | Any text generation | Biased toward BERT-like models |
| METEOR | Unigram precision/recall with synonym matching | Translation | Requires synonym tables |
| Perplexity | Model confidence in its own output | Language modeling quality | Cannot measure factual accuracy |

### LLM-as-Judge Metrics

| Judge Type | Prompt Template Style | Best For |
|------------|----------------------|----------|
| Pointwise | "Score 1-5: accuracy, relevance, completeness" | Absolute quality scoring |
| Pairwise | "Which response is better? A or B?" | Model comparison, A/B testing |
| Multi-turn | "Did the assistant correctly reference conversation history?" | Conversational agents |
| Rubric-based | Structured criteria with explicit scoring guidelines | Reducing judge variance |

```python
class LLMJudge:
    def __init__(self, judge_model, rubric: str | None = None):
        self.judge = judge_model
        self.rubric = rubric

    async def score_accuracy(self, query: str, response: str, context: str) -> float:
        prompt = f"""Evaluate the accuracy of this response given the context.

Context: {context}
Query: {query}
Response: {response}

Is every statement in the response supported by the context?
Score from 0.0 (no support) to 1.0 (fully supported).
Respond with only a number between 0 and 1."""

        result = await self.judge.generate(prompt)
        return self._parse_score(result)

    async def score_pairwise(self, query: str, response_a: str, response_b: str) -> str:
        prompt = f"""Which response is better for the query?

Query: {query}
Response A: {response_a}
Response B: {response_b}

Consider: accuracy, completeness, safety, clarity.
Reply with ONLY "A", "B", or "TIE"."""

        result = await self.judge.generate(prompt)
        return result.strip().upper()

    def _parse_score(self, text: str) -> float:
        try:
            return float(text.strip()[:4])
        except ValueError:
            return 0.0
```

## Test Fixture and Environment Management

### Model Client Fixtures

```python
import pytest_asyncio

@pytest_asyncio.fixture
async def model_client(request):
    """Fixture that provides model client with configurable temperature."""
    model_name = getattr(request, "param", "gpt-4o")
    temperature = 0.0  # deterministic for testing
    client = ModelClient(model_name, temperature=temperature)
    yield client
    await client.close()

@pytest_asyncio.fixture(params=[0.0, 0.7, 1.0])
async def model_with_temperature(request):
    """Parameterized fixture to test model behavior at different temperatures."""
    client = ModelClient("gpt-4o-mini", temperature=request.param)
    yield client
    await client.close()
```

### Test Isolation Requirements

- **Stateless model calls**: Each test must produce the same output given the same input (use temperature=0.0 for deterministic tests)
- **No shared state between tests**: Use fresh model client per test or per module
- **Context isolation**: Each test case supplies its own context/retrieval documents
- **Rate limit handling**: Implement retry with backoff in model client, not in test logic
- **Test data immutability**: Golden datasets must not be modified during test execution

## Common Anti-Patterns

### Testing on Training Data
Using examples that appear in the model's training data as golden tests. The model may have memorized these, producing inflated pass rates that don't reflect real performance.

**Mitigation**: Maintain a held-out set of never-before-seen examples. Cross-reference against known training data contamination benchmarks.

### Overfitting to the Eval Set
Iterating on prompt/model changes solely to improve golden dataset scores without measuring generalization.

**Mitigation**: Hold a blind test set (20% of golden) that is never examined during iteration. Only reveal scores at release time.

### Ignoring Edge Cases
Only testing "happy path" queries (e.g., "What is the capital of France?") while ignoring boundary conditions.

**Mitigation**: Maintain a dedicated edge case collection. Test empty input, very long input (>4K tokens), Unicode injection, adversarial prompts, out-of-distribution topics.

### Single-Temperature Testing
Testing only at temperature=0.0, missing the quality degradation that appears at higher temperatures.

**Mitigation**: Run critical tests at temperature=0.0 for reproducibility AND at temperature≥0.7 for robustness.

### Using LLM-as-Judge Without Calibration
Using a judge model to score outputs without validating that the judge agrees with human evaluators.

**Mitigation**: Run a calibration study: have both judge model and humans score 100 examples. Measure Cohen's kappa. Only deploy judge if κ ≥ 0.6.

## Key Points
- LLM testing requires probabilistic, not deterministic, assertion strategies
- Golden datasets must balance coverage, freshness, and category distribution
- Every test needs category, priority, threshold, and source metadata
- Use statistical assertions (N-samples with pass-rate threshold) for non-deterministic outputs
- Calibrate LLM-as-Judge against human raters before relying on automated scores
- Test at multiple temperatures to capture stochastic behavior
- Never iterate on held-out test data — maintain a blind eval set
- Track assertion latency vs model latency separately for CI timeout planning
- Version golden datasets with semantic versioning tied to prompt/model releases
- Automate dataset quality gates (size, balance, freshness, uniqueness) in CI
