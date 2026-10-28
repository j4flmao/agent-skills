# Transaction Formats and Validation Rules

How Bitcoin and Ethereum encode transactions and the checks a node performs before a transaction enters the mempool or a block. Complements `blockchain-data-structures.md` (block layout) and `state-machines.md` (state models).

## Validation Stages

```text
bytes from peer/RPC
  │ 1. decode         well-formed encoding, size limits
  │ 2. stateless      signature, chain ID, intrinsic gas / standardness
  │ 3. stateful       inputs exist & unspent (UTXO) / nonce & balance (account)
  │ 4. policy         fee floor, replacement rules, mempool limits
  ▼
mempool ──► block template ──► consensus validation in block context
```

Stages 1–3 are consensus rules (a block containing a violating tx is invalid). Stage 4 is local policy: nodes may differ, and a policy-rejected tx can still be valid in a block.

## Bitcoin

### Structure
| Field | Notes |
|-------|-------|
| `version` | 1 or 2 (v2 enables BIP68 relative lock-time) |
| `inputs[]` | previous outpoint `(txid, vout)`, `scriptSig`, `nSequence` |
| `outputs[]` | `value` (satoshis), `scriptPubKey` |
| `witness` | per-input stack (SegWit, BIP141); excluded from `txid`, included in `wtxid` |
| `nLockTime` | absolute lock by height (< 500,000,000) or Unix time |

Weight = base size × 3 + total size; block limit 4,000,000 weight units. Virtual size (vbytes) = weight / 4, which is the unit for fee rates (sat/vB).

### Consensus checks
- Every input references an existing unspent output; no double spend within the tx or block.
- Σ inputs ≥ Σ outputs; the difference is the fee. Each output value in [0, 21,000,000 BTC].
- Scripts evaluate to true under the active flags (P2PKH, P2SH, P2WPKH, P2WSH, P2TR with Schnorr/BIP340 and Tapscript).
- Coinbase outputs are spendable only after 100 confirmations.
- Lock-time and BIP68/112 relative lock-time satisfied.

### Standardness policy (Bitcoin Core defaults, configurable)
- Standard output script types; non-standard scripts are not relayed.
- Minimum relay fee (`-minrelaytxfee`) and dust limits per output type.
- Replace-by-fee: Bitcoin Core 28 made full-RBF the default (`-mempoolfullrbf=1`), so any unconfirmed tx can be replaced by one paying a higher absolute fee and fee rate that also covers its own relay bandwidth.
- Package relay pieces (1-parent-1-child packages, TRUC/v3 transactions) shipped in Bitcoin Core 28 to make fee bumping of pre-signed transactions reliable.

### Signature hashing
Use the sighash algorithm for the input type: legacy, BIP143 (SegWit v0, commits to input amounts), BIP341 (Taproot, commits to all input amounts and scriptPubKeys). Getting this wrong produces signatures that verify locally in tests but are rejected on mainnet.

## Ethereum

### Typed transactions (EIP-2718 envelope)
| Type | EIP | Adds |
|------|-----|------|
| `0x00` legacy | EIP-155 | `chainId` folded into `v` for replay protection |
| `0x01` | EIP-2930 | `accessList` |
| `0x02` | EIP-1559 | `maxFeePerGas`, `maxPriorityFeePerGas` |
| `0x03` | EIP-4844 | blob versioned hashes, `maxFeePerBlobGas` (blobs travel as a sidecar) |
| `0x04` | EIP-7702 | `authorizationList` letting an EOA set delegated code (Pectra, 2025) |

Encoding: `type || rlp([...fields, yParity, r, s])`. The hash signed is `keccak256(type || rlp(fields))`.

### Stateless checks
- Decodes, within size limits, recognized type for the active fork.
- Signature valid on secp256k1, `s` in the lower half of the curve order (EIP-2), sender recovered.
- `chainId` matches the network.
- `gasLimit ≥ intrinsic gas` (21,000 base + calldata cost + access-list and creation costs).
- `maxPriorityFeePerGas ≤ maxFeePerGas`.

