# Rust Smart Contracts

## Solana (Anchor Framework)

### Anchor Program Structure

```rust
use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod my_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, amount: u64) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = amount;
        counter.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = counter.count.checked_add(1).unwrap();
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + 8 + 32)]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut, has_one = authority)]
    pub counter: Account<'info, Counter>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Counter {
    pub count: u64,
    pub authority: Pubkey,
}
```

### Solana Account Model

```rust
// Rent exemption: 2 years of rent SOL upfront
// Account size determines rent-exempt balance

// Create account with PDA (Program Derived Address)
fn create_pda(ctx: Context<CreatePda>, bump: u8) -> Result<()> {
    let seeds = &[b"seed".as_ref(), &[bump]];
    let (pda, _bump) = Pubkey::find_program_address(seeds, ctx.program_id);
    Ok(())
}
```

### CPI (Cross-Program Invocation)

```rust
// Solana token program CPI
use anchor_spl::token::{self, Transfer};

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
```

### Error Handling

```rust
#[error_code]
pub enum MyError {
    #[msg("Counter overflow")]
    Overflow,
    #[msg("Unauthorized authority")]
    Unauthorized,
}

pub fn capped_increment(ctx: Context<Increment>, max: u64) -> Result<()> {
    require!(ctx.accounts.counter.count < max, MyError::Overflow);
    ctx.accounts.counter.count = ctx.accounts.counter.count.checked_add(1).unwrap();
    Ok(())
}
```

## NEAR Protocol

### NEAR Contract

```rust
use near_sdk::{near, PanicOnDefault};

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Counter {
    pub count: u64,
}

#[near]
impl Counter {
    #[init]
    pub fn new() -> Self {
        Self { count: 0 }
    }

    pub fn increment(&mut self) {
        self.count += 1;
    }

    pub fn get_count(&self) -> u64 {
        self.count
    }
}
```

### NEAR Cross-Contract

```rust
#[near]
impl Counter {
    pub fn call_other(&self, contract_id: AccountId) -> Promise {
        ext_other::ext(contract_id)
            .with_static_gas(Gas::from_tgas(10))
            .some_method()
    }
}
```

## Polkadot (ink!)

```rust
#[ink::contract]
mod incrementer {
    #[ink(storage)]
    pub struct Incrementer {
        value: i32,
    }

    impl Incrementer {
        #[ink(constructor)]
        pub fn new(init_value: i32) -> Self {
            Self { value: init_value }
        }

        #[ink(message)]
        pub fn inc(&mut self, by: i32) {
            self.value += by;
        }

        #[ink(message)]
        pub fn get(&self) -> i32 {
            self.value
        }
    }
}
```

## Security Patterns (Rust)

### Integer Overflow

```rust
// Anchor — use checked_* methods
pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
    let from = &mut ctx.accounts.from;
    from.amount = from.amount.checked_sub(amount).ok_or(ErrorCode::Overflow)?;
    let to = &mut ctx.accounts.to;
    to.amount = to.amount.checked_add(amount).ok_or(ErrorCode::Overflow)?;
    Ok(())
}
```

### Signer Verification

```rust
// Anchor enforces signer checks via Account types
// But for manual verification:
fn verify_admin(admin: &AccountInfo, expected: &Pubkey) -> Result<()> {
    require!(admin.is_signer, ErrorCode::SignatureMissing);
    require_keys_eq!(admin.key(), expected, ErrorCode::Unauthorized);
    Ok(())
}
```

### Account Closure

```rust
// Close account and reclaim rent
#[derive(Accounts)]
pub struct CloseAccount<'info> {
    #[account(mut, close = receiver)]
    pub account: Account<'info, Data>,
    pub receiver: SystemAccount<'info>,
}
```
