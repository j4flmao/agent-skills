# Bitcoin Core Architecture

## Source Tree Overview

```
src/
├── consensus/          # Consensus rules (tx validation, block validation)
│   ├── consensus.h     # Consensus::Params
│   ├── tx_verify.cpp   # Consensus::CheckTxInputs, GetTransactionFee
│   └── merkle.cpp      # Merkle tree construction & verification
├── validation.h/cpp    # Main block/transaction validation pipeline
├── net_processing.cpp  # Peer message handling (inv, getdata, block, tx relay)
├── txmempool.h/cpp     # CTxMemPool — unconfirmed tx storage & policy
├── wallet/             # CWallet, walletdb, rpcwallet
├── node/               # Node context, transaction relay, block storage
├── chain.h/cpp         # CBlockIndex, chain state
├── coins.h/cpp         # CCoinsView, CCoinsViewCache, CCoinsViewDB
├── script/             # Script interpreter, standard flags, signing
├── protocol.h/cpp      # CInv, CAddress, CMessageHeader (P2P message types)
├── primitives/         # CBlock, CTransaction, CTxIn, CTxOut
├── leveldb/            # Embedded LevelDB (UTXO set, chain state, index)
└── rpc/                # JSON-RPC interface
```

## Core Data Structures

### CBlock

```cpp
class CBlock {
public:
    int32_t nVersion;            // Block version (typically 2, currently 4)
    uint256 hashPrevBlock;       // Hash of previous block header
    uint256 hashMerkleRoot;      // Merkle root of all txs in this block
    uint32_t nTime;              // Unix timestamp (median-time-past constraint)
    uint32_t nBits;              // Target threshold (compact bits encoding)
    uint32_t nNonce;             // Proof-of-work nonce
    std::vector<CTransactionRef> vtx;  // Transactions (coinbase first)

    // Serialized as block header (80 bytes) + transaction count + transactions
    // Header only: nVersion(4) + hashPrevBlock(32) + hashMerkleRoot(32) +
    //              nTime(4) + nBits(4) + nNonce(4) = 80 bytes
};
```

### CTransaction

```cpp
class CTransaction {
public:
    const int32_t nVersion;              // Tx version (1 or 2)
    const std::vector<CTxIn> vin;        // Inputs (spend UTXOs)
    const std::vector<CTxOut> vout;      // Outputs (create new UTXOs)
    const uint32_t nLockTime;            // Height or time before tx is valid
    const bool fOverwintered;            // SegWit: marker for witness data

    // Txid: SHA-256(SHA-256(serialized without witness))
    // WTxid: SHA-256(SHA-256(serialized with witness))
    uint256 GetHash() const;             // Txid (segwit: wtxid differs)
};
```

### CTxIn / CTxOut

```cpp
class CTxIn {
public:
    COutPoint prevout;      // { txid, n } — referencing a previous output
    CScript scriptSig;      // Unlocking script (signature + pubkey in P2PKH)
    uint32_t nSequence;     // Relative locktime (BIP-68) / RBF signaling (BIP-125)
    CScriptWitness scriptWitness;  // Witness stack (segwit)
};

class CTxOut {
public:
    CAmount nValue;         // Satoshi amount (1 BTC = 100,000,000 sat)
    CScript scriptPubKey;   // Locking script (conditions to spend)
};
```

## UTXO Set

### Architecture

The UTXO set is the canonical state of Bitcoin — all spendable outputs. Stored in LevelDB (`chainstate/` directory).

```
CCoinsView               # Abstract interface (GetCoin, HaveCoin, GetHead)
  ├── CCoinsViewDB       # LevelDB-backed — persistent UTXO set
  └── CCoinsViewCache    # In-memory cache — batching writes to DB
```

```cpp
// Core UTXO entry stored in LevelDB
class Coin {
public:
    CTxOut out;            // Value + scriptPubKey
    uint32_t nHeight;      // Block height when this coin was created
    bool fCoinBase;        // True if from coinbase (100-block maturity)
    enum Flags : uint32_t { HEIGHT_MASK = 0xFFFFFF };

    bool IsSpent() const;  // Determined by nHeight == SPENT_HEIGHT_MASK
};
```

Key operations:
- `CCoinsViewCache::GetCoin()` — fetch UTXO; returns false if spent/missing
- `CCoinsViewCache::SpendCoin()` — mark UTXO as spent
- `CCoinsViewCache::AddCoin()` — insert new UTXO from tx output
- `CCoinsViewCache::Flush()` — batch-write changes to LevelDB
- `CCoinsViewCache::GetHead()` — current best block hash

