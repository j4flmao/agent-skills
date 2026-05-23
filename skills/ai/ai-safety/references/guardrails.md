# Guardrails Implementation

## Guardrail Architecture

### Processing Pipeline
```
User Input → Input Guardrails → LLM → Output Guardrails → User
                │                              │
                ▼                              ▼
          Reject/Modify                   Filter/Revise
```

### Input Guardrails
```
Topic Restriction: Block out-of-scope topics
Jailbreak Detection: Identify prompt injection attempts
PII Redaction: Strip personal identifiable information
Rate Limiting: Per-user request caps
Content Moderation: Toxicity, hate speech
Context Validation: Instruction boundary verification
```

### Output Guardrails
```
Factuality Check: Verify claims against context
Safety Filter: Block harmful or toxic content
Format Validation: Ensure structured output compliance
Consistency Check: Detect contradictions
Cost Limit: Truncate or block expensive responses
PII Leakage: Prevent data exposure
```

## Guardrail Framework Comparison

| Framework | Input Rails | Output Rails | Custom Actions | Integration |
|-----------|------------|-------------|----------------|-------------|
| NeMo Guardrails | Yes | Yes | Colang DSL | LangChain, custom |
| Guardrails AI | Limited | Yes | Python validators | Any LLM |
| NVIDIA NeMo | Full | Full | Colang + Python | Riva, Triton |
| Lakera Guard | API-based | API-based | Config presets | API gateway |
| Custom Middleware | Full control | Full control | Any logic | Any |

## Guardrails AI Implementation

```python
from guardrails import Guard
from guardrails.hub import ToxicLanguage, RegexMatch, Provenance

guard = Guard().use_many(
    ToxicLanguage(threshold=0.5, validation_method="sentence"),
    RegexMatch(regex=r"^[A-Z][^!?.]*[!?.]$", on_fail="fix"),
)

response = guard.validate(llm_output)
```

## NeMo Guardrails Configuration

### Input Flow
```yaml
rails:
  input:
    flows:
      - check jailbreak patterns
      - check topic restrictions
      - check pii leakage
      - check rate limit

  output:
    flows:
      - check toxicity
      - check factual consistency
      - check format compliance
```

### Custom Colang Flow
```
define flow check jailbreak patterns
    user said "ignore instructions"
        bot refuse to comply
    user said "system prompt"
        bot refuse to comply
    user said "DAN" or "jailbreak"
        bot refuse to comply

define bot refuse to comply
    "I cannot follow this instruction as it violates my guidelines."
```

## Custom Guardrail Middleware

```python
class GuardrailMiddleware:
    def __init__(self, rules):
        self.rules = rules

    async def check_input(self, user_input):
        for rule in self.rules["input"]:
            result = await rule.evaluate(user_input)
            if result.triggered:
                return {"blocked": True, "reason": result.reason}
        return {"blocked": False}

    async def check_output(self, prompt, response):
        for rule in self.rules["output"]:
            result = await rule.evaluate(prompt, response)
            if result.triggered:
                return {"blocked": True, "action": result.action}
        return {"blocked": False}
```

## Performance Overhead

| Guardrail Type | Latency Added | Cost Added |
|---------------|--------------|------------|
| Regex filter | <1ms | $0 |
| ML moderation | 50-200ms | $0.0001/req |
| LLM-as-judge | 200-1000ms | $0.001-0.01/req |
| Factuality check | 500-2000ms | $0.002-0.02/req |

## Monitoring Guardrails

### Key Metrics
- Pass rate: % of calls that pass all guardrails
- Block rate: % of calls blocked by guardrails
- False positive rate: incorrectly blocked legitimate requests
- Latency overhead: guardrail processing time
- Most triggered rules: top violations

### Alert Thresholds
```
Block rate > 10% in 5 min: Possible attack
False positive > 1% in 1 hour: Review rules
Latency overhead > 500ms: Optimize pipeline
Guardrail service error rate > 1%: Service health
```
