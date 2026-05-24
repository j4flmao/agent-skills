# Ordinals, BRC-20 & Runes

Token protocols on Bitcoin.

---

## Ordinals Theory

### Satoshi Numbering (Ordinal Theory)
- Every satoshi (1 BTC = 10^8 sat) gets a unique ordinal number based on mining order.
- Ordinals are assigned sequentially: first sat of first block = 0, then each subsequent sat increments by 1.
- Transaction inputs consume ordinal ranges; outputs reassign them in FIFO order (first-input-sat-to-first-output-sat).
- Off-chain indexers track sat positions; no consensus change, no new block space.

### Inscription (envelope)
- Content embedded into Bitcoin transactions using a **witness envelope**:
  ```
  OP_FALSE
  OP_IF
    OP_PUSH "ord"
    OP_PUSH 1    # content type flag
    OP_PUSH <content-type>  # e.g. "text/plain;charset=utf-8"
    OP_PUSH 0    # separator
    OP_PUSH <data>          # actual content
  OP_ENDIF
  ```
- The envelope lives in the **witness** (Taproot input), benefiting from SegWit discount (75% weight reduction).
- Content types: `image/png`, `text/html`, `application/json`, `video/mp4`, etc.
- Inscriptions can be **recursive**: one inscription references another by its ordinal ID (`/content/<inscription-id>`).

### Sat Rarity
| Rarity      | Condition                                          |
|-------------|-----------------------------------------------------|
| common      | Any sat not in other categories                     |
| uncommon    | First sat of each block                             |
| rare        | First sat of each difficulty period (2016 blocks)   |
| epic        | First sat of each halving epoch (~210,000 blocks)   |
| legendary   | First sat of each cycle (6 halvings = ~120 years)   |
| mythic      | First sat of the genesis block (block 0)            |

---

## Inscription Workflow

### Commit + Reveal
1. **Commit transaction**: creates a taproot output committing to the inscription content hash.
2. **Reveal transaction**: spends the commit output, revealing the full content in the witness.

### Envelope Structure
```
OP_FALSE
OP_IF
  <ord>                     # protocol identifier
  <content-type-tag>        # 1 = content type
  <body-tag>                # 2 = body
  <metadata-tag>            # 5 = metadata (optional)
  <pointer-tag>             # 6 = pointer (optional)
  <cenotaph-tag>            # 127 = cenotaph (curse)
OP_ENDIF
```

### Content Anchoring
- The inscription content is **committed** via hash in the taproot script tree.
- The **reveal** transaction presents the preimage and verifies it matches the commit hash.
- Once revealed, the inscription is permanently etched onto the sat and tracked by indexers.

### Recursive Inscriptions
- Use `/content/<inscription-id>` URLs in HTML or JS inscriptions to fetch other on-chain content.
- Enables composable on-chain apps (e.g., HTML page referencing on-chain CSS and images).
- Provenance chain: each recursive call can be traced to its parent inscription.

---

## BRC-20 Standard

### Overview
- Fungible token standard inspired by ERC-20, using Ordinal inscriptions as data carriers.
- Operations are JSON objects inscribed on satoshis.

### Operations
```json
// Deploy
{ "p": "brc-20", "op": "deploy", "tick": "ORDI", "max": "21000000", "lim": "1000" }

// Mint
{ "p": "brc-20", "op": "mint", "tick": "ORDI", "amt": "1000" }

// Transfer
{ "p": "brc-20", "op": "transfer", "tick": "ORDI", "amt": "100" }
```

### Indexing
- Off-chain indexers scan Bitcoin blocks for BRC-20 JSON inscriptions.
- Mint state: `deploy` → `mint` (per-address cap via `lim`) → `transfer` (requires inscription of transfer JSON).
- Balance tracking is **stateful** (indexer maintains address → balance map).

### Order Book
- **Unisat**: first major BRC-20 marketplace; inscription-based order matching.
- **OKX**: integrated BRC-20 trading in wallet.
- Sellers inscribe a transfer + listing; buyers match on-chain or off-chain.

### Comparison with ERC-20
| Aspect        | BRC-20                          | ERC-20                          |
|---------------|---------------------------------|----------------------------------|
| Execution     | Off-chain indexer               | EVM smart contract               |
| Transfer      | Inscription + send              | `transfer()` call                |
| Gas           | Bitcoin fees (volatile)         | Ethereum gas                     |
| Composability | None (no on-chain logic)        | Full (DeFi composability)        |
| State         | Indexer-maintained              | On-chain consensus               |

---

## Runes Protocol (Casey Rodarmor)

