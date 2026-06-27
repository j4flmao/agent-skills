---
name: blockchain-defi
description: >
  Use this skill when asked about decentralized finance, DeFi protocols, AMM mechanics, lending and borrowing protocols, perpetual futures, yield farming, liquidity mining, liquid staking, restaking, yield optimization, DeFi security, MEV, and protocol composability. Covers AMM design (Uniswap, Curve, Balancer), lending protocols (Aave, Compound, Morpho), derivatives (dYdX, GMX, Synthetix), liquid staking (Lido, Rocket Pool, EigenLayer restaking), and yield strategies (Yearn, Convex). Do NOT use for: general smart contract development (use blockchain-application), blockchain core protocol (use blockchain-core), or web3 UI integration (use blockchain-web3).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [blockchain, defi, finance, protocol, phase-blockchain]
---

# Blockchain DeFi

## Purpose
Guide decentralized finance protocol design, analysis, and implementation. Covers AMM mechanics, lending/borrowing, derivatives, liquid staking, yield strategies, and DeFi security with focus on economic security and incentive alignment.

## Agent Protocol

### Trigger
"defi", "decentralized finance", "amm", "automated market maker", "lending protocol", "borrowing", "liquidation", "yield farming", "liquidity mining", "perpetual futures", "perps", "liquid staking", "restaking", "eigenlayer", "lido", "uniswap", "curve", "aave", "compound", "yearn", "convex", "yield optimization", "mev defi", "flash loan", "liquidation", "oracle price defi"

### Input Context
- Protocol category (AMM/lending/derivatives/LSD/yield aggregator)
- Target blockchain (EVM/Solana/Cosmos)
- Capital base and liquidity requirements
- Risk tolerance (collateral factors, liquidation thresholds)
- Oracle integration requirements
- Governance model (on-chain/off-chain, emergency pause mechanism)

### Output Artifact
DeFi protocol specification including: mechanism design, economic security analysis, contract architecture, risk assessment, and integration guide.

### Response Format
1. **Protocol category**: AMM / lending / derivatives / LSD / yield aggregator
2. **Mechanism design**: core invariants, pricing formulas, incentive model, fee structure
3. **Economic security**: oracle risk, liquidation safety, capital efficiency trade-offs, MEV exposure
4. **Implementation**: key contract architecture, integration points, Solidity/EVM patterns
5. **Risk analysis**: smart contract risk, impermanent loss, depeg risk, regulatory exposure, composability risk

### Completion Criteria
- Mechanism design includes: invariant function, fee model, incentive alignment analysis
- Economic security analysis covers: oracle manipulation, flash loan attacks, liquidity crises
- Contract architecture follows established patterns (checks-effects-interactions, access control)
- Risk assessment quantifies: IL, liquidation risk, depeg scenarios, protocol composability risks
- Governance and emergency procedures specified

### Max Response Length
5000 tokens

## Decision Trees

### Protocol Category Selection
```
DeFi protocol type:
├── Token swapping / trading?
│   ├── Constant product (x*y=k) → Uniswap v2 style
│   │   ├── Pros: Simple, proven, always liquid
│   │   └── Cons: High slippage, IL for LPs
│   ├── Stable/fixed product → Curve style (stableswap)
│   │   ├── Pros: Low slippage for stable pairs
│   │   └── Cons: Complex math, only stable pairs
│   ├── Weighted pools → Balancer style
│   │   ├── Pros: Multi-token pools, custom weights
│   │   └── Cons: Higher complexity, gas costs
│   └── Concentrated liquidity → Uniswap v3 style
│       ├── Pros: Capital efficient, custom price ranges
│       └── Cons: Active position management needed
├── Lending / borrowing?
│   ├── Pool-based → Aave / Compound style
│   │   ├── Pros: Passive supply, variable rates
│   │   └── Cons: Pool risk (all depositors share risk)
│   ├── P2P lending → Morpho style
│   │   ├── Pros: Better rates, P2P matching
│   │   └── Cons: Liquidity fragmentation
│   └── Isolated lending → Euler style
│       ├── Pros: Per-market risk isolation
│       └── Cons: Higher complexity
├── Derivatives / perpetuals?
│   ├── vAMM → GMX style (synthetic AMM)
│   ├── Order book → dYdX style (on-chain order book)
│   └── Synthetic assets → Synthetix style (debt pool)
├── Liquid staking / restaking?
│   ├── ETH staking → Lido (stETH), Rocket Pool (rETH)
│   └── Restaking → EigenLayer (AVS security)
└── Yield optimization?
    ├── Auto-compounding → Yearn style (strategist-managed vaults)
    └── Reward token boosting → Convex style (veTokenomics)
```

