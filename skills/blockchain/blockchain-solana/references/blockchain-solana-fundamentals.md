# Blockchain Solana Fundamentals

## Solana Architecture

### Proof of History (PoH)
A sequence of SHA-256 hashes where each hash is the hash of the previous hash plus some event data. PoH creates a verifiable timeline: the position in the sequence proves time elapsed. Tower BFT uses PoH as a clock for consensus. PoH enables parallel transaction processing (SeaLevel).

### Account Model
Everything in Solana is an account: user wallets, token balances, programs (smart contracts), and data stores. Accounts have: owner (program that can modify it), data (arbitrary bytes), lamports (SOL balance), executable flag, rent epoch.

### SeaLevel (Parallel Execution)
Solana's parallel runtime. Transactions declare all accounts they will read/write. Non-overlapping transactions execute in parallel using GPU-style threading. Overlapping transactions execute sequentially. This enables high throughput (theoretically 50K+ TPS).

## Anchor Framework

### Account Validation
```rust
#[derive(Accounts)]
pub struct CreateUser<'info> {
    #[account(init, payer = user, space = 8 + User::INIT_SPACE,
              seeds = [b"user", user.key().as_ref()], bump)]
    pub user_account: Account<'info, User>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

### Constraints
- `#[account(init)]`: Creates PDA, pays rent
- `#[account(mut)]`: Account will be modified
- `#[account(has_one = authority)]`: Validate field matches
- `#[account(seeds = [...], bump)]`: PDA derivation
- `#[account(close = destination)]`: Close account, reclaim rent

## SPL Token Standard

### Token Account Model
Each user has a token account for each mint they hold. Associated Token Account (ATA) is the default: deterministic PDA from (owner, mint). ATAs eliminate the need to create token accounts manually for each new token.

### Token Operations
- `initializeMint`: Create new token with decimals, mint authority
- `initializeAccount`: Create token account for a mint
- `mintTo`: Mint new tokens (requires mint authority)
- `transfer`: Transfer tokens between accounts
- `burn`: Destroy tokens
- `closeAccount`: Close empty token account, reclaim rent
