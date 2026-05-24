# Key Derivation and Management

## BIP Standards Overview

| BIP | Description | Key |
|-----|-------------|-----|
| BIP-32 | Hierarchical Deterministic Wallets | Master key, CKFD, xpub/xprv |
| BIP-39 | Mnemonic code for generating deterministic keys | Wordlist, entropy, seed |
| BIP-44 | Multi-account hierarchy | `m/44'/coin'/account'/change/index` |
| BIP-49 | P2WPKH-nested-in-P2SH (SegWit v0) | `m/49'/coin'/account'/change/index` |
| BIP-84 | Native SegWit v0 (bech32) | `m/84'/coin'/account'/change/index` |
| BIP-86 | Taproot (SegWit v1, bech32m) | `m/86'/coin'/account'/change/index` |
| BIP-174 | Partially Signed Bitcoin Transaction (PSBT) | Multi-party txn construction |
| BIP-340 | Schnorr signatures for secp256k1 | Taproot key path |
| BIP-341 | Taproot output structure | MAST + key path spending |
| BIP-342 | Taproot script validation | Schnorr + new opcodes |

## BIP-32: Hierarchical Deterministic Wallets

### Master key generation

```
seed = BIP-39 mnemonic → seed (512 bits)
I = HMAC-SHA512(Key = "Bitcoin seed", Data = seed)
  → I_left (256 bits) = master secret key
  → I_right (256 bits) = master chain code
master_private_key = parse256(I_left)
master_chain_code = I_right

If master_private_key == 0 or ≥ n: regenerate with new seed
```

### Child key derivation (CKD)

```python
def ckd_priv(parent_key: int, parent_chain: bytes, index: int, hardened: bool) -> tuple[int, bytes]:
    if hardened:
        # H(0x00 || parent_pubkey || parent_chain || index)
        # data = 0x00 || parent_privkey (33 bytes) || index (4 bytes)
        data = b'\x00' + parent_key.to_bytes(32, 'big') + index.to_bytes(4, 'big')
        I = hmac_sha512(parent_chain, data)
    else:
        # Normal derivation: H(parent_pubkey || index)
        parent_pub = point_mul(G, parent_key)
        data = parent_pub.serialize(compressed=True) + index.to_bytes(4, 'big')
        I = hmac_sha512(parent_chain, data)

    child_key = (parent_key + int.from_bytes(I[:32], 'big')) % n
    child_chain = I[32:]
    return child_key, child_chain

def ckd_pub(parent_pub: bytes, parent_chain: bytes, index: int) -> tuple[bytes, bytes]:
    assert index < 0x80000000, "cannot derive hardened from pubkey"

    data = parent_pub + index.to_bytes(4, 'big')
    I = hmac_sha512(parent_chain, data)

    child_pub = point_add(parent_pub, point_mul(G, int.from_bytes(I[:32], 'big')))
    child_chain = I[32:]
    return child_pub.serialize(compressed=True), child_chain
```

### Extended keys (xpub/xprv)

Serialization format:
```
4 bytes: version (xprv=0x0488ADE4, xpub=0x0488B21E)
1 byte:  depth (0x00 for master)
4 bytes: parent fingerprint (first 4 bytes of HASH160(parent_pub))
4 bytes: index (0 for master, ≥ 0x80000000 for hardened)
32 bytes: chain code
33 bytes: key data (0x00 + privkey, or compressed pubkey)
```

### Hardened vs Normal

| Property | Normal (`i < 2³¹`) | Hardened (`i ≥ 2³¹`) |
|----------|-------------------|-------------------|
| Derived from | public key | private key |
| xpub can derive child pubkeys | Yes | No |
| xpub can derive child privkeys | No | No |
| Use case | BIP-44 change/external | Account-level separation |

## BIP-39: Mnemonic Code

### Wordlist generation

```
1. entropy: 128-256 bits (128 → 12 words, 256 → 24 words)
2. checksum: first (entropy_bits / 32) bits of SHA256(entropy)
3. concatenate: entropy + checksum
4. split into 11-bit indices → wordlist lookup
```

