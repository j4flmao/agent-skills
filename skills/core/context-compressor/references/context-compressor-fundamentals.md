# Context Compressor Fundamentals

## Core Principles

### Token Economy
Every token in a context window has an opportunity cost. Sending a verbose explanation of a debugging session means 500 fewer tokens for code generation. The compressor's fundamental principle: maximize decision density per token while preserving round-trip safety (someone reading the summary can continue work without the original conversation).

### Lossy Compression Is Acceptable
Not all conversation history is equal. Implementation details (specific variable names, stack traces, debug output) can be sacrificed. Decisions, configuration values, and open questions cannot. The compressor applies priority scoring to distinguish between preservable and discardable information.

### The 50-Line Hard Limit
Research and practical experience show that compressed summaries beyond 50 lines lose their utility — they become too long for quick scanning and too expensive to inject into new sessions. The hard limit forces aggressive prioritization and teaches compression discipline.

## Key Concepts

### Structured Extraction
The compressor does not summarize — it extracts structured fields from unstructured conversation. Each piece of information is classified into exactly one of five buckets: Decisions, Files Changed, Current State, Next Steps, Open Questions. This structure makes the summary machine-parseable and human-scanable simultaneously.

### Priority-Based Retention
Not all decisions are equally important. A language choice (P1) affects every future line of code. A test framework preference (P3) affects only test files. Priority scoring ensures that when the 50-line limit is hit, the compression removes the least impactful information first.

### Round-Trip Safety
A compressed summary passes the round-trip test if: "a different agent at a different time, given only this summary and the next user message, can continue the work correctly." This means the summary must contain all context-dependent information that cannot be inferred from the conversation's current state.

## Deciding What to Keep

### Information That Must Be Preserved
- Technology stack decisions (language, framework, database, infrastructure)
- Breaking changes and their migration paths
- Configuration values that affect behavior (ports, URLs, feature flags)
- Security-related decisions (auth method, encryption, key management)
- Bug root causes and their fixes
- API contract changes
- Schema changes
- Unresolved decisions and blockers

### Information That Can Be Discarded First
- Implementation details (exact variable names, line numbers for minor changes)
- Debugging steps and intermediate investigation results
- Exploratory discussion and alternative evaluation (keep only the conclusion)
- Verbose rationale for obviously correct decisions
- Progress updates that don't affect future work

## Compression Workflow

### Basic Pipeline
1. Scan full conversation history
2. Extract structured information into 5 buckets
3. Apply priority scoring to each item
4. Format using abbreviation rules and compression patterns
5. Count lines; if over 50, remove lowest-priority items
6. Re-count; repeat until under 50
7. Append compression footer

### Quality Gate
Before delivering: verify all P1 items are present, Current State is exactly 1 line, Open Questions are present even if empty, and total line count is ≤ 50.

## Common Patterns

### Aggressive Truncation
For conversations where early exchanges are irrelevant (initial setup is done, dependencies are installed, basic structure is created), truncate aggressively. Keep only exchanges that contain decisions or changes still affecting current state.

### Consolidation
When the same file was modified multiple times or the same decision was discussed repeatedly, consolidate into a single bullet. Example: "Modified user model 3 times for different fields" → `[DB] User model: added name, email, role fields (3 changes consolidated)`.

### Flat Formatting
Use markdown headers only for the 5 required sections. Within sections, use flat bullet lists with no nesting. Nested lists waste vertical space and make scanning harder. Flatten all hierarchy into single-level bullets with domain prefixes.
