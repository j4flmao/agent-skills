# DeFi Risk Management

## Liquidation Monitoring

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LiquidationMonitor {
    struct Position {
        address user;
        uint256 collateral;
        uint256 debt;
        uint256 liquidationThreshold;
    }

    mapping(address => Position) public positions;

    event LiquidationTriggered(address indexed user, address liquidator);
    event HealthFactorUpdated(address indexed user, uint256 healthFactor);

    function getHealthFactor(address user) public view returns (uint256) {
        Position memory pos = positions[user];
        if (pos.debt == 0) return type(uint256).max;

        uint256 collateralValue = pos.collateral * getPrice();
        uint256 weightedCollateral = (collateralValue * pos.liquidationThreshold) / 10000;

        return (weightedCollateral * 1e18) / pos.debt;
    }

    function isLiquidatable(address user) public view returns (bool) {
        return getHealthFactor(user) < 1e18;
    }

    function liquidate(address user) external {
        require(isLiquidatable(user), "Position is healthy");

        Position memory pos = positions[user];
        uint256 debtToCover = pos.debt;
        uint256 collateralReward = (debtToCover * getPrice() * 105) / (100 * getPrice());

        // Transfer collateral to liquidator
        // Repay debt
        delete positions[user];

        emit LiquidationTriggered(user, msg.sender);
    }
}
```

## Yield Strategy Risk Assessment

```python
from dataclasses import dataclass
from typing import List, Dict

@dataclass
class YieldStrategyRisk:
    strategy_name: str
    protocol: str
    tvl: float
    apy: float
    risk_score: float
    risks: List[str]

class RiskAnalyzer:
    def assess_protocol(self, protocol_data: Dict) -> Dict:
        risks = []

        tvl = protocol_data.get("tvl", 0)
        if tvl < 1_000_000:
            risks.append("Low TVL - higher volatility risk")

        audits = protocol_data.get("audits", [])
        if len(audits) == 0:
            risks.append("No public audits found")

        age_days = protocol_data.get("age_days", 0)
        if age_days < 90:
            risks.append("Protocol less than 90 days old")

        price_volatility = protocol_data.get("price_volatility_30d", 0)
        if price_volatility > 0.2:
            risks.append(f"High price volatility: {price_volatility:.1%}")

        return {
            "risk_count": len(risks),
            "risks": risks,
            "recommendation": "Avoid" if len(risks) > 2 else "Monitor" if len(risks) > 0 else "Proceed",
        }
```

## Key Points

- Monitor liquidation health factors continuously
- Calculate liquidation thresholds with safe buffers
- Assess protocol TVL, age, and audit history
- Track price volatility for collateral assets
- Monitor oracle manipulation risks
- Implement circuit breakers for extreme conditions
- Use diversification across protocols
- Set position size limits per protocol
- Track impermanent loss for LP positions
- Monitor governance risk (rug pull vectors)
- Use insurance protocols for covered positions
- Document risk parameters and rebalancing rules
