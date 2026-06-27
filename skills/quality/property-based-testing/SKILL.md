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

## Property-Based Testing Examples

### TypeScript/fast-check — Round-Trip Property
```typescript
import * as fc from "fast-check";

// Property: encode/decode is a round-trip
test("URL encoding and decoding round-trips correctly", () => {
  fc.assert(
    fc.property(fc.string({ minLength: 1 }), (raw: string) => {
      const encoded = encodeURIComponent(raw);
      const decoded = decodeURIComponent(encoded);
      return decoded === raw;
    }),
  );
});
```

### TypeScript/fast-check — Invariant Property
```typescript
// Property: sort always returns elements in non-decreasing order
test("sort returns a sorted array", () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i - 1] > sorted[i]) return false;
      }
      return true;
    }),
  );
});
```

### TypeScript/fast-check — Idempotence Property
```typescript
// Property: removing duplicates is idempotent
test("uniq is idempotent", () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr: number[]) => {
      const once = uniq(arr);
      const twice = uniq(once);
      return JSON.stringify(once) === JSON.stringify(twice);
    }),
  );
});
```

### Python/Hypothesis — Invariant Property
```python
from hypothesis import given, strategies as st
from src.pricing import calculate_discount, PriceBreak

@given(
    quantity=st.integers(min_value=0, max_value=1000),
    breaks=st.lists(
        st.builds(PriceBreak,
            quantity=st.integers(min_value=1, max_value=100),
            discount_percent=st.decimals(min_value=0, max_value=100)
        ),
        min_size=0,
        max_size=10,
    ),
)
def test_discount_percent_is_never_negative(quantity, breaks):
    discount = calculate_discount(quantity, breaks)
    assert discount >= 0


@given(
    quantity=st.integers(min_value=0, max_value=1000),
    breaks=st.lists(
        st.builds(PriceBreak,
            quantity=st.integers(min_value=1, max_value=100),
            discount_percent=st.decimals(min_value=0, max_value=100)
        ),
        min_size=0,
        max_size=10,
    ),
)
def test_discount_percent_never_exceeds_100(quantity, breaks):
    discount = calculate_discount(quantity, breaks)
    assert discount <= 100
```

### Python/Hypothesis — Custom Strategy
```python
# Custom strategy for valid email addresses
email_strategy = st.emails()

@given(email_strategy)
def test_email_validation(email):
    assert is_valid_email(email)
    assert "@" in email

# Custom strategy for structured data
user_strategy = st.fixed_dictionaries({
    "name": st.text(min_size=1, max_size=100),
    "age": st.integers(min_value=0, max_value=150),
    "email": st.emails(),
    "role": st.sampled_from(["admin", "user", "viewer"]),
})

@given(user_strategy)
def test_user_creation(user):
    result = create_user(user)
    assert result["name"] == user["name"]
    assert result["role"] in ["admin", "user", "viewer"]
```

### TypeScript/fast-check — Stateful Testing
```typescript
import * as fc from "fast-check";

class CounterModel {
  value: number = 0;
}

class IncrementCommand implements fc.Command<CounterModel, Counter> {
  check = () => true;
  async run(model: CounterModel, real: Counter): Promise<void> {
    model.value += 1;
    await real.increment();
    expect(await real.get()).toBe(model.value);
  }
}

test("counter behaves correctly under random commands", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.commands([fc.constant(new IncrementCommand())], { size: "+1" }),
      async (cmds) => {
        const real = new Counter();
        const model = new CounterModel();
        const runner = fc.asyncModelRun(() => ({ model, real }));
        await runner(cmds);
      },
    ),
  );
});
```

## CI Integration for Property-Based Tests

```yaml
# .github/workflows/pbt.yml
name: Property-Based Tests
on:
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 3 * * *"  # Nightly thorough run

jobs:
  fast:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx vitest run --testPathPattern="\.pbt\.test\.ts$"
        env:
          PBT_RUNS: 100  # Fast: 100 runs per property
      - name: Upload failing seeds
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: failing-seeds
          path: seeds/*.txt

  thorough:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx vitest run --testPathPattern="\.pbt\.test\.ts$" --reporter=junit
        env:
          PBT_RUNS: 10000  # Thorough: 10000 runs per property
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: pbt-results
          path: junit.xml
      - name: Check shrinking quality
        run: node scripts/check-shrinking-quality.js
```

