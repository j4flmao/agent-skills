# Vyper Language

## Introduction

Vyper is a security-focused smart contract language for the EVM, designed as an alternative to Solidity. Its Pythonic syntax and restrictive design philosophy prioritize auditability and minimalism over developer convenience. Key tenets: make exploits visible, reduce surface area, ban footguns.

## Design Philosophy

```
Solidity:  expressive, feature-rich, compiler fixes footguns
Vyper:     restricted, auditable, explicit, no footguns to fix
```

Core restrictions:
- **No inheritance** — use module imports instead (composition over inheritance)
- **No modifiers** — use internal functions that wrap logic
- **No inline assembly** — security by restriction; what you see is what executes
- **No overloading** — each function name is unique
- **No implicit state mutability** — every function explicitly annotated `@view`, `@pure`, `@payable`
- **No unchecked blocks** — all arithmetic checked at compile time
- **No recursive calls** — reentrancy is a compiler concern (limits expressiveness)

## Key Differences from Solidity

| Feature | Solidity | Vyper |
|---------|----------|-------|
| Inheritance | Full OOP inheritance | Module imports only |
| Modifiers | `onlyOwner` style | Internal functions |
| Inline assembly | `assembly { ... }` | Forbidden |
| Overflow checks | `unchecked` blocks disable | Always on, no opt-out |
| Array bounds | Unsafe in 0.7.x | Always checked |
| State mutability | `view`/`pure` optional | Required annotation |
| Function overloading | Supported | Forbidden |
| Variable shadowing | Allowed | Forbidden |
| `selfdestruct` | Available | Forbidden (removed in Vyper 0.4+) |
| `tx.origin` | Available | Forbidden |
| Payable | Modifier `payable` | Decorator `@payable` |
| ABI encoding | Tight packing options | Single standard encoding |

## Types

### Value Types

| Type | Size | Notes |
|------|------|-------|
| `int128` | 128 bits | Signed, overflow-checked |
| `uint256` | 256 bits | Unsigned, overflow-checked |
| `bool` | 1 byte | `True` / `False` |
| `address` | 20 bytes | 160-bit EVM address |
| `bytes32` | 32 bytes | Fixed-size byte array |
| `decimal` | 167 bits | Fixed-point (10 digits after decimal) |

### Reference Types

| Type | Example | Notes |
|------|---------|-------|
| `Bytes[N]` | `Bytes[100]` | Fixed-size byte array |
| `bytes` | `bytes` | Dynamic byte array |
| `String[N]` | `String[50]` | Fixed-size string |
| `DynArray[T, N]` | `DynArray[uint256, 10]` | Dynamic array with max length |
| `HashMap[K, V]` | `HashMap[address, uint256]` | Mapping (like Solidity `mapping`) |
| `Struct` | Custom | Named tuple of fields |

### Enums

```vyper
enum State:
    PENDING
    ACTIVE
    FROZEN
    CLOSED

# Finite state machine via enum
state: State

@external
def activate():
    assert self.state == State.PENDING  # FSM guard
    self.state = State.ACTIVE
```

## Functions

### Decorators

| Decorator | Effect |
|-----------|--------|
| `@external` | Public — callable from outside |
| `@internal` | Private — only callable from contract |
| `@view` | Read-only, no state modification |
| `@pure` | No state read or write |
| `@payable` | Accepts ETH (must be `@external`) |
| `@deploy` | Constructor (runs once at deployment) |

```vyper
# Constructor (runs once on deploy)
owner: address

@deploy
def __init__(_owner: address):
    self.owner = _owner

# Public payable function
@external
@payable
def deposit():
    assert msg.value > 0
    self.balances[msg.sender] += msg.value

# Read-only view function
@external
@view
def balanceOf(addr: address) -> uint256:
    return self.balances[addr]

# Internal helper (no modifiers — use this pattern)
@internal
def _only_owner():
    assert msg.sender == self.owner, "unauthorized"

@external
def admin_only_action():
    self._only_owner()
    # do admin stuff
```

## State Variables & Immutables

```vyper
# State variables (persistent storage)
owner: address
total_supply: uint256
balances: HashMap[address, uint256]

# Immutable (set once in constructor, read via code, not storage)
SYMBOL: immutable(String[5])
DECIMALS: immutable(uint256)

@deploy
def __init__(_symbol: String[5]):
    SYMBOL = _symbol
    DECIMALS = 18

# Immutables are gas-cheaper than state — value lives in bytecode
```

### Storage Layout

Vyper uses a deterministic storage layout (no manual slot management):

| Variable | Slot |
|----------|------|
| First declared var | slot 0 |
| Second declared var | slot 1 |
| ... | sequential |
| `HashMap` | slot N (keccak256(key . slot) for values) |
| `DynArray` | slot for length, keccak256(slot) for elements |

