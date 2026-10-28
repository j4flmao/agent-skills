# Tool Versioning and Compatibility in Agent Harnesses

Agents depend on tool contracts: names, descriptions, input schemas and result formats. Changing them can silently break prompts, cached conversations, evaluations and clients that connect over protocols such as the Model Context Protocol (MCP). This reference covers what counts as a breaking change, versioning strategies, MCP protocol version negotiation, schema evolution rules, deprecation, and compatibility testing.

## What Makes Up a Tool Contract

| Element | Consumers that depend on it |
|---------|-----------------------------|
| Tool name | Model behavior, system prompts, stored transcripts, allow/deny lists, approval rules |
| Description | Model's tool selection and argument choices |
| Input schema | Model generation, client-side validation, strict/structured output modes |
| Output format (text, `structuredContent`, `outputSchema`) | Model interpretation, downstream parsers, UIs |
| Error codes | Harness retry logic, model recovery behavior |
| Side effects and annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`) | Approval gating, retry safety |

Even "documentation-only" description changes can shift model behavior; treat them as behavior changes that need evaluation.

## Breaking vs Non-Breaking Changes

| Change | Compatibility |
|--------|---------------|
| Add optional input property with a safe default | Compatible |
| Add a new tool | Compatible (but may change tool selection; evaluate) |
| Add new fields to structured output | Compatible for tolerant readers |
| Add a new enum value to an output field | Potentially breaking for strict parsers |
| Add a new error code | Potentially breaking if callers switch exhaustively |
| Rename a tool or a property | Breaking |
| Make an optional property required | Breaking |
| Narrow types or ranges (string to enum, lower max) | Breaking for existing callers |
| Change default values or units | Breaking (silent behavior change) |
| Change side effects (read-only tool starts writing) | Breaking and a safety issue; requires new tool or explicit approval changes |
| Remove a tool or property | Breaking |

## Versioning Strategies

| Strategy | How | Pros | Cons |
|----------|-----|------|------|
| Additive evolution only | Never break; add optional fields and new tools | Simple for consumers | Accumulates legacy |
| Versioned tool names | `search_v2` alongside `search` | Explicit, both available during migration | Tool list grows; model may pick the old one |
| Server/package version + changelog | Semantic versioning of the tool server (MAJOR for breaking) | Familiar | Model does not see versions; clients must pin |
| Capability flags | Server advertises features; client enables them | Fine-grained | More complex negotiation |
| Tiered tool sets | Select tool set by configuration (for example lite/standard/full) | Keeps tool count low per deployment | Need tests per tier |

Recommended default: additive evolution, semantic versioning of the server package, and a new tool name only for truly incompatible semantics, with the old tool deprecated and removed after a migration window.

## MCP Protocol Version Negotiation

MCP uses date-based protocol revisions (for example `2025-03-26`, `2025-06-18`, `2025-11-25`). During initialization the client sends the latest version it supports; the server responds with the same version if supported, otherwise with another version it supports; the client disconnects if it cannot use the server's choice.

```json
{"jsonrpc": "2.0", "id": 1, "method": "initialize",
 "params": {"protocolVersion": "2025-06-18",
            "capabilities": {"roots": {"listChanged": true}},
            "clientInfo": {"name": "example-harness", "version": "1.8.0"}}}
```

```json
{"jsonrpc": "2.0", "id": 1,
 "result": {"protocolVersion": "2025-06-18",
            "capabilities": {"tools": {"listChanged": true}},
            "serverInfo": {"name": "sheets-server", "version": "3.2.1"}}}
