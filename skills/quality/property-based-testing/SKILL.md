---
name: quality-property-based-testing
description: >
  Use when the user asks about property-based testing, fuzzing, generative testing, QuickCheck, fast-check, invariant testing, or random testing. Do NOT use for: example-based unit testing (quality-unit-testing), or integration testing (quality-integration-testing).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [quality, property-based-testing, phase-3]
---

# Property-Based Testing

## Purpose
Use property-based testing to define invariants and properties, generate random inputs, shrink failing cases, and discover edge cases that example-based testing misses. This skill covers generator design, property formulation, shrinking optimization, stateful testing, and CI integration.

## Agent Protocol

### Trigger
User mentions property-based testing, fuzzing, generative testing, QuickCheck, fast-check, Hypothesis, invariant testing, random testing, or asks about finding edge cases automatically.

### Input Context
- Functions or modules under test
- Existing example-based test suite
- Input type definitions and constraints
- Business rule invariants
- Performance requirements for test execution

### Output Artifact
Property-based test suite with generators, property definitions, and CI integration configuration.

### Response Format
Structured property test suite with:
1. Property definitions (invariants, round-trips, metamorphic relations)
2. Custom generator implementations (with shrinking)
3. Stateful command models for stateful systems
4. CI configuration for fast and thorough runs

### Completion Criteria
- Properties defined for all identified invariants
- Generators produce valid domain inputs with < 10% rejection rate
- Shrinking produces minimal counterexamples
- CI integration with adaptive run depth (fast on commit, thorough nightly)
- Failing seeds captured and counterexamples added as regression tests

## Workflow

1. **Identify properties**: Analyze the system under test; categorize properties as invariants, round-trips, idempotence, metamorphic, or stateful
2. **Design generators**: Build generators for all input types using built-in generators, combinators, and custom arbitraries. Avoid heavy filtering
3. **Implement properties**: Write property assertions using chosen framework (fast-check, Hypothesis, jqwik). Verify preconditions before postconditions
4. **Run and shrink**: Execute with default run count (100). Verify shrinking produces actionable minimal counterexamples
5. **Analyze failures**: Inspect shrunk inputs. Add counterexamples as regression tests. Store seeds for reproduction
6. **Optimize generators**: Profile generation and shrinking performance. Replace filters with constrained generation. Reduce rejection rate
7. **Integrate CI**: Configure CI with adaptive depth. Fast run (100 runs) on every commit. Thorough run (1000+ runs) nightly. Store seeds in build artifacts
8. **Add stateful models**: For stateful systems, implement command-based models with preconditions, postconditions, and invariants
9. **Track metrics**: Monitor property coverage, shrinking efficiency, counterexample discovery rate, and generator rejection rate
10. **Maintain property suite**: Review properties during refactoring. Remove obsolete properties. Add new properties for modified code

## Architecture / Decision Trees

### Framework Selection Decision Tree

```
Inputs: language, team expertise, existing tooling
├── TypeScript/JavaScript → fast-check
│   ├── Stateful testing needed? → Use fc.Command + fc.modelRun
│   └── Async code? → Use fc.asyncProperty
├── Python → Hypothesis
│   ├── Stateful testing needed? → RuleBasedStateMachine
│   └── Pandas/NumPy? → pandas strategies
├── Java/Kotlin → jqwik
│   ├── Spring Boot? → Combine with Spring tests
│   └── Stateful testing? → StateMachine
└── Haskell → QuickCheck
```

### Property Type Selection Decision Tree

```
Can you express a relation between input and output?
├── YES → Is the function an involution?
│   ├── YES → Reflective property: f(f(x)) == x
│   └── NO → Is the function idempotent?
│       ├── YES → Idempotence property: f(f(x)) == f(x)
│       └── NO → Round-trip property: decode(encode(x)) == x
└── NO → Can you express an invariant?
    ├── YES → Invariant property (e.g., output is sorted)
    └── NO → Metamorphic property: related inputs → related outputs
```

## Common Pitfalls

1. **Heavy filtering in generators**: Filter that rejects > 50% of values kills performance and shrinking. Replace with constrained generation (e.g., `fc.integer({ min: 1 })` instead of `fc.integer().filter(n => n > 0)`)
2. **Testing tautologies**: Properties that can never fail (e.g., asserting the sum of two positive integers is positive when the generator only produces positive integers)
3. **Ignoring shrinking quality**: If the shrunk output is still complex, the shrinker is not working well. Use constrained generators and avoid flatMap when possible
4. **Insufficient run count**: Running only 10-20 random tests is not property-based testing. Minimum 100 runs; prefer 1000 for thorough validation
5. **No seed tracking**: Failing to record the seed makes failures unreproducible. Always log seed and path
6. **Stateful test state pollution**: Commands that share mutable state produce irreproducible failures. Each test run must start from a clean state
7. **Over-constrained generation**: Generators that only produce "nice" values (e.g., only short strings, only small numbers) miss the edge cases that PBT is meant to find
8. **Too many commands in stateful tests**: Large state spaces make debugging hard. Limit maxCommands to 20-50 initially
9. **Testing implementation, not contract**: Properties tied to internal structure break during refactoring. Test observable behavior
10. **No performance properties**: Miss performance regressions. Add timing or memory properties for critical paths

