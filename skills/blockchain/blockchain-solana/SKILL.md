---
name: blockchain-solana
description: >
  Use this skill when asked about Solana blockchain, Solana architecture, Proof of History, Solana programming, Anchor framework, Solana runtime, Solana CLI tools, Solana DeFi, Jupiter, Raydium, Metaplex, SPL tokens, and the Solana ecosystem. Covers Solana protocol architecture (PoH, Tower BFT, Turbine, Gulf Stream, SeaLevel, Cloudbreak), smart contract development with Anchor/Rust, SPL token standards, Solana CLI and SDKs, and ecosystem protocols. Do NOT use for: EVM chains (use blockchain-ethereum), general Rust smart contracts (use blockchain-application), or other L1 blockchains.
version: "1.1.0"
author: "j4flmao"
license: "MIT"
tags: [blockchain, solana, rust, anchor, phase-blockchain]
---

# Blockchain Solana

## Purpose
Guide Solana blockchain development covering protocol architecture, smart contract (program) development with Anchor, SPL token standards, validator operations, and ecosystem protocol integration.

## Agent Protocol

### Trigger
"solana", "solana blockchain", "solana architecture", "proof of history", "anchor framework", "solana program", "solana contract", "solana runtime", "solana CLI", "spl token", "solana defi", "jupiter", "raydium", "metaplex", "solana validator", "solana developer", "turbine", "gulf stream", "sealevel", "cloudbreak", "pda", "cpi", "solana account model"

### Input Context
- Application type (DeFi/NFT/gaming/infrastructure)
- Cluster (mainnet-beta/testnet/devnet/localnet)
- Program type (Anchor/raw BPF)
- Account model design (PDA seeds, account structs)
- Compute budget requirements
- Dependencies (SPL tokens, oracle programs, other protocols)

### Output Artifact
Solana program specification: architecture, account design, instruction handlers, testing strategy, deployment plan.

### Response Format
1. **Architecture selection**: cluster type, program type (Anchor/raw BPF), account model design
2. **Program design**: account structs, instruction handlers, PDA seeds, CPI design
3. **Implementation**: Anchor macro patterns, error codes, compute budget optimization, security invariants
4. **Testing**: Anchor test framework (TypeScript/Rust), local validator, fork testing with mainnet data
5. **Deployment**: solana CLI deploy, program upgrade authority, verifiable build, IDL publishing

### Completion Criteria
- Program architecture follows Anchor conventions and Solana account model
- Account structs defined with proper seeds, space, and rent exemption
- Instruction handlers include all required validation (signer checks, constraint checks)
- CPI calls designed with proper seed derivation and signing (invoke_signed)
- Testing covers: unit, integration, mainnet fork, compute budget, edge cases
- Deployment plan includes: upgrade authority management, verifiable build, IDL

### Max Response Length
5000 tokens

## Decision Trees

### Program Architecture
```
Solana program type:
├── Token/SFT → SPL Token + Associated Token Account
├── NFT → Metaplex Token Metadata + Candy Machine
├── AMM/DeFi → Anchor with CPIs to SPL Token + Oracle
├── Custom logic → Anchor (default) or raw BPF
│   ├── Anchor → Most programs (handles PDA bumps, validation, serialization)
│   └── Raw BPF → Performance-critical, no overhead (rarely needed)
└── Upgradable?
    ├── YES → BPFLoaderUpgradeable (default)
    └── NO → BPFLoader (immutable, security critical)
```

### Account Model
```
Account type needed:
├── Token account → Associated Token Account (SPL Token)
│   ├── Derivation: PDA(owner, TOKEN_PROGRAM_ID, mint)
│   └── One ATA per owner per mint
├── Program-derived account → PDA
│   ├── Seeds: [b"prefix", pubkey, bump]
│   ├── Bump stored in account or derived on each call
│   └── Space: 8 (discriminator) + struct fields
├── Signer → Transaction signer (wallet or PDA via CPI)
└── Executable → Deployed program account
```

## Anchor Program Patterns

