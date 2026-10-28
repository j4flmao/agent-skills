# Anticipatory Error Prevention (Feedforward Controls)

Feedback loops correct errors after they happen; feedforward controls prevent them by shaping what the agent sees and can do before it acts. This reference covers the main feedforward levers: task framing, context preparation, tool design, constrained outputs, pre-action checks, and environment setup.

## 1. Feedforward vs Feedback

| | Feedforward | Feedback |
|---|---|---|
| When | Before generation/action | After output/action |
| Examples | Clear task spec, curated context, tool schemas, allow-lists, output schemas, plans | Tests, validators, judges, reviews |
| Cost of failure | Prevented | Paid in retries, tokens, and sometimes side effects |
| Best for | Predictable, recurring error classes; irreversible actions | Errors that cannot be anticipated |

Use error data from feedback loops to decide which feedforward controls to add: a recurring failure class is a candidate for prevention.

## 2. Task Specification

Ambiguous tasks are a leading source of wrong work. Before starting, the harness assembles a task spec:

```yaml
goal: "Add CSV export to the orders report endpoint"
acceptance_criteria:
  - "GET /reports/orders?format=csv returns text/csv with header row"
  - "Existing JSON response unchanged"
  - "Unit tests cover empty result and special characters"
constraints:
  - "Do not modify database schema"
  - "Use the existing ReportService"
out_of_scope:
  - "Excel export"
inputs:
  - "src/reports/orders.py"
  - "docs/api/reports.md"
```

If required fields cannot be filled from the request, ask a clarifying question before acting. Acceptance criteria later become the completion gate.

## 3. Context Preparation

| Error class | Feedforward control |
|---|---|
| Hallucinated APIs or functions | Provide relevant source files, API docs, type signatures |
| Wrong conventions | Load project rules (style, architecture, commit format) at session start |
| Stale knowledge | Inject current versions (dependency lockfile, runtime versions) |
| Forgotten constraints in long runs | Re-inject invariants after context compaction |
| Distraction | Exclude irrelevant files; summarize long logs |

Retrieval should favour precise, current sources over volume; more context is not always better.

## 4. Tool Design as Prevention

- Small, distinct toolsets with non-overlapping names and descriptions reduce wrong-tool errors.
- Flat, primitive arguments with enums and ranges reduce invalid calls.
- Descriptions state when to use and when not to use a tool, with an example call.
- Safe defaults: read-only unless a write is explicit; dry-run modes; pagination limits.
- Separate destructive operations into their own tools that require approval.

```python
TOOLS = [
    {
        "name": "search_orders",
        "description": ("Search orders by customer email or order ID. Read-only. "
                        "Use before any refund to confirm the order exists. "
                        "Example: search_orders(query='ORD-20261027', limit=5)"),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "minLength": 3},
                "limit": {"type": "integer", "minimum": 1, "maximum": 50, "default": 10},
            },
            "required": ["query"],
        },
    },
]
```

## 5. Constrained Outputs

- Use provider structured-output / JSON-schema modes or constrained decoding for machine-consumed outputs.
- Enumerate allowed values instead of free text where possible.
- Ask for plans in a fixed structure (steps with tool, purpose, expected result) so they can be checked before execution.

## 6. Pre-Action Checks

Validate intended actions before they run:

```python
from __future__ import annotations
from pathlib import Path

ALLOWED_ROOT = Path("/workspace").resolve()
DESTRUCTIVE = {"delete_file", "drop_table", "deploy", "send_email"}

def precheck(tool: str, args: dict, approvals: set[str]) -> str | None:
    if tool in DESTRUCTIVE and tool not in approvals:
        return f"{tool} requires human approval; request it with a summary of the change"
    if "path" in args:
        p = (ALLOWED_ROOT / args["path"]).resolve()
        if not p.is_relative_to(ALLOWED_ROOT):
            return f"path {args['path']} is outside the workspace"
    return None
```

The returned message goes back to the model as the tool result, which teaches it the constraint without executing anything.

## 7. Plan Review Before Execution

For multi-step or risky tasks:
1. Agent produces a plan in a structured format.
2. Harness checks the plan: tools exist, permissions suffice, steps cover acceptance criteria, no forbidden actions.
3. High-risk plans go to a human for approval.
4. Execution follows the approved plan; deviations trigger re-approval.

## 8. Environment Preparation

- Pin dependencies and runtime versions in the sandbox image.
- Pre-install linters/test tools so the agent does not improvise installs.
- Provide seed data and fixtures for tests.
- Use least-privilege credentials scoped to the task.

## 9. Measuring Prevention

Track error classes before and after each control (using the error taxonomy). A control that does not reduce its target class, or that increases cost/latency disproportionately, should be revised or removed.

## Pitfalls

- Over-stuffed system prompts with every rule; important constraints get lost. Move enforceable rules into harness checks.
- Tool descriptions that overlap, inviting the model to pick wrongly.
- Plans approved once and then ignored during execution.
- Prevention without measurement: controls accumulate without evidence they help.

## Checklist

- [ ] Task spec with acceptance criteria, constraints, and scope before work starts.
- [ ] Curated, current context; invariants re-injected after compaction.
- [ ] Toolsets small, distinct, with constrained arguments and examples.
- [ ] Structured outputs for machine-consumed results.
- [ ] Pre-action checks for paths, permissions, and destructive tools.
- [ ] Plan review for multi-step or high-risk tasks.
- [ ] Error-class metrics show each control's effect.
