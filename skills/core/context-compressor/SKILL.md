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
version: "1.1.0"
author: "j4flmao"
license: "MIT"
---

# Core Context Compressor

## Purpose
Compress long conversation histories into structured, token-efficient summaries for continuing work within context window limits. Extracts decisions, file changes, configuration values, and next steps into bullet-point format optimized for AI agent consumption.

LLMs have finite context windows (~32K-200K tokens). As conversations grow over dozens of exchanges, quality degrades because relevant information is buried. This skill produces a lossy-but-critical compression sacrificing implementation detail while preserving every decision, file change, configuration value, and unresolved question.

## Agent Protocol

### Trigger
"compress context", "context summary", "token save", "compression", "condense", "summarize conversation", "context budget", "reduce tokens", "context window"

### Input Context
- Full conversation history up to this point
- List of files modified with absolute or relative paths and change descriptions
- Key decisions with rationale and alternatives considered and rejected
- Configuration values: env vars, port numbers, URLs, feature flags
- User preferences: code style, naming conventions, formatting rules
- Current task state: what phase is complete, what is in progress
- Blocking issues and unresolved open questions
- Next steps stated or implied at the end of last exchange

### Output Artifact
Structured compressed summary with exactly 5 sections: Decisions, Files Changed, Current State, Next Steps, Open Questions. Maximum 50 lines.

### Response Format
- **Decisions** — each bullet contains: decision made, rationale, alternatives considered and rejected
- **Files Changed** — format: `path/file.ts:startLine-endLine` + brief change description
- **Current State** — exactly one line describing position relative to overall plan
- **Next Steps** — numbered list ordered by dependency. Each starts with action verb, specific enough to be actionable without additional context
- **Open Questions** — bullet list of unresolved decisions with what each blocks
- Maximum 50 lines total — hard limit. If exceeded, run compression again on output.
- Compression footer appended as final line
- No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- Compressed summary is under 50 lines
- All critical decisions preserved with rationale
- Current state clear in one line
- Next steps ordered by dependency and actionable
- All unresolved questions captured
- Someone could pick up the summary and continue work without reviewing full history

### Max Response Length
1000 tokens

## Compression Strategies

### Truncation Strategy
Remove oldest conversation exchanges while keeping most recent N exchanges. Sliding window keeps last M exchanges (default M=10) plus exchanges containing key decisions, file changes, or configuration settings. Lossy but fast — no processing beyond counting exchanges and identifying decision-bearing messages. Use as first pass before more sophisticated strategies.

### Summarization Strategy
Replace verbose exchanges with condensed bullet-point summaries. Each exchange reduced to essential info: user request, action taken, result, decisions made. A 20-line debugging exchange becomes `Debugged PG connection timeout — increased pool to 20, added connection retry with 3 attempts`. Most common strategy, works well for mixed technical and explanatory content.

### Hierarchical Strategy
Organize compressed information by topic/domain rather than chronologically. Group all DB decisions together, all config changes together, all file modifications together. Useful when conversation spans multiple independent topics (backend, frontend, infrastructure) or when same file was modified multiple times. Apply when conversation covers 3+ distinct domains.

### Priority Scoring Strategy
Assign each info item a priority score based on impact on future work:
- **P1 (Critical)**: Technology choices, breaking changes, security decisions, configuration values affecting behavior
- **P2 (Important)**: Bug root causes, architectural decisions, schema changes, API contract changes
- **P3 (Normal)**: File modifications for reference, testing decisions, tooling setup
- **P4 (Low)**: Progress updates, exploratory discussion, alternative evaluation
Include all P1-P2 items, include P3 if space permits, discard P4 first when compressing to fit 50 lines.

### Streaming Compression
When conversation history exceeds 50 exchanges or 40K tokens, process in chunks of 20-30 exchanges. Compress each chunk independently. Merge segment summaries into single output, applying priority scoring to decide what to keep from each segment. Prevents context overflow during compression itself.

### Multi-Turn Session Merging
For conversations spanning multiple compressed sessions, merge previous summary's Decisions, Open Questions, and Current State with new history. Conflicts resolved by preferring most recent decision. Duplicates deduplicated. Merged output must still fit within 50 lines.

