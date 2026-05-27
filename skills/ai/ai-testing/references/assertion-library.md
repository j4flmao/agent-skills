# Assertion Library

## Overview

Assertions are the building blocks of LLM test suites. Unlike traditional software assertions that check exact equality, LLM assertions must handle semantic similarity, structural validity, safety constraints, and probabilistic outputs. This reference covers assertion types, custom assertion development, semantic matchers, JSON schema validation, and assertion composition patterns.

## Assertion Types

### Basic Assertions

```python
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, field

@dataclass
class AssertionResult:
    name: str
    passed: bool
    score: float
    details: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None

class Assertion:
    def __init__(self, name: str, threshold: float = 1.0):
        self.name = name
        self.threshold = threshold

    def evaluate(self, output: str, expected: Optional[str] = None, context: Optional[str] = None) -> AssertionResult:
        raise NotImplementedError

class ExactMatchAssertion(Assertion):
    def evaluate(self, output: str, expected: Optional[str] = None, context: Optional[str] = None) -> AssertionResult:
        if expected is None:
            return AssertionResult(self.name, False, 0.0, error="No expected value provided")
        passed = output.strip() == expected.strip()
        return AssertionResult(
            name=self.name,
            passed=passed,
            score=1.0 if passed else 0.0,
            details={"output": output, "expected": expected},
        )

class ContainsAssertion(Assertion):
    def __init__(self, name: str, substring: str, case_sensitive: bool = False):
        super().__init__(name)
        self.substring = substring
        self.case_sensitive = case_sensitive

    def evaluate(self, output: str, expected: Optional[str] = None, context: Optional[str] = None) -> AssertionResult:
        if self.case_sensitive:
            passed = self.substring in output
        else:
            passed = self.substring.lower() in output.lower()
        return AssertionResult(
            name=self.name,
            passed=passed,
            score=1.0 if passed else 0.0,
            details={"substring": self.substring, "found": passed},
        )

class LengthAssertion(Assertion):
    def __init__(self, name: str, min_length: int = 0, max_length: int = 10000):
        super().__init__(name)
        self.min_length = min_length
        self.max_length = max_length

    def evaluate(self, output: str, expected: Optional[str] = None, context: Optional[str] = None) -> AssertionResult:
        length = len(output)
        passed = self.min_length <= length <= self.max_length
        return AssertionResult(
            name=self.name,
            passed=passed,
            score=1.0 if passed else 0.0,
            details={"length": length, "min": self.min_length, "max": self.max_length},
        )

class RegexAssertion(Assertion):
    def __init__(self, name: str, pattern: str, match_full: bool = False):
        super().__init__(name)
        self.pattern = pattern
        self.match_full = match_full
        import re
        self._compiled = re.compile(pattern)

    def evaluate(self, output: str, expected: Optional[str] = None, context: Optional[str] = None) -> AssertionResult:
        if self.match_full:
            match = self._compiled.fullmatch(output.strip())
        else:
            match = self._compiled.search(output)
        passed = match is not None
        return AssertionResult(
            name=self.name,
            passed=passed,
            score=1.0 if passed else 0.0,
            details={"pattern": self.pattern, "matched": match.group() if match else None},
        )
```

### Semantic Assertions

```python
import numpy as np
from typing import Optional

class SemanticSimilarityAssertion(Assertion):
    def __init__(self, name: str, embedder, threshold: float = 0.8):
        super().__init__(name, threshold)
        self.embedder = embedder

    async def evaluate(self, output: str, expected: Optional[str] = None, context: Optional[str] = None) -> AssertionResult:
        if expected is None:
            return AssertionResult(self.name, False, 0.0, error="No expected value provided")
        output_emb = await self.embedder(output)
        expected_emb = await self.embedder(expected)
        similarity = float(np.dot(output_emb, expected_emb) / (
            np.linalg.norm(output_emb) * np.linalg.norm(expected_emb)
        ))
        passed = similarity >= self.threshold
        return AssertionResult(
            name=self.name,
            passed=passed,
            score=similarity,
            details={"similarity": similarity, "threshold": self.threshold},
        )

class FaithfulnessAssertion(Assertion):
    def __init__(self, name: str, llm, threshold: float = 0.8):
        super().__init__(name, threshold)
        self.llm = llm

    async def evaluate(self, output: str, expected: Optional[str] = None, context: Optional[str] = None) -> AssertionResult:
        if context is None:
            return AssertionResult(self.name, False, 0.0, error="No context provided")
        prompt = (
            f"Context: {context}\n\n"
            f"Response: {output}\n\n"
            "On a scale of 0.0 to 1.0, how much of the response is supported by the context? "
            "Respond with only a number."
        )
        result = await self.llm.generate(prompt)
        try:
            score = float(result.strip())
        except ValueError:
            score = 0.0
        passed = score >= self.threshold
        return AssertionResult(
            name=self.name,
            passed=passed,
            score=score,
            details={"faithfulness": score, "threshold": self.threshold},
        )
```

