---
name: defi-smart-contracts
description: >
  Use this skill when the user says 'AMM', 'automated market maker', 'constant product', 'x*y=k', 'Uniswap math', 'impermanent loss', 'liquidity pool math'. Explains AMM pricing mechanics and the reentrancy pitfalls of swap contracts. Do NOT use for: broad DeFi protocol design (use blockchain/blockchain-defi) or full contract-security audits (use blockchain/smart-contract-security).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [niche, fintech, defi, amm, solidity]
---

# DeFi: Automated Market Makers (AMM)

## Purpose
Explain the deterministic pricing math behind automated market makers (constant-product invariant, slippage, impermanent loss) and the security pitfalls - especially reentrancy - in swap/liquidity contracts.

## Agent Protocol

### Trigger
User phrases: "AMM math", "x*y=k", "impermanent loss", "liquidity pool pricing", "swap reentrancy".

### Input Context
- AMM type and fee tier.
- Token decimals and oracle usage.

### Output Artifact
Formula/mechanics explanation with security notes.

### Response Format
```
Mechanic: {invariant}
Price impact: {slippage}
Risk: {IL | reentrancy}
```


## Core Mechanics

Traditional finance uses Order Books (matching buyers and sellers). DeFi protocols like Uniswap use AMMs: algorithms that pool liquidity and price assets deterministically using math.

### 1. The Constant Product Formula
The core engine of an AMM is `x * y = k`.
- `x` and `y` are the quantities of two tokens in a liquidity pool.
- `k` must remain constant after a trade.
- If a user buys token X, they must add token Y, making X scarcer and thus more expensive. This curve automatically provides continuous liquidity.

### 2. Smart Contract Reentrancy Guard
A classic vector for stealing funds. If a contract calls an external untrusted contract before updating its own internal balances, the malicious contract can recursively call back (re-enter) the original function to drain funds. Always use a `ReentrancyGuard` mutex or follow the Checks-Effects-Interactions pattern.

### AMM Swap Flow Map

```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": true}}}%%
flowchart TD
    subgraph User ["Trader"]
        A["Swap 10 Token A for Token B"]
    end
    
    subgraph AMM_Contract ["Liquidity Pool Contract"]
        B["Check reserves (x, y)"]
        C["Calculate Output: (y - k/(x+10))"]
        D["Execute Transfer"]
    end
    
    subgraph Reentrancy_Guard ["Security Layer"]
        E{"Is Locked?"}
        F["Lock Mutex"]
        G["Unlock Mutex"]
    end
    
    A --> E
    E -->|"No"| F
    F --> B
    B --> C
    C --> D
    D --> G
```