### Basic Anchor Program
```rust
use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod my_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, data: u64) -> Result<()> {
        ctx.accounts.my_account.data = data;
        ctx.accounts.my_account.authority = ctx.accounts.authority.key();
        emit!(DataChanged { data });
        Ok(())
    }

    pub fn update(ctx: Context<Update>, new_data: u64) -> Result<()> {
        ctx.accounts.my_account.data = new_data;
        emit!(DataChanged { data: new_data });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 8 + 32, // discriminator + u64 + Pubkey
        seeds = [b"my_account", authority.key().as_ref()],
        bump
    )]
    pub my_account: Account<'info, MyAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(
        mut,
        seeds = [b"my_account", authority.key().as_ref()],
        bump,
        has_one = authority
    )]
    pub my_account: Account<'info, MyAccount>,
    pub authority: Signer<'info>,
}

#[account]
pub struct MyAccount {
    pub data: u64,
    pub authority: Pubkey,
}

#[event]
pub struct DataChanged {
    pub data: u64,
}
```

### CPI (Cross-Program Invocation)
```rust
// Calling SPL Token from another program
use anchor_spl::token::{self, Transfer, Token, TokenAccount};

pub fn transfer_tokens(ctx: Context<TransferTokens>, amount: u64) -> Result<()> {
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.from.to_account_info(),
                to: ctx.accounts.to.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        amount,
    )?;
    Ok(())
}

#[derive(Accounts)]
pub struct TransferTokens<'info> {
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
```

### PDA Signing for CPI
```rust
// Program signs for a PDA derived account
pub fn pda_signed_transfer(ctx: Context<PdaTransfer>, amount: u64) -> Result<()> {
    let seeds = &[
        b"escrow",
        ctx.accounts.escrow.seed.as_ref(),
        &[ctx.accounts.escrow.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.receiver_token_account.to_account_info(),
                authority: ctx.accounts.escrow.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;
    Ok(())
}
```

## Solana Architecture Components

| Component | Purpose | Key Characteristics |
|---|---|---|
| Proof of History (PoH) | Global timestamp / sequence | SHA-256 sequential hashing, verifiable delay |
| Tower BFT | Consensus | Optimistic confirmation, ~400ms slot time |
| Turbine | Block propagation | Fragmented block propagation tree |
| Gulf Stream | Mempool replacement | Forward transaction forwarding, no mempool |
| SeaLevel | Runtime | Parallel transaction execution (read/write sets) |
| Cloudbreak | Account database | Memory-mapped account storage |
| Pipelining | Transaction processing | GPU-optimized signature verification |

## Testing with Anchor

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MyProgram } from "../target/types/my_program";
import { expect } from "chai";

describe("my_program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.MyProgram as Program<MyProgram>;

  it("initializes and updates", async () => {
    const [myAccountPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("my_account"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initialize(new anchor.BN(42))
      .accounts({ myAccount: myAccountPda })
      .rpc();

    const account = await program.account.myAccount.fetch(myAccountPda);
    expect(account.data.toNumber()).to.equal(42);
  });

  it("simulates mainnet fork", async () => {
    // Use mainnet fork for testing real protocol interactions
    const connection = new anchor.web3.Connection("https://api.mainnet-beta.solana.com");
    // ... fork test implementation
  });
});
```

## Rules
1. Use Anchor as default framework for all Solana program development
2. Write programs in Rust with Anchor or raw BPF — never use Solidity or EVM tooling
3. Follow PDA derivation: findProgramAddress with deterministic seeds, store bump in account
4. Every account explicitly declared as writable, signer, executable, or PDA
5. Be compute-budget aware: 200K CU limit, optimize loops, minimize CPI calls
6. Use SPL Token and ATA standards for all token operations
7. Close accounts to reclaim rent where appropriate (close constraint in Anchor)
8. Use invoke_signed for program-signing authorization
9. Always test against localnet, devnet, then mainnet fork
10. Program upgrades require upgrade authority (can be revoked for immutability)

## References
  - references/blockchain-solana-advanced.md — Blockchain Solana Advanced Topics
  - references/blockchain-solana-fundamentals.md — Blockchain Solana Fundamentals
  - references/solana-architecture.md — Solana Architecture
  - references/solana-ecosystem.md — Solana Ecosystem
  - references/solana-pda-and-cpi-deep.md — Solana PDA and CPI Deep Dive
  - references/solana-programming.md — Solana Programming
  - references/solana-runtime.md — Solana Runtime
  - references/solana-token-program.md — Solana Token Program
  - references/solana-tools.md — Solana Tools & SDKs
  - references/solana-security.md — Solana Security Best Practices
  - references/solana-deployment.md — Solana Program Deployment

## Phase
blockchain → blockchain-solana
