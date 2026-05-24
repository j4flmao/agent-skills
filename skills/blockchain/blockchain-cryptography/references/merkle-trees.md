# Merkle Trees in Blockchain

## Comparison

| Tree Type | Branching | Proof Size | Update Cost | Use Case |
|-----------|-----------|------------|-------------|----------|
| Binary Merkle | 2 | O(log n) hashes | O(log n) | Bitcoin txn inclusion |
| Merkle Patricia Trie | 16 (hex) | O(log₁₆ n) nodes | O(k) key length | Ethereum state trie |
| Sparse Merkle Tree | 2 | O(log n) hashes | O(log n) | Cosmos IAVL, Near, Celestia |
| Verkle Trie | 256 (polynomial) | O(log_256 n) field elems | O(log n) | Ethereum stateless |

## Binary Merkle Tree

Simplest form: each leaf is H(data), each internal node is H(left || right).

```
        root = H(H00 || H01)
       /                    \
    H00 = H(H0 || H1)     H01 = H(H2 || H3)
    /        \            /        \
  H0        H1          H2        H3
  |          |          |          |
data[0]   data[1]    data[2]    data[3]
```

### Proof verification

```python
def verify_merkle_proof(root: bytes, leaf: bytes, proof: list[tuple[bytes, bool]]) -> bool:
    """proof is list of (sibling_hash, is_left_sibling)"""
    current = leaf
    for sibling, is_left in proof:
        if is_left:
            current = sha256(sibling + current)  # sibling is left
        else:
            current = sha256(current + sibling)  # sibling is right
    return current == root
```

### Sorted Merkle Tree (Bitcoin BIP-37)
Sort leaf hashes lexicographically before tree construction. Enables non-interactive membership proofs (tx inclusion in block).

## Merkle Patricia Trie (MPT)

Ethereum's state trie: key-value store where keys are hex-encoded (nibbles). Three node types:

| Node Type | Content | RLP Encoding |
|-----------|---------|-------------|
| Leaf | [nibble_path, value] | [path, val] (path is remaining) |
| Extension | [nibble_path, next_node_ref] | [path, child_hash] (shared prefix) |
| Branch | [0:15 children hashes, value] | 17-element list (16 children + terminal) |

### MPT insert pseudocode

```
function insert(node, key_nibbles, value):
    if node is NULL:
        return LeafNode(key_nibbles, value)

    if node is LeafNode:
        if node.path == key_nibbles:
            node.value = value
            return node
        # Split into branch
        prefix_len = common_prefix(node.path, key_nibbles)
        if prefix_len > 0:
            return ExtensionNode(node.path[:prefix_len],
                                insert(BranchNode(), node.path[prefix_len:], node.value))
        # No common prefix — create branch
        branch = BranchNode()
        branch[node.path[0]] = LeafNode(node.path[1:], node.value)
        branch[key_nibbles[0]] = LeafNode(key_nibbles[1:], value)
        return branch

    if node is ExtensionNode:
        child = insert(node.child, key_nibbles, value)
        return ExtensionNode(node.path, child)

    if node is BranchNode:
        if len(key_nibbles) == 0:
            node.value = value
        else:
            node[key_nibbles[0]] = insert(node[key_nibbles[0]], key_nibbles[1:], value)
        return node
```

### Security: MPT key collision
Ethereum uses keccak256(address) as trie key. Since keccak is collision-resistant, address collisions are infeasible.

## Sparse Merkle Tree (SMT)

Used in: Cosmos IAVL (versioned SMT), Near (state witness), Celestia (namespace SMT), Fuel (key-value SMT).

- Full binary tree of depth d (typically 256 or 255)
- All leaves initialized to default hash (H(0))
- Non-default leaves replace default at their position
- Proof contains siblings along path; default siblings can be omitted if known

