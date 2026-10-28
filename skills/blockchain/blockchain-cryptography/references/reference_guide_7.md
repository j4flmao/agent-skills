# Encryption and Privacy Primitives in Blockchain Applications

Blockchains are public by default: every transaction and storage slot is readable, including "private" Solidity variables. Applications that need confidentiality must encrypt off-chain, use key agreement between parties, or use privacy protocols. This reference covers hybrid encryption with wallet keys, ECIES, stealth addresses (ERC-5564), and the limits of each approach.

## What Is Not Confidential

| Assumption | Reality |
|------------|---------|
| `private` state variables are hidden | Readable with `eth_getStorageAt` |
| Data in calldata/events is visible only to the recipient | Visible to everyone, forever |
| Encrypted data on-chain is safe long-term | Ciphertext is permanent; future key compromise or broken algorithms expose it ("harvest now, decrypt later") |
| Mempool transactions are private until mined | Public mempool exposes them to searchers |

Store only commitments or ciphertext you are prepared to have attacked indefinitely; prefer keeping sensitive data off-chain with on-chain hashes.

## Do Not Reuse Signing Keys for Encryption

Wallet keys are signing keys. Reusing the same secp256k1 key for ECDH and signing is not catastrophic in itself for well-designed schemes, but it couples two security domains, complicates rotation, and was the reason MetaMask deprecated `eth_getEncryptionPublicKey` / `eth_decrypt`. Better patterns:

- Derive a separate encryption key: sign a fixed, domain-separated message with the wallet (deterministic RFC 6979 signature), and use HKDF over the signature to derive an X25519 key. The same wallet always reproduces it; the derivation message must be unique to your application and clearly displayed to the user.
- Or use dedicated messaging keys published in a registry (as XMTP and similar protocols do).

## Hybrid Encryption with X25519 + AEAD

Standard construction (equivalent to HPKE, RFC 9180, which should be preferred when available):

```text
sender:   eph_sk, eph_pk = X25519.generate()
          shared = X25519(eph_sk, recipient_pk)
          key    = HKDF-SHA256(shared, salt = eph_pk || recipient_pk, info = "app:v1:msg")
          ct     = ChaCha20-Poly1305(key, nonce, plaintext, aad = context)
          send (eph_pk, nonce, ct)
```

```python
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
import os

RAW = serialization.Encoding.Raw, serialization.PublicFormat.Raw

def encrypt(recipient_pk: X25519PublicKey, plaintext: bytes, aad: bytes) -> tuple[bytes, bytes, bytes]:
    eph = X25519PrivateKey.generate()
    eph_pub = eph.public_key().public_bytes(*RAW)
    shared = eph.exchange(recipient_pk)
    key = HKDF(algorithm=hashes.SHA256(), length=32,
               salt=eph_pub + recipient_pk.public_bytes(*RAW),
               info=b"example-app:v1:message").derive(shared)
    nonce = os.urandom(12)
    return eph_pub, nonce, ChaCha20Poly1305(key).encrypt(nonce, plaintext, aad)
```

- Bind context (chain ID, contract, recipient, message type) as AAD so ciphertexts cannot be moved between contexts.
- A fresh ephemeral key per message gives sender-side forward secrecy for that message, but not recipient forward secrecy; for long-lived conversations use a ratcheting protocol (Signal-style, MLS RFC 9420).

## ECIES on secp256k1

ECIES is the same pattern over secp256k1 (ECDH + KDF + symmetric cipher + MAC/AEAD), used by Ethereum's devp2p RLPx handshake and several wallet libraries (`eciesjs`). Parameters vary between libraries (KDF, cipher mode, point encoding), so ciphertexts are not interoperable unless both sides use the same library and version. Prefer an AEAD (AES-256-GCM or ChaCha20-Poly1305) over CBC/CTR plus separate MAC.

## Stealth Addresses (ERC-5564 / ERC-6538)

Stealth addresses let a sender pay a recipient at a fresh one-time address that only the recipient can link to themselves.

```text
Recipient publishes stealth meta-address: (spending pubkey P_spend, viewing pubkey P_view)
Sender:
  r       = random scalar, R = r*G            (ephemeral pubkey, published in an Announcement event)
  s       = H(r * P_view)                     (shared secret)
  P_stealth = P_spend + s*G
  address = address(P_stealth); view tag = first byte of s
Recipient (scans announcements):
  s'      = H(p_view * R); check view tag first, then derive P_stealth and compare
  spending key = p_spend + s'  (mod n)
```

- ERC-5564 defines the scheme and the `Announcer` contract events; ERC-6538 defines a registry for meta-addresses.
- The view tag lets scanners discard most announcements with one byte comparison.
- The viewing key can be shared with an auditor or scanning service without granting spending power.
- Privacy leaks when the stealth address is funded for gas from a known address or when funds are consolidated; plan gas sponsorship (paymasters) and withdrawal patterns.

## Other Privacy Approaches

| Approach | Confidentiality | Trust / limits |
|----------|-----------------|----------------|
| ZK shielded pools (Zcash, Aztec, Railgun-style) | Amounts and parties hidden | Circuit correctness, anonymity set size, regulatory considerations |
| Confidential transactions (Pedersen + range proofs) | Amounts hidden | Parties visible unless combined with other techniques |
| Trusted execution environments (SGX/TDX-based chains) | Contract state encrypted | Hardware trust, side-channel history |
| Fully homomorphic encryption (fhEVM designs) | Computation on encrypted state | Performance, key management by threshold network |
| Private mempools / encrypted order flow | Transaction contents hidden until inclusion | Trust in builder/relay or threshold decryption committee |

## Key Management for Encrypted Data

- Separate keys per purpose (signing, encryption, viewing) with domain-separated derivation.
- Plan rotation: data encrypted to an old key remains decryptable by it; re-encrypt off-chain stored data on rotation.
- For shared data, use envelope encryption: encrypt data once with a data key, then encrypt the data key to each recipient.
- Consider post-quantum exposure for data that must stay confidential for decades: on-chain ciphertext is permanent. Hybrid KEMs (X25519 + ML-KEM-768, as in HPKE drafts and TLS) reduce harvest-now-decrypt-later risk for off-chain transport.

## Pitfalls

| Pitfall | Consequence |
|---------|-------------|
| Storing secrets in contract storage | Public to everyone |
| Reusing nonces with AES-GCM or ChaCha20-Poly1305 | Plaintext and authentication key leakage |
| Custom ECIES variants | Interoperability failures and subtle weaknesses |
| Encrypting low-entropy values deterministically | Brute-forceable by comparison |
| Funding stealth addresses from a linked account | Breaks unlinkability |

## Checklist

- [ ] No secrets stored on-chain in plaintext or with permanent ciphertext unless the risk is accepted
- [ ] HPKE or X25519 + HKDF + AEAD with context-bound AAD
- [ ] Encryption keys separate from signing keys
- [ ] Random 96-bit nonces per message or a misuse-resistant AEAD
- [ ] Stealth-address flows handle gas funding without linking
- [ ] Long-term confidentiality evaluated against future cryptanalysis
