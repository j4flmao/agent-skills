# Blockchain Bitcoin Fundamentals

## Bitcoin Core Concepts

### UTXO Model
Bitcoin uses the Unspent Transaction Output (UTXO) model. Each transaction consumes previous UTXOs as inputs and creates new UTXOs as outputs. The sum of inputs must equal the sum of outputs plus fees. There are no accounts or balances — the wallet derives balance by scanning all UTXOs it can spend.

### Transaction Structure
```
Transaction:
  version (4B) | input_count (1-9 varint) | inputs (variable) | output_count (1-9 varint) | outputs (variable) | locktime (4B)
  
Input:
  txid (32B) | vout (4B) | scriptSig (variable) | sequence (4B)
  
Output:
  value (8B, satoshis) | scriptPubKey (variable)
```

### Script Execution
Bitcoin Script is a stack-based, non-Turing-complete language. Scripts are evaluated left to right. Common opcodes: OP_DUP, OP_HASH160, OP_EQUALVERIFY, OP_CHECKSIG (P2PKH pattern). Scripts do not have loops — execution is bounded and deterministic.

## Consensus Rules

### Proof of Work
Miners find a block hash below the current target by incrementing the nonce and extranonce. Target adjusts every 2016 blocks to maintain ~10 minute block intervals. Difficulty target = maximum_target / difficulty. Current hashrate: ~600 EH/s.

### Block Validation
Each node independently validates: block header structure, proof of work (hash < target), timestamp (within 2 hours of network time), block size (< 4MB weight units), all transactions (valid signatures, no double-spend), coinbase transaction (correct reward + fees, maturity).

## Key Protocols

### BIP-32 Hierarchical Deterministic Wallets
Master key generates child keys via CKD (Child Key Derivation). Hardened derivation prevents parent key compromise from leaking child keys (path `m/44'/0'/0'`). Non-hardened derivation allows public key derivation without private key (path `m/0/0`).

### BIP-39 Mnemonic Seeds
12-24 word mnemonic from 2048-word BIP-39 English wordlist. Passphrase (optional 25th word) adds additional security. Seed derived via PBKDF2 (2048 rounds HMAC-SHA512).

### BIP-174 Partially Signed Bitcoin Transactions
PSBT format allows multiple parties to collaboratively sign a transaction. Roles: creator, updater, signer, combiner, finalizer, extractor. Used for multi-sig, hardware wallet, and coinjoin transactions.
