# Derivatives & Perpetual Futures

## Perpetual Futures Mechanism

### Funding Rate

The core mechanism keeping perpetual futures prices anchored to the spot price. When `mark > index` (perpetual trades at premium), long positions pay short positions.

```solidity
// Simplified funding rate calculation
function computeFundingRate(
    uint256 markPrice,
    uint256 indexPrice,
    uint256 clampLower,   // -0.1% as 0.999e18
    uint256 clampUpper    // 0.1% as 1.001e18
) public pure returns (int256) {
    // Premium = (mark - index) / index
    int256 premium = (int256(markPrice) - int256(indexPrice)) * 1e18 / int256(indexPrice);

    // Clamp funding rate to prevent extreme funding
    if (premium > int256(clampUpper)) premium = int256(clampUpper);
    if (premium < -int256(clampLower)) premium = -int256(clampLower);

    return premium; // Positive → longs pay shorts
}
```

### Mark Price vs Index Price vs Basis

```
Index Price  = External oracle reference (Chainlink/Pyth) — "true" market price
Mark Price   = (Index + FundingBasis) — used for PnL and liquidations
Basis        = Mark - Index — reflects market sentiment

FundingRate  = clamp((MarkPrice - IndexPrice) / IndexPrice)
FundingPayment = PositionSize * FundingRate * TimeSinceLastFunding
```

## GMX / GLP Model (Multi-Asset Pool)

GMX uses a GLP pool — a basket of assets (ETH, BTC, stablecoins, AVAX) that serves as the counterparty to all trades. LPs earn fees and bear the risk of trader PnL.

```solidity
// GMX-style position management
contract GMXPerpetual {
    mapping(address => Position) public positions;
    uint256 public glpPrice;

    struct Position {
        address collateralToken;
        uint256 size;              // Notional size
        uint256 collateral;        // Collateral deposited
        bool isLong;
        uint256 entryPrice;
        uint256 lastIncreasedTime;
    }

    function increasePosition(
        address account,
        address collateralToken,
        uint256 sizeDelta,
        uint256 collateralDelta,
        bool isLong,
        uint256 price
    ) external {
        Position storage pos = positions[account];
        pos.size += sizeDelta;
        pos.collateral += collateralDelta;
        pos.isLong = isLong;
        pos.entryPrice = pos.size == sizeDelta
            ? price
            : (pos.size * pos.entryPrice + sizeDelta * price) / (pos.size + sizeDelta);
        pos.lastIncreasedTime = block.timestamp;
    }

    function getLiquidationPrice(address account) public view returns (uint256) {
        Position storage pos = positions[account];
        uint256 maintenanceMargin = (pos.size * 10) / 100; // 10% maintenance

        if (pos.isLong) {
            // Liquidation when: collat + (entry - current) * size / entry < maintenance
            // liqPrice = entryPrice * (1 - (collateral - maintenance) / size)
            return pos.entryPrice * (pos.size - (pos.collateral - maintenanceMargin)) / pos.size;
        } else {
            return pos.entryPrice * (pos.size + (pos.collateral - maintenanceMargin)) / pos.size;
        }
    }
}
```

## dYdX Orderbook Model

dYdX uses a hybrid on-chain settlement with off-chain order book. Matching occurs off-chain; settlement and clearing happen on-chain.

```solidity
// Simplified dYdX-style settlement
struct SignedOrder {
    address maker;
    address taker;
    uint256 makerAmount;
    uint256 takerAmount;
    uint256 expiration;
    bytes signature;
}

function fillOrder(SignedOrder memory order) external returns (bool) {
    require(block.timestamp < order.expiration, "Order expired");
    require(recoveredSigner(order) == order.maker, "Invalid signature");

    // Transfer assets between maker and taker
    IERC20(baseToken).safeTransferFrom(order.maker, order.taker, order.makerAmount);
    IERC20(quoteToken).safeTransferFrom(order.taker, order.maker, order.takerAmount);

    return true;
}
```

## Synthetix Debt Pool Model

Synthetix uses a debt pool where stakers (SNX holders) collectively back all synthetic assets (synths). When a synth is minted via staking, the debt pool expands proportionally.

```solidity
// Synthetix-style debt calculation
contract DebtPool {
    uint256 public totalIssuedSynths;
    mapping(address => uint256) public stakerDebtShare; // in basis points

    function mintSynths(address staker, uint256 amount) external {
        uint256 currentDebt = getCurrentDebt(staker);
        uint256 newDebt = currentDebt + amount;

        uint256 newShare = (newDebt * 1e18) / getTotalPoolDebt();
        stakerDebtShare[staker] = newShare;

        totalIssuedSynths += amount;
        _mintSynth(staker, amount);
    }

    function getCurrentDebt(address staker) public view returns (uint256) {
        // Debt fluctuates with synth prices — stakers share the pool risk
        return (getTotalPoolDebt() * stakerDebtShare[staker]) / 1e18;
    }
}
```

## Options Protocols

### Opyn — American Options

```solidity
// Opyn-style option token (oTokens)
contract Otoken {
    address public underlying;
    address public strikeAsset;
    uint256 public strikePrice;
    uint256 public expiry;
    bool public isCall;

    function exercise(address exerciser, uint256 amount) external {
        require(block.timestamp <= expiry, "Expired");
        uint256 payout = isCall
            ? (amount * (max(underlyingPrice - strikePrice, 0))) / strikePrice
            :  (amount * (max(strikePrice - underlyingPrice, 0))) / strikePrice;

        _transferCollateral(exerciser, payout);
        _burn(exerciser, amount);
    }
}
```

### Lyra — AMM for Options

Lyra uses an AMM to price options using Black-Scholes with dynamic volatility:

```solidity
function optionPrice(
    uint256 spot,
    uint256 strike,
    uint256 expiry,
    uint256 iv,
    bool isCall
) public pure returns (uint256) {
    // Black-Scholes approximation
    int256 d1 = (int256(log(spot / strike)) + (iv * iv / 2) * expiry) / (iv * sqrt(expiry));
    int256 d2 = d1 - iv * int256(sqrt(expiry));

    if (isCall) {
        return spot * cdf(d1) - strike * exp(-expiry) * cdf(d2);
    } else {
        return strike * exp(-expiry) * cdf(-d2) - spot * cdf(-d1);
    }
}
```

### Aevo — Options with Off-Chain Matching

Aevo combines off-chain matching with on-chain settlement, similar to dYdX but for options. Orders are signed and settled in batches.

## Cross-References

- **Leverage via lending protocols for derivatives** → `blockchain-defi/references/lending-borrowing.md`
- **Liquid staking tokens as collateral in perps** → `blockchain-defi/references/lsd-lrt-restaking.md`
- **Yield strategies with basis trading** → `blockchain-defi/references/yield-strategies.md`
