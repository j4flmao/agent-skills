# Fuzz and Invariant Testing for Smart Contracts

Unit tests check examples you thought of. Fuzzing and invariant (stateful) testing search for inputs and call sequences you did not. This reference covers Foundry fuzz/invariant tests, handler design, and complementary tools (Echidna, Medusa, Halmos).

## Stateless Fuzz Tests

Any test function with parameters is fuzzed.

```solidity
function testFuzz_DepositWithdrawRoundTrip(uint96 amount) public {
    amount = uint96(bound(amount, 1, 1_000_000e18));
    deal(address(asset), alice, amount);

    vm.startPrank(alice);
    asset.approve(address(vault), amount);
    uint256 shares = vault.deposit(amount, alice);
    uint256 out = vault.redeem(shares, alice, alice);
    vm.stopPrank();

    assertLe(out, amount, "cannot withdraw more than deposited");
    assertApproxEqAbs(out, amount, 1, "rounding loss at most 1 wei");
}
```

- Use `bound(x, min, max)` instead of `vm.assume` for ranges; too many `assume` rejections abort the run.
- Foundry biases inputs toward edge values (0, max, values seen in the contract).
- Configure runs: `[fuzz] runs = 1000` default profile; more in CI.
- Failing inputs are persisted and replayed (`cache/fuzz/failures`).

## Invariant Tests

An invariant is a property that must hold after any sequence of calls.

```solidity
// test/invariant/VaultInvariants.t.sol
contract VaultInvariants is Test {
    Vault vault;
    MockERC20 asset;
    VaultHandler handler;

    function setUp() public {
        asset = new MockERC20();
        vault = new Vault(address(asset));
        handler = new VaultHandler(vault, asset);
        targetContract(address(handler));            // only call through the handler
    }

    function invariant_SolvencyAssetsCoverShares() public view {
        assertGe(asset.balanceOf(address(vault)), vault.convertToAssets(vault.totalSupply()));
    }

    function invariant_SupplyEqualsSumOfBalances() public view {
        assertEq(vault.totalSupply(), handler.ghostSumOfShares());
    }
}
```

## Handler Pattern

Handlers constrain random calls to realistic actions and track "ghost" variables.

```solidity
contract VaultHandler is Test {
    Vault vault;
    MockERC20 asset;
    address[] public actors;
    mapping(address => uint256) public ghostShares;
    uint256 public ghostSumOfShares;

    constructor(Vault v, MockERC20 a) {
        vault = v; asset = a;
        for (uint256 i; i < 3; ++i) actors.push(makeAddr(string.concat("actor", vm.toString(i))));
    }

    function deposit(uint256 actorSeed, uint256 amount) external {
        address actor = actors[bound(actorSeed, 0, actors.length - 1)];
        amount = bound(amount, 1, 1e30);
        asset.mint(actor, amount);
        vm.startPrank(actor);
        asset.approve(address(vault), amount);
        uint256 s = vault.deposit(amount, actor);
        vm.stopPrank();
        ghostShares[actor] += s;
        ghostSumOfShares += s;
    }

    function redeem(uint256 actorSeed, uint256 shares) external {
        address actor = actors[bound(actorSeed, 0, actors.length - 1)];
        shares = bound(shares, 0, vault.balanceOf(actor));
        if (shares == 0) return;
        vm.prank(actor);
        vault.redeem(shares, actor, actor);
        ghostShares[actor] -= shares;
        ghostSumOfShares -= shares;
    }
}
```

Configuration:

```toml
[invariant]
runs = 256
depth = 100            # calls per run
fail_on_revert = false # true makes any handler revert a failure; useful once handlers are well-bounded
```

## Writing Good Invariants

| Category | Example |
|----------|---------|
| Conservation | Sum of balances == totalSupply |
| Solvency | Assets held >= liabilities |
| Monotonicity | Share price never decreases absent losses; nonce only increases |
| Access | Owner never changes except through `transferOwnership` flow |
| Bounds | Fee <= MAX_FEE; utilization <= 100% |
| No free lunch | An actor cannot end with more assets than deposited plus yield |

Derive invariants from the spec and docs, not from the implementation.

## Other Tools

| Tool | Approach | Notes |
|------|----------|-------|
| Echidna | Property-based fuzzer (Haskell) | `echidna_` properties or assertion mode; corpus-guided |
| Medusa | Go-based parallel fuzzer, Echidna-compatible style | Good throughput on multicore |
| Halmos | Symbolic execution of Foundry tests | Proves properties for all inputs within bounds |
| Certora Prover | Formal verification with CVL specs | Commercial; strongest guarantees |
| Kontrol | K-framework symbolic execution of Foundry tests | Formal, heavier setup |

Halmos example: a test prefixed `check_` with symbolic arguments is explored for all values:

```solidity
function check_FeeNeverExceedsAmount(uint256 amount) public view {
    uint256 fee = vault.previewFee(amount);
    assert(fee <= amount);
}
```

## Mutation Testing

Tools such as Gambit or `vertigo-rs` mutate the source; surviving mutants reveal tests that do not check behavior.

## CI Strategy

- PRs: unit tests + fuzz with moderate runs.
- Nightly: invariant tests with high runs/depth, Echidna/Medusa long campaigns, persisted corpus.
- Before audits and releases: symbolic checks for critical math.

## Pitfalls

- Handlers that revert on most calls: low effective depth. Inspect the call summary (`forge test --mt invariant -vv` shows calls/reverts per selector).
- Over-constrained bounds hiding edge cases (never testing amount 1 or max).
- Invariants that restate the implementation.
- Mocks that behave unlike real tokens (fee-on-transfer, rebasing, missing return values).

## Checklist

- [ ] Fuzz tests for all math-heavy functions with `bound`
- [ ] Invariants documented from the spec
- [ ] Handlers with multiple actors and ghost accounting
- [ ] Revert ratio reviewed per handler function
- [ ] Long fuzz campaigns scheduled in CI
- [ ] Symbolic/formal checks for core accounting
