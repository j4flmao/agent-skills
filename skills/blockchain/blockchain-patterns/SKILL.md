---
name: blockchain-patterns
description: >
  Use this skill when asked about blockchain design patterns, token standards, upgradeable contracts, oracle patterns, layer 2 scaling patterns, cross-chain communication patterns, and common blockchain architecture patterns. Covers ERC standards (20, 721, 1155, 4626, 4337), proxy patterns (UUPS, transparent, beacon), bridge patterns, state channel patterns, sidechain patterns, and MEV-aware design. Do NOT use for: specific language implementation (use blockchain-application), core protocol design (use blockchain-core), or web3 integration (use blockchain-web3).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [blockchain, patterns, architecture, design, phase-blockchain]
---

# blockchain-patterns

## Trigger
"blockchain pattern", "token standard", "ERC-20", "ERC-721", "ERC-1155", "ERC-4626", "ERC-4337", "upgradeable contract", "proxy pattern", "UUPS", "oracle pattern", "bridge pattern", "layer 2", "state channel", "sidechain", "MEV", "cross-chain", "blockchain design pattern", "smart contract pattern"

## Rules
1. Use UUPS proxy pattern as default for upgradeable contracts (cheaper deployment than transparent)
2. Follow Checks-Effects-Interactions pattern for all contract functions
3. Prefer pull-over-push for payment distribution
4. Implement circuit breakers (pause mechanisms) for production contracts
5. Use ERC-1167 minimal proxy for cheap contract clones
6. Design for rollup compatibility — consider calldata costs, L1→L2 messaging
7. Reference production battle-tested implementations (OpenZeppelin, Solady)

## Response Format
1. Pattern category (token/upgrade/oracle/bridge/scaling)
2. Problem statement + when to use
3. Implementation approach with trade-offs
4. Security considerations and known pitfalls
5. Code example or reference to canonical implementation

## Phase
blockchain → blockchain-patterns
