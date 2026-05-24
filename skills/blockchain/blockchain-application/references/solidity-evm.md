# Solidity & EVM Deep Dive

## EVM Architecture

```
EVM ── Context: tx.origin, msg.sender, msg.value, block.number, gasleft()
├── Stack (1024 elements, 256-bit words)
├── Memory (byte-addressable, linear, cleared per tx)
├── Storage (key-value, persistent, 2^256 slots)
├── Calldata (immutable, read-only, tx input)
├── Return data (output from external calls)
└── Code (deployed bytecode)
```

### Execution Flow

```solidity
// High-level Solidity
contract Counter {
    uint256 public count;                   // storage slot 0

    function increment() external {
        count += 1;                          // SLOAD + SSTORE
    }

    function getCount() external view returns (uint256) {
        return count;                        // SLOAD (read-only, no gas?)
    }
}
```

```yasm
// Equivalent EVM assembly (simplified)
PUSH1 0x00          ; storage slot
SLOAD               ; load count
PUSH1 0x01
ADD                 ; count + 1
PUSH1 0x00
SSTORE              ; store count
```

## Solidity Types & Layout

### Storage Layout Rules

| Type | Storage Rules |
|------|---------------|
| `uint256` | 1 slot (32 bytes) |
| `address` | 1 slot (20 bytes, right-padded) |
| `bool` | 1 slot (1 byte) |
| `uint8`-`uint248` | Packed into same slot if < 32 bytes combined |
| `bytes1`-`bytes32` | 1 slot each |
| `string` | Slot = length, keccak256(slot) = data |
| `bytes` | Same as string |
| `mapping(K => V)` | Slot = keccak256(h(k) . p) where p = mapping slot |
| `array T[]` | Slot = length, elements at keccak256(slot) |

### Packing Example

```solidity
contract GasOptimized {
    // Packed into 1 slot (32 bytes)
    uint128 public a;   // 16 bytes
    uint64  public b;   // 8 bytes
    uint32  public c;   // 4 bytes
    uint16  public d;   // 2 bytes
    uint8   public e;   // 1 byte
    bool    public f;   // 1 byte
    // Total: 32 bytes = 1 SLOAD
}

contract GasWaste {
    uint256 public a;   // slot 0 (32 bytes)
    uint256 public b;   // slot 1 (32 bytes)
    // Each is separate SLOAD — 2 slots instead of 1
}
```

## Gas Optimization Patterns

### Use Calldata over Memory

```solidity
// ❌ Expensive: copies to memory
function sum(uint256[] memory data) external pure returns (uint256) {
    uint256 total;
    for (uint256 i = 0; i < data.length; i++) total += data[i];
    return total;
}

// ✅ Cheaper: reads directly from calldata
function sum(uint256[] calldata data) external pure returns (uint256) {
    uint256 total;
    for (uint256 i = 0; i < data.length; i++) total += data[i];
    return total;
}
```

### Unchecked Arithmetic (Solidity 0.8+)

```solidity
// Use unchecked blocks where overflow is impossible
function batchTransfer(address[] calldata recipients, uint256 amount) external {
    uint256 total = amount * recipients.length; // may overflow
    require(balance[msg.sender] >= total, "insufficient");
    balance[msg.sender] -= total;

    unchecked {
        for (uint256 i = 0; i < recipients.length; i++) {
            balance[recipients[i]] += amount;
        }
    }
}
```

### Use Packed Structs

```solidity
// ❌ 5 slots (each uint256 = 1 slot)
struct Bad {
    uint256 id;
    address owner;
    uint256 balance;
    uint256 timestamp;
    bool active;
}

// ✅ 2 slots (tightly packed)
struct Good {
    uint128 id;         // 16
    uint128 balance;    // 16 — slot 0
    address owner;      // 20
    uint64 timestamp;   // 8 — slot 1
    bool active;        // 1 — slot 1 (with owner + timestamp)
}
```

## Common EVM Opcodes

| Opcode | Gas | Description |
|--------|-----|-------------|
| `ADD` | 3 | Add two stack values |
| `MUL` | 5 | Multiply two stack values |
| `SLOAD` | 100 (warm) / 2100 (cold) | Load word from storage |
| `SSTORE` | 100/20000/2900 | Store word to storage |
| `MLOAD` | 3 | Load word from memory |
| `MSTORE` | 3 | Store word to memory |
| `CALLDATALOAD` | 3 | Load word from calldata |
| `CALL` | 100/2600 | Call external contract |
| `DELEGATECALL` | 100/2600 | Call with sender context |
| `STATICCALL` | 100/2600 | Read-only external call |
| `LOG0`-`LOG4` | 375+ | Emit event log |

## ABI Encoding

```solidity
// Function selector: keccak256("transfer(address,uint256)")[:4]
// = 0xa9059cbb

// ABI encoding for transfer(to, amount):
// 0xa9059cbb 000000000000000000000000<20-byte-address> <32-byte-amount>
```

```go
// Go — ABI encoding
func ABIPack(name string, args ...interface{}) ([]byte, error) {
    abi, _ := abi.JSON(strings.NewReader(abiJSON))
    return abi.Pack(name, args...)
}
```

## Hardhat & Foundry

### Hardhat Config

```typescript
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.24",
        settings: {
            optimizer: { enabled: true, runs: 200 },
            viaIR: true, // IR-based optimizer
        },
    },
    networks: {
        hardhat: { forking: { url: "https://eth-mainnet.g.alchemy.com/v2/..." } },
        mainnet: { url: process.env.MAINNET_RPC },
    },
};
```

### Foundry Config

```toml
# foundry.toml
[profile.default]
solc_version = "0.8.24"
optimizer = true
optimizer_runs = 200
gas_reports = ["*"]
ffi = true
```

### Truffle Config

```javascript
module.exports = {
    networks: {
        development: {
            host: "127.0.0.1",
            port: 8545,
            network_id: "*",
        },
    },
    compilers: {
        solc: { version: "0.8.24", optimizer: { enabled: true, runs: 200 } },
    },
};
```

## Deployment Flow

```solidity
// 1. Compile → Bytecode + ABI
// 2. Create deployment transaction (constructor args)
// 3. Wait for confirmation
// 4. Verify source code on Etherscan
// 5. Initialize (if proxy) via upgradeable init
// 6. Transfer ownership to multi-sig
```
