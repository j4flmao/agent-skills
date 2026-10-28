---
name: tool-calling-principles
description: >
  Use this skill when the user says 'tool calling', 'function calling', 'tool schema', 'JSON schema for tools', 'agent picks wrong tool', 'tool error handling', 'structured outputs', 'tool_use / tool_result'. Designs tool interfaces for LLM agents: naming, descriptions, strict schemas, error contracts, idempotency, output shaping, and permission levels. Do NOT use for: building MCP servers specifically (ai/mcp-patterns and .claude/rules/mcp-server-design.md), the agent loop (ai/ai-agents/core-architectures), or general REST API design (backend/universal/api-design).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [ai, agents, tool-calling, function-calling, json-schema, structured-outputs]
---

# Tool-Calling Principles

## Purpose
Tools are the agent's only way to read or change the world, and the model chooses and fills them using nothing but names, descriptions, and schemas. Good tools are few, coarse-grained, strictly typed, safe to retry, and return compact results with actionable errors. This skill gives the rules and templates for designing them.

## Agent Protocol

### Trigger
"tool calling", "function calling", "tool schema", "tool description", "wrong tool selected", "tool errors", "strict mode", "structured output".

### Input Context
- The operations the agent needs and the underlying APIs.
- Side effects of each operation (read, reversible write, irreversible).
- Provider (Anthropic, OpenAI, other) and whether strict schema mode is available.
- Observed failure transcripts if debugging.

### Output Artifact
Tool definitions (JSON Schema), handler skeletons with validation and error contract, permission matrix.

### Response Format
```
Tool: {verb_noun}  Side effect: {read|write-reversible|write-irreversible}  Approval: {none|human}
Description: {what, when to use, when NOT to use, output shape, limits}
Schema: {required fields, enums, formats}
Errors: {code: hint}
Idempotency: {key or natural}
```

### Completion Criteria
- [ ] Small, cohesive tool set; overlapping tools merged or removed.
- [ ] Descriptions say when to use and when not to use.
- [ ] Schemas use enums/formats/required fields; strict mode on where supported.
- [ ] Errors return code + message + corrective hint.
- [ ] Write tools idempotent; irreversible tools gated.

## Design Rules

1. **Name by intent**: `search_orders`, `refund_order`, not `api_call` or `execute`.
2. **Coarse over chatty**: one `get_customer_summary` beats five getters the model must chain.
3. **Descriptions are prompts**: purpose, when to use, when not to, input semantics, output shape, limits (e.g. "returns at most 20 rows").
4. **Constrain inputs**: `enum` for categorical values, `format`/`pattern` for ids and dates, `minimum`/`maximum` for numbers, `required` for everything mandatory, `additionalProperties: false`.
5. **Flat, primitive arguments**: nested objects raise error rates; prefer `start_date`, `end_date` over `{range: {...}}`.
6. **Compact outputs**: return only fields the model needs; paginate with a cursor; cap size. Return the new state after a write ("refund R-91 created, status=pending"), not just `true`.
7. **Errors that teach**: `{"error": "ORDER_NOT_FOUND", "message": "...", "hint": "use search_orders with the customer's email first"}`.
8. **Idempotency**: write tools accept an idempotency key or are naturally idempotent (set, not increment).
9. **Least privilege**: separate read and write tools so read-only agents never see writes.
10. **Never trust arguments**: validate server-side; the schema is guidance to the model, not a security boundary.

## Provider Formats

Anthropic Messages API:
```json
{
  "name": "refund_order",
  "description": "Refund a delivered order fully or partially. Use only after confirming the order id with search_orders. Not for cancellations of undelivered orders (use cancel_order). Returns refund id and status.",
  "input_schema": {
    "type": "object",
    "properties": {
      "order_id": {"type": "string", "pattern": "^ORD-[0-9]{6}$"},
      "amount_cents": {"type": "integer", "minimum": 1},
      "reason": {"type": "string", "enum": ["damaged", "late", "wrong_item", "other"]},
      "idempotency_key": {"type": "string"}
    },
    "required": ["order_id", "amount_cents", "reason", "idempotency_key"],
    "additionalProperties": false
  }
}
```
The model replies with `tool_use` blocks (`id`, `name`, `input`); you answer in the next user message with `tool_result` blocks (`tool_use_id`, `content`, optional `is_error: true`).

