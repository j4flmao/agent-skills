---
name: debugging-strategy
description: >
  Use this skill when the user says 'debug', 'bug', 'not working', 'error',
  'exception', 'unexpected behavior', 'help me fix', 'something is wrong', 'failing
  test', or when troubleshooting a problem. Follows an evidence-based, systematic
  debugging workflow: reproduce → hypothesize → gather evidence → test one
  hypothesis → verify → document root cause. Works with any language/stack.
  Do NOT use this for: code review (use code-review), performance optimization
  (use performance-profiler), or adding new features.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, debugging, phase-4]
---

# Debugging Strategy

## Purpose
Systematic, evidence-based debugging — no random changes, no shotgun fixes.

## Agent Protocol

### Trigger
Exact user phrases: "debug", "bug", "not working", "error", "exception", "unexpected behavior", "help me fix", "something is wrong", "failing test".

### Input Context
Before activating, verify:
- The bug report or failing test is provided.
- Steps to reproduce are available or can be determined.
- Environment details (OS, versions, configuration) are known.

### Output Artifact
No file output. This skill produces a debugging report.

### Response Format
Answer exactly:
```
## Debugging Report
### Reproduction
- Input: {exact input}
- Expected: {expected behavior}
- Actual: {actual behavior}
### Root Cause Analysis
- Hypotheses tested: {ranked list with results}
- Root cause: {what was actually wrong}
### Fix
- Change: {what was changed and where}
- Verification: {test results confirming fix}
### Prevention
- Test added: {link to test}
- Process improvement: {code review check, lint rule, etc.}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

## References
No separate reference file — all debugging workflow is inline in this skill.

## Handoff
After completing this skill:
- Next skill: **refactor-guide** — if the fix requires structural cleanup
- Pass context: root cause, fix applied, regression test added
```
## Debugging Report
### Reproduction
- Input: {exact input}
- Expected: {expected behavior}
- Actual: {actual behavior}
### Root Cause Analysis
- Hypotheses tested: {ranked list with results}
- Root cause: {what was actually wrong}
### Fix
- Change: {what was changed and where}
- Verification: {test results confirming fix}
### Prevention
- Test added: {link to test}
- Process improvement: {code review check, lint rule, etc.}
```
No filler. Strip articles where unambiguous. Why use many token when few do trick.