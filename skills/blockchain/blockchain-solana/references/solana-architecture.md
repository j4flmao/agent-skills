# Solana Architecture

## Proof of History (PoH)

PoH is a Verifiable Delay Function (VDF) that produces a sequence of ticks proving time has passed between events. It is Solana's clock.

### Algorithm

```
State = SHA256(seed)
loop {
  Output += SHA256(State) || State
  State = SHA256(State)
}
```

The output is a hash chain where each hash depends on the previous, making it:
- **Sequential**: Each tick depends on the prior — impossible to parallelize
- **Verifiable**: Replaying N hashes confirms N ticks elapsed
- **Deterministic**: Same seed produces same chain

### Rust PoH Simulation

```rust
use sha2::{Sha256, Digest};

#[derive(Clone)]
struct PohEntry {
    hash: [u8; 32],
    num_hashes: u64,
}

struct Poh {
    state: [u8; 32],
    tick_height: u64,
}

impl Poh {
    fn new(seed: [u8; 32]) -> Self {
        Self { state: seed, tick_height: 0 }
    }

    fn tick(&mut self) -> PohEntry {
        let mut hasher = Sha256::new();
        hasher.update(&self.state);
        let hash = hasher.finalize().into();
        let entry = PohEntry { hash, num_hashes: 1 };
        self.state = hash;
        self.tick_height += 1;
        entry
    }

    fn mix_in(&mut self, data: &[u8]) {
        let mut hasher = Sha256::new();
        hasher.update(&self.state);
        hasher.update(data);
        self.state = hasher.finalize().into();
    }

    fn verify(seed: [u8; 32], entries: &[PohEntry]) -> bool {
        let mut state = seed;
        for entry in entries {
            // Replay exactly entry.num_hashes hashes
            if entry.num_hashes == 1 {
                let mut hasher = Sha256::new();
                hasher.update(&state);
                if hasher.finalize().as_slice() != entry.hash {
                    return false;
                }
                state = entry.hash;
            } else {
                for _ in 0..entry.num_hashes {
                    let mut hasher = Sha256::new();
                    hasher.update(&state);
                    state = hasher.finalize().into();
                }
            }
        }
        true
    }
}
```

### Tick Structure

```
Slot
├── Leader schedule (assigned validator)
├── ~400ms to produce
├── ~64 tick-height (varies per slot)
└── Entries (transactions recorded into PoH)
```

Ticks are produced at ~10K ticks/sec (400ms per slot × ~4000 ticks/slot ÷ 400ms = ~10K). Each tick is a SHA-256 hash.

## Tower BFT

Solana's consensus mechanism — a variant of PBFT optimized for PoH.

```
New slot ──> Validate leader's PoH ──> Vote on fork ──> Propagate vote ──> Finalize after 2/3+ stake confirmed

Fork choice: heaviest fork (most PoH work) wins
```

### Properties

| Property | Value |
|----------|-------|
| Finality | ~400ms (2–3 slots under ideal conditions) |
| Fault tolerance | <33% by stake |
| Validators | ~1500–2000 active |
| Voting | Each validator votes every slot via `Vote` program |
| Slashing | None (but stake deactivation via warm-down) |

### Key Components

```rust
// Simplified Tower state
struct Tower {
    votes: Vec<Vote>,           // recent vote history
    heaviest_fork: Slot,        // current best fork
    lockout: u64,               // lockout period increases with consecutive votes
}

impl Tower {
    fn record_vote(&mut self, vote: Vote) {
        // PoH provides timing — lockout prevents equivocation
        self.lockout = std::cmp::min(self.lockout * 2, MAX_LOCKOUT);
        self.votes.push(vote);
    }

    fn should_switch_fork(&self, candidate: &[Vote]) -> bool {
        // Switch only if candidate fork has >2/3 stake committed
        candidate.len() > self.votes.len() * 2 / 3
    }
}
```

## Gulf Stream

Solana has **no mempool**. Instead, transactions are forwarded directly to the current slot leader in advance.

```
Client ──> RPC node ──> Stake-weighted forwarding ──> Next leader(s)
                                │
                                ▼
                     Validator queue (in-memory, ~100K txs)
                                │
                        ┌───────┴───────┐
                        ▼               ▼
                   Leader bank    Vote account verification
```

Benefits:
- Zero mempool latency — no need to wait for block inclusion
- Transaction forwarding during leader handoff
- Stake-weighted quality of service (higher stake → priority)

## Turbine

Block propagation protocol — **data plane** for Solana.

```
Leader
  │
  ├──→ Peer 1 ──→ Peer 1a ──→ ...
  ├──→ Peer 2 ──→ Peer 2a ──→ ...
  ├──→ Peer 3 ──→ Peer 3a ──→ ...
  └──→ Peer 4 ──→ Peer 4a ──→ ...

Each peer:
1. Receives a fragment (64-byte shred)
2. Reconstructs the block using erasure coding
3. Forwards missing fragments to its subtree
4. Tree depth = O(log N), ~14 hops for N=1500
```

### Shred Structure

```rust
struct Shred {
    slot: Slot,
    index: u32,          // position in slot
    data: Vec<u8>,       // 64-byte fragment
    coding: bool,        // erasure code or data?
    version: u16,        // shred version for fork detection
}
```

- **Data shreds**: Raw transaction data in 64-byte fragments
- **Coding shreds**: Reed-Solomon erasure coding for recovery (up to ~33% loss)
- **FEC rate**: ~4:1 data:coding ratio (adjustable)

## SeaLevel

Solana's **parallel transaction execution engine**.

```
BPF bytecode
     │
     ▼
SeaLevel runtime
     │
     ├── Static analysis: read/write account sets
     ├── Dependency graph: non-overlapping accounts → parallel
     ├── Execute transaction batch (4 cores × N threads)
     └── Commit account state changes
```

### Parallelism Rules

```
Transaction A: writes {Account 1}, reads  {Account 2}
Transaction B: reads  {Account 1}, writes {Account 3}
→ Conflict on Account 1 → sequential

Transaction A: writes {Account 1}, reads  {Account 2}
Transaction B: writes {Account 3}, reads  {Account 4}
→ No overlap → parallel execution
```

Key insight: Solana can execute thousands of transactions in parallel per slot because transactions declare their read/write sets upfront.

## Cloudbreak

Solana's **account database** — designed for SSDs.

```
Account storage:
├── Append-vector (accounts stored in append-only format)
├── Index (account pubkey → offset in append-vector)
├── Cache (recently accessed accounts in memory)
└── Snapshot (periodic full state capture to disk)
```

### Account Structure

```rust
struct Account {
    lamports: u64,           // SOL balance (1 SOL = 1e9 lamports)
    data: Vec<u8>,           // account data (program state)
    owner: Pubkey,           // owning program
    executable: bool,        // is this a program account?
    rent_epoch: Epoch,       // last rent-payment epoch
}
```

### NVMe Requirements

Running a Solana validator requires:

| Component | Requirement |
|-----------|-------------|
| CPU | 32+ cores, >3.0 GHz |
| RAM | 256+ GB (500+ GB recommended) |
| Storage | 1+ TB NVMe (4+ TB for ledger) |
| Network | 1 Gbps (10 Gbps recommended) |
| Accounts DB | ~200 GB, append-vector on NVMe |

Cloudbreak's append-vector design is specifically optimized for NVMe sequential writes — random access is minimized.
