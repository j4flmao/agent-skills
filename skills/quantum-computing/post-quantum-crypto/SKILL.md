# Post-Quantum Cryptography (PQC)

## 1. Skill Context
**Focus**: Securing software systems against the future threat of Cryptographically Relevant Quantum Computers (CRQCs) that can break modern asymmetric encryption.
**Triggers**: post-quantum, pqc, lattice-based, kyber, dilithium, nist-pqc, quantum-resistant.

## 2. The Quantum Threat (Q-Day)
Currently, all secure web traffic (HTTPS/TLS), digital signatures, and cryptocurrency wallets rely on asymmetric cryptography (RSA, ECC/ECDSA). These algorithms assume that prime factorization and discrete logarithms are impossibly slow to solve on classical computers.
A sufficiently large quantum computer running Shor's Algorithm will solve these problems in hours, instantly decrypting global internet traffic. This hypothetical date is referred to as "Q-Day".

**"Store Now, Decrypt Later" (SNDL)**: Adversaries are currently scraping and storing vast amounts of encrypted internet traffic. When Q-Day arrives, they will decrypt this historical data. Hence, PQC transition must happen *now*, not when Q-Day arrives.

## 3. NIST PQC Standards (2024+)
The US National Institute of Standards and Technology (NIST) has standardized new algorithms that rely on math problems (e.g., Lattices) which are hard for *both* classical and quantum computers.

### A. Key Encapsulation Mechanism (KEM)
Used for establishing secure shared secrets over an insecure channel (replacing RSA Key Exchange and Elliptic Curve Diffie-Hellman - ECDH).
- **Standard**: `ML-KEM` (Module-Lattice-Based Key-Encapsulation Mechanism), originally known as **Kyber**.

### B. Digital Signatures
Used for authenticating identities and signing documents/code (replacing RSA Signatures and ECDSA).
- **Standard 1**: `ML-DSA` (Module-Lattice-Based Digital Signature Algorithm), originally known as **Dilithium**.
- **Standard 2**: `SLH-DSA` (Stateless Hash-Based Digital Signature Algorithm), originally known as **SPHINCS+**.
- **Standard 3**: `FN-DSA` (FFT over NTRU-Lattice-Based Digital Signature Algorithm), originally known as **FALCON**.

## 4. Implementation Strategy (Hybrid Mode)
Because PQC algorithms are relatively new, they have not withstood 30 years of mathematical scrutiny like RSA. Implementing pure PQC in production is currently considered risky.
- **The Standard Approach**: Use **Hybrid Cryptography**. Combine a classical algorithm (e.g., X25519) with a PQC algorithm (e.g., ML-KEM). The session is secure as long as *at least one* of the underlying algorithms remains unbroken.

## 5. Symmetric Crypto is Quantum-Resistant
Quantum computers (via Grover's Algorithm) effectively halve the bit-strength of symmetric encryption.
- **AES-128**: Becomes equivalent to 64-bit security (Vulnerable).
- **AES-256**: Becomes equivalent to 128-bit security (Safe).
- *Action*: Simply double your symmetric key sizes. AES-256 and SHA-256/SHA-3 are considered post-quantum secure.
