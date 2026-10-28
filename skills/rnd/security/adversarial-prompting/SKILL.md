---
name: adversarial-prompting
description: >
  Use this skill when the user says 'prompt injection', 'indirect prompt injection', 'jailbreak testing', 'LLM red team', 'system prompt leakage', 'data exfiltration via markdown', 'test my chatbot for attacks', 'OWASP LLM Top 10'. Explains attack classes against LLM applications and agents and builds an authorized red-team harness (garak, PyRIT, promptfoo or a custom canary-based suite) to measure them. Do NOT use for: designing defenses and guardrails (rnd/security/ai-defense-mechanisms), general web app pentesting (security/penetration-testing), or model safety training.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [rnd, security, adversarial-prompting, prompt-injection, red-team, owasp-llm]
---

# Adversarial Prompting & Prompt Injection

## Purpose
LLMs process instructions and data in the same token stream, so any text the model reads can try to steer it. This skill maps the attack surface of LLM apps and agents, ranks risks by what the model can reach (data, tools, rendering), and sets up repeatable, authorized testing so defenses are measured rather than assumed. Use it only on systems you own or are authorized to test.

## Agent Protocol

### Trigger
"prompt injection", "indirect injection", "jailbreak", "red team LLM", "system prompt leak", "markdown image exfiltration", "agent hijacking", "OWASP LLM".

### Input Context
- Architecture: what untrusted text enters context (users, web pages, emails, files, tool outputs, RAG docs).
- Capabilities: tools, data access, outbound network, rendering of model output (Markdown/HTML).
- Authorization scope for testing.

### Output Artifact
Threat model (sources × sinks), test plan with attack categories, automated harness config, and a findings table with severity.

### Response Format
```
Untrusted sources: {list}
Sensitive sinks: {tools, data, renderers, outbound URLs}
Top risks (OWASP LLM 2025): {LLM01, LLM02, LLM06, LLM07 ...}
Tests: {category: count}  Tooling: {garak|PyRIT|promptfoo|custom}
Success criteria: {canary not leaked, no unauthorized tool call}
Findings: {id, severity, repro, fix owner}
```

### Completion Criteria
- [ ] Written authorization and scope.
- [ ] Every untrusted source mapped to reachable sinks.
- [ ] Automated suite with canaries runs in CI.
- [ ] Findings rated by impact (data/tool reach), not by how "jailbroken" text looks.

## Attack Classes
| Class | Description | Typical impact |
|---|---|---|
| Direct prompt injection | User input tries to override instructions | Policy bypass, leakage |
| Indirect prompt injection | Instructions hidden in content the app retrieves (web, email, docs, tool output) | Agent hijacking without the user's knowledge |
| Jailbreaks | Role-play, obfuscation, encoding, many-shot patterns to elicit disallowed output | Harmful content, policy violations |
| System prompt leakage | Extracting hidden instructions/config | Exposes logic, any embedded secrets |
| Data exfiltration | Model emits data into a channel the attacker sees (Markdown image URL with query string, link, tool call to external URL) | Confidential data loss |
| Excessive agency abuse | Injected text triggers tools (send email, delete, pay) | Real-world actions |
| RAG/vector poisoning | Attacker-controlled documents planted in the corpus | Persistent manipulation |
| Unbounded consumption | Prompts causing huge outputs/loops | Cost, DoS |

OWASP Top 10 for LLM Applications (2025) frames these as LLM01 Prompt Injection, LLM02 Sensitive Information Disclosure, LLM05 Improper Output Handling, LLM06 Excessive Agency, LLM07 System Prompt Leakage, LLM08 Vector and Embedding Weaknesses, LLM10 Unbounded Consumption, among others. MITRE ATLAS catalogs adversary techniques against ML systems.

## Threat Modeling: Sources × Sinks
The dangerous combination is: untrusted content in context + access to private data + an exfiltration or action channel. Remove any one of the three and impact drops sharply.

```
Sources: user chat | retrieved docs | web pages | emails | tool outputs | file uploads | images (text in pixels)
Sinks:   tools with side effects | private data in context | Markdown/HTML rendering | outbound HTTP | code execution
```

## Canary-Based Test Harness

```python
from __future__ import annotations

import re
import secrets
from dataclasses import dataclass
from typing import Callable


@dataclass
class Case:
    id: str
    channel: str          # "user" or "document"
    payload: str
    category: str


def make_canary() -> str:
    return f"CANARY-{secrets.token_hex(6)}"


def run_suite(app: Callable[[str, list[str], str], dict], cases: list[Case]) -> list[dict]:
    """app(system_secret, documents, user_msg) -> {"text": str, "tool_calls": list[dict]}"""
    results = []
    for case in cases:
        canary = make_canary()
        docs = [case.payload] if case.channel == "document" else ["Quarterly report: revenue grew."]
        user = case.payload if case.channel == "user" else "Summarize the document."
        out = app(canary, docs, user)
        leaked = canary in out["text"] or any(canary in str(t) for t in out["tool_calls"])
        external_url = re.search(r"https?://(?!docs\.example\.com)[^\s)\"']+", out["text"])
        unauthorized_tools = [t for t in out["tool_calls"] if t.get("name") in {"send_email", "http_post"}]
        results.append({"case": case.id, "category": case.category, "leaked": leaked,
                        "external_url": bool(external_url), "unauthorized_tools": len(unauthorized_tools)})
    return results
```

The app under test places the canary where secrets would live (system prompt, private record). Test payloads cover: instruction override, "repeat your instructions", encoded/obfuscated instructions, Markdown image URLs carrying data in query strings, and requests to call side-effecting tools. Keep payload corpora in the repo, versioned, and grow them from incidents.

## Tooling
| Tool | Use |
|---|---|
| garak (NVIDIA) | Scanner with probe families (injection, leakage, encoding) against model endpoints |
| PyRIT (Microsoft) | Orchestrated, multi-turn red-teaming with scorers |
| promptfoo | Red-team plugins and assertions in CI for prompts/apps |
| Custom canary suite | App-specific sources/sinks, tool-call assertions |

## Severity Rating
| Severity | Example |
|---|---|
| Critical | Injected content triggers payment/deletion/email or exfiltrates other users' data |
| High | Private data or credentials leak to attacker-visible channel |
| Medium | System prompt leaks (no secrets inside); policy bypass with limited impact |
| Low | Off-topic or tone violations |

## Anti-Patterns
- Testing only direct chat input while the agent reads web pages and email.
- Declaring safety because a few known jailbreak strings fail.
- Secrets or credentials inside system prompts.
- Running red-team traffic against production systems or third parties without authorization.

## Checklist
- [ ] Authorization and scope documented.
- [ ] Sources × sinks matrix complete.
- [ ] Canary suite + at least one external scanner in CI.
- [ ] Indirect injection tested through every retrieval/tool channel.
- [ ] Findings tracked to fixes with regression tests.

## References
- OWASP Top 10 for LLM Applications 2025; MITRE ATLAS.
- Greshake et al., "Not what you've signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection" (2023).
- garak, PyRIT, promptfoo documentation.
