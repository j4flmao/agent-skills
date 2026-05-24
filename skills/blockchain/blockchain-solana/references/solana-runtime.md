# Solana Runtime

## BPF Loaders

Solana programs are compiled to Berkeley Packet Filter (BPF) bytecode (eBPF variant). Multiple loaders handle deployment and execution.

### Loader Versions

| Loader | Description | Status |
|--------|-------------|--------|
| BPF Loader v1 | Original loader (`BPFLoader1111111111111111111111111111111111`) | Deprecated |
| BPF Loader v2 | Added upgradeability (`BPFLoader2111111111111111111111111111111111`) | Active |
| BPF Loader v3 | Supports deploy with ELF, replaces v2 (`BPFLoaderUpgradeab1e11111111111111111111111`) | Default |

### Deployment Flow

```
.elf file (compiled Rust/BPF)
        │
        ▼
solana program deploy
        │
        ▼
BPF Loader processes:
1. Validate ELF header
2. Verify BPF instructions (no invalid opcodes, bounded jumps)
3. Create ProgramData account (holds upgrade authority)
4. Deploy program to Program executable account
5. Emit UpgradeableLoader event
```

```rust
// ProgramData account layout
struct ProgramData {
    slot: Slot,                    // deployment slot
    upgrade_authority: Pubkey,     // can be None for immutable
    // raw ELF bytes follow
}

// Program executable account
struct ProgramExecutable {
    // Points to ProgramData account
    programdata_address: Pubkey,
}
```

## Compute Budget

Each Solana transaction has a **compute budget** — the total compute units available.

### Limits

| Resource | Limit |
|----------|-------|
| Max compute units per tx | 200,000 (default: 200K, can request up to 1.4M) |
| Max heap per execution | 32 KB |
| Max call stack depth | 64 frames |
| Max accounts per tx | 64 (writable) + 64 (readable) = 128 |
| Max return data size | 1024 bytes |
| Max transaction size | 1232 bytes (after base58 → 1.2 KB raw) |

### Compute Unit Costs

| Operation | CU Cost | Notes |
|-----------|---------|-------|
| BPF instruction | 1 | Per bytecode op |
| SHA256 hash | ~50 | Variable by input |
| Sysvar access | ~100 | Reading Clock, Rent, etc. |
| Account read | ~100 | Fetch account from bank |
| Account write | ~500 | Include in block |
| CPI call | ~500 | Per CPI invocation |
| Create account | ~5000 | System program CPI |

### Compute Budget Instructions

```rust
use solana_sdk::compute_budget::ComputeBudgetInstruction;

// Request higher compute budget
let ix = ComputeBudgetInstruction::set_compute_unit_limit(400_000);

// Prioritization fee (micro-lamports per CU)
let ix = ComputeBudgetInstruction::set_compute_unit_price(5_000);
// At 5,000 micro-lamports/CU × 400K CU = 2,000,000 micro-lamports = 0.002 SOL

// Heap frame size (default 32KB, can shrink to save)
let ix = ComputeBudgetInstruction::request_heap_frame(16_384);
```

### Optimization Strategies

```
❌ AVOID:              ✅ PREFER:
   Loops > 1000 iter      Bounded loops with early exit
   Nested CPI calls       Single CPI with batch data
   Dynamic allocations    Static account sizes
   Re-reading sysvars     Cache sysvar data in instruction
   String formatting      Fixed-size byte arrays
```

## Rent & Rent Exemption

### Rent Economics

```
Account rent = (data_size + 128) × rent_rate_per_byte_epoch
rent_rate = 0.000003 SOL per byte per year (approx)

Rent-exempt = rent × 2 years (paid once, never collected again)
```

### Rent Examples

| Data Size | Rent-Exempt Balance |
|-----------|---------------------|
| 0 bytes (wallet) | 0.000890880 SOL |
| 165 bytes (SPL token account) | 0.002039280 SOL |
| 1000 bytes (custom program state) | ~0.005 SOL |
| 10000 bytes (large program state) | ~0.044 SOL |

If an account holds less than the rent-exempt minimum, rent is **collected** at every epoch boundary. If balance reaches 0, the account is **purged**.

## Sysvars

Read-only system accounts providing on-chain state.

```rust
/// Clock — slot time, epoch, unix timestamp
/// Address: SysvarC1ock11111111111111111111111111111111
struct Clock {
    slot: Slot,
    epoch_start_timestamp: i64,
    epoch: Epoch,
    leader_schedule_epoch: Epoch,
    unix_timestamp: i64,
}

/// Rent — rent parameters
/// Address: SysvarRent111111111111111111111111111111111
struct Rent {
    lamports_per_byte_year: u64,
    exemption_threshold: f64,  // 2.0 = 2 years
    burn_percent: u8,
}

/// EpochSchedule — epoch boundaries
/// Address: SysvarEpochSchedu1e111111111111111111111111111
struct EpochSchedule {
    slots_per_epoch: u64,       // ~432,000
    leader_schedule_slot_offset: u64,
    warmup: bool,
    first_normal_epoch: Epoch,
    first_normal_slot: Slot,
}

/// Fees — fee parameters
/// Address: SysvarFees111111111111111111111111111111111
struct Fees {
    fee_rate_governor: FeeRateGovernor,
}
```

### Accessing Sysvars in Anchor

```rust
pub fn read_clock(ctx: Context<ReadClock>) -> Result<()> {
    let clock = Clock::get()?;
    msg!("Current slot: {}, timestamp: {}", clock.slot, clock.unix_timestamp);
    Ok(())
}

pub fn read_rent(ctx: Context<ReadRent>) -> Result<()> {
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(165);
    msg!("Min balance for 165 bytes: {} lamports", min_balance);
    Ok(())
}
```

## Epoch Schedule

```
Epoch 0:      432,000 slots (~2 days)
Epoch 1+:     432,000 slots (~2 days)
Warmup epochs: First epochs are shorter (1, 2, 4, 8, ... up to normal)

Current epoch ≈ N (varies by cluster)
Slots per epoch ≈ 432,000
Slot time ≈ 400ms
Epoch duration ≈ 2 days
```

## Transaction Lifecycle

```
1. Client constructs tx (instructions, signers, recent blockhash)
2. Client sends to RPC node
3. RPC forwards to current and next leader via Gulf Stream
4. Leader enters slot (bank is created)
5. Leader records PoH tick stream
6. Leader executes transactions in SeaLevel (parallel where possible)
7. Leader collects fees and votes
8. Leader broadcasts block via Turbine
9. Validators replay and vote
10. After 2/3+ stake confirmed → block is finalized
11. Blockhash expires after MAX_RECENT_BLOCKHASHES (~151 slots)
```

### Transaction Structure

```rust
struct Transaction {
    signatures: Vec<Signature>,   // Ed25519 signatures
    message: Message,
}

struct Message {
    header: MessageHeader,         // num required sigs, readonly sigs, readonly non-sigs
    account_keys: Vec<Pubkey>,     // all accounts involved
    recent_blockhash: Hash,        // prevents replay (valid for ~151 slots)
    instructions: Vec<CompiledInstruction>,
}

struct CompiledInstruction {
    program_id_index: u8,          // index into account_keys
    accounts: Vec<u8>,             // indices into account_keys
    data: Vec<u8>,                 // instruction data (borsh-serialized)
}
```

### Blockhash Expiry

```
RecentBlockhashes sysvar:
- Stores last MAX_RECENT_BLOCKHASHES (151) blockhashes
- Each valid for ~60 seconds (~151 × 400ms)
- After expiry: transaction rejected
- Solution: requery `getRecentBlockhash` and resign
```
