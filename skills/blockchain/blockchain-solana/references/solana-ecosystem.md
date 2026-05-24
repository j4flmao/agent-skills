# Solana Ecosystem

## DEX / AMM

### Jupiter Exchange

The dominant DEX aggregator on Solana — routes trades across all major AMMs.

```
Jupiter routing:
     ┌─────────────┐
User ─→ Route discovery ──→ 1. Compute best path
     │               │       2. Split across 1–5 pools
     │               │       3. Execute via shared PDA
     │               └───────→ Output tokens
     │
     ├── Raydium (constant product)
     ├── Orca (stable/whirlpool)
     ├── Meteora (dynamic fees)
     ├── Lifinity (oracle-based)
     └── Openbook (order book)
```

- **Volume**: $1–3B daily (dominant aggregator)
- **Fees**: Dynamic, 0.01–0.1% depending on route complexity
- **Key feature**: Jito bundling for MEV protection
- **Integration**: Jupiter API (quote → swap), Jupiter RFQ for large orders

### Raydium

The first major AMM on Solana, using Serum (now Openbook) for central limit order books.

```rust
// Raydium CP-Swap pool layout
struct RaydiumPool {
    /// Pool token mint
    pool_mint: Pubkey,
    /// Token A vault
    token_a_vault: Pubkey,
    /// Token B vault
    token_b_vault: Pubkey,
    /// LP token mint authority
    authority: Pubkey,
    /// Openbook market
    open_orders: Pubkey,
    /// Token A mint
    token_a_mint: Pubkey,
    /// Token B mint
    token_b_mint: Pubkey,
    /// Fees (in basis points)
    fee: u64,
}
```

- **Model**: Constant product AMM (x × y = k) + order book
- **Liquidity**: ~$500M TVL
- **Fee tier**: 0.25% standard, 0.03% for stable pools

### Orca

Concentrated liquidity AMM with Whirlpools.

- **Whirlpools**: Concentrated liquidity within custom price ranges
- **Fee tiers**: 0.01%, 0.05%, 0.30%, 1.00%, 2.00%
- **TVL**: ~$200M
- **Key feature**: Double-sided yield (swap fees + ORCA farming)

### Meteora

Dynamic-fee AMM with single-sided staking.

- **Dynamic fees**: Adjusts based on volatility to protect LPs
- **DLMM (Dynamic Liquidity Market Maker)**: Active liquidity management
- **Auto-compounding**: Reinvests rewards automatically
- **TVL**: ~$150M

## Lending

### Solend (now Kamino)

Solend rebranded/merged into Kamino Lend.

| Metric | Value |
|--------|-------|
| TVL | ~$300M |
| Supplied | USDC, USDT, SOL, JitoSOL, mSOL, BONK |
| Collateral factor | 50–80% depending on asset |
| Liquidation threshold | 55–85% |
| Interest rate model | Jump rate (kink at 80% utilization) |

### Marginfi

Lending protocol with risk-tiers (LSTs, stablecoins, alt-L2s).

- **LST pool**: Lend/borrow liquid staking tokens
- **Ybx pool**: Cross-margin for yield-bearing assets
- **Fixed-rate lending**: Through Session Tokens
- **TVL**: ~$250M

## Liquid Staking

### Marinade Finance

The largest liquid staking protocol on Solana.

```
User deposits SOL
        │
        ▼
Marinade
  ├── Stakes with top validators (delegation strategy)
  ├── Mints mSOL (1:1 initially, accrues value over time)
  └── Users earn staking yield + MEV rewards
```

- **mSOL/SOL**: ~1.06+ (accrues staking yield, ~7–8% APY)
- **TVL**: ~$1B
- **Delayed unstaking**: ~epoch boundary (~2 days)
- **Instant unstaking**: Available via liquidity pool

### Jito

Liquid staking + MEV.

```
Jito-Solana validator client:
  ├── Captures MEV via Jito Block Engine
  ├── Auctions block space (tip auction)
  ├── Distributes MEV rewards to stakers
  └── jitoSOL accrues SOL + MEV tips
```

- **jitoSOL**: Token accruing staking + MEV yield (~8–9% APY)
- **Jito Block Engine**: MEV infrastructure used by most major validators
- **TVL**: ~$1.2B

