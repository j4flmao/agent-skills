# Access Control and Privileged Roles in Smart Contracts

Most exploited "admin" incidents come from over-powerful keys, missing checks, or unsafe ownership transfers. This reference covers OpenZeppelin access-control primitives (v5), role design, timelocks, and multisig operations.

## Options

| Primitive | Model | Use when |
|-----------|-------|----------|
| `Ownable` | Single owner | Small contracts, owner is a multisig |
| `Ownable2Step` | Owner with pending/accept transfer | Default over `Ownable` |
| `AccessControl` | Role -> accounts, role admins | Several distinct privileges |
| `AccessControlDefaultAdminRules` | AccessControl + delayed, two-step default admin transfer | Long-lived protocols |
| `AccessManager` (OZ v5) | Central authority contract managing many targets, with execution delays | Multi-contract systems |
| `TimelockController` | Delayed execution of queued operations | Governance and parameter changes |

## Ownable2Step (OZ v5)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

contract FeeController is Ownable2Step {
    uint16 public feeBps;
    uint16 public constant MAX_FEE_BPS = 1_000;

    event FeeUpdated(uint16 oldFee, uint16 newFee);
    error FeeTooHigh(uint16 requested);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setFee(uint16 newFee) external onlyOwner {
        if (newFee > MAX_FEE_BPS) revert FeeTooHigh(newFee);
        emit FeeUpdated(feeBps, newFee);
        feeBps = newFee;
    }
}
```

In v5, `Ownable` requires the initial owner in the constructor (no implicit `msg.sender`). Bound every admin-settable parameter with on-chain limits.

## AccessControl with Separated Roles

```solidity
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract Treasury is AccessControl {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    constructor(address admin, address pauser) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);   // admin = timelock or Safe
        _grantRole(PAUSER_ROLE, pauser);         // fast-response key/guardian
        _setRoleAdmin(OPERATOR_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function rebalance(uint256 amount) external onlyRole(OPERATOR_ROLE) { /* bounded action */ }
}
```

Design principles:
- Least privilege: separate pause (fast, low-risk), operate (bounded), and upgrade/parameter (slow, timelocked).
- `DEFAULT_ADMIN_ROLE` can grant every role; protect it most.
- Avoid granting roles to EOAs in production; use multisigs.
- Make "safety" actions (pause) easy and "dangerous" actions (unpause, upgrade, withdraw) slow.

## Timelock

```solidity
// Deploy: minDelay e.g. 2 days; proposers = [Safe]; executors = [address(0)] means anyone can execute after delay
TimelockController timelock = new TimelockController(2 days, proposers, executors, address(0));
```

Flow: `schedule(target, value, data, predecessor, salt, delay)` -> wait `minDelay` -> `execute(...)`. Users can observe queued changes and exit before they take effect. Set the timelock as owner/admin of protocol contracts and give it `DEFAULT_ADMIN_ROLE` over itself only via its own process.

## Multisig Operations (Safe)

- Threshold such as 3-of-5 or 4-of-7 with signers on separate hardware wallets and organizations.
- Verify calldata independently before signing (decode with `cast calldata-decode` or Safe transaction builder simulation); blind signing has caused major losses.
- Document signer rotation and emergency procedures.

## Common Vulnerabilities

| Bug | Example | Fix |
|-----|---------|-----|
| Missing modifier | Public `setOracle()` without access check | Tests asserting revert for non-admins |
| `tx.origin` auth | `require(tx.origin == owner)` | Use `msg.sender` |
| Unprotected initializer | Proxy `initialize()` callable by anyone | Initialize in deploy tx; `_disableInitializers()` on implementation |
| Unbounded admin power | Owner can mint unlimited or drain funds | On-chain caps, timelock, minimize powers |
| Single-step transfer to wrong address | Typo bricks admin | `Ownable2Step` / default admin rules |
| Role renounced accidentally | `renounceRole` on last admin | Admin rules, monitoring |

## Testing Access Control

```solidity
function test_RevertWhen_NonOwnerSetsFee() public {
    vm.prank(attacker);
    vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
    controller.setFee(10);
}

function testFuzz_OnlyOperatorRebalances(address caller) public {
    vm.assume(!treasury.hasRole(treasury.OPERATOR_ROLE(), caller));
    vm.prank(caller);
    vm.expectRevert();
    treasury.rebalance(1);
}
```

Write a test per privileged function asserting unauthorized callers revert.

## Monitoring

Alert on `RoleGranted`, `RoleRevoked`, `OwnershipTransferStarted`, `OwnershipTransferred`, timelock `CallScheduled`, `Paused`, and upgrade `Upgraded` events (OpenZeppelin Defender successor tools, Tenderly, Forta, or custom indexers).

## Checklist

- [ ] Inventory of every privileged function and who can call it
- [ ] Admin is a multisig, ideally behind a timelock
- [ ] Two-step ownership/admin transfer
- [ ] Parameters bounded on-chain
- [ ] Pause separated from unpause/upgrade powers
- [ ] Negative tests for each privileged function
- [ ] Alerts on role and ownership events
