# Cairo Language (StarkNet)

## Introduction

Cairo is a Turing-complete programming language for creating STARK-provable programs, primarily used for smart contracts on StarkNet (a validity rollup on Ethereum). Cairo code compiles to a STARK proof that is verified on Ethereum L1, enabling scalable computation with L1 security guarantees.

### Execution Model

```
User Tx → StarkNet Sequencer → Cairo VM (executes) → Sierra IR (intermediate) → CASM → STARK proof → L1 verification
```

**Sierra** (Safe Intermediate Representation): Cairo 1.0+ compiles to Sierra, which guarantees termination (no unbounded loops) and enables pay-as-you-go gas metering. Sierra is the key innovation separating Cairo 1.x from the original Cairo 0.x (which had raw Cairo assembly).

### Design Principles

- **Everything is a `felt`** — the field element is the base unit
- **Provable execution** — every step generates a proof constraint
- **Deterministic** — no randomness, no halting problems (Sierra enforces bounded execution)
- **Account abstraction by default** — every contract IS an account

## Core Concepts

### felt (Field Element)

```cairo
// felt: 252-bit integer in the STARK prime field
// Prime: 2^251 + 17 * 2^192 + 1 (≈ 76 decimal digits)
// All values are felt-compatible

// Arithmetic wraps modulo the prime
let x: felt = 100;
let y: felt = 200;
let sum = x + y;       // (x + y) mod P
let diff = x - y;      // (x - y) mod P (negative wraps around)
let prod = x * y;      // (x * y) mod P
```

### Memory Model

```
Cairo memory is:
  - Continuous (addressable by integer index)
  - Immutable after first write (write-once, read-many)
  - Auto-inserted range checks ensure felt values fit expected bounds
```

### Sierra IR vs Cairo Assembly

| Aspect | Cairo 0.x (Assembly) | Cairo 1.0+ (Sierra) |
|--------|---------------------|---------------------|
| Loops | `[ap] = [ap - 1] + 1; ap++;` | `loop { break }` (bounded) |
| Termination | Not guaranteed | Guaranteed (Sierra enforces) |
| Gas metering | Manual | Automatic |
| Recursion | Supported | Limited (no recursion) |
| Reentrancy | Possible | Not possible (no reentrancy) |
| Safety | Unsafe | Memory-safe |

## Types

### Primitive Types

| Type | Size | Notes |
|------|------|-------|
| `felt` | 252 bits | Base type — field element |
| `bool` | 1 felt | `true` / `false` |
| `u8` | 8 bits | Range-checked felt |
| `u16` | 16 bits | Range-checked felt |
| `u32` | 32 bits | Range-checked felt |
| `u64` | 64 bits | Range-checked felt |
| `u128` | 128 bits | Range-checked felt |
| `u256` | 2 felts (low + high) | Two felt words |
| `bytes31` | 31 bytes | Stored as felt |
| `felt252` | 252 bits | Same as felt, explicit alias |
| `ContractAddress` | felt | Type-safe address |
| `ClassHash` | felt | Contract class identifier |
| `StorageAddress` | felt | Storage variable address |

### Complex Types

```cairo
// Array
let arr: Array<felt> = array![10, 20, 30];
arr.append(40);
let val = arr[0];           // access
let len = arr.len();

// Struct
#[derive(Drop, Serde)]
struct Token {
    id: u256,
    owner: ContractAddress,
    amount: u256,
}

// Enum
#[derive(Drop, Serde)]
enum State {
    Pending: (),
    Active: (),
    Frozen: (),
    Closed: (),
}

// Legacy Dict (felt252_dict)
// In Cairo 1.x, use Felt252Dict<T>
let mut dict: Felt252Dict<u256> = Default::default();
dict.insert(1, 1000);
let val = dict.get(1);
```

## Functions

### Core Function Types

