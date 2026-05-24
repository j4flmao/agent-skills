# Hash Functions in Blockchain

## Comparison Table

| Hash | Digest | Internal State | Security | Blockchain Use |
|------|--------|---------------|----------|----------------|
| SHA-256 | 256 bits | 256 bits (8 × 32) | 128-bit preimage | Bitcoin PoW, transaction IDs |
| Keccak-256 | 256 bits | 1600 bits (5×5×64) | 128-bit preimage | Ethereum account/state |
| Keccak-512 | 512 bits | 1600 bits | 256-bit preimage | EVM precompile 0x04 |
| BLAKE2b | 1-64 bytes | 64 bytes | 128-bit (256-bit output) | Zcash, Decred |
| BLAKE2s | 1-32 bytes | 32 bytes | 128-bit (256-bit output) | Handshake, lightweight chains |
| Poseidon | variable | T × F (state size) | 128-bit (target) | Mina, Filecoin, StarkNet ZK |
| MiMC | variable | 1 field element | ~80-bit (target) | ZK-friendly preimage |

## SHA-256

Bitcoin's PoW. Double-SHA256 (SHA256(SHA256(x))) used for:
- Block header hashing (version, prev_block, merkle_root, time, bits, nonce)
- Transaction IDs (txid) and witness txid (wtxid)
- Address checksums (RIPEMD160(SHA256(pubkey)))

Algorithm: 64 rounds of compression function, 512-bit message blocks, Davies-Meyer construction.

```go
import "crypto/sha256"

func doubleSha256(data []byte) []byte {
    first := sha256.Sum256(data)
    second := sha256.Sum256(first[:])
    return second[:]
}

// Bitcoin merkle root construction (iterative pairing)
func bitcoinMerkleRoot(txids [][32]byte) [32]byte {
    if len(txids) == 0 {
        return [32]byte{}
    }
    for len(txids) > 1 {
        if len(txids)%2 == 1 {
            txids = append(txids, txids[len(txids)-1])
        }
        var next [][32]byte
        for i := 0; i < len(txids); i += 2 {
            combined := append(txids[i][:], txids[i+1][:]...)
            hash := sha256.Sum256(combined)
            next = append(next, sha256.Sum256(hash[:]))
        }
        txids = next
    }
    return txids[0]
}
```

SHA-256 performance: ~200-300 MB/s (software). ASIC-optimized Bitcoin mining achieves > 100 TH/s.

## Keccak-256 (Ethereum)

Keccak (SHA-3 finalist, but Ethereum uses the original Keccak, NOT the FIPS-202 SHA-3 variant). The difference: FIPS-202 changed padding byte from 0x01 to 0x06.

Ethereum uses:
- keccak256(RLP(txn_header)) → transaction hash
- keccak256(rlp.encode([nonce, gasPrice, gasLimit, to, value, data, v, r, s])) → signed txn hash
- keccak256(rlp.encode(account_state)) → state root update
- keccak256(code) → code hash in account

```python
import hashlib

def keccak256(data: bytes) -> bytes:
    # pysha3 for original keccak; hashlib.sha3_256 is FIPS-202!
    k = hashlib.new('sha3_256', data)  # WRONG — this is FIPS-202 SHA3
    # Correct: use eth_hash
    from eth_hash.auto import keccak
    return keccak(data)

def eth_address_from_pubkey(pubkey: bytes) -> bytes:
    # take last 20 bytes of keccak256 of uncompressed pubkey (without 0x04 prefix)
    return keccak256(pubkey)[12:]

def contract_address(deployer: bytes, nonce: int) -> bytes:
    return keccak256(rlp.encode([deployer, nonce]))[12:]
```

### EVM precompiles

| Address | Function | Gas |
|---------|----------|-----|
| 0x02 | SHA256 | 60 + 12 per word |
| 0x04 | RIPEMD160 | 600 + 120 per word |
| 0x05 | BigModExp | variable (quadratic) |
| 0x06 | BN254 add | 150 |
| 0x07 | BN254 scalar mul | 6,000 |
| 0x08 | BN254 pairing | 34,000 + per pair |
| 0x09 | BLAKE2f | variable |