### AMM Invariant Selection
```
Target asset type:
├── Volatile assets (ETH/USDC) → x*y=k (Uniswap v2/v3)
├── Stable assets (USDC/USDT) → Stableswap (Curve)
├── Multiple assets (ETH/USDC/DAI) → Weighted pool (Balancer)
└── Correlated assets (stETH/ETH) → L2S (Paraswap, Curve Tricrypto)

Fee tier selection (Uniswap v3):
├── 0.01%: Stable pairs, very tight range (USDC/USDT)
├── 0.05%: Correlated pairs (wstETH/ETH, WBTC/renBTC)
├── 0.30%: Standard volatile pairs (ETH/USDC)
└── 1.00%: Exotic tokens, low liquidity pairs
```

### Liquidation Strategy Decision
```
Collateral type:
├── Volatile (ETH, wBTC) → Conservative parameters
│   ├── LTV: 70-80%
│   ├── Liquidation threshold: 80-85%
│   └── Liquidation bonus: 5-10%
├── Stable (USDC, DAI) → Aggressive parameters
│   ├── LTV: 80-90%
│   ├── Liquidation threshold: 90-95%
│   └── Liquidation bonus: 3-5%
├── LSD (stETH, rETH) → Moderate parameters
│   ├── LTV: 75-82%
│   ├── Liquidation threshold: 83-88%
│   └── Bonus: 3-7% (prevent connected asset manipulation)
└── LP tokens → Conservative parameters
    ├── LTV: 40-70% (depends on pool composition)
    ├── Liquidation threshold: 50-75%
    └── Bonus: 10-15% (compound IL risk)
```

## AMM Mechanics

### Constant Product AMM (Uniswap v2)
```solidity
// x * y = k invariant
// dy/dx = -y/x (instantaneous price)
// output = y - (x * y) / (x + input * fee)

function swapExactInput(
    uint256 inputAmount,
    uint256 minOutputAmount,
    uint256 reserveIn,
    uint256 reserveOut,
    uint256 fee // e.g., 997 (0.3%)
) external returns (uint256 outputAmount) {
    uint256 inputWithFee = inputAmount * fee;
    uint256 numerator = inputWithFee * reserveOut;
    uint256 denominator = reserveIn * 1000 + inputWithFee;
    outputAmount = numerator / denominator;
    require(outputAmount >= minOutputAmount, "slippage exceeded");
}
```

### Concentrated Liquidity (Uniswap v3)
```solidity
// L = sqrt(k) where k = x * y
// Price range [p_a, p_b]
// When price in range: LPs provide both assets
// When price outside range: LPs provide only one asset
// Virtual reserves accounting for custom price ranges

function getAmount0Delta(
    uint160 sqrtRatioAX96,
    uint160 sqrtRatioBX96,
    uint128 liquidity
) internal pure returns (uint256) {
    if (sqrtRatioAX96 > sqrtRatioBX96)
        (sqrtRatioAX96, sqrtRatioBX96) = (sqrtRatioBX96, sqrtRatioAX96);
    uint256 numerator1 = uint256(liquidity) << 96;
    uint256 numerator2 = sqrtRatioBX96 - sqrtRatioAX96;
    return numerator1 / sqrtRatioBX96 * numerator2 / sqrtRatioAX96;
}
```