## Workflow

1. **Analyze current context** — Scan full conversation history systematically. Identify every key decision (what, why, alternatives rejected) → Decisions section. Identify every modified file with line ranges and change descriptions → Files Changed. Identify current position in workflow → single-line Current State. Identify all next steps ordered by dependency → Next Steps. Identify all unresolved questions, blockers, pending decisions → Open Questions.

2. **Extract essential information** — Technology choices (language, framework, database, queue, cache, infra service + why). Architecture decisions (structural choices, tradeoffs accepted, what was rejected). Configuration values (every env var, port, URL, connection string, feature flag). Bug root causes (what caused it, how fixed, tests added). User preferences (naming, indentation, semicolons, test framework, architecture patterns).

3. **Compress format aggressively** — Bullet points exclusively. Strip all articles (the, a, an). Use consistent abbreviations. Use key-value pairs: `PORT=3000`. Use arrow notation for causality: `chose PG → JSONB support needed`. Use parentheses for alternatives: `chose PG (alt: MySQL — rejected: no JSONB)`. No bold, italics, blockquotes, or decorative markdown.

4. **Output structured summary** — 5 markdown H2 sections. Decisions: every decision with rationale, err on inclusion. Files Changed: sorted alphabetically by path. Current State: single line. Next Steps: numbered, ordered by dependency. Open Questions: each = `{question} → blocks {blocked item}`. Count lines. If over 50, sacrifice implementation specifics (line numbers, variable names, test assertions) before removing any decision or question.

## Decision Trees

### Content Classification
```
Each piece of information:
├── Affects future decisions?        → Keep in Decisions
├── Identifies what was changed?     → Keep in Files Changed  
├── Describes where we are?          → Keep in Current State
├── Tells us what to do next?        → Keep in Next Steps
├── Is an unresolved blocker?        → Keep in Open Questions (ALWAYS)
└── Is implementation noise/detail?  → Discard
```

### Strategy Selection
```
Conversation length:
├── <20 exchanges → Truncation (keep last 10 + key exchanges)
├── 20-50 exchanges → Summarization + Priority Scoring
├── 50-100 exchanges → Streaming (chunks of 20-30) + Merge + Priority Scoring
└── 100+ exchanges → Streaming + Hierarchical + Priority Scoring

After compression → Count lines:
├── ≤50 → Add footer → Done
├── >50 → Apply Priority Scoring → Remove lowest priority
└── Still >50 → Re-compress → Merge related → Trim again
```

### Use Case Routing
```
Conversation type:
├── Debugging → P1: root cause, P1: fix, P2: tests, P3: debug steps, P4: tools
├── Code Generation → P1: file paths, P1: arch decisions, P2: patterns, P2: deviations, P3: tests
├── Code Review → P1: review decisions per file, P1: issues+severity, P2: refactor plans, P1 (Open Q): unresolved
└── Architecture Design → P1: final decision, P1: alternatives+rationale, P2: tradeoffs, P2: boundaries, P1: next steps
```

## Abbreviation Table
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

## Priority Scoring Matrix
| Category | Priority | Always Include | Compress First |
|---|---|---|---|
| Tech decisions | 1 | Language, framework, database choice | Rationale detail |
| Config values | 1 | PORT, DB_URL, API_KEY, feature flags | Comments, history |
| Architecture | 2 | Structural choices, module boundaries | Implementation details |
| Bug fixes | 2 | Root cause, fix approach, test added | Stack traces, debug output |
| File changes | 3 | File path, change description | Minor change exact line numbers |
| Progress | 4 | Current state line | Everything |

