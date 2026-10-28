# Block Validation Pipeline

The ordered checks a full node runs before accepting a block, for Bitcoin (PoW, UTXO) and Ethereum (PoS, account model, split execution/consensus clients). Ordering cheap checks first limits denial-of-service exposure. Transaction-level rules are in `reference_guide_1.md`.

## Pipeline Overview

```text
header received
  ├─ 1. syntactic header checks         (cheap, no state)
  ├─ 2. contextual header checks        (needs parent / chain context)
  ├─ 3. proof checks                    (PoW target / proposer signature)
body received
  ├─ 4. body ↔ header commitments       (merkle / tx root / withdrawals root)
  ├─ 5. transaction stateless checks    (parallelizable)
  ├─ 6. execution / script validation   (state access, most expensive)
  ├─ 7. post-state commitment           (state root / UTXO set update)
  └─ 8. fork choice update              (becomes head or side branch)
```

A failure at any step marks the block invalid; descendants are invalid too. Nodes typically cache invalid hashes to avoid re-processing and penalize the peer that relayed them.

## Bitcoin

### Header-first
Bitcoin Core downloads and validates headers before bodies (headers-first sync). A header is 80 bytes:

| Field | Check |
|-------|-------|
| `version` | Signals soft-fork deployments (BIP9 version bits) |
| `prevBlockHash` | Must reference a known header |
| `merkleRoot` | Checked once the body arrives |
| `time` | Greater than median of previous 11 blocks; not more than 2 hours ahead of network-adjusted time |
| `bits` | Equals the expected target from the difficulty adjustment (every 2016 blocks) |
| `nonce` | `SHA256d(header) ≤ target` |

Since Bitcoin Core 24, the node also guards headers sync against low-work header spam with a presync phase that only stores headers once the chain has enough cumulative work.

### Body
- First transaction is coinbase; no other coinbase.
- Merkle root of txids matches header; witness commitment in coinbase matches the witness merkle root (SegWit).
- Block weight ≤ 4,000,000; signature-operation cost within limit.
- Coinbase claims ≤ subsidy + fees; BIP34 height in coinbase.
- All transactions valid against the UTXO set as updated by earlier transactions in the same block.

### Script validation shortcut
`-assumevalid=<hash>` skips script (signature) checks for ancestors of a known block during initial sync; all other checks still run. It is a performance assumption compiled into each release, not a trust in miners for current blocks.

## Ethereum

Post-Merge validation is split: the consensus client (CL) validates the beacon block, then hands the execution payload to the execution client (EL) through the Engine API.

### Consensus layer (beacon block)
- `slot` greater than parent's slot and not in the future beyond clock disparity.
- `proposer_index` equals the expected proposer for the slot (RANDAO-based shuffling).
- BLS signature of the proposer over the block root.
- RANDAO reveal valid; attestations, slashings, deposits, voluntary exits, withdrawals and (post-Deneb) blob KZG commitments processed per spec.
- Execution payload's `parent_hash` and `timestamp` consistent with the beacon state.

### Engine API handoff
```text
CL ──engine_newPayloadVX(payload, versionedHashes, parentBeaconBlockRoot, ...)──► EL
EL ──► { status: VALID | INVALID | SYNCING | ACCEPTED, latestValidHash }
CL ──engine_forkchoiceUpdatedVX(headBlockHash, safeBlockHash, finalizedBlockHash)──► EL
```

The method version suffix changes with forks (V3 for Cancun/Deneb, V4 for Prague/Electra, newer for later forks). `SYNCING`/`ACCEPTED` mean the EL cannot judge yet; the CL may optimistically import but must not treat the block as validated.

### Execution layer
- Header: `parentHash`, `number = parent + 1`, `gasLimit` within 1/1024 of parent, `gasUsed ≤ gasLimit`, `baseFeePerGas` equals EIP-1559 formula, `timestamp > parent.timestamp`, blob gas fields consistent (EIP-4844).
- `transactionsRoot`, `withdrawalsRoot`, (post-Prague) `requestsHash` match the body.
- Execute transactions in order; each must pass the stateless and stateful checks.
- After execution: `stateRoot`, `receiptsRoot`, `logsBloom`, `gasUsed` equal the header values.

## DoS-Aware Ordering

| Principle | Example |
|-----------|---------|
| Reject before allocating | Size limits on decode before building objects |
| Prove work before work | PoW check / proposer signature before body download or execution |
| Cache negative results | Store invalid block hashes; disconnect peers that send them |
| Parallelize independent work | Signature recovery and script checks across cores |
| Bound pending data | Limit orphan/unknown-parent blocks per peer |

## Implementation Sketch (generic, Python)

```python
from __future__ import annotations

from dataclasses import dataclass


class InvalidBlock(Exception):
    def __init__(self, block_hash: str, reason: str) -> None:
        super().__init__(f"block {block_hash} invalid: {reason}")
        self.block_hash = block_hash
        self.reason = reason


@dataclass(frozen=True, slots=True)
class Header:
    hash: str
    parent: str
    number: int
    timestamp: int
    tx_root: str
    state_root: str


def validate(header: Header, body, chain, state_db, now: int, max_drift: int) -> None:
    parent = chain.header(header.parent)
    if parent is None:
        raise InvalidBlock(header.hash, "unknown parent")        # or queue as orphan, bounded
    if header.number != parent.number + 1:
        raise InvalidBlock(header.hash, "non-sequential number")
    if not parent.timestamp < header.timestamp <= now + max_drift:
        raise InvalidBlock(header.hash, "timestamp out of range")
    chain.verify_seal(header)                                    # PoW target or proposer signature
    if body.merkle_root() != header.tx_root:
        raise InvalidBlock(header.hash, "transaction root mismatch")
    post = state_db.apply(parent.state_root, body.transactions)  # raises on invalid tx
    if post.root != header.state_root:
        raise InvalidBlock(header.hash, "state root mismatch")
```

## Pitfalls

- Executing transactions before checking the seal: lets anyone force expensive work.
- Validating with the wrong fork's rules at a fork boundary (activation by height on Bitcoin soft forks, by timestamp on post-Merge Ethereum forks).
- Treating `SYNCING` from the EL as `VALID`.
- Not marking descendants of an invalid block invalid.

## Checklist

- [ ] Cheap header checks and seal before body work
- [ ] Commitments (tx root, witness/withdrawals/requests) verified
- [ ] Execution produces matching post-state root
- [ ] Fork rules selected by activation height/timestamp
- [ ] Invalid hashes cached; misbehaving peers penalized