## Property-Based Testing Anti-Patterns

### Anti-Pattern: Heavy Generator Filtering
Using `.filter()` that rejects more than 50% of generated values. This kills performance and breaks shrinking (shrinker gets confused by rejected values). Replace filters with constrained generators: `fc.integer({ min: 1 })` instead of `fc.integer().filter(n => n > 0)`.

### Anti-Pattern: Testing Tautologies
Writing properties that can never fail. Example: "the sum of two positive integers is positive" when the generator only produces positive integers. The property is a tautology — it encodes the generator constraint, not a system invariant.

### Anti-Pattern: Insufficient Run Count
Running only 10-20 iterations is not property-based testing — it's just random sampling with extra steps. The statistical power of PBT comes from many random tests. Minimum 100 runs for CI. Use 1000+ for thorough validation.

### Anti-Pattern: Ignoring Shrinking Quality
If the counterexample is still complex (100+ items instead of 1-3), the shrinker is not working effectively. Constrained generators shrink better: prefer `fc.integer({ min: 1, max: 100 })` over unbounded. Avoid `fc.anything()`.

### Anti-Pattern: No Seed Capture
When a property fails, the framework generates a seed that can reproduce the failure. If you don't log the seed, you cannot reproduce the failure deterministically. Always capture and store the failing seed alongside the counterexample.

### Anti-Pattern: Stateful Test State Leakage
Stateful property tests that share mutable state between command sequences produce irreproducible failures. Each test run must start from a clean state. Reset all state in beforeEach.

## Property-Based Testing Maturity Model

| Level | Characteristics | Practices |
|---|---|---|
| 1: Initial | No PBT | Example-based tests only, no property testing knowledge in team |
| 2: Defined | Basic PBT adoption | Round-trip properties for serialization, basic generators, one or two team members proficient |
| 3: Managed | Systematic PBT usage | All data transformation functions have properties, custom generators, shrinking optimization, stateful models for complex systems |
| 4: Measured | PBT-integrated quality | Properties alongside examples for all critical logic, regression suite includes all counterexamples, CI has fast+thorough PBT stages |
| 5: Optimized | Property-first development | Properties defined before implementation (PBT-driven development), mutation testing validates property quality, automated generator tuning |

## Performance Considerations

- Generator speed: most built-in generators < 50µs per value. Heavy filtering can increase to 1ms+.
- Shrinking time: proportional to input complexity. Complex nested structures may take 100ms+ to shrink.
- Memory: large generated objects consume significant memory. Set `maxLength`, `maxDepth` bounds.
- CI execution budget: 100 runs × 50 properties × 10ms = 50 seconds for fast run. Plan 10-60 minutes for thorough run.
- Adaptive depth: use environment variable for run count. `numRuns: process.env.CI ? (process.env.PBT_RUNS || 100) : 1000`.
- Parallel execution: properties are independent and can run in parallel across workers. Use vitest sharding.

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
17. Failing seeds must be committed alongside counterexample regression tests
18. Generator complexity must be documented — understand what shapes your generators produce

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
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.
## Architecture Decision Trees

### Property Testing Adoption
| Decision Point | Option A | Option B | Decision Criteria |
|---|---|---|---|
| Language support | Haskell/QuickCheck (mature) | JavaScript/fast-check | Team expertise, ecosystem maturity |
| Stateful vs pure | Pure functions (stateless properties) | Stateful systems (model-based) | Application architecture |
| Property type | Algebraic (commutative, associative) | Invariant (always true after op) | Domain logic, data structure complexity |
| Integration | Dedicated property test suite | Mixed with example-based tests | Team familiarity, gradual adoption |

### Property Categories
- Idempotence → Running operation twice = once (e.g., dedup)
- Invariance → Property always holds (e.g., sort preserves length)
- Metamorphic → Relationship between inputs/outputs (e.g., reverse + reverse)
- Round-trip → Serialize + deserialize = original (e.g., JSON encode/decode)