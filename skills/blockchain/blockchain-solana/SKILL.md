---
name: blockchain-solana
description: >
  Use this skill when asked about Solana blockchain, Solana architecture, Proof of History, Solana programming, Anchor framework, Solana runtime, Solana CLI tools, Solana DeFi, Jupiter, Raydium, Metaplex, SPL tokens, Solana ecosystem. Covers Solana protocol architecture (PoH, Tower BFT, Turbine, Gulf Stream, SeaLevel, Cloudbreak), smart contract development with Anchor/Rust, SPL token standards, Solana CLI and SDKs, and ecosystem protocols. Do NOT use for: EVM chains (use blockchain-ethereum), general Rust smart contracts (use blockchain-application), or other L1 blockchains.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [blockchain, solana, rust, anchor, phase-blockchain]
---

# blockchain-solana

## Trigger
"solana", "solana blockchain", "solana architecture", "proof of history", "anchor framework", "solana program", "solana contract", "solana runtime", "solana CLI", "spl token", "solana defi", "jupiter", "raydium", "metaplex", "solana validator", "solana developer"

## Rules
1. Use Anchor as the default framework for all Solana program development — it handles PDA bumps, account validation, and serialization
2. Write programs in Rust with Anchor or raw BPF — never use Solidity or EVM tooling for Solana
3. Follow PDA derivation patterns: use `findProgramAddress` with deterministic seeds, store bump seeds in account data or derive on every invocation
4. Respect the Solana account model — every account is explicitly declared as writable, signer, executable, or PDA in the struct
5. Be compute-budget aware — Solana transactions have a 200K compute unit limit; optimize loops, minimize CPI calls, and use `ComputeBudgetProgram` to request higher budgets
6. Use SPL token and associated token account standards for all token operations — never implement custom token logic
7. Close accounts to reclaim rent where appropriate using the `close` constraint in Anchor

## Response Format
1. **Architecture selection**: cluster type (mainnet-beta, testnet, devnet), program type (Anchor/RAW), account model design
2. **Program design**: account structs, instruction handlers, PDA seeds, cross-program invocation design
3. **Implementation**: Anchor macro patterns, error codes, compute budget optimization, security invariants
4. **Testing**: Anchor test framework with TypeScript or Rust, local validator, fork testing with mainnet data
5. **Deployment**: solana CLI deploy, program upgrade authority, verifiable build, IDL publishing

## References
- references/solana-architecture.md — Proof of History, Tower BFT, Turbine
- references/solana-ecosystem.md — Jupiter, Raydium, Metaplex ecosystem
- references/solana-programming.md — Anchor framework and Solana account model
- references/solana-runtime.md — BPF loaders, compute budget, runtime
- references/solana-tools.md — Solana CLI, SDKs, and developer tools

## Phase
blockchain → blockchain-solana
