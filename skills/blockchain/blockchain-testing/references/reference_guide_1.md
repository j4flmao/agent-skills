# Smart Contract Test Architecture and Fixtures (Foundry)

How to structure a Foundry test suite so it stays fast, readable and reusable as a protocol grows: directory layout, base test contracts, deployment fixtures shared with scripts, actors and labels, and naming conventions. Fuzzing, invariants and forks are covered in sibling references.

## Directory Layout

```
src/
script/
  Deploy.s.sol              # production deployment logic
  DeployHelpers.sol         # shared by tests and scripts
test/
  base/
    BaseTest.sol            # actors, labels, common setup
    Fixtures.sol            # deploys the full system
  unit/
    Vault.deposit.t.sol     # one behaviour area per file
    Vault.withdraw.t.sol
  integration/
    VaultStrategy.t.sol
  invariant/
    handlers/VaultHandler.sol
    Vault.invariant.t.sol
  fork/
    UniswapAdapter.fork.t.sol
  mocks/
    MockERC20.sol
    MockOracle.sol
foundry.toml
```

## foundry.toml Profiles

```toml
[profile.default]
src = "src"
test = "test"
script = "script"
solc_version = "0.8.28"
optimizer = true
optimizer_runs = 200
fuzz = { runs = 256 }
invariant = { runs = 64, depth = 64, fail_on_revert = false }

[profile.ci]
fuzz = { runs = 5000 }
invariant = { runs = 256, depth = 128 }
verbosity = 3

[profile.lite]           # fast local iteration
optimizer = false
fuzz = { runs = 64 }
```

Select with `FOUNDRY_PROFILE=ci forge test`.

## Base Test Contract

```solidity
// test/base/BaseTest.sol
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";

abstract contract BaseTest is Test {
    address internal admin;
    address internal alice;
    address internal bob;
    address internal attacker;

    function setUp() public virtual {
        admin = makeAddr("admin");
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        attacker = makeAddr("attacker");
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    modifier asUser(address user) {
        vm.startPrank(user);
        _;
        vm.stopPrank();
    }
}
```

`makeAddr` creates a deterministic address and labels it, so traces show `alice` instead of hex.

## System Fixture Shared With Deployment Scripts

Test the same deployment code you ship. Put construction logic in a library/contract used by both.

```solidity
// script/DeployHelpers.sol
pragma solidity 0.8.28;

import {Vault} from "src/Vault.sol";
import {Oracle} from "src/Oracle.sol";

struct System { Vault vault; Oracle oracle; }

library DeployHelpers {
    function deploySystem(address admin, address asset) internal returns (System memory s) {
        s.oracle = new Oracle(admin);
        s.vault = new Vault(asset, address(s.oracle), admin);
    }
}
```

```solidity
// test/base/Fixtures.sol
pragma solidity 0.8.28;

import {BaseTest} from "./BaseTest.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {DeployHelpers, System} from "script/DeployHelpers.sol";

abstract contract Fixtures is BaseTest {
    MockERC20 internal usdc;
    System internal sys;

    function setUp() public virtual override {
        super.setUp();
        usdc = new MockERC20("USD Coin", "USDC", 6);
        sys = DeployHelpers.deploySystem(admin, address(usdc));
        vm.label(address(sys.vault), "Vault");
        usdc.mint(alice, 1_000_000e6);
    }
}
```

## Unit Test File Pattern

```solidity
// test/unit/Vault.deposit.t.sol
pragma solidity 0.8.28;

import {Fixtures} from "../base/Fixtures.sol";
import {Vault} from "src/Vault.sol";

contract VaultDepositTest is Fixtures {
    function test_Deposit_MintsSharesOneToOne_WhenVaultEmpty() public asUser(alice) {
        // Arrange
        usdc.approve(address(sys.vault), 100e6);

        // Act
        uint256 shares = sys.vault.deposit(100e6, alice);

        // Assert
        assertEq(shares, 100e6);
        assertEq(sys.vault.balanceOf(alice), 100e6);
        assertEq(usdc.balanceOf(address(sys.vault)), 100e6);
    }

    function test_RevertWhen_DepositIsZero() public asUser(alice) {
        vm.expectRevert(Vault.ZeroAmount.selector);
        sys.vault.deposit(0, alice);
    }

    function test_Deposit_EmitsEvent() public asUser(alice) {
        usdc.approve(address(sys.vault), 1e6);
        vm.expectEmit(true, true, false, true, address(sys.vault));
        emit Vault.Deposit(alice, alice, 1e6, 1e6);
        sys.vault.deposit(1e6, alice);
    }
}
```

## Naming Conventions

| Prefix | Meaning |
|--------|---------|
| `test_` | Concrete test |
| `testFuzz_` | Fuzz test (takes parameters) |
| `test_RevertWhen_` / `test_RevertIf_` | Expected revert |
| `invariant_` | Invariant property |
| `testFork_` | Requires fork RPC |

Use `forge test --match-test`, `--match-contract`, `--match-path` to run subsets; `--no-match-path 'test/fork/*'` keeps forks out of fast runs.

## Branching Tree Technique (BTT)

Describe each function's behaviour as a tree, then generate test skeletons:

```
// test/unit/Vault.withdraw.tree
withdraw
├── when caller has no shares
│   └── it should revert
└── when caller has shares
    ├── when vault is paused
    │   └── it should revert
    └── when vault is not paused
        ├── it should burn shares
        └── it should transfer assets
```

`bulloak scaffold` turns `.tree` files into Solidity test stubs and `bulloak check` verifies the tests still match the tree.

## Mocks vs Real Dependencies

| Dependency | Unit tests | Integration/fork tests |
|------------|-----------|------------------------|
| ERC-20 | `MockERC20` (configurable decimals) | Real token on fork, including fee-on-transfer / non-standard tokens like USDT |
| Oracles | Mock with settable price and timestamp | Real Chainlink feed on fork |
| External protocol | Minimal mock implementing the interface | Fork |

Use `vm.mockCall` for one-off return values and `vm.mockCallRevert` to simulate failures.

## Pitfalls

- Deploying differently in tests than in scripts; bugs hide in the deployment path.
- Huge `setUp()` shared by unrelated tests; slow and hard to reason about.
- Asserting only return values, not state changes and events.
- Relying on default `msg.sender` (`DefaultSender`) instead of explicit pranks.
- Tests that pass because `vm.expectRevert()` without a selector matched an unrelated revert.

## Checklist

- [ ] BaseTest with labelled actors; Fixtures reuse deployment helpers
- [ ] One behaviour area per test file; consistent naming
- [ ] Every revert test checks the specific error selector
- [ ] Events asserted with `vm.expectEmit`
- [ ] Profiles for local, CI and fork runs
