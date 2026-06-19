---
name: blockchain-bitcoin
description: >
  Use this skill when asked about Bitcoin internals, Bitcoin Core, Bitcoin Script, Taproot, mining, Proof of Work, Lightning Network, BIP standards, Ordinals, BRC-20, Runes, Bitcoin L2s (Stacks, RSK, Babylon), and Bitcoin protocol development. Languages: C++, Rust, Python, Clarity. Covers Bitcoin Core C++ implementation (validation, mempool, wallet, P2P), Bitcoin Script opcodes and programming (P2PKH, P2SH, P2WSH, Taproot MAST), token protocols (Ordinals inscriptions, BRC-20, Runes), PoW mining mechanics (SHA-256d, difficulty adjustment, ASICs, Stratum), L2 scaling (Lightning Network, Stacks Clarity, RSK EVM, Babylon staking), and BIP standards (BIP-32/39/44/84/86/174/340/341/342). Do NOT use for: Ethereum protocol (use blockchain-ethereum), smart contract development (use blockchain-application), or general blockchain patterns (use blockchain-patterns).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [blockchain, bitcoin, pow, mining, phase-blockchain]
---

# Blockchain Bitcoin

## Purpose
Guide Bitcoin protocol engineering, Bitcoin Core development, Bitcoin Script programming, mining infrastructure, Lightning Network implementation, and Bitcoin L2 ecosystem. Covers the full stack from consensus protocol to application layer.

## Agent Protocol

### Trigger
"Bitcoin", "Bitcoin Core", "bitcoind", "Bitcoin Script", "BTC script", "Taproot", "Bitcoin opcode", "P2PKH", "P2SH", "P2WSH", "mining Bitcoin", "Proof of Work Bitcoin", "SHA-256d", "ASIC mining", "Stratum", "Lightning Network", "LN", "HTLC", "onion routing", "channel", "Ordinals", "inscription", "BRC-20", "Runes", "Bitcoin NFT", "Bitcoin L2", "Stacks", "Clarity", "RSK", "Rootstock", "Babylon", "Bitcoin staking", "BIP standard", "BIP-32", "BIP-39", "BIP-44", "BIP-340", "BIP-341", "BIP-342", "PSBT", "Bitcoin mempool", "UTXO", "Bitcoin C++", "Bitcoin protocol"

### Input Context
- Layer (consensus/wallet/L2/application)
- Bitcoin Core version for implementation reference
- Script requirements (Taproot vs legacy, opcode set)
- Security model (trust assumptions, finality requirements)
- Performance requirements (TPS, confirmation time, cost)

### Output Artifact
Technical specification covering: scope, architecture, key mechanisms, implementation approach, and L2 integration where applicable.

### Response Format
1. **Scope**: consensus layer vs wallet vs L2 vs application protocol
2. **Architecture**: Bitcoin Core component breakdown, data flow, key source files
3. **Key mechanisms**: PoW difficulty, Script execution, UTXO set management
4. **Implementation**: C++ patterns, data structures, optimization techniques
5. **Layer 2**: Lightning Network architecture, channel lifecycle, or L2 integration

### Completion Criteria
- Consensus rules correctly referenced from Bitcoin Core source (src/validation.cpp)
- Script operations specify witness vs legacy, opcode restrictions
- Security model accounts for probabilistic finality (6+ confirmations)
- Implementation respects Bitcoin's conservative upgrade philosophy
- Layer 2 design addresses griefing and channel force-close scenarios

### Max Response Length
5000 tokens

## Decision Trees

