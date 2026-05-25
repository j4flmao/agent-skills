---
name: blockchain-application
description: >
  Use this skill when asked about smart contract development, Solidity, Vyper, Rust smart contracts (Solana, NEAR, Polkadot), Haskell/Plutus (Cardano), Cairo/StarkNet, dApp backend development, Truffle, Hardhat, Foundry, Anchor, and blockchain application patterns. Languages: Solidity, Vyper, Rust, Haskell, Cairo, Move. Covers EVM-based development (Ethereum, Polygon, Arbitrum, Optimism), SVM-based development (Solana), eUTxO-based development (Cardano), StarkNet/STARK-based development (Cairo), smart contract security, gas optimization, upgradeable contracts, and cross-contract communication. Do NOT use for: blockchain core protocol (use blockchain-core), web3 frontend (use blockchain-web3), or testing (use blockchain-testing).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [blockchain, smart-contracts, solidity, vyper, rust, haskell, cairo, move, application, phase-blockchain]
---

# blockchain-application

## Trigger
"smart contract", "solidity", "vyper", "vyper contract", "solidity contract", "evm", "rust smart contract", "solana contract", "anchor framework", "cardano", "plutus", "haskell contract", "cairo", "starknet", "starkware", "sierra", "marlowe", "eutxo", "hardhat", "foundry", "truffle", "dapp backend", "contract deployment", "gas optimization", "contract security", "cross-contract call", "chainlink", "oracle contract", "defi contract", "nft contract"

## Rules
1. Use Solidity for EVM chains (Ethereum, Polygon, Arbitrum, Optimism, Base, BSC)
2. Use Rust for Solana (Anchor framework as default), NEAR, and Polkadot ink!
3. Use Haskell/Plutus for Cardano smart contracts
4. Always follow checks-effects-interactions pattern regardless of language
5. Use Foundry (forge) for Solidity development and testing as default toolchain
6. Include gas optimization in every code review — storage is expensive, calldata is cheaper
7. Never hardcode sensitive parameters — use constructor args, setters with timelock

## Response Format
1. **Platform selection**: chain type + VM + language + framework
2. **Contract architecture**: entry points, storage layout, external dependencies
3. **Implementation**: key functions with gas considerations and security notes
4. **Testing strategy**: unit, integration, fuzz, testnet deployment
5. **Deployment**: constructor args, verification, proxy setup, multi-sig ownership

## References
- references/cairo-language.md — Cairo language for StarkNet smart contracts
- references/contract-security.md — Smart contract security best practices overview
- references/haskell-plutus.md — Haskell and Plutus for Cardano eUTxO
- references/move-language.md — Move language for Sui and Aptos development
- references/rust-smart-contracts.md — Rust-based contracts on Solana, NEAR, Polkadot
- references/smart-contract-patterns.md — Common contract design patterns and practices
- references/solidity-evm.md — Solidity language and EVM architecture deep dive
- references/vyper-language.md — Vyper language for secure EVM contracts

## Phase
blockchain → blockchain-application