```rust
struct SparseMerkleTree<const N: usize> {
    root: [u8; 32],
    data: HashMap<[u8; N], [u8; 32]>,  // key → value hash
}

impl<const N: usize> SparseMerkleTree<N> {
    fn update(&mut self, key: &[u8; N], value: &[u8]) {
        let path = blake2b_256(key);  // map key to leaf position
        let leaf = blake2b_256(value);
        self.data.insert(path, leaf);
        self.root = self.compute_root(&path, &leaf);
    }

    fn generate_proof(&self, key: &[u8; N]) -> Vec<(bool, [u8; 32])> {
        let path = blake2b_256(key);
        let leaf = self.data.get(&path).copied().unwrap_or(DEFAULT_HASH);
        let mut proof = Vec::new();
        let mut current = leaf;
        // Walk from leaf to root collecting siblings
        for i in 0..256 {
            let sibling = self.get_sibling(&path, i);
            let bit = (path[i / 8] >> (7 - (i % 8))) & 1;
            proof.push((bit == 1, sibling));
            current = if bit == 0 {
                blake2b_256(¤t, &sibling)
            } else {
                blake2b_256(&sibling, ¤t)
            };
        }
        proof
    }
}
```

## Verkle Trie (Vector Commitment Trie)

Ethereum stateless client proposal (EIP-2935/6800). Uses polynomial commitments (KZG) instead of hash-based Merkle.

- Branching factor 256 (one commitment per node)
- Proof size: O(log_256 n) × 1-2 field elements, NOT full sibling data
- At depth d, proof is a single KZG opening proof of size ~48 bytes

### Verkle vs Merkle proof size (n = 10⁹ entries)

| Tree | Branching | Proof Paths | Proof Size |
|------|-----------|-------------|------------|
| Binary Merkle | 2 | 30 hashes | 30 × 32 = 960 bytes |
| Patricia MPT | 16 | 8 nodes | 8 × ~500 = ~4KB |
| Verkle | 256 | 4 openings | 4 × 48 = 192 bytes |

### Key operations

```python
# Verkle node commitment uses Pedersen vector commitment
def compute_commitment(children: list[G1Point]) -> G1Point:
    # C = sum(c_i * H_i) where H_i are independent generators
    # children are 256 scalar field elements (or E0 sentinel)
    return sum(c * H_i for c, H_i in zip(children, generators))

# Opening proof for child at position i
def opening_proof(commitment: G1Point, position: int, value: Fr) -> Proof:
    # KZG evaluation proof
    # pi = (f(z) - value) / (X - z) evaluated at tau
    pass
```

## Tree Pruning & Snapshotting

- **Bitcoin UTXO set**: ~80M entries. Full merkle tree impractical; instead use hash-set with txout proofs.
- **Ethereum state**: ~600M accounts. Full Patricia trie ~40GB. Snapshot sync uses flat DB + trie healing.
- **Cosmos IAVL**: Versioned tree with pruning. Old versions deleted after pruning height. Each version creates new root; unchanged subtrees are shared via persistent data structure.

## Proof Aggregation

- **BLS aggregation**: Verify multiple Merkle proofs in one pairing check
- **Non-membership proofs**: SMT naturally supports non-membership (sibling path ends at default)
- **Batch Merkle proof**: Verify n leaves with amortized O(log n + n) work

### Proof of absence (SMT)
```
In a SMT of depth 256, proof-of-non-membership for key k:
Show the leaf at position path(k) is DEFAULT_HASH,
and provide the Merkle proof to root.
```

## Implementation Gotchas

1. **Bitcoin double Merkle**: Each level hashes twice: `sha256(sha256(left || right))` — not single SHA256.
2. **Ethereum hex prefix (HP)**: Leaf and extension node paths use HP encoding to distinguish node types (even/odd length flag in first nibble).
3. **SMT default hash**: Must be computed incrementally: `default[i] = H(default[i-1], default[i-1])` for each level. Precompute all 256 levels.
4. **Verkle multiproofs**: Multiple leaf openings can be batched into a single KZG proof using quotient aggregation.
5. **IAVL version GC**: Don't hold references to old tree versions during pruning — use reference counting or epoch-based GC.
