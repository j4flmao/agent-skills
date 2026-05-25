---
name: quality-property-based-testing
description: >
  Use when the user asks about property-based testing, fuzzing, generative testing, QuickCheck, fast-check, invariant testing, or random testing. Do NOT use for: example-based unit testing (quality-unit-testing), or integration testing (quality-integration-testing).
version: "1.0.0"
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
Use property-based testing to find edge cases: define invariants and properties, generate random inputs, shrink failing cases, and increase test coverage beyond example-based testing.

## Workflow

### Properties vs Examples
| Aspect | Example-Based | Property-Based |
|--------|---------------|----------------|
| Inputs | Hand-picked | Randomly generated |
| Coverage | Known cases | Unbounded cases |
| Finding bugs | Confirms expected behavior | Discovers unexpected failures |
| Output | Fixed assertion | Invariant assertion |

### Common Property Types
| Property | Description | Example |
|----------|-------------|---------|
| Idempotence | Running twice = same result | Input validation, normalization |
| Invariant | Always true for valid inputs | Sorting: output is sorted |
| Round-trip | Serialize → deserialize = original | JSON/XML serialization |
| Metamorphic | Related inputs produce related outputs | Encryption: decrypt(encrypt(x)) = x |
| Stateful | Operations preserve state invariants | Stack: push then pop = original |

### fast-check Example
```typescript
import fc from 'fast-check';

test('sort should produce sorted array', () => {
    fc.assert(
        fc.property(fc.array(fc.integer()), (arr) => {
            const sorted = arr.slice().sort((a, b) => a - b);
            for (let i = 1; i < sorted.length; i++) {
                expect(sorted[i - 1]).toBeLessThanOrEqual(sorted[i]);
            }
        })
    );
});
```

## References
- `references/property-based-testing-advanced.md` — Property Based Testing Advanced
- `references/property-patterns.md` — Property Patterns
- `references/shrinking-guide.md` — Shrinking Guide
- `references/stateful-testing.md` — Stateful Testing