```cairo
// External (entry point)
#[external]
fn transfer(recipient: ContractAddress, amount: u256) -> bool {
    // ...
}

// View (read-only)
#[view]
fn balance_of(account: ContractAddress) -> u256 {
    // ...
}

// Constructor (deploy-time)
#[constructor]
fn constructor(ref self: ContractState, owner: ContractAddress) {
    // ...
}

// L1 handler (receives message from L1)
#[l1_handler]
fn receive_from_l1(ref self: ContractState, from_address: felt, amount: u256) {
    // ...
}
```

### Implicits

Functions may require implicit arguments injected by the compiler:

```cairo
// Common implicits:
// - gas: tracks gas usage
// - syscall_ptr: StarkNet OS syscalls
// - range_check_ptr: ensures integer bounds

// Implicits are declared in the function signature
fn transfer_helper(
    ref self: ContractState,
    sender: ContractAddress,
    recipient: ContractAddress,
    amount: u256,
) -> bool {
    // syscalls auto-require syscall_ptr
    let res = starknet::call_contract(recipient, selector!("receive"), array![].span());
    true
}
```

### Decorator Reference

| Decorator | Scope | Effect |
|-----------|-------|--------|
| `#[external]` | `fn` | Public entry point |
| `#[view]` | `fn` | Read-only, no storage writes |
| `#[constructor]` | `fn` | Runs on deploy |
| `#[l1_handler]` | `fn` | Receives L1→L2 messages |
| `#[event]` | `fn` | Defines an event type |
| `#[derive(Trait)]` | `struct`, `enum` | Auto-implement traits |
| `#[inline]` | `fn` | Inline function body |
| `#[abi(embed_v0)]` | `impl` | Expose all impl methods |
| `#[starknet::contract]` | `mod` | Marks a contract module |

## Storage

### Storage Variables

```cairo
#[starknet::contract]
mod Token {
    use starknet::ContractAddress;

    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        decimals: u8,
        total_supply: u256,
        balances: LegacyMap<ContractAddress, u256>,
        allowances: LegacyMap<(ContractAddress, ContractAddress), u256>,
        owner: ContractAddress,
    }

    // StorageMap (Cairo 1.x naming)
    // LegacyMap is the storage mapping type
}
```

### Storage Layout

| Storage Construct | Address Derivation |
|------------------|--------------------|
| Base variable `name` | `sn_keccak("name")` |
| `balances[addr]` | `h(sn_keccak("balances"), addr)` |
| `allowances[a][b]` | `h(h(sn_keccak("allowances"), a), b)` |

Storage addresses are 252-bit felt values. The `sn_keccak` function is StarkNet's variant of keccak256.

### Reading/Writing Storage

```cairo
// In contract functions, self provides storage access
fn read_balance(ref self: ContractState, account: ContractAddress) -> u256 {
    self.balances.read(account)
}

fn set_balance(ref self: ContractState, account: ContractAddress, amount: u256) {
    self.balances.write(account, amount)
}

// Legacy pattern (pre-1.0):
// @storage_var
// func balances(account: felt) -> (balance: felt)
```

## StarkNet Primitives

### Addresses

```cairo
use starknet::ContractAddress;

// These are distinct wrapper types (not raw felts)
let contract: ContractAddress = contract_address_const::<0x1234>();
let class_hash: ClassHash = class_hash_const::<0x5678>();
let storage_addr: StorageAddress = storage_address_from_felt(12345);
```

### Syscalls

```cairo
use starknet::syscalls;

// Deploy a contract
let (addr, _) = starknet::deploy_syscall(
    class_hash,             // ClassHash to deploy
    0,                      // constructor calldata offset
    array![].span(),        // constructor calldata
    true,                   // deploy from zero (default)
);

// Call another contract
let result = starknet::call_contract_syscall(
    contract_address,
    selector!("function_name"),
    calldata.span(),
);

// Library call (delegate to class)
let result = starknet::library_call_syscall(
    class_hash,
    selector!("function_name"),
    calldata.span(),
);

// Emit event
starknet::emit_event_syscall(
    array![sn_keccak("Transfer")].span(),
    keys.span(),
    values.span(),
);
```

### Block / Transaction Context

