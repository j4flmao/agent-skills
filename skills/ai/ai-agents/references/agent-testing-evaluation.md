# Agent Testing and Evaluation

## Overview

Testing AI agents is fundamentally different from testing traditional software. Agents are nondeterministic, interact with external systems, and produce variable outputs. This reference covers testing methodologies, simulation environments, evaluation metrics, and CI/CD integration for agent systems.

## Testing Levels

### Unit Testing Individual Components

Test tools, memory systems, and routing logic in isolation.

```python
import pytest
from unittest.mock import AsyncMock, patch

async def test_tool_schema_validation():
    tool = SearchTool()
    with pytest.raises(ValueError, match="query is required"):
        await tool.execute(query="")

async def test_memory_add_and_retrieve():
    mem = ConversationMemory(max_turns=5)
    mem.add_message("user", "Hello")
    mem.add_message("assistant", "Hi there")
    context = mem.get_context()
    assert len(context) == 2
    assert context[0]["role"] == "user"
    assert context[0]["content"] == "Hello"

async def test_memory_window_truncation():
    mem = ConversationMemory(max_turns=3)
    for i in range(10):
        mem.add_message("user", f"Message {i}")
        mem.add_message("assistant", f"Response {i}")
    context = mem.get_context()
    assert len(context) <= 6  # 3 turns = 6 messages

async def test_entity_extraction():
    mem = EntityMemory()
    mem.update("John Smith works on the API Project")
    assert "John Smith" in mem.entities
    assert mem.entities["John Smith"]["mentions"] == 1
    mem.update("John Smith prefers Python")
    assert mem.entities["John Smith"]["mentions"] == 2
```

### Integration Testing Tool Interactions

```python
import pytest_asyncio

@pytest.mark.integration
async def test_tool_with_real_api():
    tool = WeatherTool(api_key="test_key")
    result = await tool.execute(location="London")
    assert "temperature" in result
    assert isinstance(result["temperature"], (int, float))

@pytest.mark.integration
async def test_memory_with_redis():
    mem = RedisConversationMemory("redis://localhost:6379/1")
    await mem.add_message("test-session", "user", "Hello")
    messages = await mem.get_messages("test-session")
    assert len(messages) == 1
    assert messages[0]["role"] == "user"
    await mem.clear_session("test-session")
    messages = await mem.get_messages("test-session")
    assert len(messages) == 0
```

### Agent-Level Behavioral Testing

Test the agent's decision-making and tool selection.

```python
class MockLLM:
    def __init__(self, responses: List[str]):
        self.responses = responses
        self.call_count = 0

    async def generate(self, prompt: str) -> str:
        response = self.responses[self.call_count]
        self.call_count += 1
        return response

class MockTool:
    def __init__(self, name: str, result: str = "success"):
        self.name = name
        self.result = result
        self.call_count = 0

    async def execute(self, **kwargs):
        self.call_count += 1
        return self.result

async def test_agent_selects_correct_tool():
    search_tool = MockTool("search", "found results")
    calc_tool = MockTool("calculator", "42")
    llm = MockLLM([
        '{"thought": "I should search", "action": "search", "action_input": {"query": "meaning of life"}}',
        '{"thought": "I have the answer", "final_answer": "42"}',
    ])
    agent = ReActAgent(llm, [search_tool, calc_tool], max_iterations=3)
    result = await agent.run("What is the meaning of life?")
    assert search_tool.call_count == 1
    assert calc_tool.call_count == 0

async def test_agent_recovers_from_tool_error():
    failing_tool = MockTool("search")
    failing_tool.execute = AsyncMock(side_effect=Exception("API unavailable"))
    llm = MockLLM([
        '{"thought": "I will search", "action": "search", "action_input": {"query": "test"}}',
        '{"thought": "Search failed, I should try again", "action": "search", "action_input": {"query": "test"}}',
        '{"thought": "Giving up", "final_answer": "Could not find results"}',
    ])
    agent = ReActAgent(llm, [failing_tool], max_iterations=3)
    result = await agent.run("test query")
    assert "Could not" in result

async def test_agent_terminates_at_max_iterations():
    search_tool = MockTool("search", "results")
    responses = []
    for i in range(5):
        responses.append(
            '{"thought": "search again", "action": "search", "action_input": {"query": "test"}}'
        )
    responses.append('{"thought": "done", "final_answer": "done"}')
    llm = MockLLM(responses)
    agent = ReActAgent(llm, [search_tool], max_iterations=3)
    result = await agent.run("loop test")
    assert "max iterations" in result.lower() or "terminate" in result.lower()
```