UTXO set grows ≈ 4–8 GB (as of 2025). ~100 million entries. Each entry: 32 bytes hash + 4 bytes index + Coin.

### LevelDB Layout

```
Key:  'c' + 32-byte tx hash + 4-byte index  →  Value: Coin (varint height|flags + txout)
Key:  'B' + 32-byte block hash               →  Value: block index data (disk location)
```

## Script Interpreter

### EvalScript

```cpp
bool EvalScript(std::vector<std::vector<unsigned char>>& stack,
                const CScript& script,
                unsigned int flags,
                const BaseSignatureChecker& checker,
                ScriptError* error = nullptr);
```

Execution model:
1. Parse script into opcodes
2. Process opcodes left-to-right on a stack
3. Each opcode pushes, pops, or manipulates stack
4. Signature verification uses `BaseSignatureChecker` (Checksig)
5. Returns true if execution completes without error and stack top is true (non-zero)

ScriptError codes: `SCRIPT_ERR_OK`, `SCRIPT_ERR_EVAL_FALSE`, `SCRIPT_ERR_VERIFY`, `SCRIPT_ERR_EQUALVERIFY`, `SCRIPT_ERR_CHECKSIGVERIFY`, `SCRIPT_ERR_OP_RETURN`, `SCRIPT_ERR_SIG_NULLFAIL`, `SCRIPT_ERR_DISABLED_OPCODE`, `SCRIPT_ERR_STACK_SIZE`, `SCRIPT_ERR_PUBKEYTYPE`, etc.

## Mempool (CTxMemPool)

### Architecture

```cpp
class CTxMemPool {
public:
    // indexed by txid
    std::unordered_map<uint256, CTxMemPoolEntry, SaltedTxidHasher> mapTx;

    // Ancestor/descendant sets for package relay & RBF
    CTxMemPool::setEntries mapNextTx;  // txid → input UTXO map

    // Per-tx entry
    struct CTxMemPoolEntry {
        CTransactionRef tx;
        CAmount nFee;                    // Transaction fee
        int64_t nTime;                   // Entry time
        unsigned int entrySize;          // Tx serialized size in bytes
        CAmount baseFee;                 // Fee without modification
        double feeDelta;                 // For RBF prioritization
        int64_t nCountWithDescendants;   // Count ancestors + descendants
        CAmount nModFeesWithDescendants; // Fees of ancestor set

        // Ancestor scoring
        uint64_t GetModifiedFee() const;
        double GetPriority(unsigned int currentHeight) const;
    };
};
```

### Ancestor/Descendant Scoring

```
        TX_A (low fee, large)
         |
        TX_B (high fee, small)

Ancestor set of B = {A, B}
  - package_fee = fee(A) + fee(B)
  - package_size = vsize(A) + vsize(B)
  - ancestor_score = package_fee / vsize

Descendant limit: default 25 descendants, 101K vbytes
Ancestor limit:  default 25 ancestors
```

### RBF (BIP-125)

Replace-by-Fee signaling: `nSequence < 0xffffffff` in any input.

BIP-125 rules:
1. New tx must have at least one input not in original
2. New tx must pay higher fee (absolute) than original
3. New tx must pay at least the relay fee increment (default 1 sat/vB)
4. Total fee must cover replacement + evicted descendants
5. New tx must not spend outputs that original couldn't spend

### Package Relay (2023)

Allows broadcasting child-pays-for-parent (CPFP) packages atomically:
- Package: {parent_tx, child_tx} where child pays fee for both
- Submitted via `submitpackage` RPC or p2p `sendpackages` protocol
- Enables 1-parent-1-child packages for L2 force-closes

## Block Validation Pipeline

### CheckBlock (pre-consensus, cheap checks)

```cpp
bool CheckBlock(const CBlock& block, BlockValidationState& state,
                const Consensus::Params& consensusParams, bool fCheckPow,
                bool fCheckMerkleRoot);
```

Checks:
- Block size ≤ `MAX_BLOCK_SIZE` (4 MB weight limit post-segwit)
- First tx is coinbase (exactly 1 input, no spending)
- No duplicate txids (or wtxids)
- Merkle root matches computed from vtx
- Proof-of-work: block hash ≤ target from nBits

### ConnectBlock (stateful, expensive consensus)

```cpp
bool ConnectBlock(const CBlock& block, BlockValidationState& state,
                  CBlockIndex* pindex, CCoinsViewCache& view,
                  const CChainParams& chainparams, bool fJustCheck = false);
```

