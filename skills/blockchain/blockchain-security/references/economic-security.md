# Economic Security in Blockchain Systems

## Game Theory in DeFi

### Nash Equilibrium in AMM Arbitrage
- Pool A: ETH/DAI at 2000 DAI/ETH, Pool B: 2010 DAI/ETH
- **Opportunity**: buy ETH cheap from A, sell expensive to B
- **Equilibrium**: both pools converge to market price
- **Nash**: no single arbitrageur profits by deviating from this

```python
def arbitrage_profit(liquidity_a, liquidity_b, mid_price):
    arb_size = min(liquidity_a['y'], liquidity_b['x'])
    return arb_size * (price_b - price_a)
```

### Staking / Reward Game
```
Payoffs: R - S vs LP where:
  R = (staked / total_staked) × emission
  S = slashing probability × severity × staked
  LP = liquidity premium of locked vs liquid token
Equilibrium: Marginal staker is indifferent (R - S ≈ LP)
```

### Liquidator Incentives
```solidity
function isLiquidationProfitable(uint256 collateral, uint256 bonusRate, uint256 gasCost)
    public pure returns (bool) {
    return (collateral * bonusRate / 100) > gasCost;
}
```

---

## MEV Game

### MEV Supply Chain
```
User tx → Mempool → Searchers → Builders → Relayers → Validators (propose block)
```
**MEV-Boost**: Builders compete on bid → validator accepts highest bid. Builder extracts value minus bid. ePBS eliminates relayers (~15% more value to validators).

### Sandwich Attack Economics
```
Profit ≈ swap_size² / (2 × liquidity) - gas_cost
Break-even: swap_size > sqrt(2 × liquidity × gas_cost)
For 1000 ETH pool, gas = 0.01 ETH → min_swap ≈ 4.47 ETH
```

### Sandwich Attack Economics
```
Cost to sandwich a swap:
1. Buy: price impact on pool = swap_size / liquidity
2. Sell: same impact reversed
3. Gas: 3 tx (buy, user, sell) = ~300K gas

Profit ≈ swap_size² / (2 × liquidity) - gas_cost

Break-even: swap_size > sqrt(2 × liquidity × gas_cost)

For a 1000 ETH pool, gas = 0.01 ETH:
  min_swap ≈ sqrt(2 × 1000 × 0.01) = ~4.47 ETH

Anything below ~4.47 ETH is not profitable to sandwich
```

### MEV Mitigation Strategies
| Strategy | How It Works | Trade-off |
|----------|-------------|-----------|
| Commit-reveal | User commits to price, reveals later | UX overhead, 2 tx |
| Batch auctions | Uniform clearing price per batch | Latency, less frequent |
| CoW protocol | Match orders peer-to-peer before AMM | Requires order flow overlap |
| Intents | User states intent, solvers compete to fulfill | Trust in solvers |
| Shutterized | Threshold encryption, reveal at block production | Requires DKG (distributed key generation) |
| Fair sequencing | Pre-confirmed ordering, anti-frontrunning | L2-specific |

---

## Oracle Economic Security

### Manipulation Cost Estimation
```python
def oracle_manipulation_cost(liquidity, price_impact, flash_loan_fee):
    swap_size = liquidity * price_impact / 2
    return swap_size * flash_loan_fee + swap_size * price_impact / 2
```

### TWAP Attack Cost Analysis
TWAP = `sum(price_i) / N`. To move TWAP +5% over N=30 (Uniswap V2 default):
- Manipulated block price must reach `(1 + 0.05 × 30) = 2.5×` current
- Cost scales as `liquidity × (sqrt(price_jump) - 1)` — quadratic in price deviation

| Oracle Type | Security | Cost to Manipulate |
|-------------|----------|-------------------|
| Spot pool price | Low | 1 block's liquidity |
| TWAP (30 min) | Medium | ~30× spot manipulation cost |
| Chainlink | High | Reputational cost, multi-source |
| Pyth | High | Cross-exchange, cross-chain |



---

## Attack Cost Estimation Framework

### Cost-to-Exploit vs TVL at Risk
```python
def attack_profitability(tvl_at_risk, exploit_cost, success_probability=1.0):
    """
    Is this attack economically rational?

    Attack profit = expected_gain - expected_cost
       = TVL_at_risk × success_prob × pct_extractable - exploit_cost

    If attack_profit > 0, attack is rational.
    """
    extractable_pct = 0.8  # assume 80% of TVL can be drained
    expected_gain = tvl_at_risk * extractable_pct * success_probability
    expected_cost = exploit_cost

    profit = expected_gain - expected_cost
    roi = (profit / expected_cost) * 100

    return {
        "profit": profit,
        "roi_pct": roi,
        "is_profitable": profit > 0
    }
```

### Example Cost Estimates
| Attack Type | Capital Required | Gas Cost | Non-Capital Cost |
|-------------|-----------------|----------|------------------|
| Flash loan oracle manipulation | $10M+ (temporary) | ~$500 | Dev time: 1-2 weeks |
| Governance attack (flash loan) | $20M+ (temporary) | ~$200 | Social coordination risk |
| Sandwich on large swap | $1M+ (pool dependent) | ~$100 | MEV competition |
| Reentrancy drain | 0 capital | ~$200 | Dev time: 0.5-1 week |
| Signature replay | 0 capital | ~$100 | Requires valid signature |
| Bridge validator compromise | 0 capital | ~$5K | Social engineering, bribes |

---

## Modeling Approaches

### Agent-Based Simulation
```python
class DeFiSimulation:
    """
    Agent-based model for testing economic security.
    """
    def __init__(self):
        self.agents = {
            "traders": [...],
            "arbitrageurs": [...],
            "liquidators": [...],
            "attackers": [...]
        }
        self.pools = {}
        self.oracles = {}

    def run_epoch(self):
        # Each agent acts based on their strategy
        for agent in self.agents["arbitrageurs"]:
            agent.seek_opportunity(self.pools)
        for agent in self.agents["attackers"]:
            agent.execute_attack(self.pools, self.oracles)
        # Check if any invariant is violated
        self.verify_invariants()

    def verify_invariants(self):
        for pool in self.pools:
            assert pool.k() == pool.x * pool.y, "AMM invariant broken"
```

### Stress Testing Scenarios
| Scenario | Parameters | Expected Outcome |
|----------|-----------|------------------|
| Flash loan + 10× leverage | TVL: $100M, FL: $50M | Must not allow > collateral borrow |
| 50% price crash | Oracle drops 50% in 1 block | No undercollateralized positions |
| Liquidation cascade | 50% of positions liquidated simultaneously | Protocol solvency |
| Governance takeover | 51% of voting power via flash loan | Timelock must prevent execution |
| Sandwich wave | 100 consecutive sandwich attacks | LPs must not lose more than fees earned |

## References
- "Code is Law" — But economic incentives are the enforcer
- MEV-Boost: relayers, builders, and validator economics
- "Flash Boys 2.0" — Frontrunning, MEV, and DAG
- Hasu's writings on staking economics and MEV
- Paradigm's "Economic Security of DeFi" research
