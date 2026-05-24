# Node Implementation Deep Dive

## Bitcoin Core (C++)

### Validation Pipeline

```cpp
// validation.cpp — simplified pipeline
bool ProcessNewBlock(CChainState& state, const CBlock& block, CBlockIndex** ppindex) {
    if (!CheckBlock(block, state)) return false;       // structural
    if (!AcceptBlock(block, state, ppindex)) return false;  // contextual + disk
    if (!ConnectBlock(block, state, *ppindex)) return false; // execute, update UTXO
    state.ActivateBestChain(block, ppindex);            // reorganize if needed
    return true;
}
```

### UTXO Set

```cpp
// coins.h — CCoinsView base, LevelDB-backed DB, LRU cache
class CCoinsView {
    virtual bool GetCoin(const COutPoint& outpoint, Coin& coin) const;
    virtual bool HaveCoin(const COutPoint& outpoint) const;
    virtual bool BatchWrite(CCoinsMap& mapCoins, const uint256& hashBlock);
};

class CCoinsViewDB : public CCoinsView {
    std::unique_ptr<leveldb::DB> m_db;            // ~500 GB UTXO set
    bool GetCoin(const COutPoint& outpoint, Coin& coin) const override {
        leveldb::Slice key((const char*)&outpoint, sizeof(outpoint));
        std::string value;
        return m_db->Get(leveldb::ReadOptions(), key, &value).ok();
    }
};

class CCoinsViewCache : public CCoinsView {
    CCoinsMap cacheCoins;  // unordered_map for batched writes
    bool GetCoin(const COutPoint& outpoint, Coin& coin) const {
        auto it = cacheCoins.find(outpoint);
        if (it != cacheCoins.end()) { coin = it->second; return true; }
        return base->GetCoin(outpoint, coin);
    }
};
```

### Mempool

```cpp
// txmempool.h — CTxMemPool with descendant/ancestor scoring, RBF
class CTxMemPoolEntry {
    CTransaction tx; CAmount fee; int64_t time;
    unsigned int entrySize;
    int64_t nCountWithDescendants;
    CAmount nModFeesWithDescendants;
};

// RBF (BIP-125): replacement must pay higher fee + rate
bool IsRBFAcceptable(const CTxMemPool& pool, const CTransaction& replacement) {
    CAmount replacementFees = replacement.GetTotalFee();
    CAmount replacedFees = pool.GetReplacedFees(replacement);
    return replacementFees > replacedFees;
}
```

### P2P (inv/getdata)

```cpp
// net_processing.cpp — Version handshake → inv → getdata → tx/block
void ProcessMessage(CNode* pfrom, const std::string& msg_type, CDataStream& vRecv) {
    if (msg_type == "inv") {
        std::vector<CInv> invs; vRecv >> invs;
        for (auto& inv : invs)
            if (!pfrom->HaveInventory(inv))
                pfrom->PushMessage(NetMsgType::GETDATA, inv);
    }
}
```

## go-ethereum (Go)

### StateDB + Journal + Snapshot

```go
// core/state/statedb.go
type StateDB struct {
    db     Database
    trie   Trie
    stateObjects    map[common.Address]*stateObject
    journal          *journal               // rollback entries
    snapAccSet       *fastcache.Cache       // account snapshot cache
}

func (s *StateDB) SubBalance(addr common.Address, amount *big.Int) {
    stateObject := s.GetOrNewStateObject(addr)
    prev := new(big.Int).Set(stateObject.Balance())
    stateObject.SubBalance(amount)
    s.journal.append(balanceChange{account: &addr, prev: prev}) // for reorg rollback
}
```

### Transaction Pool

```go
// core/txpool/txpool.go
type TxPool struct {
    pending    map[common.Address]*txList   // ready txs (by nonce)
    queue      map[common.Address]*txList   // queued (nonce gap)
    pricedList *txPricedList                // min-heap for fee eviction
    locals     *addressSet                  // local txs (free)
}

type pricedHeap []*Transaction
func (h *pricedHeap) Less(i, j int) bool {
    return h.items[i].GasTipCap.Cmp(h.items[j].GasTipCap) < 0
}
```

### P2P

```go
// p2p/server.go — discv5 discovery + RLpx transport
type Server struct {
    discv5 *discover.UDPv5
    rlpx   *rlpx.Server
    peers  map[enode.ID]*Peer
}
```

## reth (Rust)

### Staged Sync Pipeline

