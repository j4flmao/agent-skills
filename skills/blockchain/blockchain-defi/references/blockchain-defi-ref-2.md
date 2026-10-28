# Flash Loans, MEV and Transaction Ordering Risks in DeFi

Flash loans give anyone temporary access to large capital within one transaction; maximal extractable value (MEV) lets block builders and searchers profit from transaction ordering. Together they mean any protocol weakness that is profitable at scale will be exploited quickly. This reference explains flash loan mechanics (ERC-3156, Aave, Balancer), common MEV patterns, and defensive design for protocols and users.

## Flash Loan Mechanics

A flash loan transfers assets to a borrower contract, calls it, and requires repayment plus fee before the transaction ends; otherwise the whole transaction reverts.

```text
lender.flashLoan(receiver, token, amount, data)
   -> transfer amount to receiver
   -> receiver.onFlashLoan(initiator, token, amount, fee, data)   // arbitrary logic
   -> lender pulls amount + fee (or checks balance), else revert
```

| Provider | Interface | Notes |
|----------|-----------|-------|
| ERC-3156 lenders | `flashLoan(IERC3156FlashBorrower receiver, address token, uint256 amount, bytes data)`; callback returns `keccak256("ERC3156FlashBorrower.onFlashLoan")` | Standard interface; OpenZeppelin `ERC20FlashMint` implements it for tokens |
| Aave v3 | `flashLoan` (multi-asset, optional debt opening) and `flashLoanSimple` | Fee set by governance |
| Balancer Vault | Flash loans from vault balances | Fee set by governance (has been zero) |
| Uniswap v2/v3 | Flash swaps: receive tokens first, pay back (or pay in the other token) in the callback | Fees equal the swap fee |
| Uniswap v4 / unlock pattern | Pool manager `unlock` callback with deltas settled at the end | Flash accounting across many operations |

