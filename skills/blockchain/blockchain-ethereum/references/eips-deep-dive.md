# Critical EIPs — Deep Dive

## EIP-1559: Fee Market Change

**Implemented:** London fork (block 12,965,000)

### Before vs After

| Aspect | Pre-1559 (First-price Auction) | Post-1559 |
|--------|-------------------------------|-----------|
| Fee visibility | Opaque (bid what others bid) | Public base fee |
| Fee burning | None | Base fee burned |
| Validator revenue | Full tx fee | Priority fee (tip) |
| Block fullness | Up to 30M gas | Target 15M, limit 30M |
| User experience | Overpay or stall | Predictable fees |
| Wallet complexity | Manual gas price | Wallet estimates tip |

### Base Fee Algorithm

```python
def calc_base_fee(parent: Block) -> int:
    parent_gas_target = parent.gas_limit // ELASTICITY_MULTIPLIER  # = 15M
    if parent.gas_used == parent_gas_target:
        return parent.base_fee  # unchanged
    elif parent.gas_used > parent_gas_target:
        # Increase: +12.5% max per block
        delta = parent.base_fee * (parent.gas_used - parent_gas_target)
        delta //= parent_gas_target
        delta //= BASE_FEE_MAX_CHANGE_DENOMINATOR  # 8
        return parent.base_fee + max(delta, 1)
    else:
        # Decrease: -12.5% max per block
        delta = parent.base_fee * (parent_gas_target - parent.gas_used)
        delta //= parent_gas_target
        delta //= BASE_FEE_MAX_CHANGE_DENOMINATOR
        return parent.base_fee - delta
```

- `ELASTICITY_MULTIPLIER = 2` (target 15M, limit 30M)
- `BASE_FEE_MAX_CHANGE_DENOMINATOR = 8` (12.5% max change)

### Effective Gas Price

```
effective_gas_price = base_fee + priority_fee
total_fee = gas_used * (base_fee + priority_fee)
burned = gas_used * base_fee
```

### Inclusion List (EIP-7547 / future)

Proposers can force inclusion of certain transactions, preventing censorship by builders in MEV-Boost workflows. Active research area.

---

## EIP-4844: Proto-Danksharding

**Implemented:** Dencun fork (Mar 2024)

### Blob Transaction

New transaction type `BLOB_TX_TYPE = 0x03`:

```
TransactionType || TransactionPayload
0x03 || rlp([chain_id, nonce, max_priority_fee_per_gas, max_fee_per_gas,
             gas_limit, to, value, data, access_list,
             max_fee_per_blob_gas, blob_versioned_hashes, y_parity, r, s])
```

### Blob Structure

```
BlobTx:
├── envelope (standard tx fields)
├── max_fee_per_blob_gas
├── blob_versioned_hashes[]  (≤ 6 blobs per tx, ≤ 6 per block initially)
└── blobs[]                  (sidecar: not in block body)

Block:
├── execution_payload
└── blob_kzg_commitments[]
```

### Blob Gas

```python
TARGET_BLOBS_PER_BLOCK  = 3
MAX_BLOBS_PER_BLOCK     = 6
BLOB_BASE_FEE_UPDATE_FRACTION = 3338477  # ~6.7x over/under target

def calc_blob_base_fee(block: Block) -> int:
    excess = block.excess_blob_gas
    return fake_exponential(excess, BLOB_BASE_FEE_UPDATE_FRACTION)
```

When blob count > target, excess increases, base fee grows exponentially (about 6.7x per excess blob). Market rapidly adjusts.

### KZG Commitments

- Uses **Kate polynomial commitments** (elliptic curve pairings on BLS12-381)
- Blob data = polynomial of degree 4095 (4096 field elements, 31 bytes each)
- Prover commits to polynomial with KZG commitment (48 bytes)
- Verifier checks opening proof (48 bytes) against commitment
- **DAS** (Data Availability Sampling): light nodes randomly sample blob fragments, verify KZG proofs

### Comparison

| Metric | Calldata (pre-4844) | Blob (4844) |
|--------|---------------------|-------------|
| Cost per byte | ~16 gas | ~1 gas (blob gas) |
| Persistence | Forever (in calldata) | ~18 days |
| L2 cost reduction | — | ~10x cheaper |
| Verification | Consensus layer | EL blob gas market |
| Data availability | On-chain | On-chain (pruned) |

---

## EIP-4337: Account Abstraction

**Status:** deployed on mainnet (ERC-4337 bundlers live)

### Architecture

