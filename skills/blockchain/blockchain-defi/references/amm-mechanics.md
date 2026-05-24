# AMM Mechanics

## Constant Product Formula (x \* y = k)

The foundational AMM model introduced by Uniswap V2. For a pool with reserves `x` and `y`, the invariant `x * y = k` must hold after every trade.

### Swap Calculation

Given input amount `dx` of token X, output `dy` of token Y:

```
(x + dx) * (y - dy) = k
dy = y - (k / (x + dx))
```

```solidity
// Uniswap V2-style swap with fee
function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256) {
    require(amountIn > 0, "Insufficient input");
    uint256 amountInWithFee = amountIn * 997;       // 0.3% fee
    uint256 numerator = amountInWithFee * reserveOut;
    uint256 denominator = reserveIn * 1000 + amountInWithFee;
    return numerator / denominator;
}
```

### Price Impact

As trade size increases relative to pool depth, the effective price diverges from the spot price:

```solidity
function getPriceImpact(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256) {
    uint256 spotPrice = (reserveIn * 1e18) / reserveOut;
    uint256 effectivePrice = (amountIn * 1e18) / getAmountOut(amountIn, reserveIn, reserveOut);
    return ((effectivePrice - spotPrice) * 1e18) / spotPrice;
}
```

## Stable Swap (Curve)

Curve's StableSwap formula blends constant product and constant sum for pegged assets (stablecoins, L1/L2 ETH):

```
An * sum(x_i) + D = A * D * n^n + D^(n+1) / (n^n * prod(x_i))
```

Where `A` is the amplification coefficient controlling the curve's flatness around the peg.

```solidity
// Simplified Curve StableSwap get_dy
function getDy(
    uint256 i, uint256 j,
    uint256[2] memory x,
    uint256 amp,
    uint256[2] memory balances
) public pure returns (uint256) {
    uint256 D = getD(balances, amp);
    uint256[2] memory xp = balances;
    xp[i] = x[i] + x[i];           // virtual price adjustment
    uint256 ann = amp * 2;
    uint256 c = D;
    uint256 S = xp[0] + xp[1];
    uint256 _xD = xp[j] * D / (S - xp[j]);
    // iterate Newton's method for y
    uint256 y_prev;
    uint256 y = D;
    for (uint256 _i; _i < 255; _i++) {
        y_prev = y;
        y = (y * y + c) / (2 * y + _xD - D);
        if (y > y_prev ? y - y_prev : y_prev - y <= 1) break;
    }
    return y <= 1 ? 0 : y - 1;
}
```

## Concentrated Liquidity (Uniswap V3)

Liquidity is allocated within discrete price ranges `[tick_lower, tick_upper]`. LPs earn fees only when the current price is within their range.

### Tick Math

```solidity
// Price <-> tick conversion
function sqrtPriceX96ToTick(uint160 sqrtPriceX96) public pure returns (int24 tick) {
    tick = int24((log2(sqrtPriceX96) * 255) >> 8);
}
```

```solidity
// Amounts for a given liquidity position
function getAmountsForLiquidity(
    uint160 sqrtPriceX96,
    uint160 sqrtPriceAX96,
    uint160 sqrtPriceBX96,
    uint128 liquidity
) public pure returns (uint256 amount0, uint256 amount1) {
    if (sqrtPriceX96 <= sqrtPriceAX96) {
        amount0 = FullMath.mulDiv(liquidity, (sqrtPriceBX96 - sqrtPriceAX96) << 96, sqrtPriceBX96 * sqrtPriceAX96);
    } else if (sqrtPriceX96 < sqrtPriceBX96) {
        amount0 = FullMath.mulDiv(liquidity, (sqrtPriceBX96 - sqrtPriceX96) << 96, sqrtPriceBX96 * sqrtPriceX96);
        amount1 = FullMath.mulDiv(liquidity, (sqrtPriceX96 - sqrtPriceAX96) << 96, FixedPoint96.Q96);
    } else {
        amount1 = FullMath.mulDiv(liquidity, (sqrtPriceBX96 - sqrtPriceAX96), FixedPoint96.Q96);
    }
}
```

### Virtual Liquidity

V3 uses virtual reserves to maintain the invariant even in concentrated ranges:

```
L = sqrt(k) / (sqrt(p_high) - sqrt(p_low)) * sqrt(p_high) * sqrt(p_low)
```

## Weighted Pools (Balancer)

Balancer generalizes to N tokens with arbitrary weights:

```
prod(amount_i^weight_i) = k
```

```solidity
// Balancer V2 spot price between two tokens
function getSpotPrice(
    uint256 balanceA, uint256 weightA,
    uint256 balanceB, uint256 weightB
) public pure returns (uint256) {
    return (balanceA / weightA) * (weightB / balanceB) * 1e18;
}
```

## Dynamic Fees

Protocols adjust fees based on volatility or utilization:

```solidity
// Dynamic fee based on volume and volatility
function computeFee(uint256 volume, uint256 volatility, uint256 baseFee) public pure returns (uint256) {
    // Scale fee from 0.01% (low vol) to 1% (high vol)
    uint256 volComponent = (volatility * 0.99e18) / 1e18; // normalized
    return baseFee + (volComponent * (1e16 - baseFee)) / 1e18;
}
```

## Impermanent Loss Calculation

IL for a standard AMM with price ratio change `r = p_new / p_old`:

```
IL = 2 * sqrt(r) / (1 + r) - 1
```

```solidity
function impermanentLoss(uint256 priceRatioX96) public pure returns (int256) {
    // priceRatioX96 = (p_new * 2^96) / p_old
    uint256 sqrtRatio = sqrt(priceRatioX96);
    // IL = (2 * sqrt(r)) / (1 + r) - 1
    uint256 numerator = 2 * sqrtRatio;
    uint256 denominator = (1 << 96) + priceRatioX96;
    int256 il = int256((numerator * 1e18) / denominator) - 1e18;
    return il; // negative means loss
}
```

## Oracle & Manipulation Resistance

### TWAP (Time-Weighted Average Price)

```solidity
contract V3TWAP {
    IUniswapV3Pool pool;
    uint32 twapPeriod = 30; // 30 seconds

    function consult(address tokenIn, uint256 amountIn) external view returns (uint256) {
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = twapPeriod;
        secondsAgos[1] = 0;

        (int56[] memory tickCumulatives, ) = pool.observe(secondsAgos);
        int56 tickCumulativeDelta = tickCumulatives[1] - tickCumulatives[0];
        int24 avgTick = int24(tickCumulativeDelta / int32(twapPeriod));
        return UniV3Math.getQuoteAtTick(avgTick, uint128(amountIn), tokenIn, pool.token1());
    }
}
```

## Cross-References

- **Lending integrations (using AMM LP tokens as collateral)** → `blockchain-defi/references/lending-borrowing.md`
- **Yield optimization using concentrated liquidity positions** → `blockchain-defi/references/yield-strategies.md`
- **Oracle patterns and manipulation resistance** → `blockchain-patterns/references/oracle-and-bridge-patterns.md`
