# Address Encoding and Checksums: Base58Check, Bech32/Bech32m, EIP-55

Blockchain addresses are encodings of hashes of public keys or scripts, wrapped with version bytes and checksums so typos are detected before funds are sent. This reference covers how Bitcoin and Ethereum addresses are derived and encoded, the checksum algorithms, and validation rules for wallets and services.

## Bitcoin Address Types

| Type | Script | Encoding | Prefix (mainnet) | Payload |
|------|--------|----------|------------------|---------|
| P2PKH | Pay to public key hash | Base58Check | `1` | HASH160(pubkey), 20 bytes |
| P2SH | Pay to script hash | Base58Check | `3` | HASH160(redeemScript), 20 bytes |
| P2WPKH | SegWit v0 key hash | Bech32 | `bc1q` | HASH160(compressed pubkey), 20 bytes |
| P2WSH | SegWit v0 script hash | Bech32 | `bc1q` | SHA256(witnessScript), 32 bytes |
| P2TR | Taproot (SegWit v1) | Bech32m | `bc1p` | x-only tweaked output key, 32 bytes |

`HASH160(x) = RIPEMD160(SHA256(x))`. Testnet and signet use `tb1` for SegWit and different Base58 version bytes; regtest uses `bcrt1`.

## Base58Check

Base58 removes visually ambiguous characters (`0`, `O`, `I`, `l`) and `+`/`/`.

```text
payload  = version_byte || data
checksum = SHA256(SHA256(payload))[0:4]
address  = Base58(payload || checksum)
```

Leading zero bytes are encoded as leading `1` characters. Version bytes: `0x00` (P2PKH), `0x05` (P2SH), `0x80` (WIF private key, mainnet).

```python
import hashlib

ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

def b58check_encode(version: int, data: bytes) -> str:
    payload = bytes([version]) + data
    checksum = hashlib.sha256(hashlib.sha256(payload).digest()).digest()[:4]
    raw = payload + checksum
    n = int.from_bytes(raw, "big")
    out = ""
    while n > 0:
        n, rem = divmod(n, 58)
        out = ALPHABET[rem] + out
    pad = len(raw) - len(raw.lstrip(b"\x00"))
    return "1" * pad + out
```

The 4-byte checksum detects random errors with high probability but cannot locate or correct them.

## Bech32 and Bech32m (BIP-173, BIP-350)

Bech32 uses a BCH code over a 32-character alphabet (`qpzry9x8gf2tvdw0s3jn54khce6mua7l`), lowercase or uppercase but not mixed.

```text
address = hrp || "1" || data_chars || checksum(6 chars)
data    = witness_version (5 bits) || convertbits(witness_program, 8 -> 5)
```

- Guarantees detection of any error affecting up to 4 characters, and most others.
- `hrp` (human-readable part): `bc`, `tb`, `bcrt`.
- BIP-350 found a weakness in the original Bech32: inserting or deleting `q` characters before a final `p` can go undetected. **Bech32m** changes the checksum constant (`0x2bc830a3` instead of `1`).
- Rule: witness version 0 uses Bech32; versions 1 to 16 (including Taproot v1) use Bech32m. Decoders must reject the wrong variant for the version.

Validation steps for a SegWit address:
1. Decode, verify checksum with the correct constant for the version.
2. Check `hrp` matches the expected network.
3. Witness version 0 to 16; program length 2 to 40 bytes; v0 program must be 20 or 32 bytes.
4. Reject mixed case.

Use the BIP-173/BIP-350 reference implementations or a maintained library (`bitcoinjs-lib`, `rust-bitcoin`, `python-bitcoinlib`/`bech32` reference code) rather than writing the polymod by hand.

## Taproot Output Keys

A P2TR address encodes the x-only output key `Q`:

```text
Q = P + H_TapTweak(P || merkle_root) * G
```

`P` is the internal key; `merkle_root` commits to script paths (omitted for key-path only, but BIP-86 still tweaks with an empty root). Do not encode an untweaked internal key as a Taproot address: it removes the commitment and breaks expected spending semantics.

## Ethereum Addresses

```text
address = last_20_bytes(Keccak-256(uncompressed_pubkey_without_0x04_prefix))
```

Keccak-256 here is the original Keccak padding, not NIST SHA3-256; the outputs differ. Use `keccak_256` from a library such as `pycryptodome`, `eth-hash`, `@noble/hashes/sha3` (`keccak_256`).

### EIP-55 mixed-case checksum

```python
from Crypto.Hash import keccak

def to_checksum_address(addr: str) -> str:
    a = addr.lower().removeprefix("0x")
    h = keccak.new(digest_bits=256, data=a.encode("ascii")).hexdigest()
    return "0x" + "".join(c.upper() if c.isalpha() and int(h[i], 16) >= 8 else c
                          for i, c in enumerate(a))
```

- Each hex letter is uppercased if the corresponding nibble of `keccak256(lowercase_hex_address)` is 8 or higher.
- All-lowercase or all-uppercase addresses carry no checksum; wallets should warn and require extra confirmation.
- EIP-1191 adds the chain ID into the checksum for some networks; it is not universally adopted, so most EVM tooling uses plain EIP-55.

### Contract addresses

```text
CREATE:  keccak256(rlp([sender, nonce]))[12:]
CREATE2: keccak256(0xff || sender || salt || keccak256(init_code))[12:]
```

CREATE2 addresses are predictable before deployment, enabling counterfactual wallets; the same `init_code` and salt from the same deployer yields the same address on every EVM chain where the deployer exists.

## Other Ecosystems

| Chain | Address | Encoding |
|-------|---------|----------|
| Solana | Ed25519 public key (32 bytes) or program-derived address | Base58, no checksum |
| Cosmos SDK | HASH160-style 20-byte hash (or 32 bytes for module accounts) | Bech32 with chain-specific hrp (`cosmos`, `osmo`) |
| Cardano (Shelley) | Header + payment and stake credentials | Bech32 (`addr1`), longer than the BIP-173 90-char limit |

Solana addresses have no checksum: validate that the decoded value is 32 bytes and, for user wallets, optionally that it is on the Ed25519 curve (PDAs intentionally are not).

## Validation Rules for Services

| Rule | Reason |
|------|--------|
| Validate checksum and network before accepting a withdrawal address | Prevent irreversible loss |
| Store addresses in canonical form (lowercase Bech32, EIP-55 for display) | Consistent comparison |
| Compare EVM addresses case-insensitively after validation | Checksum casing is presentation only |
| Never derive an address by string manipulation of another chain's address | Different hashing and formats |
| Show and confirm the full address, not truncated forms | Address poisoning attacks use look-alike prefixes and suffixes |

Address poisoning: attackers send zero-value or dust transfers from addresses that share the first and last characters with a victim's real counterparty, hoping the victim copies from history. Wallet UIs should flag never-before-used counterparties and discourage copying from transaction history.

## Checklist

- [ ] Encode and decode with audited libraries; test against BIP and EIP vectors
- [ ] Bech32 for witness v0, Bech32m for v1+; wrong variant rejected
- [ ] Network (hrp / version byte / chain) validated
- [ ] EIP-55 checksum verified when mixed case is present; warn when absent
- [ ] Keccak-256 (not SHA3-256) used for Ethereum
- [ ] Address poisoning mitigations in the UI