### Stateful checks
- `nonce == account.nonce` for inclusion; mempools also queue future nonces up to a limit.
- `balance ≥ gasLimit × maxFeePerGas + value` (+ blob gas for type 3).
- Sender has no deployed code, except EIP-7702 delegation designators (EIP-3607 rule, amended by 7702).
- In block context: `maxFeePerGas ≥ baseFee`.

### Fee computation (EIP-1559)
```text
effectivePriorityFee = min(maxPriorityFeePerGas, maxFeePerGas - baseFee)
effectiveGasPrice    = baseFee + effectivePriorityFee
burned               = baseFee × gasUsed
to fee recipient     = effectivePriorityFee × gasUsed
```

The base fee moves by at most 12.5% per block toward a target of half the block gas limit.

### Replacement
Clients replace a pending tx with the same sender and nonce only if fees rise by a client-defined minimum (geth default: 10% on both fee caps). Blob transactions need a larger bump in geth.

## Implementation Sketch (intrinsic gas, Python)

Self-contained version of the post-Pectra intrinsic gas rule, useful for wallets and test fixtures.

```python
from __future__ import annotations

TX_BASE = 21_000
TX_CREATE = 32_000
ZERO_BYTE, NONZERO_BYTE = 4, 16                # EIP-2028
ACCESS_ADDR, ACCESS_KEY = 2_400, 1_900         # EIP-2930
INITCODE_WORD = 2                              # EIP-3860
AUTH_COST = 25_000                             # EIP-7702, per authorization
FLOOR_PER_TOKEN = 10                           # EIP-7623


def intrinsic_gas(data: bytes, is_create: bool, access_list: list[tuple[str, list[str]]],
                  authorizations: int) -> tuple[int, int]:
    """Return (intrinsic_gas, calldata_floor). gasLimit must be >= both."""
    zeros = data.count(0)
    nonzeros = len(data) - zeros
    gas = TX_BASE + zeros * ZERO_BYTE + nonzeros * NONZERO_BYTE
    if is_create:
        gas += TX_CREATE + INITCODE_WORD * ((len(data) + 31) // 32)
    gas += sum(ACCESS_ADDR + ACCESS_KEY * len(keys) for _, keys in access_list)
    gas += AUTH_COST * authorizations
    tokens = zeros + 4 * nonzeros
    floor = TX_BASE + FLOOR_PER_TOKEN * tokens
    return gas, floor


def check_fees(max_fee: int, max_priority: int, base_fee: int) -> int:
    if max_priority > max_fee:
        raise ValueError(f"priority fee {max_priority} exceeds max fee {max_fee}")
    if max_fee < base_fee:
        raise ValueError(f"max fee {max_fee} below base fee {base_fee}")
    return base_fee + min(max_priority, max_fee - base_fee)  # effective gas price
```

Constants change with forks; keep them keyed by fork in production code and verify against the execution specs (`ethereum/execution-specs`).

## Comparison

| Aspect | Bitcoin (UTXO) | Ethereum (account) |
|--------|----------------|--------------------|
| Replay protection | Inputs can be spent once | Nonce + chainId |
| Parallel validation | Natural (independent inputs) | Needs access lists or speculation |
| Fee unit | sat/vB | gas × price, split base/priority |
| Double-spend check | UTXO set lookup | Nonce ordering |
| Malleability | Fixed for witness data by SegWit | Signature `s` normalization (EIP-2) |

## Pitfalls

- Treating mempool policy as consensus (or the reverse).
- Building raw Ethereum transactions without `chainId` (legacy pre-EIP-155) → replayable across chains.
- Computing Bitcoin fees from `size` instead of `vsize`.
- Ignoring the blob sidecar when relaying type-3 transactions.
- Assuming an EOA never has code after Pectra (EIP-7702 delegation).

## Checklist

- [ ] Decode and size limits before any expensive work
- [ ] Signature, chain ID and intrinsic gas/standardness checked statelessly
- [ ] Nonce/balance or UTXO existence checked against current state
- [ ] Policy (fees, RBF, limits) separated from consensus code
- [ ] Fork-dependent tx types gated by activation rules
