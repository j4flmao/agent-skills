# Differential, Fuzz & Regression Testing

## Overview

Differential fuzzing and regression testing form the backbone of production-grade smart contract quality assurance. Differential testing compares multiple implementations of the same logic to find semantic discrepancies. Fuzz testing explores edge cases that unit tests miss. Regression testing ensures that fixes don't reintroduce old bugs or create new ones. This reference covers combining these three techniques into a comprehensive testing strategy, with Foundry, Echidna, and custom harness patterns.

## Core Architecture Concepts

### Testing Technique Overlap

```
                    ┌──────────────────────────┐
                    │     FUZZ TESTING          │
                    │  Random inputs, invariants │
                    │  Foundry fuzz, Echidna     │
                    └───────┬──────────┬────────┘
                            │          │
              ┌─────────────┘          └─────────────┐
              │                                       │
   ┌──────────▼──────────┐              ┌─────────────▼──────────┐
   │  DIFFERENTIAL FUZZ   │              │   REGRESSION FUZZ      │
   │  Two implementations │              │   Old bug + new bug    │
   │  Same input, compare│              │   Same input, compare  │
   └──────────┬──────────┘              └─────────────┬──────────┘
              │                                       │
              └─────────────┬──────────┬──────────────┘
                            │          │
                    ┌───────▼──────────▼────────┐
                    │      REGRESSION TESTING     │
                    │  Fixed known bugs            │
                    │  Historical failure replay   │
                    └─────────────────────────────┘
```

### When to Use Each Technique

| Technique | When to Use | Tooling | Coverage Goal |
|---|---|---|---|
| **Differential testing** | Multiple implementations exist (e.g., Solidity vs Rust reference), spec is well-defined | Foundry fuzz harness, Echidna, test runners | 100% of semantic equivalence paths |
| **Fuzz testing** | Numeric inputs, array parameters, stateful protocols | Foundry fuzz, Echidna, Halmos | 100% of functions with parameterized inputs |
| **Regression testing** | After fixing a bug, before every deployment | Foundry unit tests, generated test corpus | Every historical bug has a regression test |
| **Differential fuzz** | Need both: comparing implementations + finding edge cases | Hybrid harness with both oracles | Semantic equivalence across all input spaces |
| **Regression fuzz** | Need both: preventing regression + exploring new edge cases | Foundry fuzz + seeded corpus from past failures | No regression + new edge case coverage |

## Architecture Decision Trees

### Test Type Selection Per Scenario

```
What are you testing?
├── Protocol mathematical invariants
│   ├── Simple invariants (totalSupply ≤ maxSupply) → Foundry invariant test
│   ├── Complex invariants (solvency, accounting) → Foundry + Echidna
│   └── Temporal invariants (over multiple txs) → Stateful fuzz with Echidna
├── Implementation correctness vs reference
│   ├── Porting between languages (Solidity → Rust) → Differential fuzz
│   ├── Optimized implementation vs naive → Differential fuzz with gas comparison
│   └── Upgrade safety (old vs new implementation) → Differential fuzz
├── Bug fix verification
│   ├── Bug found in audit → Regression test with exact input + fuzz variant
│   ├── Bug found in prod → Regression test + invariant to prevent recurrence
│   └── Bug in dependency → Fork test with regression scenario
└── Edge case discovery
    ├── New protocol → Fuzz all functions with wide input ranges
    ├── Existing protocol + upgrade → Fuzz old vs new with same inputs
    └── Integration with external protocols → Fuzz with forked state
```

### Fuzz Strategy Decision Tree

```
Fuzz test type?
├── Stateless fuzz (single function call)
│   ├── Function has input params? → Stateless fuzz
│   ├── Function has pre-conditions → vm.assume() preconditions
│   └── Example: testFuzz_transfer(address, uint256)
├── Stateful fuzz (multiple calls, preserved state)
│   ├── Protocol has multi-step flows? → Stateful fuzz with ghost variables
│   ├── Invariant should hold across sequences? → Foundry invariant + handler
│   └── Example: invariant_solvency() with deposit/withdraw handler
└── Differential fuzz (two implementations compared)
    ├── Same logic, different implementations? → Harness calling both
    ├── Same implementation, different environments? → Fork vs local
    └── Example: testFuzz_diff_swap(referencePool, optimizedPool, params)
```

## Implementation Strategies

### Differential Fuzz Harness (Foundry)

