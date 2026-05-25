---
name: blockchain-web3
description: >
  Use this skill when asked about web3 frontend development, ethers.js, viem, wagmi, web3.js, wallet integration (MetaMask, Phantom, WalletConnect), dApp architecture, RPC providers (Alchemy, Infura), and TypeScript blockchain SDKs. Language: TypeScript. Covers reading blockchain state, sending transactions, wallet connection flows, contract interaction patterns, event subscription, gas estimation, multicall patterns, and account abstraction (ERC-4337). Do NOT use for: smart contract development (use blockchain-application), core protocol (use blockchain-core), or blockchain testing (use blockchain-testing).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [blockchain, web3, typescript, dapp, wallet, phase-blockchain]
---

# blockchain-web3

## Trigger
"web3", "ethers.js", "viem", "wagmi", "web3.js", "metamask", "phantom wallet", "walletconnect", "dapp", "decentralized app", "react blockchain", "nextjs web3", "ethers contract", "contract interaction", "read contract", "write contract", "send transaction", "sign message", "eip-1193", "eip-4337", "account abstraction", "multicall", "rpc provider", "infura", "alchemy", "blockchain frontend", "typechain"

## Rules
1. Use viem + wagmi as default TypeScript stack (modern, type-safe, lightweight)
2. Use ethers.js v6 for projects requiring broader ecosystem compatibility
3. Use TypeScript exclusively — generate types from ABIs with TypeChain or viem CLI
4. Always handle chain IDs for multi-chain dApps — detect network changes
5. Implement proper error handling for transaction reverts, user rejection, network issues
6. Use ERC-1193 provider interface via EIP-6963 (multi-injected provider discovery)
7. Prefer account abstraction (ERC-4337) for production dApps with complex UX needs
8. Never expose private keys in frontend code — always use wallet signatures

## Response Format
1. **Library selection**: viem/wagmi vs ethers.js vs web3.js rationale
2. **Provider setup**: chain config, RPC endpoints, fallback providers
3. **Wallet connection**: injected providers, WalletConnect, smart accounts
4. **Contract interaction**: read/write patterns, event listening, multicall
5. **Transaction flow**: gas estimation, simulation, submission, confirmation tracking
6. **Error handling**: revert reasons, user rejection, network errors, rate limiting

## References
- references/dapp-architecture.md — dApp architecture layers and patterns
- references/ethers-viem-wagmi.md — ethers.js, viem, wagmi TypeScript libraries
- references/providers-rpc.md — RPC providers and Alchemy/Infura setup
- references/wallet-integration.md — EIP-1193 and EIP-6963 wallet connection
- references/web3-hooks.md — React hooks for blockchain interactions

## Phase
blockchain → blockchain-web3
