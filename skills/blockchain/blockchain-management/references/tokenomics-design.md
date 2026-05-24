# Tokenomics Design

## Overview

Tokenomics design covers supply models, distribution schedules, emission curves, staking mechanics, and economic modeling. The goal is to align incentives, ensure sustainability, and maintain token value over time.

---

## 1. Supply Models

### 1.1 Fixed Supply

Total supply is fixed at genesis. No new tokens minted.

| Token | Max Supply | Current Emissions | Model |
|-------|-----------|-------------------|-------|
| BTC | 21,000,000 | Decreasing (halving) | Fixed capped |
| LTC | 84,000,000 | Decreasing | Fixed capped |
| LINK | 1,000,000,000 | Fully circulating | Fixed capped |

**Pros:** Predictable scarcity, no inflation dilution, strong store-of-value narrative.

**Cons:** No flexibility for future incentives, cannot reward validators indefinitely (must rely on fees).

### 1.2 Inflationary Supply

New tokens minted at a predetermined or algorithmically adjusted rate.

| Token | Initial Supply | Inflation Rate | Model |
|-------|---------------|----------------|-------|
| ETH | 72M (ICO) | ~0.5% (post-merge, variable) | EIP-1559 burning + issuance |
| SOL | 8M (bootstrap) | ~8% (decreasing to 1.5%) | Disinflationary schedule |
| DOT | 10M (genesis) | ~10% (adjustable via governance) | Staking-targeted inflation |

**Pros:** Can fund ongoing security (staking rewards), treasury, and ecosystem growth. Flexible.

**Cons:** Dilutes non-stakers. High inflation can suppress token price.

### 1.3 Infinite with Burning

Uncapped supply with deflationary mechanisms.

**Model:** Mint new tokens for validators/stakers + burn a portion of fees.

```
Net Inflation = Mint Rate - Burn Rate

Example (EIP-1559):
  Base fee burned → reduces supply
  Issuance to validators → increases supply
  Net effect: ≈ -0.5% to +1% annually depending on activity
```

**Pros:** Protocol can always pay for security. Burn mechanism aligns with usage.

**Cons:** Complicated to model. Uncertainty in future supply.

### 1.4 Supply Model Comparison

| Property | Fixed | Inflationary | Burn Mechanism |
|----------|-------|-------------|----------------|
| Predictability | Very high | Medium | Low |
| Security funding | Fees only | Inflation | Inflation + fees |
| Flexibility | None | High | Medium |
| Valuation clarity | High | Medium | Low |
| Narrative | Digital gold | Growth asset | Utility asset |

---

## 2. Distribution

### 2.1 Typical Allocation

