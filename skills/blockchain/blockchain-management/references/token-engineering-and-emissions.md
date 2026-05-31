# Blockchain Management: Token Engineering and Emissions

## Overview

Token engineering is the discipline of designing cryptographic tokens with predictable economic properties, incentive alignment, and sustainable emission schedules. It sits at the intersection of mechanism design, game theory, behavioral economics, and smart contract engineering. For the software engineer building tokenized systems, the token is not merely a currency—it is a programmable incentive structure that must maintain Nash equilibrium under adversarial conditions while remaining resilient to economic attacks.

The emission schedule—the rate at which new tokens enter circulation—determines the long-term security budget, incentive sustainability, and token holder value accrual. Poorly designed emission schedules have caused catastrophic failures in protocols, from hyperinflationary death spirals to insufficient security budgets. This reference covers the engineering of token supply models, emission curves, staking mechanics, and the architectural patterns for implementing them in smart contracts.

## Core Architecture Concepts

### Supply Model Taxonomy

Tokens follow three fundamental supply models, each with distinct engineering implications:

**Fixed Supply (Bitcoin model)**: Total supply is bounded by a hard cap encoded in the monetary policy. The emission rate follows a predetermined schedule that asymptotically approaches the cap. Engineering challenges include handling the tail emission (or lack thereof), managing the block reward reduction, and ensuring the precision of the supply cap computation given integer arithmetic constraints.

```solidity
// Fixed supply with halving
uint256 public constant MAX_SUPPLY = 21_000_000 ether;
uint256 public constant HALVING_INTERVAL = 210_000; // blocks
uint256 public constant INITIAL_REWARD = 50 ether;

function blockReward(uint256 blockNumber) public pure returns (uint256) {
    uint256 halvings = blockNumber / HALVING_INTERVAL;
    if (halvings >= 64) return 0; // Beyond 64 halvings, reward rounds to 0
    return INITIAL_REWARD >> halvings; // Right-shift for halving
}
```

**Inflationary Supply (Ethereum model)**: Supply grows at a variable rate determined by protocol economics. Ethereum's post-EIP-1559 model has a base fee burn that can make supply deflationary during high usage. The engineering challenge is computing the net supply change as a function of activity, not just time.

**Algorithmic Supply (AMPL/Rebase model)**: Supply expands or contracts based on price oracle deviations from a target. These require careful oracle integration, manipulation resistance, and handling of cross-protocol composability issues when rebasing interacts with lending/borrowing markets.

### Emission Curve Design

Emission curves define the token release schedule. The three canonical designs are:

**Linear emission**: Constant token issuance per unit time. Simple to implement and predict but provides no incentives for early adoption and can lead to indefinite inflation.

**Halving-based emission**: Reward reduces by 50% at fixed intervals. Bitcoin's model creates a predictable scarcity schedule but the step function creates market discontinuities around halving events.

**Logarithmic/exponential decay**: Continuous decay function where `emission(t) = initialEmission * e^(-lambda * t)`. Provides smooth transition but is computationally more expensive on-chain due to exponentiation.

```solidity
// Continuous exponential decay emission
function emissionAtTime(uint256 timestamp) public view returns (uint256) {
    uint256 elapsed = timestamp - startTime;
    // Using fixed-point math for decay: decay = 1 - (1/2)^(elapsed/halfLife)
    uint256 decayFactor = fixedExp(elapsed * LN_2 / HALF_LIFE);
    return INITIAL_EMISSION * decayFactor / PRECISION;
}
```

### Staking Incentive Engineering

Staking creates a mechanism where token holders lock tokens in exchange for yield, aligning long-term incentives with protocol health. Key design parameters:

- **Lock duration**: Longer locks should earn proportionally higher rewards
- **Unbonding period**: The delay between unstaking request and token release
- **Slashing conditions**: Economic penalties for misbehavior
- **Reward distribution**: Pro-rata vs. time-weighted vs. quadratic

The staking contract must handle accounting precision across millions of stakers without gas exploding. The typical solution is the "reward per token stored" pattern, where a global accumulator tracks rewards distributed per unit of staked token, and individual staker rewards are computed as:

```
rewards[user] = staked[user] * (globalRewardIndex - userRewardIndex[user])
```

This pattern requires only O(1) state updates per staker interaction, regardless of total staker count.

## Architecture Decision Trees

```
Decide: Token Supply Model
├── Need predictable scarcity for store-of-value positioning?
│   ├── YES → Fixed supply with halving schedule
│   │   ├── Implement: Hard cap, halving intervals, integer arithmetic
│   │   └── Risk: No flexibility for protocol evolution
│   ├── Need ongoing security budget (validator rewards)?
│   │   ├── YES → Inflationary with controlled decay
│   │   │   ├── Implement: Continuous emission with decay function
│   │   │   └── Risk: Must balance inflation rate with adoption
│   │   └── NO → Check algorithmic model
│   └── Need stable purchasing power?
│       └── YES → Algorithmic/rebase
│           ├── Implement: Oracle-based supply adjustment
│           └── Risk: Oracle manipulation, negative feedback loops

Decide: Emission Distribution
├── Protocol insiders (team, investors, foundation)
│   ├── Vesting with cliff (standard): 1 year cliff, 3-4 year linear vest
│   ├── Time-based vs. milestone-based
│   └── Reverse vesting: Tokens start unlocked, vest back if departure
├── Protocol rewards (miners, stakers, LP incentivization)
│   ├── Fixed schedule: Predetermined emission curve
│   ├── Dynamic: Adjust emission based on protocol KPIs
│   └── Gauge-based: Token holders vote on distribution (Curve model)
└── Community treasury
    ├── Continuous allocation: X% of emission flows to treasury
    └── Discretionary: Reserved tokens released via governance
```

