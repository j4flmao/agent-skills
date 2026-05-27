# Testing Framework Comparison

## Overview
LLM testing frameworks provide assertion libraries, metric computation, dataset management, and CI/CD integration. Choosing the right framework depends on your testing needs: unit testing, regression testing, safety testing, or continuous evaluation.

## Framework Comparison Matrix

| Feature | DeepEval | RAGAS | LangChain Test | PromptFoo | Giskard |
|---------|----------|-------|----------------|-----------|---------|
| Unit Testing | ✅ pytest | ❌ | ✅ | ✅ | ✅ |
| Assertions | ✅ 15+ types | ❌ | ⚠️ limited | ✅ custom | ⚠️ |
| Metrics | ✅ 10+ | ✅ 5+ | ✅ 3+ | ✅ 8+ | ✅ 12+ |
| Datasets | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| CI/CD | ✅ native | ⚠️ manual | ⚠️ manual | ✅ CLI | ✅ CLI |
| LLM Judge | ✅ built-in | ❌ | ❌ | ✅ | ✅ |
| Safety | ✅ toxicity | ❌ | ❌ | ✅ | ✅ bias |
| Cost | Free | Free | Free | OSS+Cloud | OSS+Cloud |

## DeepEval

### Core Setup
```python
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    HallucinationMetric,
    ToxicityMetric,
    BiasMetric,
)

test_case = LLMTestCase(
    input="What is machine learning?",
    actual_output="Machine learning is a subset of AI...",
    retrieval_context=["Machine learning involves training models on data..."],
    expected_output="Machine learning is a field of study...",
)

def test_answer_relevancy():
    metric = AnswerRelevancyMetric(threshold=0.7)
    assert_test(test_case, [metric])

def test_faithfulness():
    metric = FaithfulnessMetric(threshold=0.8)
    assert_test(test_case, [metric])

def test_safety():
    safety_metrics = [
        ToxicityMetric(threshold=0.1),
        BiasMetric(threshold=0.3),
    ]
    assert_test(test_case, safety_metrics)
```

### Custom Metrics
```python
from deepeval.metrics import BaseMetric

class CustomFormatMetric(BaseMetric):
    def __init__(self, expected_format: str = "json", threshold: float = 0.8):
        self.expected_format = expected_format
        self.threshold = threshold
        super().__init__()

    def measure(self, test_case: LLMTestCase) -> float:
        output = test_case.actual_output
        if self.expected_format == "json":
            try:
                json.loads(output)
                self.score = 1.0
            except json.JSONDecodeError:
                self.score = 0.0
        elif self.expected_format == "xml":
            self.score = 1.0 if output.startswith("<") and output.endswith(">") else 0.0
        else:
            self.score = 0.5
        return self.score

    def is_successful(self) -> bool:
        return self.score >= self.threshold

    @property
    def __name__(self):
        return "Format Compliance"
```

## RAGAS

### RAG-Specific Metrics
```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
    context_entity_recall,
    answer_similarity,
    answer_correctness,
)

from datasets import Dataset

dataset = Dataset.from_dict({
    "question": ["What is attention mechanism?"],
    "answer": ["Attention allows models to focus on relevant parts..."],
    "contexts": [["Attention is a mechanism that assigns weights to inputs..."]],
    "ground_truth": ["The attention mechanism enables neural networks..."],
})

def evaluate_rag():
    result = evaluate(
        dataset,
        metrics=[
            faithfulness,
            answer_relevancy,
            context_precision,
            context_recall,
            answer_correctness,
        ],
    )
    return result.to_pandas()
```

## PromptFoo

### Red Team Testing
```javascript
// promptfooconfig.yaml
redteam:
  plugins:
    - adversarial-text
    - prompt-injection
    - jailbreak
    - excessive-agency
    - hallucination
  strategies:
    - basic
    - leetspeak
    - rot13
    - base64
  numTests: 100

targets:
  - id: openai:gpt-4o
    label: production-model
  - id: openai:gpt-4o-mini
    label: fallback-model

prompts:
  - "You are a helpful assistant. Answer: {{query}}"
  - file://prompts/system_with_guardrails.txt

tests:
  - vars:
      query: "What are the latest Q3 results?"
    assert:
      - type: contains-all
        value:
          - "Q3"
          - "revenue"
      - type: latency
        threshold: 5000
```

## Giskard

### Model Scan
```python
import giskard as gsk

def model_predict_fn(df):
    return [llm_response(q) for q in df["question"]]

model = gsk.Model(
    model_predict_fn,
    model_type="text_generation",
    name="My LLM",
    description="Q&A model for internal docs",
)

scanner = gsk.scanner(model)

# Scan for vulnerabilities
report = scanner.run()
report.to_html("scan_report.html")

# Create test suite
test_suite = gsk.Suite(
    tests=[
        gsk.test_harness_test(
            input_vars={"question": "What is the return policy?"},
            expected_output="30 days",
        ),
        gsk.test_robustness_test(
            perturbation="typo",
            input_vars={"question": "What is retrn policy?"},
        ),
    ]
)
test_suite.run(model)
```

## Framework Selection Guide

### By Use Case

| Use Case | Recommended Framework | Reason |
|----------|----------------------|--------|
| Unit testing LLM outputs | DeepEval | pytest-native, rich assertions |
| RAG pipeline evaluation | RAGAS | Specialized RAG metrics |
| Rapid prototyping | LangChain Test | No extra dependencies |
| Red teaming | PromptFoo | Built-in attack generation |
| Regression testing | DeepEval + CI | Dataset versioning |
| Production monitoring | Giskard | Continuous scanning |
| Safety compliance | DeepEval + Giskard | Broadest coverage |

### Integration Example
```python
# Multi-framework integration
class ComprehensiveTester:
    def __init__(self):
        self.frameworks = {
            "unit": DeepEvalTester(),
            "rag": RagasTester(),
            "safety": PromptFooRunner(),
            "scan": GiskardScanner(),
        }

    def run_all(self, model_fn, test_data: dict) -> dict:
        results = {}
        for name, tester in self.frameworks.items():
            try:
                results[name] = tester.run(model_fn, test_data)
            except Exception as e:
                results[name] = {"error": str(e), "passed": False}
        return results
```

## Key Points
- DeepEval best for pytest-native unit testing with rich assertions
- RAGAS specialized for RAG system evaluation
- PromptFoo best for red teaming and adversarial testing
- Giskard for comprehensive vulnerability scanning
- Most frameworks support custom metrics
- CI/CD integration is critical — choose frameworks with CLI support
- Consider cost: DeepEval is fully free, PromptFoo has cloud tiers
- Framework supports evaluation types (unit, regression, safety) differ
- Start with one framework, add others for specific needs
- All frameworks support LLM-as-judge for automated evaluation
