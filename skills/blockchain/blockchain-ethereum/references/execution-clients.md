# Execution Clients

## Geth (Go — go-ethereum)

**Most popular EL client (~60%+ share).**

### Architecture

```
geth
├── cmd/geth          — CLI entry point
├── eth               — Ethereum protocol (downloader, filters, gas price oracle)
│   ├── ethconfig     — configuration
│   ├── gasprice      — gas price oracle (EIP-1559)
│   └── filters       — event filter system
├── les               — Light Ethereum Subprotocol (light client)
├── p2p               — devp2p networking (RLPx, discv4/v5)
├── core              — EVM, state processor, tx pool, blockchain
│   ├── vm            — EVM interpreter
│   ├── state         — state DB (trie diff → sync)
│   ├── types         — transaction, block, receipt types
│   ├── txpool        — transaction pool (legacy + blob pool)
│   └── rawdb         — raw database access
├── trie              — Merkle Patricia Trie (hashed + path-based schemes)
├── miner             — mining / sealing (only in clique dev mode now)
├── beacon            — CL integration (engine API, forkchoice)
├── node              — node lifecycle, RPC stack (HTTP/WS/IPC)
└── ethdb             — DB abstraction (LevelDB, Pebble)
```

### State Processing

```go
func Process(state *state.StateDB, header *types.Header, txs []*Transaction, config *params.ChainConfig) (*Receipts, error) {
    receipts := make(Receipts, 0)
    statedb := state.Copy()
    for i, tx := range txs {
        statedb.SetTxContext(tx.Hash(), i)
        receipt, err := ApplyTransaction(config, bc, nil, gp, statedb, header, tx, &usedGas, vmConfig)
        receipts = append(receipts, receipt)
    }
    return receipts, nil
}
```

### Sync Modes

| Mode | Description | Speed | DB Size |
|------|-------------|-------|---------|
| **Snap** | Dynamic snapshots + hex proofs; sync state in parallel chunks | Fastest (hours) | ~500GB |
| **Full** | Execute every block from genesis | Slow (days) | ~12TB archival |
| **Light** | LES: only headers, random state queries | Fast but limited | ~50MB |

### Transaction Pool (txpool)

```go
type TxPool struct {
    config   TxPoolConfig
    current  map[common.Address]*accountPool  // pending
    queued   map[common.Address]*accountPool  // queued
    all      *lookupMap                       // all txs by hash
    gasPrice uint64                           // current floor price
    blobPool *BlobPool                        // EIP-4844 blob txs
}
```

- `PricedQueue`: heap ordered by effective tip
- `nonce` gaps → queued; contiguous nonces → pending
- Max: 4096 pending, 1024 queued per account, 10000 blob txs
- Replacement rule: `new_gas_price >= old_gas_price * 1.1` (10% bump)

### Database

| Store | Engine | Content |
|-------|--------|---------|
| **LevelDB** (legacy) | LSM tree | State trie nodes, blocks, headers |
| **Pebble** (default) | LSM tree (RocksDB fork) | Same data, 2x faster writes |
| **Ancient** | Freezer (append-only) | Blocks > 90000, receipts > 90000 |

---

## Reth (Rust — "Rust Ethereum")

**Fastest sync (under 6 hours to full archival).**

### Architecture

```
reth
├── bin/reth        — CLI (node, import, stage, db, p2p commands)
├── crates
│   ├── node-core   — engine, primitives, downloaders
│   ├── storage     — DB abstraction (MDBX), provider traits
│   ├── stages      — staged sync pipeline
│   │   ├── headers     — download block headers
│   │   ├── bodies      — download block bodies
│   │   ├── sender      — recover tx senders from signatures
│   │   ├── execution   — execute blocks
│   │   ├── hash-state  — hash state trie
│   │   ├── inter-hash  — intermediate hash computation
│   │   └── account-hashing, storage-hashing
│   ├── evm         — revm-based EVM (parallel execution)
│   ├── consensus   — consensus engine (EthEngine)
│   ├── rpc         — JSON-RPC (eth_, engine_, debug_)
│   ├── network     — p2p (RLPx, discv4)
│   └── downloader  — block/header download with backpressure
└── tests           — Ethereum tests (retesteth spec)
```