```
                    TOKEN DISTRIBUTION
┌──────────────────────────────────────────────────────────┐
│                 Total Supply: 1,000,000,000                │
├──────────────────────────────────────────────────────────┤
│  Public Sale        25%  │████████████████████████        │
│  Private Sale       20%  │██████████████████              │
│  Team               20%  │██████████████████              │
│  Ecosystem Fund     15%  │█████████████                   │
│  Community Airdrop  10%  │████████                        │
│  Liquidity Mining   5%   │████                            │
│  Advisors           3%   │███                             │
│  Reserve            2%   │██                              │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Vesting by Allocation

| Allocation | Cliff | Vesting | TGE Unlock |
|-----------|-------|---------|------------|
| Public sale | None | None | 100% at TGE |
| Private sale (seed) | 6 months | 18 months linear | 10% at TGE |
| Private sale (strategic) | 3 months | 12 months linear | 20% at TGE |
| Team | 12 months | 36 months linear | 0% at TGE |
| Advisors | 6 months | 24 months linear | 0% at TGE |
| Ecosystem fund | 0-6 months | 48 months | DAO-controlled |
| Airdrop | 0-3 months | Claim window (3-6 months) | 25% immediate |
| Liquidity mining | None | Streamed (24 months) | Continuous |

### 2.3 Smart Contract Vesting

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract TokenDistributor is AccessControl {
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    struct Allocation {
        uint256 total;
        uint256 claimed;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 tgeUnlock; // basis points (e.g., 1000 = 10%)
    }

    IERC20 public token;
    mapping(address => Allocation) public allocations;

    constructor(address _token) {
        token = IERC20(_token);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setAllocation(
        address recipient,
        uint256 total,
        uint256 cliff,
        uint256 duration,
        uint256 tgeBps
    ) external onlyRole(DISTRIBUTOR_ROLE) {
        allocations[recipient] = Allocation(total, 0, block.timestamp, cliff, duration, tgeBps);
    }

    function claimable(address user) public view returns (uint256) {
        Allocation memory a = allocations[user];
        if (a.total == 0) return 0;

        uint256 elapsed = block.timestamp - a.startTime;

        // TGE unlock
        uint256 tgeAmount = (a.total * a.tgeUnlock) / 10000;

        // Cliff not passed → only TGE is available
        if (elapsed < a.cliffDuration) return tgeAmount - a.claimed > tgeAmount ? 0 : tgeAmount - a.claimed;

        // Vesting
        uint256 vested = tgeAmount + ((a.total - tgeAmount) * (elapsed - a.cliffDuration)) / a.vestingDuration;
        if (vested > a.total) vested = a.total;

        return vested - a.claimed;
    }

    function claim() external {
        uint256 amount = claimable(msg.sender);
        require(amount > 0, "Nothing to claim");
        allocations[msg.sender].claimed += amount;
        require(token.transfer(msg.sender, amount));
    }
}
```

---

## 3. Emission Schedule

### 3.1 Curve Types

```
Circulating Supply Over Time
─────────────────────────────────────────────────────────
Supply
  ^
  |   Fixed (BTC) ──────────────────────────────
  |   Linear ────────────────────────────────────────
  |   Exponential decay ──────
  |   Step ──▄──▄──▄──▄──▄──▄──
  |
  +───────────────────────────────────────────────> Time
                        (years)
```

| Curve | Formula | Use Case | Effect on Price |
|-------|---------|----------|-----------------|
| Fixed | S(t) = S_max | BTC | Deflationary |
| Linear | S(t) = S_0 + r * t | Simple inflationary | Constant dilution |
| Exponential decay | S(t) = S_max * (1 - e^(-kt)) | Realistic vesting | High early inflation |
| Step | S(t) = S_0 + Σ(s_i at t_i) | Cliff unlocks | Spikes at unlock dates |

### 3.2 Emission Calculation Example

```typescript
// Calculate circulating supply over time
interface EmissionParams {
  totalSupply: bigint
  initialCirculating: bigint
  vestingSchedules: VestingEntry[]
  inflationRate: number // annual % if inflationary
  months: number
}

interface VestingEntry {
  amount: bigint
  cliffMonths: number
  durationMonths: number
  tgeUnlockBps: number
}

function calculateCirculatingSupply(params: EmissionParams, month: number): bigint {
  let supply = params.initialCirculating

  for (const v of params.vestingSchedules) {
    if (month < v.cliffMonths) {
      // Only TGE unlock available
      supply += v.amount * BigInt(v.tgeUnlockBps) / 10000n
      continue
    }
    const elapsed = month - v.cliffMonths
    const vestedMonths = Math.min(elapsed, v.durationMonths)
    const linearPart = v.amount * BigInt(10000 - v.tgeUnlockBps) / 10000n
    const vestedLinear = linearPart * BigInt(vestedMonths) / BigInt(v.durationMonths)
    const tgePart = v.amount * BigInt(v.tgeUnlockBps) / 10000n
    supply += tgePart + vestedLinear
  }

  // Inflationary emissions
  if (params.inflationRate > 0) {
    const inflationPerMonth = params.inflationRate / 12
    supply += supply * BigInt(Math.floor(inflationPerMonth * month)) / 100n
  }

  return supply
}

// Example output:
// Month 0:  15M circulating  (TGE unlocks only)
// Month 6:  35M              (seed cliff ends)
// Month 12: 55M              (strategic cliff ends + inflation)
// Month 24: 80M              (seed fully vested)
// Month 36: 95M              (team cliff ends, seed+strategic done)
// Month 60: 100% circulating
```