## Best Practices

1. Start with round-trip properties — they're the easiest to write and catch the most bugs
2. Use one property per assertion — composite properties are hard to debug
3. Always capture and log the failing seed — without it, failures are unreproducible
4. Keep generator rejection rate below 10% — high rejection means poor generator design
5. Combine PBT with example tests — examples document behavior, properties verify invariants
6. Add every discovered counterexample as a regression test — prevents regressions
7. Use biased generation for better edge case coverage (fast-check defaults to biased)
8. Set reasonable input bounds — unbounded generation risks OOM and slow tests
9. Version control failing seeds — enables debugging across environments
10. Profile property execution time — slow properties reduce iteration speed

## Compared With

| Aspect | Property-Based | Example-Based | Fuzzing |
|--------|---------------|---------------|---------|
| Input generation | Random, constrained | Hand-picked | Random, mutation-based |
| Expected output | Invariant relation | Fixed value | Any output (crash/no crash) |
| Bug discovery | Edge cases, contract violations | Known scenario validation | Security vulnerabilities, crashes |
| Test maintenance | Medium (property may need update) | Low (examples are stable) | Low (no assertions) |
| Documentation value | High (documents contracts) | Very High (documents behavior) | Low |
| False positives | Low (properties are precise) | None | High (crashes may be benign) |
| Shrinking | Automatic to minimal case | N/A | Manual or automatic (no structure) |

## Performance Considerations

- Generation time: Most generators are < 50 µs per value. Heavy filtering can increase to 1 ms+
- Shrinking time: Proportional to input size. Complex collections may take 100+ ms to shrink
- Memory: Large generated objects (arrays of 1000+ items) consume significant memory. Set maxLength bounds
- CI budget: 100 runs x 50 properties = 5000 executions. At 10ms each = 50 seconds. Plan CI timeouts accordingly
- Adaptive depth: Use `numRuns: process.env.CI ? 100 : 1000` for different environments
- Parallel execution: Properties are independent and can run in parallel across worker processes
- Shrinking budget: Some frameworks allow setting a shrinking time budget to prevent infinite shrinking loops

## Rules

1. Every property must have at least one corresponding example test for documentation
2. Generator rejection rate must stay below 10% — rate-limit with constraints, not filters
3. Every property test must capture and log the failing seed on failure
4. Stateful tests must reset all state between runs — no shared state across command sequences
5. Run count must be at least 100 for CI, 1000 for nightly, 10000 for pre-release
6. Every discovered counterexample must be added as a regression test within the same sprint
7. Properties must be version-controlled alongside production code — not in separate repositories
8. Obsolete properties must be removed or updated when their target code is refactored
9. Shrinking must produce a minimal counterexample — if it doesn't, the generator needs optimization
10. Properties must not have side effects — they must be pure predicates over generated values
11. Async properties must have explicit timeout handling to avoid hanging CI pipelines
12. Each property must test exactly one invariant — composite properties are not allowed
13. Input size bounds must be set on all collection generators (maxLength, maxDepth)
14. Performance properties must include baseline thresholds and alert on regression
15. Resources (database connections, file handles) must be cleaned up after each property test
16. CI must have separate fast (every commit) and thorough (nightly) property test stages

## References
- references/custom-generators.md — Custom Generators for Property-Based Testing
- references/property-based-testing-advanced.md — Advanced Property-Based Testing
- references/property-based-testing-fundamentals.md — Property Based Testing Fundamentals
- references/property-patterns.md — External Service Mocking with WireMock
- references/property-testing-architecture.md — PBT Architecture and System Design
- references/property-testing-decision-framework.md — PBT Decision Framework and Workflow Patterns
- references/shrinking-guide.md — Shrinking Strategy Guide
- references/stateful-testing-deep.md — Stateful Testing (Deep)
- references/stateful-testing.md — Stateful Property-Based Testing

## Handoff
After property-based testing, hand off to:
- `quality-unit-testing` — for example-based tests that complement properties
- `quality-integration-testing` — for verifying properties at system boundaries
- `quality-regression-testing` — for adding discovered counterexamples to regression suites
- `quality-load-testing` — for performance property validation under load
