---
name: blockchain-defi
description: >
  Use this skill when asked about decentralized finance, DeFi protocols, AMM mechanics, lending and borrowing protocols, perpetual futures, yield farming, liquidity mining, liquid staking, restaking, yield optimization, DeFi security, MEV, and protocol composability. Covers AMM design (Uniswap, Curve, Balancer), lending protocols (Aave, Compound, Morpho), derivatives (dYdX, GMX, Synthetix), liquid staking (Lido, Rocket Pool, EigenLayer restaking), and yield strategies (Yearn, Convex). Do NOT use for: general smart contract development (use blockchain-application), blockchain core protocol (use blockchain-core), or web3 UI integration (use blockchain-web3).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [blockchain, defi, finance, protocol, phase-blockchain]
---

# blockchain-defi

## Trigger
"defi", "decentralized finance", "amm", "automated market maker", "lending protocol", "borrowing", "liquidation", "yield farming", "liquidity mining", "perpetual futures", "perps", "liquid staking", "restaking", "eigenlayer", "lido", "uniswap", "curve", "aave", "compound", "yearn", "convex", "yield optimization"

## Rules
1. Always consider economic security and incentive alignment — game theory is as important as code correctness in DeFi
2. Use TWAP over spot price for on-chain pricing to resist flash loan manipulation
3. Understand and quantify impermanent loss before committing to AMM liquidity provision strategies
4. Design for composability — interfaces should follow standards (ERC-4626, ERC-3156 flash loans) and be compatible with the broader DeFi ecosystem
5. Consider MEV resistance — implement private mempools, commit-reveal schemes, or delay-based protections for sensitive operations
6. Follow oracle best practices — use redundant, manipulation-resistant price feeds with stale-price checks and circuit breakers
7. Implement circuit breakers and rate limits — pause mechanisms, deposit/withdraw caps, and borrow limits prevent catastrophic loss during exploits

## Response Format
1. Protocol category (AMM / lending / derivatives / LSD / yield)
2. Mechanism design — core invariants, pricing formulas, incentive model
3. Economic security — oracle risk, liquidation safety, capital efficiency trade-offs
4. Implementation — key contract architecture, integration points, Solidity/EVM patterns
5. Risk analysis — smart contract risk, IL, depeg risk, regulatory exposure, composability risk

## References
- references/amm-mechanics.md — Constant product, stable swap, weighted pools
- references/derivatives-perps.md — Perpetual futures and derivatives mechanisms
- references/lending-borrowing.md — Interest rate models and liquidation logic
- references/lsd-lrt-restaking.md — Liquid staking derivatives and restaking
- references/yield-strategies.md — Yearn vault design and yield optimization

## Phase
blockchain → blockchain-defi
