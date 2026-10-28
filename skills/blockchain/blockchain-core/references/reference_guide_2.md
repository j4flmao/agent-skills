# Chain Reorganizations and Finality Handling

How reorganizations happen, what "final" means on probabilistic and economic-finality chains, and how to build node-adjacent software (indexers, bridges, exchanges, payment processors) that stays correct when the canonical chain changes. Fork-choice theory lives in `consensus-deep-dive.md`; this file is about consuming chains safely.

## Why Reorgs Happen

| Cause | Typical depth |
|-------|---------------|
| Two blocks found/proposed at about the same time | 1 block |
| Late block propagation, proposer boost / attestation timing (PoS) | 1–2 blocks |
| Network partition healing | Depends on partition length |
| Client bug or consensus split | Unbounded until fixed |
| Majority-hashrate / majority-stake attack | Attacker-chosen |

Reorgs are normal at depth 1–2 on most chains. Software must treat any non-final block as provisional.

## Finality Models

| Chain type | Finality | How to observe |
|------------|----------|----------------|
| Bitcoin (Nakamoto PoW) | Probabilistic; reversal probability falls exponentially with confirmations | Confirmation count |
| Ethereum (Gasper: LMD-GHOST + Casper FFG) | Economic: finalized checkpoints cannot be reverted without ≥ 1/3 of stake being slashable | JSON-RPC block tags `safe`, `finalized` |
| BFT chains (CometBFT/Tendermint, HotStuff family) | Instant once a block commits with > 2/3 voting power | Block is final when committed |
| Optimistic rollups | L2 soft confirmation from sequencer; L1 settlement after batch posting; withdrawals after the fault-proof window | Sequencer status vs L1 inclusion vs challenge period |
| ZK rollups | Final when the validity proof for the batch is verified on L1 | L1 verification event |

### Ethereum block tags
```bash
# head of the canonical chain (may reorg)
cast block latest --rpc-url "$RPC_URL" -f number
# justified-ish head unlikely to reorg under honest-majority + synchrony assumptions
cast block safe --rpc-url "$RPC_URL" -f number
# finalized checkpoint (normally ~2 epochs behind head; 1 epoch = 32 slots × 12 s)
cast block finalized --rpc-url "$RPC_URL" -f number
```

If finality stalls (more than 1/3 of stake offline), `finalized` stops advancing while `latest` continues. Systems keyed on `finalized` pause instead of becoming unsafe; alert on finality lag.

## Choosing Confirmation Policy

Define policy per asset and value, not globally:

| Use case | Bitcoin | Ethereum L1 | BFT chain |
|----------|---------|-------------|-----------|
| Display / UX | 0–1 conf (show as pending) | `latest` | committed |
| Low-value credit | small number of confs per your risk model | `safe` | committed |
| High-value credit, bridge release | deeper confirmation count | `finalized` | committed + light-client verified |

Confirmation counts are a risk decision: estimate the cost to an attacker of rewriting N blocks versus the value at stake, and revisit when hash rate or stake distribution changes.

## Reorg-Safe Ingestion Pattern

Store the block hash with every derived row and keep a window of recent headers to detect divergence.

```sql
CREATE TABLE blocks (
  number      BIGINT PRIMARY KEY,
  hash        BYTEA NOT NULL UNIQUE,
  parent_hash BYTEA NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('pending','safe','finalized'))
);

CREATE TABLE transfers (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  block_number BIGINT NOT NULL REFERENCES blocks(number) ON DELETE CASCADE,
  block_hash  BYTEA NOT NULL,
  log_index   INT NOT NULL,
  token       BYTEA NOT NULL,
  from_addr   BYTEA NOT NULL,
  to_addr     BYTEA NOT NULL,
  amount      NUMERIC(78,0) NOT NULL,
  UNIQUE (block_hash, log_index)
);
CREATE INDEX transfers_block_number_idx ON transfers (block_number);
```

```python
from __future__ import annotations

import logging

log = logging.getLogger("ingest")


def ingest_next(db, rpc) -> None:
    head = db.latest_block()                       # (number, hash) or None
    nxt = rpc.get_block((head.number + 1) if head else rpc.start_block())
    if head and nxt.parent_hash != head.hash:
        ancestor = find_common_ancestor(db, rpc, head.number)
        log.warning("reorg detected: rolling back from %s to %s", head.number, ancestor)
        db.delete_blocks_after(ancestor)          # cascades derived rows in one transaction
        return                                     # next call re-ingests from ancestor + 1
    with db.transaction():
        db.insert_block(nxt, status="pending")
        db.insert_derived_rows(nxt)


def find_common_ancestor(db, rpc, number: int) -> int:
    while number >= 0:
        local = db.block_hash(number)
        remote = rpc.get_block(number).hash
        if local == remote:
            return number
        number -= 1
    raise RuntimeError("no common ancestor found; local history diverged beyond genesis")


def promote(db, rpc) -> None:
    db.mark_status_up_to(rpc.get_block("safe").number, "safe")
    db.mark_status_up_to(rpc.get_block("finalized").number, "finalized")
```

Rules embedded above:
- Derived data is idempotent on `(block_hash, log_index)`.
- Rollback and re-ingest happen in transactions so readers never see half a reorg.
- Business actions with external effects (crediting a user, releasing bridge funds) run only for `finalized` (or your policy's threshold) rows.
- Bound the walk-back depth by the finality window and alert when it is exceeded.

## Event Subscriptions

`eth_subscribe("logs")` emits removed logs with `"removed": true` on reorg. Handle them by deleting or reversing the corresponding rows. Polling with `eth_getLogs` by block range must re-check recent ranges by block hash, because a range query on `latest` can return logs from a block that is later orphaned.

## Bitcoin Specifics

- `getblockchaininfo` gives the active tip; `getchaintips` lists competing branches and their status (`active`, `valid-fork`, `valid-headers`, `headers-only`, `invalid`).
- ZMQ `hashblock` notifications do not signal disconnects; compare the new block's `previousblockhash` with your stored tip.
- After a reorg, transactions from disconnected blocks return to the mempool if still valid; a conflicting transaction may have confirmed instead (double-spend of an unconfirmed deposit).

## Operational Alerts

| Alert | Signal |
|-------|--------|
| Deep reorg | Walk-back depth > expected (e.g. > 2 on Ethereum L1) |
| Finality lag | `latest - finalized` above normal range |
| Fork detected | `getchaintips` shows a long `valid-fork` branch |
| Node divergence | Two independent nodes disagree on hash at a finalized height |

## Pitfalls

- Using block number as a unique key without the hash.
- Crediting deposits from `latest` or 0-conf.
- Assuming rollup sequencer confirmations equal L1 finality.
- Relying on a single RPC provider for finality decisions; cross-check with a second node for high-value flows.

## Checklist

- [ ] Every derived row stores block hash; parent-hash continuity checked on ingest
- [ ] Rollback transactional and idempotent
- [ ] Side-effecting actions gated on finality policy
- [ ] Removed logs handled for subscriptions
- [ ] Alerts for reorg depth and finality lag