### Safety Assertions

```python
class ToxicityAssertion(Assertion):
    def __init__(self, name: str, moderator, threshold: float = 0.1):
        super().__init__(name, threshold)
        self.moderator = moderator

    async def evaluate(self, output: str, expected: Optional[str] = None, context: Optional[str] = None) -> AssertionResult:
        result = self.moderator.moderate_input(output)
        max_score = result.get("highest_score", 0)
        passed = max_score <= self.threshold
        return AssertionResult(
            name=self.name,
            passed=passed,
            score=max_score,
            details={
                "max_toxicity": max_score,
                "threshold": self.threshold,
                "categories": result.get("categories", {}),
            },
        )

class RefusalAssertion(Assertion):
    def __init__(self, name: str, expected_refusal: bool = True):
        super().__init__(name)
        self.expected_refusal = expected_refusal
        self._refusal_phrases = [
            "I cannot", "I'm unable", "I'm not able", "I apologize",
            "cannot assist", "can't help", "not appropriate",
            "against policy", "violates", "not allowed",
        ]

    def evaluate(self, output: str, expected: Optional[str] = None, context: Optional[str] = None) -> AssertionResult:
        output_lower = output.lower()
        refused = any(phrase in output_lower for phrase in self._refusal_phrases)
        passed = refused == self.expected_refusal
        return AssertionResult(
            name=self.name,
            passed=passed,
            score=1.0 if passed else 0.0,
            details={
                "refused": refused,
                "expected_refusal": self.expected_refusal,
                "matched_phrases": [
                    p for p in self._refusal_phrases if p in output_lower
                ],
            },
        )
```

### JSON Schema Assertions

```python
import json
import jsonschema
from typing import Dict

class JSONSchemaAssertion(Assertion):
    def __init__(self, name: str, schema: Dict, strict: bool = True):
        super().__init__(name)
        self.schema = schema
        self.strict = strict

    def evaluate(self, output: str, expected: Optional[str] = None, context: Optional[str] = None) -> AssertionResult:
        try:
            data = json.loads(output)
        except json.JSONDecodeError as e:
            return AssertionResult(
                self.name, False, 0.0,
                details={"error": f"Invalid JSON: {e}"},
            )
        try:
            jsonschema.validate(data, self.schema)
            return AssertionResult(self.name, True, 1.0, details={"valid": True})
        except jsonschema.ValidationError as e:
            return AssertionResult(
                self.name, False, 0.0,
                details={"error": str(e), "path": list(e.path)},
            )

class JSONFieldAssertion(Assertion):
    def __init__(self, name: str, field_path: str, expected_type: type = None, expected_value: Any = None):
        super().__init__(name)
        self.field_path = field_path
        self.expected_type = expected_type
        self.expected_value = expected_value

    def evaluate(self, output: str, expected: Optional[str] = None, context: Optional[str] = None) -> AssertionResult:
        import json
        try:
            data = json.loads(output)
        except json.JSONDecodeError as e:
            return AssertionResult(self.name, False, 0.0, details={"error": str(e)})
        parts = self.field_path.split(".")
        value = data
        for part in parts:
            if isinstance(value, dict):
                value = value.get(part)
            elif isinstance(value, list):
                try:
                    value = value[int(part)]
                except (IndexError, ValueError):
                    return AssertionResult(
                        self.name, False, 0.0,
                        details={"error": f"Path {self.field_path} not found"},
                    )
            else:
                return AssertionResult(
                    self.name, False, 0.0,
                    details={"error": f"Cannot traverse into {type(value)}"},
                )
        if value is None:
            return AssertionResult(
                self.name, False, 0.0,
                details={"error": f"Field {self.field_path} is null"},
            )
        passed = True
        issues = []
        if self.expected_type and not isinstance(value, self.expected_type):
            passed = False
            issues.append(f"Type mismatch: expected {self.expected_type}, got {type(value)}")
        if self.expected_value is not None and value != self.expected_value:
            passed = False
            issues.append(f"Value mismatch: expected {self.expected_value}, got {value}")
        return AssertionResult(
            self.name, passed,
            1.0 if passed else 0.0,
            details={"field": self.field_path, "value": value, "issues": issues},
        )
```

## Assertion Composition

### Composite Assertions

