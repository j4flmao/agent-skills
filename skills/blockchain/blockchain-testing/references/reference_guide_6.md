# Testing Upgradeable Contracts

Upgradeable systems (Transparent proxy, UUPS, Beacon, Diamond) add failure modes that ordinary unit tests miss: storage layout collisions, unprotected initializers, broken upgrade authorization, and state that does not survive an upgrade. This reference shows how to test them with Foundry and OpenZeppelin tooling.

## Failure Modes to Cover

| Risk | Example | Test |
|------|---------|------|
| Storage collision | V2 inserts a variable before existing ones | Layout validation + state-preservation test |
| Uninitialized implementation | Anyone calls `initialize` on the implementation contract | Assert implementation constructor ran `_disableInitializers()` |
| Re-initialization | `initialize` callable twice | Expect revert on second call |
| Unauthorized upgrade | `upgradeToAndCall` without access control (UUPS `_authorizeUpgrade`) | Non-admin upgrade reverts |
| Lost upgradeability | V2 (UUPS) omits `UUPSUpgradeable` | Upgrade V2 -> V3 in tests |
| Selector clash | Proxy admin function shadows implementation function (Transparent) | Use OZ v5 Transparent proxy (admin is a separate `ProxyAdmin`) |
| Reinitializer misuse | V2 migration logic not run or run twice | `reinitializer(2)` tests |

## OpenZeppelin Foundry Upgrades Plugin

```bash
forge install OpenZeppelin/openzeppelin-foundry-upgrades
forge install OpenZeppelin/openzeppelin-contracts-upgradeable
```

```toml
# foundry.toml (required by the plugin's validation)
[profile.default]
ffi = true
ast = true
build_info = true
extra_output = ["storageLayout"]
```

The plugin runs the `@openzeppelin/upgrades-core` validator via FFI (Node.js required) and checks storage layout compatibility and unsafe patterns (constructors, `selfdestruct`, `delegatecall`).

```solidity
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";
import {VaultV1} from "src/VaultV1.sol";
import {VaultV2} from "src/VaultV2.sol";

contract VaultUpgradeTest is Test {
    address admin = makeAddr("admin");
    address alice = makeAddr("alice");
    address proxy;

    function setUp() public {
        proxy = Upgrades.deployUUPSProxy(
            "VaultV1.sol",
            abi.encodeCall(VaultV1.initialize, (admin))
        );
    }

    function test_Upgrade_PreservesState() public {
        // Arrange
        vm.prank(admin);
        VaultV1(proxy).setFeeBps(30);

        // Act
        vm.prank(admin);
        Upgrades.upgradeProxy(proxy, "VaultV2.sol", abi.encodeCall(VaultV2.initializeV2, ()));

        // Assert
        assertEq(VaultV2(proxy).feeBps(), 30);
        assertEq(VaultV2(proxy).version(), 2);
    }

    function test_RevertWhen_NonAdminUpgrades() public {
        address impl = address(new VaultV2());
        vm.prank(alice);
        vm.expectRevert();   // prefer the exact selector, e.g. OwnableUnauthorizedAccount
        VaultV1(proxy).upgradeToAndCall(impl, "");
    }

    function test_RevertWhen_InitializeCalledTwice() public {
        vm.expectRevert(bytes4(keccak256("InvalidInitialization()")));
        VaultV1(proxy).initialize(alice);
    }
}
```

`Upgrades.validateUpgrade("VaultV2.sol", opts)` validates without deploying; use it in a dedicated CI test. Annotate V2 with `/// @custom:oz-upgrades-from VaultV1` so the plugin knows the reference contract.

For tests that must not use FFI (fast unit runs), the plugin also offers `UnsafeUpgrades` with pre-deployed implementations and no validation; keep at least one validated path in CI.

## Storage Layout Rules

- Append new variables only; never reorder, remove or change types of existing ones.
- Prefer **ERC-7201 namespaced storage** (`@custom:storage-location erc7201:<namespace>`), used by OpenZeppelin Contracts v5 upgradeable. Each module's state lives in a struct at a hash-derived slot, so inheritance changes do not shift layout.
- Legacy pattern: `uint256[50] private __gap;` reduced by the number of new variables added.

Inspect layouts:

```bash
forge inspect VaultV1 storageLayout --json > v1.json
forge inspect VaultV2 storageLayout --json > v2.json
diff <(jq '.storage[] | {label, slot, offset, type}' v1.json) <(jq '.storage[] | {label, slot, offset, type}' v2.json)
```

## Implementation Contract Protection

```solidity
/// @custom:oz-upgrades-unsafe-allow constructor
constructor() { _disableInitializers(); }
```

Test it:

```solidity
function test_ImplementationCannotBeInitialized() public {
    VaultV1 impl = new VaultV1();
    vm.expectRevert(bytes4(keccak256("InvalidInitialization()")));
    impl.initialize(alice);
}
```

## Upgrade Against Real State (Fork)

Before a production upgrade, fork the chain at a recent block, prank the real admin (timelock/multisig), perform the upgrade, and run the full integration and invariant suite against the upgraded proxy. This catches storage incompatibilities with real data and migration bugs.

```solidity
function testFork_UpgradeLiveVault() public {
    vm.createSelectFork("mainnet", PINNED_BLOCK);
    address timelock = LIVE_TIMELOCK;   // constants copied from your deployment registry
    uint256 before = VaultV1(LIVE_PROXY).totalAssets();

    address impl = address(new VaultV2());
    vm.prank(timelock);
    VaultV1(LIVE_PROXY).upgradeToAndCall(impl, abi.encodeCall(VaultV2.initializeV2, ()));

    assertEq(VaultV2(LIVE_PROXY).totalAssets(), before);
}
```

## Beacon and Diamond Notes

- Beacon: test that upgrading the beacon updates every proxy, and that only the beacon owner can upgrade.
- Diamond (ERC-2535): test facet selector collisions, `diamondCut` access control, and shared storage structs (namespaced storage per facet).

## Checklist

- [ ] Storage layout validated in CI (OZ plugin or layout diff)
- [ ] ERC-7201 namespaced storage or gaps used consistently
- [ ] `_disableInitializers()` in implementation constructors, tested
- [ ] Re-initialization and unauthorized upgrade revert with specific errors
- [ ] State-preservation test across V1 -> V2, and V2 -> V3 upgradeability
- [ ] Fork rehearsal of the production upgrade with the real admin
