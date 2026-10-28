# Consensus and Agreement in Multi-Agent LLM Systems

How several LLM agents (or several samples of one agent) reach a single decision: voting, self-consistency, judge/verifier patterns, debate, and quorum rules for actions. Also covers when consensus is worth its cost and how to avoid correlated errors. This is about agreement on answers and decisions; it is not distributed-systems consensus (Raft/Paxos), which agents should get from infrastructure instead of re-implementing.

## When to Use Consensus

| Situation | Use consensus? |
|---|---|
| Answer has a checkable form (number, label, code that compiles/passes tests) | Yes: voting or verification is cheap and effective |
| High-stakes decision (approve payment, merge to main, delete data) | Yes, plus a human checkpoint |
| Open-ended writing | Rarely: pick-best with a rubric judge instead |
| Latency-critical, low-stakes | No: single agent with guardrails |

Consensus multiplies token cost and latency by the number of participants; justify it with an evaluation showing accuracy gains.

## Patterns

### 1. Self-consistency (majority vote over samples)
Sample N independent reasoning paths (temperature > 0) and take the most frequent final answer.
```python
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Vote:
    answer: str
    agent_id: str


def majority(votes: list[Vote], min_agreement: float = 0.6) -> str | None:
    if not votes:
        raise ValueError("majority() needs at least one vote")
    counts = Counter(v.answer.strip().lower() for v in votes)
    answer, n = counts.most_common(1)[0]
    return answer if n / len(votes) >= min_agreement else None   # None -> escalate
```
Normalize answers before counting (units, casing, canonical JSON). Return "no consensus" instead of forcing a winner.

### 2. Heterogeneous ensemble
Different models, prompts or tool access vote. Diversity reduces correlated mistakes that identical samples share. Weight votes by measured per-model accuracy on your eval set, not by self-reported confidence.

### 3. Generator + verifier
One agent proposes; a verifier checks against explicit criteria or executable checks (tests, schema validation, calculator, retrieval of sources). Prefer **programmatic verification** over LLM judgment wherever possible.

```
propose -> verify (tests / schema / citations) -> pass: accept
                                               -> fail: feed errors back, retry (bounded)
```

### 4. LLM-as-judge (pick best)
Judge compares candidates against a rubric. Mitigate known biases: randomize candidate order, hide which agent produced what, ask for rubric scores before the verdict, and calibrate the judge against human labels.

### 5. Debate / critique rounds
Agents see each other's answers and revise for a fixed number of rounds, then vote or a judge decides. Useful for reasoning tasks; risk of convergence on a confident wrong answer (herding). Cap rounds (typically 1–3) and keep an independent first-round vote.

### 6. Quorum for actions
Side-effecting actions require approval from K of N checks, for example: policy agent approves, tests pass, and a human approves above a risk threshold.

## Decision Record (typed state)

Keep votes and rationale in structured state, not only in chat history, so routing reads fields.
```python
from typing import Literal, TypedDict


class ConsensusState(TypedDict):
    question: str
    candidates: list[dict]          # {"agent_id", "answer", "evidence"}
    votes: list[dict]               # {"agent_id", "choice", "score"}
    status: Literal["collecting", "agreed", "no_consensus", "escalated"]
    decision: str | None
    round: int
    max_rounds: int
```

## Aggregation Rules

| Rule | Use | Note |
|---|---|---|
| Simple majority | Discrete answers | Needs odd N or tie policy |
| Supermajority (e.g. 2/3) | Riskier decisions | More "no consensus" outcomes, which is intended |
| Weighted vote | Agents of different reliability | Weights from evals |
| Unanimity | Safety vetoes | Any veto blocks; pair with human review |
| Score averaging | Rubric scores | Check judge agreement (variance) |
| Best-of-N by verifier | Code, math | Verifier quality is the ceiling |

Tie and no-consensus policy must be explicit: escalate to a stronger model, ask a human, or return "uncertain".

## Avoiding Correlated Errors
- Same model + same prompt + same retrieved context = correlated votes. Vary at least one of model, prompt framing, or evidence.
- Do not let agents see each other's answers before the first independent vote.
- Watch for a shared bad tool result (one wrong retrieval poisons every agent). Verify evidence independently.

## Cost and Latency Controls
- Start with N = 3; increase only if evals show gains.
- Early stop: if the first K votes agree, skip the rest.
- Cascade: cheap model votes first; escalate disagreements to a stronger model.
- Run participants in parallel with per-call timeouts; treat timeouts as abstentions.
- Budget tokens per decision and stop at the cap.

## Security
- Agents' inputs from tools/retrieval are untrusted; a prompt injection in shared context can sway all voters. Consensus is not a defense against shared injected content.
- Voting never authorizes destructive actions by itself; those still require explicit human approval.

## Evaluation
| Metric | Meaning |
|---|---|
| Accuracy single vs. consensus | Is the extra cost worth it? |
| Agreement rate | How often a decision is reached |
| Accuracy when agreed vs. when escalated | Calibration of the agreement signal |
| Cost and p95 latency per decision | Operational budget |

## Checklist
- [ ] Consensus used only where evals show gains
- [ ] Answers normalized before voting
- [ ] Independent first round; diversity across voters
- [ ] Explicit tie/no-consensus policy with escalation
- [ ] Programmatic verification preferred over LLM judging
- [ ] Bounded rounds, timeouts and token budget
- [ ] Destructive actions gated by human approval regardless of votes
