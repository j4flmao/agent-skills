# Blockchain Ethereum Fundamentals

## Ethereum Architecture

### Execution Layer
The EVM processes transactions and executes smart contracts. State is stored as a Merkle Patricia Trie. Each block contains a list of transactions and the resulting state root. The EVM is stack-based with 140+ opcodes.

### Consensus Layer (Beacon Chain)
Validators propose and attest to blocks using Casper FFG (finality) and LMD-GHOST (fork choice). Validators stake 32 ETH. Committees are randomly selected per slot (12 seconds). Finality takes ~13 minutes (two epochs) after the block.

### Modular Architecture
Ethereum separates execution (transaction processing) from consensus (ordering and finality). EL clients process transactions. CL clients agree on block order. They communicate via the Engine API. Client diversity improves resilience.

## Key Mechanisms

### EIP-1559 Fee Mechanism
Base fee (burned) + priority fee (to validator). Base fee adjusts per block: up to 12.5% increase when block >50% full, decrease when <50% full. Target block gas: 15M (doubled to 30M limit). Base fee burn reduces ETH supply.

### Staking
Minimum 32 ETH per validator. Validators earn: consensus layer rewards (attestations, proposals) + execution layer rewards (priority fees, MEV). Withdrawal credentials point to an execution address (0x01 type). Queue for entering/exiting due to validator churn limit.

### Account Abstraction (ERC-4337)
UserOperation mempool separate from regular mempool. Bundlers aggregate UserOps into a single transaction to the EntryPoint contract. Paymasters can sponsor gas. Smart accounts enable social recovery, session keys, batched transactions.
