# Randomness and Nonce Generation for Blockchain Signatures

ECDSA and Schnorr signatures depend on a secret per-signature nonce `k`. If `k` is ever reused, predictable, or slightly biased, the private key can be recovered. This reference explains why, how deterministic nonces (RFC 6979) and BIP-340 nonce derivation prevent it, and how wallets and signers should source randomness.

## Why the Nonce Is Critical

ECDSA over secp256k1 with private key `d`, message hash `z`, curve order `n`:

```text
R = k * G,   r = R.x mod n
s = k^-1 * (z + r*d) mod n
```

### Nonce reuse

Two signatures with the same `k` (therefore same `r`) on different messages `z1`, `z2`:

```text
s1 - s2 = k^-1 (z1 - z2)        ->  k = (z1 - z2) / (s1 - s2) mod n
d       = (s1 * k - z1) / r mod n
```

Anyone observing both signatures on-chain recovers the key. Historical incidents include the PlayStation 3 signing key and Android `SecureRandom` flaws that drained Bitcoin wallets in 2013.

### Biased or partially known nonces

Even a few leaked or biased bits per nonce across many signatures allow key recovery with lattice attacks (Hidden Number Problem). Sources of bias include truncating a random value incorrectly, using `rand() % n`, timing side channels in scalar multiplication, and weak RNGs on embedded devices.

## Deterministic Nonces: RFC 6979

RFC 6979 derives `k` with HMAC-DRBG from the private key and message hash, so the same key and message always produce the same `k`, and different messages produce independent-looking nonces. No runtime RNG is needed for the nonce.

```text
k = HMAC_DRBG(key = d, data = H(m))   # simplified; see RFC 6979 section 3.2
```

Properties:
- Eliminates reuse caused by RNG failure.
- Signatures are reproducible, which simplifies testing against known vectors.
- Leaks nothing about `d` as long as HMAC is a PRF.

Most mature libraries use it by default: libsecp256k1 (`secp256k1_nonce_function_rfc6979`), `@noble/curves`, Go `crypto/ecdsa` (uses a hedged construction mixing randomness with key and hash), Python `cryptography` (OpenSSL-based; deterministic ECDSA available in OpenSSL 3.2+ via parameters).

### Hedged (synthetic) nonces

Pure determinism is vulnerable to fault-injection attacks (glitch one of two identical computations, compare outputs). Hedged signing mixes fresh randomness into the deterministic derivation: `k = H(d, z, random)`. If the RNG fails, security falls back to the deterministic case; if faults are injected, the random input prevents equal-input comparisons. libsecp256k1 accepts extra entropy (`ndata`) for this purpose.

## BIP-340 Schnorr Nonces

BIP-340 specifies nonce derivation for Bitcoin Schnorr (Taproot) signatures:

```text
t     = bytes(d) XOR hash_BIP0340/aux(a)       # a = 32 bytes auxiliary randomness
rand  = hash_BIP0340/nonce(t || bytes(P) || m)
k'    = int(rand) mod n                         # fail if 0
```

- `a` is recommended to be fresh randomness (hedged), but all-zero is still secure against reuse because the derivation is deterministic in `d`, `P` and `m`.
- Tagged hashes (`SHA256(SHA256(tag) || SHA256(tag) || x)`) give domain separation between nonce, challenge and aux uses.
- Including the public key `P` defends against related-key attacks.

## Multi-Party Signing Is Different

In MuSig2 and FROST, each signer contributes nonces that must be generated fresh and used once. Deterministic nonce derivation is unsafe there unless the specific protocol allows it, because other parties can make you sign with the same nonce over different aggregate challenges. Follow BIP-327 (MuSig2) and RFC 9591 (FROST): generate nonces with a CSPRNG, store them securely, and delete them after one use. Never persist and reuse a pre-generated nonce after a crash without protocol-level safeguards.

## Sourcing Randomness

| Environment | Use | Avoid |
|-------------|-----|-------|
| Linux / macOS servers | `getrandom(2)` / `/dev/urandom` via language CSPRNG | `rand()`, time-seeded PRNGs |
| Python | `secrets.token_bytes`, `os.urandom` | `random` module |
| JavaScript | `crypto.getRandomValues`, Node `crypto.randomBytes` | Non-cryptographic PRNGs (the built-in Math PRNG) |
| Go | `crypto/rand` | `math/rand` |
| Rust | `rand::rngs::OsRng` / `getrandom` | Seeded `StdRng` for keys |
| Hardware wallets / HSMs | Device TRNG with health tests | Unvalidated entropy at first boot |

Key generation must sample uniformly in `[1, n-1]`. Use rejection sampling or a library function; do not reduce a 256-bit value modulo `n` without accounting for bias (for secp256k1 the bias is negligible because `n` is close to `2^256`, but the habit is dangerous on other curves).

```python
# Uniform secp256k1 private key via rejection sampling
import secrets

N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141

def new_private_key() -> int:
    while True:
        d = int.from_bytes(secrets.token_bytes(32), "big")
        if 1 <= d < N:
            return d
```

Use this only to illustrate the rule; production wallets should generate keys through an audited library or HSM and derive accounts from a BIP-39 seed.

## Detecting Problems On-Chain

- Scan a key's signatures for repeated `r` values: any repeat indicates nonce reuse.
- Low-entropy keys (brain wallets, small integers) are swept by bots within seconds; never derive keys from passwords or phrases without a proper KDF and enough entropy.
- Audit signing services for nonce generation and constant-time scalar multiplication.

## Pitfalls

| Pitfall | Consequence |
|---------|-------------|
| Custom ECDSA implementation | Bias, side channels, reuse bugs |
| VM snapshot / fork of a signing process | Two branches reuse RNG state |
| Deterministic nonces in multi-party protocols | Key extraction by a malicious co-signer |
| Embedded device with no entropy at boot | Predictable keys and nonces |
| Logging signing intermediates | Leaks `k` |

## Checklist

- [ ] Signing uses an audited library with RFC 6979 or hedged nonces
- [ ] Schnorr signing follows BIP-340 with auxiliary randomness
- [ ] Multi-party nonces are fresh, single-use, and deleted after use
- [ ] All key and nonce randomness comes from an OS or hardware CSPRNG
- [ ] Constant-time scalar multiplication; no secret-dependent branches
- [ ] Monitoring for repeated `r` values on hot-wallet keys
