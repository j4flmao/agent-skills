# AI Agents Advanced Topics

## Production Agent Architecture

### Design Principles for Production Agent Systems

**1. Reliability**
Agents in production must handle partial failures gracefully. Every tool call can fail, every LLM response can be malformed, every external service can be slow. Design for all three.

```
Two Hard Truths of Production Agents:
1. Your agent will eventually call a tool with hallucinated parameters
2. Your agent will eventually get stuck in a loop
Plan for both before deployment.
```

**2. Observability by Default**
Agent behavior is non-deterministic. You cannot debug an agent system without comprehensive tracing. Every decision, tool call, and state transition must be recorded.

**3. Defense in Depth**
Multiple guard layers: input validation → tool allowlist → parameter constraints → output filtering → human review threshold.

**4. Cost Proportionality**
Agent cost = (tokens per turn × turns) + (tool execution cost × calls). Both dimensions must be bounded.

### Production Architecture Template

```
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Runtime                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Router   │  │ Guard    │  │ Executor │  │ Memory Mgr    │   │
│  │ (intent) │─→│ (safety) │─→│ (agent)  │─→│ (context bld) │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────┬───────┘   │
│       │                                             │          │
│       ▼                                             ▼          │
│  ┌──────────┐                                  ┌──────────┐    │
│  │ Rate     │                                  │ Vector   │    │
│  │ Limiter  │                                  │ Store    │    │
│  └──────────┘                                  └──────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Observability Layer                     │   │
│  │  Tracing (OpenTelemetry) │ Metrics (Prometheus) │ Logs    │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Tool Execution Layer                    │   │
│  │  Allowlist │ Schema Validation │ Rate Limit │ Circuit Br │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Advanced Orchestration

### Dynamic Agent Routing

Instead of static topologies, use a router agent that dynamically selects the next agent based on current state:

```python
class DynamicRouter:
    def route(self, task: dict, available_agents: list[Agent]) -> Agent:
        agent_capabilities = [
            {"name": a.name, "capabilities": a.capabilities, "load": a.current_load}
            for a in available_agents
        ]

        prompt = f"""
        Task: {task['description']}
        Required capabilities: {task['required_capabilities']}

        Available agents:
        {json.dumps(agent_capabilities, indent=2)}

        Select the best agent. Consider:
        - Capability match (required vs. available)
        - Current load (prefer less loaded)
        - Specialization (prefer specialized over general)

        Output: just the agent name.
        """
        selected = self.llm.invoke(prompt).content.strip()
        return next(a for a in available_agents if a.name == selected)
```

### Conflict Resolution in Multi-Agent Systems

When multiple agents produce conflicting outputs:

| Strategy | Mechanism | Best For |
|----------|-----------|----------|
| Voting | Majority or weighted vote | Classification, ranking |
| Arbitration | Dedicated arbiter agent reviews | Complex decisions |
| Confidence Scoring | Each agent provides confidence | Probabilistic outputs |
| Debate | Agents argue positions, reach consensus | Analysis, planning |
| Fallback Chain | Ordered preference, next on conflict | Pipeline processing |

```python
class ConsensusCoordinator:
    def resolve(self, responses: list[AgentResponse], strategy: str = "vote"):
        if strategy == "vote":
            return self._majority_vote(responses)
        elif strategy == "confidence":
            return max(responses, key=lambda r: r.confidence)
        elif strategy == "arbitrate":
            return self.arbitrer.evaluate(responses)
        elif strategy == "debate":
            return self._run_debate(responses)
```

### State Machine Agents

For complex workflows, model agent behavior as a state machine rather than free-form loops:

```python
class StateMachineAgent:
    STATES = ["initial", "gathering_info", "analyzing", "recommending", "confirming", "complete"]

    def __init__(self):
        self.state = "initial"
        self.transitions = {
            "initial": ["gathering_info"],
            "gathering_info": ["analyzing", "initial"],
            "analyzing": ["recommending", "gathering_info"],
            "recommending": ["confirming", "analyzing"],
            "confirming": ["complete", "recommending"]
        }

    def step(self, input_data: dict) -> str:
        next_state = self._determine_next_state(input_data)
        if next_state not in self.transitions[self.state]:
            raise StateTransitionError(f"Cannot transition from {self.state} to {next_state}")
        self.state = next_state
        return self.state
```

## Scalability Patterns

### Horizontal Agent Scaling

```
                   ┌─────────────┐
                   │   Router    │
                   │  (session)  │
                   └──────┬──────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Agent    │   │ Agent    │   │ Agent    │
    │ Instance │   │ Instance │   │ Instance │
    │ 1        │   │ 2        │   │ N        │
    └──────────┘   └──────────┘   └──────────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  Shared     │
                   │  State      │
                   │  (Redis)    │
                   └─────────────┘
