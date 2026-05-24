# zkEVM Types

## Overview

zkEVMs are categorized by their degree of equivalence to the Ethereum L1
execution environment. The widely accepted taxonomy defines **4 types**,
ranging from full EVM equivalence (Type 1) to language-level compatibility
(Type 4). As of 2026, the landscape has matured with multiple production
rollups operating at each level.

---

## 1. Type 1 — Fully Equivalent

A Type 1 zkEVM proves the exact Ethereum execution semantics. Every opcode,
precompile, gas schedule, and state access pattern is reproduced in the
circuit. No modifications to existing Ethereum tooling (MetaMask, Hardhat,
Foundry) are needed.

### Properties
- **EVM equivalence**: 100% — no recompilation, no modified opcodes.
- **Proving cost**: Highest — often 10⁷–10⁸ constraints per block.
- **Block throughput**: Limited by prover hardware.
- **Trust**: Minimal — proofs match L1 Geth output exactly.

### Projects

| Project | Approach | Prover | Status (2026) |
|---------|----------|--------|---------------|
| **Scroll** | PSE zkEVM + custom optimizations | GPU-accelerated, ~30 min per block | Mainnet |
| **Taiko** | Based rollup — L1 as sequencer using Geth fork | SGX + zkVM | Mainnet |
| **zkGeth** | Geth modified to output execution traces | Plonky2 + aggregation | Testnet |

### Precompile Proofs
Type 1 zkEVMs must prove all nine Ethereum precompiles inside the circuit:

```
ecrecover  → ECDSA secp256k1 recovery (EC arithmetic)
sha256     → 64-round SHA-256 (bitwise operations)
ripemd160  → 160-bit RIPEMD-160
identity   → Memory copy (trivial)
modexp     → Big integer modular exponentiation (Montgomery)
ecadd      → BN254 group addition
ecmul      → BN254 scalar multiplication
ecpairing  → BN254 optimal ate pairing
blake2f    → BLAKE2b compression function
```

Each precompile adds 50k–500k constraints depending on implementation
efficiency. `ecpairing` alone can exceed 1M constraints.

### State Proofs
The circuit proves:

1. **State read**: Merkle proof of account/storage trie inclusion.
2. **State write**: Merkle proof + new root after mutation.
3. **Receipt proof**: Trie inclusion for log emission.
4. **Transaction proof**: RLP decoding + signature verification.

### Proving Aggregation
Type 1 rollups typically use a two-tier aggregation:

```
Block proof 1 ─┐
Block proof 2 ─┤
Block proof 3 ─┤── Batch proof ── L1 verification
...            ┘
```

Each batch proof aggregates ~10–100 block proofs via a recursive SNARK.
Final L1 verification costs ~250k–400k gas per batch.

---

## 2. Type 2 — Fully EVM-Equivalent

Type 2 zkEVMs replicate EVM semantics exactly but may modify the state
representation, gas metering, or precompile implementation for efficiency.
**All existing Solidity contracts deploy and run without changes.**

### Properties
- **EVM equivalence**: Full bytecode compatibility.
- **Proving cost**: Medium — 10⁶ constraints per block typical.
- **State tree**: May use custom Sparse Merkle Tree (SMT) instead of
  Ethereum's hexary Patricia trie.
- **Gas**: Same gas schedule with minor adjustments for proof overhead.

### Projects

| Project | Key Differences | Prover | Status |
|---------|----------------|--------|--------|
| **Polygon zkEVM** | Custom SMT, modified precompile gas | ~15 min per block (GPU) | Mainnet |
| **Linea** | ConsenSys zkEVM — full bytecode | ~10 min per block | Mainnet |
| **ConsenSys zkEVM** | Gnark-based PLONKish arithmetization | ~8 min per block | Mainnet |

### Architecture (Polygon zkEVM)

```
L2 Tx ──► Executor (zkASM ROM)
              │
              ▼
         PIL ROM (State machine)
              │
              ▼
         PIL → STARK (PILCOM)
              │
              ▼
         STARK → SNARK (recursive aggregation)
              │
              ▼
         L1 Verifier (Ethereum)
```

The Executor interprets a **zkASM** program (a deterministic execution
trace of the EVM). The PIL (Polynomial Identity Language) describes state
machines that generate STARK proofs, which are then recursively folded into
a Groth16 SNARK for L1 verification.

---

## 3. Type 3 — Almost Equivalent

Type 3 zkEVMs change EVM semantics to improve prover efficiency. Some
opcodes are modified, removed, or gas costs are adjusted. Most Solidity
contracts work, but some edge cases (delegatecall into modified opcodes,
selfdestruct, CREATE2 with certain patterns) may break.