## Compression Examples
| Verbose Original | Compressed |
|---|---|
| We decided to use PostgreSQL because it has better JSONB support for our flexible schema requirements. | PG over MySQL — JSONB support needed |
| The user should set the LOG_LEVEL env var to debug to get more verbose logging. | LOG_LEVEL=debug |
| We modified the auth middleware to check for JWT tokens in the Authorization header instead of the cookie. | auth middleware: JWT check moved from cookie to Authorization header |
| After discussing with the team, we increased the timeout from 10 seconds to 30 seconds to handle the new batch endpoint. | timeout 10s → 30s (batch endpoint needs it) |
| We added a new route handler for the password reset endpoint in the auth controller. | auth: added password reset route |
| The user prefers 2-space indentation and single quotes for strings. | style: 2-space indent, single quotes |
| We fixed the null pointer exception in UserService.findByEmail by adding a null check before accessing the email property. | fix: UserService.findByEmail — added null check |

## Section-Level Rules

### Decisions Section
- Every bullet = choice + rationale
- Alternatives in parentheses if explicitly considered
- Group by domain prefix: `[DB]`, `[Auth]`, `[API]`, `[FE]`, `[Infra]`
- Colon separates domain prefix from decision: `[DB] PG over MySQL — JSONB support`
- Never include "We decided to" preamble

### Files Changed Section
- Sort alphabetically by full path for fast lookup
- Line ranges only for non-obvious changes (omit for single-line changes)
- Group same-file changes: comma-separated descriptions
- Use glob patterns for bulk: `src/routes/*.ts — added CRUD endpoints`
- Created files prefixed with `+ `: `+ src/auth/middleware.ts:1-50 — JWT check`

### Current State Section
- Exactly one line. Never more. Never less.
- Format: `<domain>: <action-completed>. <next-milestone> pending.`
- Example: `Auth: JWT middleware done. User CRUD pending.`
- Present perfect for completed, present continuous for in-progress

### Next Steps Section
- Numbered, ordered by dependency (prerequisites first)
- First item actionable immediately from compressed summary
- Each starts with action verb: Implement, Add, Fix, Write, Deploy, Test, Migrate
- Each specifies target file or area
- Max 10 items. Group related items if more than 10.

### Open Questions Section
- Format: `{question} → blocks {what it blocks}`
- If no open questions: `No open questions.` — never omit the section
- Group related: `[Auth] JWT refresh strategy? → blocks token management impl.`

## Production Considerations

### Token Budget Management
- Target summary: 400-600 tokens for a full session, 200-300 for short sessions
- Decision section: allocate 40% of token budget (most critical)
- Files Changed: allocate 20%
- Next Steps: allocate 20%
- Current State + Open Questions: allocate 20%
- If within 10% of hard limit, final compression pass before delivery

### Quality Assurance
Before delivering compressed summary, verify:
- [ ] Exactly 5 sections present (Decisions, Files Changed, Current State, Next Steps, Open Questions)
- [ ] No section exceeds its target line allocation
- [ ] Every decision from original conversation is preserved
- [ ] Every file change listed with path and description
- [ ] Current State is exactly one line
- [ ] Next Steps ordered by dependency
- [ ] Open Questions present even if empty
- [ ] Abbreviations used consistently
- [ ] Line count ≤ 50
- [ ] Footer appended as final line
- [ ] Round-trip safe: summary + first new exchange = sufficient to continue

### Recovery Patterns
- **Partial summary available**: If previous session's summary exists, merge rather than re-compress from scratch
- **Very long sessions (200+ exchanges)**: Process in 5-6 chunks of 30-40 exchanges, merge hierarchically
- **Multi-topic conversations**: Split by topic first, compress each independently, then merge
- **Critical loss prevention**: Always preserve at minimum: technology stack decisions, configuration values, and unresolved questions — even if everything else must be stripped

## Rules

- **50 lines maximum — hard limit** — If exceeds, run compression again on the output itself
- **No full sentences or paragraphs** — Bullet fragments with key-value pairs, arrow notation, parenthetical alternatives
- **Strip articles, filler words, redundant phrases** — Remove every word without semantic meaning
- **Preserve every decision, sacrifice implementation detail** — Remove line numbers and variable names before removing decisions
- **Always include open questions — always** — If none, state "No open questions" explicitly
- **Abbreviate consistently** — Never switch between full and abbreviated forms for same term
- **Lossy compression is morally acceptable** — Goal is fit into 50 lines, not lossless history
- **Round-trip safe** — Summary + one new exchange must allow full continuation

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