### Stableswap Invariant (Curve)
```python
# Curve's stableswap invariant: combination of constant sum and constant product
# x + y + (x*y) / (D/2) = D + D^2 / (4*amplification_coefficient)
# A * n^n * sum(x_i) + D = A * D * n^n + D^(n+1) / (n^n * prod(x_i))

# For large A: behaves like constant sum (stablecoins)
# For small A: behaves like constant product (volatile assets)
# A = amplification coefficient (typically 100-10000)

def get_y(i, j, x, xp, A, D):
    """Calculate y for token j given x for token i"""
    # Newton's method to solve for y
    # Returns amount of token j for given amount of token i
    pass
```

## Lending Mechanics

### Interest Rate Model
```solidity
// Utilization rate: U = TotalBorrowed / TotalSupplied
// Aave v2 optimal utilization: 80% (stable), 45% (volatile)

function calculateBorrowRate(uint256 utilization) public pure returns (uint256) {
    uint256 optimalUtilization = 0.8e18; // 80%
    uint256 baseRate = 0.02e18;          // 2% APR
    uint256 slope1 = 0.07e18;            // Slope below optimal
    uint256 slope2 = 3.00e18;            // Slope above optimal (steep)

    if (utilization <= optimalUtilization) {
        return baseRate + (utilization * slope1 / optimalUtilization);
    } else {
        uint256 excess = utilization - optimalUtilization;
        return baseRate + slope1 + (excess * slope2 / (1e18 - optimalUtilization));
    }
}
```

### Liquidation
```solidity
// Health factor = (collateral * price * liquidationThreshold) / borrowed
// HF < 1 → liquidatable
// Liquidation bonus: 5-15% (incentivizes liquidators)

struct Position {
    mapping(address => uint256) supplied;    // token => amount
    mapping(address => uint256) borrowed;    // token => amount
}

function getHealthFactor(address user) public view returns (uint256) {
    (uint256 totalCollateralETH, uint256 totalDebtETH) = getAccountLiquidity(user);
    if (totalDebtETH == 0) return type(uint256).max;
    return (totalCollateralETH * 10) / (totalDebtETH * 10); // normalized
}

// Liquidation call flow:
// 1. Liquidator calls liquidate(user, debtToken, collateralToken)
// 2. Repay portion of debt (close factor: 50% max per liquidation)
// 3. Receive collateral at discounted rate (liquidationBonus)
// 4. Protocol keeps reserveFactor portion of bonus
```

### Flash Loans
```solidity
// ERC-3156 flash loan pattern
// Borrower receives tokens, must return them in same tx + fee

interface IFlashLoan {
    function flashLoan(
        address receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external returns (bool);
}

// Receiver must implement onFlashLoan callback
// If funds not returned, transaction reverts
// Fee: 0.05-0.3% of borrowed amount

// Common flash loan attacks:
// 1. Price manipulation: borrow → swap → manipulate oracle → profit → repay
// 2. Governance attack: borrow tokens → vote → repay (use block snapshot)
// 3. Liquidation: flash repay to get collateral, arbitrage
```

## Derivatives

### Perpetual Futures Comparison
| Feature | GMX (vAMM) | dYdX (Orderbook) | Synthetix (Debt Pool) |
|---------|------------|------------------|----------------------|
| Pricing | GLP pool pricing | Order book | Oracle-based |
| Liquidity | GLP pool (single-sided) | Market makers | SNX debt pool |
| Funding rate | Based on pool imbalance | Premium/discount | Dynamic |
| Leverage | Up to 50x | Up to 10x | Up to 25x |
| Liquidation | Based on position value | Mark price | Debt ratio |
| Chain | Arbitrum, Avalanche | StarkNet (L2) | Optimism, Ethereum |

### Perpetual Pricing Formula
```solidity
// Funding rate = mark_price - index_price
// 8-hour funding interval (standard)
// Longs pay shorts when funding > 0 (and vice versa)

function calculateFundingRate(
    uint256 markPrice,
    uint256 indexPrice,
    uint256 timeSinceLastFunding
) external view returns (int256) {
    int256 premium = int256(markPrice) - int256(indexPrice);
    // Clamp to [-0.05%, 0.05%] per hour
    int256 maxPremium = int256(indexPrice) * 5 / 10000;
    if (premium > maxPremium) premium = maxPremium;
    if (premium < -maxPremium) premium = -maxPremium;
    return premium * int256(timeSinceLastFunding) / 1 hours;
}
```

