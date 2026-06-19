---
name: blockchain-solana
description: >
  Use this skill when asked about Solana blockchain, Solana architecture, Proof of History, Solana programming, Anchor framework, Solana runtime, Solana CLI tools, Solana DeFi, Jupiter, Raydium, Metaplex, SPL tokens, and the Solana ecosystem. Covers Solana protocol architecture (PoH, Tower BFT, Turbine, Gulf Stream, SeaLevel, Cloudbreak), smart contract development with Anchor/Rust, SPL token standards, Solana CLI and SDKs, and ecosystem protocols. Do NOT use for: EVM chains (use blockchain-ethereum), general Rust smart contracts (use blockchain-application), or other L1 blockchains.
version: "2.0.0"
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

Account size calculation:
├── Account header: 32B (owner Pubkey) + 8B (lamports) + 1B (executable) + 1B (rent_epoch)
├── Anchor discriminator: 8 bytes (hash of account struct name)
├── Data: struct size (packed, no alignment padding)
└── Rent exemption: ~0.000003 SOL per byte (mainnet 2024)
    Min rent: ~0.00088 SOL for 165 byte account (ATA)
```

### Compute Budget Decision
```
Compute budget planning:
├── Default: 200,000 compute units per instruction
│   ├── Simple transfer: ~1,000 CU
│   ├── SPL token transfer: ~40,000 CU
│   ├── PDA derivation: ~2,000 CU
│   ├── CPI call: ~10,000 CU (base) + callee cost
│   └── Log output: ~100 CU per 32 bytes
├── Increase budget: SetComputeUnitLimit (max 1.4M CU)
└── Priority fees: SetComputeUnitPrice (microLamports per CU)
    ├── 0 priority: may not be included in busy blocks
    └── 10,000+ microLamports/CU: likely included
```

## Solana Architecture Components

| Component | Purpose | Key Characteristics |
|-----------|---------|---------------------|
| Proof of History (PoH) | Global timestamp / sequence | SHA-256 sequential hashing, verifiable delay |
| Tower BFT | Consensus | Optimistic confirmation, ~400ms slot time |
| Turbine | Block propagation | Fragmented block propagation tree |
| Gulf Stream | Mempool replacement | Forward transaction forwarding, no mempool |
| SeaLevel | Runtime | Parallel transaction execution (read/write sets) |
| Cloudbreak | Account database | Memory-mapped account storage |
| Pipelining | Transaction processing | GPU-optimized signature verification |

### Proof of History (PoH)
```rust
// PoH: Sequential SHA-256 hashing creates a verifiable delay
// Each hash output is the input for the next hash
// This proves time elapsed between events
struct PohEntry {
    hash: Hash,       // SHA-256(previous_hash, event_data)
    event_data: Option<Vec<u8>>,
    num_hashes: u64,  // Number of hashes in this batch
}

// Leader tick: ~100ms of PoH hashes
// Slots: each slot = 4 ticks = ~400ms
// Epoch: 432,000 slots = ~2.5 days
```

### Tower BFT
```rust
// Optimistic confirmation: validator confirms block after observing
// 2/3+ stake-weighted votes for the same block
// Switch to Tower BFT voting when PoH fork detected

// Voting process:
// 1. Receive block via Turbine
// 2. Execute transactions through SeaLevel
// 3. Compute new bank state hash
// 4. Sign and send vote to leader
// 5. Leader aggregates votes, includes in block

// Fork resolution: PoH provides total ordering
// Tower: each vote locks out earlier slots
// Weight: by stake (more stake = more voting power)
```

### Turbine Block Propagation
```rust
// Turbine: tree-based block propagation
// Block is split into 64 packets (2/3 data, 1/3 parity for erasure coding)
// Each validator forwards to next 2+ peers in tree
// Depth: O(log N) where N = validator count
// Latency: ~500ms for entire network (~2,000 validators)

// Retransmission:
// If neighbor doesn't ACK within 200ms, retransmit to alternative peer
// Erasure coding allows reconstruction even with packet loss
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

### Error Handling Pattern
```rust
#[error_code]
pub enum MyError {
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Unauthorized signer")]
    Unauthorized,
    #[msg("Arithmetic overflow")]
    ArithmeticError,
    #[msg("Invalid account state")]
    InvalidAccountState,
}

pub fn checked_operation(ctx: Context<Op>, amount: u64) -> Result<()> {
    let account = &mut ctx.accounts.my_account;
    require!(account.data >= amount, MyError::InsufficientFunds);
    require!(!account.frozen, MyError::InvalidAccountState);

    account.data = account.data
        .checked_sub(amount)
        .ok_or(MyError::ArithmeticError)?;

    Ok(())
}
```

## Testing with Anchor