## Simulation Environments

### Conversation Simulator

```python
import random
from typing import List, Dict, Callable, Optional

class UserSimulator:
    def __init__(self, scenarios: List[Dict]):
        self.scenarios = scenarios
        self.current_scenario = 0

    async def generate_user_input(self, agent_response: str) -> str:
        scenario = self.scenarios[self.current_scenario % len(self.scenarios)]
        turn = scenario["turns"].pop(0) if scenario["turns"] else "finish"
        if turn == "finish":
            self.current_scenario += 1
        return turn

class ScenarioRunner:
    def __init__(self, agent, user_sim: UserSimulator):
        self.agent = agent
        self.user_sim = user_sim

    async def run(self) -> Dict:
        turns = []
        user_input = "start"
        while user_input != "finish":
            agent_output = await self.agent.run(user_input)
            turns.append({"user": user_input, "agent": agent_output})
            user_input = await self.user_sim.generate_user_input(agent_output)
        return {
            "turns": turns,
            "total_turns": len(turns),
            "tool_calls": self.agent.total_tool_calls,
        }
```

### Stateful Environment for Multi-Turn Testing

```python
class AgentTestHarness:
    def __init__(self, agent, tools: Dict[str, Callable]):
        self.agent = agent
        self.tools = tools
        self.state = {"conversation": [], "tool_calls": []}

    async def run_turn(self, user_input: str) -> str:
        self.state["conversation"].append({"role": "user", "content": user_input})
        response = await self.agent.run(user_input)
        self.state["conversation"].append({"role": "assistant", "content": response})
        return response

    def get_tool_call_count(self, tool_name: str) -> int:
        return sum(1 for tc in self.state["tool_calls"] if tc["tool"] == tool_name)

    def assert_tool_was_called(self, tool_name: str):
        assert self.get_tool_call_count(tool_name) > 0, f"{tool_name} was never called"

    def assert_tool_call_count(self, tool_name: str, expected: int):
        actual = self.get_tool_call_count(tool_name)
        assert actual == expected, f"{tool_name} called {actual} times, expected {expected}"

    def reset(self):
        self.state = {"conversation": [], "tool_calls": []}
        self.agent.reset()
```

### Property-Based Testing for Agents

```python
from hypothesis import given, strategies as st, settings

@given(
    st.lists(
        st.text(min_size=1, max_size=200),
        min_size=1,
        max_size=10,
    )
)
@settings(max_examples=50)
async def test_agent_never_raises_on_any_input(messages):
    agent = create_test_agent()
    for msg in messages:
        try:
            result = await agent.run(msg)
            assert isinstance(result, str)
            assert len(result) > 0
        except Exception as e:
            pytest.fail(f"Agent raised on input '{msg[:50]}': {e}")

@given(
    st.dictionaries(
        st.text(min_size=1, max_size=20),
        st.text(min_size=1, max_size=100),
        min_size=1,
        max_size=5,
    )
)
@settings(max_examples=50)
async def test_agent_handles_varying_tool_inputs(tool_inputs):
    tool = FlexibleTool()
    for key, value in tool_inputs.items():
        result = await tool.execute(**{key: value})
        assert result is not None
```

## Evaluation Metrics

### Task Completion Metrics

```python
from dataclasses import dataclass

@dataclass
class TaskCompletionResult:
    task_id: str
    completed: bool
    turns_taken: int
    tool_calls: int
    errors: List[str]
    duration_ms: float
    expected_turns: Optional[int] = None
    expected_tool_calls: Optional[int] = None

class TaskCompletionEvaluator:
    def __init__(self):
        self.results: List[TaskCompletionResult] = []

    def add_result(self, result: TaskCompletionResult):
        self.results.append(result)

    def success_rate(self) -> float:
        if not self.results:
            return 0.0
        completed = sum(1 for r in self.results if r.completed)
        return completed / len(self.results)

    def average_turns(self) -> float:
        if not self.results:
            return 0.0
        return sum(r.turns_taken for r in self.results) / len(self.results)

    def efficiency_score(self) -> float:
        scored = []
        for r in self.results:
            if r.expected_turns and r.expected_tool_calls:
                turn_ratio = r.expected_turns / max(r.turns_taken, 1)
                call_ratio = r.expected_tool_calls / max(r.tool_calls, 1)
                scored.append((turn_ratio + call_ratio) / 2)
        return sum(scored) / len(scored) if scored else 0.0

    def summary(self) -> Dict:
        return {
            "total_tasks": len(self.results),
            "success_rate": self.success_rate(),
            "avg_turns": self.average_turns(),
            "efficiency": self.efficiency_score(),
            "total_errors": sum(len(r.errors) for r in self.results),
        }
```

