---
name: refactor-guide
description: >
  Use this skill when the user says 'refactor', 'clean up code', 'extract this',
  'rename', 'improve code', 'make this cleaner', 'too complex', 'spaghetti code',
  or when improving code structure without changing behavior. Covers: behavior-
  preserving transformations, strangler fig pattern, common refactoring catalog
  (extract, inline, move, rename, replace conditional with polymorphism), and
  refactoring workflow. Works with any language. Do NOT use this for: adding new
  features, fixing bugs, or rewriting from scratch.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, refactoring, phase-4]
---

# Refactor Guide

## Purpose
Perform safe, behavior-preserving code transformations to improve structure, readability, and maintainability.

## Agent Protocol

### Trigger
Exact user phrases: "refactor", "clean up code", "extract this", "rename", "improve code", "make this cleaner", "too complex", "spaghetti code".

### Input Context
Before activating, verify:
- The code to refactor is provided or accessible.
- Existing tests are available (or characterization tests must be written first).
- The desired outcome is structural improvement, not behavior change.

### Output Artifact
No file output. This skill produces a refactoring plan.

### Response Format
Proposed refactoring plan: {current code} -> {refactored code} -> {justification}. Tests before/after.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanation of refactoring concepts.

### Completion Criteria
This skill is complete when:
- [ ] Tests exist and pass before refactoring (characterization tests written if needed).
- [ ] One refactoring type is selected from the catalog.
- [ ] Behavior is preserved (tests still pass after refactoring).
- [ ] Only structural changes are in the diff.

### Max Response Length
30 lines.

## Quick Start
If behavior changes, it's not refactoring — it's rewriting. Always have tests before refactoring. One refactoring type per commit.

## When to Use This Skill
- Code is hard to understand or modify
- Duplicate code needs extraction
- A function/class has too many responsibilities
- Naming no longer reflects intent
- Preparing a codebase for a new feature

## Core Workflow

### Step 1: Verify Tests Exist
**Rule**: No tests = no refactoring. Write characterization tests first to lock in current behavior.

### Step 2: One Refactoring Per Change
Pick ONE from the catalog per commit:

| Refactoring | What It Does | When to Use |
|-------------|--------------|-------------|
| **Extract Function** | Move code block to named function | Long method, duplicated logic |
| **Inline Function** | Replace function call with body | Function is trivial, called once |
| **Extract Variable** | Name a complex expression | Improves readability |
| **Inline Variable** | Replace variable with expression | Variable name doesn't add clarity |
| **Move Function/Class** | Relocate to more appropriate module | Feature envy, low cohesion |
| **Rename** | Change identifier name | Name doesn't reveal intent |
| **Replace Conditional with Polymorphism** | Subtypes over if/switch | Complex type-based logic |
| **Split Loop** | Separate concerns in single loop | Loop does two things |
| **Replace Magic Number with Constant** | Name a literal | Meaning is not obvious |
| **Introduce Parameter Object** | Group related parameters | Functions with 4+ params |

### Step 3: Apply Strangler Fig for Large Refactors
For large-scale changes (module extraction, framework migration):
1. **Build parallel**: Create new structure alongside the old
2. **Route gradually**: Redirect consumers to the new structure one at a time
3. **Remove old**: Delete old structure once no consumers remain

### Step 4: Verify
1. Run all tests — they should pass (if they don't, behavior changed)
2. Run linter and type checker
3. Review the diff — is it purely structural changes?

## Rules & Constraints
- Refactoring = behavior-preserving transformation. If behavior changes, it's not refactoring
- Always have passing tests before starting — write characterization tests if needed
- One refactoring type per commit — don't mix Extract Function with Rename in the same commit
- Never refactor and add features in the same commit — they go in separate PRs
- Stop refactoring if you're unsure — it's better to leave code as-is than to introduce bugs
- Cosmetic changes (formatting, renaming) should be automated with formatters/linters

## Output Format
Proposed refactoring plan: {current code} → {refactored code} → {justification}. Tests before/after.

## References
- `references/refactor-patterns.md` — expanded refactoring catalog with examples

## Handoff
After completing this skill:
- Next skill: **code-review** — review refactored code
- Pass context: refactoring type applied, files changed
