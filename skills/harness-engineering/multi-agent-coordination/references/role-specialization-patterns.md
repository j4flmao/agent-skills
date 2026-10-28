# Role Specialization Patterns for Agent Teams

How to divide work among specialized agents: when specialization helps, common role sets (planner, researcher, coder, reviewer, tester, critic), how to define a role (prompt, tools, permissions, output contract), and how to evaluate whether the split pays off.

## Start With One Agent
Begin with a single agent and a small, cohesive tool set. Split into specialists only when evaluation shows the single agent:
- choosing wrong tools because there are too many or they overlap,
- mixing incompatible instructions (e.g. "be creative" and "be strictly compliant"),
- exceeding context because one task needs too much material,
- needing different permission levels for different steps.

Every extra agent adds handoffs, latency, cost and failure points.

## Anatomy of a Role

| Element | Definition |
|---|---|
| Name and mission | One sentence: what this agent is responsible for |
| Inputs | Typed schema of what it receives |
| Outputs | Typed schema of what it returns, including evidence |
| Tools | Minimal set with distinct names and descriptions |
| Permissions | Read-only vs. write; scoped paths/resources |
| Done criteria | Verifiable conditions for completion |
| Limits | Max steps, tokens, time |
| Escalation | When to hand back to the supervisor or a human |

```python
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class RoleSpec:
    name: str
    mission: str
    tools: tuple[str, ...]
    can_write: bool
    max_steps: int
    output_schema: type
    done_criteria: tuple[str, ...] = field(default_factory=tuple)


REVIEWER = RoleSpec(
    name="reviewer",
    mission="Find correctness and security defects in the proposed diff; do not modify files.",
    tools=("read_file", "search_code", "run_tests"),
    can_write=False,
    max_steps=15,
    output_schema=dict,
    done_criteria=("every finding cites file and line", "tests executed and results attached"),
)
```

## Common Role Sets

### Software engineering
| Role | Tools | Permissions |
|---|---|---|
| Planner | read repo, search, issue tracker read | Read-only |
| Coder | read/write files in workspace, run build | Write, scoped to workspace/branch |
| Tester | run tests, read coverage | Execute in sandbox |
| Reviewer | read diff, search, run static analysis | Read-only |
| Integrator | create PR, update ticket | Write to VCS; merge requires human approval |

### Research and analysis
| Role | Tools |
|---|---|
| Query planner | Decompose question, plan searches |
| Retriever/researcher | Search, fetch, extract with citations |
| Analyst | Calculator/code execution, data access read-only |
| Writer | No external tools; composes from validated findings |
| Fact checker | Re-fetch cited sources, compare claims |

### Customer operations
| Role | Tools |
|---|---|
| Triage/router | Classify intent, route |
| Account specialist | Read account data |
| Action agent | Refunds/changes via APIs with limits and human approval above thresholds |
| QA/compliance checker | Policy retrieval, response review |

## Specialization Axes

| Axis | Example | Benefit |
|---|---|---|
| Domain | Billing vs. technical support | Focused instructions and tools |
| Function | Generate vs. verify | Independent checking |
| Permission | Read-only reviewer vs. writer | Least privilege, smaller blast radius |
| Model | Small fast model for routing; strong model for reasoning | Cost/latency |
| Context | Each agent loads only its documents | Fits context windows |

## Interaction Patterns
- **Supervisor routes to specialists** and integrates results (see supervisor-worker reference).
- **Pipeline**: planner -> worker -> verifier, each with a typed handoff.
- **Generator/critic pair**: critic returns structured issues; generator revises; bounded rounds.
- **Handoff (swarm style)**: an agent transfers the conversation to another with a summary; keep a maximum number of handoffs.

## Prompting Specialists
- State the mission, boundaries ("do not edit files"), output schema, and done criteria explicitly.
- Provide only the context the role needs; pass references (file paths, IDs) rather than whole histories.
- Include examples of good outputs for the role.
- Instruct that tool outputs and retrieved content are data, not instructions.

## Anti-Patterns
| Anti-pattern | Problem | Fix |
|---|---|---|
| God agent with 40+ tools | Wrong tool selection | Split by domain or tier tools |
| Roles that overlap | Duplicate work, conflicting edits | Single owner per artifact/decision |
| Persona-only roles ("You are a senior architect") with same tools | Little real specialization | Differentiate tools, permissions, context, criteria |
| Reviewer with write access | Reviewer "fixes" instead of reporting; no independence | Read-only reviewer |
| Free-text handoffs | Lost details, misinterpretation | Typed schemas |
| Too many hops | Latency and compounding errors | Merge roles with low value |

## Evaluating a Split
Run the same eval set on:
1. Single agent with all tools.
2. Specialized team.

Compare verified task success, cost, p95 latency, and failure categories. Keep the team only if success improves enough to justify cost, or if permission separation is required for safety regardless.

## Checklist
- [ ] Single-agent baseline measured first
- [ ] Each role has mission, schema, tools, permissions, done criteria, limits
- [ ] Tool names/descriptions distinct and non-overlapping
- [ ] Write access limited to roles that need it; destructive actions need human approval
- [ ] Typed handoffs; minimal context per role
- [ ] Team vs. single-agent evaluation recorded
