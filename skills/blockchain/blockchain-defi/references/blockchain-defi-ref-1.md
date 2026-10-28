# DeFi Price Oracles: Design, Integration and Manipulation Defense

Lending markets, perpetuals, stablecoins and vaults depend on prices they cannot observe directly. Oracle failures (manipulated spot prices, stale feeds, wrong decimals) are among the most common causes of DeFi losses. This reference covers oracle types, safe Chainlink and TWAP integration, manipulation economics and defensive patterns.

## Oracle Types

| Type | Source | Strengths | Weaknesses |
|------|--------|-----------|------------|
| AMM spot price (reserves ratio, `slot0`) | On-chain pool state | Always available | Trivially manipulable within one transaction (flash loans) |
| AMM TWAP (Uniswap v2 cumulative price, v3 `observe`) | Time-weighted on-chain prices | No external trust, manipulation costs scale with window | Lags real price; manipulable on low-liquidity pools; multi-block manipulation possible for validators/builders |
| Push oracle networks (Chainlink Data Feeds) | Aggregated off-chain data pushed on deviation/heartbeat | Robust aggregation, wide coverage | Trust in node operators; updates only on deviation threshold or heartbeat |
| Pull oracles (Pyth, Chainlink Data Streams, RedStone) | Signed price updates submitted by users with the transaction | Low latency, high frequency | Caller chooses which update to submit within validity window; must check freshness and confidence |
| Exchange rate oracles (LST/LRT, ERC-4626) | Contract's own accounting (`convertToAssets`) | Exact for redemption value | Not market price; donation/inflation attacks on vault share price |
| Optimistic oracles (UMA) | Proposed values with dispute window | Arbitrary data | Delayed finality; not for fast prices |

Never use a single-block spot price from an AMM for anything that moves value.

## Chainlink Data Feed Integration

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract PriceReader {
    AggregatorV3Interface public immutable feed;
    AggregatorV3Interface public immutable sequencerUptimeFeed;   // L2s only; address(0) on L1
    uint256 public immutable maxStaleness;                        // e.g. heartbeat + margin
    uint256 public constant GRACE_PERIOD = 1 hours;

    error StalePrice(uint256 updatedAt);
    error InvalidPrice(int256 answer);
    error SequencerDown();
    error GracePeriodNotOver();

    constructor(address _feed, address _seqFeed, uint256 _maxStaleness) {
        feed = AggregatorV3Interface(_feed);
        sequencerUptimeFeed = AggregatorV3Interface(_seqFeed);
        maxStaleness = _maxStaleness;
    }

    /// @return price scaled to 1e18
    function price() public view returns (uint256) {
        if (address(sequencerUptimeFeed) != address(0)) {
            (, int256 status, uint256 startedAt,,) = sequencerUptimeFeed.latestRoundData();
            if (status != 0) revert SequencerDown();                         // 1 = down
            if (block.timestamp - startedAt <= GRACE_PERIOD) revert GracePeriodNotOver();
        }

        (, int256 answer,, uint256 updatedAt,) = feed.latestRoundData();
        if (answer <= 0) revert InvalidPrice(answer);
        if (block.timestamp - updatedAt > maxStaleness) revert StalePrice(updatedAt);

        uint8 dec = feed.decimals();
        return dec <= 18 ? uint256(answer) * 10 ** (18 - dec) : uint256(answer) / 10 ** (dec - 18);
    }
}
```

Checklist for each feed:
- **Staleness**: compare `updatedAt` with the feed's heartbeat (differs per feed and chain, for example 1 hour or 24 hours); set `maxStaleness` per feed, not one global value.
- **Decimals**: read `decimals()`; USD feeds commonly use 8, ETH-denominated feeds 18. Normalize explicitly.
- **L2 sequencer**: on rollups, check the sequencer uptime feed and apply a grace period after restart so users can react before liquidations.
- **Min/max bounds**: some aggregators historically had `minAnswer`/`maxAnswer` circuit-breaker bounds; if the market price moves outside them the feed reports the bound. Check whether your feed has such bounds and add your own sanity range.
- **Deprecated round fields**: `answeredInRound` checks are no longer recommended by Chainlink; rely on `updatedAt`.
- **Feed address**: take addresses from official documentation, store immutably or behind governance with timelock.

## Pull Oracle Integration (Pyth example)

```solidity
// User supplies fresh signed price updates with the call
function deposit(bytes[] calldata priceUpdate) external payable {
    uint256 fee = pyth.getUpdateFee(priceUpdate);
    pyth.updatePriceFeeds{value: fee}(priceUpdate);
    PythStructs.Price memory p = pyth.getPriceNoOlderThan(ETH_USD_ID, 60);   // reverts if older than 60 s
    // check p.conf relative to p.price; reject if confidence interval too wide
}
```

- Prices come with exponent (`p.expo`, negative) and confidence interval (`p.conf`); handle both.
- The caller can choose any valid update within the age window; design so choosing an older valid price does not create profit (for example, require recent timestamps for liquidations and use conservative bounds).

## TWAP Oracles

Uniswap v3 pools store cumulative tick observations:

```text
arithmeticMeanTick = (tickCumulative[now] - tickCumulative[now - window]) / window
price = 1.0001 ^ arithmeticMeanTick        (token1 per token0, adjusted for decimals)
```

Use the `OracleLibrary.consult(pool, secondsAgo)` helper from Uniswap's periphery and make sure the pool's observation cardinality is large enough (`increaseObservationCardinalityNext`) for the window.

Manipulation considerations:
- Cost to move a TWAP grows with liquidity depth and window length, but a manipulator who controls consecutive blocks (validator or builder) can hold a manipulated price with less arbitrage interference.
- Short windows (a few minutes) on shallow pools are cheap to manipulate; prefer deep pools and longer windows, accepting the lag.
- The geometric mean (tick average) used by v3 makes a single extreme block less influential than an arithmetic mean of prices.

## Manipulation Economics

A manipulation is profitable when:

```text
profit_from_protocol (over-borrowing, unfair liquidation, mispriced mint)
  > cost_to_move_price (slippage + fees + arbitrage losses over the window) + capital cost (flash loan fee)