```cairo
use starknet::info;

let caller: ContractAddress = starknet::get_caller_address();
let contract: ContractAddress = starknet::get_contract_address();
let block_num: u64 = starknet::get_block_number();
let block_ts: u64 = starknet::get_block_timestamp();
let tx_hash: felt = starknet::get_tx_hash();
let sequencer: ContractAddress = starknet::get_sequencer_address();
```

## Common Patterns

### Pattern 1: Owned Contract

```cairo
#[starknet::contract]
mod Owned {
    use starknet::ContractAddress;
    use starknet::get_caller_address;

    #[storage]
    struct Storage {
        owner: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn only_owner(ref self: ContractState) {
            assert(self.owner.read() == get_caller_address(), 'unauthorized');
        }
    }

    #[external]
    fn admin_action(ref self: ContractState) {
        self.only_owner();
        // ...
    }
}
```

### Pattern 2: Account Abstraction

```cairo
// Every StarkNet contract IS an account by default.
// To make a custom account:

#[starknet::contract]
mod CustomAccount {
    use starknet::get_tx_info;

    #[storage]
    struct Storage {
        public_key: felt,
    }

    // Required for account validation
    #[external]
    fn __validate__(ref self: ContractState, calls: Array<Call>) -> felt {
        let tx_info = starknet::get_tx_info().unbox();
        let sig = tx_info.signature;
        let hash = tx_info.transaction_hash;
        assert(verify_ecdsa(hash, self.public_key.read(), sig[0], sig[1]), 'invalid sig');
        'VALID'
    }

    #[external]
    fn __execute__(ref self: ContractState, calls: Array<Call>) -> Array<Span<felt>> {
        // Execute the calls if __validate__ passed
        // StarkNet OS ensures __validate__ is called before __execute__
    }
}
```

### Pattern 3: L1→L2 Messaging

```cairo
#[starknet::contract]
mod Bridge {
    #[storage]
    struct Storage {
        locked_amount: u256,
    }

    // L1 sends message → L2 handler receives it
    #[l1_handler]
    fn receive_from_l1(
        ref self: ContractState,
        from_address: felt,      // L1 sender contract
        recipient: ContractAddress,
        amount: u256,
    ) {
        self.locked_amount.write(self.locked_amount.read() + amount);
        // Mint tokens to recipient
    }

    // L2 → L1: send message
    #[external]
    fn withdraw_to_l1(
        ref self: ContractState,
        l1_recipient: felt,
        amount: u256,
    ) {
        let sender = starknet::get_contract_address();
        starknet::send_message_to_l1_syscall(
            l1_recipient,       // L1 contract address (as felt)
            array![amount.low, amount.high].span(),
        );
        // Burn tokens
    }
}
```

### Pattern 4: Composable with Library Calls

```cairo
#[starknet::contract]
mod Composer {
    #[external]
    fn execute_swap(
        ref self: ContractState,
        router: ContractAddress,
        token_in: ContractAddress,
        amount_in: u256,
        min_out: u256,
    ) -> u256 {
        // Approve router
        let approve_selector = selector!("approve");
        starknet::call_contract_syscall(
            token_in,
            approve_selector,
            array![router.into(), amount_in.low, amount_in.high].span(),
        );

        // Call router swap
        let swap_selector = selector!("swapExactTokensForTokens");
        let res = starknet::call_contract_syscall(
            router,
            swap_selector,
            array![amount_in.low, amount_in.high, min_out.low, min_out.high].span(),
        );

        // Parse returned amount
        let amount_out = res.data[0];
        amount_out
    }
}
```

### Pattern 5: Reentrancy Guard (Sierra-Safe)

```cairo
// Reentrancy IS NOT possible in Sierra-compiled contracts
// because the execution model prevents nested contract calls
// from re-entering the same function.
//
// However, cross-contract reentrancy is still a concern via
// call_contract_syscall. Use a simple flag:

#[storage]
struct Storage {
    entered: bool,
}

#[generate_trait]
impl GuardImpl of GuardTrait {
    fn non_reentrant(ref self: ContractState) {
        assert(!self.entered.read(), 'reentrant');
        self.entered.write(true);
    }

    fn end_non_reentrant(ref self: ContractState) {
        self.entered.write(false);
    }
}
```