---

## 4. Staking Rewards

### 4.1 Token Types

| Mechanism | Example | APR | Inflation Source |
|-----------|---------|-----|-----------------|
| Proof-of-Stake | ETH | 3-5% | Protocol issuance |
| Liquid Staking | stETH, rETH | 3-5% | PoS rewards |
| DPoS (delegate) | SOL, DOT | 6-12% | Protocol inflation |
| LP Staking | UNI, CAKE | 10-100% | Farming emissions |
| Single-sided staking | AAVE stkAAVE | 5-8% | Protocol revenue |

### 4.2 Staking APR Formula

```
APR = (Rewards per year / Total staked) × 100

Example:
  Reward rate: 100 TOKEN/second
  = 3,153,600 TOKEN/year
  Total staked: 50,000,000 TOKEN
  APR = (3,153,600 / 50,000,000) × 100 = 6.3%
```

---

## 5. Token Utility & Economic Modeling

### 5.1 Token Utility

| Utility | Example | Effect on Demand |
|---------|---------|-----------------|
| Governance voting | COMP, UNI | Low (passive holders) |
| Gas/transaction fees | ETH, SOL | High (required for use) |
| Staking/security | ETH, DOT | Medium-High |
| Revenue share | GMX, KNC | High if yield is competitive |
| Collateral | MKR, SNX | Medium |
| Burn mechanism | ETH (EIP-1559) | Medium (supply reduction) |

**Design Principle:** Every token should have at least 2 utility vectors. Governance alone is insufficient for long-term value accrual.

### 5.2 Key Metrics

| Metric | Formula | Healthy Range |
|--------|---------|---------------|
| Circulating Supply | Total tokens unlocked | Shows real liquidity |
| FDV | Token Price × Max Supply | Useful for private sale comps |
| Market Cap | Token Price × Circulating Supply | Real valuation |
| MC/FDV Ratio | Market Cap / FDV | >0.3 = healthy unlock schedule |
| Staking Ratio | Staked / Circulating | >40% = engaged community |
| Inflation Rate | Annual emissions / Circulating | <10% = sustainable |

### 5.3 5-Year Supply Projection

```
┌────────────────────────────────────────────────────────────┐
│ 5-YEAR TOKEN SUPPLY PROJECTION                             │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│  Year    │ Circul.  │ % Max    │ Inflation│ Staking Ratio  │
├──────────┼──────────┼──────────┼──────────┼────────────────┤
│ Launch   │  15.0M   │   15%    │   N/A    │    10%         │
│ Year 1   │  35.3M   │   35%    │  8.2%    │    35%         │
│ Year 2   │  55.2M   │   55%    │  5.1%    │    40%         │
│ Year 3   │  72.8M   │   73%    │  3.4%    │    42%         │
│ Year 4   │  85.4M   │   85%    │  2.1%    │    38%         │
│ Year 5   │  92.1M   │   92%    │  1.1%    │    35%         │
└──────────┴──────────┴──────────┴──────────┴────────────────┘
```

### 5.4 Tokenomics Checklist

- [ ] Max supply defined and hard-capped (or clear inflation schedule)
- [ ] Distribution percentages documented and transparent
- [ ] All team/investor tokens on vesting contracts (not just promises)
- [ ] Cliff durations appropriate for each allocation category
- [ ] TGE unlock % realistic (avoids immediate sell pressure)
- [ ] Staking rewards funded from sustainable source (revenue, not pure inflation)
- [ ] MC/FDV ratio modeled at each year
- [ ] Utility mechanisms exist beyond governance
- [ ] Vesting contracts audited
- [ ] Token supply linearly unlockable without market impact

**Golden Rule:** Design tokenomics so the protocol can survive with token price at 10% of launch. If the token fails, the protocol should still function.
