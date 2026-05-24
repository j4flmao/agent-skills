# Blockchain Data Structures

## Block Structure

### Bitcoin Block

```cpp
struct BitcoinBlock {
    // Header (80 bytes)
    int32_t     version;           // 4 bytes — block version
    uint256     prevBlockHash;     // 32 bytes — previous block hash
    uint256     merkleRoot;        // 32 bytes — tx merkle root
    uint32_t    timestamp;         // 4 bytes — unix timestamp
    uint32_t    bits;              // 4 bytes — target difficulty
    uint32_t    nonce;             // 4 bytes — PoW nonce

    // Body
    std::vector<Transaction> transactions;
};
```

### Ethereum Block (Post-merge)

```go
type Block struct {
    Header    *Header        `json:"header"`
    Body      *Body          `json:"body"`
}

type Header struct {
    ParentHash   common.Hash    // parent block hash
    UncleHash    common.Hash    // ommers hash
    Coinbase     common.Address // fee recipient / validator
    Root         common.Hash    // state trie root
    TxHash       common.Hash    // transactions trie root
    ReceiptHash  common.Hash    // receipts trie root
    Bloom        Bloom          // logs bloom filter
    Difficulty   *big.Int       // block difficulty (post-merge = 0)
    Number       *big.Int       // block number
    GasLimit     uint64         // block gas limit
    GasUsed      uint64         // gas consumed
    Time         uint64         // timestamp
    Extra        []byte         // extra data (max 32 bytes)
    MixDigest    common.Hash    // randomness for PoW (post-merge: zero)
    Nonce        BlockNonce     // PoW nonce (post-merge: beacon chain)

    // Post-merge additions
    BaseFee      *big.Int       // EIP-1559 base fee
    ExcessDataGas *big.Int      // EIP-4844 blob gas
}
```

### Solana Block (Entry + Slot)

```rust
struct SolanaSlot {
    parent_slot: Slot,           // parent slot number
    blockhash: Hash,             // PoH hash
    entries: Vec<Entry>,         // confirmed entries
    rewards: Vec<Reward>,        // epoch rewards
    block_time: Option<i64>,     // estimated block time
}

struct Entry {
    num_hashes: u64,             // PoH tick count
    hash: Hash,                  // PoH hash result
    transactions: Vec<VersionedTransaction>,
}
```

## Transaction Models

### UTXO Model (Bitcoin)

```
Inputs (spending previous UTXOs)          Outputs (creating new UTXOs)
┌─────────────────────────────┐           ┌─────────────────────────┐
│ TxID: 0xabc...              │           │  address: 1A1z...      │
│ OutputIndex: 0              │    ──>    │  amount: 0.5 BTC       │
│ ScriptSig: <sig> <pubkey>  │           │  ScriptPubKey: OP_DUP  │
│ Amount: 1.0 BTC            │           │              OP_HASH160│
└─────────────────────────────┘           │              ...       │
                                          └─────────────────────────┘
                                          ┌─────────────────────────┐
                                          │  address: 1BvB...      │
                                          │  amount: 0.49 BTC      │
                                          │  ScriptPubKey: ...     │
                                          └─────────────────────────┘
```

- **State**: Set of unspent outputs (UTXO set)
- **Privacy**: Better (address reuse discouraged)
- **Parallelism**: Easy (different UTXOs can be spent concurrently)
- **Scalability**: UTXO set grows linearly with transactions

```cpp
// C++ — UTXO validation
bool ValidateUTXOTransaction(const Transaction& tx, const UTXOSet& utxos) {
    int64_t input_total = 0;
    for (const auto& input : tx.inputs()) {
        const auto& utxo = utxos.Get(input.prevout());
        if (!utxo.has_value()) return false; // double spend
        if (!VerifySignature(input.script_sig(), utxo->script_pubkey(), tx))
            return false;
        input_total += utxo->amount();
    }
    int64_t output_total = 0;
    for (const auto& output : tx.outputs())
        output_total += output.amount();
    return input_total >= output_total;
}
```

### Account Model (Ethereum, Solana)