## ERC-20 Implementation (Cairo 1.0+)

```cairo
// StarkNet ERC-20 — Sierra-compatible
#[starknet::contract]
mod ERC20 {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::get_contract_address;
    use zeroable::Zeroable;

    // ── storage ─────────────────────────────────────────────
    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        decimals: u8,
        total_supply: u256,
        balances: LegacyMap<ContractAddress, u256>,
        allowances: LegacyMap<(ContractAddress, ContractAddress), u256>,
    }

    // ── events ──────────────────────────────────────────────
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Transfer: Transfer,
        Approval: Approval,
    }

    #[derive(Drop, starknet::Event)]
    struct Transfer {
        from: ContractAddress,
        to: ContractAddress,
        value: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Approval {
        owner: ContractAddress,
        spender: ContractAddress,
        value: u256,
    }

    // ── constructor ─────────────────────────────────────────
    #[constructor]
    fn constructor(
        ref self: ContractState,
        _name: felt252,
        _symbol: felt252,
        _decimals: u8,
        _total_supply: u256,
        _recipient: ContractAddress,
    ) {
        self.name.write(_name);
        self.symbol.write(_symbol);
        self.decimals.write(_decimals);
        self.total_supply.write(_total_supply);
        self.balances.write(_recipient, _total_supply);

        self.emit(Transfer {
            from: Zeroable::zero(),
            to: _recipient,
            value: _total_supply,
        });
    }

    // ── view ────────────────────────────────────────────────
    #[view]
    fn name(self: @ContractState) -> felt252 {
        self.name.read()
    }

    #[view]
    fn symbol(self: @ContractState) -> felt252 {
        self.symbol.read()
    }

    #[view]
    fn decimals(self: @ContractState) -> u8 {
        self.decimals.read()
    }

    #[view]
    fn total_supply(self: @ContractState) -> u256 {
        self.total_supply.read()
    }

    #[view]
    fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
        self.balances.read(account)
    }

    #[view]
    fn allowance(
        self: @ContractState,
        owner: ContractAddress,
        spender: ContractAddress,
    ) -> u256 {
        self.allowances.read((owner, spender))
    }

    // ── external ────────────────────────────────────────────
    #[external]
    fn transfer(
        ref self: ContractState,
        recipient: ContractAddress,
        amount: u256,
    ) -> bool {
        let sender = get_caller_address();
        assert(!recipient.is_zero(), 'ERC20: zero address');

        let sender_balance = self.balances.read(sender);
        assert(sender_balance >= amount, 'ERC20: insufficient');

        self.balances.write(sender, sender_balance - amount);
        self.balances.write(recipient, self.balances.read(recipient) + amount);

        self.emit(Transfer {
            from: sender,
            to: recipient,
            value: amount,
        });
        true
    }

    #[external]
    fn approve(
        ref self: ContractState,
        spender: ContractAddress,
        amount: u256,
    ) -> bool {
        let owner = get_caller_address();
        assert(!spender.is_zero(), 'ERC20: zero address');

        self.allowances.write((owner, spender), amount);

        self.emit(Approval {
            owner,
            spender,
            value: amount,
        });
        true
    }

    #[external]
    fn transfer_from(
        ref self: ContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256,
    ) -> bool {
        let caller = get_caller_address();
        assert(!sender.is_zero(), 'ERC20: zero sender');
        assert(!recipient.is_zero(), 'ERC20: zero recipient');

        let sender_balance = self.balances.read(sender);
        assert(sender_balance >= amount, 'ERC20: insufficient');

        let allowed = self.allowances.read((sender, caller));
        assert(allowed >= amount, 'ERC20: insufficient allowance');

        self.allowances.write((sender, caller), allowed - amount);
        self.balances.write(sender, sender_balance - amount);
        self.balances.write(recipient, self.balances.read(recipient) + amount);

        self.emit(Transfer {
            from: sender,
            to: recipient,
            value: amount,
        });
        true
    }
}
```

