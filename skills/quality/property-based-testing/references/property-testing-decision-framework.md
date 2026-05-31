# Property-Based Testing: Decision Framework and Workflow Patterns

## Overview

This reference provides a comprehensive decision framework for property-based testing, covering property selection, generator design choices, shrinking optimization strategies, and workflow integration patterns. It serves as a tactical companion to the architecture reference, focusing on practical decision-making during test design and implementation.

## Core Architecture Concepts

### Decision Flow Architecture

Property-based testing decisions follow a hierarchical flow:

```
Level 1: Strategic Decisions
  ├── Which components to property-test?
  ├── What property categories apply?
  └── What depth/run count?

Level 2: Generator Decisions
  ├── Built-in vs custom generator?
  ├── Filter vs constrained generation?
  └── Single vs tuple vs dependent generation?

Level 3: Shrinking Decisions
  ├── Default shrinker vs custom?
  ├── Shrinking budget configuration?
  └── Verbose shrinking output?

Level 4: Integration Decisions
  ├── CI stage placement?
  ├── Coverage thresholds?
  └── Result reporting?
```

### Property Taxonomy Architecture

Properties are organized into a taxonomy that guides selection:

```
Universal Properties (apply to all functions):
  ├── Idempotent: f(f(x)) == f(x)
  ├── Reflective: f(f(x)) == x  (involution)
  └── Deterministic: same input → same output

Structural Properties (apply to data structures):
  ├── Size preservation: |f(x)| == |x|
  ├── Order preservation: x ≤ y → f(x) ≤ f(y)
  └── Element preservation: elements of f(x) ⊆ elements of x

Domain Properties (apply to business logic):
  ├── Business rule invariants
  ├── Validation constraints
  ├── State transition rules
  └── Resource bounds
```

## Architecture Decision Trees

### Decision Tree 1: What to Property-Test

```
Is the function pure (no side effects)?
├── YES → Can you express an invariant?
│   ├── YES → Property-test with universal/structural property
│   └── NO → Can you express a round-trip?
│       ├── YES → Property-test with round-trip property
│       └── NO → Use example-based tests instead
└── NO → Is the function stateful?
    ├── YES → Can you write a model?
    │   ├── YES → Property-test with stateful commands
    │   └── NO → Use integration tests instead
    └── NO → Does the function process data?
        ├── YES → Test with metamorphic property
        └── NO → Use example-based or integration tests
```

### Decision Tree 2: Generator Selection

```
Does the input type have a built-in generator?
├── YES → Does it need constraints?
│   ├── YES → Apply constraints during generation (prefer filter)
│   └── NO → Use built-in generator directly
└── NO → Is it a record/object?
    ├── YES → Use fc.record() with field generators
    └── NO → Is it a sum type (union)?
        ├── YES → Use fc.oneof() or fc.union()
        └── NO → Does it depend on other values?
            ├── YES → Use flatMap/chain
            └── NO → Write custom arbitrary
```

### Decision Tree 3: Shrinking Configuration

```
Does the default shrinker produce minimal counterexamples?
├── YES → Use default (no custom shrinking needed)
└── NO → Is the issue with filter-based shrinking?
    ├── YES → Replace filter with constrained generation
    └── NO → Is the issue with flatMap shrinking?
        ├── YES → Restructure to minimize dependent dimensions
        └── NO → Write custom shrinker using convertFromNext
```

## Implementation Strategies

### Property Implementation Strategy

When implementing properties, follow this priority-ordered approach:

1. **Prefer universal properties** — they apply broadly and reveal fundamental issues
2. **Add structural properties** — verify data integrity guarantees
3. **Implement round-trips** — catch serialization/deserialization mismatches
4. **Design metamorphic properties** — test complex transformations
5. **Write stateful models** — for systems with mutable state

### Counterexample Analysis Strategy

When a property fails:

1. **Inspect the shrunk input**: The minimal failing case reveals the root cause
2. **Verify the precondition**: Ensure the property's precondition should hold
3. **Check the generator**: Does the generator produce semantically valid inputs?
4. **Isolate the failure**: Can you reproduce with a simpler example test?
5. **Add the counterexample as a regression test**: Prevent re-introduction
6. **Fix and re-run with the same seed**: Confirm the fix without random variation

### Generator Optimization Strategy

```
Priority 1: Type-specific generators
  - fc.integer() → fc.integer(min, max) → fc.nat() → fc.bigInt()
  - fc.string() → fc.string(minLength, maxLength) → fc.hexadecimal()
  - fc.array() → fc.array(gen, minLength, maxLength) → fc.set() → fc.uniqueArray()

Priority 2: Combinator composition
  - Use .map() for simple transformations
  - Use .filter() only when constraints cannot be expressed otherwise
  - Use fc.tuple() for independent values, flatMap only for dependencies

Priority 3: Performance
  - Profile generator rejection rate (high rejection = slow generation)
  - Check shrinking performance (slow shrinking = poor debug experience)
  - Balance numRuns with execution time budget
```

## Integration Patterns

### PBT with Example-Based Tests

Property-based testing does not replace example-based testing. The integration pattern:

```
Example tests (Given-When-Then):
  - Document known behavior
  - Cover known edge cases
  - Serve as living documentation
  - Test error conditions explicitly

Property-based tests:
  - Discover unknown edge cases
  - Verify invariants at scale
  - Test random input combinations
  - Generalize known behaviors

Integration:
  - Every function with example tests SHOULD have property tests
  - Properties document WHAT must always be true
  - Examples document WHAT happens in specific cases
  - Both should be maintained together
```

### PBT and Mutation Testing

Property-based tests combined with mutation testing provide strong correctness guarantees:

1. Write properties that define system invariants
2. Run mutation testing to identify surviving mutants
3. Analyze survivors: are they equivalent mutants (acceptable) or uncovered behaviors (add more properties)?
4. Add properties targeting surviving non-equivalent mutants
5. Iterate until mutation score meets threshold

### PBT in Microservice Architectures

For microservice testing, use PBT at multiple levels:

```
Service-internal PBT:
  - Business logic invariants
  - Data transformation round-trips
  - Validation function properties
  - State machine models for service state

Integration PBT:
  - API request/response schema round-trips
  - Database query result invariants
  - Message serialization/deserialization
  - Stateful command sequences across service boundaries

Cross-service PBT (with contract testing):
  - Generate random but valid request payloads
  - Verify response invariants match contracts
  - Test error path properties
  - Stateful sequences of API calls
```

## Performance Optimization

### Generator Performance Characteristics

| Generator Pattern | Generation Time | Shrinking Time | Memory Usage |
|------------------|----------------|----------------|--------------|
| Built-in (integer) | < 1 µs | < 1 µs | Negligible |
| fc.record (simple) | 1-5 µs | 5-10 µs | Low |
| fc.array (100 items) | 10-50 µs | 50-200 µs | Medium |
| fc.oneof (many branches) | 1-10 µs | 10-50 µs | Low |
| Filter (rejection > 90%) | 100-1000 µs | 100-1000+ µs | Medium |
| flatMap deep chain | 10-100 µs | 100-1000 µs | Medium |

### Optimization Techniques

1. **Bias toward small values**: Bias produces simpler values more frequently, improving both generation speed and shrinking quality
2. **Reuse generators**: Define generators once and reuse across tests; avoid recreating complex generators per test
3. **Limit collection sizes**: Always set `maxLength` on arrays, strings, and maps
4. **Use fc.cloneIfNeeded()**: When sharing generated objects across assertions
5. **Avoid fc.anything()**: It generates deeply nested structures that are slow to shrink

## Security Considerations

### Controlled Randomness

Property tests should not use cryptographic randomness in CI. Use seeded pseudo-random generators for reproducibility. Maintain a seed database: when a failure occurs, store the seed and path for later reproduction.

### Input Validation Properties

Security-critical input validation functions benefit from PBT:

```
Property: All generated inputs that pass validation should be safe to process
Property: All malicious-looking inputs should be rejected by validation
Property: Validation should not throw exceptions (only return error states)
```

### Denial of Service Prevention

Configure PBT to avoid generating inputs that cause algorithmic complexity attacks:

- Limit string length to prevent ReDoS attacks during property evaluation
- Limit array depth to prevent stack overflow
- Set maximum command count in stateful tests
- Bound object property counts

## Operational Excellence

### CI Integration Patterns

```
GitHub Actions:

fast-properties:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npm run test:properties -- --numRuns=100
      env:
        SEED: ${{ github.run_id }}

thorough-properties:  # Nightly
  if: github.event_name == 'schedule'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npm run test:properties -- --numRuns=10000
    - name: Report findings
      run: ./scripts/shrink-report.sh
```

### Property Quality Gates

Define gates to maintain property quality:

- Zero flaky properties (properties that pass sometimes, fail other times)
- All counterexamples documented as regression tests
- Shrinking terminates within 10 seconds for all properties
- Generator rejection rate < 10% for all custom generators
- Every module with > 100 LOC has at least one property

## Testing Strategy

### Property Suite Composition

A well-balanced property suite includes:

| Property Type | Percentage | Rationale |
|--------------|------------|-----------|
| Round-trip | 25% | High value, low cost, easy to write |
| Invariant | 25% | Core correctness guarantee |
| Metamorphic | 20% | Complex behavior verification |
| Idempotence | 10% | Idempotency contracts |
| Stateful | 10% | State management correctness |
| Performance | 10% | Performance regression detection |

### Shrinking Test Strategy

Test the shrinker itself for quality:

1. Can the shrinker reduce the failure to a truly minimal case?
2. Is the shrinking monotonic (doesn't introduce new failures)?
3. Does shrinking terminate in reasonable time?
4. Are intermediate shrunk values valid for the generator's type?

## Common Pitfalls

1. **Bad shrinking due to filter**: The most common PBT mistake — generators with > 50% rejection rate should be replaced with constrained generation
2. **Incomplete state reset**: Stateful tests that share state across command sequences produce irreproducible failures
3. **Too many runs**: 10000 runs on complex properties can cause CI timeout; use adaptive depth
4. **Testing unrelated concerns**: A property should verify one invariant, not multiple
5. **Ignoring seed output**: Always capture the seed from failing tests; without it, failures are unreproducible
6. **Generating invalid domain objects**: Generators must respect business rule constraints, or properties will fail on invalid inputs
7. **Over-reliance on shrinking**: Some frameworks shrink poorly for custom types; always verify minimality of counterexamples
8. **Not adding examples from properties**: A property that found a bug should produce an example test for the regression suite

## Key Takeaways

- Decisions about property testing follow a clear hierarchy from strategy to tactics
- Use the decision trees to determine what to test, how to generate inputs, and how to configure shrinking
- Property suite composition should be balanced: 50% round-trip + invariant, 30% metamorphic + stateful, 20% specialized
- CI integration should use adaptive depth: fast properties (100 runs) on every commit, thorough properties (10000 runs) nightly
- Shrinking quality determines the usability of PBT — invest in good shrinkers
- Generator rejection rate is the single most important performance metric for PBT
- Always capture seeds and add counterexamples as regression tests
- Combine PBT with mutation testing for comprehensive correctness coverage
- Every property should specify one invariant; multiple properties per function are better than one composite property