### Protocol Layer Decision
```
Bitcoin-related task:
├── Consensus protocol?
│   ├── Block validation → src/validation.cpp (CheckBlock, ConnectBlock)
│   ├── Transaction validation → src/consensus/tx_verify.cpp
│   ├── PoW verification → src/pow.cpp (CheckProofOfWork, GetNextWorkRequired)
│   └── Mempool policy → src/txmempool.cpp (accept limits, replace-by-fee)
├── Wallet operations?
│   ├── Key management → BIP-32/39/44/84/86 derivation paths
│   ├── Transaction building → src/wallet/wallet.cpp (CreateTransaction)
│   ├── PSBT → BIP-174 (Partially Signed Bitcoin Transaction)
│   └── Descriptors → Output script descriptors (BIP-380+)
├── Layer 2?
│   ├── Lightning Network → HTLC, channel lifecycle, routing
│   ├── Stacks → Clarity smart contracts, PoX consensus
│   ├── RSK → EVM-compatible sidechain with merge mining
│   └── Babylon → Bitcoin staking, restaking security
└── Token/application protocol?
    ├── Ordinals → Inscription (envelope OP_FALSE OP_IF OP_PUSH ... OP_ENDIF)
    ├── BRC-20 → JSON inscription-based token standard
    └── Runes → UTXO-based token protocol by Casey Rodarmor
```

### Script Standard Decision
```
Output script type:
├── Pay-to-Public-Key-Hash (P2PKH): Legacy, address starts with 1
│   └── Script: OP_DUP OP_HASH160 <pubkeyHash> OP_EQUALVERIFY OP_CHECKSIG
├── Pay-to-Script-Hash (P2SH): Multi-sig, address starts with 3
│   └── Script: OP_HASH160 <scriptHash> OP_EQUAL (redeem script revealed on spend)
├── Pay-to-Witness-Public-Key-Hash (P2WPKH): SegWit, address starts with bc1q
│   └── Witness: <signature> <pubkey> (removed from scriptSig, lower fees)
├── Pay-to-Witness-Script-Hash (P2WSH): SegWit multi-sig, bc1q
│   └── Witness: <signature> <witnessScript> (discount vs P2SH)
├── Pay-to-Taproot (P2TR): Taproot, address starts with bc1p
│   ├── Single key → Key path spend (default, cheapest)
│   └── Script tree → Script path spend via MAST tree
└── Recommendation: Always prefer P2TR (Taproot) for new addresses
```

### Mempool Policy Decision
```
Transaction acceptance:
├── Standard relay?
│   ├── Minimum fee: 1 sat/vB (default, configurable via -minrelaytxfee)
│   ├── Maximum tx size: 100KB standard, 400KB consensus
│   └── BIP-125 RBF: opt-in replace-by-fee signaled via sequence < 0xfffffffe
├── Full RBF (v26+)?
│   └── All unconfirmed transactions replaceable regardless of signal
├── Package relay (BIP-331)?
│   └── Child-pays-for-parent: submit parent+child together for CPFP
└── Cluster mempool (proposed)?
    └── Linearize mempool by fee clusters, better CPFP/RBF eviction
```

## Bitcoin Script Patterns

### Standard P2PKH Spend
```c++
// ScriptSig: <sig> <pubkey>
// ScriptPubKey: OP_DUP OP_HASH160 <pubkeyHash> OP_EQUALVERIFY OP_CHECKSIG
// Execution:
// 1. Push sig, push pubkey
// 2. OP_DUP: duplicate pubkey
// 3. OP_HASH160: hash the pubkey
// 4. OP_EQUALVERIFY: check hash matches pubkeyHash
// 5. OP_CHECKSIG: verify signature against pubkey
```

### Taproot Key Path Spend
```c++
// Key path: Schnorr signature with internal pubkey
// No script revealed on-chain — looks like any other Taproot spend
// Witness: <signature>
// Steps:
//   1. Compute tweak: t = SHA-256(internal_key || merkle_root) if script tree, else 0
//   2. Output key Q = internal_key + t*G
//   3. Spend: provide Schnorr signature for Q
//   4. Verifier checks: s*G == R + e*Q where e = SHA-256(R || Q || message)
```

