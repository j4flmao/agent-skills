# Compression Strategies

## Format Template
```
## Decisions
- Used X over Y — Z reason
- Chose A RB for B (alternative: C deemed too slow)
- Set TZ=UTC, LOG_LEVEL=info

## Files Changed
- src/auth.ts:42 — Added email validation
- src/user.ts:15-30 — Refactored cache strategy
- tests/auth.test.ts — Added edge case tests

## Current State
Dev env running. Auth flow complete. User CRUD in progress.

## Next Steps
1. Implement password reset endpoint
2. Add rate limiting to auth routes
3. Write integration tests for login flow

## Open Questions
- Should refresh tokens use Redis or DB?
- What's the password complexity requirement?
```

## Truncation Strategy

### Overview
Truncation removes the oldest conversation exchanges, keeping only the most recent N exchanges. It is the simplest and fastest compression method but also the most lossy. Use it as a first pass before applying other strategies.

### Implementation
1. Divide the conversation into individual exchanges (user message + assistant response = 1 exchange).
2. Identify exchanges that contain key information: decisions, file changes, configuration values, or unresolved questions.
3. Apply the sliding window: keep the last M exchanges (default M=10) plus any exchange identified in step 2, regardless of age.
4. If the combined count exceeds the token budget, reduce M until the budget is met.

### When to Use
- Conversations under 20 exchanges — truncation alone is sufficient.
- Conversations where the most recent exchanges contain all the decisions.
- As a preprocessing step before summarization — truncate old exchanges that contain no key information.

### When to Avoid
- Conversations where early exchanges contain foundational decisions still relevant to current work.
- Multi-topic conversations where different topics were discussed at different times.
- Conversations with many short exchanges that individually contain no key information but collectively establish context.

## Summarization Strategy

### Overview
Summarization replaces verbose exchanges with condensed bullet-point representations. Each exchange is distilled to its essential information: request, action, result, decisions. This is the default compression strategy.

### Implementation
For each exchange:
1. Extract the user's request or question in 5 words or fewer.
2. Identify the action taken: code written, configuration changed, analysis performed.
3. Record the result: what changed, what was learned, what was produced.
4. Capture decisions made: what was chosen, why, and what alternatives were rejected.
5. Produce a single bullet: `{action} → {result} ({decisions})`.

### Example
Verbose exchange (15 lines):
```
User: I'm thinking about which database to use for our new service. We need good JSON support and the team knows SQL well. I've used PostgreSQL before but I've heard good things about MongoDB. What do you recommend?

Assistant: Based on your requirements for JSON support and team familiarity with SQL, I recommend PostgreSQL. It has excellent JSONB support that provides the flexibility of a document store while maintaining relational integrity. MongoDB would require the team to learn a new query paradigm and would add complexity for join operations.
```

Compressed to 1 bullet:
```
DB choice → PG over MySQL — JSONB needed. Rejected MongoDB (new query paradigm, team lacks exp).
```

### When to Use
- General-purpose conversations with mixed content types.
- Conversations where narrative structure provides no information.
- Conversations where the user and assistant collaborate iteratively with clear request/response patterns.

### When to Avoid
- Highly technical debugging sessions where every detail matters.
- Conversations with complex branching logic (multiple parallel threads of work).

## Hierarchical Strategy

### Overview
Organize compressed information by topic or concern rather than chronologically. Group all database decisions together, all configuration changes together, all file modifications together. This produces a summary organized by domain.

### Implementation
1. Scan all exchanges and tag each piece of information with a domain label: `[DB]`, `[Config]`, `[Auth]`, `[API]`, `[Frontend]`, `[Infra]`, `[Tests]`.
2. Group information by domain label.
3. Within each domain, order by priority (decisions first, then configuration, then file changes).
4. Produce sections ordered by number of items per domain (most items first).

### Example
```
## Decisions
- [DB] PG over MySQL — JSONB support needed
- [Auth] JWT over session cookies — stateless scaling
- [Infra] ECS over K8s — team lacks K8s expertise

## Files Changed
- [API] src/routes/users.ts:10-40 — Added CRUD endpoints
- [DB] src/models/user.ts:1-50 — Added User model with PG

## Config
- [Infra] ECS task memory: 512MB → 1GB
- [DB] DB_POOL_SIZE=20
```

### When to Use
- Conversations spanning 3 or more distinct domains.
- Conversations where the same file or concern was modified across multiple non-adjacent exchanges.
- Handoffs between different team members or skills where each cares about a different subset of information.