```solidity
// Differential fuzz harness comparing two Uniswap V2 pool implementations
contract DifferentialSwapHarness is Test {
    using stdStorage for StdStorage;

    ReferencePool public reference;
    OptimizedPool public optimized;

    function setUp() public {
        reference = new ReferencePool();
        optimized = new OptimizedPool();
        // Initialize both pools with identical state
        initializeBothPools( /* same token0, token1, reserves */ );
    }

    // Differential fuzz: both implementations should produce identical results
    function testFuzz_diff_swap(
        uint256 amountIn,
        uint256 reserve0,
        uint256 reserve1
    ) public {
        vm.assume(amountIn > 0 && amountIn < type(uint112).max);
        vm.assume(reserve0 > 0 && reserve0 < type(uint112).max);
        vm.assume(reserve1 > 0 && reserve1 < type(uint112).max);
        vm.assume(reserve0 + reserve1 > 0);

        // Set identical reserves on both pools
        setReserves(address(reference), reserve0, reserve1);
        setReserves(address(optimized), reserve0, reserve1);

        // Compute swap output on both
        (uint256 refOut, uint256 refIn) = reference.getAmountOut(amountIn, reserve0, reserve1);
        (uint256 optOut, uint256 optIn) = optimized.getAmountOut(amountIn, reserve0, reserve1);

        // Assert equivalence
        assertEq(refOut, optOut, "Output amount mismatch");
        assertEq(refIn, optIn, "Input amount mismatch");
    }

    // Gas comparison: differential should not increase gas significantly
    function testFuzz_diff_gas_swap(
        uint256 amountIn,
        uint256 reserve0,
        uint256 reserve1
    ) public {
        vm.assume(/* same preconditions */);
        setReserves(address(reference), reserve0, reserve1);
        setReserves(address(optimized), reserve0, reserve1);

        uint256 refGas = gasleft();
        reference.getAmountOut(amountIn, reserve0, reserve1);
        uint256 refUsed = refGas - gasleft();

        uint256 optGas = gasleft();
        optimized.getAmountOut(amountIn, reserve0, reserve1);
        uint256 optUsed = optGas - gasleft();

        // Optimized should not use more than 110% of reference gas
        assertLe(optUsed, refUsed * 110 / 100, "Gas regression");
    }
}
```

### Regression Test Pattern with Fuzz Corpus

```solidity
// Regression test with both exact replay and fuzz variant
contract BugRegressionTest is Test {
    using stdStorage for StdStorage;

    Vault public vault;

    function setUp() public {
        vault = new Vault();
    }

    // Exact replay: reproduce the exact bug scenario
    function test_regression_reentrancy_audit_001() public {
        // Exact parameters from the audit finding
        address attacker = address(0xdead);
        vm.deal(attacker, 1 ether);

        // Deploy attack contract
        ReentrancyAttacker attackContract = new ReentrancyAttacker(address(vault));

        // Fund the vault
        vm.deal(address(vault), 100 ether);

        // Execute attack
        vm.prank(attacker);
        vm.expectRevert("ReentrancyGuard: reentrant call");
        attackContract.attack();
    }

    // Fuzz variant: search for similar bugs with different parameters
    function testFuzz_regression_reentrancy_adjacent(
        address attacker,
        uint256 vaultBalance,
        uint256 depositAmount
    ) public {
        vm.assume(attacker != address(0) && attacker != address(vault));
        vm.assume(vaultBalance > 0 && vaultBalance < 10_000 ether);
        vm.assume(depositAmount > 0 && depositAmount < vaultBalance);

        vm.deal(address(vault), vaultBalance);
        ReentrancyAttacker attackContract = new ReentrancyAttacker(address(vault));

        vm.deal(attacker, depositAmount);
        vm.prank(attacker);
        // Should always revert due to reentrancy guard
        vm.expectRevert();
        attackContract.attack();
    }
}
```

### Stateful Differential Fuzz (Echidna + Foundry)