### Taproot Script Path Spend
```c++
// Script tree MAST structure:
//    root = Taptweak(internal_key, merkle_root)
//    leaf_1: <pubkey> OP_CHECKSIG
//    leaf_2: OP_IF <pubkey> OP_CHECKSIG OP_ELSE <timelock> OP_CHECKSEQUENCEVERIFY OP_DROP <pubkey> OP_CHECKSIG OP_ENDIF
//
// Witness: <script> <control_block> <signature>
// Control block reveals: leaf version, merkle proof to root
// Privacy: only reveal the executed leaf, not the tree structure
// Efficiency: witness size proportional to tree depth, not number of leaves
```

### HTLC (Hashed TimeLock Contract) for Lightning
```c++
// HTLC Script (simplified):
// OP_IF
//     <redeem_pubkey> OP_CHECKSIG  // Payment preimage
// OP_ELSE
//     <timeout> OP_CHECKSEQUENCEVERIFY OP_DROP
//     <refund_pubkey> OP_CHECKSIG  // Timeout refund
// OP_ENDIF
//
// Preimage image: SHA-256 hash, revealed by payer when payment is claimed
// Timeout: relative timelock via OP_CSV, gives payee time to claim
// Security: atomic — either payer gets preimage or payee gets refund
```

### Multi-Sig Script (P2SH)
```c++
// 2-of-3 multi-sig:
// Redeem script: OP_2 <pubkey1> <pubkey2> <pubkey3> OP_3 OP_CHECKMULTISIG
// Witness/ScriptSig: OP_0 <sig1> <sig2> <redeemScript>
// OP_0 is a bug workaround (OP_CHECKMULTISIG pops one extra element)
// P2SH: address is hash of redeem script, redeem script revealed on spend
```

### Raw Transaction Construction
```python
import hashlib
import struct

def create_legacy_tx(utxos, outputs, private_keys, locktime=0):
    """Build and sign a legacy P2PKH transaction."""
    tx = {
        "version": 2,
        "inputs": [],
        "outputs": [],
        "locktime": locktime
    }
    for utxo in utxos:
        tx["inputs"].append({
            "txid": utxo["txid"],
            "vout": utxo["vout"],
            "scriptSig": "",
            "sequence": 0xffffffff
        })
    for addr, amount in outputs:
        tx["outputs"].append({
            "value": amount,
            "scriptPubKey": addr_to_scriptPubKey(addr)
        })
    for i, utxo in enumerate(utxos):
        sig_hash = create_sig_hash(tx, i, utxo["scriptPubKey"], SIGHASH_ALL)
        sig = sign_hash(sig_hash, private_keys[i])
        tx["inputs"][i]["scriptSig"] = encode_sig_script(sig, utxo["pubkey"])
    return serialize_tx(tx)
```

## Mining & PoW Mechanics

### Difficulty Adjustment Algorithm
```python
# Bitcoin difficulty: adjusts every 2016 blocks (~2 weeks)
# Target = previous_target * actual_time_span / expected_time_span (20160 min)
# Clamped to [1/4, 4] of previous difficulty
def calculate_difficulty(previous_target, actual_timespan_seconds):
    expected = 2016 * 10 * 60  # 2016 blocks * 10 min in seconds
    # Clamp to [1/4, 4] range to prevent large difficulty swings
    if actual_timespan_seconds < expected // 4:
        actual_timespan_seconds = expected // 4
    if actual_timespan_seconds > expected * 4:
        actual_timespan_seconds = expected * 4
    new_target = (previous_target * actual_timespan_seconds) // expected
    return min(new_target, 0x00000000FFFF0000000000000000000000000000000000000000000000000000)
```

