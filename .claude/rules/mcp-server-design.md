---
description: "j4flmao/rules — MCP server design for any agent, including small local models (Ollama, LM Studio)"
glob: "*"
---

# MCP Server Design Rules

Cursor/AI MUST follow these rules when building or extending a Model Context Protocol (MCP) server.

## 1. Tiered Tool Surface
- **Rule**: Expose tools in tiers selected by env var (e.g. `lite` ≤ 8, `standard` ≤ 18, `full` ≤ 30). Never ship one flat list of 40+ tools.
- **Why**: Tool-selection accuracy drops as the tool count grows, and small local models (3B–8B) degrade much sooner than frontier models. The tier sizes are working heuristics; check them with an eval on the target model.

## 2. Flat, Primitive Arguments
- **Rule**: Tool params are `str`, `int`, `float`, `bool`, `list[str]`, or 2-D arrays. No nested objects, no `oneOf`/`anyOf` beyond optional.
- **Example (Bad)**: `read(target={"sheet": "A", "range": {"start": "A1", "end": "C9"}})`
- **Example (Good)**: `read(path="x.xlsx", sheet="A", range="A1:C9")`

## 3. Hard Token Budget on Every Response
- **Rule**: Every tool output is capped (default ~1,500 tokens) and returns a `next` cursor when truncated. Prefer Markdown tables / TSV over arrays-of-objects JSON. If you declare an `outputSchema`, also return the same data as `structuredContent`.

## 4. Errors That Teach
- **Rule**: Report tool failures as a tool result with `isError: true`, not as a protocol-level error, so the model can see the error and recover. The content is `{error: <closed-enum code>, message, hint}`, where the hint contains a corrected example call or the valid choices (e.g. existing sheet names).

## 5. stdout Is the Protocol
- **Rule**: In stdio servers, never `print()` or write to stdout from library code. stdout carries JSON-RPC messages only. Log to stderr.

## 6. Safe by Default
- **Rule**: Path allow-list (roots), no execution of model-supplied code, read-only by default, writes atomic and non-destructive (new file unless `overwrite=true`), no network unless an opt-in flag is set.
- **Rule**: Set tool annotations honestly (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) so clients can gate confirmations. Clients treat them as hints, not as a security boundary.

## 7. One Core, Many Faces
- **Rule**: MCP, CLI and HTTP adapters are thin wrappers over the same service layer. Tool metadata has a single source of truth so schemas can be exported for non-MCP hosts (OpenAI function-calling, mcpo/OpenAPI).