```solidity
// Echidna stateful differential harness
// Compares a Liquity-style StabilityPool against a reference implementation

contract StabilityPoolDiffHarness {
    ReferencePool public ref;
    OptimizedPool public opt;

    // Ghost variables track expected state
    uint256 public ghost_totalDeposits;
    mapping(address => uint256) public ghost_deposits;

    constructor() {
        ref = new ReferencePool();
        opt = new OptimizedPool();
    }

    // Echidna will call these functions in random order
    function deposit(uint256 amount) public {
        amount = amount % 10_000 ether; // Bound by Echidna

        ref.deposit{value: amount}(msg.sender);
        opt.deposit{value: amount}(msg.sender);

        ghost_deposits[msg.sender] += amount;
        ghost_totalDeposits += amount;
    }

    function withdraw(uint256 amount) public {
        amount = amount % ghost_deposits[msg.sender];

        ref.withdraw(msg.sender, amount);
        opt.withdraw(msg.sender, amount);

        ghost_deposits[msg.sender] -= amount;
        ghost_totalDeposits -= amount;
    }

    // Invariant: both pools have identical state after every operation
    function echidna_both_pools_identical() public view returns (bool) {
        return ref.totalDeposits() == opt.totalDeposits()
            && ref.userDeposits(msg.sender) == opt.userDeposits(msg.sender);
    }

    // Invariant: pool state matches ghost
    function echidna_ghost_matches_ref() public view returns (bool) {
        return ref.totalDeposits() == ghost_totalDeposits;
    }

    function echidna_ghost_matches_opt() public view returns (bool) {
        return opt.totalDeposits() == ghost_totalDeposits;
    }
}
```

## Integration Patterns

### CI/CD Differential Fuzz Pipeline

```yaml
# .github/workflows/differential-fuzz.yml
name: Differential Fuzz Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 0 * * *"  # Daily deep fuzz

jobs:
  differential-fuzz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1

      - name: Run stateless differential fuzz
        run: forge test --match-path "test/differential/**" --fuzz-runs 10000

      - name: Run stateful invariant tests
        run: forge test --match-path "test/invariant/**" --fuzz-runs 5000

      - name: Run Echidna differential tests
        run: |
          echidna-test contracts/harnesses/DifferentialHarness.sol \
            --config echidna.yaml \
            --test-limit 100000

      - name: Check for regression
        run: forge snapshot --diff --check

      - name: Notify on failure
        if: failure()
        run: |
          echo "Differential fuzz found discrepancy!" | \
            slack-notify --channel testing-alerts
```

### Regression Test Seed Corpus

```solidity
// Maintain a seeded corpus from historical bugs for targeted fuzzing
// foundry.toml
[fuzz]
# Seed corpus from known failure cases
seed_corpus_path = "test/corpus/"

// test/corpus/testFuzz_transfer/ contains JSON files with known failing inputs
// Example: test/corpus/testFuzz_transfer/overflow_case.json
// {"to": "0x0000000000000000000000000000000000000000", "amount": "0"}

// Generation script to add new corpus entries from bugs
// scripts/update-corpus.ts
import { writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

interface CorpusEntry {
  functionName: string
  input: Record<string, any>
  description: string
  bugHash: string
}

function addToCorpus(entry: CorpusEntry) {
  const corpusDir = `test/corpus/${entry.functionName}/`
  const filename = `${entry.bugHash}.json`
  writeFileSync(join(corpusDir, filename), JSON.stringify(entry.input))
}
```

## Performance Optimization

### Fuzz Test Optimization

| Technique | Speedup | Tradeoff | Implementation |
|---|---|---|---|
| Input bounding | 10-100x | Misses extreme edge cases | Use `vm.assume()` with tight bounds |
| Dictionary-based fuzzing | 5-10x | Bias toward dictionary values | Populate with ABI values, known addresses |
| Corpus replay | 50-100x | Only covers known paths | Seed from historical failures |
| Parallel fuzz runs | Nx (N = cores) | Higher CI cost | `forge test --jobs N` |
| Shrink + minimize | Reduces test time | Slower initial execution | Echidna auto-shrinking |
| Warm fork caching | 2-5x | Stale state | `--fork-url` with cache |

### Coarse vs Fine Invariant Testing

```solidity
// COARSE invariant: easier to write, harder to debug
function invariant_totalSupplyBounded() public {
    assertLe(token.totalSupply(), token.maxSupply());
}
// When this fails: you know totalSupply exceeded maxSupply
// But need to replay handler calls to find exact sequence

// FINE invariant: harder to write, easier to debug
function invariant_totalSupplyAfterMint() public {
    uint256 supplyBefore = ghost_lastSupply;
    // ... (track through handler)
    assertEq(token.totalSupply(), ghost_expectedSupply);
}
// When this fails: exact operation and cause are clear
```

## Security Considerations