```

Implementation notes:
- Over Streamable HTTP, clients send the negotiated version in the `MCP-Protocol-Version` header on subsequent requests (introduced in the 2025-06-18 revision).
- Support at least the current and previous protocol revision in servers and clients during transitions.
- Capabilities (tools, resources, prompts, `listChanged`, elicitation, structured output) are negotiated separately from the protocol version; check capabilities before using features.
- Servers that change their tool list at runtime should emit `notifications/tools/list_changed` when they declared `listChanged`, and clients should refetch.
- Use official SDKs, which track revisions; pin SDK versions and read their changelogs when upgrading.

## Schema Evolution Rules

```json
{
  "name": "read_range",
  "description": "Read cells from a sheet. Returns a markdown table. Use 'next' cursor if truncated.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path":  {"type": "string"},
      "sheet": {"type": "string"},
      "range": {"type": "string", "description": "A1 notation, e.g. A1:D20"},
      "max_rows": {"type": "integer", "minimum": 1, "maximum": 500, "default": 100}
    },
    "required": ["path", "range"],
    "additionalProperties": false
  }
}
```

- New properties are optional with defaults that preserve old behavior (here `sheet` defaulting to the first sheet).
- With `additionalProperties: false`, old clients sending removed properties will fail validation: keep accepting deprecated properties (ignored or mapped) during the deprecation window.
- Keep argument types flat and primitive; nested objects and `oneOf` unions are harder for models and harder to evolve.
- If an `outputSchema` is declared, return matching `structuredContent` and keep a text rendering for clients and models that read text.

## Deprecation Process

1. Mark deprecated in the description ("Deprecated: use `search_documents`; this tool will be removed after 2027-03-31") and in the changelog.
2. Emit telemetry on usage of deprecated tools and properties per client.
3. Provide a shim: the old tool calls the new implementation and maps arguments and results.
4. Remove only after usage drops to zero or the announced date passes, with a major version bump.
5. Return a teaching error after removal if old names still arrive (`not_found` with hint naming the replacement).

## Pinning and Reproducibility

- Record, for every agent run: model ID, system prompt version, tool server versions and protocol version, and tool definitions hash. Without this, evaluation results and incidents cannot be reproduced.
- Pin tool server versions in deployment manifests; upgrade through the same review and evaluation pipeline as prompt changes.
- Cache tool definitions per session; avoid changing the tool list mid-conversation unless the protocol signals it, since models rely on earlier definitions.

## Compatibility Testing

| Test | Purpose |
|------|---------|
| Schema diff in CI | Detect breaking changes automatically (removed/renamed tools or properties, new required fields, narrowed types) |
| Golden transcripts | Replay recorded tool calls from older clients against the new server |
| Contract tests per client | Each consuming harness verifies the subset it uses |
| Agent evals | Task success, tool selection accuracy and argument validity before/after changes |
| Protocol matrix | Test supported MCP protocol revisions and transports (stdio, Streamable HTTP) |

```python
def breaking_changes(old: dict, new: dict) -> list[str]:
    problems: list[str] = []
    old_tools = {t["name"]: t for t in old["tools"]}
    new_tools = {t["name"]: t for t in new["tools"]}
    for name, tool in old_tools.items():
        if name not in new_tools:
            problems.append(f"tool removed: {name}")
            continue
        old_props = tool["inputSchema"].get("properties", {})
        new_schema = new_tools[name]["inputSchema"]
        new_props = new_schema.get("properties", {})
        for prop in old_props:
            if prop not in new_props:
                problems.append(f"{name}: property removed: {prop}")
            elif old_props[prop].get("type") != new_props[prop].get("type"):
                problems.append(f"{name}: type changed: {prop}")
        added_required = set(new_schema.get("required", [])) - set(tool["inputSchema"].get("required", []))
        problems += [f"{name}: new required property: {p}" for p in sorted(added_required)]
    return problems
```

Fail the build on non-empty results unless the change is marked as a major version.

## Cross-Host Compatibility

When the same tools are exposed to several hosts (MCP clients, OpenAI-style function calling, OpenAPI via adapters), keep a single source of truth for tool metadata and generate each host's format from it. Hosts differ in supported JSON Schema features (formats, `$ref`, unions, defaults), so test the generated schemas in each host.

## Checklist

- [ ] Tool contract elements documented, including side effects and annotations
- [ ] Breaking-change rules applied; schema diff gate in CI
- [ ] MCP protocol versions negotiated; current and previous revisions supported
- [ ] Optional additions with defaults; deprecated inputs still accepted during windows
- [ ] Deprecation with telemetry, shims and dated removal
- [ ] Runs record model, prompt, tool server and protocol versions
- [ ] Evals rerun on any tool name, description or schema change