```python
# BIP-39 mnemonic generation
def mnemonic_from_entropy(entropy: bytes, wordlist: list[str]) -> str:
    assert len(entropy) in [16, 20, 24, 28, 32], "invalid entropy length"

    # compute checksum: first (len*8/32) bits of SHA256
    checksum_bits = len(entropy) * 8 // 32
    hash_bytes = hashlib.sha256(entropy).digest()
    checksum = hash_bytes[0] >> (8 - checksum_bits)

    # combine entropy + checksum as bit string
    bits = ''.join(format(b, '08b') for b in entropy)
    bits += format(checksum, f'0{checksum_bits}b')

    # split into 11-bit groups
    words = []
    for i in range(0, len(bits), 11):
        index = int(bits[i:i+11], 2)
        words.append(wordlist[index])

    return ' '.join(words)

def seed_from_mnemonic(mnemonic: str, passphrase: str = "") -> bytes:
    # BIP-39: seed = PBKDF2(mnemonic, "mnemonic" + passphrase, 2048, 512 bits)
    salt = f"mnemonic{passphrase}"
    return hashlib.pbkdf2_hmac('sha512', mnemonic.encode('utf-8'),
                                salt.encode('utf-8'), 2048, dklen=64)
```

### Passphrase security

Empty passphrase → 12-word mnemonic alone
Non-empty passphrase → different wallet:
- `seed = PBKDF2(mnemonic, "mnemonic" + passphrase, 2048)`
- A passphrase of 1 character provides 2¹²⁸ entropy against brute force
- Passphrase is NOT a checksum — no error detection

## BIP-44: Multi-Account Hierarchy

```
m / purpose' / coin_type' / account' / change / address_index
│   │            │            │         │        └── 0, 1, 2...
│   │            │            │         └── 0 (external), 1 (internal/change)
│   │            │            └── account number (0', 1', 2'...)
│   │            └── coin type (0'=Bitcoin, 60'=Ethereum, 501'=Solana...)
│   └── purpose (44', 49', 84', 86')
└── master seed
```

### Coin type registry (SLIP-44)

| Coin | Index (hardened) | Path |
|------|------------------|------|
| Bitcoin | 0' | m/44'/0'/0'/0/0 |
| Testnet | 1' | m/44'/1'/0'/0/0 |
| Litecoin | 2' | m/44'/2'/0'/0/0 |
| Dogecoin | 3' | m/44'/3'/0'/0/0 |
| Ethereum | 60' | m/44'/60'/0'/0/0 |
| Solana | 501' | m/44'/501'/0'/0/0 |
| Polygon | 966' | m/44'/966'/0'/0/0 |

```python
def derive_bip44(seed: bytes, coin_type: int, account: int = 0,
                 change: int = 0, index: int = 0) -> tuple[PrivateKey, PublicKey]:
    master_key, master_chain = bip32_master_from_seed(seed)
    path = [
        0x80000000 + 44,            # purpose: 44'
        0x80000000 + coin_type,     # coin type
        0x80000000 + account,       # account
        change,                     # change (not hardened)
        index                       # address index (not hardened)
    ]
    key, chain = master_key, master_chain
    for i in path:
        key, chain = ckd_priv(key, chain, i, hardened=(i >= 0x80000000))
    return key, point_mul(G, key)
```

## BIP-174: Partially Signed Bitcoin Transaction (PSBT)

PSBT is a data format for multi-party transaction construction. Roles:

| Role | Responsibilities |
|------|-----------------|
| Creator | Creates empty PSBT with unsigned transaction |
| Updater | Adds inputs, outputs, scripts, BIP-32 derivations |
| Signer | Signs inputs (ECDSA or Schnorr) using private keys |
| Combiner | Merges multiple PSBTs with partial signatures |
| Finalizer | Finalizes by constructing witness/scriptSig |
| Extractor | Extracts fully signed Bitcoin transaction |

### PSBT fields

