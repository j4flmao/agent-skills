# Gas Benchmarking and Gas Regression Testing

Gas is a user-facing cost and, for some protocols, a correctness concern (loops that can exceed the block gas limit, griefing via expensive callbacks). This reference covers measuring gas in Foundry and Hardhat, locking it down with snapshots in CI, and testing gas-related failure modes.

## Measurement Tools

| Tool | Command | Output |
|------|---------|--------|
| Foundry gas report | `forge test --gas-report` | Per-contract, per-function min/avg/median/max gas, deployment cost |
| Foundry snapshots | `forge snapshot` | `.gas-snapshot` file with gas per test |
| Snapshot check | `forge snapshot --check` | Fails if any test's gas changed |
| Snapshot diff | `forge snapshot --diff` | Shows deltas vs existing snapshot |
| Section snapshots | `vm.startSnapshotGas("name")` / `vm.stopSnapshotGas()` | Named measurements written under `snapshots/` |
| Hardhat | `hardhat-gas-reporter` plugin (Hardhat 2) / built-in `--gas-stats` (Hardhat 3) | Per-method table |

## forge snapshot Workflow

```bash
forge snapshot                       # writes .gas-snapshot
git add .gas-snapshot

# in CI
forge snapshot --check               # fail on any change
forge snapshot --check --tolerance 1 # allow up to 1% difference
forge snapshot --diff                # print deltas (useful in PR comments)
```

`.gas-snapshot` lines look like `VaultTest:test_Deposit() (gas: 98765)`; fuzz tests record `(runs: 256, μ: ..., ~: ...)` mean and median.

Fuzz test gas is non-deterministic across seeds; exclude fuzz tests from strict snapshot checks (`--no-match-test 'testFuzz_'`) or pin the fuzz seed (`[fuzz] seed = "0x1"`).

## Measuring a Specific Section

```solidity
function test_GasDepositWarmAccount() public {
    vm.startPrank(alice);
    usdc.approve(address(vault), type(uint256).max);
    vault.deposit(1e6, alice);                 // warm storage slots

    vm.startSnapshotGas("deposit_warm");
    vault.deposit(1e6, alice);
    uint256 used = vm.stopSnapshotGas();
    vm.stopPrank();

    assertLt(used, 60_000, "deposit gas budget exceeded");
}
```

Older pattern (still valid): `uint256 g = gasleft(); call(); uint256 used = g - gasleft();` but it includes the measurement overhead.

## Interpreting Numbers Correctly

- **Cold vs warm access (EIP-2929)**: first access to a storage slot or account in a transaction costs more. Foundry tests run in one transaction per test, so slots touched in `setUp` are not automatically warm in the test body; but repeated calls inside one test are warm after the first. Measure both cases deliberately.
- **Refunds**: SSTORE refunds (EIP-3529) are capped at 20% of transaction gas; gas reports may show pre-refund numbers.
- **Calldata cost**: affects end users on L1 and dominates cost on many L2s (data posted to L1, blobs since EIP-4844). Foundry's execution gas excludes the intrinsic 21,000 and calldata costs unless you enable `isolate` mode.
- `forge test --isolate` (or `isolate = true` in `foundry.toml`) runs each top-level call as a separate transaction, giving more realistic gas including cold access.

## Gas Budgets as Tests

```solidity
uint256 constant MAX_WITHDRAW_GAS = 120_000;

function test_WithdrawStaysWithinBudget() public {
    // Arrange
    _depositFor(alice, 1_000e6);

    // Act
    vm.prank(alice);
    uint256 before = gasleft();
    vault.withdraw(500e6, alice, alice);
    uint256 used = before - gasleft();

    // Assert
    assertLe(used, MAX_WITHDRAW_GAS);
}
```

Budgets document intent ("withdraw must stay cheap") better than a raw snapshot diff.

## Unbounded Loops and DoS

Test that operations remain executable as state grows:

```solidity
function test_ClaimAll_ScalesWithRewardTokens() public {
    for (uint256 i; i < 50; ++i) _addRewardToken();
    vm.prank(alice);
    uint256 g = gasleft();
    staking.claimAll();
    assertLt(g - gasleft(), 5_000_000, "claimAll too expensive with 50 tokens");
}
```

- Any loop over user-controlled arrays (holders, positions, reward tokens) needs a cap or pagination.
- Test external calls with limited gas forwarding (e.g. `call{gas: 2300}` patterns) and malicious receivers that consume all gas (returnbomb). Use `ExcessivelySafeCall` or bounded return data copying where relevant.

## Optimisation Review Loop

1. Write a failing budget test or record the snapshot baseline.
2. Change one thing (storage packing, `immutable`, custom errors, `unchecked` where provably safe, caching storage reads in memory).
3. Run `forge snapshot --diff` and the full test suite, including invariants.
4. Keep the change only if gas improves and readability/safety is acceptable.

Common safe wins: custom errors instead of revert strings, `immutable`/`constant` for config, packing related small fields into one slot, avoiding repeated SLOADs, `calldata` instead of `memory` for read-only external arrays.

## Compiler Settings Affect Gas

| Setting | Effect |
|---------|--------|
| `optimizer_runs` | Higher favours runtime gas over deployment size |
| `via_ir = true` | Often lower gas, slower compilation; test thoroughly when switching |
| EVM version | `cancun`/`prague` enable newer opcodes (`MCOPY`, transient storage `TSTORE/TLOAD`); match the target chain |

Record compiler settings with the snapshot; comparing numbers across settings is meaningless.

## CI Integration

```yaml
- name: Gas snapshot check
  run: forge snapshot --check --no-match-test 'testFuzz_'
- name: Gas diff for PR
  if: github.event_name == 'pull_request'
  run: forge snapshot --diff --no-match-test 'testFuzz_' | tee gas-diff.txt
```

## Checklist

- [ ] `.gas-snapshot` committed; CI runs `--check`
- [ ] Budgets for user-critical paths (deposit, withdraw, swap)
- [ ] Cold and warm measurements where it matters; `--isolate` for realism
- [ ] Loops over growing state tested at realistic sizes
- [ ] Optimisations accompanied by full test and invariant runs
