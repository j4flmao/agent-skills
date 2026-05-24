# ZK Application Patterns

## Overview

Zero-knowledge proofs enable applications where one party can prove a
statement about secret data without revealing the data itself. This
reference catalogs the major ZK application patterns deployed on Ethereum
and other blockchains as of 2026.

---

## 1. Private Transfers

### Tornado-Style Mixer

The classic ZK application: a user deposits notes into a contract and later
withdraws to a fresh address, breaking the on-chain link between sender and
receiver.

```
                   ┌─────────────────┐
   Deposit Tx      │  Tornado Contract │
   ───────────────►│                  │
   ┌──────┐        │  ┌──────────┐    │
   │Note  │        │  │Commitment│    │  ┌──────┐
   │secret│────────┼─►│ list     │    │  │      │
   │nulli │        │  └──────────┘    │  │Proof │
   └──────┘        │  ┌──────────┐    │  │      │
        ▲          │  │Nullifier │    │  │secret│
        │          │  │ set      │    │  │nulli │
        │          │  └──────────┘    │  │recipt│
        │          └─────────────────┘  └──────┘
        │                                    │
        │                                    ▼
        │                          Withdrawal Tx (different address)
        └─────────────────────────────────────
```

**Circuit logic**:

```
private:
    secret, nullifier, recipient, fee, Merkle proof (path, siblings)
public:
    commitment_root, nullifier_hash, recipient, fee

1. commitment = hash(secret, nullifier)
2. Merkle proof: commitment ∈ commitment_root
3. nullifier_hash = hash(nullifier) ∉ nullifier set
4. Subtract fee from amount, forward to recipient
5. Insert nullifier_hash into nullifier set
```

**DSL**: Circom (snarkjs), deployed on Ethereum mainnet. ~20k constraints
per transfer (Poseidon hash). Gas cost: ~500k deposit, ~700k withdraw.

### Variants

| Variant | Difference | Example |
|---------|------------|---------|
| Anonymous voting | Nullifier per poll | MACI |
| Private DEX | Hidden amounts + assets | Aztec Network |
| Shielded balance | Full account privacy | Railgun, Umbra |

### Railgun / Umbra Pattern

- Each address generates a **stealth address** from the sender's ephemeral
  key and recipient's viewing key.
- Balances are stored as encrypted commitments.
- Transfers are proven via ZK with hidden amounts.

```
User A ───► Register commitment C_a
              │
              ▼
User A ───► Send to User B:
               1. Generate ephemeral key e
               2. Compute stealth address B' = B_pub * e
               3. Create commitment C_b' = commit(amount, B', r)
               4. Emit note for B'
              │
              ▼
User B ───► Scan blockchain for notes to B'
              │
              ▼
User B ───► Spend note: ZK proof (secret key → B' = pubkey * e)
```

---

## 2. ZK Identity

### Pattern Overview

ZK identity allows users to prove attributes about themselves (age,
nationality, membership) without revealing the underlying data.

### zkPass

