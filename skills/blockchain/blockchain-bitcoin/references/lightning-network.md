# Lightning Network

## Protocol Overview

Lightning Network (LN) is a Layer 2 payment protocol on Bitcoin using **payment channels**:
- **Trustless**: channels secured by Bitcoin Script and time locks
- **Off-chain**: most payments never touch the blockchain
- **Multi-hop**: payments routed through intermediate nodes (onion routing)
- **Instant**: final settlement in milliseconds (not 10 minutes)
- **Low fee**: routing fees of 1–1000 sat per payment

## Payment Channels

### Channel Lifecycle

```
  Open → Update (HTLCs) → Close
```

### 1. Channel Open

```
Step 1: Funding Transaction (on-chain)

  Alice (0.5 BTC) ---+
                      +---> Funding Output (2-of-2 multisig)
  Bob    (0.5 BTC) ---+

  Funding Tx output: OP_2 <pubkey_alice> <pubkey_bob> OP_2 OP_CHECKMULTISIG
  Funding outpoint: {funding_txid, output_index}

Step 2: Commitment Transaction (off-chain)

  Alice holds a commitment tx that:
    - Spends the 2-of-2 multisig output
    - Pays Alice: 0.5 BTC (to Alice's delayed key)
    - Pays Bob:   0.5 BTC (to Bob's key directly)
    - CSV delay on Alice's output (to_self_delay, e.g., 144 blocks)

  Bob holds the mirror commitment tx:
    - Pays Alice: 0.5 BTC (to Alice's key directly)
    - Pays Bob:   0.5 BTC (to Bob's delayed key)
    - CSV delay on Bob's output

  Both commitments signed and exchanged before funding tx confirms.
  Revocation secrets exchanged for each commitment.
```

### 2. Channel Update (HTLCs)

```
HTLC = Hash Time-Locked Contract

Conditions:
  - Hashlock: claim by revealing preimage of hash H
  - Timelock: if preimage not revealed by deadline, funds refund to sender

HTLC Output (on commitment tx):
  OP_DUP OP_HASH160 <H> OP_EQUALVERIFY OP_CHECKSIG
  OR
  OP_SIZE 32 OP_EQUALVERIFY OP_HASH160 <RIPEMD160(SHA256(preimage))> OP_EQUALVERIFY OP_CHECKSIG

Example: Alice → Bob (routing to Dave via Carol)

  Alice         Bob          Carol         Dave
    |            |            |            |
    |--- HTLC --->            |            |    Alice locks: H = SHA256(preimage)
    |            |--- HTLC --->            |    amount = 100,000 sat
    |            |            |--- HTLC --->    timeout: Alice→Bob 144 blocks
    |            |            |            |             Bob→Carol 130 blocks
    |            |            |            |             Carol→Dave 120 blocks
    |            |            |<-- preimage ---
    |            |<-- preimage ---         |    Dave claims HTLC from Carol
    |<-- preimage ---         |            |    Carol claims from Bob
    |            |            |            |    Bob claims from Alice
```

### 3. Channel Close

#### Cooperative Close

```
Both parties sign a "closing transaction":
  - No HTLCs outstanding
  - No CSV delays on outputs
  - Fee negotiated between parties
  - Single on-chain tx, confirmed immediately
```

#### Force Close (Unilateral)

```
Initiator broadcasts their latest commitment tx:
  1. Commitment tx goes on-chain (spends 2-of-2 funding output)
  2. Local output: to_self_delay + CSV (e.g., 144 blocks)
     - Initiator must wait CSV blocks before spending
     - During wait, counter-party can claim for breach (revocation)
  3. Remote output: no delay, can spend immediately
  4. HTLCs resolved individually on-chain

After CSV delay:
  - Initiator can spend their delayed output
  - If revoked commitment was used: counter-party claims all funds (penalty)
```

#### Revocation

```
Each new commitment tx invalidates the previous one:
  - For each commitment, both parties share a revocation secret
  - If Alice publishes old commitment, Bob can:
    1. Wait CSV delay (144 blocks)
    2. Claim Alice's output using revocation secret
    3. Transaction output: OP_<revocation_pubkey> OP_CHECKSIG
    4. Bob takes ALL funds from the channel (penalty)
```

## HTLC Mechanics

```
HTLC in commitment tx:
  Output script:
    OP_DUP OP_HASH160 <RIPEMD160(H)> OP_EQUAL
    OP_IF
        OP_CHECKSIG   (preimage + remote sig → claim)
    OP_ELSE
        OP_DROP OP_CHECKSEQUENCEVERIFY OP_DROP OP_CHECKSIG
    OP_ENDIF          (after timeout + local sig → refund)

Timeout tree:
  - Alice→Bob HTLC: CSV 144 blocks
  - Bob→Carol HTLC: CSV 130 blocks
  - Carol→Dave HTLC: CSV 120 blocks

  Alice must claim from Bob within 14 blocks (144-130)
  Bob must claim from Carol within 10 blocks (130-120)
  Carol must claim from Dave within 120 blocks
```

