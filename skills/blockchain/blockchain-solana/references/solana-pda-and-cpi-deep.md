# Solana: PDA and CPI Deep Dive

## Overview

Program Derived Addresses (PDAs) and Cross-Program Invocation (CPI) are the two most architecturally significant concepts in Solana smart contract development. PDAs enable programs to own and control accounts without needing a private key, enabling deterministic account derivation and programmatic authority. CPI enables programs to call other programs, creating the composability layer that powers the entire Solana DeFi ecosystem. Together, they form the foundation of Solana's parallel execution model and account-based architecture.

For the Solana developer, understanding the low-level mechanics of PDA derivation and CPI execution is essential for building secure, efficient programs. PDAs differ fundamentally from Ethereum-style address derivation—they are not public key hashes but program-specific addresses with explicit seed constraints. CPI involves a complex interaction of account privilege delegation, compute budget accounting, and error propagation that must be precisely managed. This reference covers the cryptographic and runtime details of both primitives.

## Core Architecture Concepts

### PDA Derivation Mathematics

A PDA is an address deterministically derived from a program ID and a set of seeds. The derivation algorithm ensures the address has no corresponding private key on the Ed25519 curve:

```
PDA = first_valid(R, program_id, seeds)
where R = hash(seeds || program_id || "ProgramDerivedAddress")
```

The algorithm:
1. Concatenate seeds + program ID + "ProgramDerivedAddress" domain separator
2. Hash with SHA-256 to produce a 256-bit output
3. Check if the hash corresponds to a valid Ed25519 point (i.e., lies on the curve)
4. If yes, increment a bump seed and repeat from step 1
5. The first hash that produces a non-curve-point is the valid PDA

```rust
// Anchor PDA derivation
pub fn find_program_address(seeds: &[&[u8]], program_id: &Pubkey) -> (Pubkey, u8) {
    let mut bump = 255u8;
    loop {
        let mut hasher = Hasher::default();
        for seed in seeds {
            hasher.hash(seed);
        }
        hasher.hash(&[bump]);
        hasher.hash(program_id.as_ref());
        hasher.hash(b"ProgramDerivedAddress");
        
        let hash = hasher.result();
        if !is_on_ed25519_curve(&hash) {
            return (Pubkey::new_from_array(hash.to_bytes()), bump);
        }
        bump = bump.wrapping_sub(1);
    }
}
```

The bump seed is stored in the account or derived on each invocation. Storing it saves compute units (avoids iterating from 255 every time).

### PDA Authority Model

PDAs have a flat authority model compared to Ethereum's nested mappings:

- A PDA is owned by exactly one program (the `owner` field in the AccountHeader)
- Only that program can modify the PDA's data
- The program can sign on behalf of the PDA using `invoke_signed`

```rust
// The program must derive the PDA with its own ID
// Only the owning program can use this PDA as a signer
let (pda, bump) = Pubkey::find_program_address(&[b"escrow", user.key.as_ref()], program_id);

// In the instruction handler, verify:
// 1. pda == expected_pda (derived from seeds)
// 2. escrow_account.owner == program_id
// 3. escrow_account.key == pda

// Sign with PDA via CPI
invoke_signed(
    &token_instruction,
    &[token_account, pda_account, authority],
    &[&[b"escrow", user.key.as_ref(), &[bump]]]  // PDA seeds + bump
);
```

### Cross-Program Invocation Mechanics

CPI enables program A to call program B with delegated authorities. The Solana runtime enforces strict privilege rules:

1. **Privilege escalation prevention**: A called program can only use privileges (signer, writable) that the caller has. It cannot gain new privileges.
2. **Signer delegation**: If program A is invoked with a signer account, program A can pass that signer privilege to program B via CPI.
3. **PDA signing**: Program A can sign as a PDA it owns, passing this signature to program B.
4. **Compute budget**: CPI consumes compute units (~200 CU per CPI frame). Deep CPI chains can exhaust the 200K CU limit.

```rust
// CPI with signer delegation
pub fn process_cpi_call(ctx: Context<CpiExample>) -> Result<()> {
    // ctx.accounts.token_program is writable, system_program is writable
    // This means the caller must have provided these as writable
    
    // Invoke Token Program's transfer instruction
    let transfer_ix = spl_token::instruction::transfer(
        ctx.accounts.token_program.key,
        ctx.accounts.source_token.key,
        ctx.accounts.destination_token.key,
        ctx.accounts.authority.key,  // This must be a signer
        &[],
        amount,
    )?;
    
    invoke(
        &transfer_ix,
        &[
            ctx.accounts.source_token.to_account_info(),
            ctx.accounts.destination_token.to_account_info(),
            ctx.accounts.authority.to_account_info(),
        ],
    )?;
    
    Ok(())
}
```

### CPI Context and Account Validation

Anchor's CPI pattern uses `CpiContext` to manage account validation and signer seeds:

```rust
// Anchor CPI pattern
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

pub fn transfer_tokens<'info>(
    from: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    authority: &AccountInfo<'info>,
    token_program: &Program<'info, Token>,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let cpi_accounts = Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
    };
    
    let cpi_program = token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts)
        .with_signer(signer_seeds);  // PDA signing
    
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}
```

## Architecture Decision Trees

```
Decide: PDA Seed Strategy
├── Seeds for global state (one per program)
│   ├── Use: [b"config"] or [b"global-state"]
│   ├── Bump: Always store bump in account data (no need to iterate)
│   └── Singleton pattern: only 0 or 1 of these accounts exist
├── Seeds for per-user state
│   ├── Use: [b"user-stats", user.key.as_ref()]
│   ├── Deterministic: Each user can compute their own PDA
│   └── Conflict: Ensure unique seeds per user space
├── Seeds for escrow/order (one per interaction)
│   ├── Use: [b"escrow", user.key.as_ref(), id.to_le_bytes().as_ref()]
│   ├── Require sequencing: Use incrementing ID or timestamp
│   └── Risk: Seed collision if ID reused
├── Seeds for authority delegation
│   ├── Use: [b"authority", delegate.key.as_ref(), resource.key.as_ref()]
│   ├── Composite: Multiple authorities can each have PDAs
│   └── Revocation: Delete PDA to revoke delegation
└── Seeds for token accounts (SPL Associated Token)
    ├── Use: [wallet.key.as_ref(), token_program.key.as_ref(), mint.key.as_ref()]
    ├── Standard: Follow SPL ATA exactly
    └── Deterministic: Each wallet has exactly one ATA per mint

Decide: CPI vs Direct Call
├── Simple token operation (transfer, mint, burn)?
│   └── CPI to SPL Token Program
│       ├── Standard interface, battle-tested
│       └── Pay ~200-500 CU for CPI overhead
├── Complex DeFi operation (swap, lend)?
│   └── CPI to protocol program (Raydium, Jupiter, Solend)
│       ├── Single CPI to aggregator (Jupiter)
│       └── Multiple CPIs for complex routes
├── Need atomic cross-program operations?
│   └── CPI within single transaction
│       ├── Max 4 levels of CPI depth
│       └── Account rebalancing/delegation within chain
└── State query only (no state modification)?
    └── Direct account data read
        ├── No CPI needed
        └── Read PDA data directly with account info
```

## Implementation Strategies

### PDA Account Management

Creating and managing PDA accounts requires careful attention to initialization and rent:

```rust
#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitializeEscrow<'info> {
    #[account(
        init,
        seeds = [b"escrow", authority.key.as_ref(), escrow_id.to_le_bytes().as_ref()],
        bump = bump,
        payer = authority,
        space = 8 + std::mem::size_of::<EscrowData>(),
    )]
    pub escrow: Account<'info, EscrowData>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
```

The `init` constraint auto-derives the PDA, creates the account, allocates space, and pays rent from the payer. The bump seed is passed as an instruction argument (computed off-chain using `findProgramAddress`).

### CPI Error Propagation

CPI errors must be carefully handled. Solana runtime returns errors from called programs as `ProgramError::Custom(code)`:

```rust
// Proper CPI error handling
match invoke(&instruction, &accounts) {
    Ok(()) => Ok(()),
    Err(e) => {
        // Log the CPI error for debugging
        msg!("CPI error: {:?}", e);
        
        // Re-raise with context
        match e {
            ProgramError::Custom(code) if code == spl_token::error::TokenError::InsufficientFunds as u32 => {
                Err(MyError::InsufficientFunds.into())
            }
            _ => Err(e.into()),
        }
    }
}
```

### Compute Budget Management

CPI chains consume compute units rapidly. Budget management:

```rust
// Check remaining compute units before CPI
let remaining = solana_program::sysvar::instructions::load_current_index_checked(
    &ctx.accounts.instructions.to_account_info()
)?;

// For deep CPI chains, request higher compute budget
use solana_program::compute_budget::ComputeBudget;
ComputeBudget::set_compute_unit_limit(400_000); // Max allowed
ComputeBudget::set_compute_unit_price(1_000);   // Priority fee in microlamports
```

## Integration Patterns

### SPL Token CPI Integration

The most common CPI pattern is interacting with SPL Token Program:

```rust
// CPI to SPL Token for transfer with PDA signing
pub fn pda_transfer(ctx: Context<PdaTransfer>, amount: u64) -> Result<()> {
    let cpi_program = ctx.accounts.token_program.to_account_info();
    
    let cpi_accounts = Transfer {
        from: ctx.accounts.source_token.to_account_info(),
        to: ctx.accounts.destination_token.to_account_info(),
        authority: ctx.accounts.pda_authority.to_account_info(),
    };
    
    let signer_seeds = &[
        b"vault",
        ctx.accounts.authority.key.as_ref(),
        &[ctx.accounts.vault.bump],
    ];
    
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts)
        .with_signer(&[signer_seeds]);
    
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}
```

### Jupiter Aggregator CPI

Jupiter accepts a route as accounts for CPI-based swap:

```rust
// Jupiter swap via CPI (simplified)
pub fn jupiter_swap(ctx: Context<JupiterSwap>, amount_in: u64, amount_out_min: u64) -> Result<()> {
    // Jupiter DEX program ID
    let jupiter_program = ctx.accounts.jupiter_program.to_account_info();
    
    let ix = jupiter::instruction::swap(
        &ctx.accounts.token_ledger,
        &ctx.accounts.user_source_token,
        &ctx.accounts.user_destination_token,
        &ctx.accounts.user_transfer_authority,
        &ctx.accounts.destination_token_account,
        ctx.remaining_accounts, // Route accounts
        amount_in,
        amount_out_min,
    )?;
    
    invoke(&ix, &ctx.remaining_accounts)?;
    Ok(())
}
```

## Performance Optimization

### Compute Unit Reduction

- **Store bump in account**: Deriving PDA from seed iterates up to 255 times. Storing the bump reduces compute from ~15,000 CU to ~200 CU per derivation.
- **Pre-validate accounts off-chain**: Do account filtering and validation in the client before submitting the transaction.
- **Minimize CPI depth**: Each CPI frame costs ~200 CU. Reduce nesting by combining operations into single CPIs.
- **Pack multiple operations**: Use `spl_token::instruction::sync_native` and `initialize_account` in the same transaction.

### Rent Optimization

PDA accounts must be rent-exempt. Compute minimum balance:

```typescript
const MIN_RENT = await connection.getMinimumBalanceForRentExemption(accountSize);
// For a 100-byte EscrowData: ~0.00144 SOL
// For a 165-byte TokenAccount: ~0.00204 SOL
```

Close accounts when done to reclaim rent, using Anchor's `close` constraint:

```rust
#[account(mut, close = authority)]
pub escrow: Account<'info, EscrowData>,
```

## Security Considerations

### PDA Seed Collision

If two different users can derive the same PDA, a race condition exists. Ensure seeds are unique per logical entity:

- **User-specific seeds**: Always include `user.key()` as a seed component
- **Counter seeds**: Use incrementing IDs (not timestamps—block timestamp manipulation possible)
- **Dual-key seeds**: For shared resources, include both parties' keys

### CPI Privilege Escalation

A malicious program called via CPI cannot escalate privileges beyond what the caller provided. However, the called program can:

1. **Write to writable accounts**: If an account is passed as writable to the CPI, the called program can arbitrarily modify it
2. **Debit signer authority**: If a signer is passed, the called program can sign on its behalf for other operations

Always validate account addresses before passing them to CPI:

```rust
// Validate SPL Token account ownership
require!(ctx.accounts.token_account.owner == ctx.accounts.authority.key());
// Validate token program ID
require!(ctx.accounts.token_program.key() == spl_token::ID);
```

### Reinitialization Attack

Closing and recreating the same PDA with different authority leads to reinitialization attacks. Use Anchor's `close` constraint with `has_one` checks:

```rust
#[account(
    mut,
    close = authority,
    has_one = authority,  // Can only close with matching authority
)]
pub escrow: Account<'info, EscrowData>,
```

## Common Pitfalls

### Wrong Bump Seed

Using the wrong bump seed in `invoke_signed` causes the CPI to fail with a signature error. Always use the same bump that was used to create the account.

### Account Not Initialized

Reading from a PDA that hasn't been initialized returns `AccountNotInitialized`. Check `account.data_is_empty()` or use Anchor's `init_if_needed` for idempotent initialization.

### Rent Not Covered

Creating a PDA without sufficient rent-exempt balance fails with `InsufficientFunds`. Always compute rent using `getMinimumBalanceForRentExemption`.

### CPI Depth Limit

The Solana runtime enforces a maximum CPI depth of 4. A program calling a program calling another program uses 2 depth levels—only 2 more nested CPIs are possible.

### Missing Signer in CPI

When calling a program that requires a signer (e.g., Token Program's transfer), the signer must be provided in the account list and either:
- Be an actual transaction signer, or
- Be signed via PDA with `invoke_signed` and correct seeds

## Key Takeaways

- PDAs are non-private-key addresses derived from program ID + seeds + bump—only the owning program can sign with them
- CPI is Solana's composability mechanism, enabling programs to call each other with delegated privileges
- The bump seed should be stored in the account to avoid recomputing the PDA derivation (saves ~15K CU)
- CPI depth is limited to 4 levels; plan your call chain architecture accordingly
- CPI privilege rules prevent privilege escalation but allow signer delegation and PDA signing
- Anchor's CPI context pattern (`CpiContext::new`) handles account validation and PDA signing automatically
- Rent-exempt lamports must be provided at PDA creation—close accounts to reclaim rent
- Solana's 200K compute unit limit constrains deep CPI chains—use `ComputeBudgetProgram` to manage budget
- Reinitialization attacks are prevented by `has_one` constraints and proper `close` usage
- Account validation before CPI is mandatory—check ownership, address derivation, and writability