```

Key considerations:
- **Session affinity**: Route same session to same instance for cache locality
- **Shared state**: All instances read/write to shared memory store
- **Rate limiting**: Per-instance and global rate limits
- **Graceful degradation**: Instance failure → re-route in-flight sessions

### Agent Pool Management

```python
class AgentPool:
    def __init__(self, min_size=2, max_size=20, scale_up_threshold=0.7):
        self.instances = [self._create_instance() for _ in range(min_size)]
        self.min_size = min_size
        self.max_size = max_size
        self.scale_up_threshold = scale_up_threshold

    def acquire(self, session_id: str) -> AgentInstance:
        instance = self._least_loaded()
        if instance.load > self.scale_up_threshold and len(self.instances) < self.max_size:
            new_instance = self._create_instance()
            self.instances.append(new_instance)
            return new_instance
        return instance

    def release(self, instance: AgentInstance):
        instance.active_sessions -= 1
        if instance.active_sessions == 0 and len(self.instances) > self.min_size:
            self.instances.remove(instance)
            self._destroy_instance(instance)
```

## Advanced Safety

### Runtime Guardrail Architecture

```
Input ─→ Prompt Injection Detector ─→ Topic Filter ─→ Rate Limiter ─→ Agent
                                                                          │
Output ←─ PII Scrubbing  ←─ Content Moderator ←─ Tool Output Validator ←─┘
```

### Anomaly Detection in Agent Behavior

Statistical monitoring of agent behavior patterns:

| Signal | Anomaly | Detection Method |
|--------|---------|------------------|
| Tool call frequency | Sudden spike | Moving average deviation >3σ |
| Tool selection entropy | All calls to one tool | Shannon entropy < threshold |
| Response length | Extreme short/long | Percentile-based outlier |
| Turn duration | Faster/slower than usual | Rolling Z-score |
| Sentiment trajectory | Sudden negative shift | Sentiment analysis trend |
| Entity access pattern | Accessing unusual data | Baseline comparison |

```python
class AgentAnomalyDetector:
    def __init__(self, baseline: dict):
        self.baseline = baseline  # Mean and std for each metric

    def check(self, metrics: dict) -> list[Alert]:
        alerts = []
        for metric, value in metrics.items():
            if metric in self.baseline:
                mean, std = self.baseline[metric]
                z_score = (value - mean) / max(std, 0.001)
                if abs(z_score) > 3:
                    alerts.append(Alert(
                        severity="warning" if abs(z_score) > 3 else "critical",
                        metric=metric,
                        value=value,
                        expected_mean=mean,
                        z_score=z_score
                    ))
        return alerts
```

## Cost Optimization

### Agent Cost Breakdown

```
Total Cost = LLM Cost + Tool Execution Cost + Infrastructure Cost

LLM Cost = Input Tokens × $price_in + Output Tokens × $price_out
Tool Execution Cost = Σ(API calls × $per_call + Compute × $per_second)
Infrastructure Cost = Instance Hours × $per_hour
```

### Optimization Strategies

| Strategy | Impact | Trade-off |
|----------|--------|-----------|
| Shorter system prompts | 10-30% token reduction | May lose specificity |
| Fewer iterations | Direct 1:1 cost reduction | May reduce quality |
| Tool result caching | 20-60% tool cost reduction | Staleness risk |
| Cheaper model for subtasks | 50-90% per-token cost | Quality varies |
| Parallel tool calls | Reduced wall-clock time | Same token cost |
| Early termination | Avoids unnecessary turns | May miss edge cases |
| Model distillation | 40-60% cost reduction | Setup cost |

## Evaluation at Scale

### CI/CD for Agents

```yaml
# .github/workflows/agent-eval.yml
name: Agent Evaluation
on: [pull_request]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run evals
        run: |
          python -m agent.evals \
            --dataset tests/evals/cases.json \
            --agent ${{ github.head_ref }} \
            --output results.json
      - name: Check regression
        run: |
          python -m agent.evals.check_regression \
            --baseline results/baseline.json \
            --current results.json \
            --threshold 0.95
      - name: Deploy if passed
        if: success()
        run: python -m agent.deploy --env staging
```

### Regression Detection

Track key metrics across versions and alert on degradation:

```python
class RegressionDetector:
    def check(self, baseline: EvalResult, current: EvalResult) -> RegressionReport:
        regressions = []
        for metric in ["accuracy", "tool_selection_accuracy", "avg_turns", "cost_per_task"]:
            baseline_val = getattr(baseline, metric)
            current_val = getattr(current, metric)
            change = (current_val - baseline_val) / max(baseline_val, 0.001)
            if metric in ["avg_turns", "cost_per_task"]:
                change = -change  # Lower is better for these

            if change < -0.05:  # >5% degradation
                regressions.append(MetricRegression(
                    metric=metric,
                    baseline=baseline_val,
                    current=current_val,
                    change_pct=change * 100
                ))

        return RegressionReport(
            passed=len(regressions) == 0,
            regressions=regressions,
            total_metrics=len(baseline.__dict__)
        )
```

## Key Points

- Production agents require defense-in-depth: guardrails at every layer
- Observability is mandatory — agent behavior cannot be debugged without full tracing
- Cost must be bounded on two axes: tokens per turn and turns per task
- State machine agents provide predictable behavior for complex workflows
- Multi-agent conflict resolution requires explicit strategies (vote, arbitrate, debate)
- Agent scaling requires shared state and session affinity
- Anomaly detection on agent behavior catches issues early
- CI/CD for agents requires automated evaluation against baselines
- Regression detection prevents silent quality degradation
- Start simple (single ReAct) and add complexity only when justified by metrics