## Implementation Strategies

### Reward Distribution Contract Architecture

The standard architecture separates reward accounting from token staking into two contracts:

1. **Staking contract**: Handles deposits, withdrawals, delegations; tracks individual staked amounts
2. **Reward distributor**: Computes rewards, manages emission schedule, distributes yield
3. **Token contract**: ERC20 with optional rebasing, permit, and voting extensions

The reward distribution function must be callable by anyone (permissionless) to update the global accumulator before large claim operations:

```solidity
function updateGlobalRewardIndex() public {
    uint256 timeElapsed = block.timestamp - lastUpdate;
    if (timeElapsed == 0) return;
    
    uint256 emission = (timeElapsed * emissionRate) / 1 seconds;
    uint256 totalStaked = totalSupply();
    
    if (totalStaked > 0) {
        rewardIndex += (emission * PRECISION) / totalStaked;
    }
    
    lastUpdate = block.timestamp;
}
```

### Vesting Contract Patterns

Vesting schedules must handle cliff, linear release, and acceleration/cancelation scenarios:

- **Cliff vesting**: All tokens remain locked until cliff date, then begin linear release
- **Linear vesting**: Tokens release continuously at a fixed rate per second
- **Milestone vesting**: Tokens release upon verifiable on-chain conditions
- **Multi-sig cancelation**: Ability to cancel unvested tokens with multi-sig approval

```solidity
function vestedAmount(address beneficiary) public view returns (uint256) {
    VestingSchedule storage schedule = vestingSchedules[beneficiary];
    if (block.timestamp < schedule.cliff) return 0;
    if (block.timestamp >= schedule.end) return schedule.totalAmount;
    
    uint256 elapsed = block.timestamp - schedule.start;
    uint256 totalDuration = schedule.end - schedule.start;
    return (schedule.totalAmount * elapsed) / totalDuration;
}
```

## Integration Patterns

### Staking with DeFi Protocols

Staked token positions often need to be composable with the broader DeFi ecosystem:

- **Liquid staking**: Issue a derivative token (stETH, rETH) that represents staked position and can be used in DeFi
- **Staking position as NFT**: Represent each staking position as an ERC-721 for transferability and composability
- **Vote-escrowed tokens**: Lock tokens for veNFT (vote-escrowed NFT) that decays in voting power over time (Curve model)

### Multi-Token Incentive Programs

Protocols often distribute rewards in multiple tokens (protocol token + partner tokens):

- **Merkl-style distribution**: Off-chain computed rewards with on-chain claims
- **Convex-style boost**: Boost rewards based on vote-escrowed token balance
- **Cross-token swapping**: Auto-convert reward tokens to a single base token via DEX

```solidity
function claimRewards(address user, address[] memory rewardTokens) external {
    for (uint256 i = 0; i < rewardTokens.length; i++) {
        uint256 amount = pendingRewards[rewardTokens[i]][user];
        if (amount > 0) {
            pendingRewards[rewardTokens[i]][user] = 0;
            IERC20(rewardTokens[i]).safeTransfer(user, amount);
        }
    }
}
```

## Performance Optimization

### Gas-Efficient Accounting

The reward-per-token-stored pattern is the gold standard for gas efficiency at scale:

- **Global accumulator**: Single storage slot for reward index
- **Per-user checkpoint**: Two storage slots (user index, staked amount)
- **No loops**: All operations are O(1) regardless of user count
- **Batch claims**: Allow claiming multiple reward tokens in one transaction

### Emission Computation Off-Chain

For complex emission curves with high precision requirements, compute emissions off-chain and submit the result as a merkle root for on-chain verification:

1. Off-chain: Compute per-user rewards up to current block
2. Submit merkle root of reward claims
3. Users claim with merkle proof
4. On-chain validates proof against root

This pattern (used by Arbitrum, Optimism, and Merkl) reduces on-chain computation costs by orders of magnitude.

## Security Considerations

### Rebase Sandwich Attacks

In rebasing tokens, users can deposit right before a positive rebase and withdraw immediately after, capturing the rebase value without providing utility. Mitigations include:

- **Rebase delay**: Rebases apply only to tokens staked for a minimum duration
- **Pro-rata rebasing**: Rebases apply proportionally across all holders regardless of deposit time
- **Atomic rebase+snapshot**: Rebasing happens at a specific block, and only holders at that block benefit