### SHA-256d Block Hashing
```c++
// Block hash = SHA-256(SHA-256(block_header))
// block_header: version (4B) + prev_block (32B) + merkle_root (32B) + time (4B) + bits (4B) + nonce (4B)
// Total header size: 80 bytes
// ASIC-optimized: ~100+ TH/s for modern miners (Antminer S21)
// Merkle root: hash of all transaction hashes in the block
// Bits: compact representation of target threshold
// Nonce: 32-bit space exhausted by ASICs in ~1 second → extranonce in coinbase
```

### Stratum Mining Protocol
```python
# Stratum V1: centralized mining pool protocol
# Pool sends job assignments, miners submit shares
class StratumMiner:
    def __init__(self, pool_url, worker_name, worker_pass):
        self.pool_url = pool_url
        self.worker = worker_name
        self.password = worker_pass
        self.job = None

    def connect(self):
        # 1. Subscribe to pool
        # 2. Authorize worker
        # 3. Receive mining.notify with block header template
        # 4. Hash with varying nonce/extranonce
        # 5. Submit shares when hash < pool_target

    def process_job(self, job):
        # job contains: version, prev_hash, merkle_root, time, bits
        for nonce in range(2**32):
            header = serialize_header(job, nonce)
            hash = double_sha256(header)
            if hash < job.pool_target:
                self.submit_share(header, nonce)
            if hash < job.network_target:
                self.submit_block(header, nonce)  # Found a real block!
```

## Lightning Network

### Channel Lifecycle
1. **Open**: Funding transaction (2-of-2 multi-sig, both parties)
2. **Commitment**: Revocable transaction with asymmetric HTLCs
   - Each party has a different commitment transaction
   - Revocation key allows punishment if old state is broadcast
3. **Update**: New commitment tx invalidates old one via revocation keys
   - Both parties exchange revocation secrets for previous state
   - Only the latest state can be spent without penalty
4. **HTLC**: Holds payments in-flight with timeout and preimage
   - Hashlock: payment released when preimage (SHA-256 hash) is revealed
   - Timelock: payment refunded after timeout via OP_CLTV or OP_CSV
5. **Close**:
   - Cooperative: Both sign closing tx, no timelocks, immediate settlement
   - Force close: Single party broadcasts commitment tx, timelock enforced
   - Revoked close: Cheater loses all funds (breach remedy)

### Payment Routing
```
Source onion routing:
1. Sender constructs route: A → B → C → D → E (5 hops)
2. Each hop only knows previous and next node
3. Payment is split as HTLCs along the path
4. Each HTLC has: amount, hashlock (payment_hash), timelock (CLTV expiry)
5. When final recipient claims HTLC with preimage, HTLCs settle backwards
6. If any hop fails, HTLCs timeout and funds return to sender

Multi-Path Payment (MPP):
- Split large payment into smaller HTLCs across different paths
- All partial payments share the same payment_hash
- Final recipient claims when all parts arrive (atomic via preimage)
- Reduces single-point-of-failure and improves liquidity utilization
```

### Key Lightning BOLTs
| BOLT | Title | Key Content |
|------|-------|-------------|
| BOLT #2 | Peer Protocol | Channel establishment, funding, commitment updates |
| BOLT #3 | Bitcoin Transaction | Commitment tx format, HTLC outputs, revocation |
| BOLT #4 | Onion Routing | Sphinx onion format, hop payloads, error codes |
| BOLT #5 | Recommendations for On-chain | Channel close handling, penalty transactions |
| BOLT #7 | P2P Node Discovery | Gossip protocol for channel announcements, network map |
| BOLT #11 | Invoice Protocol | Payment request format: amount, payment_hash, description |

### Anchor Outputs
```c++
// Anchor outputs: reserve small UTXO amount per channel party
// Purpose: CPFP fee bumping during force close
// Before anchors: fixed fee in commitment tx (could be insufficient)
// After anchors: additional output spendable only by each party
// Allows: adding high-fee child tx to accelerate force-close confirmation
// Standard: each anchor output is 330 sats (dust limit)
```

## Bitcoin L2 Ecosystem

