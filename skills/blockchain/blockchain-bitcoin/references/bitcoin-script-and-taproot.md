# Bitcoin Script & Taproot

## Bitcoin Script Execution Model

### Stack-Based, Stateless

```
ScriptPubKey (locking):   OP_DUP OP_HASH160 <pubkey_hash> OP_EQUALVERIFY OP_CHECKSIG
ScriptSig (unlocking):    <sig> <pubkey>

Execution: concatenate [ScriptSig] ++ [ScriptPubKey]
```

Execution is:
- **Stack-based**: push/pop operations on a single main stack (plus altstack for OP_TOALTSTACK)
- **No loops**: no `OP_IF`/`OP_NOTIF` jump offsets; all paths are static
- **No state introspection**: scripts can't query block height, mempool, or past tx values directly (except via `OP_CHECKLOCKTIMEVERIFY` / `OP_CHECKSEQUENCEVERIFY`)
- **Turing-incomplete**: no loops means halting problem doesn't apply

## Opcode Reference

| Code | Hex | Input → Output | Description |
|------|-----|----------------|-------------|
| OP_DUP | 0x76 | x → x x | Duplicate top stack item |
| OP_HASH160 | 0xa9 | x → RIPEMD160(SHA256(x)) | Hash160 (equiv. to HASH256 then RIPEMD160) |
| OP_EQUALVERIFY | 0x88 | x y → (nothing) | Equal, then VERIFY |
| OP_CHECKSIG | 0xac | sig pubkey → true/false | Verify ECDSA signature (single) |
| OP_CHECKMULTISIG | 0xae | x sig1 sig2 ... m pub1 pub2 ... n → true/false | Verify m-of-n multisig |
| OP_RETURN | 0x6a | (anything) → abort | Mark output as provably unspendable |
| OP_IF | 0x63 | true → exec next; false → skip to ELSE/ENDIF | Conditional execution |
| OP_CHECKLOCKTIMEVERIFY | 0xb1 | x → x | Fail if tx nLockTime < x (BIP-65) |
| OP_CHECKSEQUENCEVERIFY | 0xb2 | x → x | Fail if tx input nSequence < x (BIP-112) |
| OP_CHECKSIGADD | 0xba | sig pubkey n → n+1 or n | BIP-342: increment counter on valid sig |
| OP_CAT | 0x7e | disabled | Concatenate (disabled, proposed re-enable) |
| OP_CTV (OP_CHECKTEMPLATEVERIFY) | 0xbb | x → x | BIP-119: commit tx outputs |

## Standard Script Types

### P2PKH (Pay-to-PubKey-Hash)

```
ScriptPubKey (25 bytes):
OP_DUP OP_HASH160 <20-byte pubkey hash> OP_EQUALVERIFY OP_CHECKSIG

ScriptSig:
<sig> <pubkey>

Address: 1ABC... (legacy, Base58Check, 0x00 prefix)
Size:     148 bytes (sig ~72, pubkey ~33)
```

### P2SH (Pay-to-Script-Hash) — BIP-16

```
ScriptPubKey (23 bytes):
OP_HASH160 <20-byte script hash> OP_EQUAL

RedeemScript (in ScriptSig):
<redeemScript> = serialized arbitrary script

Address: 3ABC... (Base58Check, 0x05 prefix)
Common:  P2SH-multisig (1-of-3, 2-of-3), P2SH-wrapped segwit
```

### P2WSH (Pay-to-Witness-Script-Hash) — BIP-141 (SegWit)

```
ScriptPubKey (34 bytes):
0 <32-byte SHA256(script)>

Witness stack:
<stack items for script> <script>

Address: bc1q... (Bech32)
Witness version byte: 0x00
```

### P2TR (Pay-to-Taproot) — BIP-341

```
ScriptPubKey (34 bytes):
1 <32-byte x-only pubkey>

No ScriptSig (must be witness v1)
Address: bc1p... (Bech32m)
```

## Witness Program Structure

```
Witness Program = <version byte> <program data>
  version = 0x00 → SegWit v0 (P2WPKH: 20 bytes, P2WSH: 32 bytes)
  version = 0x01 → SegWit v1 / Taproot (32 bytes x-only pubkey)
  version = 0x02+ → future upgrades (taproot future)

Version 0:
  - 20-byte program: P2WPKH (like P2PKH but witness-based)
  - 32-byte program: P2WSH (like P2SH but witness-based)
Version 1:
  - 32-byte program: P2TR (Taproot output)
```

## Taproot (BIP-340, 341, 342)

### BIP-340 — Schnorr Signatures

Schnorr replaces ECDSA for Taproot:
- Single signatures are 64 bytes (vs ~72 bytes for ECDSA DER-encoded)
- Supports **batch verification**: verify n signatures in ~O(n) instead of O(n*2)
- Key aggregation: MuSig2 (BIP-327) allows multi-party public keys

```
Schnorr signature: (R, s) where:
  R = k·G (nonce point, 32 bytes x-only)
  s = k + e·d (scalar, 32 bytes)
  e = SHA256(SHA256("BIP0340/challenge") || bytes(R) || bytes(P) || m)

Verification: s·G == R + e·P
Batch verify: sum(s_i)·G == sum(R_i + e_i·P_i)
```

