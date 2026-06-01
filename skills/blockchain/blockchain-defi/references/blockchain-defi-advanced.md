# Blockchain DeFi Advanced Topics

## Advanced AMM Mechanics

### Concentrated Liquidity Design (Uniswap v3)
Liquidity is allocated within custom price ranges. When price moves out of range, LP position becomes fully one-sided (only one asset). Tick-based pricing with fixed-point arithmetic. Fee tiers (0.01%, 0.05%, 0.30%, 1.00%) for different volatility profiles. Range orders simulate limit orders.

### Dynamic Fee AMMs
Adjust swap fees based on market conditions: volatility, utilization, or pool composition. Example: Uniswap v4 dynamic fees, Curve's fee adjustments based on pool imbalance.

### MEV-Resistant AMMs
- **Batch auctions** (CowSwap): Batch settle trades to prevent sandwich attacks
- **Threshold encryption**: Encrypt orders, decrypt after batch period
- **Delay-based**: Time-delayed execution prevents frontrunning
- **Trade internalization**: Match counterparties off-chain before settling on-chain

## Advanced Lending

### Efficient Markets (Morpho)
Morpho Blue is a minimal lending engine with isolated markets. Each market has independent parameters (LTV, LLTV, oracle, IRR curve). No governance — parameters are fixed at market creation. Enables permissionless lending market creation with customizable risk profiles.

### Fixed-Rate Lending
Term lending protocols (Yield Protocol, Term Finance) offer fixed borrowing/lending rates using zero-coupon bonds or maturity-based markets. Users lock rates for a specific period, enabling more predictable yield strategies.

### Credit Delegation
Under-collateralized or uncollateralized lending based on reputation. Goldfinch, Maple Finance, Clearpool use off-chain credit assessment with on-chain settlement. Borrowers post minimal collateral or none, lenders earn higher yields for accepting credit risk.

## Liquid Staking Derivatives

### stETH Mechanics (Lido)
Users deposit ETH, receive stETH 1:1. stETH rebases daily as staking rewards accrue. Lido manages a network of node operators. Withdrawals are permissionless via L2 or via the withdrawal queue (post-Shanghai). stETH is usable in DeFi (lending, AMM, yield).

### Restaking (EigenLayer)
Users who have staked ETH can "opt in" to secure additional protocols (AVSs — Actively Validated Services) using the same capital. Validators commit to additional slashing conditions for AVSs. Creates a free market for security. Risks: slashing cascades, shared security model complexity.

## DeFi Derivatives

### Perpetual Futures
- **vAMM** (GMX): Synthetic AMM where LP provides liquidity for perpetuals. Prices from Chainlink oracles. No counterparty search — trader trades against the pool.
- **Order book** (dYdX): On-chain order book with L2 matching. Maker-taker fee model. Lower spread, higher capital efficiency.
- **Hybrid** (Synthetix): Debt pool-based. Traders mint sUSD and trade synthetic assets. Pool bears all counterparty risk.

### Options
- **Protocol-native** (Opyn, Lyra): On-chain options with standardized contracts (European style).
- **AMM-based** (Pods, Dopex): Options priced via AMM-style pools.
- **DeFi options vaults** (Ribbon): Automated covered calls / cash-secured puts strategies.