### L2 Comparison Table
| Protocol | Type | Smart Contracts | Consensus | Trust Model |
|----------|------|----------------|-----------|-------------|
| Lightning Network | State channels | No (payment only) | Off-chain | 2-of-2 multisig |
| Stacks | Clarity VM | Yes (Clarity) | PoX (transfer burn) | Bitcoin finality |
| RSK (Rootstock) | EVM sidechain | Yes (Solidity) | Merge-mined w/ BTC | Powpeg (federated) |
| Babylon | Staking layer | No | Bitcoin staking | Bitcoin timelocks |
| Liquid | Federated sidechain | Limited (Elements) | Federated (11 functionaries) | Federation trust |

### Stacks Clarity Example
```clarity
;; Simple Stacks token contract (Clarity lang)
(define-fungible-token my-token u1000000)

(define-public (mint (amount uint) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender (get-contract-owner)) (err u100))
        (ftp-mint? my-token amount recipient)
    )
)

(define-public (transfer (amount uint) (sender principal) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender sender) (err u101))
        (ftp-transfer? my-token amount sender recipient)
    )
)

(define-read-only (get-balance (who principal))
    (ok (ftp-get-balance my-token who))
)
```

## Bitcoin Core Architecture

### Key Source Files
| File | Purpose |
|------|---------|
| src/validation.cpp | Block and transaction validation (CheckBlock, ConnectBlock, mempool acceptance) |
| src/net_processing.cpp | P2P message handling, inventory relay, block download |
| src/wallet/wallet.cpp | Wallet operations: key management, transaction creation, coin selection |
| src/consensus/tx_verify.cpp | Transaction verification: signatures, inputs, fees |
| src/pow.cpp | PoW validation: CheckProofOfWork, GetNextWorkRequired |
| src/txmempool.cpp | Mempool: entry acceptance, eviction, RBF replacement |
| src/script/script.cpp | Script execution: opcode evaluation, stack machine |
| src/leveldb | UTXO database: coin database for unspent outputs |

### Data Structures
```c++
// Block header (80 bytes)
class CBlockHeader {
    int32_t nVersion;        // 4B: block version
    uint256 hashPrevBlock;   // 32B: previous block hash
    uint256 hashMerkleRoot;  // 32B: Merkle root of transactions
    uint32_t nTime;          // 4B: Unix timestamp
    uint32_t nBits;          // 4B: compact target
    uint32_t nNonce;         // 4B: arbitrary number for PoW
};

// UTXO entry in coin database
class Coin {
    CTxOut out;              // value + scriptPubKey
    uint32_t nHeight;        // block height when created
    bool fCoinBase;          // true if coinbase output
};

// Mempool transaction entry
class CTxMemPoolEntry {
    CTransactionRef tx;      // the transaction
    CAmount fee;             // transaction fee
    int64_t time;            // entry time
    unsigned int entrySize;  // virtual size
    CFeeRate feeRate;        // fee per vbyte
    int64_t nCountWitnesses; // witness count
};
```

## Security Considerations

### Bitcoin-Specific Attack Vectors
- **51% attack**: Attacker controls >50% hashrate, can reorganize chain, double-spend
  - Cost to execute: ~$300K/hour at 600 EH/s (300 BTC block reward + fees)
  - Defense: wait for deeper confirmations (6+ for high value, 100+ for exchanges)
- **Fee sniping**: Miner replaces transaction with higher-fee version in same block
  - Defense: BIP-125 RBF, watch mempool for replacement attempts
- **Finney attack**: Miner pre-mines block with double-spend to self, then spends elsewhere
  - Defense: wait for confirmations beyond first block
- **Race attack**: Unconfirmed transaction replaced in mempool by conflicting tx
  - Defense: use RBF to bump fee, wait for confirmation
- **Replay attack**: Transaction valid on both old and new chain after fork
  - Defense: use SegWit sighash types, opt-in RBF signaling
