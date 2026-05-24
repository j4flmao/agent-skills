# Blockchain / Smart Contract Coding Standards

## Overview

These coding standards apply to all smart contract development across Solidity, Rust (Anchor/Solana), and Move (Sui/Aptos). Every PR must conform to these standards before merging.

---

## Solidity Conventions

### Versioning

```solidity
// Use ^0.8.x with minimum 0.8.20 for native transient storage
pragma solidity ^0.8.20;
```

- Prefer `^0.8.x` over fixed version to allow patch updates
- Pin exact version in CI lockfile for reproducible builds
- No experimental pragmas in production code

### NatSpec

Every public and external function MUST have full NatSpec:

```solidity
/// @notice Transfers tokens to a recipient
/// @dev Requires caller to have sufficient balance and allowance
/// @param to Recipient address
/// @param amount Amount of tokens to transfer
/// @return success True if transfer succeeded
function transfer(address to, uint256 amount) external returns (bool success);
```

| Tag | Required | When |
|---|---|---|
| `@notice` | Always | Every function |
| `@dev` | Conditional | Non-trivial logic |
| `@param` | Always | Every parameter |
| `@return` | Conditional | If returning values |
| `@inheritdoc` | Conditional | Override functions |
| `@custom:risk` | Conditional | Security-critical functions |
| `@custom:gas` | Conditional | If gas matters to caller |

### Variable Naming

```solidity
// Private state: _leadingUnderscore
uint256 private _totalSupply;
mapping(address => uint256) private _balances;

// Internal: trailingUnderscore_
uint256 internal totalSupply_;

// Public: camelCase without underscore
uint256 public totalSupply;

// Immutable: IMMUTABLE_NAME
address public immutable OWNER;
uint256 public immutable DEPLOY_TIMESTAMP;

// Constant: CONSTANT_NAME
uint256 public constant MAX_SUPPLY = 1_000_000 ether;
uint256 public constant PERCENT_DENOMINATOR = 10_000;

// Event params: indexed for filtering
event Transfer(address indexed from, address indexed to, uint256 value);
event Approval(address indexed owner, address indexed spender, uint256 value);
```

### Function Ordering

```solidity
contract MyContract {
    // 1. Constructor
    constructor() { }

    // 2. Receive (ETH deposits)
    receive() external payable { }

    // 3. Fallback (proxy forwarding)
    fallback() external { }

    // 4. External (public interface)
    function externalFunction() external { }

    // 5. Public (mixed internal/external)
    function publicFunction() public { }

    // 6. Internal (inherited contracts)
    function _internalFunction() internal { }

    // 7. Private (this contract only)
    function __privateFunction() private { }
}
```

### Modifier Placement: Checks → Effects → Interactions

```solidity
function withdraw(uint256 amount) external {
    // Checks
    require(balanceOf[msg.sender] >= amount, "Insufficient balance");
    require(amount > 0, "Zero amount");

    // Effects
    balanceOf[msg.sender] -= amount;

    // Interactions
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "ETH transfer failed");
}
```

### Custom Errors

Always use custom errors over `revert` strings:

```solidity
// Good
error InsufficientBalance(address account, uint256 available, uint256 required);
error Unauthorized(address caller, address expected);
error ZeroAddress();
error InvalidAmount(uint256 amount);

function withdraw(uint256 amount) external {
    if (amount > _balances[msg.sender]) {
        revert InsufficientBalance(msg.sender, _balances[msg.sender], amount);
    }
    // ...
}

// Bad
// require(amount <= _balances[msg.sender], "insufficient balance");
```

### OpenZeppelin Usage

```solidity
// Use OZ v5.x contracts as base
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MyToken is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    // ...
}
```

### Prohibited Patterns

| Pattern | Why | Replacement |
|---|---|---|
| `tx.origin` | Phishing vulnerability | `msg.sender` |
| `address.transfer()` | 2300 gas limit may fail | `call{value: amount}` |
| `block.timestamp` for randomness | Miner manipulation | Chainlink VRF |
| `blockhash(block.number)` | Always 0 | Use `block.prevrandao` (post-merge) |
| `selfdestruct` | EVM removal planned | Design without it |
| Unchecked arithmetic pre-0.8 | Overflow | Solidity 0.8+ checked |
| `delegatecall` to untrusted addr | Storage corruption | Use proxies only |

