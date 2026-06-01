---
name: blockchain-defi
description: >
  Use this skill when asked about decentralized finance, DeFi protocols, AMM mechanics, lending and borrowing protocols, perpetual futures, yield farming, liquidity mining, liquid staking, restaking, yield optimization, DeFi security, MEV, and protocol composability. Covers AMM design (Uniswap, Curve, Balancer), lending protocols (Aave, Compound, Morpho), derivatives (dYdX, GMX, Synthetix), liquid staking (Lido, Rocket Pool, EigenLayer restaking), and yield strategies (Yearn, Convex). Do NOT use for: general smart contract development (use blockchain-application), blockchain core protocol (use blockchain-core), or web3 UI integration (use blockchain-web3).
version: "1.1.0"
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
```

## Security Patterns

### DeFi-Specific Vulnerabilities
| Attack | Description | Mitigation |
|---|---|---|
| Flash loan attack | Borrow huge capital, manipulate price, profit, repay | TWAP pricing, min/max output, circuit breakers |
| Oracle manipulation | Move price to trigger liquidations or profit from trades | Redundant oracles, TWAP, stale-price checks |
| Sandwich attack | Frontrun trade, let trade execute, backrun | Slippage protection, commit-reveal |
| Donation attack | Manipulate rebasing token to steal yields | Track internal balances separately |
| Infinite approval | DApp drains approved tokens | Approve exact amounts, use permit |
| Reentrancy in callbacks | Callback reenters during token transfer | Reentrancy guard, CEI pattern |

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

## Phase
blockchain → blockchain-defi