### Properties
- **EVM equivalence**: Near-complete — minor semantic deviations.
- **Proving cost**: Low — 10⁵–10⁶ constraints per block.
- **Tooling**: Requires minor Solidity changes for edge cases.
- **Gas**: Some operations re-priced.

### Projects

| Project | Deviations | Prover | Status |
|---------|------------|--------|--------|
| **zkSync Era** | Modified SELFDESTRUCT, new `precompilecall`, `to_l1` | ~10 min per block (Boojum) | Mainnet |
| **zkSync Boojum** | Replaced PLONK → STARK-based prover | ~3 min per block | Mainnet (upgrade) |
| **Zircuit** | Parallel EVM + ZK circuit proofs | ~5 min per block | Testnet |

### zkSync Era Notable Deviations
- **EVM storage slots** use a different address derivation (code hash vs.
  account nonce).
- **CREATE/CREATE2** address computation differs (uses deployer's address
  nonce scheme).
- **Gas refunds** capped differently.
- **PUSH0** (EIP-3855) originally not supported (added in later upgrade).
- Precompile addresses extended with Era-specific ones.
- **Native account abstraction**: All accounts are contracts — EOA logic
  simulated via the `Account` interface.
- `keccak256` and `sha256` routed through custom precompiles with
  different gas schedules.

---

## 4. Type 4 — Language Level

Type 4 zkEVMs do not execute EVM bytecode at all. Instead, they compile
smart contract source code (Solidity, Vyper, Cairo, etc.) directly to a
ZK-circuits-friendly instruction set. Existing Solidity contracts require
active recompilation or rewriting.

### Properties
- **EVM equivalence**: None — source-level only (or not at all).
- **Proving cost**: Lowest — highly optimized for the target VM.
- **Tooling**: Requires custom compiler for languages that target "standard"
  runtimes.
- **Flexibility**: Can innovate beyond EVM constraints (native account
  abstraction, parallel execution, etc.).

### Projects

| Project | Language | VM | Prover |
|---------|----------|----|--------|
| **StarkNet** | Cairo → CASM → AIR | Cairo VM | STARK (Stone/Sharingan) |
| **zkSync Lite** | Solidity → Zinc (now deprecated) | Zinc VM | SNARK (Groth16) |
| **RISC Zero** | Rust, C++, Go → RISC-V ELF | RISC-V zkVM | STARK + SNARK wrap |

### StarkNet Architecture

```
Cairo code
    │
    ▼ (cairo-compiler)
Cairo Assembly (CASM)
    │
    ▼ (cairo-rs / lambda class)
Execution trace
    │
    ▼ (Stone / Sharingan prover)
AIR + FRI → STARK proof
    │
    ▼ (SHARP aggregator)
Aggregated proof → SNARK wrap → L1 verified
    │
    ▼
Ethereum contract (StarkNet core)
```

StarkNet's **Cairo** is a CPU-architecture language. Programs are compiled
to instructions executed by the Cairo VM, whose **execution trace** is
proven by the STARK prover. The SHARP aggregator collects multiple proofs
and outputs a single SNARK for L1 submission.

### Cross-Type Comparison

| Metric | Type 1 | Type 2 | Type 3 | Type 4 |
|--------|--------|--------|--------|--------|
| Solidity compat | 100% | 100% | ~99% | 0% (needs recompile) |
| Circom/Groth16 | No | No | Optional | No |
| Proving cost | Very high | High | Medium | Low |
| L1 gas per batch | ~400k | ~350k | ~300k | ~280k |
| Block latency | ~30 min | ~15 min | ~5 min | ~2 min |
| State tree | Hexary | Custom SMT/Custom | Custom | Merkle Patricia |
| Precompile coverage | All 9 | All 9 | Most | Custom |
| Throughput (TPS) | ~5–10 | ~10–50 | ~50–200 | ~100–1000+ |

## 5. Proof Aggregation

All zkEVM types benefit from proof aggregation. Common patterns:

```
Layer 1: Single block proof (circuit-intense, expensive prover)
Layer 2: Batch proof (recursive verification of N block proofs)
Layer 3: Super-batch / day proof (recursive aggregation of M batches)
Layer 4: L1 transaction (single SNARK verify call)
```

The deeper the aggregation tree, the lower the per-proof L1 cost but the
higher the latency.

## References

- Vitalik's zkEVM Types: https://vitalik.eth.limo/general/2022/08/04/zkevm.html
- Polygon zkEVM docs: https://wiki.polygon.technology/docs/zkEVM/
- Scroll design doc: https://scroll.io/design
- zkSync Era docs: https://era.zksync.io/docs/
- StarkNet architecture: https://docs.starknet.io/
