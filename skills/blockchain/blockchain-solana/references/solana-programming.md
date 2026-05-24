# Solana Programming

## Account Model

Solana accounts are the fundamental storage primitive. Every program owns accounts and can modify only those it owns.

### Account Types

```
Owner account (System Program)
└── System-owned accounts (wallets, PDAs)

Program account (BPF Loader)
└── Program-owned accounts (token accounts, mint accounts, custom state)
```

### Account Attributes

```rust
struct AccountInfo {
    key: Pubkey,             // account address
    lamports: u64,           // SOL balance (1 SOL = 1e9 lamports)
    data: Vec<u8>,           // serialized state
    owner: Pubkey,           // program that owns this account
    executable: bool,        // true if this is a program
    rent_epoch: Epoch,       // rent epoch
    is_signer: bool,         // tx signature matches this key
    is_writable: bool,       // declared writable in tx
}
```

### Anchor Account Constraints

```rust
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateUser<'info> {
    // init: creates account via CPI to System Program
    // payer: who pays rent-exemption
    // space: 8 (discriminator) + data size
    #[account(init, payer = authority, space = 8 + 32 + 8)]
    pub user: Account<'info, User>,

    // mut: account must be marked writable
    #[account(mut)]
    pub authority: Signer<'info>,

    // has_one: verifies authority matches stored field
    #[account(mut, has_one = authority)]
    pub vault: Account<'info, Vault>,

    // Seeds constraint: verifies address was derived from seeds
    // bump: stores bump seed in the account
    #[account(
        seeds = [b"escrow", authority.key().as_ref()],
        bump,
    )]
    pub escrow: Account<'info, Escrow>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}
```

## Anchor Framework

### Program Structure

```rust
use anchor_lang::prelude::*;

declare_id!("YourProgramID1111111111111111111111111111111111");

#[program]
pub mod solana_program {
    use super::*;

    pub fn create_pool(ctx: Context<CreatePool>, fee: u16) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.fee = fee;
        pool.total_staked = 0;
        emit!(PoolCreated {
            pool: pool.key(),
            authority: pool.authority,
        });
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        // Compute-budget-safe checked math
        let pool = &mut ctx.accounts.pool;
        pool.total_staked = pool
            .total_staked
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreatePool<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 2 + 8, seeds = [b"pool", authority.key().as_ref()], bump)]
    pub pool: Account<'info, Pool>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [b"pool", authority.key().as_ref()], bump)]
    pub pool: Account<'info, Pool>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Pool {
    pub authority: Pubkey,
    pub fee: u16,          // basis points
    pub total_staked: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Unauthorized access")]
    Unauthorized,
}

#[event]
pub struct PoolCreated {
    pub pool: Pubkey,
    pub authority: Pubkey,
}
```

## PDA Derivation

Program Derived Addresses (PDAs) are addresses off the Ed25519 curve (no private key — controlled by program).

```rust
// Find PDA — O(1) deterministic
let seeds = &[
    b"escrow".as_ref(),
    user.key().as_ref(),
    &[nonce.to_le_bytes()].as_ref(),
];
let (pda, bump) = Pubkey::find_program_address(seeds, program_id);

// Anchor — automatic derivation with bump seed
#[account(
    seeds = [b"escrow", user.key().as_ref(), nonce.to_le_bytes().as_ref()],
    bump
)]
pub escrow: Account<'info, Escrow>,
```

### PDA Seed Best Practices

```
Good seeds:     b"user", user_pubkey_bytes
                b"vault", mint_pubkey_bytes, owner_pubkey_bytes
                b"position", owner_pubkey_bytes, position_id_bytes

Bad seeds:      random numbers (makes derivation non-deterministic)
                user-controlled strings without length prefix
                dynamic arrays without fixed-length prefix (may collide)
```

## Cross-Program Invocation (CPI)

Calling one program from another.

### Token Program CPI

```rust
use anchor_spl::token::{self, MintTo, Transfer};

// Mint tokens
pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
    let seeds = &[b"mint_authority".as_ref(), &[ctx.bumps.mint_authority]];
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.destination.to_account_info(),
                authority: ctx.accounts.mint_authority.to_account_info(),
            },
            &[seeds],
        ),
        amount,
    )?;
    Ok(())
}

// Transfer SPL tokens
pub fn transfer_tokens(ctx: Context<TransferSPL>, amount: u64) -> Result<()> {
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
pub struct TransferSPL<'info> {
    #[account(mut)]
    pub from: Account<'info, token::TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, token::TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
```

### Custom Program CPI

```rust
// Target program declares interface
pub mod other_program {
    use anchor_lang::prelude::*;

    #[derive(Accounts)]
    pub struct DoWork<'info> {
        pub worker: Signer<'info>,
    }

    pub fn do_work(ctx: Context<DoWork>, data: u64) -> Result<()> {
        // ...
        Ok(())
    }
}

// Calling program invokes via CPI
use other_program::program::OtherProgram;

pub fn call_other(ctx: Context<CallOther>, data: u64) -> Result<()> {
    other_program::do_work(
        CpiContext::new(
            ctx.accounts.other_program.to_account_info(),
            other_program::DoWork {
                worker: ctx.accounts.worker.to_account_info(),
            },
        ),
        data,
    )?;
    Ok(())
}
```

## SPL Tokens

### Token Standards

| Standard | Description | Example |
|----------|-------------|---------|
| SPL Token | Fungible tokens (ERC-20 equivalent) | USDC, USDT, SRM |
| SPL Token-2022 | Extension token program with transfer fees, confidential transfers, metadata | New token launches |
| SPL Associated Token Account | Deterministic token account per wallet-mint pair | All SPL holdings |

### Associated Token Account (ATA)

```rust
// ATA derivation — deterministic, no seed search needed
fn associated_token_address(wallet: &Pubkey, mint: &Pubkey) -> Pubkey {
    let seeds = &[
        wallet.as_ref(),
        token::ID.as_ref(),
        mint.as_ref(),
    ];
    Pubkey::find_program_address(seeds, &spl_associated_token_account::ID).0
}

// Anchor — create ATA
#[derive(Accounts)]
pub struct CreateATA<'info> {
    #[account(
        init,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
    pub token_account: Account<'info, token::TokenAccount>,
    pub authority: Signer<'info>,
    pub mint: Account<'info, token::Mint>,
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
```

### Raw SPL Token Operations

```rust
// Create mint (requires rent-exempt balance)
use spl_token::instruction as token_ix;

let ix = token_ix::initialize_mint(
    &spl_token::ID,
    &mint_pubkey,
    &authority_pubkey,
    Some(&freeze_authority_pubkey),  // optional freeze authority
    9,  // decimals
)?;
```

## Rent Exemption

All accounts must maintain a minimum SOL balance covering 2 years of rent.

```rust
// Calculate rent-exempt minimum
let rent = Rent::default();
let min_balance: u64 = rent.minimum_balance(data_size);

// In Anchor — automatically handled with init and space
#[account(init, payer = authority, space = size)]
```

If an account's balance drops below rent-exempt minimum, it becomes eligible for rent collection and deletion.