## Onion Routing

### SPHINX Packet Structure

```
Payment packet: ~1366 bytes fixed size

Layer 0:    [header_v0][hop_data_v0][hmac_v0]     → peeled by final node
Layer 1:    [header_v1][hop_data_v1][hmac_v1]     → peeled by node n-1
...
Layer n-1:  [header_n-1][hop_data_n-1][hmac_n-1]  → peeled by first node

Each hop:
  header = ephemeral pubkey (33 bytes) + routing info
  hop_data = {short_channel_id, amt_to_forward, outgoing_cltv_value, padding}
  hmac = 32-byte authentication tag
```

### Trampoline Routing

```
Intermediate "trampoline" nodes:
  - Sender encrypts route only to trampoline nodes
  - Trampoline nodes handle pathfinding for their segment
  - Reduces routing information leakage
  - Supports mobile wallets with limited graph knowledge
```

## Gossip Protocol

### Messages

```
Type    Name                Description
----    ------------------  -------------------------------------
256     node_announcement   Node metadata (alias, color, addresses, features)
257     channel_announcement Channel existence (both pubkeys, chain hash)
258     channel_update      Routing policy (fee rate, htlc_min, cltv_expiry_delta)

propagation:
  1. When channel funding tx reaches depth (default: 6 confirmations)
  2. Both nodes broadcast channel_announcement
  3. Nodes periodically broadcast channel_update
  4. Every node maintains a local routing graph (network map)
```

### Routing Graph

```
Graph structure:
  Nodes: ≈ 20,000 (2025)
  Channels: ≈ 80,000
  Total capacity: ≈ 5,000 BTC

Channel update fields:
  - cltv_expiry_delta: blocks (default 144)
  - htlc_minimum_msat: 1 sat
  - htlc_maximum_msat: channel capacity
  - fee_base_msat: per-HTLC fee (default 1 sat, 1000 msat)
  - fee_proportional_millionths: per-ppm fee (default 1 ppm)
  - message_flags: timestamps
  - channel_flags: direction (node1→node2 vs node2→node1)
```

## Pathfinding

### Dijkstra-Based

```python
def find_path(graph, source, target, amount):
    """Weighted shortest path based on total fees"""
    dist = {source: 0}
    prev = {}
    pq = [(0, source)]

    while pq:
        d, node = heappop(pq)
        if node == target:
            break
        for channel, edge in graph[node].items():
            # Check channel has sufficient liquidity
            if edge.capacity < amount:
                continue
            # Check inbound liquidity
            if edge.inbound_liquidity < amount:
                continue
            # Fee: base + proportional
            fee = edge.fee_base + (amount * edge.fee_ppm) // 1_000_000
            nd = d + fee
            if nd < dist.get(channel.other_node, float('inf')):
                dist[channel.other_node] = nd
                prev[channel.other_node] = (node, channel)
                heappush(pq, (nd, channel.other_node))

    return reconstruct_path(prev, target)
```

### Liquidity Hints

- Channels have no public liquidity information (only total capacity known)
- Pathfinding uses **max-flow** estimation
- Larger payments split into **multi-path payments** (MPP)
- Probabilistic: 70-90% success rate on first attempt

## Watchtowers

```
Watchtower model:
  - Alice deploys a watchtower with her revocation secrets
  - Tower monitors blockchain for revoked commitment txs
  - If Bob publishes old state, tower broadcasts justice tx
  - Justice tx: spends Alice's output using revocation key
  - Tower receives a penalty reward (e.g., 10% of channel funds)

Just-in-time (JIT) channels: tower only needs to watch when
  Alice's outputs are at risk (CSV timer running)
```

## Lightning Service Providers (LSPs)

```
Key services:
  - Inbound liquidity: LSP opens channel TO you (you receive capacity)
  - Just-in-time channels: LSP opens channel when you need to receive
  - On-chain→off-chain swaps: submarine swaps (Boltz, etc.)

Inbound liquidity models:
  1. LSP opens channel: you pay fee (~1-5% of inbound capacity)
  2. Zero-conf channels: LSP trusts you, channel usable immediately
  3. Sidecar channels: LSP leases existing channel capacity

Fee comparison vs on-chain (2025):
  - On-chain P2WPKH: ~5-20 sat/vB = ~$0.50-5.00 per tx
  - Lightning: ~1-1000 sat per payment (fraction of a cent)
```

## Dual-Funding (BIP-78)

```
Both parties contribute to channel funding:
  - Alice: 0.3 BTC, Bob: 0.7 BTC
  - Both sign funding tx
  - No need for separate "funding" and "refund" txs
  - Supported in LDK v0.0.120+, Eclair, Core Lightning

Splicing:
  - Add or remove funds from a channel without closing it
  - New funding tx includes old channel output + new inputs
  - Channel continues with updated capacity
  - Requires splice_lock: both parties agree on new state
```