```mermaid
flowchart LR
    U[User] -->|signs UserOperation| B[Bundler]
    B -->|submits UserOperation| E[EntryPoint]
    E -->|verify + execute| A[Account Contract]
    A -->|pays fee (may use)| P[Paymaster]
    P -->|validates payment| E
```

### UserOperation

```solidity
struct UserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;              // deploy account if empty
    bytes callData;              // execution payload
    uint256 callGasLimit;
    uint256 verificationGasLimit;
    uint256 preVerificationGas;  // overhead compensation
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    bytes paymasterAndData;      // address + paymaster-specific data
    bytes signature;
}
```

### Flow

1. User constructs `UserOperation`, signs it
2. **Bundler** validates: `simulateValidation()` via EntryPoint
3. If initCode present: deploy sender contract via CREATE2
4. Bundler batches multiple UserOperations into a single tx
5. EntryPoint: `handleOps(ops, beneficiary)`
6. For each op: `verify()` on sender → `exec()` on sender → post-op
7. Paymaster can sponsor fees, token gas, or social recovery

### Paymaster Patterns

| Type | Description |
|------|-------------|
| **Verifying** | Off-chain signature validates payment |
| **Token** | Paymaster swaps ERC-20 to ETH, pays fees |
| **Sponsor** | Paymaster covers gas (dApp subsidized) |

---

## EIP-2718: Typed Transaction Envelope

**Implemented:** Berlin fork (Apr 2021)

### Format

```
Transaction = TransactionType || TransactionPayload

TransactionType  = 1 byte (0x00–0x7f)
TransactionPayload = byte array (RLP-encoded for legacy typed)
```

### Transaction Type Registry

| Type | Name | EIP | Payload |
|------|------|-----|---------|
| `0x00` | Legacy | — | `rlp([nonce, gp, gl, to, v, r, s])` |
| `0x01` | Access List | 2930 | `rlp([chain, nonce, gp, gl, to, v, data, access_list, y, r, s])` |
| `0x02` | EIP-1559 | 1559 | `rlp([chain, nonce, mprio, mfee, gl, to, v, data, access, y, r, s])` |
| `0x03` | Blob Tx | 4844 | `rlp([chain, nonce, mprio, mfee, gl, to, v, data, access, blob_fee, blob_hashes, y, r, s])` |

Backward compatibility: legacy code can still decode 0x00–0x7f prefix; `0x00` is NOT a TransactionType (it's already a valid RLP byte for legacy format).

---

## EIP-3529: Gas Refund Reduction

**Implemented:** London fork

### Before vs After

| Opcode | Pre-3529 Refund | Post-3529 Refund |
|--------|----------------|------------------|
| SELFDESTRUCT (used) | 24000 | 0 |
| SSTORE (nonzero→0) | 15000 | 4800 (capped) |
| Max refund per tx | 50% of gas used | 20% of gas used (or 1/5) |

### Why

- Gas tokens (e.g., `gasToken`) exploited SSTORE refund to store value as zero → nonzero transitions
- Attack: deposit 1 ETH, mint gas token, later refund gives "free" transactions
- Refund reduction made gas tokens economically unviable

### Before/After Example

```
Pre-3529:
  Gas used: 100000
  Refunds: 50000 (SSTORE deletes) + 24000 (SELFDESTRUCT) = 74000
  Max refund: min(74000, 50000) = 50000
  Net gas: 100000 - 50000 = 50000

Post-3529:
  Gas used: 100000
  Refunds: 4800 (SSTORE delete, capped)
  Max refund: min(4800, 100000 // 5 = 20000) = 4800
  Net gas: 100000 - 4800 = 95200
```

---

## EIP-2929 & EIP-3651: Gas Cost Adjustments

### EIP-2929 (Berlin)

**Cold SLOAD/SSTORE cost increase:**

| Access | Pre-2929 | Post-2929 |
|--------|----------|-----------|
| Any SLOAD | 800 | 2100 (cold), 100 (warm) |
| SSTORE (cold) | 20000/5000 | +2100 cold access |
| CALL (cold address) | 700 | 2600 (100 warm) |
| EXTCODEHASH/EXTCODESIZE | 700 | 2600 cold, 100 warm |

State: per-tx `accessed_addresses` and `accessed_storage_keys` sets.

### EIP-3651 (Merge)

**COINBASE is now warm** — reduces gas cost for `COINBASE` access from 2600 to 100.
Previously `block.coinbase` was cold in every tx; now it's pre-warmed.