```rust
// crates/stages/src/pipeline.rs
#[async_trait]
pub trait Stage: Send + Sync {
    async fn execute(&self, input: StageInput) -> Result<(ExecOutput, StageOutput)>;
    fn id(&self) -> StageId;
}

pub struct Pipeline {
    stages: Vec<Box<dyn Stage>>,   // headers → bodies → recovery → execution → hash → merkle
    db: DatabaseEnv,               // MDBX
}

// crates/stages/src/stages/headers.rs — header download + insert
impl Stage for HeaderStage {
    async fn execute(&self, input: StageInput) -> Result<(ExecOutput, StageOutput)> {
        let tip = self.downloader.download(&input.database, input.checkpoint.block_number).await?;
        input.database.insert_headers(&tip.headers)?;
        Ok(ExecOutput::Progress(tip.height))
    }
}

// crates/stages/src/stages/merkle.rs — Merkle root computation
impl Stage for MerkleStage {
    async fn execute(&self, input: StageInput) -> Result<(ExecOutput, StageOutput)> {
        let hashed_state = input.database.hashed_accounts()?;
        let root = reth_trie::state_root(hashed_state)?;
        input.database.write_block_root(root)?;
        Ok(ExecOutput::Progress(input.checkpoint.block_number))
    }
}
```

### Engine API

```rust
// crates/consensus/beacon/src/engine/mod.rs
impl BeaconEngine for EngineApi {
    async fn forkchoice_updated(&self, state: ForkchoiceState, attrs: Option<PayloadAttributes>) -> Result<ForkchoiceUpdated> {
        let head = self.chain.get_block(&state.head_block_hash)?;
        self.validate_and_set_head(head)?;
        Ok(ForkchoiceUpdated { status, payload_id: None })
    }

    async fn new_payload(&self, payload: ExecutionPayload) -> Result<PayloadStatus> {
        let block = payload.into_block()?;
        let (new_state, receipts) = self.chain.execute(&block, &parent.state)?;
        if new_state.root() != block.state_root { return PayloadStatus::invalid(block.hash()); }
        self.chain.insert_block(block, new_state)?;
        Ok(PayloadStatus::valid(block.hash()))
    }
}
```

### DB (MDBX, Type-Safe Tables)

```rust
// crates/storage/db/src/tables.rs
impl Table for HeaderNumbers { type Key = BlockNumber; type Value = H256; const NAME: &'static str = "HeaderNumbers"; }
impl Table for AccountHistory { type Key = (Address, BlockNumber); type Value = (); const NAME: &'static str = "AccountHistory"; }
```

### Sync Performance

| Client | Full sync | Snap/Stage sync | DB size |
|--------|-----------|-----------------|---------|
| Bitcoin Core | ~3 days | ~6 h (pruned) | ~500 GB |
| geth | ~4 days | ~3 h (snap) | ~600 GB |
| reth | ~2 days | ~45 min (stage) | ~1 TB |

## Tendermint / Cosmos SDK (Go)

```go
// tendermint/consensus/state.go — proposer selection + prevote/precommit
func (cs *State) enterPropose(height int64, round int32) {
    proposer := cs.Validators.GetProposer(round) // power-weighted round-robin
    if cs.privValidator.GetPubKey().Address == proposer.Address {
        block, parts := cs.blockExec.CreateBlock(height, round, cs.state)
        cs.signAddVote(block, parts) // broadcast proposal
    }
}
```

### IAVL Tree

```go
// iavl/mutable_tree.go
type MutableTree struct {
    root     *Node
    ndb      *nodeDB
    version  int64
    versions map[int64]bool
}

func (t *MutableTree) Set(key, value []byte) (updated bool) {
    t.root, updated = t.recursiveSet(t.root, key, value)
    return
}

func (t *MutableTree) SaveVersion() ([]byte, int64, error) {
    hash, _ := t.root.hashWithCount()
    t.ndb.SaveVersion(t.version, t.root)
    t.versions[t.version] = true
    return hash, t.version, nil
}
```

## Substrate / Polkadot (Rust)

```rust
// frame/support — FRAME pallet with storage + call
#[frame_support::pallet]
pub mod pallet_balances {
    #[pallet::storage]
    pub type Account<T> = StorageMap<_, Blake2_128Concat, T::AccountId, AccountData<T::Balance>, ValueQuery>;

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        pub fn transfer(origin: OriginFor<T>, dest: T::AccountId, value: T::Balance) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            <Account<T>>::mutate(&sender, |data| data.free = data.free.saturating_sub(value));
            <Account<T>>::mutate(&dest, |data| data.free = data.free.saturating_add(value));
            Ok(())
        }
    }
}

// BABE (block production) + GRANDPA (finality)
fn babe_author_block(slot: Slot, parent: Hash, epoch: &Epoch) -> Option<PreDigest> {
    if !check_slot_winner(epoch, slot, &keypair) { return None; }
    // Produce block with VRF proof
}
```
