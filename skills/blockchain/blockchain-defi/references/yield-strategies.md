# Yield Strategies

## Yearn Vault Design

Yearn vaults automate yield optimization strategies. The core architecture revolves around a Vault, a Strategy contract, and Keepers.

### Vault Structure (ERC-4626 Compatible)

```solidity
contract YearnVault is ERC4626 {
    address public strategy;        // Active strategy contract
    address public keeper;          // Automation keeper
    uint256 public lastReport;      // Last harvest timestamp
    uint256 public managementFee;   // 2% annually
    uint256 public performanceFee;  // 20% of profits

    function harvest() external {
        require(msg.sender == keeper || msg.sender == strategist, "!keeper");

        // 1. Call strategy to realize gains
        uint256 profitBefore = totalAssets();
        strategy.harvest();
        uint256 profitAfter = totalAssets();
        uint256 profit = profitAfter - profitBefore;

        // 2. Take performance fee
        uint256 fee = (profit * performanceFee) / 1e18;
        _mint(treasury, convertToShares(fee));

        // 3. Charge management fee
        uint256 timeSinceReport = block.timestamp - lastReport;
        uint256 mgmtFee = (totalAssets() * managementFee * timeSinceReport) / (365 days * 1e18);
        _mint(treasury, convertToShares(mgmtFee));

        lastReport = block.timestamp;
        emit Harvested(profit, fee);
    }
}
```

### Strategy Contract

```solidity
contract YieldStrategy {
    IYearnVault public vault;
    IERC20 public want;                 // Deposit token (e.g., USDC)
    IERC20 public rewardToken;          // e.g., CRV rewards
    address public strategist;
    address public keeper;

    function harvest() external {
        // 1. Claim accumulated rewards
        claimRewards();

        // 2. Sell rewards for want token
        uint256 rewardBalance = rewardToken.balanceOf(address(this));
        swapRewardsForWant(rewardBalance);

        // 3. Re-invest want back into strategy
        uint256 wantBalance = want.balanceOf(address(this));
        if (wantBalance > 0) {
            deploy(wantBalance);
        }
    }

    function deploy(uint256 amount) internal virtual {
        // Override in derived strategies
        // e.g., deposit into Aave, Curve, or Convex
        ICurvePool(pool).add_liquidity([amount, 0], 0);
    }

    function withdraw(uint256 amount) external {
        require(msg.sender == address(vault));
        _withdrawFromProtocol(amount);
        want.transfer(address(vault), amount);
    }

    function _withdrawFromProtocol(uint256 amount) internal virtual {
        // Withdraw from underlying protocol
    }
}
```

## Curve Wars

CRV (Curve DAO Token) and its voting escrow system (veCRV) create a competitive ecosystem for yield.

### veCRV Voting Power

```solidity
// Simplified veCRV lock
contract VotingEscrow {
    mapping(address => LockedBalance) public locked;
    uint256 public totalSupply;

    struct LockedBalance {
        uint256 amount;
        uint256 end;
    }

    function createLock(uint256 amount, uint256 unlockTime) external {
        require(unlockTime <= block.timestamp + 4 * 365 days, "Max 4 year lock");
        _transferFrom(msg.sender, amount);
        locked[msg.sender] = LockedBalance(amount, unlockTime);
    }

    function getVotes(address account) public view returns (uint256) {
        LockedBalance memory l = locked[account];
        if (l.end <= block.timestamp) return 0;
        // Linearly decaying voting power
        return (l.amount * (l.end - block.timestamp)) / (l.end - block.timestamp);
    }
}
```

### Bribes and Gauge Weight Voting

```solidity
// Bribe market (e.g. Hidden Hand, Votemarket)
contract BribeMarket {
    mapping(address => mapping(address => uint256)) public bribes;
    // token -> gauge -> amount

    function depositBribe(address gauge, address rewardToken, uint256 amount) external {
        IERC20(rewardToken).transferFrom(msg.sender, address(this), amount);
        bribes[rewardToken][gauge] += amount;
        emit BribeDeposited(gauge, rewardToken, amount);
    }

    function claimBribe(address gauge, address rewardToken, address voter) external {
        uint256 amount = computeBribeShare(gauge, rewardToken, voter);
        IERC20(rewardToken).transfer(voter, amount);
    }
}
```

## Convex / CVX for Boosted Yields

Convex Finance lets CRV stakers and LPs earn boosted Curve rewards without locking CRV directly:

```
LP → Convex (deposit LP tokens) → Convex stakes in Curve gauge
                                   ├── CRV rewards (boosted 2.5x)
                                   ├── CVX rewards
                                   └── Trading fees

CRV Holder → Convex (stake CRV) → vlCVX (vote locking)
                                   ├── Earns a share of protocol fees
                                   └── Voting rights on Curve gauges
```

## Auto-Compounders (Beefy)

Beefy Finance auto-compounds yield across multiple chains. The core pattern:

```solidity
contract AutoCompoundStrategy {
    IERC20 public want;     // e.g., LP token
    address public vault;

    function compound() external {
        // 1. Collect pending rewards
        claimRewards(vault);

        // 2. Swap rewards → more want token
        uint256 rewardBalance = rewardToken.balanceOf(address(this));
        swap(rewardToken, want, rewardBalance);

        // 3. Re-deposit want into vault
        uint256 wantBalance = want.balanceOf(address(this));
        want.approve(vault, wantBalance);
        depositIntoVault(vault, wantBalance);

        emit Compounded(wantBalance);
    }
}
```

## Concentrated Liquidity Management

Managing Uniswap V3 positions actively to maximize fee revenue:

```solidity
contract ConcentratedLPM {
    INonfungiblePositionManager public nft;
    uint256 public tokenId;

    struct Position {
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
    }

    function rebalance(int24 newTickLower, int24 newTickUpper) external {
        // 1. Withdraw all liquidity from current position
        Position memory pos = positions[tokenId];
        nft.decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams(tokenId, pos.liquidity, 0, 0, block.timestamp)
        );

        // 2. Collect fees
        nft.collect(INonfungiblePositionManager.CollectParams(tokenId, address(this), type(uint128).max, type(uint128).max));

        // 3. Create new position around current price ± range
        nft.mint(INonfungiblePositionManager.MintParams({
            token0: pool.token0(),
            token1: pool.token1(),
            fee: pool.fee(),
            tickLower: newTickLower,
            tickUpper: newTickUpper,
            amount0Desired: balance0,
            amount1Desired: balance1,
            amount0Min: 0,
            amount1Min: 0,
            recipient: address(this),
            deadline: block.timestamp
        }));
    }
}
```

### Active Management Strategies

| Strategy | Range | Rebalance Frequency | Best For |
|---|---|---|---|
| Full range (V2-style) | [-∞, +∞] | Never | Passive LPs |
| Narrow range | ±1-5% | Hours to days | Stable pairs |
| Dynamic range | Variable | Minutes to hours | Volatile pairs |
| Multi-hop | Across fee tiers | Daily | Maximizing fee tier |
| Gamma-neutral | Hedged | On price move | Market neutral |

## Risk Assessment

```solidity
// Risk scoring for yield strategies
function assessRisk(address strategy) public view returns (uint8 score) {
    // 0 (safest) to 10 (riskiest)
    uint8 score = 0;

    // Smart contract risk
    if (yearnStyleVault(strategy)) score += 2;
    if (unverifiedContract(strategy)) score += 4;

    // Impermanent loss risk
    if (usesAMM(strategy)) score += 2;

    // Depeg risk
    if (hasStablecoinExposure(strategy) && !hasInsurance(strategy)) score += 2;

    // Oracle dependency
    if (reliesOnSingleOracle(strategy)) score += 1;

    // Composability risk (stacked protocols)
    uint256 protocolDepth = countProtocolLayer(strategy);
    score += min(protocolDepth, 3);

    return min(score, 10);
}
```

### Risk Factor Breakdown

| Risk | Severity | Mitigation |
|---|---|---|
| Smart contract bug | Critical | Audits, bug bounties, timelocks |
| Impermanent loss | Medium | Concentrated range management, hedging |
| Depeg of stablecoin/LSD | High | Diversification, depeg insurance |
| Oracle manipulation | High | TWAP, redundant oracles |
| Composability cascade | Medium | Circuit breakers, position limits |
| MEV / sandwich | Medium | Slippage protection, private mempools |

## Cross-References

- **AMM concentrated liquidity strategies** → `blockchain-defi/references/amm-mechanics.md`
- **Lending-based yield strategies** → `blockchain-defi/references/lending-borrowing.md`
- **LSD/LRT yield opportunities** → `blockchain-defi/references/lsd-lrt-restaking.md`