## L1→L2 & L2→L1 Bridging

```
L1 → L2: Ethereum contract → send_message_to_l1 → StarkNet OS → #[l1_handler]
L2 → L1: #[external] → send_message_to_l1_syscall → Sequencer → L1 contract consumes
```

### L1 Side (Solidity)

```solidity
// L1 Bridge contract
interface IStarknetCore {
    function sendMessageToL2(
        uint256 toAddress, bytes calldata payload
    ) external returns (bytes32);
}

contract L1Bridge {
    IStarknetCore constant CORE = IStarknetCore(0xde29d060D45901Fb19ED6C6e959EB22d8626728e);

    function bridgeToL2(uint256 l2Contract, uint256 recipient, uint256 amount) external {
        CORE.sendMessageToL2(
            l2Contract,
            abi.encode(recipient, amount)
        );
    }
}
```

## Tooling

```bash
# Scarb (build & package manager)
scarb new my_project
scarb build
scarb test

# snforge (testing)
snforge test
snforge test test_function

# sncast (deploy & interact)
sncast deploy --class-hash 0x1234 --constructor-calldata 0x5678
sncast invoke --contract-address 0x... --function transfer --calldata 0x...
sncast call --contract-address 0x... --function balance_of --calldata 0x...
```

| Tool | Purpose |
|------|---------|
| `scarb` | Build system, package manager (Cargo-like) |
| `snforge` | Test framework (foundry-like) |
| `sncast` | CLI deploy/interact (cast-like) |
| `starknet-foundry` | Full toolchain (forge + cast) |
| `cairo-profiler` | Sierra gas profiling |
| `cairo-lint` | Linter (`cairo_lint`) |
| `starkli` | Lightweight CLI alternative |
| `OpenZeppelin Cairo` | Standard library (ERC-20, ERC-721, access) |

### Scarb Config

```toml
# Scarb.toml
[package]
name = "my_token"
version = "1.0.0"

[dependencies]
starknet = ">=2.8.0"
openzeppelin = "0.20.0"

[[target.starknet-contract]]
```

## Security Implications

### What Cairo Prevents

| Risk | Cairo Protection |
|------|------------------|
| Reentrancy | Sierra execution model prevents recursive re-entry |
| Integer overflow/underflow | Range checks on all bounded types |
| Array OOB | Bounds-checked access |
| Uninitialized storage | Write-once memory model |
| Halting problem | Sierra guarantees termination |
| Frontrunning | Sequencer ordering (centralized, trade-off) |
| Arbitrary jumps | No raw jump in Sierra |

### What Cairo Does NOT Prevent

- **Logic errors** — wrong math, incorrect state machine
- **Sequencer censorship** — sequencer can reorder/withhold txns
- **Oracle manipulation** — same as any L1
- **Flash loan attacks** — composability opens same vectors
- **L1 message disputes** — `send_message_to_l1` can fail if L1 gas too low
- **Storage collision** — legacy variable address collision (rare in 1.0+)

## Comparison: Cairo vs Solidity vs Rust (Anchor)

| Feature | Cairo (StarkNet) | Solidity (EVM) | Rust (Anchor) |
|---------|-----------------|---------------|---------------|
| Execution | Proved (STARK) | Re-executed by every node | Re-executed (Solana) |
| Account model | Account abstraction by default | EOA + Contract | Program + PDA |
| Reentrancy | Sierra-banned | Possible (guard needed) | Impossible |
| Fee model | Pay-as-you-go (Sierra gas) | Gas per opcode | Rent + compute budget |
| Storage | `LegacyMap` / `StorageMap` | SLOAD/SSTORE | Account deserialization |
| Parallelism | Sequential per contract | Sequential | Sealevel (parallel) |
| Formal verification | Native (Sierra constraints) | External tools | SMT/Z3 |
| Upgradeability | Class hash swap | Proxy (EIP-1967) | Buffer loader |
| L1 settlement | Validity proof | L1 execution | Not applicable |
