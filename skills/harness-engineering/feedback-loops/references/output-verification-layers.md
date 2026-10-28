# Output Verification Layers

Layered verification checks agent outputs from cheapest and most reliable to most expensive and least reliable: structure, deterministic rules, execution, grounding, model-based review, and humans. Each layer catches a different class of error; together they decide whether an output is accepted, corrected, or escalated.

## 1. The Layers

| Layer | Checks | Reliability | Cost |
|---|---|---|---|
| L1 Structure | Parses as JSON/XML/code; matches schema; required fields present | Deterministic | Very low |
| L2 Rules | Value ranges, enums, business invariants, forbidden content, policy regex | Deterministic | Low |
| L3 Execution | Compile, run tests, execute SQL on a sandbox, dry-run API calls | Deterministic given environment | Medium |
| L4 Grounding | Claims supported by retrieved sources; citations resolve; numbers match data | Semi-deterministic | Medium |
| L5 Model review | LLM judge with rubric; cross-model or self-consistency checks | Probabilistic | Medium–high |
| L6 Human | Review for high-risk outputs or low-confidence cases | High (if reviewers are trained) | High |

Run layers in order and stop at the first failing one; feed its error back for correction (see `correction-trigger-mechanisms.md`).

## 2. L1 Structure with Pydantic

```python
from __future__ import annotations
from decimal import Decimal
from pydantic import BaseModel, Field, ValidationError, field_validator

class Refund(BaseModel):
    order_id: str = Field(pattern=r"^ORD-\d{8}$")
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    reason: str = Field(min_length=10, max_length=500)
    currency: str = Field(pattern=r"^[A-Z]{3}$")

    @field_validator("reason")
    @classmethod
    def reason_is_descriptive(cls, v: str) -> str:
        if v.strip().lower() in {"n/a", "none", "unknown"}:
            raise ValueError("reason must describe the customer issue")
        return v

def verify_structure(raw: str) -> tuple[Refund | None, str]:
    try:
        return Refund.model_validate_json(raw), ""
    except ValidationError as e:
        return None, e.json(include_url=False)
```

Provider structured-output / JSON-schema modes reduce L1 failures but do not remove the need to validate.

## 3. L2 Business Rules

```python
def verify_rules(r: Refund, order: dict) -> list[str]:
    problems = []
    if r.amount > Decimal(str(order["paid_amount"])):
        problems.append(f"refund {r.amount} exceeds paid amount {order['paid_amount']}")
    if r.currency != order["currency"]:
        problems.append(f"currency {r.currency} does not match order currency {order['currency']}")
    if order["status"] == "refunded":
        problems.append("order already refunded")
    return problems
```

Rules come from the system of record, not from the model's own context.

## 4. L3 Execution

| Output type | Execution check |
|---|---|
| Code | Build, unit tests, type-check, linters in a sandbox |
| SQL | `EXPLAIN` plus execution on a read-only replica with row limits; compare against expected columns |
| Infrastructure as code | `terraform validate` and `plan`; policy checks (OPA/Conftest) |
| API payloads | Dry-run or validation endpoints where available |
| Data transformations | Run on a fixture dataset and assert invariants |

Execution happens in an isolated environment with no production credentials.

## 5. L4 Grounding

```python
def verify_citations(answer: dict, sources: dict[str, str]) -> list[str]:
    problems = []
    for claim in answer["claims"]:
        src = sources.get(claim["source_id"])
        if src is None:
            problems.append(f"claim cites unknown source {claim['source_id']}")
        elif claim["quote"] not in src:
            problems.append(f"quoted text not found in source {claim['source_id']}")
    return problems
```

Require the agent to produce claims with source IDs and verbatim supporting quotes; check quotes by string match, numbers by recomputation from source data. Use NLI/entailment models or LLM judges only for paraphrased support.

## 6. L5 Model-Based Review

- Use a rubric with specific, checkable criteria and a structured verdict (`pass`/`fail` per criterion with evidence).
- Prefer a different model or at least a different prompt from the generator to reduce shared blind spots.
- Calibrate judges against human-labelled examples; track agreement over time.
- Treat judge failures as signals to correct or escalate, not as ground truth.

## 7. Decision Policy

```python
def decide(layer_results: list[tuple[str, list[str]]], risk: str, attempts: int) -> str:
    failing = [(layer, errs) for layer, errs in layer_results if errs]
    if not failing:
        return "human_review" if risk == "high" else "accept"
    if attempts < 2 and failing[0][0] in {"structure", "rules", "execution", "grounding"}:
        return "correct"
    return "escalate"
```

High-risk outputs go to human review even after passing automated layers, at least until measured accuracy justifies sampling.

## 8. Metrics

- Failure rate per layer (where do outputs fail most?).
- Correction success rate after feedback.
- Escaped defects: issues found after acceptance, traced back to the layer that should have caught them.
- Judge vs human agreement for L5.

## Pitfalls

- Starting with an LLM judge when a schema or test would catch the error deterministically.
- Verifying with data the model produced instead of the system of record.
- Executing generated code with production credentials.
- Accepting outputs when a verification layer errors (fail open). Verification errors must fail closed.

## Checklist

- [ ] Layers ordered by cost and reliability; first failure returned as feedback.
- [ ] Schemas and business rules sourced from systems of record.
- [ ] Execution in sandboxes without production access.
- [ ] Grounding checks with verbatim quotes and recomputed numbers.
- [ ] Judges calibrated; high-risk outputs human-reviewed.
- [ ] Verification fails closed.
