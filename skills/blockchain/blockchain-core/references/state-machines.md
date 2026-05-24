# Blockchain State Machine Design

## Ethereum World State

### Account Model (Merkle Patricia Trie)

```
σ = world state = SHA3(RLP(account)) → account trie
σ[a] = (nonce, balance, storageRoot, codeHash)
```

```go
// core/state/state_object.go
type Account struct {
    Nonce    uint64
    Balance  *big.Int
    Root     common.Hash  // Merkle root of storage trie
    CodeHash []byte       // Keccak256(EVM code)
}

type stateObject struct {
    data   Account
    trie   Trie           // storage trie (lazy-loaded)
    code   []byte
    dirtyStorage map[common.Hash]common.Hash // pending writes
}
```

### State Transition

```
σ' = ϒ(σ, T)
Steps: increment sender nonce → deduct gas → EVM execute → refund → destroy empty → pay miner
```

```go
// core/state_transition.go
func (st *StateTransition) TransitionDb() (*ExecutionResult, error) {
    if st.state.GetNonce(st.msg.From()) != st.msg.Nonce() { return nil, ErrInvalidNonce }
    st.state.SubBalance(st.msg.From(), st.msg.Value())
    contract := vm.NewContract(caller, to, value, gas, st.journal)
    ret, err := st.evm.Run(contract, input)
    st.state.AddBalance(st.msg.From(), refund)
    return &ExecutionResult{UsedGas: st.gasUsed(), ReturnData: ret}, nil
}
```

### Trie Operations

```go
// trie/trie.go — recursive get/put/delete with hash-node traversal
func (t *Trie) Get(key []byte) []byte {
    node := t.root
    for _, nibble := range keybytesToHex(key) {
        switch n := node.(type) {
        case *shortNode: node = n.Val
        case *fullNode:  node = n.Children[nibble]
        case hashNode:   node = t.db.MustGet(hash(n))  // fetch from DB
        }
    }
    return node.(valueNode)
}

func (t *Trie) Commit(onleaf LeafCallback) (root hashNode, err error) {
    root, err = t.hashRoot(t.db, onleaf) // hash dirty nodes, write to DB
    t.unhashed = 0
    return
}
```

### Storage

```
LevelDB key = sha3(RLP(node)), value = RLP(node) (hash → node mapping)
```

### EIP-161 (Empty Account Deletion)

```go
if contract.Empty() { statedb.Suicide(contract.Address()) }
// Empty = nonce==0 && balance==0 && codeHash==emptyCodeHash
```

### EIP-2200 (Net Gas Metering for SSTORE)

```go
func opSstore(pc *uint64, interpreter *EVMInterpreter, scope *ScopeContext) []byte {
    current := scope.Contract.GetState(key)
    original := interpreter.evm.StateDB.GetCommittedState(addr, key)
    if current == original {
        if original == (common.Hash{}) { gas = SstoreSetGas - ColdSloadCost }
        else { gas = SstoreResetGas - ColdSloadCost + ColdSloadCost }
    }
    scope.Contract.SetState(key, value)
    return nil
}
```

## UTXO Model (Bitcoin)

```cpp
// coins.h — CCoinsView with Coin (outpoint → CTxOut + height)
class CCoinsView {
    struct Coin { CTxOut out; uint32_t nHeight; bool fCoinBase; };
    virtual bool GetCoin(const COutPoint& outpoint, Coin& coin);
    virtual bool HaveCoin(const COutPoint& outpoint);
};

// validation.cpp — input validation
bool CheckTxInputs(const CTransaction& tx, CCoinsViewCache& view, int nSpendHeight) {
    CAmount valueIn = 0;
    for (auto& input : tx.vin) {
        Coin coin;
        if (!view.GetCoin(input.prevout, coin)) return false;             // must exist
        if (coin.IsCoinBase() && nSpendHeight - coin.nHeight < 100) return false; // maturity
        valueIn += coin.out.nValue;
    }
    if (valueIn < tx.GetValueOut()) return false; // no inflation
    return true;
}
```

### Transaction Graph

```
UTXO_A ──┐          ┌── UTXO_D
UTXO_B ──┤── TX1 ───┤── UTXO_E
UTXO_C ──┘          └── UTXO_F
```

