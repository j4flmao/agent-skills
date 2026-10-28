# Groth16 Implementation: Circom, snarkjs, Trusted Setup and On-Chain Verification

Practical Groth16 workflow: writing a Circom circuit, compiling, running the trusted setup (powers of tau + circuit-specific phase 2), generating and verifying proofs, exporting a Solidity verifier, and the security checks that matter. The underlying math is in `zk_snarks_polynomial_math.md`.

## Groth16 at a Glance

| Property | Value |
|----------|-------|
| Proof size | 2 G1 + 1 G2 elements (~128 bytes compressed on BN254, 256 bytes uncompressed as used by EVM verifiers) |
| Verification | 3 pairings (plus one MSM over public inputs) |
| Setup | Circuit-specific; needs phase 2 ceremony per circuit |
| Malleability | Proofs are re-randomizable; do not use a proof as a unique identifier |
| On-chain cost | Lowest among common SNARKs on Ethereum (BN254 precompiles EIP-196/197, cheaper since EIP-1108) |

## Toolchain

```bash
# Circom 2 compiler (Rust)
git clone https://github.com/iden3/circom.git && cd circom && cargo install --path circom
npm install -g snarkjs
npm install circomlib
```

## 1. Circuit

```circom
pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

// Prove: I know (secret, salt) such that Poseidon(secret, salt) == commitment
// and secret is at least minValue, without revealing secret.
template CommittedMinimum(nBits) {
    signal input secret;        // private
    signal input salt;          // private
    signal input commitment;    // public
    signal input minValue;      // public

    // range-check secret so the comparison is meaningful
    component bits = Num2Bits(nBits);
    bits.in <== secret;

    component h = Poseidon(2);
    h.inputs[0] <== secret;
    h.inputs[1] <== salt;
    h.out === commitment;

    component ge = GreaterEqThan(nBits);
    ge.in[0] <== secret;
    ge.in[1] <== minValue;
    ge.out === 1;
}

component main {public [commitment, minValue]} = CommittedMinimum(64);
```

Notes:
- Inputs are private unless listed in `public`; all outputs are public.
- `GreaterEqThan(n)` assumes both inputs fit in `n` bits; range-check them (`minValue` too, if untrusted).
- The salt prevents brute-forcing low-entropy secrets from the commitment.

## 2. Compile

```bash
circom circuit.circom --r1cs --wasm --sym -o build/ -l node_modules
snarkjs r1cs info build/circuit.r1cs        # constraint count, public/private inputs
snarkjs r1cs print build/circuit.r1cs build/circuit.sym   # inspect constraints on small circuits
```

## 3. Trusted Setup

Phase 1 (universal powers of tau): reuse a public ceremony transcript (e.g. the Perpetual Powers of Tau / Hermez `.ptau` files) sized for at least your constraint count (`2^k >= constraints`).

Phase 2 (circuit-specific):

```bash
snarkjs groth16 setup build/circuit.r1cs pot_final_16.ptau build/circuit_0000.zkey
snarkjs zkey contribute build/circuit_0000.zkey build/circuit_0001.zkey --name="contributor 1" -e="$(head -c 64 /dev/urandom | base64)"
# repeat `zkey contribute` for each independent contributor, each on their own machine
snarkjs zkey beacon build/circuit_0003.zkey build/circuit_final.zkey "$BEACON_HEX" 10 -n="Final beacon"   # BEACON_HEX: a public randomness value fixed in advance, e.g. a future block hash
snarkjs zkey verify build/circuit.r1cs pot_final_16.ptau build/circuit_final.zkey
snarkjs zkey export verificationkey build/circuit_final.zkey build/verification_key.json
```

Security: soundness holds if at least one contributor in each phase destroyed their randomness. Production circuits need a multi-party phase 2 with independent participants and a published transcript; a single-party `.zkey` lets that party forge proofs.

## 4. Witness and Proof

