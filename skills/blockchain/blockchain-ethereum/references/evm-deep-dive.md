# EVM Deep Dive

## Architecture

The EVM is a **stack-based virtual machine** with a **256-bit word size**. It executes bytecode produced by compiling Solidity, Vyper, Huff, or Fe.

```
σ' = ϒ(σ, T)
```

State transition function: given world state `σ` and transaction `T`, produce new state `σ'`.

## Memory Model

| Region | Persistence | Addressing | Lifetime |
|--------|-------------|------------|----------|
| **Stack** | Volatile | Implicit (top-16) | Per execution frame |
| **Memory** | Volatile | Byte-indexed (linear) | Per execution frame |
| **Storage** | Persistent | 256-bit key → 256-bit value | Permanent (Trie) |
| **Calldata** | Read-only | Byte-indexed | Per tx |
| **Return data** | Read-only | Byte-indexed | Per call frame |

Stack max depth: 1024 items. Memory expands quadratically: `cost = 3 + floor(mem_size / 32) * 3 + (mem_size^2 / 512)`.

## Opcode Table

### Arithmetic (0x01–0x0B)

| Opcode | Mnemonic | Gas | Description |
|--------|----------|-----|-------------|
| 0x01 | ADD | 3 | a + b |
| 0x02 | MUL | 5 | a * b |
| 0x03 | SUB | 3 | a - b |
| 0x04 | DIV | 5 | a / b |
| 0x05 | SDIV | 5 | signed division |
| 0x06 | MOD | 5 | a % b |
| 0x07 | SMOD | 5 | signed mod |
| 0x08 | ADDMOD | 8 | (a + b) % N |
| 0x09 | MULMOD | 8 | (a * b) % N |
| 0x0A | EXP | 10 + 50*(byte_len) | a^b |
| 0x0B | SIGNEXTEND | 5 | sign extend |

### Comparison & Bitwise (0x10–0x1B)

| Opcode | Mnemonic | Gas | Description |
|--------|----------|-----|-------------|
| 0x10 | LT | 3 | a < b |
| 0x11 | GT | 3 | a > b |
| 0x12 | SLT | 3 | signed < |
| 0x13 | SGT | 3 | signed > |
| 0x14 | EQ | 3 | a == b |
| 0x15 | ISZERO | 3 | a == 0 |
| 0x16 | AND | 3 | a & b |
| 0x17 | OR | 3 | a \| b |
| 0x18 | XOR | 3 | a ^ b |
| 0x19 | NOT | 3 | ~a |
| 0x1A | BYTE | 3 | nth byte |
| 0x1B | SHL | 3 | a << b |
| 0x1C | SHR | 3 | a >> b |
| 0x1D | SAR | 3 | signed >> |

### SHA3 (0x20)

| Opcode | Mnemonic | Gas | Description |
|--------|----------|-----|-------------|
| 0x20 | SHA3 | 30 + 6*(words) | Keccak-256 |

### Environment (0x30–0x4F)

| Opcode | Mnemonic | Gas | Description |
|--------|----------|-----|-------------|
| 0x30 | ADDRESS | 2 | address of executing account |
| 0x31 | BALANCE | 100 (warm) / 2600 (cold) | balance |
| 0x32 | ORIGIN | 2 | tx originator |
| 0x33 | CALLER | 2 | msg.sender |
| 0x34 | CALLVALUE | 2 | msg.value |
| 0x35 | CALLDATALOAD | 3 | calldata[i:i+32] |
| 0x36 | CALLDATASIZE | 2 | calldata length |
| 0x37 | CALLDATACOPY | 3 + 3*(words) | memory ← calldata |
| 0x38 | CODESIZE | 2 | code length |
| 0x39 | CODECOPY | 3 + 3*(words) | memory ← code |
| 0x3A | GASPRICE | 2 | tx gas price |
| 0x3B | EXTCODESIZE | 100/2600 | ext code length |
| 0x3C | EXTCODECOPY | 100/2600 | memory ← ext code |
| 0x3D | RETURNDATASIZE | 2 | return data length |
| 0x3E | RETURNDATACOPY | 3 + 3*(words) | memory ← return data |
| 0x3F | EXTCODEHASH | 100/2600 | ext code hash |
| 0x40 | BLOCKHASH | 20 | blockhash(block-256) |
| 0x41 | COINBASE | 2 | block beneficiary |
| 0x42 | TIMESTAMP | 2 | block timestamp |
| 0x43 | NUMBER | 2 | block number |
| 0x44 | DIFFICULTY | 2 | block difficulty (prev. randao) |
| 0x45 | GASLIMIT | 2 | block gas limit |
| 0x46 | CHAINID | 2 | chain ID (EIP-1344) |
| 0x47 | SELFBALANCE | 5 | this.balance |
| 0x48 | BASEFEE | 2 | base fee (EIP-3198) |
| 0x49 | BLOBHASH | 3 | blob versioned hash (EIP-4844) |
| 0x4A | BLOBBASEFEE | 2 | blob base fee (EIP-7516) |

### Block Information (0x40–0x4A)

### Memory & Storage (0x50–0x5F)

| Opcode | Mnemonic | Gas | Description |
|--------|----------|-----|-------------|
| 0x50 | POP | 2 | remove top |
| 0x51 | MLOAD | 3 | memory[offset:offset+32] |
| 0x52 | MSTORE | 3 | memory[offset:] ← value |
| 0x53 | MSTORE8 | 3 | memory[offset] ← byte |
| 0x54 | SLOAD | 100(warm)/2100(cold) | storage[slot] |
| 0x55 | SSTORE | varies | storage[slot] ← value |
| 0x56 | JUMP | 8 | unconditional jump |
| 0x57 | JUMPI | 10 | conditional jump |
| 0x58 | PC | 2 | program counter |
| 0x59 | MSIZE | 2 | memory size |
| 0x5A | GAS | 2 | remaining gas |
| 0x5B | JUMPDEST | 1 | jump destination |