- **Eclipse attack**: Node isolated from honest peers, fed false blockchain data
  - Defense: multiple peer connections, random peer selection, assumeUTXO
- **Timewarp attack**: Manipulating timestamp to reduce difficulty
  - Defense: BIP-113 median time past (MTP), timestamp ≤ MTP + 2 hours
- **Fee sniping with replacement cycling**: Replace tx repeatedly to keep it unconfirmed
  - Defense: TRUC (BIP-431) topology-restricted unconfirmed transactions

### Wallet Security
```
Key storage tiers:
├── Hot wallet (active trading, small amounts)
│   ├── Mobile wallet (trusted execution)
│   ├── Desktop wallet (full node + keys)
│   └── Watch-only wallet (xpub + offline signing)
├── Warm wallet (moderate amounts)
│   ├── Hardware wallet (Ledger, Trezor, Coldcard)
│   ├── Multi-sig (2-of-3 with geographically distributed signers)
│   └── PSBT-based offline signing
└── Cold storage (large amounts, long term)
    ├── Air-gapped hardware wallet
    ├── Paper wallet (single-use, deprecated)
    ├── Shamir's Secret Sharing (BIP-39 split seed)
    └── Multi-sig with time-locked recovery
```

### Mitigations
- Wait 6+ confirmations for high-value transactions
- Use replace-by-fee (RBF) signaling for unconfirmed
- BIP-68 relative locktime for Lightning commitment
- Anchor outputs for CPFP fee bumping in Lightning
- AssumeUTXO for fast new-node sync
- Compact block relay (BIP-152) for bandwidth efficiency
- Erlay (BIP-330) for transaction set reconciliation

## Ordinals, BRC-20, and Runes

### Ordinals Theory
```
Ordinal theory assigns serial numbers to satoshis:
- Satoshis numbered in order they are mined (1 sat = 1/100M BTC)
- Transfer rules: first-in-first-out (satoshis are preserved)
- Inscriptions: content (image, text, HTML) embedded in Taproot witness
- Inscription envelope: OP_FALSE OP_IF ... OP_ENDIF
- Content stored in data pushes within the envelope

Types:
├── Digital artifacts (images, text, HTML): most common
├── BRC-20: JSON inscription defining token operations
│   ├── Deploy: create token with max supply, limit per mint
│   ├── Mint: create new tokens (up to limit)
│   └── Transfer: send tokens to another address
└── Runes: UTXO-based protocol by Casey Rodarmor
    ├── Native UTXO model (no ordinals dependency)
    ├── Edict: transfer runes in transaction outputs
    └── Cenotaph: burned runes (on error, runes are destroyed)
```

### BRC-20 Inscription Format
```json
// Deploy inscription
{ "p": "brc-20", "op": "deploy", "tick": "ordi", "max": "21000000", "lim": "1000" }

// Mint inscription
{ "p": "brc-20", "op": "mint", "tick": "ordi", "amt": "1000" }

// Transfer inscription
{ "p": "brc-20", "op": "transfer", "tick": "ordi", "amt": "100" }
```

## Production Considerations

### Node Operations Checklist
- [ ] Use Bitcoin Core v26+ for updated policy (full RBF, package relay)
- [ ] Configure pruning (550MB-5.5TB depending on prune=N setting)
- [ ] Enable txindex=1 for historical transaction lookup (archive node)
- [ ] Configure rpcallowip for secure RPC access
- [ ] Set maxconnections for bandwidth management
- [ ] Enable zmqpubrawtx and zmqpubrawblock for real-time monitoring
- [ ] Run on Ubuntu 22.04 LTS or Debian 12 for stability
- [ ] Use SSD (NVMe) for blockchain data directory
- [ ] Minimum 8GB RAM for full node, 16GB+ for mining node
- [ ] Configure firewall: 8333 (mainnet P2P), 8332 (RPC, local only)