### Staking Contract Vulnerabilities

| Vulnerability | Description | Mitigation |
|---|---|---|
| Reward manipulation | Depositing large amounts just before reward distribution to capture disproportionate share | Time-weighted averaging of deposits |
| Donation attack | Small donation dramatically shifts reward index | Minimum deposit threshold, virtual shares |
| Reentrancy on claim | Reentrant call in reward distribution claims | Reentrancy guard on all claim functions |
| Precision loss | Integer division truncation leads to lost rewards | Scale all calculations to high precision (1e18 or higher) |

### Economic Attack Vectors

Token engineering must consider adversarial market behavior:

- **Bribe attacks**: Attacker bribes stakers/liquidity providers to influence gauge votes (Curve Wars)
- **Buy-and-dump**: Whales accumulate, vote for self-beneficial parameter changes, then dump
- **Liquidity hijacking**: Drain liquidity from incentivized pools immediately after incentives are directed
- **Sybil farming**: Create many identities to farm token incentives without contributing value

## Operational Excellence

### Emission Monitoring

Track the following metrics continuously:

- **Inflation rate**: Current annualized emission as percentage of circulating supply
- **Staking ratio**: Percentage of circulating supply staked (target: 30-60%)
- **Reward yield**: APR/APY for stakers, with breakdown by lock duration
- **Unvested supply**: Percentage of total supply still in vesting contracts
- **Treasury balance**: Protocol-owned liquidity and reserve assets

### Emergency Procedures

- **Emission pause**: Ability to halt new emissions via governance in case of critical bug
- **Vesting acceleration**: Governance vote to accelerate vesting for early contributors in dissolution scenarios
- **Reward recalculation**: Tools to recompute historical rewards after parameter adjustments

## Testing Strategy

### Quantitative Testing

1. **Supply cap verification**: Ensure maximum supply can never be exceeded due to integer overflow
2. **Emission schedule accuracy**: Verify cumulative emissions match expected schedule at every interval
3. **Vesting cliff/precision**: Test edge cases at exact cliff time, before/after
4. **Reward distribution fairness**: Verify proportional distribution across arbitrary user sets
5. **Rebase calculations**: Test positive and negative rebases with various magnitudes

### Simulation Testing

Run Monte Carlo simulations to validate economic stability:

1. **Staker behavior**: Random deposits/withdrawals, varying lock durations
2. **Market volatility**: Simulate price changes and their effect on staking yield
3. **Adversarial scenarios**: Bribing, sybil attacks, large coordinated withdrawals

```typescript
// Pseudocode for emission simulation
function simulateEmissionCurve(params: EmissionParams): SimulationResult {
    let supply = params.initialSupply;
    for (let day = 0; day < params.days; day++) {
        const emission = computeEmission(day, params);
        const stakingRatio = supply > 0 ? stakedSupply / supply : 0;
        const yield = emission / stakedSupply;
        supply += emission;
        // Model staker behavior based on yield
        stakedSupply = modelStakingBehavior(stakedSupply, yield);
    }
    return { finalSupply, stakingHistory, yieldHistory };
}
```

## Common Pitfalls

### Precision Loss in Reward Distribution

Integer division in Solidity truncates toward zero. If `rewardIndex` updates use division, small stakers may lose dust amounts. Always use high-precision fixed-point arithmetic (18+ decimal scaling) and consider minimum claim thresholds.

### Cliff Edge Race Conditions

If multiple vesting schedules end at the same block, claim functions may fail due to gas limits. Implement paginated claims and prioritize large holders in emergency scenarios.

### Emission Schedule Mutability

Mutable emission parameters create governance attack surface. If the emission schedule can be changed by a simple majority vote, a hostile actor can capture the protocol by voting themselves infinite emissions. Require supermajority (66%+) and timelock for emission parameter changes.

### Ignoring Dilution Accounting

When computing token price models, failure to account for future dilution from unvested tokens and treasury allocations leads to misleading valuation metrics. Always report fully-diluted valuation (FDV) alongside market cap.

### Staking Derivative Depeg

Liquid staking derivatives are expected to trade near the underlying token value but can depeg during periods of high volatility or withdrawal queue congestion. Design arbitrage mechanisms (direct redemption or curve pools) to maintain the peg.

## Key Takeaways

- Token supply models must be chosen based on the protocol's security budget needs, not market speculation
- The reward-per-token-stored pattern is the industry-standard approach for gas-efficient staking rewards
- Emission schedules should use time-tested curves (halving, exponential decay) rather than novel designs
- Always implement vesting with cliff periods for insider tokens to align long-term incentives
- Precision loss in integer arithmetic is a critical bug class—use high-precision fixed-point math throughout
- Staking derivatives require careful arbitrage mechanisms to maintain peg stability
- Economic simulations and invariant testing are essential for validating token engineering designs
- Emission parameter changes require supermajority governance and extended timelocks
- Monitor fully-diluted valuation and staking ratio as key health metrics
- Liquid staking, vote-escrowed tokens, and gauge-based distribution are the three canonical staking patterns