Layout is strictly sequential by declaration order — no automatic packing. Use smaller types (`int128` over `uint256`) to reduce slot count.

## Events & Logging

```vyper
event Transfer:
    sender: address
    receiver: address
    value: uint256

event Approval:
    owner: address
    spender: address
    value: uint256

@external
def transfer(to: address, value: uint256) -> bool:
    assert self.balances[msg.sender] >= value
    self.balances[msg.sender] -= value
    self.balances[to] += value
    log Transfer(msg.sender, to, value)
    return True
```

## Interfaces

```vyper
# IERC20 interface
interface IERC20:
    def totalSupply() -> uint256: view
    def balanceOf(account: address) -> uint256: view
    def transfer(to: address, amount: uint256) -> bool: nonpayable
    def allowance(owner: address, spender: address) -> uint256: view
    def approve(spender: address, amount: uint256) -> bool: nonpayable
    def transferFrom(sender: address, to: address, amount: uint256) -> bool: nonpayable

    event Transfer:
        sender: address
        receiver: address
        value: uint256

    event Approval:
        owner: address
        spender: address
        value: uint256

# Using an interface
@external
def safeTransfer(token: address, to: address, amount: uint256):
    IERC20(token).transfer(to, amount)
```

## Common Patterns

### Pattern 1: Two-Step Ownership Transfer

```vyper
owner: address
future_owner: address

@external
def transfer_ownership(new_owner: address):
    assert msg.sender == self.owner
    self.future_owner = new_owner

@external
def claim_ownership():
    assert msg.sender == self.future_owner
    self.owner = self.future_owner
```

### Pattern 2: Pull-Over-Push ETH Withdrawal

```vyper
balances: HashMap[address, uint256]

# Push: sender initiates
@external
@payable
def deposit():
    self.balances[msg.sender] += msg.value

# Pull: receiver initiates (avoids griefing)
@external
def withdraw(amount: uint256):
    assert self.balances[msg.sender] >= amount
    self.balances[msg.sender] -= amount
    send(msg.sender, amount)  # limited to 2300 gas — safe against reentrancy
```

### Pattern 3: Finite State Machine

```vyper
enum State:
    DEPLOYED
    FUNDED
    ACTIVE
    COMPLETED
    CANCELED

state: State

@external
@payable
def fund():
    assert self.state == State.DEPLOYED
    self.state = State.FUNDED

@external
def start():
    assert self.state == State.FUNDED
    self.state = State.ACTIVE
```

### Pattern 4: Eternal Storage Proxy (Upgradable)

```vyper
# Logic contract (V1)
implementation: address

@external
def upgrade(new_impl: address):
    assert msg.sender == self.owner
    self.implementation = new_impl

# Fallback delegates via DELEGATECALL
# Vyper 0.3+ has built-in raw_call for this
@external
def __default__():
    raw_call(self.implementation, msg.data)
```

### Pattern 5: Reentrancy Guard (Manual)

```vyper
locked: bool

@external
def guarded_action():
    assert not self.locked, "reentrant"
    self.locked = True
    # ... external calls ...
    self.locked = False
```

## Security Implications

### Built-in Protections

| Security Feature | Vyper | Solidity |
|-----------------|-------|----------|
| Overflow protection | Always on (no opt-out) | On by default, can `unchecked` |
| Array bounds | Always checked | Checked (0.8+), unchecked in assembly |
| Reentrancy risk | Lower (no recursive calls in language) | Must use ReentrancyGuard |
| `tx.origin` | Forbidden | Deprecated but available |
| `selfdestruct` | Forbidden | Available (EIP-6780 limited) |
| Variable shadowing | Forbidden | Compiler warning |
| Short address attack | Handled by ABI encoder | Must handle manually |
| Integer truncation | Compiler prevents | Silent in older versions |

### What Vyper Does NOT Prevent

- **Logic bugs** — wrong math, wrong state transitions
- **Oracle manipulation** — price feed design is unchanged
- **Frontrunning** — mempool ordering is layer-agnostic
- **Access control mistakes** — `msg.sender` checks must be correct
- **Flash loan attacks** — same economic attack surface

## Tooling

```bash
# Install
pip install vyper

# Compile
vyper contract.vy
vyper -f abi,bytecode contract.vy

# Test with ape
ape compile
ape test

# Verify
vyper -f bytecode_runtime contract.vy | xxd -r -p | sha256sum

# Ape Vyper plugin
ape plugins install vyper
```

