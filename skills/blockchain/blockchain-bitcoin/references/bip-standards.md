# BIP Standards Reference

## BIP-32: Hierarchical Deterministic (HD) Wallets

### Master Key Derivation

```
Master seed (128-512 bits)
    ↓
I = HMAC-SHA512(key = "Bitcoin seed", data = seed)
    ↓
I_left  (256 bits) = master_private_key (k)
I_right (256 bits) = master_chain_code (cc)

master_public_key = k·G  (elliptic curve secp256k1)
```

### Child Key Derivation (CKD)

#### Non-Hardened (public derivation)

```
parent_pubkey + parent_chaincode + index
    ↓
I = HMAC-SHA512(key = parent_chaincode, data = parent_pubkey || index_4bytes)
    ↓
I_left (256 bits) = child_private_key = parse_256(I_left) + parent_private_key (mod n)
    child_public_key = child_private_key · G
    child_chaincode = I_right (256 bits)
```

#### Hardened (private key required)

```
parent_private_key + parent_chaincode + index'
    ↓    (index' = i + 2^31, for i ≥ 0)
I = HMAC-SHA512(key = parent_chaincode, data = 0x00 || parent_private_key || index'_4bytes)
    ↓
I_left (256 bits) = child_private_key (same formula)
```

### Extended Keys

```
xprv: version(4) + depth(1) + parent_fingerprint(4) + child_number(4) + chaincode(32) + key(33)
xpub: version(4) + depth(1) + parent_fingerprint(4) + child_number(4) + chaincode(32) + key(33)

xprv (mainnet):  version = 0x0488ADE4
xpub (mainnet):  version = 0x0488B21E
tprv (testnet):  version = 0x04358394
tpub (testnet):  version = 0x043587CF

Format: Base58Check encoding of 78-byte serialization
```

## BIP-39: Mnemonic Phrases

### Encoding

```
Entropy (128-256 bits)
    ↓
SHA-256(entropy) → first (entropy_bits/32) bits = checksum
    ↓
entropy + checksum → split into 11-bit words
    ↓
BIP-39 English word list (2048 words)

Entropy    Words    Security
128 bits   12       ~128 bits
192 bits   18       ~192 bits
256 bits   24       ~256 bits
```

### Passphrase (BIP-39 optional)

```
seed = PBKDF2(PRF: HMAC-SHA512,
              password: mnemonic_sentence,
              salt: "mnemonic" + passphrase,
              iterations: 2048,
              key_length: 512 bits)

Same mnemonic + different passphrase = different wallet!
No passphrase: salt = "mnemonic"
```

## BIP-44: Multi-Account Hierarchy

### Derivation Path

```
m / purpose' / coin_type' / account' / change / address_index

Purpose': 44' for BIP-44 (legacy), 49' for BIP-49 (P2SH-SegWit)
          84' for BIP-84 (native SegWit), 86' for BIP-86 (Taproot)
Coin_type: 0' for Bitcoin, 1' for Testnet, 60' for Ethereum
Account':  0' for first account (normally 0')
Change:    0 = external (receive), 1 = internal (change)
```

### Key Path Tree

```
m (master seed)
├── m/44'/0'/0'      (BIP-44 legacy: P2PKH)
│   ├── 0/external    m/44'/0'/0'/0/0, /0/1, ...
│   └── 1/internal    m/44'/0'/0'/1/0, /1/1, ...
├── m/49'/0'/0'      (BIP-49: P2WPKH-in-P2SH)
│   ├── 0/external    bc3... addresses
│   └── 1/internal
├── m/84'/0'/0'      (BIP-84: native SegWit v0)
│   ├── 0/external    bc1q... addresses
│   └── 1/internal
└── m/86'/0'/0'      (BIP-86: Taproot v1)
    ├── 0/external    bc1p... addresses
    └── 1/internal
```

### Standard Derivation Paths Compared

| BIP | Path | Address Format | Output Script | Since |
|-----|------|----------------|---------------|-------|
| 44 | `m/44'/0'/0'/0/n` | 1ABC... (Base58) | P2PKH | 2014 |
| 49 | `m/49'/0'/0'/0/n` | 3ABC... (Base58) | P2WPKH-in-P2SH | 2016 |
| 84 | `m/84'/0'/0'/0/n` | bc1q... (Bech32) | P2WPKH (SegWit v0) | 2017 |
| 86 | `m/86'/0'/0'/0/n` | bc1p... (Bech32m) | P2TR (Taproot v1) | 2021 |

## BIP-174: Partially Signed Bitcoin Transaction (PSBT)

### Structure

```
PSBT = Magic (4 bytes: 0x70736274 "psbt") + Global Map + Input Maps + Output Maps

Global Map:
  - Unsigned Transaction (required): serialized tx without witness data
  - Extended Public Keys: {xpub, fingerprint, derivation path}
  - Version number (current: 0 or 2 for BIP-370)
  - Proprietary data

Input Map (per input):
  - Non-witness UTXO (full tx for legacy inputs)
  - Witness UTXO (txout for segwit/taproot inputs)
  - Partial signatures {pubkey → sig}
  - Derivation path {pubkey → (fingerprint, path)}
  - Redeem script (for P2SH)
  - Witness script (for P2WSH)
  - Finalized scriptSig
  - Finalized scriptWitness
  - SIGHASH type (default: SIGHASH_ALL)
  - Taproot key spend signature
  - Taproot script spend signature
  - Proprietary data

Output Map (per output):
  - Redeem script
  - Witness script  
  - Derivation path {pubkey → (fingerprint, path)}
  - Taproot internal key
  - Taproot tree
  - Proprietary data
```

### Roles