```

Defenses aim to raise cost or cap profit:

| Defense | Effect |
|---------|--------|
| Use aggregated off-chain feeds for collateral pricing | Removes single-pool manipulation |
| Combine sources (median of Chainlink, TWAP, Pyth) with deviation checks | Single-source failure detected |
| Circuit breaker: pause or freeze market if sources diverge beyond a threshold | Limits damage window |
| Supply/borrow caps per asset scaled to on-chain liquidity | Caps profit from manipulation |
| Conservative LTV and liquidation thresholds for illiquid collateral | Larger price move needed |
| Delay-sensitive actions (borrow after deposit in a later block) | Breaks single-transaction attacks |
| Avoid using pool share or vault share price as collateral without manipulation-resistant valuation | Prevents donation/inflation attacks |

## LP Tokens and Vault Shares as Collateral

- Pricing an AMM LP token as `reserves * spot prices / totalSupply` is manipulable. Use "fair reserves" pricing: compute reserves implied by the invariant and oracle prices (for constant product: `2 * sqrt(k * p0 * p1) / totalSupply`).
- ERC-4626 share prices can be inflated by direct donations to the vault. Use virtual shares/assets offsets (OpenZeppelin implementation), caps, and rate-of-change limits on exchange rates used as prices.
- Liquid staking tokens: distinguish exchange rate (redemption value) from market price; a depeg means market price is below exchange rate, and using the exchange rate can leave bad debt.

## Operational Monitoring

- Alert on feed staleness approaching heartbeat, large deviations between sources, sequencer downtime, and sudden price moves on collateral assets.
- Keep a governance procedure (with timelock and a guardian for emergency pause) to change oracle configuration.
- Test with forked mainnet state and simulated price shocks, stale feeds and divergent sources.

## Checklist

- [ ] No AMM spot prices for value-moving logic
- [ ] Per-feed staleness, decimals and sanity bounds checked
- [ ] L2 sequencer uptime and grace period handled
- [ ] Pull-oracle prices checked for age and confidence
- [ ] TWAP windows and pool depth sized against manipulation cost
- [ ] Multiple sources with deviation circuit breakers for critical assets
- [ ] Caps and conservative parameters for illiquid collateral
- [ ] Monitoring and emergency procedures for oracle incidents
