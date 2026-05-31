# Cross-Chain Message Replay Protection

> Replay attacks are the single most common class of cross-chain
> vulnerability after key compromise. This document specifies the
> design, implementation, verification, and operation of replay
> protection for arbitrary cross-chain messaging systems including
> bridges, GMP layers, and inter-chain RPCs.

---

## 1. Threat Model

A replay attack is the re-execution of a previously valid cross-chain
message on the destination chain so as to cause the destination to
take an action a second (or third, ...) time without the source chain
having sent a new authorizing message.

### 1.1 Replay Surfaces

| Surface | Description | Real-world Example |
|---------|-------------|--------------------|
| Single-chain replay | Same message accepted twice on the destination | Nomad — `_messages[messageHash] != PROVEN` not enforced after init bug |
| Cross-domain replay | Message bound to (src,dst) replayed on a different (src',dst) | Multichain pre-2022 fork |
| Cross-fork replay | After hard fork, message replays on both forks | ETH/ETC post-merge migration risk |
| Cross-version replay | Pre-upgrade message replayed against post-upgrade verifier | Improper migration of `nonce` ranges |
| Signature replay | Off-chain signature reused across chains | ERC-2612 permits before chainId binding |
| Storage-proof replay | State proof for slot X replayed for slot Y | Misuse of `eth_getProof` without slot binding |
| Light-client replay | Old header re-submitted after a fork choice change | Tendermint trusting-period misconfig |
| Refund / retry replay | Refund flow re-executes original message | Bridges with broken idempotency on retry |

### 1.2 Attacker Capabilities

Assume the attacker can:

- Observe and copy every public chain message.
- Submit any well-formed transaction with sufficient gas.
- Cause minor reorgs at the head of any chain.
- Run a relayer / oracle / sequencer in the bridge's permissionless tier.
- NOT forge signatures of the validator set, MPC committee, or zk
  prover (those are key-compromise C1 — out of scope here).

The attacker's objective is to cause the destination chain to act on
the same authorization twice or more, multiplying their take.

---

## 2. Canonical Message Identity

The first and most important rule: **every message MUST have a
globally unique identity that binds it to a single execution.**

### 2.1 Message ID Construction

```solidity
function _messageId(
    uint64  srcChainId,
    uint64  dstChainId,
    address srcSender,
    address dstReceiver,
    uint256 nonce,
    bytes32 payloadHash
) internal pure returns (bytes32) {
    return keccak256(abi.encode(
        srcChainId,
        dstChainId,
        srcSender,
        dstReceiver,
        nonce,
        payloadHash
    ));
}
```

All six fields are mandatory. Removing any one of them admits a
distinct replay class:

| Omitted Field | Replay Made Possible |
|---------------|----------------------|
| srcChainId | Cross-source replay (forks, sibling chains) |
| dstChainId | Cross-destination replay |
| srcSender | Spoofed source contract attacks |
| dstReceiver | Cross-receiver replay (one msg drains many) |
| nonce | Same-content message duplicates |
| payloadHash | Mutation of payload while reusing nonce |

### 2.2 Nonce Domains

Choose **one** nonce domain and enforce it everywhere:

- **Per-(src,dst) pair**: simplest, most common. `nonce[src][dst]`.
- **Per-(srcSender,dstReceiver) pair**: highest isolation, costs more
  storage; useful for permissionless senders.
- **Global monotonic per bridge**: brittle; not recommended.
- **Application-defined**: dangerous; only use if app guarantees uniqueness.

Document the nonce domain in the spec. Auditors MUST verify the
implementation matches the spec.

### 2.3 ChainId Source of Truth

`block.chainid` on the source. Do NOT use a stored config field for
the source chain ID — a stored field can desync after a fork. Use
`block.chainid` in `_messageId` so that post-fork messages have
different IDs.

For the destination chain ID: encoded into the message at send time
(comes from the application, validated by the bridge). On reception,
the destination MUST check `block.chainid == msg.dstChainId` and
revert otherwise.

---

## 3. Replay Protection Patterns

### 3.1 Executed-Set Pattern (most common)

Maintain a set of executed message IDs and reject any duplicate.

```solidity
mapping(bytes32 messageId => bool) public executed;

function execute(Message calldata m, Proof calldata p) external {
    bytes32 id = _messageId(m);
    require(!executed[id], "replay");
    executed[id] = true;       // CEI: effects before interactions
    require(_verify(m, p), "invalid");
    _dispatch(m);
}
```

**Strengths**: simple, exact, gas-cheap reads.
**Weaknesses**: unbounded storage growth; cannot prove non-execution
to a third party without revealing the entire set.

**Gas optimization**: pack `executed[id]` into 1 bit per ID via
`mapping(uint256 => uint256)` bitmap where the key is `id / 256` and
the bit position is `id % 256`. Saves ~17,000 gas per first write on
Ethereum.

```solidity
mapping(uint256 word => uint256 bits) private _executedBitmap;

function _isExecuted(uint256 id) internal view returns (bool) {
    uint256 word = id >> 8;
    uint256 bit  = id & 0xff;
    return (_executedBitmap[word] >> bit) & 1 == 1;
}

function _setExecuted(uint256 id) internal {
    uint256 word = id >> 8;
    uint256 bit  = id & 0xff;
    _executedBitmap[word] |= (1 << bit);
}
```

For 32-byte hashes, the bitmap is only practical if you can compress
to a sequential nonce. Most bridges use `mapping(bytes32 => bool)`.

### 3.2 Strict Monotonic Nonce Pattern (LayerZero v1 style)

Require nonces to be delivered strictly in order.

```solidity
mapping(uint64 src => mapping(uint64 dst => uint64 nextNonce))
    public nextNonceIn;

function execute(Message calldata m, Proof calldata p) external {
    require(m.nonce == nextNonceIn[m.srcChainId][m.dstChainId],
            "out of order");
    require(_verify(m, p), "invalid");
    nextNonceIn[m.srcChainId][m.dstChainId] = m.nonce + 1;
    _dispatch(m);
}
```

**Strengths**: O(1) storage; replay impossible because each nonce can
only ever pass exactly once.
**Weaknesses**:
- Head-of-line blocking: a failed message stalls all subsequent ones.
- Requires reliable ordered relay.
- No partial recovery; need an explicit "skip" operation gated by gov.

LayerZero v2 introduced the "lazy nonce" / "executable nonce" model
to mitigate this: messages can be delivered out of order but `nonce <
maxDelivered + window` is rejected to bound state growth.

### 3.3 Hybrid Pattern: Window + Set (recommended)

Combine a fast-moving window of acceptable nonces with a small
executed set inside the window.

```solidity
struct Window {
    uint64 base;                    // smallest acceptable nonce
    uint256 bitmap;                 // 256-nonce bitmap from `base`
}
mapping(uint64 src => mapping(uint64 dst => Window)) private _w;

uint64 constant WINDOW_SIZE = 256;

function execute(uint64 src, uint64 dst, uint64 nonce, /*...*/) external {
    Window storage w = _w[src][dst];
    require(nonce >= w.base, "below window");
    require(nonce <  w.base + WINDOW_SIZE, "above window");
    uint256 bit = 1 << (nonce - w.base);
    require(w.bitmap & bit == 0, "replay");
    w.bitmap |= bit;

    // Advance window if low bits saturated
    while (w.bitmap & 1 == 1) {
        w.bitmap >>= 1;
        w.base   += 1;
    }
    // ...verify + dispatch...
}
```

**Strengths**: O(1) storage per (src,dst), tolerates limited
out-of-order delivery, replay impossible.
**Weaknesses**: requires sender to keep nonce within window of receiver
state (typically negotiated via the relayer / config).

### 3.4 Merkle-Root Inclusion (IBC, optimistic rollups)

The source posts a Merkle commitment to its message set; the
destination accepts an inclusion proof against a known root.

```solidity
struct Packet {
    uint64 srcChain;
    uint64 dstChain;
    uint64 sequence;
    bytes  data;
}

mapping(bytes32 root => bool) public knownRoots;
mapping(bytes32 packetCommitment => bool) public received;

function receivePacket(Packet calldata p, bytes32 root, bytes32[] calldata proof) external {
    require(knownRoots[root], "unknown root");
    bytes32 leaf = keccak256(abi.encode(p));
    require(MerkleProof.verify(proof, root, leaf), "bad proof");
    require(!received[leaf], "replay");
    received[leaf] = true;
    _handle(p);
}
```

Used in IBC packet processing (with ICS-23 proofs). Roots are posted
via separate `UpdateClient` messages and validated against the light
client trusting period.

### 3.5 zk-Proof Replay Protection

When a zk proof attests `f(public_inputs) = true`, the public inputs
MUST include the canonical message ID. Otherwise a proof for one
message replays as a proof for a different message.

```solidity
function executeWithProof(Message calldata m, bytes calldata proof) external {
    bytes32 id = _messageId(m);
    uint256[1] memory pub = [uint256(id)];
    require(verifier.verifyProof(proof, pub), "bad proof");
    require(!executed[id], "replay");
    executed[id] = true;
    _dispatch(m);
}
```

Common bug: including only `payloadHash` in public inputs but omitting
chain IDs. The proof then replays across chains.

---

## 4. Source-Side Discipline

Replay protection is destination-side, but the source MUST cooperate.

### 4.1 Source Emits Canonical Events

```solidity
event MessageSent(
    bytes32 indexed messageId,
    uint64  indexed dstChainId,
    address indexed dstReceiver,
    uint64  nonce,
    bytes32 payloadHash,
    bytes   payload
);

function send(uint64 dst, address recv, bytes calldata payload) external returns (bytes32) {
    uint64 nonce = nonceOut[dst]++;
    bytes32 payloadHash = keccak256(payload);
    bytes32 id = _messageId(uint64(block.chainid), dst, msg.sender, recv, nonce, payloadHash);
    emit MessageSent(id, dst, recv, nonce, payloadHash, payload);
    return id;
}
```

Notes:
- `nonceOut` is per-destination, so two destinations can have nonce 7
  without conflict.
- The full `payload` is emitted to allow relayers to reconstruct without
  archive storage.
- `payloadHash` is indexed-friendly for off-chain filters.

### 4.2 Refund / Retry Flows

The single most common replay bug in production bridges is the refund
path. A refund must:

1. Mark the original message as `REFUNDED` in the source-side state.
2. Issue a *new* message ID for the refund.
3. Be impossible to combine with a subsequent delivery on the
   destination.

```solidity
enum MsgState { NONE, SENT, REFUNDED }
mapping(bytes32 => MsgState) public stateOf;

function send(...) external returns (bytes32 id) {
    // ...
    stateOf[id] = MsgState.SENT;
}

function refund(bytes32 id, RefundProof calldata p) external {
    require(stateOf[id] == MsgState.SENT, "bad state");
    require(_proveFailure(id, p), "not failed");
    stateOf[id] = MsgState.REFUNDED;
    _returnFunds(id);
}
```

The destination MUST refuse to execute a message if the source proves
the refund occurred. This requires a back-channel: the source emits
`Refunded(id)` and the destination accepts a proof of that event
before the execution path.

---

## 5. Cross-Fork Replay (the hardest case)

When a chain hard-forks (e.g., contentious split, post-merge), the
bridge's source becomes two chains with identical state and identical
unspent message IDs. Without binding, the same message can replay on
both forks' destinations.

### 5.1 Binding Strategy

1. The canonical message ID MUST include `block.chainid` of the source.
   After a fork, the two forks have different chain IDs (EIP-155); IDs
   diverge naturally.
2. The destination MUST refuse messages whose `srcChainId` differs from
   the expected (configured) value. Reject unknown chain IDs.
3. Light clients MUST be reinstantiated post-fork; the trusting period
   for the pre-fork header may need to be invalidated by governance.

### 5.2 Migration Procedure

When a planned hard fork is announced:

```
T-30d: Bridge governance acknowledges fork.
T-14d: Both forks added as candidate sources, off by default.
T-7d:  Choose canonical fork (gov vote).
T-1d:  Pause bridge in advance of fork block.
T+0:   Fork happens.
T+1h:  Resume bridge with new chain ID; light client re-instantiated.
T+24h: Reconcile pending messages: deliver from canonical chain only.
T+7d:  Permanently reject messages from non-canonical chain.
```

### 5.3 Sibling-Chain Replay

A subtler case: the attacker submits a valid source-chain message to a
sibling chain (with the same address space, e.g., Optimism vs Arbitrum
using the same EOA-deployed contract). Defense: bind the source-chain
ID into the message and into the relayer's signing context.

---

## 6. Off-Chain Replay (Signatures and Permits)

When users sign typed data (EIP-712) for use in a bridge:

```solidity
bytes32 constant DOMAIN_TYPEHASH = keccak256(
    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)"
);

function _domainSeparator() internal view returns (bytes32) {
    return keccak256(abi.encode(
        DOMAIN_TYPEHASH,
        keccak256(bytes("MyBridge")),
        keccak256(bytes("1")),
        block.chainid,
        address(this),
        keccak256("MyBridge-v1-salt")    // optional but recommended
    ));
}
```

`chainId` and `verifyingContract` in the domain separator pin the
signature to a single chain + contract. Cross-chain replay of a
permit becomes impossible.

### 6.1 Nonce in Typed Data

```solidity
struct Auth {
    address user;
    uint64  dstChain;
    address dstReceiver;
    uint256 amount;
    uint256 nonce;
    uint256 deadline;
}
```

`nonce` is a per-user monotonic counter incremented atomically with
acceptance. `deadline` (Unix seconds) bounds the validity window.

### 6.2 Multi-Chain Domain Separator (CAIP-2 aware)

For signatures intended to be valid on multiple chains (rare; consider
hard before doing this), include a `chains` array in the typed data
and require the chain executing to be in the set.

---

## 7. Verification Strategy

### 7.1 Static Analysis

- Slither detector for missing reentrancy / replay guards.
- Custom Slither/Semgrep rule: any function annotated with
  `@bridge-receive` MUST contain a `require(!executed[id])` before any
  state change.

### 7.2 Property-Based Testing

```solidity
// Foundry invariant test
contract ReplayInvariant is Test {
    Bridge bridge;
    address[] users;

    // INV1: no message is executed twice
    function invariant_noDoubleExecution() public {
        for (uint i = 0; i < deliveredIds.length; i++) {
            bytes32 id = deliveredIds[i];
            (bool ok,) = address(bridge).call(
                abi.encodeWithSignature("execute(bytes,bytes)",
                                        messages[id], proofs[id]));
            assertFalse(ok, "replay accepted");
        }
    }

    // INV2: nonces strictly increase per (src,dst)
    function invariant_nonceMonotonic() public {
        for (uint64 s = 0; s < MAX_CHAIN; s++) {
            for (uint64 d = 0; d < MAX_CHAIN; d++) {
                assertGe(bridge.lastDeliveredNonce(s,d), prev[s][d]);
                prev[s][d] = bridge.lastDeliveredNonce(s,d);
            }
        }
    }
}
```

### 7.3 Fuzzing

- Echidna / Medusa harness that:
  - Constructs random messages with random nonces.
  - Submits the same message twice.
  - Submits with permuted (src,dst,sender,receiver) fields.
  - Asserts each invariant after every transition.

### 7.4 Formal Verification

For high-value bridges, model the replay protection in Coq, K, or
Certora and prove:

```
∀ msg m, p1 p2.
    verify(m, p1) ∧ verify(m, p2) ∧ execute(m, p1) → ¬ execute(m, p2)
```

The Certora rule:

```
rule noReplay(env e1, env e2, Message m, Proof p1, Proof p2) {
    require e1.block.timestamp <= e2.block.timestamp;
    execute(e1, m, p1);
    execute@withrevert(e2, m, p2);
    assert lastReverted, "replay was accepted";
}
```

---

## 8. Operational Monitoring

Replay protection is a destination-side property. Monitor for:

| Signal | Meaning | Action |
|--------|---------|--------|
| `executed[id]` becomes true twice (impossible by spec) | Storage bug | SEV-1 |
| Same `MessageDelivered(id)` event emitted twice | Re-org or replay | SEV-1 |
| Nonce gap larger than configured tolerance | Lost messages or attack | SEV-2 |
| Window base advances slower than expected | Stuck nonce | SEV-3 |
| `verify()` returns true for unknown src chain ID | Misconfig | SEV-1 |
| Refund executed for `id` that was also delivered | Refund-race | SEV-1 |

Implementation:

```python
# Off-chain monitor
delivered = set()
async def on_event(evt):
    if evt.name == "MessageDelivered":
        if evt.id in delivered:
            page_sev1("replay detected", evt)
        delivered.add(evt.id)
    elif evt.name == "MessageRefunded":
        if evt.id in delivered:
            page_sev1("refund-after-deliver", evt)
```

---

## 9. Performance and Storage Considerations

### 9.1 Storage Growth

| Pattern | Storage per Msg | Total at 1B msgs |
|---------|-----------------|------------------|
| `mapping(bytes32 => bool)` | 32 bytes + slot overhead (~20k gas first write) | unbounded |
| Bitmap of seq nonces | 1 bit | ~125 MB |
| Sliding window | constant per (src,dst) pair | constant |
| Merkle commitment | constant per root | constant + proofs |

For 1B+ message lifetimes, the executed-set pattern becomes
state-bloat hostile. Consider sliding window or commitment patterns
at design time.

### 9.2 Cold vs Warm Slots (EVM)

The first write to a storage slot costs 22,100 gas (post-Berlin); a
warm write costs 5,000. Replay protection touches a cold slot per
message — design accepts this as the cost of doing business. The
bitmap pattern amortizes 256 messages into one warm slot after first
touch.

### 9.3 Cross-Chain Cost Asymmetry

Replay protection state lives on the destination. Cheaper destinations
(L2s, Solana, Cosmos) tolerate richer storage. Expensive destinations
(L1 Ethereum) demand the bitmap or commitment pattern.

---

## 10. Real-World Failure Catalog

### 10.1 Nomad (Aug 2022, ~USD 190M)

**Cause**: a routine upgrade initialized `committedRoot = 0x0`. The
`prove()` function checked `_messages[msg] != PROVEN`, but the default
storage value for any unproven message was already `0` and `0x0` was a
valid "root accepted" sentinel. Effect: every message proved valid
without verification.

**Replay aspect**: the executed-set check was bypassed by the same
bug. Attackers copy-pasted the same exploit calldata, swapping the
recipient field, and drained the bridge over hundreds of transactions.

**Lesson**: an executed-set check is necessary but not sufficient if
verification itself can be bypassed.

### 10.2 Wormhole (Feb 2022, ~USD 326M)

**Cause**: a deprecated function `Solana_verify_signature_account()`
used to compute the message hash for verification was retained for
backwards compatibility but did not check the signer set version,
allowing forged guardian signatures.

**Replay aspect**: not strictly replay; closer to forgery. But the
same forged message would have replayed indefinitely if not for the
executed-set check at the destination, which limited it to one drain
per forged ID.

**Lesson**: replay protection saved further damage even when the
verification check failed.

### 10.3 Multichain (Jul 2023, ~USD 130M)

**Cause**: admin key compromise; not strictly a replay attack.

**Replay aspect**: pre-2022, Multichain had documented cross-chain
nonce reuse issues that allowed message replay across destination
chains. Some funds were drained via this path prior to the admin-key
event.

**Lesson**: nonce domain MUST include both source and destination
chain IDs.

### 10.4 Optics / Connext (2022, near-miss)

**Cause**: a refund flow allowed the same message ID to be retried
multiple times under a misconfigured timeout. Patched before exploit.

**Lesson**: refund / retry flows are the most under-tested branch.
Fuzz them.

---

## 11. Spec Template

Every cross-chain message system MUST have a published spec containing:

```
## Message Schema
- canonical fields and types
- canonical encoding (ABI, SCALE, Borsh, ...)
- canonical hashing (algorithm, domain separator)

## Identity
- formula for messageId
- nonce domain
- chainId source of truth (block.chainid)

## Verification
- proof system (signatures, light client, zk)
- public-input binding (must include messageId)

## Replay Protection
- pattern (executed set / sliding window / commitment / monotonic)
- storage location
- failure mode if replay attempted (revert with code REPLAY)

## Refund
- conditions
- atomic state transition diagram
- proof requirement

## Migration
- procedure for upgrade
- procedure for hard fork
- procedure for chainId change
```

---

## 12. Auditor Checklist

```
[ ] messageId binds (srcChainId, dstChainId, sender, receiver, nonce, payloadHash)
[ ] block.chainid is the source-side chain ID source of truth
[ ] dstChainId is checked against block.chainid at receive
[ ] executed-set or equivalent enforced before any state-changing call
[ ] CEI ordering: executed[id] = true BEFORE _dispatch(m)
[ ] Nonce domain documented and enforced
[ ] Sliding window (if used) cannot underflow / overflow
[ ] Bitmap (if used) cannot collide via integer overflow
[ ] zk public inputs include messageId
[ ] EIP-712 domain separator includes chainId and verifyingContract
[ ] Refund path makes replay impossible (atomic state transition)
[ ] Retry path does not double-execute
[ ] Hard-fork procedure documented and rehearsed
[ ] Light-client trusting period configured for fork tolerance
[ ] Monitoring alerts on duplicate MessageDelivered events
[ ] Property-based tests prove no-double-execution
[ ] Formal verification (or sufficient fuzz coverage) for high-value bridges
[ ] Source-side emit includes all fields needed to reconstruct id
[ ] Off-chain relayers cannot mutate payload without invalidating id
[ ] Permissionless retry does not require trusted relayer
[ ] Storage growth bound considered for 10-year horizon
```

---

## 13. Cross-Reference

- See `bridge-security.md` for non-replay security topics (light-client,
  guardian set, MPC).
- See `bridge-incident-response.md` for what to do when replay protection
  fails.
- See `ibc-deep.md` for the IBC packet commitment pattern in production.
- See `layerzero-wormhole.md` for the nonce models used by major GMP
  layers.
- See `ccip-chainlink.md` for the DON-based verification model.
