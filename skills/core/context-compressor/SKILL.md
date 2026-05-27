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

## Compression Strategies

### Truncation Strategy
The simplest compression approach: remove the oldest conversation exchanges while keeping the most recent N exchanges. This works well when conversation history is linear and early exchanges are no longer relevant because their decisions have been applied. The sliding window approach keeps the last M exchanges (default M=10) plus any exchanges that contain key decisions, file change records, or configuration settings. Truncation is lossy but fast — it requires no processing beyond counting exchanges and identifying decision-bearing messages. Use truncation as a first pass before applying more sophisticated strategies.

### Summarization Strategy
Replace verbose exchanges with condensed bullet-point summaries. Each exchange is reduced to its essential information: the user's request, the action taken, the result, and any decisions made. A 20-line exchange about debugging a database connection might become `Debugged PG connection timeout — increased pool to 20, added connection retry with 3 attempts`. Summarization preserves the critical information from each exchange while stripping narrative structure, explanations, context, and filler phrases. This is the most common compression strategy and works well for conversations with mixed technical and explanatory content.

### Hierarchical Strategy
Organize compressed information by topic or domain rather than chronologically. Group all decisions about database choices together, all configuration changes together, all file modifications together. This is useful when a conversation spans multiple independent topics (backend, frontend, infrastructure) or when the same file was modified multiple times across different exchanges. The hierarchical approach produces a summary organized by concern rather than timeline, which makes it easier for the receiving agent to find all relevant information about a specific topic without reading the entire summary. Apply hierarchical strategy when the conversation covers 3 or more distinct domains.

### Priority Scoring Strategy
Assign each piece of information a priority score based on its impact on future work. Priority 1 (critical): technology choices, breaking changes, security decisions, configuration values that affect behavior. Priority 2 (important): bug root causes, architectural decisions, schema changes, API contract changes. Priority 3 (normal): file modifications for reference, testing decisions, tooling setup. Priority 4 (low): progress updates, exploratory discussion, alternative evaluation. Score each decision and include all priority 1-2 items, include priority 3 items if space permits, discard priority 4 items first when compressing to fit 50 lines.

### Streaming Compression
When conversation history is very long (100+ exchanges), process it in chunks rather than all at once. Divide the conversation into segments of 20-30 exchanges each. Compress each segment independently. Then merge the segment summaries into a single compressed output, applying priority scoring to decide what to keep from each segment. This prevents context overflow during the compression process itself. Streaming compression is recommended for any conversation exceeding 50 exchanges or 40000 tokens of history.

### Multi-Turn Conversation Management
For conversations that span multiple sessions (the user compressed context, started a new session, then continued working), merge the previous compressed summary with new conversation history. The previous summary's Decisions, Open Questions, and Current State sections are combined with new data. Conflicts are resolved by preferring the most recent decision. Duplicate entries are deduplicated. The merged output must still fit within 50 lines.

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
| Migration | mig | Integration | int |
| Deployment | deploy | Service | svc |

### Priority Scoring Matrix
| Category | Priority | Always Include | Compress First |
|---|---|---|---|
| Tech decisions | 1 | Language, framework, database choice | Rationale detail |
| Config values | 1 | PORT, DB_URL, API_KEY, feature flags | Comments, history |
| Architecture | 2 | Structural choices, module boundaries | Implementation details |
| Bug fixes | 2 | Root cause, fix approach, test added | Stack traces, debug output |
| File changes | 3 | File path, change description | Exact line numbers for minor changes |
| Progress | 4 | Current state line | Everything |

### Compression Examples
| Verbose Original | Compressed |
|---|---|
| We decided to use PostgreSQL because it has better JSONB support for our flexible schema requirements. | PG over MySQL — JSONB support needed |
| The user should set the LOG_LEVEL environment variable to debug to get more verbose logging output. | LOG_LEVEL=debug |
| We modified the authentication middleware to check for JWT tokens in the Authorization header instead of the cookie. | auth middleware: JWT check moved from cookie to Authorization header |
| After discussing with the team, we increased the timeout from 10 seconds to 30 seconds to handle the new batch endpoint. | timeout 10s → 30s (batch endpoint needs it) |
| We added a new route handler for the password reset endpoint in the auth controller. | auth: added password reset route |
| The user prefers 2-space indentation and single quotes for strings. | style: 2-space indent, single quotes |
| We fixed the null pointer exception in UserService.findByEmail by adding a null check before accessing the email property. | fix: UserService.findByEmail — added null check |

## Rules

- **50 lines maximum — hard limit** — Compression loses utility past 50 lines. If the output exceeds this, run the compression again on the output itself. Never output more than 50 lines.
- **No full sentences or paragraphs** — Use bullet fragments with key-value pairs, arrow notation, and parenthetical alternatives. "Decided X because Y" not "We decided to use X because of Y."
- **Strip articles, filler words, and redundant phrases** — "Increased timeout to 30s" not "We increased the timeout to 30 seconds." Remove every word that does not carry semantic meaning.
- **Preserve every decision, sacrifice implementation detail** — When compressing further to fit 50 lines, remove implementation specifics (exact line numbers of internal changes, variable names, test assertions) before removing any decision or rationale.
- **Always include open questions — always** — Unresolved decisions are the single most important category in the summary because they block future work. If there are no open questions, state "No open questions" explicitly rather than omitting the section.
- **Abbreviate consistently throughout** — Establish abbreviations at the start and use them uniformly. Never switch between "config" and "configuration" or "auth" and "authentication" within the same summary.
- **Lossy compression is morally acceptable** — The goal is to fit critical information into 50 lines, not to preserve lossless history. Be aggressive about cutting implementation noise while protecting decision fidelity.
- **The summary must be round-trip safe** — The compressed summary plus the first exchange of the new session should contain enough information to reconstruct all critical decisions. Test by asking: could someone who was not in the original conversation continue from here?