### Overview
- UTXO-based fungible token protocol on Bitcoin.
- No inscription bloat — token data lives in **OP_RETURN** messages.
- Designed to minimize UTXO set growth.

### Protocol Message
```
OP_RETURN
  OP_PUSH "RUNE"     # 4-byte protocol tag: 0x52554e45
  OP_PUSH <protocol_version>  # currently 0
  OP_PUSH <message_body>     # edicts, etching, minting
```

### Operations

**Etching** (create a new rune):
- Declares `rune_name`, `symbol`, `premine`, `cap`, `terms`.
- Name: uppercase A-Z, 1–26 chars. Shorter names are rarer (reserved via auction or alpha-suffix).

**Minting** (open mint):
- Anyone can mint new tokens within the etching's `terms` (start/end block, cap per mint).
- Mint output: rune balance assigned to the minting UTXO.

**Transferring**:
- Edicts in `OP_RETURN` specify rune ID → output index → amount.
- UTXOs carry rune balances; spending a UTXO destroys/reassigns its runes.

### Cenotaphs
- Malformed Runes messages create a **cenotaph**: the protocol burns the runes (unspendable).
- Protects against invalid edicts, unknown opcodes, or version mismatches.

---

## Comparison: BRC-20 vs Runes

| Feature            | BRC-20                        | Runes                         |
|--------------------|-------------------------------|-------------------------------|
| Data storage       | Inscription (witness)         | OP_RETURN                     |
| UTXO growth        | High (inscription per op)     | Low (UTXO-native)             |
| State tracking     | External indexer              | Protocol-native               |
| Transfer cost      | Two transactions (inscribe + send) | Single transaction (edict) |
| Simplicity         | JSON + ordinal tracking       | Binary protocol               |
| Creator            | Anonymous (domo)              | Casey Rodarmor (Ordinals dev) |

---

## Marketplaces & Wallets

| Name             | Type        | Supports                              |
|------------------|-------------|---------------------------------------|
| Magic Eden       | Marketplace | Ordinals, BRC-20, Runes               |
| Unisat           | Marketplace/Wallet | Ordinals, BRC-20 (inscription-first) |
| Ordinals Wallet  | Wallet      | Ordinals, Inscriptions                |
| Xverse           | Wallet      | Ordinals, BRC-20, Stacks (sBTC)       |

---

## Code

### Inscription Script (Witness Envelope)
```python
import struct

def build_envelope(content_type: bytes, body: bytes) -> bytes:
    envelope = b""
    envelope += b"\x00"          # OP_FALSE
    envelope += b"\x63"          # OP_IF
    envelope += _push(b"ord")
    envelope += _push(b"\x01")   # content-type tag
    envelope += _push(content_type)
    envelope += _push(b"\x02")   # body tag
    envelope += _push(body)
    envelope += b"\x68"          # OP_ENDIF
    return envelope

def _push(data: bytes) -> bytes:
    length = len(data)
    if length < 0x4c:
        return bytes([length]) + data
    elif length < 0x100:
        return b"\x4c" + bytes([length]) + data
    elif length < 0x10000:
        return b"\x4d" + struct.pack("<H", length) + data
    else:
        return b"\x4e" + struct.pack("<I", length) + data
```

### BRC-20 Deploy Transaction (Conceptual)
```python
import json

deploy = {
    "p": "brc-20",
    "op": "deploy",
    "tick": "MEME",
    "max": "1000000000",
    "lim": "10000"
}

# Step 1: Inscribe deploy JSON onto a satoshi
# (uses ordinal inscription envelope above)
inscribe_text(json.dumps(deploy), content_type=b"application/json")

# Step 2: Transfer the inscribed sat to distribute
```

### Runes Etching (OP_RETURN Message)
```python
import struct

def build_runes_etching(rune_name: str, symbol: str,
                        premine: int, cap: int) -> bytes:
    msg = b"RUNES"  # or b"\x52\x55\x4e\x45" (protocol tag)
    payload = b""

    # header: etching flag
    payload += struct.pack("<B", 0x01)  # etching

    # rune name as uppercase bytes, length-prefixed
    name_bytes = rune_name.upper().encode()
    payload += bytes([len(name_bytes)]) + name_bytes

    # symbol
    payload += symbol.encode()

    # premine (LEB128)
    payload += _leb128(premine)

    # cap (LEB128)
    payload += _leb128(cap)

    return msg + payload

def _leb128(value: int) -> bytes:
    result = []
    while True:
        byte = value & 0x7f
        value >>= 7
        if value:
            byte |= 0x80
        result.append(byte)
        if not value:
            break
    return bytes(result)
```
