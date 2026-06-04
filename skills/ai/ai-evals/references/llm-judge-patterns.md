# LLM-as-Judge Patterns

## Overview

Using an LLM to evaluate another LLM's output is one of the most flexible and scalable evaluation approaches. This reference covers judge configuration, prompt design, bias mitigation, validation, and production deployment patterns for LLM-as-judge systems.

## Judge Prompt Design

### Structured Scoring Rubric

```python
JUDGE_PROMPT_TEMPLATE = """You are an expert evaluator. Assess the quality of the AI response based on the following criteria.

## Input
Query: {query}

## Response to Evaluate
{response}

## Reference Context
{context}

## Evaluation Criteria
Score each criterion from 1-5:

1. **Accuracy** (1-5): Is every claim in the response supported by the context? No hallucinations.
   - 1: Multiple unsupported claims
   - 3: Mostly accurate with minor issues
   - 5: Perfectly accurate, all claims supported

2. **Relevance** (1-5): Does the response directly address the user's query?
   - 1: Completely off-topic
   - 3: Partially addresses the query
   - 5: Directly answers the query with no extraneous information

3. **Completeness** (1-5): Does the response cover all aspects of the query?
   - 1: Missing critical information
   - 3: Covers main points, misses details
   - 5: Thoroughly addresses all aspects

4. **Conciseness** (1-5): Is the response appropriately brief?
   - 1: Excessively verbose
   - 3: Some unnecessary detail
   - 5: Concise while maintaining completeness

## Output Format
Return a JSON object with scores and brief justifications:
{{
  "accuracy": {{"score": 5, "justification": "..."}},
  "relevance": {{"score": 5, "justification": "..."}},
  "completeness": {{"score": 5, "justification": "..."}},
  "conciseness": {{"score": 5, "justification": "..."}},
  "overall_score": 5.0,
  "critical_issues": []
}}"""

class JudgePrompt:
    def __init__(self, template: str = JUDGE_PROMPT_TEMPLATE):
        self.template = template

    def format(self, query: str, response: str, context: str = "") -> str:
        return self.template.format(query=query, response=response, context=context)
```

### Binary Pass/Fail Judge

```python
BINARY_JUDGE_TEMPLATE = """You are a quality gate evaluator. Determine if the following response passes quality standards.

Query: {query}
Response: {response}

Pass Criteria (ALL must be true):
1. The response is factually accurate based on available knowledge
2. The response directly answers the query
3. The response contains no contradictions
4. The response is not harmful or offensive
5. The response is in the correct language

Fail Criteria (ANY triggers failure):
1. Contains factual errors or hallucinations
2. Does not answer the question asked
3. Contains internal contradictions
4. Contains harmful, biased, or offensive content
5. Uses wrong language or format

Respond with exactly one word: PASS or FAIL
"""

class BinaryJudge:
    def __init__(self, llm):
        self.llm = llm
        self.template = BINARY_JUDGE_TEMPLATE

    async def evaluate(self, query: str, response: str) -> dict:
        prompt = self.template.format(query=query, response=response)
        result = await self.llm.generate(prompt)
        result = result.strip().upper()
        return {
            "passed": result == "PASS",
            "verdict": result,
        }

    async def evaluate_batch(self, pairs: list) -> list:
        import asyncio
        tasks = [self.evaluate(q, r) for q, r in pairs]
        return await asyncio.gather(*tasks)
```

## Judge Configuration

### Selecting Judge Models

```python
class JudgeSelector:
    def __init__(self):
        self.judge_options = {
            "gpt-4o": {"cost_per_call": 0.002, "accuracy": 0.95, "speed_ms": 500},
            "gpt-4o-mini": {"cost_per_call": 0.0002, "accuracy": 0.88, "speed_ms": 200},
            "claude-sonnet": {"cost_per_call": 0.003, "accuracy": 0.94, "speed_ms": 600},
            "llama-3-70b": {"cost_per_call": 0.0005, "accuracy": 0.85, "speed_ms": 400},
        }

    def recommend_judge(self, accuracy_requirement: float = 0.9, budget: float = 0.001) -> str:
        candidates = [
            (name, cfg) for name, cfg in self.judge_options.items()
            if cfg["accuracy"] >= accuracy_requirement and cfg["cost_per_call"] <= budget
        ]
        if not candidates:
            candidates = [
                (name, cfg) for name, cfg in self.judge_options.items()
                if cfg["accuracy"] >= accuracy_requirement * 0.9
            ]
        candidates.sort(key=lambda x: (-x[1]["accuracy"], x[1]["cost_per_call"]))
        return candidates[0][0] if candidates else "gpt-4o-mini"

    def estimate_batch_cost(self, num_calls: int, judge: str) -> float:
        cfg = self.judge_options.get(judge, self.judge_options["gpt-4o-mini"])
        return num_calls * cfg["cost_per_call"]
```