zkPass is a **decentralized KYC** protocol. Users hold government-issued
documents (passport, driver's license) and prove attributes via selective
disclosure without revealing the raw document.

```
User                          zkPass Verifier
  │                                │
  │── Select attribute───────────►│
  │   (birth date > 2000-01-01)   │
  │                                │
  │◄── Challenge ─────────────────│
  │    (nonce, domain)             │
  │                                │
  │── Generate proof─────────────►│
  │   1. Hash(document || nonce)   │
  │   2. Prove attribute in doc    │
  │   3. Output ZK proof           │
  │                                │
  │◄── Verified ──────────────────│
  │    (ZK proof accepted)         │
```

**Circuit logic**:

```
public:
    doc_hash, domain, nonce, attribute_proof
private:
    raw_document, signature_over_doc

1. Verify signature on doc_hash (from issuer: ICAO, govt, etc.)
2. Extract attribute (birth_date) from raw document
3. Range check: birth_date > threshold
4. Hash(raw_document || nonce) = doc_hash
5. Domain binding to prevent replay
```

### Polygon ID

Polygon ID uses the **Identities** framework with:

- **Sparse Merkle Tree** identity state
- **BabyJubJub** keys for BJJ signatures
- **Circom** circuits for credential verification
- **Issuer → Holder → Verifier** triangle

```
  Issuer                     Holder                    Verifier
    │                          │                         │
    │── Issue credential─────►│                         │
    │   (schema, claim, sig)  │── Generate ZK proof────►│
    │                          │   (selective disclosure) │
    │                          │                         │── Verify
    │                          │   private: credential    │   proof
    │                          │   public: schema_hash   │   on-chain
    │                          │           issuer_state   │   or off-chain
    │                          │           query                         │
```

### Sismo

Sismo is a **ZK badge** protocol:

- Users prove ownership of an account (Twitter, GitHub, ENS, ETH address).
- The protocol issues a **badge** (ERC-721) containing cryptographic
  commitments.
- Badges can be used in ZK proofs to demonstrate reputation without
  revealing the source account.

```
Account A (Twitter @alice) ───► Prove (ECDSA sig) ──► Sismo Registry
                                                           │
                                                           ▼
                                                     Mint Badge (SBT)
                                                           │
                                                           ▼
User ───► ZK proof: I hold badge "GitHub > 100 stars"
         (private: badge ownership proof)
         (public: badge_type, group_id)
```

---

## 3. ZK Voting

### Pattern

ZK voting enables **private, verifiable** on-chain voting. Votes are
committed before the tally and revealed via ZK proof without linking the
vote to the voter.

```
Register ──► Commit ──► Reveal ──► Tally

Phase 1: Register (voter identity verified, receive voting power)
Phase 2: Commit (submit encrypted vote + ZK proof of valid encryption)
Phase 3: Reveal (decrypt vote, submit ZK proof of correct decryption)
Phase 4: Tally (sum public votes)
```

### MACI (Minimum Anti-Collusion Infrastructure)

MACI adds **anti-collusion** guarantees:

- Votes are encrypted with the coordinator's key.
- Coordinator can decrypt and tally **without revealing individual votes**.
- ZK proof proves correct tally computation.
- User cannot prove how they voted to a third party (coercion resistance).

```
Voter        MACI Contract               Coordinator
  │               │                           │
  │── signup ────►│                           │
  │  (pubkey)     │                           │
  │               │                           │
  │── vote ──────►│                           │
  │  (encrypted   │                           │
  │   vote + ZK)  │                           │
  │               │                           │
  │               │── processMessages() ─────►│
  │               │                           │── Decrypt votes
  │               │                           │── Compute tally
  │               │◄── Tally + ZK proof ──────│
  │               │                           │
  │               │── verifyTally(proof) ─────│
  │               │                           │
  │◄── result ────│                           │
```

### Quadratic Voting via ZK

- Voters allocate credits across proposals.
- Cost of N votes on one proposal = N² credits.
- ZK proof: voter has sufficient credits, vote allocation is correct.
- Result: equalizes influence — prevents wealthy domination.

---

## 4. ZK Gaming

### Pattern

ZK proofs allow games to run off-chain with on-chain settlement. Players
submit moves with ZK proof of correct game state transition.

```
Off-chain                    On-chain
  │                             │
  │── Move (signed) ──────────►│ (optional)
  │                             │
  │── ZK proof:                │
  │   "Given game state S      │
  │    and move M, new state   │
  │    S' is valid"            │
  │                             │
  │◄── Reward / Claim ────────│
  │    (if proof valid)         │
```

### ZK Score Proof

```
private:
    game_private_state (seed, random values, etc.)
    player_input (movement, decisions)

public:
    game_public_state (score, level, etc.)
    score_threshold

1. Simulate game for N steps: state_i+1 = update(state_i, input_i)
2. Derive score from final state
3. score >= score_threshold → "win"
4. Prove: final_state hash matches public score commitment
```

### Dark Forest (zkSNARKs in gaming)

Dark Forest uses ZK proofs for **fog of war**:

- Each planet's coordinates are committed via ZK.
- Player proves they have discovered a planet without revealing the
  discovery mechanism.
- Movement proofs: "I can move fleet from A to B" without revealing A's
  location to other players.

```
Player                              Game Contract
  │                                      │
  │── Move proof:                        │
  │   "I own fleet at (x,y),              │
  │    fleet moves to (x', y')"           │
  │   (private: coordinates, private key) │
  │   (public: commitment of new state)   │
  │                                      │
  │◄── Fleet moved ──────────────────────│
```

---

## 5. ZK-KYC

### Selective Disclosure

Users prove compliance with KYC/AML rules without revealing their identity:

```
public:
    country_code check (user is in allowed jurisdictions)
    age check (birth_date < threshold)
    sanction list check (user not on OFAC list)
    PEP status (not a politically exposed person)

private:
    full government ID document
    issuer signature

ZK proof:
    1. Signature verification (issuer → document)
    2. Attribute extraction (birth_date, country, name)
    3. Range checks (age threshold)
    4. Set membership (country in allowed set)
    5. Set non-membership (not in sanction list)
```

### Architecture

```
User ───► KYC Provider ───► On-chain Registry
  │           │                    │
  │  Off-chain│                   │
  │  ZK proof │                   │
  │  (no PII) │                   │
  │           │                   │
  │◄──────────┴──────────────────►│
  │  Verify proof → update state  │
  │  (minAge18 = true,            │
  │   region = "EU")              │
```

### Benefits Over Traditional KYC
- No PII stored on-chain or in centralized DB.
- Proofs are reusable across dApps (ZK credential).
- Regulatory compliance without surveillance.
- User controls which attributes to reveal.

---

## 6. ZKML (Zero-Knowledge Machine Learning)

### Pattern

Prove that a model inference was computed correctly without revealing the
model weights or the input data.

```
User (input private)               Model Owner (weights confidential)
  │                                      │
  │── Encrypted / committed input ──────►│
  │                                      │
  │◄── Proof: inference = model(input) ──│
  │    (private: input, weights)          │
  │    (public: output, model_hash)       │
  │                                      │
  │── verify(proof, output)              │
  │   → "Output is correct inference"    │
```

### Techniques

| Approach | Description | Circuit cost |
|----------|-------------|--------------|
| Bitwise neural net | Binary/ternary weights, bitwise ops | Low (~100k / layer) |
| Quantized inference | 8-bit fixed-point arithmetic | Medium (~500k / layer) |
| FP16 with table lookups | FP16 operations via lookup tables | High (~2M / layer) |
| SNARK-friendly activation | ReLU, maxpool (simple compare) | Low |
| EZKL | Automated Circom/Halo2 generation | Custom |

### EZKL Pipeline

```
Trained Model (ONNX / PyTorch)
    │
    ▼ (ezkl export)
ONNX graph → ZK circuit (Halo2)
    │
    ▼ (setup)
KZG setup + proving key
    │
    ▼ (prove)
ezkl prove --model model.onnx --input data.json --output proof.json
    │
    ▼ (verify on-chain)
Solidity verifier contract → verify proof on EVM
```

### Gas Cost of ZKML Verification (Ethereum)

| Model size | Layers | Constraint count | Proof size | L1 gas |
|------------|--------|-----------------|------------|--------|
| Small (MNIST) | 2 | ~50k | ~4 kB | ~220k |
| Medium (CIFAR-10) | 5 | ~500k | ~4 kB | ~250k |
| Large (ResNet-18) | 18 | ~5M | ~4 kB | ~350k |
| GPT-2 small inference | 12 | ~50M | ~6 kB | ~500k+ |

## References

- Tornado Cash: https://tornado.cash/
- Railgun: https://railgun.org/
- zkPass: https://zkpass.org/
- Polygon ID: https://polygon.technology/polygon-id
- Sismo: https://www.sismo.io/
- MACI: https://maci.pse.dev/
- Dark Forest: https://darkforest.eth/
- EZKL: https://ezkl.xyz/
- ZKML survey: https://zkml.org/