### Safe borrower implementation (ERC-3156)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC3156FlashBorrower} from "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
import {IERC3156FlashLender} from "@openzeppelin/contracts/interfaces/IERC3156FlashLender.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Liquidator is IERC3156FlashBorrower {
    using SafeERC20 for IERC20;

    IERC3156FlashLender public immutable lender;
    address public immutable owner;

    error UntrustedLender();
    error UntrustedInitiator();

    constructor(IERC3156FlashLender _lender) { lender = _lender; owner = msg.sender; }

    function run(address token, uint256 amount, bytes calldata params) external {
        require(msg.sender == owner, "only owner");
        lender.flashLoan(this, token, amount, params);
    }

    function onFlashLoan(address initiator, address token, uint256 amount, uint256 fee, bytes calldata params)
        external returns (bytes32)
    {
        if (msg.sender != address(lender)) revert UntrustedLender();
        if (initiator != address(this)) revert UntrustedInitiator();
        _execute(token, amount, params);                          // liquidation / arbitrage logic
        IERC20(token).forceApprove(address(lender), amount + fee); // lender pulls repayment
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }

    function _execute(address token, uint256 amount, bytes calldata params) internal {
        // decode params and perform the strategy; must leave amount + fee of `token` here
    }
}
```

Checking both `msg.sender` (the lender) and `initiator` (this contract) prevents others from triggering your callback with their own loans and draining approvals or balances.

## Flash Loans Do Not Create Vulnerabilities, They Fund Them

Flash loans remove the capital requirement for attacks. Typical exploited weaknesses:

| Weakness | Exploit pattern |
|----------|-----------------|
| Spot-price oracle | Borrow, skew pool price, borrow/mint against inflated collateral, restore, repay |
| Governance with snapshot-free voting | Borrow governance tokens, vote or pass proposal in one transaction |
| Vault share price from balances | Donate to inflate share price, exploit rounding for first depositor or collateral value |
| Reward distribution by current balance | Deposit briefly to claim rewards accrued over time |
| Rounding errors at scale | Repeat a tiny profitable rounding many times with large amounts |
| Reentrancy via callbacks | Re-enter during token callbacks (ERC-777 hooks, ERC-721/1155 receivers, native ETH transfers) |

Protocol design rule: assume any attacker has unlimited capital for the duration of one transaction. Measures:
- Voting power from past snapshots (`ERC20Votes` checkpoints at proposal creation block).
- Time-weighting for rewards (accumulators per second, not balance at claim time).
- Manipulation-resistant oracles (see `blockchain-defi-ref-1.md`).
- Reentrancy guards and checks-effects-interactions.
- Invariant tests with an attacker handler holding very large balances.

## MEV Patterns

| Pattern | Description | Who is harmed |
|---------|-------------|---------------|
| Front-running | Insert a transaction before a known pending one | User whose trade is front-run |
| Sandwich attack | Buy before and sell after a victim's swap, profiting from their slippage | Swappers with loose slippage limits |
| Back-running | Act immediately after a state change (arbitrage after a large swap, liquidation after an oracle update) | Usually benign; arbitrage keeps prices aligned |
| Liquidation races | Searchers compete to liquidate | Borrower pays liquidation bonus either way; protocol benefits from fast liquidations |
| JIT liquidity | Add concentrated liquidity just before a large swap, remove after | Passive LPs lose fee share |
| Oracle extractable value | Profit from the update order of oracle prices | Protocol and its users |
| Time-bandit / reorg | Reorganize recent blocks to capture past MEV | Mostly a risk on chains with weak finality |

On Ethereum, proposer-builder separation via MEV-Boost relays means specialized builders assemble most blocks from searcher bundles; private orderflow channels are widespread.

## User-Side Protections

- **Slippage limits**: always set `amountOutMinimum` (or max input) from a fresh quote with tight tolerance. Zero slippage protection invites sandwiches.
- **Deadlines**: include a deadline so a delayed transaction cannot execute at stale terms.
- **Private transaction submission**: send through private RPCs or orderflow auctions (for example Flashbots Protect, MEV Blocker) that keep transactions out of the public mempool and may rebate back-run value.
- **Intent-based trading**: solvers compete to fill signed orders (CoW Protocol batch auctions, UniswapX), shifting MEV risk to solvers and often giving price improvement.

```solidity
// Uniswap v3 SwapRouter02 exactInputSingle with protection
ISwapRouter02.ExactInputSingleParams memory params = ISwapRouter02.ExactInputSingleParams({
    tokenIn: WETH,
    tokenOut: USDC,
    fee: 500,
    recipient: msg.sender,
    amountIn: amountIn,
    amountOutMinimum: quotedOut * 9_950 / 10_000,   // 0.5% max slippage from a fresh quote
    sqrtPriceLimitX96: 0
});
```

Quote off-chain or through a quoter contract in a separate call; computing `amountOutMinimum` from the pool's current on-chain price inside the same transaction provides no protection because a sandwich already moved that price.

## Protocol-Side Protections

| Design choice | MEV effect |
|---------------|-----------|
| Batch auctions / uniform clearing price per batch | Removes intra-batch ordering advantage |
| Commit-reveal for sensitive actions | Hides intent until ordering is fixed |
| Dutch auctions for liquidations (price decreases over time) | Competition returns value to protocol instead of gas wars |
| Oracle-based pricing for swaps (with safeguards) | Reduces sandwichable price impact; introduces oracle risk |
| Hooks with dynamic fees (Uniswap v4) | Can raise fees under toxic flow |
| Rate limits and per-block caps | Bound value extractable in one block |
| Keeper incentives and liquidation bonuses sized correctly | Ensures timely liquidation without overpaying |

## Testing for Flash-Loan and MEV Resilience

- Foundry fork tests that borrow large amounts from real lenders (or `deal` balances) and attempt price manipulation against your oracle and accounting.
- Invariant tests with handlers for deposit, withdraw, swap, donate and flash-borrow actions in arbitrary order.
- Simulate sandwiches around user actions to quantify losses at chosen slippage defaults.
- Review every external call for reentrancy and every price read for manipulability within one transaction.

## Checklist

- [ ] Flash loan callbacks check lender and initiator
- [ ] Protocol logic safe against unlimited single-transaction capital
- [ ] Governance uses historical snapshots; rewards are time-weighted
- [ ] No same-transaction spot prices in value-moving paths
- [ ] User flows enforce slippage limits from fresh quotes and deadlines
- [ ] Private submission or intent-based execution offered for large trades
- [ ] Liquidation design avoids pure gas-auction races where possible
- [ ] Fork and invariant tests simulate flash-loan-funded attacks and sandwiches
