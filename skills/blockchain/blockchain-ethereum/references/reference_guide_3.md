# Ethereum State Model, Merkle Patricia Tries and Proofs

How Ethereum stores world state, how state roots commit to it, how to produce and verify Merkle proofs (`eth_getProof`), and where state storage is heading (state expiry discussions, binary/Verkle tries, history expiry).

## World State

The execution layer maintains a mapping `address -> account`, where an account is:

| Field | Meaning |
|---|---|
| `nonce` | Transactions sent (EOA) or contracts created (contract) |
| `balance` | Wei |
| `storageRoot` | Root of this account's storage trie |
| `codeHash` | `keccak256(code)`; empty code hash for EOAs without delegation |

Since EIP-7702 (Pectra), an EOA may have code equal to a delegation designator (`0xef0100 || address`).

Each block header commits to:
- `stateRoot` (world state after executing the block)
- `transactionsRoot` and `receiptsRoot` (tries keyed by RLP-encoded index)
- `withdrawalsRoot` (Shanghai) and `requestsHash` (Prague, EIP-7685)
- `logsBloom` (2048-bit bloom of log addresses and topics)

## Merkle Patricia Trie (MPT)

A hexary radix trie with Merkle hashing:
- Keys: `keccak256(address)` in the state trie; `keccak256(slot)` in storage tries ("secure trie" hashing prevents adversarial depth).
- Node types: **branch** (16 children + value), **extension** (shared nibble path + child), **leaf** (remaining path + value).
- Paths are hex-prefix encoded; nodes are RLP-encoded and referenced by `keccak256` when the encoding is 32 bytes or more (inlined otherwise).
- Values: account RLP `[nonce, balance, storageRoot, codeHash]`; storage values are RLP of the 32-byte word with leading zeros stripped.

```
stateRoot
  └─ branch
      ├─ [a] extension "3f" ─ branch ─ ... ─ leaf(account RLP)
      └─ [7] leaf(path, account RLP)
                         storageRoot ─ branch ─ leaf(slot value)
```

## Storage Slot Layout (Solidity)
| Variable | Slot |
|---|---|
| Value types | Sequential from slot 0, packed if they fit in 32 bytes |
| `mapping(K => V) m` at slot `p` | `keccak256(abi.encode(key, p))` |
| Dynamic array at slot `p` | Length at `p`; elements from `keccak256(p)` |
| `bytes`/`string` | Short (< 32 bytes) inline with length*2; long: length*2+1 at `p`, data at `keccak256(p)` |
| ERC-7201 namespaced storage | `keccak256(abi.encode(uint256(keccak256(id)) - 1)) & ~bytes32(uint256(0xff))` |

```bash
# Slot of balances[holder] where balances is at slot 0
cast index address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 0
cast storage <token> <slot> --rpc-url $RPC_URL
```

## Proofs with eth_getProof (EIP-1186)

```bash
cast proof 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  0x0000000000000000000000000000000000000000000000000000000000000009 \
  --block finalized --rpc-url $RPC_URL
```
Response:
```json
{
  "address": "0xa0b8...",
  "accountProof": ["0xf90211...", "0xf90211...", "0xf8689f..."],
  "balance": "0x0", "codeHash": "0x...", "nonce": "0x1", "storageHash": "0x...",
  "storageProof": [{ "key": "0x...09", "value": "0x...", "proof": ["0xf90211...", "0xe2a0..."] }]
}
```

### Verification steps
1. Obtain a trusted `stateRoot` (from a finalized header verified by a light client or a trusted source).
2. Walk `accountProof` from the root using nibbles of `keccak256(address)`; each node's hash must equal the reference in its parent.
3. Decode the leaf to `[nonce, balance, storageRoot, codeHash]` and compare with the response.
4. Walk `storageProof[i].proof` from `storageRoot` using `keccak256(slot)`; decode the value.
5. Non-inclusion proofs end at a node where the path diverges or a branch slot is empty.

```ts
// Using @ethereumjs/trie (v6+ API) to verify an account proof
import { Trie } from "@ethereumjs/trie";
import { hexToBytes, keccak256 } from "@ethereumjs/util";

const trie = await Trie.create({ useKeyHashing: false });
const key = keccak256(hexToBytes(address));
const value = await trie.verifyProof(hexToBytes(stateRoot), key, proof.accountProof.map(hexToBytes));
if (value === null) throw new Error(`Account ${address} absent in state ${stateRoot}`);
```
Check the exact function names against the installed library version.

### Uses
- Light clients and wallets verifying balances without trusting the RPC (e.g. Helios).
- Cross-chain bridges and L2s proving L1 state (storage proofs).
- Rollup withdrawal proofs on L1 (proving L2 output roots then L2 storage).
- Historical state queries via block hash oracles (EIP-2935 serves recent block hashes from state since Pectra).

## State Size and Client Storage
- Clients do not store the trie naively: geth uses a path-based scheme (PBSS) with a flat snapshot layer; reth and Erigon store flat state tables in MDBX and compute roots incrementally.
- Full nodes keep recent state only; archive nodes keep all historical state (Erigon/reth archives are far smaller than legacy hash-based geth archives).
- Snap sync downloads flat state ranges with proofs, then heals the trie.

## History and State Growth Work
| Item | Status as of late 2026 (verify current status) |
|---|---|
| EIP-4444 history expiry | Clients prune pre-Merge block bodies/receipts (partial history expiry rolled out 2025); full rolling expiry still in progress; history served via Portal Network/era files |
| Verkle tries (EIP-6800) | Research; the community has also explored a binary trie with a different hash (EIP-7864) for better ZK proving |
| Stateless clients | Depend on witness-friendly tries; not deployed on mainnet |
| State expiry | Research only |

## Pitfalls
- Trusting a proof against a `stateRoot` you got from the same untrusted RPC.
- Mixing up `keccak256(address)` (trie key) with the address itself.
- Forgetting that storage proofs use RLP-encoded values without leading zeros.
- Assuming slot layout for upgradeable contracts; read the storage layout from the compiler (`forge inspect <Contract> storageLayout`).

## Checklist
- [ ] Trusted header source defined (light client, multiple RPCs, or own node)
- [ ] Proof verification uses hashed keys and RLP decoding correctly
- [ ] Storage slots derived from compiler layout, not guessed
- [ ] Archive vs. full node chosen for historical queries