### BIP-341 — MAST (Merklized Alternative Script Tree)

```
Taproot output: Q = P + t·G
Where:
  P = internal public key (spending key, typically a MuSig2 aggregate)
  t = SHA256("TapTweak" || bytes(P) || merkle_root)  (tweak)

Spending conditions:
1. KEY PATH: reveal (P, signature) → produces Q, allows spending with single sig
2. SCRIPT PATH: reveal (script, control block) where:
   - control block = internal key P + merkle proof + parity bit
   - merkle proof shows script is in the MAST tree
```

Script tree example:

```
         Root
        /    \
       /      \
      h1       h2
     /  \     /  \
    s1   s2  s3   s4

Key path: sign with internal key P (simplest, most private)
Script path: reveal any leaf (s1, s2, s3, s4) + merkle proof to root
```

### BIP-342 — Tapscript

Changes to Script under Taproot:
- `OP_CHECKSIG` and `OP_CHECKSIGVERIFY` now verify Schnorr (not ECDSA) signatures
- `OP_CHECKMULTISIG` and `OP_CHECKMULTISIGVERIFY` are **removed** — use `OP_CHECKSIGADD` instead
- `OP_CHECKSIGADD`: multi-sig via incrementing a counter
- All signature operations use Schnorr with batch verification support
- `OP_RETURN` is still valid
- No `OP_CODESEPARATOR` support (unlike legacy scripts)
- Signature hashes: `SIGHASH_DEFAULT` (0x00) = like SIGHASH_ALL but with no scriptpubkey commitment to the current input

Tapscript m-of-n multisig example:

```
Script:
  <pubkey1> OP_CHECKSIG
  OP_SWAP
  <pubkey2> OP_CHECKSIGADD
  OP_SWAP
  <pubkey3> OP_CHECKSIGADD
  <m> OP_EQUAL

Witness (for 2-of-3):
  <sig1>
  <sig3>
  <>

Execution:
  sig1 pubkey1 → checksig → pushes 1        # stack: [1]
  1 pubkey2 → checksigadd → pushes 1 or 2   # stack: [<count>]
  <count> pubkey3 → checksigadd → pushes <count> or <count+1>
  <count> 2 → EQUAL → must be true
```

## Example Script Bytecode

### P2PKH Spend (legacy)

```
ScriptSig (unlocking):
  <sig>     = 3045022100... (DER-encoded ECDSA sig, ~71 bytes)
  <pubkey>  = 02b0bd...    (compressed pubkey, 33 bytes)

ScriptPubKey (locking):
  OP_DUP          = 0x76     (1 byte)
  OP_HASH160      = 0xa9     (1 byte)
  <20 bytes>      = 0x14 + 20 bytes pubkey hash
  OP_EQUALVERIFY  = 0x88     (1 byte)
  OP_CHECKSIG     = 0xac     (1 byte)
```

### P2WPKH Spend (SegWit v0)

```
ScriptPubKey: 0x00 0x14 <20-byte pubkey hash>
  (witness version byte 0x00 + push 20 bytes)

Witness data (NOT in ScriptSig):
  <sig>
  <pubkey>

ScriptSig: empty (0x00)

Weight benefit: signature moves to witness (discounted 4x)
  vsize = (base_size * 3 + total_size) / 4
```

### P2TR Spend — Key Path

```
ScriptPubKey: 0x51 0x20 <32-byte x-only pubkey Q>
  (witness version 0x01 = OP_1 + push 32 bytes)

Witness:
  <64-byte Schnorr signature>   # s = k + e·d

Control block header (implied): parity bit to recover Q from P
```

### P2TR Spend — Script Path

```
ScriptPubKey: same (Q = P + t·G)
Witness:
  <stack items for script>      # script-specific inputs
  <script>                       # the Tapscript being executed
  <control block>               # P (internal key) + merkle proof + parity

Where control block = 33 bytes (1 byte version|parity + 32 bytes P)
    + 32 bytes per merkle branch level
```

## Covenants

### OP_CHECKTEMPLATEVERIFY (BIP-119)

```
OP_CTV commitment hash:
  SHA256(SHA256("OP_CTV") || version || locktime || input_index
         || output_count || outputs_commitment
         || value || sequence)

Rules:
  - Tx inputs after this one must continue sequentially
  - Tx outputs must exactly match the commitment
  - Enables: payment pools, vaults, congestion control txs
```

### OP_CAT (Re-enablement BIP — draft)

```
Concatenates top two stack items: (a b → a||b)
  - Length limit: 520 bytes per stack element
  - Enables: BitVM-style computation, Bitcoin covenants,
    cross-input signature aggregation (draft)
```

### Vault Constructions

```
Basic vault (simplified):
  Script: 
    <delay_pubkey> OP_CHECKSIG OP_IF
      OP_CTV <target_template_hash>
    OP_ELSE
      <recovery_pubkey> OP_CHECKSIG
    OP_ENDIF
  
  - Funds can be moved only to pre-committed outputs after delay
  - Recovery key can cancel pending withdrawal
  - Requires OP_CTV (or similar covenant opcode)
```
