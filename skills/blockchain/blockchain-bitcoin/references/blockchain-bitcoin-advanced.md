# Blockchain Bitcoin Advanced Topics

## Taproot Deep Dive

### Schnorr Signatures (BIP-340)
Schnorr signatures enable signature aggregation (multi-sig looks like single sig) and linear signing (batch verification is faster). Key path spend with Taproot looks like any other transaction — no script is revealed.

### MAST (Merkelized Abstract Syntax Tree)
BIP-341 enables complex spending conditions organized as a Merkle tree of scripts. Only the executed script branch is revealed, not the entire script. This improves privacy (hides unused conditions) and efficiency (smaller witnesses).

## Lightning Network

### Channel Lifecycle
1. **Open**: Fund 2-of-2 multi-sig output
2. **Commitment**: Asymmetric commitment transactions (each party has different tx)
3. **Update**: New commitment tx invalidates old via revocation keys
4. **HTLC**: Atomic swap with hashlock + timelock
5. **Close**: Cooperative (both sign) or force close (timelocked unilateral)

### Routing (Onion)
Source routing with onion encrypted payloads. Each hop only knows the previous and next hop. Payment is split into HTLCs across multiple paths (Multi-Path Payments, MPP). Total network capacity: ~5,000 BTC in channels.

## Mining Economics

### Block Reward Schedule
- 2009: 50 BTC per block (every ~10 min)
- 2012 (halving): 25 BTC
- 2016: 12.5 BTC
- 2020: 6.25 BTC
- 2024: 3.125 BTC
- 2140: All 21M BTC mined, only fee incentives remain

### Difficulty Adjustment
Difficulty = Difficulty_1_Target / Current_Target. Adjusted every 2016 blocks. Target adjustment formula: New Target = Old Target * (Actual Time / Expected Time). Clamped to [1/4, 4]x change per adjustment.

## Ordinals and Inscriptions

### Inscription Mechanism
Data is inscribed in Taproot script path spends using OP_FALSE OP_IF ... OP_ENDIF envelopes. Inscription content is stored in the witness data. Content types: image, text, HTML, PDF, application binary. Each satoshi is assigned a serial number (ordinal theory) and inscriptions are tracked on individual satoshis.

### BRC-20
Experimental token standard on Bitcoin using JSON inscriptions for token operations. Operations: deploy, mint, transfer. State tracked off-chain by indexers. Subject to UTXO fragmentation and blockchain bloat concerns.
