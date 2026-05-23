# TDD Guide

## Red-Green-Refactor Cycle
`
RED: Write a failing test
 └── Define expected behavior
GREEN: Write minimal code to pass
 └── Don't optimize yet, just make it pass
REFACTOR: Improve code quality
 └── Tests pass → safe to refactor
`

## TDD Benefits
- Forces design decisions upfront
- Ensures testable code
- Documents expected behavior
- Catches regressions immediately
- Provides safe refactoring

## When TDD Is Less Useful
- Exploratory/prototype code
- UI-heavy code (visual testing is different)
- Legacy code without existing tests (use characterization tests first)
- Simple CRUD boilerplate