### Blaze (formerly Socean)

- **stSOL**: Liquid staking token
- **TVL**: ~$50M
- **Unique**: Open-source, community-governed validator selection

## NFT Infrastructure

### Metaplex

The standard NFT framework on Solana.

```
Metaplex Protocol Stack:
├── Token Metadata (metadata standard)
│   ├── Metadata accounts (name, symbol, URI, creators, royalties)
│   ├── Master Editions (1-of-1)
│   └── Editions (multiple copies)
│
├── Candy Machine (mint infrastructure)
│   ├── Config lines (off-chain JSON)
│   ├── Guard groups (bot protection, payment, timing)
│   └── Reveal mechanism (hash → URI)
│
├── Bubblegum (compressed NFTs via state compression)
│   ├── Concurrent Merkle Tree
│   ├�်── 1M NFTs for ~1 SOL rent
│   └── Use case: gaming, airdrops, mass mints
│
└── Fusion (hybrid NFTs — on-chain + off-chain assets)
```

### Tensor

The leading NFT marketplace (professional trading).

- **Feature**: NFT order book with maker/taker fees
- **Lending**: NFT-collateralized loans (Tensol)
- **Aggregation**: TSwap aggregates across marketplaces
- **Volume**: Majority of Solana NFT secondary volume

### Magic Eden

The leading consumer NFT marketplace.

- **Launchpad**: NFT mints and releases
- **Cross-chain**: Solana, Bitcoin, Ethereum, Polygon
- **Aggregator**: Multi-marketplace order book
- **Royalties**: Creator-enforced via optional royalty system

## RPC / Infrastructure

### Helius

Solana RPC provider and developer platform.

```
Helius Platform:
├── RPC/WebSocket endpoints (mainnet, devnet)
├── Webhooks (transaction monitoring)
├── Enhanced APIs (parsed transactions, NFT data)
├── DAS API (Digital Asset Standard — NFTs, tokens, metadata)
├── Staking API (validator monitoring)
└── gRPC streams (real-time account updates)
```

| Feature | Details |
|---------|---------|
| RPC | Standard + enhanced (parsed tx, token balances) |
| Webhooks | Account subscriptions, transaction monitoring |
| DAS API | Digital Asset Standard for NFT/token metadata |
| Pricing | Free tier: 25k req/day, Pro: $50/mo |

### Triton (Triton One)

Enterprise RPC provider.

- **gRPC streaming**: Geyser plugin for real-time data
- **Historical data**: Full ledger history
- **Dedicated clusters**: SLA-backed for high-volume
- **Compliance**: Enterprise-grade security

### QuickNode

Multi-chain infrastructure with Solana support.

- **Add-ons**: Token metadata, NFT data, decompiled instructions
- **Peer-to-peer connections**: Reduced latency
- **Archive nodes**: Full transaction history

## Bridges

### Wormhole

The primary cross-chain bridge connecting Solana.

```
Source chain (e.g. Ethereum)
        │
        ▼
Wormhole Guardians (19 validators)
  ├── Observe VAA (Verified Action Approval)
  ├── Sign off on observed events
  └── Submit to Solana
        │
        ▼
Solana: Token Bridge program mints wrapped tokens
```

| Supported chains | Ethereum, BSC, Polygon, Avalanche, Sui, Aptos, Near, +15 |
|------------------|-----------------------------------------------------------|
| Token standard | Wormhole-wrapped (e.g., wETH, wBNB) |
| TVL bridged | ~$500M |
| Security model | Guardian network (19 nodes, 2/3 + 1 threshold) |

### Key Ecosystem Metrics (2026)

| Category | Leading Protocol | TVL / Volume |
|----------|-----------------|--------------|
| DEX | Jupiter | $1–3B daily volume |
| Lending | Kamino/Marginfi | ~$500M combined |
| Liquid Staking | Jito/Marinade | ~$2B combined |
| RPC | Helius/Triton | >50% of all RPC traffic |
| NFTs | Metaplex | Standard for all Solana NFTs |
| Bridge | Wormhole | >$500M bridged assets |
| MEV | Jito | ~90% validator MEV adoption |