## Liquid Staking & Restaking

### LSD Architecture
```
Liquid Staking Derivatives (LSDs):
├── Lido (stETH)
│   ├── stETH: rebasing (balance increases with rewards)
│   ├── wstETH: non-rebasing wrapped version (DeFi composable)
│   ├── Node operators: permissioned set, curated by Lido DAO
│   └── Staking ratio: ~30% of total ETH staked (Oct 2024)
├── Rocket Pool (rETH)
│   ├── rETH: value-accruing (no rebase, price increases)
│   ├── Node operators: permissionless (8 ETH minimum, rest borrowed/rETH)
│   └── Commission: 14% of rewards to node operator
└── EigenLayer (restaking)
    ├── Native restaking: restake validator ETH via EigenPod
    ├── LSD restaking: restake stETH/rETH into EigenLayer
    ├── AVS (Actively Validated Services): any service needing economic security
    └── Slashing risk: AVS misbehavior can slash restaked ETH
```

### Liquidation Price Calculation
```solidity
function getLiquidationPrice(
    Position memory pos,
    address oracle
) external view returns (uint256) {
    // For a short position: liquidation when collateral falls below threshold
    // liquidation_price = entry_price * (1 + (1 - initial_margin) / position_size)
    uint256 maintenanceMargin = pos.size * pos.maintenanceRequirement / 1e18;
    uint256 currentMargin = pos.collateral + (pos.size * (pos.entryPrice - currentPrice) / currentPrice);
    if (currentMargin <= maintenanceMargin) {
        // Liquidatable: return price where margin = maintenance
        return pos.entryPrice * (pos.collateral - maintenanceMargin) / pos.size + pos.entryPrice;
    }
    return type(uint256).max; // Not liquidatable
}
```

## Security Patterns

### DeFi-Specific Vulnerabilities
| Attack | Description | Mitigation |
|--------|-------------|------------|
| Flash loan attack | Borrow huge capital, manipulate price, profit, repay | TWAP pricing, min/max output, circuit breakers |
| Oracle manipulation | Move price to trigger liquidations or profit from trades | Redundant oracles, TWAP, stale-price checks |
| Sandwich attack | Frontrun trade, let trade execute, backrun | Slippage protection, commit-reveal |
| Donation attack | Manipulate rebasing token to steal yields | Track internal balances separately |
| Infinite approval | DApp drains approved tokens | Approve exact amounts, use permit |
| Reentrancy in callbacks | Callback reenters during token transfer | Reentrancy guard, CEI pattern |
| ERC-4626 inflation attack | Manipulate share price on initial deposit | Virtual shares + assets |
| Griefing (dust) | Create many small positions to block liquidations | Minimum position size |

### Economic Security Parameters
```solidity
// Typical DeFi safety parameters
struct ProtocolParams {
    uint256 liquidationThreshold;  // 80-90% for ETH, 75-85% for volatile
    uint256 liquidationBonus;      // 5-15% liquidation incentive
    uint256 reserveFactor;         // 10-20% of interest to protocol
    uint256 maxLTV;                // 70-80% for ETH, 50-65% for volatile
    uint256 supplyCap;             // Max total supply per asset
    uint256 borrowCap;             // Max total borrow per asset
}
```

### Oracle Design Patterns
```
Price feed types:
├── Chainlink (pull-based)
│   ├── Update frequency: ~20 min (heartbeat + deviation threshold)
│   ├── Security: Decentralized oracle network, staking
│   └── Cost: Free to read on-chain (gas for oracle node updates)
├── Pyth (push-based)
│   ├── Update frequency: ~400ms (per-slot updates)
│   ├── Security: Publisher network, confidence intervals
│   └── Cost: Fee per price update (paid by protocol)
├── Chronicle (push-based, MakerDAO)
│   ├── Update frequency: ~1 min
│   ├── Security: Oracle security module (OSM) for 1-hour delay
│   └── Cost: Free (Maker subsidized)
└── TWAP (Uniswap v3)
    ├── Update frequency: On-demand
    ├── Security: Manipulation-resistant (time-weighted)
    └── Cost: Free (on-chain computation)
```