```
Creator     → Create empty PSBT with unsigned tx
Updater     → Add UTXO info, redeem scripts, derivation paths
Signer      → Add signatures (partial_sigs, taproot_key_sig)
Combiner    → Merge PSBTs from multiple signers
Finalizer   → Extract finalized scriptSig/scriptWitness
Extractor   → Produce raw signed transaction from final PSBT
```

### PSBT Example

```
Base64 PSBT: cHNidP8BAFICAAAAAgsI...

Decoded:
  Global:
    unsigned tx: 0100000002...
  Input 0:
    witness_utxo: { value: 100000, scriptPubKey: 0014a4b... }
    partial_sig: { 03abc... → 30450221... }
    derivation_path: { 03abc... → (f1a2b3c4, m/84'/0'/0'/0/0) }
    sighash_type: 0x01
  Input 1:
    witness_utxo: { value: 50000, scriptPubKey: 0014b5c... }
    derivation_path: { 02def... → (f1a2b3c4, m/84'/0'/0'/1/0) }
    sighash_type: 0x01
  Output 0:
    derivation_path: { 03abc... → (f1a2b3c4, m/84'/0'/0'/0/5) }
  Output 1:
    derivation_path: { 02def... → (f1a2b3c4, m/84'/0'/0'/1/2) }
```

## BIP-340: Schnorr Signatures (secp256k1)

### Curve Parameters

```
Curve: secp256k1
  y² = x³ + 7 (mod p)
  p = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
  n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
  G = (0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798,
       0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8)
```

### Signing

```
Input:  private key d (32 bytes), message m (32 bytes), optional aux_rand (32 bytes)
Output: signature (R_x, s) = 64 bytes

Algorithm:
  1. Let P = d·G  (public key, x-only)
  2. Let rand = aux_rand XOR SHA256(d || m)  (antipass)
  3. Let k = SHA256(SHA256("BIP0340/nonce") || bytes(P) || m || rand) mod n
  4. Let R = k·G
  5. Let e = SHA256(SHA256("BIP0340/challenge") || bytes(R) || bytes(P) || m) mod n
  6. Let s = (k + e·d) mod n
  7. Return (bytes(R), bytes(s)) — 64 bytes
```

### Batch Verification

```
Given: (P_1, m_1, sig_1), ..., (P_n, m_n, sig_n) where sig_i = (R_i, s_i)

Batch verify:
  1. Let a_i = random 128-bit coefficient (anti-Gröbner trick)
  2. Verify: (sum_i a_i · s_i) · G = sum_i (a_i · R_i) + sum_i (a_i · e_i · P_i)
  3. e_i = SHA256("BIP0340/challenge" || bytes(R_i) || bytes(P_i) || m_i)

Cost: n point multiplications (vs 2n for individual verification)
Performance gain: ~1.5-2x for n=10, ~2-3x for n=100
```

### Tagged Hashes

```
To prevent signature reuse across protocols:
  tag = "BIP0340/challenge"
  tag_hash = SHA256(tag)
  tagged_hash(tag, x) = SHA256(tag_hash || tag_hash || x)

Taproot uses tagged hashes for:
  - TapTweak: SHA256("TapTweak" || ...)
  - TapLeaf: SHA256("TapLeaf" || ...)
  - TapBranch: SHA256("TapBranch" || ...)
  - BIP340 challenge/nonce
```

### Key Tweaking (BIP-341)

```
Given: internal key P, Merkle root m (or empty for key-only path)

tweak = SHA256("TapTweak" || bytes(P) || m)
Q = P + tweak · G   (output key / Taproot address)

To tweak a private key:
  d_Q = d_P + tweak (mod n)
  Q = d_Q · G

Signing with key path:
  sign with d_Q (tweaked private key) — produces Schnorr sig for Q

Signing with script path:
  sign with d_P (internal key) — reveal script + control block
  No tweaked private key needed for script path spends
```

## BIP-341 & BIP-342: Taproot Details

### MAST (BIP-341)

```
Leaf version: 0xc0 (Tapscript) or 0x50 (future upgrades)

Leaf hash: SHA256("TapLeaf" || leaf_version || script_size || script)
Branch hash: SHA256("TapBranch" || left_child_hash || right_child_hash)

Control block (script path spend):
  - Byte 0: leaf_version (bottom bit = parity of P)
  - Bytes 1-32: internal key P (x-only)
  - Bytes 33+: merkle proof (sibling hashes, bottom-up)

Verification:
  1. Recompute leaf hash from script + leaf_version
  2. Hash up the tree using sibling hashes
  3. Compare resulting root to merkle_root from tweak
  4. Restore Q from P + parity bit
```

### Tapscript (BIP-342)

| Feature | Legacy Script | Tapscript |
|---------|--------------|-----------|
| Signature scheme | ECDSA (DER-encoded) | Schnorr (64 bytes) |
| Multisig | OP_CHECKMULTISIG | OP_CHECKSIGADD |
| Batch verification | Not supported | Native support |
| SIGHASH | SIGHASH_ALL, etc. | + SIGHASH_DEFAULT (0x00) |
| OP_CODESEPARATOR | Supported | Removed |
| Signature opcode limit | 201 per tx | 50 + 50 per validation batch |

SIGHASH_DEFAULT (value 0x00): like SIGHASH_ALL but excludes scriptPubKey commitment to the current input — enables fee delegation and other advanced constructions.

### Resource Limits (BIP-342)

```
Max stack size:        1000 elements (unchanged from legacy)
Max stack element:     520 bytes (unchanged)
Max script size:       10,000 bytes (was 10,000 in legacy, now tighter)
Max opcodes per script: unlimited (was 201, now unlimited due to no OP_CHECKMULTISIG)
Max signature checks:  50 per script, 50 per batch of validations
```
