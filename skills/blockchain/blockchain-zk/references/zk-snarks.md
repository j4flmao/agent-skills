# Zero-Knowledge Proofs (zk-SNARKs & zk-STARKs)

## 1. Skill Context
**Focus**: The cryptography enabling privacy-preserving transactions and infinite blockchain scalability. Proving knowledge of a secret without revealing the secret itself.
**Triggers**: zkp, zero-knowledge, zk-snark, zk-stark, cryptography, privacy.

## 2. The Core Concept
A Zero-Knowledge Proof allows a **Prover** to mathematically convince a **Verifier** that a specific statement is true, without revealing *why* it is true.
*Example*: I can prove to you that I know the password to a specific Bitcoin wallet, without ever typing the password or showing you the private key.

## 3. zk-SNARKs (Zero-Knowledge Succinct Non-Interactive Argument of Knowledge)
The most widely used ZK technology (e.g., Zcash).
- **Succinct**: The proof size is incredibly small (hundreds of bytes), and the Verifier can verify it in milliseconds, even if the original computation took hours.
- **Non-Interactive**: The Prover sends a single message (the proof) to the Verifier. No back-and-forth communication is needed.
- **The Catch (Trusted Setup)**: Many SNARK systems require a "Trusted Setup Ceremony" to generate a Master Key. If the creators of the key kept a copy of the toxic waste (the randomness used to make it), they could forge fake proofs forever. Modern SNARKs (like Plonk) use universal setups to mitigate this.

## 4. zk-STARKs (Zero-Knowledge Scalable Transparent Argument of Knowledge)
The newer, heavier alternative (e.g., StarkWare).
- **Transparent**: Does NOT require a Trusted Setup. It relies purely on hash functions, making it mathematically safer against malicious setups.
- **Scalable**: Proving time scales quasi-linearly.
- **Quantum-Resistant**: Unlike SNARKs (which rely on elliptic curves that quantum computers can break), STARKs rely on hash functions and are theoretically immune to quantum attacks.
- **The Catch**: The proof sizes are massive (hundreds of kilobytes compared to SNARK's hundreds of bytes), making them expensive to verify directly on Ethereum Layer-1.

## 5. How to Build a Proof (Circuits)
You cannot just write Python code and generate a ZK proof. You must translate the logic into an **Arithmetic Circuit** (gates of addition and multiplication).
Tools like **Circom**, **Halo2**, or **Cairo** allow developers to write high-level code that compiles down to these polynomial equations.
- *Public Inputs*: What the verifier knows (e.g., User's public wallet address).
- *Private Inputs (Witness)*: What the prover hides (e.g., The private key).