### Judge Temperature and Sampling

```python
class JudgeSamplingConfig:
    def __init__(self, temperature: float = 0.0, top_p: float = 1.0, seed: int = 42):
        self.temperature = temperature
        self.top_p = top_p
        self.seed = seed

    def to_kwargs(self) -> dict:
        return {
            "temperature": self.temperature,
            "top_p": self.top_p,
            "seed": self.seed,
        }

def create_judge_llm(model: str = "gpt-4o", config: JudgeSamplingConfig = None):
    from langchain_openai import ChatOpenAI
    config = config or JudgeSamplingConfig()
    return ChatOpenAI(
        model=model,
        **config.to_kwargs(),
    )
```

## Bias Mitigation

### Position Bias

```python
import random
from typing import List, Dict

class PositionBiasMitigator:
    def __init__(self, llm):
        self.llm = llm

    async def compare_pairwise(self, query: str, response_a: str, response_b: str) -> Dict:
        results = []
        for _ in range(2):
            if random.random() < 0.5:
                verdict = await self._judge_pair(query, response_a, response_b)
                results.append({
                    "winner": "A" if verdict == "A" else "B",
                    "loser": "B" if verdict == "A" else "A",
                })
            else:
                verdict = await self._judge_pair(query, response_b, response_a)
                results.append({
                    "winner": "B" if verdict == "A" else "A",
                    "loser": "A" if verdict == "A" else "B",
                })
        consistent = results[0]["winner"] == results[1]["winner"]
        return {
            "winner": results[0]["winner"] if consistent else "TIE",
            "consistent": consistent,
            "rounds": results,
        }

    async def _judge_pair(self, query: str, first: str, second: str) -> str:
        prompt = (
            f"Query: {query}\n\n"
            f"Response A: {first}\n\n"
            f"Response B: {second}\n\n"
            "Which response is better? Answer with exactly 'A' or 'B'."
        )
        result = await self.llm.generate(prompt)
        return result.strip().upper()
```

### Self-Consistency Scoring

```python
class SelfConsistencyJudge:
    def __init__(self, llm, num_samples: int = 3):
        self.llm = llm
        self.num_samples = num_samples

    async def evaluate(self, query: str, response: str) -> Dict:
        scores = []
        for i in range(self.num_samples):
            prompt = (
                f"Rate this response on a scale of 1-5.\n"
                f"Query: {query}\nResponse: {response}\nScore:"
            )
            result = await self.llm.generate(prompt)
            try:
                score = float(result.strip())
                scores.append(max(1, min(5, score)))
            except ValueError:
                continue
        if not scores:
            return {"score": None, "consistency": 0.0}
        import statistics
        return {
            "mean_score": statistics.mean(scores),
            "median_score": statistics.median(scores),
            "std_dev": statistics.stdev(scores) if len(scores) > 1 else 0,
            "consistency": 1.0 - (statistics.stdev(scores) / 4.0 if len(scores) > 1 else 0),
            "num_samples": len(scores),
        }
```

### Calibration Against Human Annotations

```python
from typing import List, Tuple

class JudgeCalibrator:
    def __init__(self):
        self.human_scores: List[float] = []
        self.judge_scores: List[float] = []

    def add_pair(self, human_score: float, judge_score: float):
        self.human_scores.append(human_score)
        self.judge_scores.append(judge_score)

    def agreement_rate(self, tolerance: float = 1.0) -> float:
        if not self.human_scores:
            return 0.0
        agreements = sum(
            1 for h, j in zip(self.human_scores, self.judge_scores)
            if abs(h - j) <= tolerance
        )
        return agreements / len(self.human_scores)

    def correlation(self) -> float:
        if len(self.human_scores) < 2:
            return 0.0
        import statistics
        h_mean = statistics.mean(self.human_scores)
        j_mean = statistics.mean(self.judge_scores)
        h_std = statistics.stdev(self.human_scores)
        j_std = statistics.stdev(self.judge_scores)
        if h_std == 0 or j_std == 0:
            return 0.0
        cov = sum(
            (h - h_mean) * (j - j_mean)
            for h, j in zip(self.human_scores, self.judge_scores)
        ) / len(self.human_scores)
        return cov / (h_std * j_std)

    def judge_quality_report(self) -> Dict:
        return {
            "agreement_rate": self.agreement_rate(),
            "strict_agreement": self.agreement_rate(0.5),
            "correlation": self.correlation(),
            "human_vs_judge_bias": sum(self.judge_scores) / len(self.judge_scores) -
                                   sum(self.human_scores) / len(self.human_scores) if self.judge_scores else 0,
            "num_pairs": len(self.human_scores),
        }
```

