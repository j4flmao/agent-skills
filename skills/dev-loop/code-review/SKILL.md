---
name: code-review
description: >
  Use this skill when the user says 'review this code', 'code review', 'review PR',
  'check this implementation', 'is this code good', 'LGTM?', 'feedback on code', or
  wants a structured code review. Covers: correctness, architecture, clarity,
  performance, security, and test quality. Produces a structured review with
  severity levels: MUST, SHOULD, CONSIDER. Works with any language/stack.
  Do NOT use this for: debugging (use debugging-strategy), writing code, or
  architectural planning.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, review, phase-4]
---

# Code Review

## Purpose
Provide systematic, structured code reviews covering correctness, architecture, clarity, performance, security, and tests.

## Agent Protocol

### Trigger
Exact user phrases: "review this code", "code review", "review PR", "check this implementation", "is this code good", "LGTM?", "feedback on code".

### Input Context
Before activating, verify:
- The code or diff to review is provided or accessible.
- The language/stack is known.
- The project's coding standards or conventions are available.

### Output Artifact
No file output. This skill produces structured review text.

### Response Format
Answer exactly:
```
## Code Review: {file/scope}

### [MUST] {short title}
- **File**: `src/path/file.ts:42`
- **Issue**: {what's wrong}
- **Why**: {impact}
- **Fix**: {suggested approach}

### [SHOULD] {short title}
...

### [CONSIDER] {short title}
...

### Positive
- {what's done well}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanations of what code review is.

### Completion Criteria
This skill is complete when:
- [ ] All findings are classified with severity [MUST]/[SHOULD]/[CONSIDER].
- [ ] Every finding includes exact file and line number.
- [ ] At least one positive observation is included for every 3 critical findings.
- [ ] No code has been rewritten — only problems and suggested approaches.

### Max Response Length
100 lines or as many as needed to cover all findings in one pass.

## Quick Start
Review in order: correctness → architecture → clarity → performance → security → tests. Classify each finding as [MUST], [SHOULD], or [CONSIDER].

## When to Use This Skill
- User asks for code review
- Reviewing a pull request
- Checking implementation quality
- Pre-merge review

## Core Workflow

### Step 1: Correctness
- Does the code do what it claims?
- Are edge cases handled? (null, empty, invalid input)
- Error handling — are all error paths handled?
- Are there off-by-one errors, race conditions, or type mismatches?

### Step 2: Architecture
- Is the code in the right layer? (domain vs application vs infrastructure)
- Does it follow the project's architectural patterns (Clean Architecture, DDD)?
- Are there circular dependencies?
- Does it violate any layer rules (e.g., domain importing infrastructure)?

### Step 3: Clarity
- Do names reveal intent? (function names, variable names, class names)
- Is there dead code, commented-out code, or unnecessary complexity?
- Are there magic numbers or strings that should be constants?
- Is the code self-documenting, or does it need comments?

### Step 4: Performance
- Any obvious N+1 queries?
- Unnecessary allocations in hot paths?
- Blocking calls in async code?
- Missing indexes for database queries?
- Unoptimized bundle imports?

### Step 5: Security
- Input validation on all user-facing endpoints?
- Authorization checks where needed?
- No secrets, tokens, or passwords in code?
- SQL injection prevention? (parameterized queries)
- XSS prevention? (proper escaping)

### Step 6: Tests
- Does the code have tests? Are they meaningful?
- Do tests cover the acceptance criteria?
- Are tests testing behavior, not implementation?
- Are there edge cases tested beyond the happy path?

## Rules & Constraints
- Every finding must include the exact file and line number
- Severity labels: [MUST] = blocks merge, [SHOULD] = best practice, [CONSIDER] = suggestion
- Include a positive observation for every 3 critical findings — reviews shouldn't be purely negative
- Never rewrite the code yourself — point to the problem and suggest the approach
- One review pass = one complete analysis — don't do multiple passes on the same diff
- If the diff is larger than 400 lines, focus on the most critical files

## Output Format
```
## Code Review: {file/scope}

### [MUST] {short title}
- **File**: `src/path/file.ts:42`
- **Issue**: {what's wrong}
- **Why**: {impact of the issue}
- **Fix**: {suggested approach}

### [SHOULD] {short title}
...

### [CONSIDER] {short title}
...

### ✅ Positive
- {what's done well}
```

## References
- `references/review-checklist.md` — expanded review checklist with examples

## Handoff
After completing this skill:
- Next skill: **debugging-strategy** — if issues found need deeper investigation
- Pass context: review findings, files reviewed, severity levels