### SSTORE Gas Schedule (EIP-2200 + EIP-3529)

| Scenario | Gas Cost | Refund |
|----------|----------|--------|
| 0 → nonzero (fresh) | 22100 (G_sset + cold) | — |
| nonzero → 0 (delete) | 5000 (G_sreset + cold) | 4800 (max) |
| nonzero → nonzero (same) | 2900 (warm + dirt) | — |
| nonzero → nonzero (change) | 2900 | — |
| 0 → 0 (no-op) | 100 (warm) | — |
| nonzero → 0 after warm | 5000 (cold SLOAD) | 4800 |

Cold SLOAD: 2100 (EIP-2929). Warm SLOAD: 100.

### Control Flow & Operation (0x60–0xFF)

| Range | Mnemonic | Gas | Description |
|-------|----------|-----|-------------|
| 0x60–0x7F | PUSH1..PUSH32 | 3 | push N bytes |
| 0x80–0x8F | DUP1..DUP16 | 3 | duplicate nth |
| 0x90–0x9F | SWAP1..SWAP16 | 3 | swap nth |
| 0xA0–0xA4 | LOG0..LOG4 | 375 + 8*words + 375*topic | event log |
| 0xA5–0xAF | — | — | (reserved for EOF) |
| 0xF0 | CREATE | 32000 | deploy contract |
| 0xF1 | CALL | 100 (warm) / 700 (cold) | message call |
| 0xF2 | CALLCODE | 100/700 | call in context |
| 0xF3 | RETURN | 0 | return from frame |
| 0xF4 | DELEGATECALL | 100/700 | preserve caller |
| 0xF5 | CREATE2 | 32000 | create with salt |
| 0xF6–0xF9 | — | — | (reserved) |
| 0xFA | STATICCALL | 100/700 | no state modify |
| 0xFB–0xFC | — | — | (reserved) |
| 0xFD | REVERT | 0 | revert + return data |
| 0xFE | INVALID | — | invalid opcode |
| 0xFF | SELFDESTRUCT | 5000 | delete account |

## Gas Cost Categories

| Category | Cost | Applies To |
|----------|------|------------|
| G_base | 2 | most cheap ops |
| G_verylow | 3 | ADD, SUB, MLOAD, MSTORE, DUP, PUSH, SWAP |
| G_low | 5 | MUL, DIV, MOD, SIGNEXTEND |
| G_mid | 8 | ADDMOD, MULMOD |
| G_high | 10 | JUMPI |
| G_sset | 20000 | SSTORE 0→nonzero |
| G_sreset | 5000 | SSTORE nonzero→0 |
| G_cold_sload | 2100 | first SLOAD per address/slot |
| G_warm_storage | 100 | subsequent SLOAD/SSTORE |
| G_call | 700 | cold account CALL |
| G_newaccount | 25000 | CREATE with nonzero balance |

## EOF (EIP-3540 / EIP-3670 / EIP-4200)

**EVM Object Format** restructures bytecode into containers:

```
magic  version  kind  header_section  body_section  data_section
0xEF00 0x01    0x01   type_section    code_section  data_section
```

- `0xEF00` magic prefix — invalid in legacy EVM (EIP-3541)
- Mandatory code validation at deploy time (EIP-3670): no invalid opcodes, JUMPDEST analysis
- Relative jumps with RJUMP/RJUMPI/RJUMPV (EIP-4200) — replaces dynamic JUMP/JUMPI
- No more PUSH-only jump tables; cleaner control flow
- `DATALOAD`, `DATASIZE`, `DATACOPY` for data section access

## ABI Encoding

```
function selector: keccak256("transfer(address,uint256)")[:4]
static call:    selector ++ abi_encode(args)
dynamic types:  offset ++ size ++ data   (e.g. strings, bytes, arrays)
tuple encoding: flattened member encoding
```

| Type | Encoding | Size |
|------|----------|------|
| uint256 | 32-byte big-endian | 32B |
| address | left-padded to 32B | 32B |
| bytes | offset(32) + size(32) + data | 64+len |
| string | same as bytes | 64+len |
| `T[]` | offset(32) + len(32) + elements | 64+n*T |
| tuple | flattened sequential | var |

## CALL / DELEGATECALL / STATICCALL Mechanics

```
CALL (0xF1):
  - new execution context with fresh stack/memory
  - msg.sender = current contract, msg.value = passed value
  - returns 1 on success, 0 on failure (does NOT revert caller)

DELEGATECALL (0xF4):
  - preserves caller (msg.sender) and msg.value
  - code from target, storage/balance from caller
  - used by proxies (UUPS, transparent, beacon)

STATICCALL (0xFA):
  - forbids state-modifying opcodes (SSTORE, CREATE, SELFDESTRUCT, LOG0..LOG4)
  - reverts on violation (EIP-214)
```

## CREATE / CREATE2

```
CREATE:  address = keccak256(rlp([sender, nonce-1]))[12:]
CREATE2: address = keccak256(0xff ++ sender ++ salt ++ keccak256(init_code))[12:]
```

CREATE2 enables counterfactual deployment: address known before deploy, independent of nonce.