## BLAKE2

BLAKE2b (64-bit words, 16 rounds) and BLAKE2s (32-bit words, 10 rounds). Faster than SHA-256 and SHA-3.

- Zcash: BLAKE2b-256 for Equihash PoW
- Decred: BLAKE2b-256 for block header
- Handshake: BLAKE2b-256 for name commitments, BLAKE2s for DNS-level hashing
- Personalization: BLAKE2 supports context separation via personalization string

```rust
use blake2::{Blake2b, Blake2s, Digest};

fn blake2b_256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Blake2b::<digest::typenum::U32>::new();
    // optional personalization for domain separation
    hasher.update(data);
    hasher.finalize().into()
}
```

## Poseidon Hash

ZK-friendly hash minimizing multiplicative complexity. Uses S-box (x⁵ or x⁷) over a large prime field (e.g., BN254 scalar field or BLS12-381 scalar field).

Parameters (state size t = 3 for Merkle depth 2):
- Full rounds RF = 8 (or 6 for 128-bit)
- Partial rounds RP = 57 (or 59)
- S-box: x⁵ (BN254), x⁷ (BLS12-381)
- MDS matrix: circulant Cauchy

```rust
// Poseidon hash for a 2-to-1 Merkle node (state size = 3)
struct Poseidon {
    rf: usize,  // full rounds
    rp: usize,  // partial rounds
    ark: Vec<[Fr; 3]>,  // round constants
    mds: [[Fr; 3]; 3],  // MDS matrix
    sbox: fn(Fr) -> Fr,
}

fn hash(poseidon: &Poseidon, left: Fr, right: Fr) -> Fr {
    let mut state = [left, right, Fr::ONE];
    for r in 0..poseidon.rf + poseidon.rp {
        // AddRoundKey
        for i in 0..3 { state[i] += poseidon.ark[r][i]; }
        // S-box: full rounds apply to all; partial only to first
        if r < poseidon.rf / 2 || r >= poseidon.rf / 2 + poseidon.rp {
            for i in 0..3 { state[i] = (poseidon.sbox)(state[i]); }
        } else {
            state[0] = (poseidon.sbox)(state[0]);
        }
        // MixLayer: MDS matrix multiplication
        let mut new = [Fr::ZERO; 3];
        for i in 0..3 { for j in 0..3 { new[i] += poseidon.mds[i][j] * state[j]; } }
        state = new;
    }
    state[0] // output first element (rate)
}
```

### Gas cost comparison

| Hash | Constraints (circuit) | Software throughput | Hardware throughput |
|------|----------------------|-------------------|-------------------|
| SHA-256 | ~30k constraints | ~300 MB/s | ASIC 100+ TH/s |
| Poseidon (t=3) | ~200 constraints | ~1M hashes/s (field ops) | FPGA ~10M/s |
| MiMC | ~10 constraints | ~500k hashes/s | FPGA ~20M/s |

## Security Considerations

1. **Length extension attacks**: SHA-256 (Merkle-Damgård) is vulnerable — never use SHA256(x) as a MAC. Use HMAC-SHA256 or BLAKE2 (resistant by design).
2. **Keccak vs SHA-3**: Ethereum uses original Keccak with different padding. Mixing up keccak256 and sha3_256 causes silent failures.
3. **MiMC security**: Only 80-bit security against algebraic attacks. Only use inside ZK circuits where prover cost matters more.
4. **Poseidon parameter selection**: Use correct RF/RP for target security. Too few partial rounds enable interpolation attacks.
5. **BLAKE2 personalization**: Always personalize for domain separation to prevent cross-protocol collisions.
6. **Hash functions as commitments**: For hiding commitments, hash MUST include randomness (blinding factor). Plain hash of message is not hiding.
