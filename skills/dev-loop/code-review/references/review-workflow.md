# Code Review Workflow

## Review Stages

### Stage 1: Preparation
- Understand the feature/change context from the PR description
- Check linked issues, acceptance criteria, and requirements
- Identify the scope — which files changed, which layers affected
- Note the reviewer's own expertise gaps and prepare for them

### Stage 2: High-Level Pass
- Scan the overall diff to understand the flow
- Check architecture — does this belong in the right layer?
- Verify the approach matches the design/ADR
- Identify any red flags that need deep investigation

### Stage 3: Detailed Review
- Perform systematic review: correctness → architecture → clarity → performance → security → tests
- Examine each file line by line for the relevant concerns
- Take notes on findings as you go
- Classify each finding: [MUST], [SHOULD], [CONSIDER]

### Stage 4: Report
- Compile findings into structured review output
- Include exact file paths and line numbers
- Prioritize by severity
- Include positive observations

## Review Guidelines

### Size Management
- Max 400 lines per review pass — larger diffs need focus on critical files
- Break large PRs into logical review sessions
- Use review scoping: "Reviewing auth module only in this pass"

### Communication
- Focus on the code, not the author
- Use "Why" framing: explain impact, not just what's wrong
- Suggest approaches, not implementations
- Ask questions about unclear patterns before flagging as issues

## Severity Classification

| Label | Meaning | Action |
|-------|---------|--------|
| [MUST] | Blocks merge | Must be fixed before merge |
| [SHOULD] | Best practice | Should be fixed, not blocking |
| [CONSIDER] | Suggestion | Consider for future improvement |

## Common Anti-Patterns

- Magic numbers and strings without constants
- Long functions (>40 lines) doing multiple things
- Deeply nested conditionals (>3 levels)
- Missing error handling on fallible operations
- Direct dependency on concrete implementations
- Hardcoded configuration values
- Missing or incomplete tests