OpenAI Chat Completions / Responses: `{"type": "function", "function": {"name", "description", "parameters", "strict": true}}`. Strict mode requires every property listed in `required` and `additionalProperties: false`; model optional fields as nullable types instead.

## Handler Template

```python
from __future__ import annotations

import json
import logging
from typing import Any

from pydantic import BaseModel, Field, ValidationError

log = logging.getLogger("tools")


class RefundArgs(BaseModel):
    model_config = {"extra": "forbid"}
    order_id: str = Field(pattern=r"^ORD-[0-9]{6}$")
    amount_cents: int = Field(ge=1)
    reason: str = Field(pattern=r"^(damaged|late|wrong_item|other)$")
    idempotency_key: str


def tool_error(code: str, message: str, hint: str) -> str:
    return json.dumps({"error": code, "message": message, "hint": hint})


def handle_refund(raw_args: dict[str, Any], user_id: str) -> tuple[str, bool]:
    """Returns (content, is_error) for a tool_result block."""
    try:
        args = RefundArgs.model_validate(raw_args)
    except ValidationError as exc:
        return tool_error("INVALID_ARGS", str(exc.errors()[:3]), "fix the listed fields and retry"), True

    order = orders_repo.get(args.order_id, owner=user_id)          # authorization in code
    if order is None:
        return tool_error("ORDER_NOT_FOUND", args.order_id, "call search_orders first"), True
    if args.amount_cents > order.total_cents - order.refunded_cents:
        return tool_error("AMOUNT_TOO_HIGH", f"max {order.total_cents - order.refunded_cents}",
                          "refund at most the remaining amount"), True
    try:
        refund = payments.refund(order, args.amount_cents, idempotency_key=args.idempotency_key)
    except payments.TransientError as exc:
        log.warning("refund transient failure order=%s err=%s", args.order_id, exc)
        return tool_error("UPSTREAM_UNAVAILABLE", str(exc), "retry once with the same idempotency_key"), True
    return json.dumps({"refund_id": refund.id, "status": refund.status,
                       "remaining_cents": order.total_cents - order.refunded_cents - args.amount_cents}), False
```

`orders_repo` and `payments` are your application services; the handler owns validation, authorization, and error mapping.

## Permission Levels
| Level | Examples | Control |
|---|---|---|
| Read | search, get, list | Rate limit, result caps |
| Reversible write | draft email, create branch | Log + idempotency |
| Irreversible / external | send email, pay, delete, deploy | Human approval or dry-run + confirm |

## Debugging Wrong Tool Use
| Symptom | Likely cause | Fix |
|---|---|---|
| Picks wrong tool | Overlapping descriptions | Add "use X instead when..." lines; merge tools |
| Invents arguments | Missing lookup tool or vague schema | Add search tool; enums/patterns |
| Loops on errors | Errors without hints | Add corrective hints |
| Huge context | Verbose tool outputs | Field selection, pagination, truncation |
| Never calls tool | Description doesn't match user phrasing | Include trigger examples in description |

## Checklist
- [ ] Tool inventory cohesive and non-overlapping (split agents past ~10-15 tools or on eval evidence).
- [ ] Descriptions include when-not-to-use and output limits.
- [ ] Strict schemas (`required`, enums, `additionalProperties: false`).
- [ ] Server-side validation and authorization.
- [ ] Structured errors with hints; `is_error` set.
- [ ] Idempotency keys on writes; approval on irreversible actions.
- [ ] Tool-selection eval: prompts mapped to expected tool + args.

## References
- Anthropic docs: Tool use (tool_use / tool_result, `is_error`).
- OpenAI docs: Function calling and Structured Outputs (`strict: true`).
- Repo rule: `.claude/rules/mcp-server-design.md` for MCP-exposed tools.