## Compression Decision Flow

```
Start → How many exchanges? 
  <20 → Truncation (keep last 10 + key exchanges)
  20-50 → Summarization + Priority Scoring
  50-100 → Streaming (chunks of 20-30) + Merge + Priority Scoring
  100+ → Streaming + Hierarchical + Priority Scoring
  
After compression → Count lines
  <=50 → Add footer → Done
  >50 → Apply Priority Scoring → Remove lowest priority items
  Still >50 → Re-compress → Merge related items → Trim again
```

## Use Case-Specific Compression

### Debugging Sessions
When compressing a debugging conversation, prioritize: the root cause (P1), the fix applied (P1), the tests added (P2), the debugging steps taken (P3), and the tools used (P4). The Current State line should indicate whether the bug is fixed or still in progress. Open Questions should list any remaining unknowns about the bug's scope or related issues.

### Code Generation Sessions
When compressing a code generation conversation, prioritize: the generated file paths (P1), the architectural decisions made during generation (P1), the patterns and conventions used (P2), any deviations from the plan (P2), and the test coverage achieved (P3). Files Changed section should list every file created or modified. Next Steps should be ordered by generation dependency.

### Code Review Sessions
When compressing a code review conversation, prioritize: the review decisions made (approve, request changes, or comment) for each file (P1), the specific issues found and their severity (P1), the agreement on refactoring approach (P2), and the unresolved discussions (P1 — move to Open Questions). Open Questions should capture any blocked decisions waiting for author responses.

### Architecture Design Sessions
When compressing an architecture discussion, prioritize: the final architecture decision (P1), the alternatives considered and rejected with rationale (P1), the tradeoffs accepted (P2), the system boundaries and module responsibilities (P2), and the next steps for implementation (P1). Include a one-line Current State indicating which phase of the design process is complete.

## Section-Level Compression Rules

### Decisions Section Rules
- Every decision must include the choice and rationale in a single bullet.
- If an alternative was explicitly considered, include it in parentheses.
- Group related decisions by domain prefix: `[DB]`, `[Auth]`, `[API]`, `[FE]`, `[Infra]`.
- Use colon to separate domain prefix from the decision: `[DB] PG over MySQL — JSONB support`.
- Never include "We decided to" or similar preamble — just state the decision.

### Files Changed Section Rules
- Sort files alphabetically by full path for fast lookup.
- Use line ranges only for non-obvious changes (omit for single-line changes).
- Group changes to the same file on one line with comma-separated descriptions.
- Use glob patterns for bulk changes: `src/routes/*.ts — added CRUD endpoints`.
- For created files, prefix with `+ `: `+ src/auth/middleware.ts:1-50 — JWT check`.

### Current State Section Rules
- Exactly one line. Never more. Never less.
- Format: `<domain>: <action-completed>. <next-milestone> pending.`
- Example: `Auth: JWT middleware done. User CRUD pending.`
- Use present perfect for completed items, present continuous for in-progress.

### Next Steps Section Rules
- Numbered list, ordered by dependency (prerequisites first).
- First item must be actionable immediately from the compressed summary.
- Each item starts with an action verb: Implement, Add, Fix, Write, Deploy, Test, Migrate.
- Each item specifies the target file or area if applicable.
- Max 10 items. If more than 10, group related items.

### Open Questions Section Rules
- Each item follows format: `{question} → blocks {what it blocks}`.
- If no open questions, state: `No open questions.` — never omit the section.
- Group related questions: `[Auth] JWT refresh strategy? → blocks token management impl.`

## Compression Quality Checklist

Before delivering a compressed summary, verify:
- [ ] Exactly 5 sections present (Decisions, Files Changed, Current State, Next Steps, Open Questions)
- [ ] No section exceeds its target line allocation
- [ ] Every decision from the original conversation is preserved
- [ ] Every file change is listed with path and description
- [ ] Current State is exactly one line
- [ ] Next Steps are ordered by dependency
- [ ] Open Questions are present even if empty
- [ ] Abbreviations are used consistently
- [ ] Line count is <= 50
- [ ] Footer is appended as the final line

## References
  - references/compression-strategies.md — Compression Strategies
  - references/context-compressor-advanced.md — Context Compressor Advanced Topics
  - references/context-compressor-fundamentals.md — Context Compressor Fundamentals
  - references/context-retrieval.md — Context Retrieval System
  - references/context-window-management.md — Context Window Management
  - references/state-management.md — State Management
  - references/summary-templates.md — Summary Templates
  - references/token-management.md — Token Management
## Handoff
master-orchestrator — the compressed summary is injected at the start of the next work session for the master orchestrator skill to continue the work from where it was interrupted.