### Output Quality Metrics

```python
class OutputQualityEvaluator:
    def __init__(self, llm_evaluator):
        self.llm = llm_evaluator

    async def evaluate_relevance(self, query: str, response: str) -> float:
        prompt = (
            f"Rate the relevance of this response to the query on a scale of 0-10.\n"
            f"Query: {query}\nResponse: {response}\nScore:"
        )
        result = await self.llm.generate(prompt)
        try:
            return float(result.strip()) / 10.0
        except ValueError:
            return 0.5

    async def evaluate_accuracy(self, expected: str, actual: str) -> float:
        prompt = (
            f"Compare the actual response to the expected answer. "
            f"Rate accuracy 0-10.\n"
            f"Expected: {expected}\nActual: {actual}\nScore:"
        )
        result = await self.llm.generate(prompt)
        try:
            return float(result.strip()) / 10.0
        except ValueError:
            return 0.5

    async def evaluate_hallucination(self, context: str, response: str) -> float:
        prompt = (
            f"Does the response contain information not supported by the context? "
            f"Rate hallucination 0-10 (0=none, 10=severe).\n"
            f"Context: {context}\nResponse: {response}\nScore:"
        )
        result = await self.llm.generate(prompt)
        try:
            return float(result.strip()) / 10.0
        except ValueError:
            return 0.5
```

### Latency and Cost Metrics

```python
import time
from contextlib import contextmanager
from typing import List, Dict

class AgentProfiler:
    def __init__(self):
        self.calls: List[Dict] = []

    @contextmanager
    def profile(self, operation: str):
        start = time.perf_counter()
        yield
        duration = time.perf_counter() - start
        self.calls.append({"operation": operation, "duration_ms": duration * 1000})

    def average_latency(self) -> float:
        if not self.calls:
            return 0.0
        return sum(c["duration_ms"] for c in self.calls) / len(self.calls)

    def p95_latency(self) -> float:
        if not self.calls:
            return 0.0
        sorted_calls = sorted(self.calls, key=lambda c: c["duration_ms"])
        idx = int(len(sorted_calls) * 0.95)
        return sorted_calls[idx]["duration_ms"]

    def total_cost(self, token_cost_map: Dict[str, float]) -> float:
        cost = 0.0
        for c in self.calls:
            model = c.get("model", "default")
            tokens = c.get("tokens", 0)
            cost += tokens * token_cost_map.get(model, 0.0001)
        return cost
```

## CI/CD Integration

### Test Matrix for Agent Pipelines

```yaml
# .github/workflows/agent-tests.yml
name: Agent Tests
on: [push, pull_request]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: pytest tests/unit/ -v --timeout=30

  integration:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - run: pytest tests/integration/ -v --timeout=60 -m integration

  simulation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: python -m pytest tests/simulation/ -v --timeout=300
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

  evaluation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: python scripts/run_evaluation.py --output evaluation-report.json
      - uses: actions/upload-artifact@v4
        with:
          name: evaluation-report
          path: evaluation-report.json
```

### Automated Regression Detection

```python
import json
from typing import Dict, List

class RegressionDetector:
    def __init__(self, baseline_path: str):
        with open(baseline_path) as f:
            self.baseline: Dict = json.load(f)

    def check_regression(self, current: Dict, thresholds: Dict) -> List[str]:
        issues = []
        for metric, threshold in thresholds.items():
            baseline_val = self.baseline.get(metric, 0)
            current_val = current.get(metric, 0)
            if baseline_val > 0:
                change = (current_val - baseline_val) / baseline_val
                if change < -threshold:
                    issues.append(
                        f"{metric} dropped by {abs(change)*100:.1f}% "
                        f"(baseline={baseline_val:.3f}, current={current_val:.3f})"
                    )
        return issues

    def update_baseline(self, results: Dict, path: str):
        with open(path, "w") as f:
            json.dump(results, f, indent=2)
```