| Tool | Purpose |
|------|---------|
| `vyper` | Compiler — outputs bytecode + ABI |
| `ape` (ApeWorx) | Framework with Vyper support |
| `brownie` | Legacy framework (Vyper supported) |
| `eth-abi` | ABI encoding/decoding in Python |
| `vyper-deploy` | Deployment scripts |
| `vyper-safety` | Linter / security analysis |
| `titanoboa` | Vyper interpreter/testing framework |

## Complete ERC-20 Implementation

```vyper
# @version 0.4.0
"""
name: SimpleERC20
dev: ERC-20 token implementation in Vyper
"""

# ── Interfaces ──────────────────────────────────────────────
interface IERC20:
    def totalSupply() -> uint256: view
    def balanceOf(account: address) -> uint256: view
    def transfer(to: address, amount: uint256) -> bool: nonpayable
    def allowance(owner: address, spender: address) -> uint256: view
    def approve(spender: address, amount: uint256) -> bool: nonpayable
    def transferFrom(sender: address, to: address, amount: uint256) -> bool: nonpayable

    event Transfer:
        sender: address
        receiver: address
        value: uint256

    event Approval:
        owner: address
        spender: address
        value: uint256

# ── events ──────────────────────────────────────────────────
event Transfer:
    sender: address
    receiver: address
    value: uint256

event Approval:
    owner: address
    spender: address
    value: uint256

# ── immutables ──────────────────────────────────────────────
NAME: immutable(String[64])
SYMBOL: immutable(String[32])
DECIMALS: immutable(uint256)

# ── state ───────────────────────────────────────────────────
total_supply: uint256
balances: HashMap[address, uint256]
allowances: HashMap[address, HashMap[address, uint256]]

# ── constructor ─────────────────────────────────────────────
@deploy
def __init__(_name: String[64], _symbol: String[32], _decimals: uint256, _total_supply: uint256):
    NAME = _name
    SYMBOL = _symbol
    DECIMALS = _decimals
    self.total_supply = _total_supply
    self.balances[msg.sender] = _total_supply
    log Transfer(empty(address), msg.sender, _total_supply)

# ── view / pure ─────────────────────────────────────────────
@external
@view
def name() -> String[64]:
    return NAME

@external
@view
def symbol() -> String[32]:
    return SYMBOL

@external
@view
def decimals() -> uint256:
    return DECIMALS

@external
@view
def totalSupply() -> uint256:
    return self.total_supply

@external
@view
def balanceOf(account: address) -> uint256:
    return self.balances[account]

@external
@view
def allowance(owner: address, spender: address) -> uint256:
    return self.allowances[owner][spender]

# ── core ERC-20 ─────────────────────────────────────────────
@external
def transfer(to: address, amount: uint256) -> bool:
    assert to != empty(address), "ERC20: transfer to zero"
    assert self.balances[msg.sender] >= amount, "ERC20: insufficient balance"

    self.balances[msg.sender] -= amount
    self.balances[to] += amount

    log Transfer(msg.sender, to, amount)
    return True

@external
def approve(spender: address, amount: uint256) -> bool:
    assert spender != empty(address), "ERC20: approve to zero"

    self.allowances[msg.sender][spender] = amount

    log Approval(msg.sender, spender, amount)
    return True

@external
def transferFrom(sender: address, to: address, amount: uint256) -> bool:
    assert sender != empty(address), "ERC20: transfer from zero"
    assert to != empty(address), "ERC20: transfer to zero"
    assert self.balances[sender] >= amount, "ERC20: insufficient balance"
    assert self.allowances[sender][msg.sender] >= amount, "ERC20: insufficient allowance"

    self.allowances[sender][msg.sender] -= amount
    self.balances[sender] -= amount
    self.balances[to] += amount

    log Transfer(sender, to, amount)
    return True

# ── meta / helpers ──────────────────────────────────────────
@external
@pure
def version() -> String[8]:
    return "0.1.0"
```

## ETH Vault with Deposit/Withdraw

```vyper
# @version 0.4.0

event Deposit:
    sender: address
    amount: uint256

event Withdrawal:
    recipient: address
    amount: uint256

total_deposits: uint256
balances: HashMap[address, uint256]

@external
@payable
def deposit():
    assert msg.value > 0
    self.balances[msg.sender] += msg.value
    self.total_deposits += msg.value
    log Deposit(msg.sender, msg.value)

@external
def withdraw(amount: uint256):
    assert self.balances[msg.sender] >= amount
    self.balances[msg.sender] -= amount
    self.total_deposits -= amount
    send(msg.sender, amount)
    log Withdrawal(msg.sender, amount)

@external
@view
def balanceOf(addr: address) -> uint256:
    return self.balances[addr]

# Contract can receive ETH via plain sends
@external
@payable
def __default__():
    self.deposit()
```
