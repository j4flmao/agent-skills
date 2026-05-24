# Treasury Management

## Overview

Treasury management covers allocation, vesting, diversification, and yield generation for protocol-owned assets. Treasury structure determines protocol sustainability and risk exposure.

---

## 1. Treasury Structure

### 1.1 Operational Treasury

Purpose: gas fees, operational expenses, payroll, infrastructure.

| Asset | Allocation | Rationale |
|-------|-----------|-----------|
| ETH | 20% | Gas fees, L1 settlement |
| USDC/USDT | 60% | Stable operational spending |
| Native token | 10% | Strategic reserves |
| Other L1/L2 | 10% | Cross-chain operations |

**Target Size:** 6-12 months of operating expenses in stablecoins + gas buffer.

### 1.2 Protocol Treasury

Purpose: protocol-owned liquidity (POL), reserve assets, insurance.

| Asset | Allocation | Strategy |
|-------|-----------|----------|
| ETH | 30% | Blue-chip reserve |
| BTC | 15% | Non-correlated reserve |
| Stablecoins | 25% | Liquidity provision |
| Blue-chip DeFi | 20% | aUSDC, cUSDC, stETH |
| Native token | 10% | POL |

### 1.3 Community Treasury

Purpose: grants, incentives, ecosystem development.

**Allocation:**

| Category | % of Treasury | Distribution Mechanism |
|----------|--------------|----------------------|
| Developer grants | 40% | Milestone-based vesting |
| Liquidity mining | 30% | Streamed over 24 months |
| Community rewards | 20% | Retroactive funding |
| Hackathons/events | 10% | Grant committee |

---

## 2. Vesting

### 2.1 Sablier (Linear Streaming)

Stream tokens in real-time. Receiver can withdraw accrued amount at any time.

```solidity
// Sablier V2 — Create Lockup Linear Stream
// Protocol: SablierV2LockupLinear

ISablierV2LockupLinear.CreateWithTimestamps memory params = ISablierV2LockupLinear.CreateWithTimestamps({
    sender: address(treasury),
    recipient: address(recipient),
    totalAmount: 1_000_000e18,          // 1M tokens
    asset: tokenAddress,
    cancelable: true,
    transferable: false,
    timestamps: ISablierV2LockupLinear.Timestamps({
        start: uint40(block.timestamp),
        cliff: uint40(block.timestamp + 180 days),    // 6 month cliff
        end: uint40(block.timestamp + 180 days + 720 days)  // 24 month vesting
    }),
    broker: ISablierV2LockupLinear.Broker({ account: address(0), fee: 0 })
});

uint256 streamId = sablier.createWithTimestamps(params);
```

**Vesting Schedule Examples:**

| Role | Cliff | Vesting Period | TGE Unlock |
|------|-------|----------------|------------|
| Team | 6 months | 24 months linear | 0% |
| Advisors | 3 months | 18 months linear | 0% |
| Seed investors | 6 months | 18 months linear | 10% at TGE |
| Strategic investors | 3 months | 12 months linear | 20% at TGE |
| Community airdrop | None | 3 months claim | 25% at TGE |

### 2.2 Token Vesting Contract

Custom vesting when Sablier doesn't fit (e.g., multi-chain, non-standard schedules).

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenVesting is Ownable {
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 startAt;
        bool revocable;
    }

    mapping(address => VestingSchedule) public vestingSchedules;
    IERC20 public immutable token;

    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }

    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 startAt,
        bool revocable
    ) external onlyOwner {
        require(vestingSchedules[beneficiary].totalAmount == 0, "Already exists");
        require(token.transferFrom(msg.sender, address(this), totalAmount), "Transfer failed");
        vestingSchedules[beneficiary] = VestingSchedule(
            totalAmount, 0, cliffDuration, vestingDuration, startAt, revocable
        );
    }

    function releasableAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule storage s = vestingSchedules[beneficiary];
        if (block.timestamp < s.startAt + s.cliffDuration) return 0;
        uint256 elapsed = block.timestamp - s.startAt - s.cliffDuration;
        if (elapsed >= s.vestingDuration) return s.totalAmount - s.releasedAmount;
        return (s.totalAmount * elapsed) / s.vestingDuration - s.releasedAmount;
    }

    function release(address beneficiary) external {
        uint256 amount = releasableAmount(beneficiary);
        require(amount > 0, "Nothing to release");
        vestingSchedules[beneficiary].releasedAmount += amount;
        require(token.transfer(beneficiary, amount), "Transfer failed");
    }
}
```

---

## 3. Diversification Strategy

### 3.1 Recommended Basket

| Asset Class | Allocation | Risk Level | Liquidity |
|-------------|-----------|------------|-----------|
| USDC/USDT | 30% | Low | Very high |
| ETH | 25% | Medium | High |
| stETH | 15% | Medium-Low | Medium |
| aUSDC | 10% | Low | Low (deposit/withdraw delay) |
| Blue-chip DeFi LP | 10% | Medium | Low |
| RWA (Ondo, M. Protocol) | 5% | Medium | Low |
| Insurance fund (ETH) | 5% | Low | High |

### 3.2 Stablecoin Diversification

| Stablecoin | Backing | Peg Mechanism | Risk |
|-----------|---------|---------------|------|
| USDC | Circle (regulated) | Fiat-backed | Regulatory |
| USDT | Tether | Fiat-backed | Transparency |
| DAI | MakerDAO | Crypto-overcollateralized | Liquidation |
| sDAI | Maker Savings | Yield-bearing | Smart contract |
| USDe | Ethena | Delta-neutral | Basis risk |

**Recommendation:** Hold at least 2 stablecoins. Max 50% USDT (regulatory concentration).

---

## 4. Yield Generation

### 4.1 Strategy Comparison

| Strategy | Protocol | APY Range | Risk | Lockup |
|----------|---------|-----------|------|--------|
| Lending | Aave | 2-8% | Low-Medium | None |
| Lending | Compound | 2-6% | Low-Medium | None |
| LP (stable) | Curve | 5-15% | Medium | None-1wk |
| LP (volatile) | Uniswap | 5-50% | High | None |
| Staking | Lido (stETH) | 3-5% | Low-Medium | None (liquid) |
| Staking | Rocket Pool (rETH) | 3-5% | Low-Medium | None (liquid) |
| RWA | Ondo (OUSG) | 4-6% | Low | 1-5 days |
| RWA | Mountain (USDM) | 4-5% | Low | None |
| Insurance | Nexus Mutual | 5-10% | Medium | 30 days |

### 4.2 Implementation

```typescript
import { ethers } from 'ethers'