```bash
cat > input.json <<'JSON'
{ "secret": "42", "salt": "918273645", "commitment": "COMMITMENT_FROM_CIRCOMLIBJS", "minValue": "18" }
JSON
node build/circuit_js/generate_witness.js build/circuit_js/circuit.wasm input.json build/witness.wtns
snarkjs groth16 prove build/circuit_final.zkey build/witness.wtns build/proof.json build/public.json
snarkjs groth16 verify build/verification_key.json build/public.json build/proof.json
```

Compute the commitment value with the same Poseidon implementation (circomlibjs `buildPoseidon`) before proving. In JavaScript apps use `snarkjs.groth16.fullProve(input, wasmPath, zkeyPath)` in a Web Worker; for large circuits prefer native provers (rapidsnark, or Rust/arkworks-based provers).

## 5. Solidity Verifier

```bash
snarkjs zkey export solidityverifier build/circuit_final.zkey contracts/Groth16Verifier.sol
snarkjs zkey export soliditycalldata build/public.json build/proof.json
```

```solidity
pragma solidity ^0.8.24;

interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata a, uint[2][2] calldata b, uint[2] calldata c, uint[2] calldata pubSignals
    ) external view returns (bool);
}

contract AgeGate {
    IGroth16Verifier public immutable verifier;
    mapping(bytes32 => bool) public usedNullifiers;
    mapping(uint256 => bool) public registeredCommitments;

    error InvalidProof();
    error CommitmentUnknown();
    event AccessGranted(address indexed caller, uint256 commitment);

    constructor(IGroth16Verifier v) { verifier = v; }

    function access(uint[2] calldata a, uint[2][2] calldata b, uint[2] calldata c, uint[2] calldata pub) external {
        // pub[0] = commitment, pub[1] = minValue (order = order of public signals in public.json)
        if (!registeredCommitments[pub[0]]) revert CommitmentUnknown();
        require(pub[1] == 18, "unexpected minValue");
        if (!verifier.verifyProof(a, b, c, pub)) revert InvalidProof();
        emit AccessGranted(msg.sender, pub[0]);
    }
    // For one-time actions, add a nullifier public signal to the circuit and
    // record it in usedNullifiers before granting access.
}
```

On-chain checklist:
- Bind every public input the contract relies on (here `minValue` must equal the policy value).
- Public signal order follows `public.json`: outputs first, then public inputs in declaration order.
- Replay protection: add a nullifier (e.g. `Poseidon(secret, appId)`) as a public output and record it; never use the proof bytes as an identifier (malleable).
- Generated verifiers check that public inputs are below the scalar field modulus; keep that check if you modify the contract.

## Testing Circuits

- Unit-test with `circom_tester` (wasm tester): valid witnesses produce correct outputs; invalid ones fail `checkConstraints`.
- Adversarial witnesses: hand-craft witnesses for under-constrained signals (modify intermediate signals and check constraints still pass, which signals a bug).
- Static analysis: `circomspect` for unconstrained signals, unused outputs, and dangerous `<--` usage.
- Differential tests: compare circuit outputs to a reference implementation (JS/Python) on random inputs.

## Performance Notes

| Factor | Effect |
|--------|--------|
| Constraint count | Prover time roughly linear-ish (MSMs + NTTs) |
| Public input count | Verifier MSM cost and calldata grow |
| Hash choice | Poseidon far cheaper in-circuit than SHA-256/Keccak |
| Prover | Native (rapidsnark, arkworks/gnark) much faster than WASM snarkjs |

## Alternatives

- gnark (Go) supports Groth16 and PLONK on BN254/BLS12-381 with its own circuit DSL.
- arkworks (Rust) provides Groth16 with R1CS from Rust gadgets.
- For universal setup or no setup, consider PLONK/fflonk (snarkjs supports PLONK and fflonk) or STARK-based systems (see `proof-systems.md`).

## Checklist

- [ ] Every signal constrained; range checks before comparisons/arithmetic
- [ ] Salted commitments for low-entropy secrets
- [ ] Phase 1 from a public ceremony; multi-party phase 2 with beacon and transcript
- [ ] `zkey verify` passes; verification key versioned with the contract
- [ ] Contract binds public inputs, uses nullifiers, never treats proofs as unique IDs
- [ ] circomspect and adversarial witness tests in CI
