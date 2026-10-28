# Native Solana Programs Without Anchor

Writing Solana programs directly against `solana-program` (or lighter alternatives such as Pinocchio): entrypoint and instruction dispatch, explicit account validation, Borsh-serialized state, PDA creation, CPI, and the security checks Anchor normally generates for you. Anchor usage is covered in `solana-programming.md`; runtime limits in `solana-runtime.md`.

## When to Go Native

| Reason | Detail |
|--------|--------|
| Compute units | Avoid framework overhead (account deserialization, discriminator checks) in hot programs |
| Binary size / control | Custom serialization, zero-copy layouts |
| Learning / auditing | Understand what Anchor constraints compile to |

Trade-off: every check Anchor derives from `#[account(...)]` constraints becomes your responsibility. Most missed-check vulnerabilities in Solana audits come from exactly these checks.

## Project Setup

```toml
# Cargo.toml
[package]
name = "counter"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]

[dependencies]
solana-program = "2"
borsh = { version = "1", features = ["derive"] }
thiserror = "1"

[features]
no-entrypoint = []
```

Build and deploy:

```bash
cargo build-sbf
solana program deploy target/deploy/counter.so --url devnet
```

## Entrypoint and Dispatch

```rust
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};

#[derive(BorshSerialize, BorshDeserialize)]
pub enum CounterInstruction {
    Initialize,
    Increment { amount: u64 },
}

#[derive(BorshSerialize, BorshDeserialize, Default)]
pub struct Counter {
    pub authority: Pubkey,
    pub count: u64,
    pub bump: u8,
}

impl Counter {
    pub const LEN: usize = 32 + 8 + 1;
}

#[cfg(not(feature = "no-entrypoint"))]
entrypoint!(process_instruction);

pub fn process_instruction(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let ix = CounterInstruction::try_from_slice(data).map_err(|_| ProgramError::InvalidInstructionData)?;
    match ix {
        CounterInstruction::Initialize => initialize(program_id, accounts),
        CounterInstruction::Increment { amount } => increment(program_id, accounts, amount),
    }
}
```

Borsh-encoded enums use a one-byte variant index; Anchor instead uses an 8-byte discriminator derived from the instruction name. Pick one scheme and keep it stable across upgrades.

## Creating a PDA Account

```rust
fn initialize(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let iter = &mut accounts.iter();
    let authority = next_account_info(iter)?;
    let counter = next_account_info(iter)?;
    let system_program = next_account_info(iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if *system_program.key != solana_program::system_program::ID {
        return Err(ProgramError::IncorrectProgramId);
    }

    let (expected, bump) = Pubkey::find_program_address(&[b"counter", authority.key.as_ref()], program_id);
    if *counter.key != expected {
        return Err(ProgramError::InvalidSeeds);
    }
    if !counter.data_is_empty() {
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    let lamports = Rent::get()?.minimum_balance(Counter::LEN);
    invoke_signed(
        &system_instruction::create_account(authority.key, counter.key, lamports, Counter::LEN as u64, program_id),
        &[authority.clone(), counter.clone(), system_program.clone()],
        &[&[b"counter", authority.key.as_ref(), &[bump]]],
    )?;

    let state = Counter { authority: *authority.key, count: 0, bump };
    state.serialize(&mut &mut counter.data.borrow_mut()[..])?;
    msg!("counter initialized");
    Ok(())
}
```

- Store the canonical bump and reuse it with `create_program_address` later (cheaper than `find_program_address`).
- If an attacker can pre-fund the PDA address with lamports, `create_account` fails; robust programs use `transfer` + `allocate` + `assign` when the account already holds lamports.

## Mutating State with Full Validation

```rust
fn increment(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let iter = &mut accounts.iter();
    let authority = next_account_info(iter)?;
    let counter = next_account_info(iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if counter.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);           // owner check
    }
    if !counter.is_writable {
        return Err(ProgramError::InvalidAccountData);
    }

    let mut state = Counter::try_from_slice(&counter.data.borrow())
        .map_err(|_| ProgramError::InvalidAccountData)?;

    let expected = Pubkey::create_program_address(
        &[b"counter", authority.key.as_ref(), &[state.bump]], program_id,
    )?;
    if *counter.key != expected || state.authority != *authority.key {
        return Err(ProgramError::InvalidSeeds);                 // relationship check
    }

    state.count = state.count.checked_add(amount).ok_or(ProgramError::ArithmeticOverflow)?;
    state.serialize(&mut &mut counter.data.borrow_mut()[..])?;
    Ok(())
}
```

## Validation Checklist per Account

| Check | Anchor equivalent | Attack if missing |
|-------|-------------------|-------------------|
| `is_signer` | `Signer<'info>` | Anyone acts as the authority |
| `owner == program_id` (or expected program) | `Account<'info, T>` | Fake account with attacker-controlled data |
| Type discriminator / layout | Account discriminator | Type confusion between account kinds |
| PDA derivation (seeds + bump) | `seeds = [...], bump` | Substituted account |
| Field relationships (`state.authority == signer`) | `has_one = authority` | Acting on someone else's account |
| `is_writable` | `mut` | Silent no-op or runtime failure |
| Program IDs for CPI targets | `Program<'info, T>` | Arbitrary CPI to malicious program |
| Not already initialized | `init` | Re-initialization overwriting authority |
| Checked arithmetic | — | Overflow/underflow |

Add a discriminator byte (or 8 bytes) to every account type when a program has more than one, and check it before deserializing.

## CPI

- `invoke` for calls where signatures come from transaction signers; `invoke_signed` when your PDA must sign.
- Verify the target program ID before invoking.
- After a CPI that modifies an account you also hold, re-read its data; cached deserialized state is stale.
- CPI depth is limited (4 levels of nesting); account data reallocation has per-instruction limits (`realloc` up to 10 KiB growth per call).

## Errors

```rust
#[derive(thiserror::Error, Debug, Clone, Copy)]
pub enum CounterError {
    #[error("amount must be positive")]
    ZeroAmount,
}

impl From<CounterError> for ProgramError {
    fn from(e: CounterError) -> Self { ProgramError::Custom(e as u32) }
}
```

Clients see `Custom(n)`; publish the mapping (IDL or docs) so front ends can decode it.

## Testing

| Tool | Use |
|------|-----|
| `solana-program-test` (BanksClient) | In-process runtime tests in Rust |
| LiteSVM / Mollusk | Fast lightweight SVM tests |
| `solana-test-validator` | Full local validator with cloned mainnet accounts (`--clone`) |

Test every rejection path: missing signer, wrong owner, wrong PDA, reinitialization, overflow.

## Compute and Size Tips

- Request only the compute you need; log `sol_log_compute_units()` while optimizing.
- Avoid `find_program_address` in hot paths (it loops over bumps); store and reuse the bump.
- Consider zero-copy layouts (`bytemuck`) for large accounts to skip Borsh deserialization.

## Checklist

- [ ] Instruction data parsed with explicit error mapping
- [ ] Every account: signer, owner, writable, discriminator, PDA and relationship checks
- [ ] Canonical bump stored and reused
- [ ] CPI targets verified; state reloaded after CPI
- [ ] Checked arithmetic; custom errors documented
- [ ] Negative-path tests for each check
