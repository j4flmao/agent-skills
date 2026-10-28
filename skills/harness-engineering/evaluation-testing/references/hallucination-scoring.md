# Hallucination Scoring for LLM Outputs

Methods to measure whether model outputs are supported by evidence: definitions, claim-level faithfulness scoring against provided context, reference-based factuality, LLM-as-judge and NLI approaches, calibration, and how to report results.

## Definitions

| Term | Meaning | Evaluated against |
|---|---|---|
| Faithfulness / groundedness | Every claim is supported by the provided context (RAG, documents, tool results) | The context given to the model |
| Factuality | Claims are true about the world | References / trusted knowledge |
| Answer relevance | The answer addresses the question | The question |
| Citation accuracy | Cited sources actually support the cited statements | Cited passages |

An answer can be faithful to wrong context, or factually right but unsupported by context; measure the property your product promises.

## Claim-Level Faithfulness Pipeline

```
answer → split into atomic claims → for each claim: supported / contradicted / not found in context
       → faithfulness = supported / total claims
```

```python
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Callable, Literal

Verdict = Literal["supported", "contradicted", "not_found"]


@dataclass(frozen=True)
class ClaimResult:
    claim: str
    verdict: Verdict
    evidence: str


def extract_claims(llm: Callable[[str], str], answer: str) -> list[str]:
    raw = llm(
        "Split the text into short, self-contained factual claims. Skip opinions and greetings.\n"
        f'Text:\n"""{answer}"""\nReturn JSON {{"claims": ["..."]}}.'
    )
    return json.loads(raw)["claims"]


def verify_claim(llm: Callable[[str], str], claim: str, context: str) -> ClaimResult:
    raw = llm(
        "Decide whether the claim is supported by the context only (ignore outside knowledge).\n"
        f'Context:\n"""{context}"""\nClaim: "{claim}"\n'
        'Return JSON {"verdict": "supported"|"contradicted"|"not_found", "evidence": "<quoted span or empty>"}.'
    )
    data = json.loads(raw)
    return ClaimResult(claim, data["verdict"], data.get("evidence", ""))


def faithfulness(llm: Callable[[str], str], answer: str, context: str) -> tuple[float, list[ClaimResult]]:
    claims = extract_claims(llm, answer)
    if not claims:
        return 1.0, []                     # nothing asserted; report separately as "no claims"
    results = [verify_claim(llm, c, context) for c in claims]
    supported = sum(r.verdict == "supported" for r in results)
    return supported / len(results), results
```

In production code validate JSON with a schema and treat parse failures as errors to retry or flag, not as scores. Require quoted evidence and check that the quote actually occurs in the context (string match), which catches judges inventing support.

## Alternative Scorers

| Method | How | Trade-offs |
|---|---|---|
| NLI models | Entailment classifier (premise = context chunk, hypothesis = claim) | Cheap, deterministic; weaker on long/complex context |
| LLM-as-judge (claim-level) | As above | Flexible; needs calibration; cost |
| LLM-as-judge (holistic 1–5) | Single score per answer | Cheap; coarse, less reliable |
| Reference overlap (exact match, F1) | Compare to gold answer | Only for short factual answers |
| Self-consistency checks (e.g. sampling agreement) | Disagreement across samples signals hallucination | No reference needed; misses consistent errors |
| Retrieval-based fact check | Search trusted sources for each claim | Factuality without provided context; source quality matters |

Libraries such as Ragas, DeepEval, TruLens and vendor eval tools implement variants of these metrics; check their prompts and definitions before comparing numbers across tools.

## Calibrating the Judge

1. Human-label a sample of claims (supported / contradicted / not found).
2. Run the judge on the same claims.
3. Report agreement (accuracy, Cohen's kappa) and the confusion matrix; the costly error is usually "supported" for unsupported claims.
4. Adjust prompt, model or use an ensemble (multiple judges, majority) until agreement is acceptable; re-check after any judge model change.

Use a judge model at least as capable as the system under test, and preferably a different model family, to reduce shared blind spots.

## Metrics to Report

| Metric | Definition |
|---|---|
| Faithfulness (mean) | Mean per-answer supported-claim ratio |
| Hallucination rate | Share of answers with ≥ 1 contradicted or unsupported claim |
| Contradiction rate | Share of answers with ≥ 1 contradicted claim (most severe) |
| Abstention correctness | When context lacks the answer, share of answers that correctly say so |
| Citation precision | Share of citations whose passage supports the statement |

Slice by intent, document type, answer length and retrieval quality (hallucinations often follow retrieval misses). Report bootstrap confidence intervals.

## Test Design

- Include unanswerable questions (answer not in context) to test abstention.
- Include context with conflicting or outdated passages.
- Include long contexts with the answer in the middle.
- Perturbation tests: remove the supporting passage and confirm the system stops asserting the claim.

## Using Scores in Production

- Online: sample traffic, score asynchronously, alert on hallucination-rate increase per slice.
- Guardrail: block or flag answers with contradicted claims when latency budget allows a verification pass.
- Feed failures into the evaluation dataset (see `eval-dataset-management.md`).

## Pitfalls
- Holistic scores without claim breakdown: impossible to debug.
- Judges using world knowledge when the task is context faithfulness.
- Comparing metric values across different tools with different definitions.
- Ignoring "no claims" answers, which inflate faithfulness.
- Uncalibrated judges treated as ground truth.

## Checklist
- [ ] Property defined (faithfulness vs factuality vs citation accuracy)
- [ ] Claim-level scoring with evidence spans verified against context
- [ ] Judge calibrated against human labels; agreement reported
- [ ] Unanswerable and conflicting-context cases included
- [ ] Hallucination and contradiction rates reported with intervals and slices
- [ ] Online sampling and alerting for production