### Stage Sync Pipeline

```
HeaderDownload → BodyDownload → SenderRecovery → Execution → 
  HashState → IntermediateHashes → TrieReconstruction
```

Each stage writes to DB, marks progress in `SyncStage` table. Pipeline manages checkpoints, can unwind on reorg.

### Parallel EVM Execution

Reth can execute multiple blocks in parallel (within an epoch — no cross-epoch dependency):

- Pre-compute sender recovery
- Execute non-conflicting blocks concurrently
- Merge results into state

### MDBX Backend

- Memory-mapped (zero-copy reads)
- ACID transactions with MVCC
- Single writer, multiple readers
- 2-5x faster than LevelDB for reth workload

---

## Nethermind (C# / .NET)

**Enterprise-focused, strongest CL integration.**

### Architecture

```
Nethermind.Runner    — CLI entry (.NET host)
Nethermind.Api       — node API, plugin system
Nethermind.Consensus — Clique, AuRa, Ethash engines
Nethermind.Core      — primitives (Block, Transaction, Address, Bloom)
Nethermind.Evm       — EVM (int256, arithmetic)
Nethermind.JsonRpc   — JSON-RPC, WebSocket
Nethermind.Network   — devp2p, discovery
Nethermind.State     — state provider, trie
Nethermind.Store     — DB (RocksDB, LevelDB)
Nethermind.TxPool    — transaction pool
Nethermind.Db        — RocksDB wrapper
Nethermind.Synchronization — sync manager (fast, snap, full)
```

### Features

- Plugin system: add modules without fork
- Full Ethereum test suite integration
- Strong CL integration (Lodestar, Lighthouse, Nimbus, Prysm)
- Detailed JSON-RPC spec compliance

---

## Erigon (Go — fork of geth)

**Archival-efficient, staged sync pioneered.**

### Architecture

```
erigon
├── cmd/erigon       — main entry
├── erigon-lib       — library: state (flat + history), downloader, 
│   │                   sentry, txpool, kv (MDBX wrapper)
│   ├── state        — state reader, history, change sets
│   ├── downloader   — bittorrent-based block download
│   ├── sentry       — p2p sentry (separate process)
│   ├── txpool       — transaction pool
│   └── kv           — key-value DB abstraction
├── eth/stagedsync   — staged sync pipeline
└── core             — EVM, state, types
```

### Staged Sync (StagedSync)

```
1. Headers          — download headers, verify PoW (historical)
2. Block Hashes     — index block number → hash
3. Bodies           — download block bodies
4. Sender Recovery  — recover tx senders from ECDSA signatures
5. Execution        — execute all blocks, produce state
6. Hash State       — hash account/storage keys to trie-ready
7. Intermediate Hashes — build Merkle trie levels
8. Trie Reconstruction — compute final state root
9. TxLookup         — index tx hash → block number
10. Finish          — verify state root
```

### Database

- MDBX for state + history (flat storage: no re-execution needed for historical queries)
- Flat state storage: `account_address → encoded_account` (not trie-based)
- History: `key → (block_number → value)` change sets
- Separate trie from state — trie only for validation

### Comparison

| Client | Language | Sync to Tip | Archival Size | RAM (full) | Best For |
|--------|----------|-------------|---------------|------------|----------|
| **Geth** | Go | 6–12h (snap) | ~500GB (snap), ~12TB (full) | 4–8GB | Production nodes, majority client |
| **Reth** | Rust | 4–6h (full) | ~3TB (full) | 4–8GB | Fast sync, research, parallel EVM |
| **Nethermind** | C# | 8–14h (snap) | ~500GB (snap), ~8TB (full) | 6–10GB | Enterprise, .NET ecosystem |
| **Erigon** | Go | 8–16h (staged) | ~2TB (full, no re-execution) | 8–16GB | Archival queries, block explorer backends |
