# Lending & Borrowing Protocols

## Interest Rate Models

### Jump Rate Model (Compound/Aave V2)

```solidity
// Utilization = TotalBorrows / (TotalBorrows + TotalLiquidity)
function calculateBorrowRate(uint256 utilization, uint256 baseRate, uint256 slope1, uint256 slope2, uint256 kink) public pure returns (uint256) {
    if (utilization <= kink) {
        return baseRate + (utilization * slope1) / 1e18;
    } else {
        uint256 excessUtil = utilization - kink;
        return baseRate + (kink * slope1) / 1e18 + (excessUtil * slope2) / 1e18;
    }
}

function calculateSupplyRate(uint256 borrowRate, uint256 utilization) public pure returns (uint256) {
    return (borrowRate * utilization * (100 - reserveFactor)) / 100e18;
}
```

### Optimal Utilization

The `kink` parameter defines the utilization target (typically 80-90%). Rates increase steeply above kink to encourage borrowing repayments or additional deposits.

```solidity
// Curve parameter examples
struct RateModelParams {
    uint256 baseRatePerYear;   // 2% = 0.02e18
    uint256 slope1;            // 7% = 0.07e18 — gradual slope below kink
    uint256 slope2;            // 200% = 2.0e18 — steep slope above kink
    uint256 kink;              // 80% = 0.8e18
    uint256 reserveFactor;     // 10% of interest → protocol treasury
}
```

## LTV and Health Factors

```solidity
// Health factor = collateral_value * LTV / borrowed_value
// H < 1 → liquidation eligible
function getHealthFactor(
    uint256 collateralValueUSD,
    uint256 borrowValueUSD,
    uint256 ltv
) public pure returns (uint256) {
    return (collateralValueUSD * ltv) / (borrowValueUSD * 1e18);
}
```

### Collateral Factors by Risk Tier

| Asset Type | LTV | Liquidation Threshold | Liquidation Bonus |
|---|---|---|---|
| ETH/WETH | 80% | 83% | 5% |
| USDC/DAI | 85% | 88% | 5% |
| WBTC | 73% | 78% | 6% |
| stETH | 72% | 77% | 7% |
| AMM LP (volatile) | 50-60% | 55-65% | 10-15% |
| Alt L1 tokens | 50-65% | 55-70% | 8-12% |

## Liquidation Mechanics

### Price Oracle Liquidation

```solidity
// Simplified liquidation logic (Aave-style)
function liquidate(
    address user,
    address collateralAsset,
    address debtAsset,
    uint256 debtToCover
) external returns (uint256 collateralSeized) {
    DataTypes.ReserveData storage debtReserve = reserves[debtAsset];
    DataTypes.ReserveData storage collateralReserve = reserves[collateralAsset];

    // Validate health factor < 1
    uint256 healthFactor = getHealthFactor(user);
    require(healthFactor < 1e18, "HF >= 1");

    // Get current prices from oracle
    uint256 debtPrice = priceOracle.getAssetPrice(debtAsset);
    uint256 collateralPrice = priceOracle.getAssetPrice(collateralAsset);

    // Calculate debt value and required collateral (including bonus)
    uint256 debtValueUSD = (debtToCover * debtPrice) / 1e8;
    uint256 requiredCollateralValue = (debtValueUSD * 1e18) / collateralPrice;

    // Apply liquidation bonus — seize more collateral than debt
    uint256 liquidationBonus = liquidationBonusPercent[collateralAsset];
    collateralSeized = (requiredCollateralValue * (1e18 + liquidationBonus)) / 1e18;

    // Transfer collateral from user to liquidator
    collateralReserve.transferToLiquidator(user, msg.sender, collateralSeized);

    // Repay debt
    debtReserve.repay(user, debtToCover);

    emit Liquidation(user, msg.sender, collateralAsset, debtAsset, collateralSeized, debtToCover);
}
```

### Close Factor

Limits how much debt a liquidator can repay per liquidation:

```solidity
uint256 public constant DEFAULT_CLOSE_FACTOR = 50; // 50% max per liquidation

function getCloseFactor(address user) public view returns (uint256) {
    uint256 totalDebtUSD = getUserDebtUSD(user);
    uint256 maxClose = (totalDebtUSD * DEFAULT_CLOSE_FACTOR) / 100;
    return maxClose;
}
```

## Shared vs. Isolated Pools

### Aave — Shared Pool

All assets share the same pool contract. Deposits from all users form a single liquidity pool. Borrowers can use multiple assets as collateral.

```
Pros: Capital efficient, composable, gas-efficient
Cons: Risk of one asset contaminating the entire pool (bad debt)
```

### Morpho — Isolated Pools / Peer-to-Peer

Morpho uses an order-book matching engine on top of the lending pool, matching lenders and borrowers P2P while falling back to the underlying pool rate.

```solidity
// Morpho-style matching
function supply(address asset, uint256 amount) external {
    // 1. Try to match with a borrower at P2P rate
    bool matched = matchingEngine.matched(asset, msg.sender, amount);
    if (!matched) {
        // 2. Fall back to Compound/Aave pool at pool rate
        pool.supply(asset, amount);
    }
}
```

### Compound — Market-Specific

Each market (cToken) is a separate contract. Cross-collateralization is handled by the comptroller.

## Flash Loans

```solidity
// ERC-3156 flash loan interface
interface IERC3156FlashLender {
    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external returns (bool);

    function maxFlashLoan(address token) external view returns (uint256);
    function flashFee(address token, uint256 amount) external view returns (uint256);
}

interface IERC3156FlashBorrower {
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32);
}
```

### Flash Loan Attack Prevention via TWAP

```solidity
// Never use spot price in flash loan sensitive operations
function getCollateralValue(address token, uint256 amount) public view returns (uint256) {
    uint256 twapPrice = twapOracle.consult(token, 1e18); // 30-min TWAP
    return (amount * twapPrice) / 1e18;
}
```

## Cross-References

- **AMM LP tokens as lending collateral** → `blockchain-defi/references/amm-mechanics.md`
- **Liquid staking derivatives used in lending** → `blockchain-defi/references/lsd-lrt-restaking.md`
- **Yield strategies involving lending positions** → `blockchain-defi/references/yield-strategies.md`
