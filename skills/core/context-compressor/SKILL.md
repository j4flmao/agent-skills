---
name: core-context-compressor
description: >
  Use this skill when the user says 'compress context', 'context summary', 'token save', 'compression', 'condense', 'summarize conversation', 'context budget', 'reduce tokens', 'context window'. Produces a structured compressed summary of current session context. Do NOT use for: general note-taking or file writing.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [core, context, compression, phase-7]
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Core Context Compressor

## Purpose
Compress long conversation histories into structured, token-efficient summaries for continuing work within context window limits. Extracts decisions, file changes, configuration values, and next steps into a bullet-point format optimized for AI agent consumption.

Large language models have finite context windows. As conversations grow over dozens of exchanges, the cost of keeping full history increases and the quality of responses degrades because relevant information is buried. This skill solves that by producing a lossy-but-critical compression — it sacrifices implementation detail while preserving every decision, every file change, every configuration value, and every unresolved question. The output is a self-contained structured summary that can be injected at the start of a new session to continue work seamlessly, as if no context was lost.

## Agent Protocol

### Trigger
"compress context", "context summary", "token save", "compression", "condense", "summarize conversation", "context budget", "reduce tokens", "context window"

### Input Context
- Full conversation history up to this point — the complete exchange between the user and the AI agent
- List of files modified with their absolute or relative paths, and the nature of each change
- Key decisions made during the conversation with the rationale and alternatives that were considered and rejected
- Configuration values that were set: environment variable names and values, port numbers, URLs, feature flags, framework configuration options
- User preferences that were expressed or inferred: code style preferences, naming conventions, formatting rules, architectural patterns preferred or dispreferred
- Current task state: what phase of the overall workflow is complete, what is actively in progress
- Blocking issues and unresolved open questions that need answers before the work can continue
- Next steps as stated or implied at the end of the last exchange

### Output Artifact
Structured compressed summary with exactly 5 sections: Decisions, Files Changed, Current State, Next Steps, Open Questions

### Response Format
- ## Decisions — each bullet contains: the decision made, the rationale, and any alternatives that were considered and rejected. Preserve every decision regardless of perceived importance.
- ## Files Changed — each bullet in format: `path/file.ts:startLine-endLine` followed by a brief description of what changed and why.
- ## Current State — exactly one line describing where the work stands relative to the overall plan.
- ## Next Steps — numbered list ordered by dependency. Each item starts with an action verb and is specific enough to be actionable without additional context.
- ## Open Questions — bullet list of unresolved decisions. Each item states what is unresolved and what it blocks.
- Maximum 50 lines total — this is a hard limit. Count lines after writing. If the output exceeds 50 lines, run the compression again on the output to reduce further.
- Compression footer appended as the final line of every output.
- No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
Compressed summary is under 50 lines. All critical decisions from the conversation are preserved with rationale. The current state is clear in one line. Next steps are ordered by dependency and actionable. All unresolved questions are captured. Someone could pick up the summary and continue the work without reviewing the full conversation history.

### Max Response Length
1000 tokens

## Workflow

1. **Analyze current context** — Scan the entire conversation history systematically to extract structured information. Identify every key decision: what was decided, why that choice was made, and what alternatives were considered and rejected — each of these becomes a bullet in the Decisions section. Identify every file that was modified, including line ranges and a brief description of the change — these go in Files Changed. Identify the current position in the overall workflow — this becomes a one-line Current State. Identify all explicitly stated or implied next steps — order these by dependency and make each one an actionable item in Next Steps. Identify all unresolved questions, decisions on hold, or blockers that need external input — each one goes in Open Questions.

2. **Extract essential information** — Focus on extracting information that affects future decisions or actions. Technology choices: what programming language, framework, database, queue system, cache, or infrastructure service was selected and why. Architecture decisions: what structural choices were made, what tradeoffs were accepted, what was explicitly rejected. Configuration values: every environment variable, port number, URL, connection string, feature flag, and framework option that was set. Bug root causes: what caused the bug, how it was fixed, and what tests were added to prevent regression. User preferences: naming conventions, indentation style, semicolon usage, test framework preference, architectural pattern preference.