### When to Avoid
- Single-domain conversations — chronological or summarization strategies are simpler and produce the same result.

## Priority Scoring Strategy

### Scoring Matrix
| Priority | Category | Retention |
|---|---|---|
| 1 (Critical) | Tech choices, config values, security decisions, breaking changes | Always keep |
| 2 (High) | Architecture decisions, bug root causes, schema changes, API contracts | Always keep |
| 3 (Normal) | File modifications, testing decisions, tooling setup | Keep if space |
| 4 (Low) | Progress updates, exploratory discussion, alternative eval | Compress first |

### Implementation
1. Assign a priority score to each piece of extracted information.
2. Sort by priority (1 first, then 2, then 3, then 4).
3. Include all priority 1-2 items.
4. Include priority 3 items until the 50-line limit is reached.
5. Discard priority 4 items unless there is remaining space.

## Sliding Window Strategy

### Overview
Keep a window of the most recent exchanges plus key exchanges from earlier in the conversation. The window slides forward as the conversation grows, maintaining a bounded context size.

### Implementation
```
Window size: 15 exchanges
Key exchange markers: exchanges containing decisions, file changes, config values, or open questions.
Algorithm:
  Window = last 10 exchanges + up to 5 key exchanges (by reverse chronological)
  If total > 15, remove oldest key exchanges until window fits
  Always keep the last 3 exchanges (recent context)
```

The sliding window is the recommended starting point for conversations exceeding 30 exchanges. Apply summarization to the window contents for the final compressed output.

## Streaming Compression

### Overview
For conversations exceeding 100 exchanges or 40000 tokens, compress in chunks to avoid context overflow during the compression process itself.

### Implementation
1. Divide conversation into chunks of 20-30 exchanges each.
2. Apply summarization strategy to each chunk independently.
3. Merge chunk summaries into a single document.
4. Apply priority scoring to the merged document to trim to 50 lines.
5. Deduplicate: remove repeated decisions, merge related file changes.

### Chunk Boundary Rules
- Never split an exchange across chunks.
- Prefer chunk boundaries at natural topic transitions.
- If a chunk boundary falls in the middle of a multi-exchange debugging session, extend the chunk to include all related exchanges.

## Multi-Turn Conversation Management

### Overview
When a compressed summary already exists from a previous session, merge it with new conversation history rather than compressing from scratch.

### Implementation
1. Load the previous compressed summary.
2. Scan the new conversation history.
3. Compare new decisions with previous decisions: if a decision was reversed, update it; if a decision was confirmed, keep both references; if a decision is new, add it.
4. Merge file changes: append new changes, deduplicate paths, combine line ranges.
5. Update current state: replace with the latest state line.
6. Update next steps: replace with the latest next steps.
7. Merge open questions: keep unresolved questions from previous session, add new questions.
8. Trim to 50 lines using priority scoring.

### Conflict Resolution
When the same decision appears in both the previous summary and new history, the new history takes precedence. Include a note: `(reversed: prev decision → new decision)`. This preserves the decision history without taking excessive space.

## Abbreviation Guide
| Full | Abbreviation |
|---|---|
| Configuration | config |
| Development | dev |
| Production | prod |
| Environment | env |
| Authentication | auth |
| Authorization | authz |
| Documentation | docs |
| Dependency | dep |
| Repository | repo |
| Implementation | impl |
| Established | est |
| Benchmark | bench |
| Migration | mig |
| Integration | int |
| Deployment | deploy |
| Service | svc |
| Application | app |
| Database | db |
| Infrastructure | infra |

## Compression Examples

| Verbose | Compressed |
|---|---|
| We decided to use PostgreSQL because it has better JSONB support | PG over MySQL — JSONB support needed |
| The user should set LOG_LEVEL to debug for more verbose logging | LOG_LEVEL=debug |
| We modified the auth middleware to check for JWT tokens in the Authorization header | auth middleware: JWT check from Authorization header |
| After discussing with the team, we increased the timeout from 10 seconds to 30 seconds | Timeout 10s → 30s (team consensus) |
| I added a new endpoint for user registration that validates the email and password on the server side | Added POST /api/register with server-side email+password validation |
| We had a bug where the cache wasn't being invalidated after a user updated their profile | Bug: cache not invalidated on profile update — fixed by adding cache:clear after update |
| The user prefers tabs over spaces and double quotes over single quotes | Style: tabs, double quotes |
