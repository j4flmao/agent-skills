# Coverage and Mutation Testing for Smart Contracts

Line coverage tells you which code ran; mutation testing tells you whether your assertions would notice if that code were wrong. Smart contract suites often reach high coverage with weak assertions, so use both. This reference covers `forge coverage`, Hardhat coverage, interpreting reports, and mutation tools (Gambit, slither-mutate, vertigo-rs).

## forge coverage

```bash
forge coverage                                   # summary table
forge coverage --report lcov                     # writes lcov.info
forge coverage --report lcov --report summary
forge coverage --no-match-path 'test/fork/*'     # exclude slow suites
forge coverage --ir-minimum                      # work around "stack too deep" when via-ir is needed
genhtml lcov.info --branch-coverage -o coverage/ # HTML report (lcov package)
```

Notes:
- Coverage builds disable the optimizer and via-IR by default to keep source mappings accurate; contracts that only compile with via-IR need `--ir-minimum`, which can make mappings less precise.
- Exclude test, script and mock files from the report: `lcov --remove lcov.info 'test/*' 'script/*' -o lcov.info` (newer lcov versions may need `--ignore-errors unused`).

## Hardhat Coverage

- Hardhat 2: `solidity-coverage` plugin, `npx hardhat coverage`.
- Hardhat 3: built-in `npx hardhat test --coverage` for Solidity and node:test suites.

## Reading the Report

| Metric | Meaning | Watch for |
|--------|---------|-----------|
| Lines/statements | Executed at least once | Uncovered revert paths, admin functions |
| Branches | Both sides of conditions taken | `if` without negative test; ternaries; `require` failure side |
| Functions | Called at least once | Unused or untested external functions (dead code or missing tests) |

Prioritise uncovered **branches** in value-moving code (deposits, withdrawals, liquidations, fee calculation) and access-control checks.

## Coverage Targets

- No universal number is meaningful. A practical bar: every external/public function called, every custom error triggered at least once, every access-control modifier tested for both authorised and unauthorised callers.
- Track coverage trend in CI; flag drops in PRs.

## Mutation Testing

A mutant is a copy of the contract with a small change (e.g. `>=` to `>`, `+` to `-`, deleted `require`). If the test suite still passes, the mutant **survived**, revealing a missing assertion or test.

| Tool | Approach | Notes |
|------|----------|-------|
| Gambit (Certora) | Generates mutants from Solidity source via the compiler AST | Outputs mutant files; run your suite against each |
| slither-mutate | Part of Slither; mutates and runs a test command | `slither-mutate src/ --test-cmd "forge test"` |
| vertigo-rs | Foundry/Hardhat-oriented mutation runner (fork of vertigo) | Reports killed/survived mutants |

### Gambit Workflow

```bash
# generate mutants for one contract
gambit mutate --filename src/Vault.sol --solc_remappings "forge-std/=lib/forge-std/src/"
# mutants are written under gambit_out/mutants/<n>/src/Vault.sol

# run tests against each mutant (simple loop)
for m in gambit_out/mutants/*/src/Vault.sol; do
  cp "$m" src/Vault.sol
  if forge test -q > /dev/null 2>&1; then echo "SURVIVED: $m"; fi
  git checkout -- src/Vault.sol
done
```

Run this in a disposable worktree or CI job, never on a dirty working copy.

### slither-mutate

```bash
slither-mutate src/Vault.sol --test-cmd "forge test" --timeout 120
```

Mutation runs are slow (each mutant re-runs the suite). Restrict to critical contracts, use `--match-contract` in the test command, or run nightly.

## Triage Surviving Mutants

| Survivor | Likely cause | Action |
|----------|--------------|--------|
| `require(amount > 0)` deleted | No zero-amount test | Add revert test |
| `>=` changed to `>` at a boundary | No boundary test | Add test at exactly the limit |
| Fee arithmetic changed | Assertion only checks "balance increased" | Assert exact expected amounts |
| Event emission removed | Events not asserted | `vm.expectEmit` |
| Equivalent mutant (behaviour unchanged) | Mutation has no observable effect | Mark as equivalent; no action |

## Combining With Fuzzing and Invariants

Mutants killed only by fuzz/invariant tests show those properties have real value. Run mutation with a fixed fuzz seed so results are reproducible:

```toml
[fuzz]
seed = "0x2a"
```

## CI Example

```yaml
coverage:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with: { submodules: recursive }
    - uses: foundry-rs/foundry-toolchain@v1
    - run: forge coverage --report lcov --no-match-path 'test/fork/*'
    - run: |
        sudo apt-get install -y lcov
        lcov --remove lcov.info 'test/*' 'script/*' -o lcov.info --ignore-errors unused
    - uses: actions/upload-artifact@v4
      with: { name: lcov, path: lcov.info }
```

## Pitfalls

- Treating 100% line coverage as "tested": assertions may be absent.
- Coverage run excluding the via-IR code paths you ship without noticing mapping issues.
- Running mutation tests against the whole repo every push; too slow, so teams disable them.
- Ignoring survivors in access-control and arithmetic code.

## Checklist

- [ ] lcov report generated with tests/scripts/mocks excluded
- [ ] All branches in value-moving functions covered
- [ ] Every custom error and modifier has a negative test
- [ ] Mutation testing run on critical contracts (nightly or pre-audit)
- [ ] Surviving mutants triaged and fixed or justified