## Advanced Judge Patterns

### Chain-of-Thought Judging

```python
COT_JUDGE_TEMPLATE = """Evaluate the following response step by step.

Query: {query}
Response: {response}

Think through each criterion:

1. First, identify the main claims in the response.
2. Check each claim against known facts.
3. Determine if the response fully addresses the query.
4. Check for any omissions or unnecessary content.
5. Provide your reasoning for each criterion.

After your analysis, provide your final scores as JSON:
{{"accuracy": 1-5, "relevance": 1-5, "completeness": 1-5, "conciseness": 1-5}}
"""

class CoTJudge:
    def __init__(self, llm):
        self.llm = llm

    async def evaluate(self, query: str, response: str) -> Dict:
        prompt = COT_JUDGE_TEMPLATE.format(query=query, response=response)
        result = await self.llm.generate(prompt)
        import re, json
        json_match = re.search(r'\{.*\}', result, re.DOTALL)
        if json_match:
            try:
                scores = json.loads(json_match.group())
                scores["overall"] = sum(scores.values()) / len(scores)
                scores["reasoning"] = result[:json_match.start()].strip()
                return scores
            except json.JSONDecodeError:
                pass
        return {"error": "Failed to parse scores", "raw": result}
```

### Multi-Judge Consensus

```python
class MultiJudgeConsensus:
    def __init__(self, judges: List):
        self.judges = judges

    async def evaluate(self, query: str, response: str) -> Dict:
        import asyncio
        tasks = [j.evaluate(query, response) for j in self.judges]
        results = await asyncio.gather(*tasks)
        scores = []
        for r in results:
            if "overall_score" in r:
                scores.append(r["overall_score"])
            elif "mean_score" in r:
                scores.append(r["mean_score"])
        if not scores:
            return {"error": "No valid scores from any judge"}
        import statistics
        return {
            "mean": statistics.mean(scores),
            "median": statistics.median(scores),
            "std_dev": statistics.stdev(scores) if len(scores) > 1 else 0,
            "min": min(scores),
            "max": max(scores),
            "num_judges": len(scores),
            "consensus": statistics.mean(scores) >= 3.5,
        }
```

### Factual Consistency Checking

```python
from typing import List

class FactualConsistencyJudge:
    def __init__(self, llm):
        self.llm = llm

    async def extract_claims(self, text: str) -> List[str]:
        prompt = (
            "Extract each factual claim from the following text as a separate bullet point. "
            "List only verifiable claims, not opinions.\n\n" + text
        )
        result = await self.llm.generate(prompt)
        return [
            line.strip("- • ").strip()
            for line in result.split("\n")
            if line.strip().startswith(("-", "•"))
        ]

    async def verify_claim(self, claim: str, context: str) -> Dict:
        prompt = (
            f"Context: {context}\n\n"
            f"Claim: {claim}\n\n"
            "Is this claim supported by the context? Answer: SUPPORTED, CONTRADICTED, or "
            "NOT ENOUGH INFORMATION. Then explain why."
        )
        result = await self.llm.generate(prompt)
        if "SUPPORTED" in result.upper():
            verdict = "supported"
        elif "CONTRADICTED" in result.upper():
            verdict = "contradicted"
        else:
            verdict = "unsupported"
        return {"claim": claim, "verdict": verdict, "explanation": result}

    async def evaluate(self, response: str, context: str) -> Dict:
        claims = await self.extract_claims(response)
        import asyncio
        verifications = await asyncio.gather(*[
            self.verify_claim(c, context) for c in claims
        ])
        total = len(verifications)
        supported = sum(1 for v in verifications if v["verdict"] == "supported")
        contradicted = sum(1 for v in verifications if v["verdict"] == "contradicted")
        return {
            "total_claims": total,
            "supported": supported,
            "contradicted": contradicted,
            "unsupported": total - supported - contradicted,
            "consistency_rate": supported / total if total > 0 else 1.0,
            "claims": verifications,
        }
```