Steps:
1. Check block version & height against consensus rules
2. Enforce BIP-16 (P2SH), BIP-30 (duplicate coinbase), BIP-34 (height in coinbase)
3. Check merkle root for witness commitments (BIP-141)
4. For each tx: `ConnectTransaction()` — verify inputs, execute scripts, update UTXO set
5. Update `pindex->nChainTx` with cumulative tx count
6. Verify block reward: fees + subsidy ≤ outputs

### CChainState

```cpp
class CChainState {
protected:
    CBlockIndex* m_best_header;    // Best header (potentially beyond active chain)
    CBlockIndex* m_best_block;     // Best fully-validated block
    CCoinsViewCache* m_coinsview;  // UTXO cache for active chain
    CTxMemPool* m_mempool;         // Associated mempool

public:
    bool AcceptBlock(const std::shared_ptr<const CBlock>& pblock,
                     BlockValidationState& state, CBlockIndex** ppindex,
                     bool fRequested, const CChainParams& chainparams,
                     std::shared_ptr<CBlock>* ppblock);
    bool ActivateBestChain(BlockValidationState& state,
                           std::shared_ptr<const CBlock> pblock = nullptr);
};
```

## Sync Modes

### Headers-First

1. Send `getheaders` to peer, receive up to 2000 headers per `headers` message
2. Locate headers that connect to existing chain tip
3. Once all headers known, send `getblocks` for block data
4. Blocks downloaded in parallel from multiple peers via `getdata`

### IBD (Initial Block Download)

```
Detected when: m_best_header->GetBlockTime() < GetTime() - 24h * 365
Assumed valid: Use assumevalid block (e.g., block at height ~840,000)
  - Skip signature validation for blocks before assumevalid
  - Still verify PoW, script structure, UTXO consistency
```

### AssumeValid (Bitcoin Core 0.14+)

```cpp
// In chainparams.cpp for mainnet:
// At height ~842,000 (example, updated each release):
consensus.defaultAssumeValid = uint256S("0x00000000000000000005f0c8...");
```

Blocks before `assumevalid` skip `CheckInputScripts()` — only basic structural checks. Drastically reduces IBD time from days to hours.

## Wallet Architecture

```cpp
class CWallet {
protected:
    std::map<CTxDestination, CKeyID> mapAddressBook;  // Address → label
    std::map<CKeyID, CKey> mapKeys;                   // Private keys
    std::set<CKeyID> setKeyPool;                       // Keypool tracking
    int64_t nWalletBirth;                              // Earliest block to scan
    CWalletDB *pwalletdb;                              // BerkeleyDB wallet storage

public:
    // Key management
    void GenerateNewKey(CWalletDB& walletdb, bool internal = false);
    CKeyID GetKeyFromPool(bool internal = false) const;

    // Transaction management
    bool CreateTransaction(const std::vector<CRecipient>& vecSend,
                           CTransactionRef& tx, CAmount& nFeeRet,
                           const CCoinControl& coin_control);
    bool CommitTransaction(CTransactionRef tx, mapValue_t mapValue,
                           std::vector<std::pair<std::string, std::string>> orderForm);

    // Address birth height scanning
    // Wallet starts scanning from nWalletBirth to avoid reprocessing
};
```

### Keypool

- Pre-generates `keypool.size()` keys (default 1000 internal + 1000 external)
- Internal: change addresses (BIP-44 chain `1`)
- External: receive addresses (BIP-44 chain `0`)
- Refilled automatically when < 50% remaining

## P2P Message Flow

```
Peer A                              Peer B
  |                                    |
  |-------- version (92000) ---------->|  Protocol version, services, best block
  |<------- version (92001) ----------|
  |<------- verack -------------------|
  |-------- verack ------------------->|
  |                                    |  [Connection established]
  |-------- sendheaders ------------>|  Opt-in for headers-first sync
  |<------- inv (block hashes) -------|
  |-------- getheaders -------------->|
  |<------- headers (2000) ----------|
  |-------- getdata (block txs) ----->|
  |<------- block (full) ------------|
  |<------- tx (relayed) ------------|
  |-------- inv (tx hash) ----------->|
  |-------- getdata (tx) ------------>|
```

Key messages:
- `inv`: Inventory announcement (tx or block hash)
- `getdata`: Request full object by hash
- `headers`: Block headers only (80 bytes each, up to 2000)
- `cmpctblock`: Compact block relay (BIP-152)
- `sendcmpct`: Negotiate compact blocks (version 1 or 2)
- `sendaddrv2`: BIP-155 (support for Tor v3, I2P, CJDNS addresses)
