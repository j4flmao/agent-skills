# Oracle & Bridge Patterns

## Oracle Patterns

### Pull Oracle (Chainlink)

```solidity
contract PriceConsumer {
    AggregatorV3Interface internal priceFeed;

    constructor() {
        priceFeed = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
    }

    function getLatestPrice() public view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return price;
    }
}
```

### Push Oracle (Pyth Network)

```solidity
contract PythConsumer {
    IPyth pyth = IPyth(0x...);

    function updateAndConsume(bytes[] calldata priceUpdates) external payable {
        uint fee = pyth.getUpdateFee(priceUpdates);
        pyth.updatePriceFeeds{value: fee}(priceUpdates);
        PythPrice memory price = pyth.getPrice(priceFeedId);
        require(price.price > 0 && price.conf < maxConf, "stale price");
    }
}
```

### Oracle Security

```
Single oracle ──> centralization risk (admin key controls price)
Multi-oracle  ──> median of N sources (Chainlink)
TWAP oracle   ──> time-weighted average price (Uniswap V2/V3)
ZK oracle     ──> zero-knowledge proofs of off-chain data
```

```solidity
contract TWAP {
    function consult(address token, uint256 amountIn) external view returns (uint256) {
        uint32[] memory secondsAgos = [60, 0];
        int56[] memory tickCumulatives = pool.observe(secondsAgos);
        int56 tickDelta = tickCumulatives[1] - tickCumulatives[0];
        int24 avgTick = int24(tickDelta / 60);
        return UniV3Math.getQuoteAtTick(avgTick, amountIn, token, otherToken);
    }
}
```

## Cross-References

- **Bridge patterns** (lock-mint, burn-mint, atomic swap HTLC, optimistic bridges, ZK bridges) → `blockchain-ethereum/references/layer2-scaling.md`
- **L2 scaling patterns** (optimistic rollup, ZK rollup, state channels) → `blockchain-ethereum/references/layer2-scaling.md`
- **DeFi oracle integration** (flash loan resistant AMM pricing) → `blockchain-defi/references/amm-mechanics.md`
- **MEV and order-flow** → `blockchain-patterns/references/mev-and-order-flow.md`
