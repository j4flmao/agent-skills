# Property-Based Testing: Architecture and System Design

## Overview

Property-based testing (PBT) is a testing paradigm where properties (invariants that must hold for all valid inputs) are verified against randomly generated data. Unlike example-based testing which validates specific input-output pairs, PBT explores the entire input space to discover edge cases, regression bugs, and contract violations. This reference covers the architectural considerations, system design patterns, and decision frameworks for integrating PBT into production systems.

## Core Architecture Concepts

### Property-Based Testing System Architecture

A property-based testing system consists of three core components: generators (produce random inputs), properties (define invariants), and the test runner (orchestrates generation, execution, and shrinking). The architecture follows a pipeline pattern:

```
Generator Pipeline:
  Seed → Random Source → Value Generators → Shrinker → Test Runner → Reporter
                            ↓
                     Property Assertions
```

### Generator Architecture

Generators are composable primitives that produce random values of specific types. They follow the functor pattern in category theory: a generator `Gen<A>` can be mapped over a function `A → B` to produce `Gen<B>`. The generator monad enables sequencing dependent generations through `flatMap`/`chain`.

### Shrinking Architecture

Shrinking transforms a failing input into a minimal failing case. The shrinker architecture implements a search over the input space, attempting simpler values until it finds the smallest input that still violates the property. Fast-check uses delta debugging internally, while Hypothesis in Python uses an internal byte representation for fine-grained shrinking.

### Property Evaluation Model

Properties are evaluated as predicates over generated values:

```
Property: ∀x ∈ InputSpace: precondition(x) ⇒ postcondition(f(x))
```

This logical formulation enables:
- Universal quantification over input domains
- Conditional properties (precondition implies postcondition)
- Composition of properties through conjunction/disjunction

## Architecture Decision Trees

### Decision 1: Framework Selection

| Criterion | fast-check | Hypothesis | QuickCheck | jqwik |
|-----------|-----------|------------|------------|-------|
| Language | TypeScript/JS | Python | Haskell | Java |
| Shrinking | Automatic, delta-debug | Automatic, internal repr | Automatic, type-driven | Automatic |
| Stateful testing | Built-in via fc.Command | Built-in via RuleBasedStateMachine | Built-in | Built-in via StateMachine |
| Custom generators | fc.arbitrary, combinator API | @given strategies | Gen monad | @Provide Arbitrary |
| Async support | fc.asyncProperty | natively async | Pure | CompletableFuture |

**Decision rule:** Prefer fast-check for TypeScript/JS projects, Hypothesis for Python, jqwik for Java, and raw QuickCheck for Haskell. Consider the ecosystem maturity, shrinking quality, and stateful testing support.

### Decision 2: Generator Design Strategy

| Strategy | When to Use | Trade-offs |
|----------|------------|------------|
| Built-in generators | Simple types (int, string, bool) | Limited expressiveness |
| Combinator composition | Complex types (records, nested) | More verbose, full control |
| Filter-based | Constrained subsets | Performance degradation if too restrictive |
| FlatMap-dependent | Values depending on other values | Complex shrinking behavior |
| Custom arbitrary | Domain-specific constraints | Maximum control, implementation effort |

**Decision rule:** Start with built-in generators and combinators. Use filter sparingly (prefer constrained generation). Implement custom arbitraries only when the built-in API cannot express the desired constraints.

### Decision 3: Property Distribution

| Property Category | Coverage | Bug-Finding Power | Maintenance Cost |
|-------------------|----------|-------------------|------------------|
| Idempotence | Low | Medium | Low |
| Invariant | Medium | High | Medium |
| Round-trip | Medium | High | Low |
| Metamorphic | High | Very High | Medium |
| Stateful | Very High | Very High | High |

**Decision rule:** Prioritize round-trip and metamorphic properties for data transformation functions. Use invariants for business logic validation. Employ stateful testing for complex state management systems. Reserve idempotence for idempotent operations only.

### Decision 4: Test Depth Configuration

| numRuns | Use Case | Confidence Level | Execution Time |
|---------|----------|-----------------|----------------|
| 100 | CI, fast feedback | Medium | Low |
| 1000 | Nightly, thorough | High | Medium |
| 10000 | Pre-release, mission-critical | Very High | High |
| Adaptive | Varies by input complexity | Varies | Optimal |

**Decision rule:** Use 100 runs for CI with a time budget of < 1 second per property. Use 1000-10000 runs for nightly regression or pre-release validation. Adjust based on input complexity: simple integers need fewer runs, complex objects need more.

## Implementation Strategies

### Incremental Adoption Strategy

1. **Identify safe properties**: Start with round-trip properties for serialization/deserialization functions
2. **Add invariant properties**: Define invariants on core business logic
3. **Introduce metamorphic properties**: Test related input-output relationships
4. **Implement stateful testing**: Apply to stateful services and data structures
5. **Combine with example tests**: Use example tests for documentation, PBT for exploration

### Property Formulation Patterns

```
// Structural property: output satisfies a structural constraint
Property: sort(arr) is always sorted ascending

// Relational property: relationship between input and output
Property: reverse(reverse(arr)) == arr

// Functional property: function satisfies mathematical law
Property: encrypt(decrypt(x, k), k) == x

// Composite property: multiple properties must hold simultaneously
Property: parse(format(x)) == x  AND format(parse(s)) == s  (when round-trippable)
```