## Traceability and Observability

### Structured Logging for Agent Behavior

```python
import structlog
from datetime import datetime

logger = structlog.get_logger()

class AgentLogger:
    def log_thought(self, agent_id: str, thought: str):
        logger.info("agent.thought", agent_id=agent_id, thought=thought)

    def log_action(self, agent_id: str, tool: str, inputs: Dict):
        logger.info("agent.action", agent_id=agent_id, tool=tool, inputs=inputs)

    def log_observation(self, agent_id: str, tool: str, output: str):
        logger.info("agent.observation", agent_id=agent_id, tool=tool, output=output[:500])

    def log_error(self, agent_id: str, error: str, context: Dict):
        logger.error("agent.error", agent_id=agent_id, error=error, context=context)

    def log_termination(self, agent_id: str, reason: str, turns: int, cost: float):
        logger.info("agent.termination",
            agent_id=agent_id, reason=reason, turns=turns, cost=cost)
```

### Trace Export for Debugging

```python
from opentelemetry import trace
from opentelemetry.trace import SpanKind

tracer = trace.get_tracer(__name__)

class AgentTracer:
    @contextmanager
    def trace_turn(self, agent_id: str, user_input: str):
        with tracer.start_as_current_span(
            f"agent.{agent_id}",
            kind=SpanKind.CLIENT,
            attributes={
                "agent.id": agent_id,
                "user.input": user_input[:500],
            },
        ) as span:
            yield span

    def trace_tool_call(self, parent_span, tool: str, inputs: Dict, output: str):
        with tracer.start_as_current_span(
            f"tool.{tool}",
            kind=SpanKind.CLIENT,
            attributes={
                "tool.name": tool,
                "tool.inputs": str(inputs)[:1000],
                "tool.output": str(output)[:1000],
            },
        ):
            pass
```

## Evaluation Datasets

### Building and Managing Test Cases

```python
from typing import List, Dict, Optional

class TestCase:
    def __init__(
        self,
        id: str,
        user_input: str,
        expected_behavior: Dict,
        tags: List[str],
        expected_tool_calls: Optional[List[str]] = None,
    ):
        self.id = id
        self.user_input = user_input
        self.expected_behavior = expected_behavior
        self.tags = tags
        self.expected_tool_calls = expected_tool_calls or []

class EvaluationDataset:
    def __init__(self):
        self.test_cases: List[TestCase] = []

    def add_case(self, case: TestCase):
        self.test_cases.append(case)

    def filter(self, tags: List[str]) -> "EvaluationDataset":
        filtered = EvaluationDataset()
        for case in self.test_cases:
            if any(t in case.tags for t in tags):
                filtered.add_case(case)
        return filtered

    def sample(self, n: int) -> "EvaluationDataset":
        import random
        sampled = EvaluationDataset()
        sampled.test_cases = random.sample(self.test_cases, min(n, len(self.test_cases)))
        return sampled

    def run(self, agent, evaluator) -> List[Dict]:
        results = []
        for case in self.test_cases:
            result = {"case_id": case.id, "user_input": case.user_input}
            try:
                response = agent.run_sync(case.user_input)
                result["response"] = response
                result["tool_calls"] = agent.last_tool_calls
                result["completed"] = True
            except Exception as e:
                result["error"] = str(e)
                result["completed"] = False
            results.append(result)
        return results
```

## Key Points

- Unit test tools, memory, and routing logic in isolation before testing the full agent.
- Use mock LLMs and mock tools for deterministic agent-level behavioral tests.
- Simulate multi-turn conversations to test memory and context management.
- Use property-based testing to verify the agent handles arbitrary inputs without crashing.
- Measure task completion rate, efficiency (turns and tool calls per task), and output quality.
- Track latency P95 and per-run cost to monitor production performance.
- Integrate agent tests into CI/CD pipelines with unit, integration, simulation, and evaluation stages.
- Use regression detection to catch performance and quality degradations automatically.
- Implement structured logging and OpenTelemetry tracing for debugging agent behavior.
- Maintain an evaluation dataset of test cases tagged by capability for targeted testing.
- Always test termination conditions: max iterations, error recovery, and success paths.
- Profile agent systems to identify bottlenecks in LLM calls, tool execution, or memory operations.
- Compare evaluation results against baselines to measure improvement over time.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->