3. **Compress the format aggressively** — Use bullet points exclusively — no paragraphs, no full sentences, no narrative structure. Strip all articles (the, a, an) from the text. Use established abbreviations consistently throughout: config for configuration, auth for authentication, authz for authorization, dev for development, prod for production, env for environment, dep for dependency, repo for repository, impl for implementation, est for established. Use key-value pairs for configuration values: `PORT=3000`, `DB_URL=postgres://localhost:5432/app`. Use arrow notation (→) to show causality or sequence: `chose PG → JSONB support needed`. Use parentheses for alternatives: `chose PG (alt: MySQL — rejected: no JSONB)`. Strip all formatting fluff — no bold, no italics, no blockquotes, no decorative markdown.

4. **Output structured summary** — Produce exactly 5 markdown sections with H2 (##) headings. Decisions section preserves every decision with rationale — err on the side of inclusion. Files Changed section lists every modified file with line ranges, sorted alphabetically by directory and filename. Current State section is a single line — no more, no less. Next Steps section is a numbered list, ordered so that earlier items are prerequisites for later items, each starting with an action verb. Open Questions section is a bullet list where each item names the unresolved issue and what it blocks. After writing the summary, count the total lines. If over 50, run the compression again by identifying detail that can be sacrificed (implementation specifics, exact line numbers, verbose rationale) while preserving all decisions and questions.

## Models

### Compression Decision Tree
```
Ask of each piece of information:
  Does this affect future decisions?       → Keep in Decisions
  Does this identify what was changed?     → Keep in Files Changed
  Does this describe where we are?         → Keep in Current State
  Does this tell us what to do next?       → Keep in Next Steps
  Is this an unresolved blocker?           → Keep in Open Questions
  Is this implementation noise or detail?  → Discard
```

### Abbreviation Table
| Full Term | Abbreviation | Full Term | Abbreviation |
|---|---|---|---|
| Configuration | config | Environment | env |
| Authentication | auth | Authorization | authz |
| Documentation | docs | Dependency | dep |
| Repository | repo | Implementation | impl |
| Development | dev | Production | prod |
| Established | est | Benchmark | bench |

### Compression Examples
| Verbose Original | Compressed |
|---|---|
| We decided to use PostgreSQL because it has better JSONB support for our flexible schema requirements. | PG over MySQL — JSONB support needed |
| The user should set the LOG_LEVEL environment variable to debug to get more verbose logging output. | LOG_LEVEL=debug |
| We modified the authentication middleware to check for JWT tokens in the Authorization header instead of the cookie. | auth middleware: JWT check moved from cookie to Authorization header |
| After discussing with the team, we increased the timeout from 10 seconds to 30 seconds to handle the new batch endpoint. | timeout 10s → 30s (batch endpoint needs it) |

## Rules

- **50 lines maximum — hard limit** — Compression loses utility past 50 lines. If the output exceeds this, run the compression again on the output itself. Never output more than 50 lines.
- **No full sentences or paragraphs** — Use bullet fragments with key-value pairs, arrow notation, and parenthetical alternatives. "Decided X because Y" not "We decided to use X because of Y."
- **Strip articles, filler words, and redundant phrases** — "Increased timeout to 30s" not "We increased the timeout to 30 seconds." Remove every word that does not carry semantic meaning.
- **Preserve every decision, sacrifice implementation detail** — When compressing further to fit 50 lines, remove implementation specifics (exact line numbers of internal changes, variable names, test assertions) before removing any decision or rationale.
- **Always include open questions — always** — Unresolved decisions are the single most important category in the summary because they block future work. If there are no open questions, state "No open questions" explicitly rather than omitting the section.
- **Abbreviate consistently throughout** — Establish abbreviations at the start and use them uniformly. Never switch between "config" and "configuration" or "auth" and "authentication" within the same summary.
- **Lossy compression is morally acceptable** — The goal is to fit critical information into 50 lines, not to preserve lossless history. Be aggressive about cutting implementation noise while protecting decision fidelity.
- **The summary must be round-trip safe** — The compressed summary plus the first exchange of the new session should contain enough information to reconstruct all critical decisions. Test by asking: could someone who was not in the original conversation continue from here?

## References

- [Compression Patterns](references/compression-patterns.md)

## Handoff
master-orchestrator — the compressed summary is injected at the start of the next work session for the master orchestrator skill to continue the work from where it was interrupted.