### Generator Optimization Patterns

Lazy generation: defer expensive computations until needed. Use `.map()` for pure transformations, `.filter()` sparingly, and `.chain()`/`.flatMap()` only when dependencies exist between generated values.

```
// Optimized: tuple-based independence
fc.tuple(fc.int(), fc.int(), fc.int()).map(([a,b,c]) => [a,b,c])

// Suboptimal: deep flatMap chain
fc.int().flatMap(a => fc.int().flatMap(b => fc.int().map(c => [a,b,c])))
```

## Integration Patterns

### CI/CD Integration

Integrate PBT into multiple pipeline stages with appropriate depth:

```
Commit Stage:
  - 100 runs per property
  - Time budget: 30 seconds total
  - Block on failures, flag on warnings

Nightly Stage:
  - 1000-10000 runs per property  
  - Full stateful testing suite
  - Report shrinking candidates as bugs
  - Track property coverage metrics

Pre-Release Stage:
  - Maximum depth (10000+ runs)
  - All stateful models
  - Chaos + property testing combined
  - Performance property validation
```

### Pairing with Contract Testing

Property-based tests verify behavior invariants; contract tests verify service boundaries. They pair naturally:

- Contract tests define message schemas
- Property tests generate random messages matching those schemas
- Stateful property tests exercise API sequences
- Shrinking produces minimal API call sequences that fail

### Pairing with Fuzzing

PBT complements fuzzing: fuzzing explores unexpected/corrupted inputs, while PBT explores structured random inputs. Use PBT when inputs have a known structure, fuzzing when inputs are unstructured or adversarial.

## Performance Optimization

### Generator Performance

| Strategy | Improvement | Trade-off |
|----------|-------------|-----------|
| Avoid filter | 10-100x | Must use constrained generation |
| Batch assertions | 2-5x | Reduces individual test overhead |
| Use tuple over flatMap | 5-10x | Less flexible |
| Optimize shrink paths | 2-3x | Requires custom arbitrary |
| Cache expensive state | 10x+ | Memory overhead |

### Test Execution Scaling

- **Single-threaded**: Default, suitable for < 500 properties
- **Worker pool**: Distribute properties across workers
- **Sharding**: Split property suite across CI shards
- **Adaptive depth**: Scale numRuns based on available time budget

## Security Considerations

### Seed Management

Store failing seeds in version control to reproduce and verify fixes. Never use predictable seeds in production properties that validate security-critical code (adversarial inputs can be crafted).

### Input Sensitivity

Property-based tests may generate sensitive data (PII, secrets) in test output. Configure generators to avoid producing values that resemble real sensitive data. Mask or filter outputs in CI logs.

### Resource Exhaustion

PBT can generate extremely large inputs (very long strings, deeply nested objects) that cause OOM or stack overflow. Set `maxLength`, `maxDepth`, and `maxCommands` constraints on all generators to bound resource usage.

## Operational Excellence

### Observability

- Log seed values for all property failures
- Track shrinking efficiency (how many steps to reach minimal case)
- Monitor property execution time and generation rejection rate
- Alert on properties that fail to find counterexamples (suspicious)
- Maintain a database of all discovered counterexamples

### Maintenance Practices

- Review property suite monthly for outdated invariants
- Add counterexamples as regression tests alongside PBT
- Remove properties that no longer hold (refactored code)
- Update property depth based on code churn in covered areas

## Testing Strategy

### PBT within the Test Pyramid

PBT sits primarily at the unit and integration levels:

```
       /\
      /  \         E2E (example-based)
     / PBT\        Integration + PBT stateful
    /______\
   / PBT    \      Unit + PBT properties
  /__________\
```

### Coverage Metrics for PBT

- **Property coverage**: Percentage of functions/modules with at least one property
- **Invariant coverage**: Number of invariants defined per component
- **Shrinking success rate**: Percentage of properties where shrinking terminates
- **Counterexample discovery rate**: Properties that found at least one bug

## Common Pitfalls

1. **Too many filters**: Generators with heavy filtering reject most values, slowing tests and breaking shrinking
2. **Testing implementation, not contract**: Properties tied to internal structure break during refactoring
3. **Insufficient runs**: 10-20 runs rarely find bugs; 100 is the minimum
4. **Ignoring shrinking quality**: Poor shrinking produces large, hard-to-debug counterexamples
5. **Over-constrained generators**: Generators that only produce "nice" values miss edge cases
6. **Stateful test explosion**: Too many commands or too large a state space makes failures unreproducible
7. **Property tautologies**: Properties that can never fail (e.g., asserting a sum of positive numbers is positive when the generator only produces positives)
8. **Missing seed tracking**: Failing to record the seed makes debugging impossible

## Key Takeaways

- PBT finds edge cases that example-based testing misses by exploring the input space randomly
- Generators are composable: build complex generators from simple ones using map, flatMap, filter
- Shrinking is the most important feature — it turns random failures into actionable minimal counterexamples
- Use round-trip and metamorphic properties for maximum bug-finding power with minimum maintenance
- Integrate PBT incrementally: start with serialization round-trips, then add stateful models
- Set appropriate run counts: 100 for CI, 1000+ for thorough validation
- Store failing seeds and counterexamples as regression tests
- Combine PBT with contract testing and fuzzing for comprehensive coverage
- Monitor shrinking efficiency and property execution time as operational metrics
- Properties document code contracts better than example tests alone