- **Fuzz test oracle quality**: A fuzz test is only as good as its assertions. Weak assertions (e.g., "does not revert") miss semantic bugs. Always assert specific post-conditions.
- **Differential oracle equivalence**: Two implementations can have identical bugs. Differential testing only catches discrepancies, not correctness. Use a reference implementation from a different codebase or language when possible.
- **Echidna ghost variable correctness**: Ghost variables must match the actual implementation logic. A ghost bug means the invariant test is useless. Test ghost variables independently.
- **Fork-state fuzzing time bombs**: Fork fuzz tests depend on RPC-provided state which can change. Pin block numbers and document when fork tests need updating.
- **Fuzz test timeouts in CI**: Long-running fuzz tests can be killed by CI timeouts. Split fuzz runs into fast (CI) and deep (nightly) suites.

## Operational Excellence

### Regression Test Maintenance

```markdown
# Regression Test Maintenance Guide

1. **Every bug gets a regression test** — before merging the fix, write a test that fails
   on the buggy code and passes on the fixed code.

2. **Corpus entry for every fuzz failure** — when fuzzing finds a bug, add the failing
   input to the seed corpus so it is re-tested on every run.

3. **Quarterly corpus cleanup** — remove stale corpus entries for changed code paths.
   Keep entries for invariants that still hold.

4. **Nightly deep fuzz** — run 100,000+ fuzz runs nightly for deeper coverage.
   Fast fuzz (5,000 runs) runs on every PR.

5. **Differential tests on every upgrade** — before deploying a contract upgrade,
   run the full differential fuzz suite against the old implementation.
```

### Fuzz Test Coverage Tracking

```solidity
// Track fuzz coverage with Foundry's coverage tool
// forge coverage --ir-minimum --match-path "test/fuzz/**"

// Use lcov to visualize coverage gaps
// genhtml lcov.info -o coverage-report/

// Critical functions that MUST have fuzz coverage:
// - All state-modifying functions
// - All numeric parameterized functions  
// - All price/oracle-dependent functions
// - All access control decision points
```

## Testing Strategy

### Differential Fuzz Test Suite Design

```solidity
// Complete differential fuzz test suite structure
contract FullDifferentialSuite {
    // Category 1: Mathematical equivalence
    // - getAmountOut, getAmountIn, sqrt, etc.

    // Category 2: State transition equivalence
    // - deposit, withdraw, swap, redeem

    // Category 3: Event emission equivalence
    // - Both implementations emit identical events

    // Category 4: Error handling equivalence
    // - Same inputs produce same reverts

    // Category 5: Gas profile comparison
    // - No gas regression beyond threshold
}
```

## Common Pitfalls

| Pitfall | Consequence | Prevention |
|---|---|---|
| Fuzzing without assertions | "Passes" but doesn't test anything | Every fuzz test must have assert/require |
| Using same codebase for both differential implementations | Both have same bugs, diff finds nothing | Implement reference in different language or from spec |
| No input bounds in fuzz tests | Tests spend 90% of runs on invalid inputs | Use `vm.assume()` for realistic bounds |
| Ignoring stateful fuzz coverage | Miss multi-step exploits | Always write at least 3-5 stateful invariants per protocol |
| Not seeding corpus from bugs | Same bug re-introduced later | Add failing input to corpus as part of fix |
| Fuzz tests block CI for too long | Developers skip or disable fuzz | Separate fast fuzz (PR) and deep fuzz (nightly) |
| Only fuzzing happy path | Miss error-handling bugs | Fuzz with intentionally wrong parameters too |
| Differential tests too loose | Miss subtle semantic differences | Assert exact values, not approximate ranges |

## Key Takeaways

1. **Differential testing catches semantic bugs** — comparing two implementations finds discrepancies that unit tests miss. Best when implementations are in different languages.
2. **Every bug fix needs a regression test + corpus entry** — the exact failing input should be retested on every CI run to prevent re-introduction.
3. **Fuzz tests are only as good as their assertions** — "does not revert" is not sufficient. Assert exact post-conditions, state transitions, and events.
4. **Stateful fuzzing finds the hardest bugs** — multi-step exploits and temporal invariant violations require stateful fuzzing with Echidna or Foundry invariant handlers.
5. **Seed corpus from known failures** — historical bug inputs should be in the corpus so they are tested on every fuzz run.
6. **Separate fast (PR) and deep (nightly) fuzz runs** — 5,000 runs per function on every PR; 100,000+ runs nightly for deeper edge case discovery.
7. **Ghost variables are the secret to useful invariants** — tracking expected state off-chain and asserting it matches on-chain state catches the most protocol-level bugs.
8. **Gas regression is part of testing** — differential fuzz should also compare gas consumption to prevent performance regressions during optimization.