# Refactoring Fundamentals

## Overview
Refactoring restructures existing code without changing external behavior, improving readability, maintainability, and performance. Each refactoring step is a small, behavior-preserving transformation.

## Core Concepts

### Concept 1: The Refactoring Process
Red → Green → Refactor cycle: write failing test → make it pass → clean up code. Refactoring without tests is risky. Always ensure existing tests pass before and after refactoring (verify behavior preserved).

### Concept 2: Code Smells
Recognizable patterns indicating deeper problems: long method, large class, primitive obsession, duplicated code, feature envy, shotgun surgery, switch statements, inappropriate intimacy, lazy class, and data clumps. Each smell suggests specific refactorings.

### Concept 3: Safe Refactoring Techniques
Extract method/function (breaking down long methods), rename (improve naming), move field/method (correct responsibility), extract class (single responsibility), introduce parameter object (primitive obsession), and replace conditional with polymorphism.

### Concept 4: Refactoring Workflow
Before starting: identify code smells, understand code behavior (tests), and plan the target design. During: make one change at a time, run tests after each step, and commit each atomic change. After: verify all tests pass and review.

### Concept 5: Refactoring vs Rewriting
Refactoring: incremental, low risk, preserves behavior, small scope. Rewriting: high risk, long timeline, discards existing code. Choose rewrite when: code is untestable, architecture is fundamentally wrong, or cost of incremental change exceeds rewrite cost.

## Best Practices

- Refactor with a safety net (tests)
- Make one change at a time
- Run tests after every change
- Commit after each atomic refactoring
- Start with the most valuable smells
- Keep refactoring separate from feature work
- Use IDE refactoring tools (extract, rename, inline)
- Document the target design before starting
- Use FeatureBranch only for large refactors

## Anti-Patterns

- Refactoring without tests (risky)
- Multiple refactorings in one commit (can't revert)
- Refactoring and adding features in same commit
- Over-refactoring (unnecessary complexity)
- Big Bang refactoring (high risk, long feedback loop)
- No understanding of code behavior before starting
- Renaming without updating all references
- Not committing (losing progress on crashes)