### Mining Operations
- Pooled mining recommended for consistent revenue (Stratum V2 for decentralization)
- ASIC miner selection: Antminer S21 (200 TH/s), Whatsminer M60S (180 TH/s)
- Power efficiency: 15-30 J/TH (newer ASICs more efficient)
- Cooling: immersion cooling for large farms (reduces maintenance)
- Pool requires: low-latency connection to pool server (<50ms)
- Solo mining: only viable with >1% of total hashrate

### Fee Estimation
```python
# Bitcoin fee estimation strategies
def estimate_fee(target_blocks, mempool_entries):
    """
    target_blocks: confirmation target (1 = next block, 6 = ~1 hour)
    mempool_entries: current mempool state

    Returns: fee rate in sat/vB
    """
    if target_blocks <= 2:
        return 50  # High priority for rapid confirmation
    elif target_blocks <= 6:
        return 10  # Standard for most transactions
    elif target_blocks <= 25:
        return 3   # Economical, slower confirmation
    else:
        return 1   # Minimum relay fee

# Bitcoin Core's estimator uses:
# - Track feerates that resulted in confirmation within target
# - Use exponentially weighted moving average
# - Return 50th percentile for conservative, 25th for aggressive
```

## Rules
1. Bitcoin Core is written in C++ — reference src/validation.cpp, src/net_processing.cpp, src/wallet/
2. Bitcoin uses Nakamoto consensus (proof-of-work) with probabilistic finality — 6 confirmations ≈ 1 hour
3. All Bitcoin transactions use the UTXO model — no account abstraction
4. Taproot (BIP-340/341/342) is current standard for new Bitcoin scripts — use over legacy
5. Mempool is not part of consensus — each node implements its own replacement/eviction policies
6. Lightning Network operates as L2 with HTLCs, not on-chain for every payment
7. Always consider Bitcoin's conservative upgrade philosophy — don't propose radical changes
8. Ordinals/Runes are NOT protocol changes — they are interpretation layers on existing opcodes
9. For BIP standards, reference the specific BIP number and version
10. Mining economics must account for halving cycles (every 210,000 blocks)
11. Schnorr signatures enable key aggregation: multi-sig looks like single-sig on-chain
12. MAST tree depth must be balanced for optimal Taproot script path spend
13. PSBT (BIP-174) supports multi-party signing without sharing private keys
14. Anchor outputs are essential for Lightning force-close fee bumping
15. AssumeUTXO enables zero-trust initial sync for new nodes
16. Standard transactions must use the standardness checks, not just consensus rules
17. CPFP and RBF are the two transaction replacement strategies — implement both
18. Coin selection in wallets should prefer UTXO consolidation to prevent dust buildup
19. HD wallet derivation paths follow BIP-44/84/86 depending on script type
20. Always validate locktime (nLockTime, nSequence) for time-sensitive transactions

## References
  - references/bip-standards.md — BIP Standards Reference
  - references/bitcoin-core-deep.md — Bitcoin Core Architecture
  - references/bitcoin-l2s.md — Bitcoin Layer 2s
  - references/bitcoin-script-and-taproot.md — Bitcoin Script & Taproot
  - references/blockchain-bitcoin-advanced.md — Blockchain Bitcoin Advanced Topics
  - references/blockchain-bitcoin-fundamentals.md — Blockchain Bitcoin Fundamentals
  - references/lightning-network.md — Lightning Network
  - references/mining-pow.md — Mining & Proof of Work
  - references/ordinals-runes.md — Ordinals, BRC-20 & Runes
  - references/bitcoin-security.md — Bitcoin Security Model
  - references/bitcoin-core-contributing.md — Contributing to Bitcoin Core
  - references/bitcoin-fee-estimation.md — Bitcoin Fee Estimation
  - references/bitcoin-staking-l2.md — Bitcoin Staking & L2 Infrastructure

## Phase
blockchain → blockchain-bitcoin
