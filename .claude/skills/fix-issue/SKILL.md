---
name: fix-issue
description: Fix a GitHub issue by number. Read the issue, implement the fix, write tests, commit.
disable-model-invocation: true
allowed-tools: Bash(gh *) Bash(git *) Read Write Edit Grep Glob
argument-hint: [issue-number]
arguments: [issue]
---

## Instructions

1. `gh issue view $issue` — read the issue
2. Understand requirements and reproduce if possible
3. Implement the fix following codebase conventions
4. Write tests matching existing test patterns
5. Run tests to verify
6. Commit with `Fixes #$issue` in message