## Production Deployment

### Caching Judge Results

```python
import hashlib
import json
from typing import Optional

class JudgeCache:
    def __init__(self, backend=None, ttl: int = 86400):
        self.backend = backend or {}
        self.ttl = ttl

    def _key(self, query: str, response: str, rubric: str) -> str:
        raw = f"{query}||{response}||{rubric}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def get(self, query: str, response: str, rubric: str) -> Optional[Dict]:
        key = self._key(query, response, rubric)
        if self.backend and key in self.backend:
            return self.backend[key]
        return None

    def set(self, query: str, response: str, rubric: str, result: Dict):
        key = self._key(query, response, rubric)
        self.backend[key] = result
```

### Batch Judge Processing

```python
import asyncio
from typing import List, Dict

class BatchJudgeProcessor:
    def __init__(self, judge, llm, batch_size: int = 10, max_concurrency: int = 5):
        self.judge = judge
        self.llm = llm
        self.batch_size = batch_size
        self.semaphore = asyncio.Semaphore(max_concurrency)

    async def evaluate_many(self, items: List[Dict]) -> List[Dict]:
        results = []
        for i in range(0, len(items), self.batch_size):
            batch = items[i:i + self.batch_size]
            async with self.semaphore:
                tasks = [
                    self.judge.evaluate(item["query"], item["response"], item.get("context", ""))
                    for item in batch
                ]
                batch_results = await asyncio.gather(*tasks)
                results.extend(batch_results)
        return results

    async def evaluate_stream(self, items: List[Dict]) -> asyncio.AsyncIterator[Dict]:
        for item in items:
            async with self.semaphore:
                result = await self.judge.evaluate(
                    item["query"], item["response"], item.get("context", "")
                )
                yield result
```

### Judge Monitoring

```python
class JudgeMonitor:
    def __init__(self):
        self.call_log: List[Dict] = []
        self.agreement_tracker = JudgeCalibrator()

    def log_call(self, query: str, judge: str, score: float, latency_ms: float):
        self.call_log.append({
            "query": query[:100],
            "judge": judge,
            "score": score,
            "latency_ms": latency_ms,
            "timestamp": __import__("time").time(),
        })

    def average_latency(self) -> float:
        if not self.call_log:
            return 0.0
        return sum(c["latency_ms"] for c in self.call_log) / len(self.call_log)

    def score_distribution(self) -> Dict:
        if not self.call_log:
            return {}
        scores = [c["score"] for c in self.call_log]
        import statistics
        return {
            "mean": statistics.mean(scores),
            "median": statistics.median(scores),
            "min": min(scores),
            "max": max(scores),
        }

    def drift_detection(self, window_size: int = 100) -> Optional[str]:
        if len(self.call_log) < window_size * 2:
            return None
        recent = self.call_log[-window_size:]
        older = self.call_log[-(window_size * 2):-window_size]
        recent_avg = sum(c["score"] for c in recent) / len(recent)
        older_avg = sum(c["score"] for c in older) / len(older)
        drift = abs(recent_avg - older_avg)
        if drift > 0.5:
            return f"Judge drift detected: {older_avg:.2f} -> {recent_avg:.2f}"
        return None
```

## Key Points

- Always use temperature 0.0 for judge LLMs to ensure deterministic scoring.
- Validate judge accuracy against human annotations before relying on automated scores.
- Mitigate position bias by randomizing response order in pairwise comparisons.
- Use self-consistency scoring with multiple samples when high precision is needed.
- Chain-of-thought judging improves accuracy by forcing explicit reasoning before scoring.
- Multi-judge consensus reduces individual judge bias and variance.
- Cache judge results for identical (query, response) pairs to reduce costs.
- Batch judge calls for throughput but respect concurrency limits.
- Monitor judge score distributions over time to detect drift.
- Always provide a structured scoring rubric — vague instructions produce unreliable scores.
- Extract and verify individual claims for fine-grained hallucination detection.
- Use a stronger model to judge a weaker one; never use the same model as both.
- Run calibration studies with human annotators quarterly to maintain quality.
- Log all judge decisions with scores, latency, and model version for audit trails.
- Consider cost-quality tradeoffs when selecting judge models for different evaluation tiers.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with Langchain-OpenAI, self-consistency scoring, and bias calibration.
-->