## MEV in DeFi

### MEV Extraction Patterns
| Pattern | Mechanism | Profitability |
|---------|-----------|---------------|
| DEX arbitrage | Buy low on A, sell high on B | Medium (competitive) |
| Sandwich | Frontrun + backrun user trade | High (directly extracts from user) |
| Liquidation | Liquidate undercollateralized positions | Low per-event, consistent |
| JIT liquidity | Insert LP position, swap, remove | Variable |
| Backrunning | Profit from pending tx execution | Medium |

### MEV-Protected Trading
```typescript
// MEV-protected swap via CowSwap (Coincidence of Wants)
// 1. User signs intent: "swap X ETH for >= Y USDC"
// 2. Solvers compete to find best execution
// 3. Coincidence of Wants: match buyer with seller directly
// 4. Batch auction: all intents settled simultaneously
// 5. No MEV: batch settlement prevents sandwiching

interface CowOrder {
    sellToken: string
    buyToken: string
    sellAmount: string
    buyAmountAfterFee: string  // Min received
    validTo: number
    appData: string
    kind: 'sell' | 'buy'
    partiallyFillable: boolean
    signature: string
}
```

## Rules
1. Always consider economic security and incentive alignment — game theory is as important as code
2. Use TWAP over spot price for on-chain pricing to resist flash loan manipulation
3. Understand and quantify impermanent loss before committing to AMM liquidity strategies
4. Design for composability — interfaces should follow standards (ERC-4626, ERC-3156 flash loans)
5. Consider MEV resistance — implement private mempools, commit-reveal, or delay-based protections
6. Follow oracle best practices — redundant, manipulation-resistant feeds with stale-price checks
7. Implement circuit breakers and rate limits — pause, deposit/withdraw caps, borrow limits
8. Model liquidation economics carefully — ensure liquidators are always incentivized
9. Test with mainnet fork against real state — DeFi composability creates hidden dependencies
10. Plan for depeg scenarios — LSD and stablecoin depegs can trigger cascading liquidations
11. ERC-4626 vaults must implement virtual shares + virtual assets to prevent inflation attacks
12. Lending pools should use isolated mode for risky assets (separate risk parameters per asset)
13. Flash loan integration must verify callback origin (prevent reentrancy from fake tokens)
14. Perpetual funding rates should be clamped to prevent excessive long/short imbalance

## References
  - references/amm-mechanics.md — AMM Mechanics
  - references/blockchain-defi-advanced.md — Blockchain Defi Advanced Topics
  - references/blockchain-defi-fundamentals.md — Blockchain Defi Fundamentals
  - references/defi-risk-management.md — DeFi Risk Management
  - references/derivatives-perps.md — Derivatives & Perpetual Futures
  - references/lending-borrowing.md — Lending & Borrowing Protocols
  - references/lsd-lrt-restaking.md — Liquid Staking & Restaking
  - references/yield-strategies.md — Yield Strategies
  - references/defi-oracle-design.md — DeFi Oracle Design
  - references/defi-flash-loans.md — Flash Loan Attack Patterns
  - references/mev-in-defi.md — MEV in DeFi Protocols

## Architecture Decision Trees

```
DeFi Protocol Design
├── Protocol type?
│   ├── DEX → AMM (Uniswap v2/v3, Curve) / Orderbook (dYdX, Serum)
│   ├── Lending → Pool-based (Aave, Compound) / Isolated (Morpho)
│   ├── Yield → Vault strategy (Yearn) / Auto-compounder
│   └── Derivatives → Perpetuals (GMX, Synthetix) / Options (Opyn)
├── AMM curve?
│   ├── Constant product → x*y=k (Uniswap v2) — simple, capital inefficient
│   ├── Concentrated liquidity → Uniswap v3 — capital efficient, complex
│   └── Stable swap → Curve — low slippage for stable pairs
├── Oracle dependency?
│   ├── Critical → Chainlink TWAP + Uniswap TWAP fallback
│   ├── Moderate → Chainlink with circuit breaker
│   └── None → Internal oracle (on-chain TWAP)
└── Liquidity incentive model?
    ├── Liquidity mining → Token rewards per LP share
    ├── Fee sharing → Protocol revenue distributed to LPs
    └── veToken → Vote-escrowed token for fee direction
```

