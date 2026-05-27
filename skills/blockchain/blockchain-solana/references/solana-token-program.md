# Solana Token Program

## SPL Token Creation

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod token_launcher {
    use super::*;

    pub fn create_token(
        ctx: Context<CreateToken>,
        decimals: u8,
        total_supply: u64,
    ) -> Result<()> {
        let mint = &ctx.accounts.mint;
        let token_program = &ctx.accounts.token_program;

        // Initialize mint account
        let cpi_accounts = token::InitializeMint {
            mint: mint.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(token_program.to_account_info(), cpi_accounts);
        token::initialize_mint(cpi_ctx, decimals, &ctx.accounts.authority.key(), None)?;

        // Mint initial supply to authority
        let cpi_accounts = token::MintTo {
            mint: mint.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(token_program.to_account_info(), cpi_accounts);
        token::mint_to(cpi_ctx, total_supply)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        mint::decimals = decimals,
        mint::authority = authority,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        token::mint = mint,
        token::authority = authority,
    )]
    pub destination: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
```

## Token Transfer

```rust
pub fn transfer_tokens(
    ctx: Context<TransferTokens>,
    amount: u64,
) -> Result<()> {
    let cpi_accounts = token::Transfer {
        from: ctx.accounts.from.to_account_info(),
        to: ctx.accounts.to.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
    );
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}

#[derive(Accounts)]
pub struct TransferTokens<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
```

## Key Points

- Use Anchor framework for Solana program development
- Use SPL Token program for fungible tokens
- Use SPL Token Metadata for NFT metadata
- Derive PDA addresses with `findProgramAddress`
- Use CPI (Cross-Program Invocation) for token operations
- Handle account validation with Anchor constraints
- Use `#[account]` for account type safety
- Implement authority-based access control
- Use rent exemption for account storage
- Test with Solana local validator
- Use `solana-test-validator` for integration tests
- Deploy with `anchor deploy` command
