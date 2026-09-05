# ZK-Rollups (Layer 2 Scaling)

## 1. The Blockchain Trilemma
Ethereum can only process ~15 transactions per second (TPS). If it processes more, the hardware requirements to run a node become too high, destroying decentralization.
To scale to Visa-levels (24,000 TPS), Ethereum uses Layer-2 **Rollups**.

## 2. Optimistic vs. ZK Rollups
A Rollup executes transactions off-chain (on a fast, centralized sequencer server) and only posts a summary of the results back to the Ethereum mainnet.
- **Optimistic Rollups (Arbitrum, Optimism)**: They post the result and say "Trust me, these are correct." If someone lies, anyone has a 7-day window to submit a "Fraud Proof" to penalize the liar. Because of this, withdrawing your money takes 7 days.
- **ZK-Rollups (Starknet, zkSync)**: They post the result ALONG WITH a cryptographic Zero-Knowledge Proof (validity proof). The Ethereum smart contract mathematically verifies the proof instantly. If the sequencer lied, the math fails, and the batch is rejected.

## 3. The Power of ZK-Rollups
- **Instant Finality**: Withdrawals are immediate. Once the proof is verified on L1, the transaction is irreversibly final.
- **Infinite Scalability (Recursive Proofs)**: A ZK-Rollup can compress 10,000 transactions into 1 proof. But it gets crazier: you can take 10 proofs (representing 100,000 transactions) and use a ZK-circuit to generate a *Proof of those Proofs* (Recursion). This allows theoretically infinite transaction throughput.

## 4. The Complexity: zkEVM
Historically, ZK-Rollups only supported simple transfers (e.g., sending tokens). You couldn't deploy standard Solidity smart contracts on them because translating the Ethereum Virtual Machine (EVM) opcodes into ZK Arithmetic Circuits was deemed mathematically impossible.
Modern breakthroughs have created the **zkEVM** (e.g., Polygon zkEVM, Scroll). They emulate the EVM perfectly, generating mathematical proofs for every single smart contract opcode executed.