### SegWit UTXO Commitment (BIP-141)

```
txid  = hash(tx without witness)
wtxid = hash(tx with witness)
UTXO commitment = OP_RETURN <H(txid_1 || ... || wtxid_1 || ...)>
```

## Solana Account Model

### Bank Runtime

```rust
// runtime/src/bank.rs
impl Bank {
    pub fn process_transaction(&self, tx: &SanitizedTransaction) -> Result<TransactionResults> {
        self.verify_transaction_signatures(tx)?;
        self.check_blockhash(&tx.message().recent_blockhash)?;
        self.check_transaction_accounts(tx)?;            // balance + rent
        let result = self.process_executable_transactions(tx); // BPF execution
        self.deposit_fees(tx, &result);
        Ok(result)
    }
}
```

### AccountsDB (RocksDB)

```rust
// runtime/src/accounts_db.rs
pub struct Account {
    pub lamports: u64,          // balance
    pub data: Vec<u8>,          // program state
    pub owner: Pubkey,          // owning program
    pub executable: bool,
    pub rent_epoch: Epoch,
}

// Key = (pubkey, slot), Value = Account + refcount
pub fn store_account(&self, pubkey: &Pubkey, account: &Account, slot: Slot) {
    let key = (pubkey, slot).to_bytes();
    let value = bincode::serialize(&account);
    self.rocksdb.put_cf(self.cf_handle(ACCOUNT_COLUMN), key, value);
}
```

### Rent Mechanism

```rust
pub fn minimum_balance(data_len: usize) -> u64 {
    (data_len as u64 + 128) * LAMPORTS_PER_BYTE_YEAR * 2
}
// If balance >= 2 years rent → exempt; otherwise rent collected per epoch
```

### State Transition Flow

```
BPF Loader → JIT/Interpret → Execute → Modify Accounts → Compute Budget → Commit
```

### Sysvar Accounts

| Account | Purpose |
|---------|---------|
| Clock | Slot, epoch, unix timestamp |
| Rent | Rent parameters |
| EpochSchedule | Epoch timing |
| Fees | Fee parameters |

## Cosmos IAVL (Immutable AVL+ Tree)

### Tree Structure

```
        Root (vN)
       /        \
    Node A     Node B
   /    \     /    \
 Leaf  Leaf Leaf  Leaf
```

- AVL-balanced (height diff ≤ 1)
- Immutable: `SaveVersion()` creates new root, old nodes orphaned

```go
// iavl/node.go
type Node struct {
    key, value []byte
    version    int64
    height     int8
    hash       []byte
    left, right *Node
}

func (t *MutableTree) Set(key, value []byte) (updated bool) {
    t.root, updated = t.recursiveSet(t.root, key, value)
    return
}

func (t *MutableTree) SaveVersion() ([]byte, int64, error) {
    t.ndb.saveOrphan(t.root, t.version)
    hash := t.root._hash()
    t.ndb.saveRoot(t.version+1, hash)
    return hash, t.version + 1, nil
}
```

### Pruning

```go
// keep recent N, keep every Nth for archive
type PruningOptions struct {
    KeepRecent uint64  // default 100
    KeepEvery  uint64  // default 10000
}
```

### IBC State Verification

```go
func (k Keeper) VerifyConnectionState(ctx sdk.Context, clientID string, height Height,
    prefix CommitmentPrefix, proof []byte, conn ConnectionEnd) error {
    clientState, found := k.GetClientState(ctx, clientID)
    if !found { return ErrClientNotFound }
    return clientState.VerifyMembership(ctx, k.storeService, k.cdc, height, 0, 0,
        proof, prefix, "connections", conn)
}
// Uses Merkle proof against on-chain IAVL root
```

## Model Comparison

| Model | Storage Backend | State Root | Gas Metering |
|-------|----------------|------------|--------------|
| Ethereum MPT | LevelDB/Pebble | Merkle Patricia Trie | EIP-1559 |
| Bitcoin UTXO | LevelDB | None (assumed valid) | Fee market |
| Solana Account | RocksDB | Account hash list | Compute budget |
| Cosmos IAVL | LevelDB | AVL+ root hash | Gas per op |
