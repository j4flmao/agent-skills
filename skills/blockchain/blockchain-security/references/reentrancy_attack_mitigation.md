# Reentrancy Attack Mitigation

Reentrancy happens when a contract makes an external call before it has finished updating its own state, and the callee (or something it triggers) calls back into the contract and observes or exploits that intermediate state. This reference covers the variants, defensive patterns in current Solidity (0.8.x, OpenZeppelin Contracts 5.x), and how to test for them.

## Variants

| Variant | Description | Typical trigger |
|---|---|---|
| Single-function | Callback re-enters the same function | `call{value:}` to attacker in `withdraw` |
| Cross-function | Callback enters a different function sharing state | `withdraw` re-entered via `transfer` of internal balance |
| Cross-contract | Callback enters another contract of the same protocol that reads stale shared state | Vault + strategy, lending pool + oracle |
| Read-only | Callback calls a `view` function that returns inconsistent values mid-update; another protocol relies on it | Pool price/virtual price read during liquidity removal |
| Token-hook | Hooks in ERC-777 (`tokensReceived`), ERC-721/1155 `onERC*Received`, ERC-4626 or custom tokens call into receiver | `safeTransferFrom`, `_safeMint` |
| Delegated account | After EIP-7702, an address that looked like an EOA can run code on receiving ETH or calls | Assumptions that `tx.origin`/no-code addresses cannot re-enter |

Any external call is a potential re-entry point: low-level `call`, interface calls to untrusted contracts, token transfers with hooks, and ETH sends.

## Vulnerable Example

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract VulnerableBank {
    mapping(address => uint256) public balances;

    function deposit() external payable { balances[msg.sender] += msg.value; }

    function withdraw() external {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "no balance");
        (bool ok, ) = msg.sender.call{value: bal}("");   // interaction before effect
        require(ok, "send failed");
        balances[msg.sender] = 0;                         // too late
    }
}
```
An attacker contract's `receive()` calls `withdraw()` again while `balances[attacker]` is still non-zero, draining the contract.

## Defense 1: Checks-Effects-Interactions (CEI)

```solidity
function withdraw() external {
    uint256 bal = balances[msg.sender];                 // checks
    require(bal > 0, "no balance");
    balances[msg.sender] = 0;                           // effects
    (bool ok, ) = msg.sender.call{value: bal}("");      // interactions
    require(ok, "ETH transfer failed");
}
```
Apply CEI to every function, including internal helpers called before external calls. CEI alone does not stop read-only or cross-contract reentrancy if other contracts read state that is only consistent after the full operation.

## Defense 2: Reentrancy Guards

OpenZeppelin 5.x location: `@openzeppelin/contracts/utils/ReentrancyGuard.sol` (moved from `security/` in 4.x). A transient-storage variant, `ReentrancyGuardTransient`, uses EIP-1153 `TSTORE`/`TLOAD` and is cheaper on chains that support Cancun opcodes.

```solidity
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Bank is ReentrancyGuard {
    mapping(address => uint256) public balances;

    function withdraw() external nonReentrant {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "no balance");
        balances[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok, "withdraw transfer failed");
    }

    function transferInternal(address to, uint256 amount) external nonReentrant {
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
}
```
- Put `nonReentrant` on all state-changing entry points that share state, not only the one with the external call (cross-function reentrancy).
- `nonReentrant` functions cannot call each other; factor shared logic into private functions.
- For protocols spanning several contracts, use a shared lock (one guard contract or a lock checked by all) so cross-contract re-entry is blocked.

### Protecting view functions (read-only reentrancy)
```solidity
function getSharePrice() external view returns (uint256) {
    if (_reentrancyGuardEntered()) revert ReentrancyGuardReentrantCall();
    return totalAssets() * 1e18 / totalSupply();
}
```
`_reentrancyGuardEntered()` is available in OpenZeppelin 5.x. Integrators reading another protocol's prices should check that protocol's lock state where exposed (Balancer and Curve published guidance after read-only reentrancy incidents).

## Defense 3: Pull Over Push

```solidity
mapping(address => uint256) public pendingWithdrawals;

function _credit(address user, uint256 amount) internal { pendingWithdrawals[user] += amount; }

function claim() external nonReentrant {
    uint256 amount = pendingWithdrawals[msg.sender];
    pendingWithdrawals[msg.sender] = 0;
    (bool ok, ) = msg.sender.call{value: amount}("");
    require(ok, "claim transfer failed");
}
```
Users withdraw their own funds; failed or malicious receivers affect only themselves.

## Defense 4: Careful Token Handling
- Use `SafeERC20` (`safeTransfer`, `safeTransferFrom`) for non-standard tokens, but remember it does not remove hooks.
- Treat ERC-777, ERC-721/1155 safe transfers and arbitrary ERC-20s as untrusted calls; apply CEI and guards around them.
- Do not rely on `transfer()`/`send()` 2300-gas stipend as protection: gas costs change across forks and smart wallets need more gas; use `call` with CEI and guards.
- Measure balances before/after for fee-on-transfer tokens, but update accounting before any further external call.

## Detection

| Tool | Finds |
|---|---|
| Slither detectors `reentrancy-eth`, `reentrancy-no-eth`, `reentrancy-benign`, `reentrancy-events`, `reentrancy-unlimited-gas` | State written after external calls |
| Aderyn | Static checks including state changes after external calls |
| Foundry tests with attacker contracts | Concrete exploit reproduction |
| Invariant/fuzz testing (Foundry, Echidna, Medusa) | Accounting invariants violated through callbacks |

```bash
slither . --detect reentrancy-eth,reentrancy-no-eth,reentrancy-benign
```

### Foundry exploit test
```solidity
contract Attacker {
    VulnerableBank public bank;
    constructor(VulnerableBank b) { bank = b; }
    function attack() external payable { bank.deposit{value: msg.value}(); bank.withdraw(); }
    receive() external payable { if (address(bank).balance >= msg.value) bank.withdraw(); }
}

function test_reentrancyDrain() public {
    // Arrange
    vm.deal(address(this), 10 ether);
    bank.deposit{value: 10 ether}();
    Attacker attacker = new Attacker(bank);
    vm.deal(address(attacker), 1 ether);
    // Act
    vm.prank(address(attacker));
    attacker.attack{value: 1 ether}();
    // Assert: on the fixed contract this must hold
    assertEq(address(bank).balance, 10 ether);
}
```

### Invariant
```solidity
function invariant_solvency() public view {
    assertGe(address(bank).balance, handler.sumOfBalances());
}
```

## Review Checklist
- [ ] Every external call identified (including token transfers and hooks)
- [ ] State updated before each external call (CEI)
- [ ] `nonReentrant` on all entry points sharing state; shared lock across protocol contracts
- [ ] View functions used by integrators protected or documented against read-only reentrancy
- [ ] No reliance on gas stipends or "EOA-only" assumptions (post EIP-7702)
- [ ] Attacker-contract tests and solvency invariants in CI