### Receive and Fallback

```solidity
// For receiving ETH directly
receive() external payable { }

// For proxy forwarding pattern
fallback() external {
    _fallback();
}
```

Maximum line length: 120 characters.

---

## Complete Solidity Example

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

error StakingZeroAmount();
error StakingInsufficientBalance(address account, uint256 available, uint256 required);
error StakingNoStake(address account);
error StakingRewardNotReady(address account, uint256 unlockTime);

contract Staking is Ownable, ReentrancyGuard {
    uint256 public constant REWARD_RATE = 100; // 10% APY (scaled by 1000)
    uint256 public constant REWARD_DENOMINATOR = 1000;
    uint256 public constant MIN_STAKE = 1 ether;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);
    event RewardRateUpdated(uint256 newRate);

    struct StakeInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 stakedAt;
    }

    IERC20 public immutable STAKING_TOKEN;

    mapping(address => StakeInfo) private _stakes;
    uint256 private _totalStaked;

    constructor(address _stakingToken) Ownable(msg.sender) {
        if (_stakingToken == address(0)) revert ZeroAddress();
        STAKING_TOKEN = IERC20(_stakingToken);
    }

    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert StakingZeroAmount();
        if (amount < MIN_STAKE) revert StakingInsufficientBalance(msg.sender, 0, MIN_STAKE);

        StakeInfo storage info = _stakes[msg.sender];

        if (info.amount > 0) {
            uint256 pending = _calculateReward(info);
            info.rewardDebt += pending;
        }

        STAKING_TOKEN.transferFrom(msg.sender, address(this), amount);

        info.amount += amount;
        info.stakedAt = block.timestamp;
        _totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    function unstake() external nonReentrant {
        StakeInfo storage info = _stakes[msg.sender];
        if (info.amount == 0) revert StakingNoStake(msg.sender);

        uint256 reward = _calculateReward(info) + info.rewardDebt;
        uint256 amount = info.amount;

        delete _stakes[msg.sender];
        _totalStaked -= amount;

        STAKING_TOKEN.transfer(msg.sender, amount + reward);

        emit Unstaked(msg.sender, amount, reward);
    }

    function _calculateReward(StakeInfo storage info) internal view returns (uint256) {
        uint256 stakingDuration = block.timestamp - info.stakedAt;
        return (info.amount * REWARD_RATE * stakingDuration) / (365 days * REWARD_DENOMINATOR);
    }

    function updateRewardRate(uint256 _newRate) external onlyOwner {
        emit RewardRateUpdated(_newRate);
    }

    function getStake(address account) external view returns (StakeInfo memory) {
        return _stakes[account];
    }

    function totalStaked() external view returns (uint256) {
        return _totalStaked;
    }
}
```

---

## Rust (Anchor / Solana) Conventions

### Project Structure

```
programs/
  my_program/
    src/
      lib.rs          # Entrypoint + module declarations
      instructions/   # One file per instruction
        create_xxx.rs
        update_xxx.rs
        delete_xxx.rs
      states/         # Account structs
        xxx_account.rs
      errors/         # Custom error codes
      constants/      # Seeds, PDA derivation constants
```

### Code Example

```rust
use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::clock::Clock;

declare_id!("YourProgramID1111111111111111111111111111111111");

#[program]
pub mod my_program {
    use super::*;