```python
class PSBT:
    # Global map
    unsigned_tx: Transaction  # required
    xpub: dict[str, tuple[bytes, str, int]]  # xpub → (fingerprint, derivation_path, depth)

    # Per-input map
    non_witness_utxo: Optional[Transaction]  # full prevout tx (P2SH)
    witness_utxo: Optional[TxOut]            # prevout (SegWit)
    partial_sig: dict[bytes, bytes]          # pubkey → signature
    sighash_type: Optional[int]
    redeem_script: Optional[bytes]
    witness_script: Optional[bytes]
    bip32_derivation: dict[bytes, tuple[bytes, str]]  # pubkey → (fingerprint, path)
    final_script_sig: Optional[bytes]  # set by finalizer
    final_script_witness: Optional[bytes]

    # Per-output map
    redeem_script: Optional[bytes]
    witness_script: Optional[bytes]
    bip32_derivation: dict[bytes, tuple[bytes, str]]

    # Raw field serialization: compact_size(type) || compact_size(key) || compact_size(val)
```

### PSBT flow diagram

```
Creator                          Updater                           Signer
   │                                │                                │
   │--- (1) Create PSBT ----------->│                                │
   │                                │--- (2) Add UTXO data -------->│
   │                                │--- (3) Add scripts/derivs --->│
   │                                │                                │--- (4) Sign
   │                                │                                │
   │                                │<--- (5) Return PSBT ----------│
   │                                │                                │
   │<--- (6) Return PSBT -----------│                                │
   │                                                                │
   │--- (7) Combine (if multiple signers)                          │
   │--- (8) Finalize (construct scriptSig/witness)                 │
   │--- (9) Extract (get raw tx)                                   │
```

### Rust PSBT example

```rust
use bitcoin::psbt::PartiallySignedTransaction;
use bitcoin::consensus::encode;

fn psbt_example() {
    // parse PSBT from base64
    let psbt_b64 = "cHNidP8BAH0CAAAAA...";
    let psbt_bytes = base64::decode(psbt_b64).unwrap();
    let psbt: PartiallySignedTransaction = encode::deserialize(&psbt_bytes).unwrap();

    // add signature
    for (i, input) in psbt.inputs.iter_mut().enumerate() {
        if let Some(pubkey) = find_our_pubkey(&input.bip32_derivation) {
            let sig = sign_tx_hash(&psbt.unsigned_tx, i, &privkey);
            input.partial_sigs.insert(pubkey, sig);
        }
    }

    // finalize: construct witness
    for input in psbt.inputs.iter_mut() {
        input.final_script_witness = Some(build_witness(&input.partial_sigs));
    }

    // extract
    let tx = psbt.extract_tx().unwrap();
    println!("{}", encode::serialize_hex(&tx));
}
```

## BIP-340/341/342: Taproot

- BIP-340: Schnorr signatures (64 bytes, key-path only)
- BIP-341: Taproot output (32-byte output key, MAST for script paths)
- BIP-342: Tapscript (new opcodes: OP_CHECKSIGADD, Schnorr-only)

### Derivation path

```
m / 86' / coin_type' / account' / change / index
```

### Taproot address generation

```rust
fn taproot_address(internal_key: XOnlyPublicKey, script_tree: Option<&ScriptTree>) -> Address {
    // tweak = H_TapTweak(internal_key || merkle_root)
    let merkle_root = script_tree.map(|t| t.root());
    let tweak = tagged_hash("TapTweak", &internal_key.serialize());
    let output_key = internal_key.tap_tweak(&tweak);
    Address::from(output_key)
}
```

## Security Considerations

1. **xpub leakage**: An xpub can derive all child public keys. If any child private key is compromised, the chain code allows deriving all descendant keys. Never expose xpubs for hardened-only branches.
2. **BIP-39 passphrase**: Use a strong passphrase to defend against physical mnemonic compromise. Passphrase is not a checksum — no error recovery.
3. **PSBT malleability**: Signers must validate UTXO data (amount, script) before signing. A malicious updater can provide wrong amounts.
4. **Hardened vs Normal**: Always use hardened derivation at the account level to prevent xpub-based child key extraction.
5. **Fingerprint privacy**: BIP-32 parent fingerprints link addresses to the same wallet. Use separate seed for different purposes.
6. **Seed backup error correction**: Mnemonic has no error correction. A single wrong word is unrecoverable. Consider using SLIP-39 (Shamir-based) for redundancy.
