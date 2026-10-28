# Pull Payments, Checks-Effects-Interactions and Reentrancy Defense

How to move value out of contracts safely. Covers the checks-effects-interactions (CEI) ordering, reentrancy guards (including read-only and cross-function reentrancy), the pull-over-push withdrawal pattern, and safe token/ETH transfer helpers.

## Reentrancy in One Picture

```
Vault.withdraw()
  ├─ reads balance[user] = 10
  ├─ sends 10 ETH to user  ──► attacker.receive() calls Vault.withdraw() again
  │                               └─ balance[user] still 10 → sends again
  └─ sets balance[user] = 0  (too late)
```

Any external call (ETH transfer, ERC-777/ERC-1155/ERC-721 safe transfer hooks, arbitrary `call`) can hand control to untrusted code.

## Checks-Effects-Interactions

```solidity
function withdraw(uint256 amount) external nonReentrant {
    // Checks
    uint256 bal = balances[msg.sender];
    if (amount > bal) revert InsufficientBalance(bal, amount);

    // Effects
    balances[msg.sender] = bal - amount;
    emit Withdrawn(msg.sender, amount);

    // Interactions
    (bool ok, ) = msg.sender.call{value: amount}("");
    if (!ok) revert TransferFailed();
}
```

CEI is the primary defense; `nonReentrant` is defense in depth.

## Reentrancy Variants

| Variant | Description | Defense |
|---------|-------------|---------|
| Single-function | Re-enter the same function | CEI + guard |
| Cross-function | Re-enter a different function sharing state (e.g. `transfer` during `withdraw`) | Guard on all state-mutating functions sharing state |
| Cross-contract | Re-enter another contract of the same protocol that reads stale state | Protocol-wide lock or CEI across contracts |
| Read-only | A `view` function returns inconsistent values mid-update; another protocol prices against it | Guard check in views (`_reentrancyGuardEntered()`), or consumers verify lock state |

Read-only reentrancy has hit integrations that read pool prices (e.g. LP token valuations) during callbacks.

## OpenZeppelin Guards (v5)

```solidity
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// On chains with EIP-1153 transient storage:
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
```

`ReentrancyGuardTransient` stores the lock in transient storage, which is cheaper. Use it only where the target chain supports Cancun opcodes. Upgradeable variants live in `@openzeppelin/contracts-upgradeable`.

## Pull over Push

Pushing payments to many recipients in one transaction fails if any recipient reverts (DoS) and invites reentrancy. Let recipients withdraw instead.

```solidity
contract Auction {
    mapping(address => uint256) public pendingReturns;
    address public highestBidder;
    uint256 public highestBid;

    function bid() external payable {
        if (msg.value <= highestBid) revert BidTooLow();
        if (highestBidder != address(0)) {
            pendingReturns[highestBidder] += highestBid;   // credit, don't send
        }
        highestBidder = msg.sender;
        highestBid = msg.value;
    }

    function withdrawRefund() external {
        uint256 amount = pendingReturns[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        pendingReturns[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
```

## Sending ETH

| Method | Gas forwarded | Recommendation |
|--------|---------------|----------------|
| `transfer` | 2,300 stipend | Avoid: breaks with smart wallets and gas repricing |
| `send` | 2,300, returns bool | Avoid |
| `call{value: x}("")` | All remaining (or capped) | Use with CEI + guard, check return value |
| `Address.sendValue` (OZ) | All remaining | Wrapper around `call` that reverts on failure |

## Sending ERC-20 Tokens

Some tokens do not return `bool` (e.g. USDT on mainnet) or return `false` instead of reverting. Use `SafeERC20`:

```solidity
using SafeERC20 for IERC20;
token.safeTransfer(to, amount);
token.safeTransferFrom(from, address(this), amount);
token.forceApprove(spender, amount);   // handles tokens requiring allowance reset to 0
```

For tokens with transfer fees or rebasing, measure the balance delta instead of trusting `amount`:

```solidity
uint256 before = token.balanceOf(address(this));
token.safeTransferFrom(msg.sender, address(this), amount);
uint256 received = token.balanceOf(address(this)) - before;
```

## Callback-Bearing Standards

| Standard | Hook | Risk |
|----------|------|------|
| ERC-721 `safeTransferFrom` / `_safeMint` | `onERC721Received` | Reentrancy during mint/transfer |
| ERC-1155 transfers | `onERC1155Received` | Same |
| ERC-777 | `tokensReceived`/`tokensToSend` | Reentrancy on plain transfers |
| Flash loans | Borrower callback | Arbitrary code mid-operation |

Treat these like ETH transfers: state updated before the call.

## Gas Griefing and Return Data Bombs

A malicious recipient can return huge return data, making the caller pay memory expansion. When calling untrusted addresses, cap gas and ignore return data with low-level assembly, or use a library such as `ExcessivelySafeCall`.

## Testing Reentrancy

```solidity
contract Reenterer {
    Vault vault;
    constructor(Vault v) { vault = v; }
    receive() external payable {
        if (address(vault).balance >= 1 ether) vault.withdraw(1 ether);
    }
}

function test_WithdrawIsNotReentrant() public {
    Reenterer r = new Reenterer(vault);
    vm.deal(address(r), 1 ether);
    vm.prank(address(r)); vault.deposit{value: 1 ether}();
    vm.prank(address(r));
    vm.expectRevert();               // guard or failed inner call
    vault.withdraw(1 ether);
}
```

Static analysis (Slither `reentrancy-*` detectors) flags many patterns.

## Checklist

- [ ] CEI ordering in every function with external calls
- [ ] Reentrancy guard on all functions sharing mutable state
- [ ] View functions used by integrators safe against read-only reentrancy
- [ ] Payouts use pull pattern where recipients are untrusted or many
- [ ] `call` with checked return, never `transfer`/`send`
- [ ] `SafeERC20` and balance-delta accounting for nonstandard tokens
- [ ] Malicious-receiver tests in the suite