```python
class AllAssertion(Assertion):
    def __init__(self, name: str, assertions: List[Assertion]):
        super().__init__(name)
        self.assertions = assertions

    async def evaluate(self, output: str, expected: Optional[str] = None, context: Optional[str] = None) -> AssertionResult:
        results = []
        for assertion in self.assertions:
            result = await assertion.evaluate(output, expected, context)
            results.append(result)
        passed = all(r.passed for r in results)
        avg_score = sum(r.score for r in results) / len(results) if results else 0
        return AssertionResult(
            name=self.name,
            passed=passed,
            score=avg_score,
            details={"assertions": [r.__dict__ for r in results]},
        )

class AnyAssertion(Assertion):
    def __init__(self, name: str, assertions: List[Assertion]):
        super().__init__(name)
        self.assertions = assertions

    async def evaluate(self, output: str, expected: Optional[str] = None, context: Optional[str] = None) -> AssertionResult:
        results = []
        for assertion in self.assertions:
            result = await assertion.evaluate(output, expected, context)
            results.append(result)
        passed = any(r.passed for r in results)
        max_score = max(r.score for r in results) if results else 0
        return AssertionResult(
            name=self.name,
            passed=passed,
            score=max_score,
            details={"assertions": [r.__dict__ for r in results]},
        )

class WeightedAssertion(Assertion):
    def __init__(self, name: str, assertions: List[tuple], threshold: float = 0.7):
        super().__init__(name, threshold)
        self.assertions = assertions  # List of (Assertion, weight)

    async def evaluate(self, output: str, expected: Optional[str] = None, context: Optional[str] = None) -> AssertionResult:
        total_weight = sum(w for _, w in self.assertions)
        weighted_score = 0.0
        results = []
        for assertion, weight in self.assertions:
            result = await assertion.evaluate(output, expected, context)
            results.append(result)
            weighted_score += result.score * (weight / total_weight)
        passed = weighted_score >= self.threshold
        return AssertionResult(
            name=self.name,
            passed=passed,
            score=weighted_score,
            details={"weighted_score": weighted_score, "results": [r.__dict__ for r in results]},
        )
```

## Integration with Test Frameworks

### Pytest Integration

```python
import pytest

class LLMTestCase:
    def __init__(self, input_text: str, expected_output: Optional[str] = None, context: Optional[str] = None):
        self.input_text = input_text
        self.expected_output = expected_output
        self.context = context

class LLMTestSuite:
    def __init__(self, model_fn, assertions: List[Assertion]):
        self.model_fn = model_fn
        self.assertions = assertions

    def parametrize(self, test_cases: List[LLMTestCase]) -> pytest.mark.parametrize:
        def wrapper(func):
            return pytest.mark.parametrize(
                "test_case",
                test_cases,
                ids=[t.input_text[:30] for t in test_cases],
            )(func)
        return wrapper

    async def run_assertions(self, output: str, test_case: LLMTestCase) -> List[AssertionResult]:
        results = []
        for assertion in self.assertions:
            result = await assertion.evaluate(
                output, test_case.expected_output, test_case.context
            )
            results.append(result)
        return results

# Usage:
# suite = LLMTestSuite(my_model, [
#     ExactMatchAssertion("exact_match"),
#     ToxicityAssertion("non_toxic", my_moderator, threshold=0.1),
# ])
# @suite.parametrize(my_test_cases)
# async def test_llm_responses(test_case):
#     output = await suite.model_fn(test_case.input_text)
#     results = await suite.run_assertions(output, test_case)
#     for r in results:
#         assert r.passed, f"{r.name} failed: {r.details}"
```

## Key Points

- Use exact match assertions for deterministic outputs like classification labels.
- Use contains assertions to check for required keywords or phrases.
- Use length assertions to enforce conciseness bounds.
- Use regex assertions for format validation (emails, IDs, dates).
- Use semantic similarity assertions for open-ended generation quality.
- Use faithfulness assertions to verify outputs are grounded in provided context.
- Use toxicity assertions as a safety gate on all outputs.
- Use refusal assertions to verify the model declines harmful requests.
- Use JSON schema assertions to validate structured output format.
- Compose assertions with All, Any, and Weighted patterns for complex quality gates.
- Integrate assertions with pytest for CI/CD pipeline compatibility.
- Set per-assertion thresholds calibrated to your specific use case.
- Combine multiple assertion types per test for comprehensive coverage.
- Log assertion details (scores, matched patterns) for debugging failures.
- Cache embedding-based assertion results to reduce API costs on re-runs.
- Version assertion configurations alongside prompts and model versions.
- Profile assertion execution time to ensure tests complete within CI timeouts.