```
State (global mapping)
┌─────────────────────────────────────────────────────┐
│ address → { nonce, balance, storageRoot, codeHash } │
│ address → { nonce, balance, storageRoot, codeHash } │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

- **State**: Global mapping (address → account state)
- **Privacy**: Weaker (addresses reused)
- **Parallelism**: Harder (sequential state transitions per account)
- **Scalability**: State grows with all activity

```go
// Go — Ethereum state transition
type StateProcessor struct {
    statedb *StateDB
}

func (p *StateProcessor) ExecuteTransaction(tx *Transaction) error {
    from := *tx.From()
    to := tx.To()

    // Deduct gas from sender
    p.statedb.SubBalance(from, tx.Gas() * tx.GasPrice())

    // Execute contract or transfer
    if to != nil {
        if p.statedb.GetCodeHash(*to) == emptyCode {
            p.statedb.AddBalance(*to, tx.Value()) // simple transfer
        } else {
            p.statedb.Call(from, *to, tx.Data(), tx.Value(), tx.Gas())
        }
    }

    // Increment nonce
    p.statedb.SetNonce(from, p.statedb.GetNonce(from) + 1)
    return nil
}
```

## State Trees

### Ethereum Merkle Patricia Trie

```
State Root ──> Trie Node
                ├── Extension Node (shared nibbles)
                │     └── Branch Node (16 children + value)
                │           ├── Leaf Node (key end + value)
                │           └── ...
                └── ...
```

```go
// Go — state trie update
func (t *Trie) Update(key, value []byte) error {
    path := keyToNibbles(key)
    newRoot, _, err := t.update(t.root, path, value)
    if err != nil { return err }
    t.root = newRoot
    return nil
}
```

### Solana Account State

```rust
struct Account {
    lamports: u64,              // balance in lamports
    data: Vec<u8>,              // account data (serialized struct)
    owner: Pubkey,              // program owner
    executable: bool,           // is this a program?
    rent_epoch: Epoch,          // rent epoch
}
```

## Storage Engines

### LevelDB (Bitcoin Core)

```cpp
// C++ — LevelDB for UTXO set
class CoinsViewDB : public CoinsView {
    leveldb::DB* db;
public:
    bool HaveCoin(const COutPoint& outpoint) const override {
        std::string value;
        leveldb::Status s = db->Get(readoptions, outpoint.ToString(), &value);
        return s.ok();
    }
};
```

### Pebble / BadgerDB (Go implementations)

```go
import "github.com/cockroachdb/pebble"

type BlockchainDB struct {
    db *pebble.DB
}

func (b *BlockchainDB) WriteBlock(block *Block) error {
    key := append([]byte("block:"), block.Hash().Bytes()...)
    data, _ := rlp.EncodeToBytes(block)
    return b.db.Set(key, data, pebble.Sync)
}
```

### Account Storage Layout

```
0x0000...0000 ─> empty trie (default)
0x0000...0001 ─> slot 1 mapping
0x0000...0002 ─> slot 2 value
...
```

Solidity storage slots are computed as:
```
slot = keccak256(abi.encode(key, mappingSlot))
```

## Mempool Design

```go
// Go — txpool (go-ethereum)
type TxPool struct {
    pending map[common.Address]*txList   // executable transactions
    queue   map[common.Address]*txList   // non-executable (future nonce)
    locals  *accountSet                  // local accounts (prioritized)
}

func (pool *TxPool) Add(tx *Transaction) error {
    from, _ := types.Sender(pool.signer, tx)
    if pool.currentState.GetNonce(from) > tx.Nonce() {
        return ErrNonceTooLow // replace with higher gas
    }
    // Price ordering per sender
    pool.pending[from].Add(tx, tx.GasPrice())
    return nil
}
```

## Block Propagation

### Gossip Protocol (Bitcoin)

```
Inventory ──> GetData ──> Block
    │           │           │
    v           v           v
 INV msg    GETDATA msg     BLOCK msg
```

### Eth2 Beacon Block Propagation

```
Gossip Topic: /eth2/beacon_block/ssz
Validators validate and re-gossip within subnet
Aggregation: 50% → 100% within 1-2 slots
```