    pub fn create_vault(ctx: Context<CreateVault>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let clock = Clock::get()?;

        vault.owner = ctx.accounts.owner.key();
        vault.balance = amount;
        vault.created_at = clock.unix_timestamp;
        vault.bump = ctx.bumps.vault;

        emit!(VaultCreated {
            owner: ctx.accounts.owner.key(),
            balance: amount,
        });

        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.balance = vault.balance.checked_add(amount).ok_or(ErrorCode::Overflow)?;

        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.depositor.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;

        emit!(Deposited {
            depositor: ctx.accounts.depositor.key(),
            amount,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateVault<'info> {
    #[account(
        init,
        seeds = [b"vault", owner.key().as_ref()],
        bump,
        payer = owner,
        space = 8 + Vault::INIT_SPACE
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub owner: Pubkey,
    pub balance: u64,
    pub created_at: i64,
    pub bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Insufficient vault balance")]
    InsufficientBalance,
}

#[event]
pub struct VaultCreated {
    pub owner: Pubkey,
    pub balance: u64,
}

#[event]
pub struct Deposited {
    pub depositor: Pubkey,
    pub amount: u64,
}
```

---

## Move (Sui / Aptos) Conventions

### Module Naming

```
sources/
  my_module.move
  vault.move
  token.move
```

### Code Example (Sui)

```move
module my_project::vault {
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::tx_context::{Self, TxContext};

    // Structs: CamelCase
    // Abilities: key + store for objects
    struct Vault has key, store {
        id: UID,
        owner: address,
        balance: u64,
    }

    // Functions: snake_case
    public fun create_vault(ctx: &mut TxContext): Vault {
        let owner = tx_context::sender(ctx);
        let vault = Vault {
            id: object::new(ctx),
            owner,
            balance: 0,
        };
        transfer::transfer(vault, owner);
        vault
    }

    public entry fun deposit(
        vault: &mut Vault,
        coin: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        let amount = coin::value(&coin);
        vault.balance = vault.balance + amount;
        coin::put(&mut vault.id, coin);

        sui::event::emit(Deposited {
            depositor: tx_context::sender(ctx),
            amount,
        });
    }

    // Events
    struct Deposited has copy, drop {
        depositor: address,
        amount: u64,
    }
}
```

---

## Testing Standards

### File Structure

```
test/
  unit/
    Staking.t.sol         # Mirrors src/Staking.sol
    Vault.t.sol           # Mirrors src/Vault.sol
  integration/
    FullFlow.t.sol        # Cross-contract interactions
  fuzz/
    StakingFuzz.t.sol     # Parameter fuzzing
  invariant/
    StakingInvariants.t.sol  # Protocol invariants
```

### Test Naming

```solidity
// Pattern: test_[function]_[scenario]
function test_deposit_increasesBalance() public { }
function test_deposit_revertsWhen_zeroAmount() public { }
function test_deposit_revertsWhen_exceedsAllowance() public { }
function test_withdraw_emitsWithdrawEvent() public { }
function test_withdraw_revertsWhen_insufficientBalance() public { }
```

### Coverage Targets

| Metric | Target |
|---|---|
| Line coverage | >= 90% |
| Branch coverage | >= 80% |
| Function coverage | >= 95% |
| Fuzz parameter combinations | >= 10000 runs per function |
| Invariant runs | >= 1000 per invariant |

### Gas Snapshot

```bash
# Generate baseline
forge snapshot --snap .gas-snapshot

# Compare in CI
forge snapshot --diff .gas-snapshot --check
```

Gas snapshot must be included in every PR. Any increase > 5% requires justification.

### Testing Example

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Staking} from "../src/Staking.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";

contract StakingTest is Test {
    Staking public staking;
    ERC20Mock public token;
    address public user = makeAddr("user");
    address public owner = makeAddr("owner");

    function setUp() public {
        vm.prank(owner);
        token = new ERC20Mock("Test", "TST", 18);
        vm.prank(owner);
        staking = new Staking(address(token));
        token.mint(user, 1000 ether);
    }

    function test_stake_increasesBalance() public {
        vm.prank(user);
        token.approve(address(staking), 100 ether);
        vm.prank(user);
        staking.stake(100 ether);

        (uint256 amount,,,,) = staking.getStake(user);
        assertEq(amount, 100 ether);
    }

    function test_stake_revertsWhen_zeroAmount() public {
        vm.prank(user);
        vm.expectRevert();
        staking.stake(0);
    }

    function testFuzz_stake_multipleUsers(uint256 amount1, uint256 amount2) public {
        amount1 = bound(amount1, 1 ether, 1000 ether);
        amount2 = bound(amount2, 1 ether, 1000 ether);
        address user2 = makeAddr("user2");
        token.mint(user2, amount2);

        vm.startPrank(user);
        token.approve(address(staking), amount1);
        staking.stake(amount1);
        vm.stopPrank();

        vm.startPrank(user2);
        token.approve(address(staking), amount2);
        staking.stake(amount2);
        vm.stopPrank();

        assertEq(staking.totalStaked(), amount1 + amount2);
    }
}
```