// Supply USDC to Aave
const aavePool = new ethers.Contract(
  '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', // Aave v3 Pool
  ['function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)'],
  signer
)

const usdcAmount = ethers.parseUnits('1000000', 6) // 1M USDC
await aavePool.supply(usdcAddress, usdcAmount, treasuryAddress, 0)
// Result: treasury receives aUSDC (interest-bearing)
```

### 4.3 Risk Management

| Risk | Mitigation |
|------|-----------|
| Smart contract risk | Limit to audited blue-chip protocols |
| Impermanent loss | Stablecoin LPs only on volatile pairs |
| Liquidity risk | Max 20% in locked positions |
| Slashing risk | Avoid liquid staking > 30% of ETH |
| Depeg risk | Use only regulated stablecoins |
| Oracle risk | Avoid protocols with manipulated oracles |

**Diversification Rule:** No single protocol > 20% of yield-generating treasury. No single strategy > 40%.

---

## 5. Treasury Reporting

### 5.1 Portfolio Trackers

| Tool | Best For |
|------|----------|
| Zapper | Multi-chain portfolio overview |
| Zerion | DeFi position tracking |
| DeBank | Protocol-level breakdown |
| Dune Analytics | Custom dashboards (SQL) |
| OpenZeppelin Defender | Automated reporting |

### 5.2 On-Chain Data Queries

```sql
-- Dune query: Treasury token balances
SELECT
  token_address,
  symbol,
  balance / POW(10, decimals) AS balance_usd,
  balance * price AS value_usd
FROM (
  SELECT
    erc20.contract_address AS token_address,
    erc20.symbol,
    erc20.balance,
    erc20.decimals
  FROM erc20.balances erc20
  WHERE erc20.wallet_address = '0xTreasuryAddressHere'
) t
JOIN prices.usd p ON p.contract_address = t.token_address
  AND p.minute = CURRENT_TIMESTAMP
```

### 5.3 Monthly Reporting Template

| Category | Item | Value | Change (MoM) |
|----------|------|-------|---------------|
| Assets | Total treasury | $XXM | +-X% |
|  | Stables | $XXM | +-X% |
|  | ETH | $XXM | +-X% |
|  | Yield-bearing | $XXM | +-X% |
| Liabilities | Unvested tokens | $XXM | +-X% |
| Income | Yield earned | $XXM | +-X% |
|  | Revenue | $XXM | +-X% |
| Expenses | Operations | $XXM | +-X% |
| Runway | Months | X months | -- |

---

## 6. Treasury Decision Framework

```
Decision: "Should treasury allocate $5M to protocol X?"
  1. Does it align with DAO mission?        → No → Reject
  2. Is allocation < 20% of treasury?       → No → Reduce amount
  3. Is there a timelock + multisig guard?  → No → Add 7d delay
  4. Has counterparty been audited?         → No → Reject
  5. Is there a withdrawal mechanism?       → No → Reject
  6. Can position be monitored on-chain?    → No → Build dashboard first
  7. → Yes → Proceed with 2-week voting period
```

**Golden Rule:** Never let yield-chasing compromise principal safety. ADeFi treasury's first job is capital preservation, second is yield.
