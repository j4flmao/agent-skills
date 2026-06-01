# Blockchain DeFi Fundamentals

## DeFi Building Blocks

### Automated Market Makers (AMMs)
AMMs replace order books with liquidity pools and mathematical formulas. Liquidity providers deposit assets into pools and earn fees from trades. The invariant function determines price based on pool composition.

**Key AMM Types:**
- **Constant Product (x*y=k)**: Uniswap v2. Simple, always liquid. Slippage = f(trade size / pool depth).
- **Stableswap (Curve)**: Stablecoin pairs. Low slippage near peg. Complex math (amplification coefficient).
- **Concentrated (Uniswap v3)**: Capital efficient. LPs choose price range. Active management needed.
- **Weighted (Balancer)**: Multi-token pools with custom weights. Index-like exposure.

### Lending Protocols
Lending pools match suppliers and borrowers. Suppliers earn interest, borrowers pay interest + provide collateral.

**Key Concepts:**
- **Utilization Rate**: Borrowed / Supplied. Determines interest rate.
- **Loan-to-Value (LTV)**: Max borrow amount as % of collateral.
- **Liquidation Threshold**: Position health factor below which liquidation triggers.
- **Health Factor**: (Collateral * Price * Threshold) / Debt. Must stay > 1.

### Yield Strategies
- **Liquidity Mining**: LPs earn protocol tokens as rewards
- **Auto-compounding**: Automatically reinvest yield (Yearn)
- **Boosted Positions**: Lock protocol tokens for higher rewards (Convex, veTokenomics)
- **Liquid Staking**: Stake ETH, receive tradable receipt token (stETH, rETH)
- **Restaking**: Use already-staked ETH to secure additional protocols (EigenLayer)

## DeFi Risks

### Smart Contract Risk
Code bugs can lead to complete loss of funds. Mitigated by audits, bug bounties, formal verification, and insurance.

### Economic Risk
Impermanent loss, liquidation risk, depegs, oracle manipulation. Mitigated by protocol design (TWAP, circuit breakers, redundant oracles).

### Composability Risk
Interconnected protocols create systemic risk. A vulnerability in one protocol can cascade through DeFi Lego. Mitigated by isolated markets, borrow caps, and health monitoring.