### TypeScript Test Suite
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

  it("checks unauthorized access", async () => {
    const [myAccountPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("my_account"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    const otherUser = anchor.web3.Keypair.generate();
    try {
      await program.methods
        .update(new anchor.BN(99))
        .accounts({ myAccount: myAccountPda })
        .signers([otherUser])
        .rpc();
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e.message).to.contain("Unauthorized");
    }
  });

  it("simulates mainnet fork", async () => {
    // Use mainnet fork for testing real protocol interactions
    const connection = new anchor.web3.Connection("https://api.mainnet-beta.solana.com");
    // ... fork test implementation
  });
});
```

### Compute Budget Testing
```typescript
it("measures compute units", async () => {
  // Add compute budget tracking
  const computeBudget = anchor.web3.ComputeBudgetProgram;
  const ix = computeBudget.setComputeUnitLimit({ units: 400_000 });

  const tx = new anchor.web3.Transaction().add(ix);
  tx.add(
    await program.methods
      .initialize(new anchor.BN(42))
      .accounts({ myAccount: myAccountPda })
      .instruction()
  );

  const result = await anchor.web3.sendAndConfirmTransaction(
    provider.connection,
    tx,
    [provider.wallet.payer]
  );

  const postCUs = await provider.connection.getTransaction(
    result,
    { commitment: "confirmed", maxSupportedTransactionVersion: 0 }
  );
  console.log("CU consumed:", postCUs?.meta?.computeUnitsConsumed);
});
```

## SPL Token Program

### Token Operations
```typescript
// SPL Token CLI patterns
// Create mint: spl-token create-token
// Create account: spl-token create-account <MINT>
// Mint: spl-token mint <MINT> <AMOUNT> <ACCOUNT>
// Transfer: spl-token transfer <MINT> <AMOUNT> <DESTINATION>

// Programmatic ATA creation
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

const ata = getAssociatedTokenAddressSync(mint, owner);
// Automatically creates ATA if it doesn't exist
// ATA is deterministic: one ATA per mint per owner
```

### Token Metadata (Metaplex)
```rust
// Metaplex Token Metadata program
// Store NFT metadata: name, symbol, URI, creators, royalties
// Master Edition: NFT collection with limited print supply

#[derive(BorshSerialize, BorshDeserialize)]
pub struct Metadata {
    pub key: Key,
    pub update_authority: Pubkey,
    pub mint: Pubkey,
    pub name: String,          // 32 chars max
    pub symbol: String,        // 10 chars max
    pub uri: String,           // 200 chars max
    pub seller_fee_basis_points: u16,  // Royalty basis points
    pub creators: Option<Vec<Creator>>,
    pub primary_sale_happened: bool,
    pub is_mutable: bool,
}
```

## Solana Ecosystem

### Key Protocols
| Protocol | Category | Description |
|----------|----------|-------------|
| Jupiter | DEX Aggregator | Routes swaps across all Solana AMMs |
| Raydium | AMM | Central limit order book + AMM liquidity |
| Metaplex | NFT | Token metadata, Candy Machine (NFT launchpad) |
| Marinade | LSD | mSOL liquid staking derivative |
| Pyth | Oracle | Low-latency price feeds |
| Switchboard | Oracle | Custom oracle solutions |
| Helius | RPC/Infra | Solana RPC, webhooks, digital asset APIs |
| Phantom | Wallet | Most popular Solana wallet |

## Security Considerations

### Solana-Specific Vulnerabilities
| Vulnerability | Description | Prevention |
|---------------|-------------|------------|
| Account confusion | Passing wrong account type | Anchor typed accounts, not AccountInfo |
| Missing signer check | Not verifying signer on privileged ops | Use Signer type in Anchor |
| PDA seed collision | Two PDAs with same seeds but different meanings | Unique seed prefixes per PDA type |
| Rent confusion | Not funding account rent | Use Anchor init constraint |
| Arbitrary CPI | Calling untrusted programs | Verify program_id in CPI context |
| Reinitialization | Re-initializing existing account | Anchor init checks discriminator |
| Integer overflow | Overflow in unchecked arithmetic | Use checked_add, checked_sub |
| Compute budget exhaustion | Exceed 200K CU limit | Profile and optimize compute usage |

## Deployment

### Program Deployment Checklist
- [ ] Test on localnet first (solana-test-validator)
- [ ] Deploy to devnet, verify with anchor test
- [ ] Set upgrade authority to multi-sig (Squads)
- [ ] Consider immutable program after final audit
- [ ] Publish IDL for client SDK generation
- [ ] Verify build is deterministic (solana-verify)
- [ ] Configure program-derived addresses correctly
- [ ] Fund all PDA accounts with rent exemption

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
11. Use checked arithmetic (checked_add, checked_sub) for all math operations
12. Verify program_id in CPI contexts to prevent arbitrary program calls
13. Use unique PDA seed prefixes for each account type to prevent seed collisions
14. Anchor's init constraint automatically prevents reinitialization
15. Account validation should happen before any state modification

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
  - references/solana-poh-deep-dive.md — Solana Proof of History Deep Dive

## Phase
blockchain → blockchain-solana