**Decision criteria**: Evaluate capital efficiency needs, gas costs, oracle risk, and liquidity bootstrapping strategy.

## Implementation Patterns

### Uniswap V2 Style AMM
```solidity
// blockchain-defi/contracts/AMM.sol
pragma solidity ^0.8.20;

contract SimpleAMM {
    uint256 public reserve0;
    uint256 public reserve1;

    function swap(uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out) external {
        require(amount0Out > 0 || amount1Out > 0, "No output");
        require(amount0Out < reserve0 && amount1Out < reserve1, "Insufficient liquidity");
        uint256 balance0 = reserve0 + amount0In - amount0Out;
        uint256 balance1 = reserve1 + amount1In - amount1Out;
        require(balance0 * balance1 >= reserve0 * reserve1, "K invariant");
        reserve0 = balance0;
        reserve1 = balance1;
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256) {
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        return numerator / denominator;
    }
}
```

### Lending Pool
```solidity
// blockchain-defi/contracts/LendingPool.sol
contract LendingPool {
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public borrows;
    uint256 public totalLiquidity;
    uint256 public utilizationRate;

    function deposit() external payable {
        deposits[msg.sender] += msg.value;
        totalLiquidity += msg.value;
        utilizationRate = totalBorrows * 1e18 / totalLiquidity;
    }

    function borrow(uint256 amount) external {
        require(amount <= getMaxBorrow(msg.sender), "Exceeds borrow limit");
        borrows[msg.sender] += amount;
        totalBorrows += amount;
        payable(msg.sender).transfer(amount);
    }
}
```

## Production Considerations

- **Liquidation monitoring**: Monitor positions with health factor < 1.2; trigger liquidation at 1.0.
- **Oracle freshness**: Alert on oracle price staleness (> 2 hours); pause borrowing if stale.
- **Slippage protection**: Set max slippage per transaction (0.5% default for major pairs).
- **MEV protection**: Implement commit-reveal or batch auctions for large liquidations.
- **Emergency withdrawal**: Pause deposits/borrows during incidents; allow withdrawals only.

## Anti-Patterns

| Anti-Pattern | Consequence | Solution |
|---|---|---|
| Single oracle source | Manipulation via flash loans | Use TWAP + multiple oracle sources |
| No min borrow amount | Dust positions, gas waste | Set minimum borrow (e.g., 0.1 ETH) |
| Incorrect fee calculation | Value leakage or overcharging | Use 0.30% standard; verify with reference |
| No health check in withdraw | Protocol insolvency | Revert if withdraw causes insolvency |
| Centralized pause authority | Censorship risk | Multisig + timelock for pausing |

## Performance Optimization

- **Batch liquidations**: Process liquidations in batches to amortize gas costs across multiple positions.
- **Storage optimization**: Pack borrowing variables tightly; use uint112 for balances.
- **Flash loans integration**: Integrate flash loans for arbitrage to increase trading volume.
- **Concentrated liquidity**: Use Uniswap v3 style for capital efficiency in specific price ranges.
- **Gas token usage**: Refund unused gas with EIP-3298 (removed in London); optimize with EIP-1559.

## Security Considerations

- **Reentrancy**: Apply `ReentrancyGuard` on all withdraw/borrow/repay functions.
- **Oracle manipulation**: Use TWAP (30 min) for critical price feeds; circuit breaker on > 5% deviation.
- **Flash loan attacks**: Check price deviation against multiple sources; use time-weighted prices.
- **Economic security**: Formal verification of liquidation math; fuzz testing for edge cases.
- **Composability risk**: Audit integration points with external protocols; whitelist allowed adapters.

## Phase
blockchain → blockchain-defi
