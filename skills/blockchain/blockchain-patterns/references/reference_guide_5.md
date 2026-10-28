# Merkle Allowlists and Airdrop Distribution

Merkle trees let a contract verify membership in a large off-chain list with one stored 32-byte root and a logarithmic proof per claim. This reference covers tree construction, claim contracts, double-claim prevention, and pitfalls such as second-preimage attacks.

## Why Merkle Distribution

| Approach | Gas to set up | Gas per claim | Notes |
|----------|---------------|---------------|-------|
| Push transfers to every recipient | O(n) by distributor | 0 for recipient | Expensive, pays for inactive users |
| Store allowlist mapping on-chain | O(n) storage writes | Low | Expensive for large lists |
| Merkle root + proofs | One `SSTORE` | O(log n) hashes | Recipients pay; unclaimed funds recoverable |
| Signed vouchers (EIP-712) | None | Signature check | Needs an online signer key |

## Leaf Encoding

Use OpenZeppelin's `StandardMerkleTree` convention: double-hash the ABI-encoded leaf.

```
leaf = keccak256(bytes.concat(keccak256(abi.encode(account, amount))))
```

Double hashing ensures a leaf can never equal an internal node (64-byte concatenation), preventing second-preimage attacks where an internal node is presented as a leaf. Internal nodes are hashed with sorted pairs (`commutativeKeccak256`).

## Building the Tree (JavaScript)

```typescript
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import fs from 'node:fs';

const values: [string, string][] = [
  ['0x1111111111111111111111111111111111111111', '5000000000000000000'],
  ['0x2222222222222222222222222222222222222222', '2500000000000000000'],
];

const tree = StandardMerkleTree.of(values, ['address', 'uint256']);
console.log('Root:', tree.root);
fs.writeFileSync('tree.json', JSON.stringify(tree.dump()));

// later, generate a proof for one account
const loaded = StandardMerkleTree.load(JSON.parse(fs.readFileSync('tree.json', 'utf8')));
for (const [i, v] of loaded.entries()) {
  if (v[0] === account) console.log(loaded.getProof(i));
}
```

Publish `tree.json` (or a per-address proof API) so users and third parties can verify their allocation independently.

## Claim Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {BitMaps} from "@openzeppelin/contracts/utils/structs/BitMaps.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MerkleDistributor is Ownable {
    using SafeERC20 for IERC20;
    using BitMaps for BitMaps.BitMap;

    IERC20 public immutable token;
    bytes32 public immutable merkleRoot;
    uint64 public immutable claimDeadline;
    BitMaps.BitMap private claimed;

    event Claimed(uint256 indexed index, address indexed account, uint256 amount);
    error AlreadyClaimed();
    error InvalidProof();
    error ClaimWindowClosed();
    error ClaimWindowOpen();

    constructor(IERC20 token_, bytes32 root_, uint64 deadline_, address owner_) Ownable(owner_) {
        token = token_; merkleRoot = root_; claimDeadline = deadline_;
    }

    function claim(uint256 index, address account, uint256 amount, bytes32[] calldata proof) external {
        if (block.timestamp > claimDeadline) revert ClaimWindowClosed();
        if (claimed.get(index)) revert AlreadyClaimed();
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(index, account, amount))));
        if (!MerkleProof.verifyCalldata(proof, merkleRoot, leaf)) revert InvalidProof();
        claimed.set(index);
        token.safeTransfer(account, amount);
        emit Claimed(index, account, amount);
    }

    function sweep(address to) external onlyOwner {
        if (block.timestamp <= claimDeadline) revert ClaimWindowOpen();
        token.safeTransfer(to, token.balanceOf(address(this)));
    }
}
```

This variant includes `index` in the leaf (tree built with `['uint256','address','uint256']`) so a bitmap can track claims cheaply: 256 claims share one storage slot. If you key by address instead, use `mapping(address => bool)`.

Tokens go to `account`, not `msg.sender`, so anyone (e.g. a relayer) can submit the claim, but only the listed account benefits.

## Allowlist Minting

```solidity
function allowlistMint(uint256 qty, bytes32[] calldata proof) external payable {
    bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender))));
    if (!MerkleProof.verifyCalldata(proof, allowlistRoot, leaf)) revert NotAllowlisted();
    if (minted[msg.sender] + qty > MAX_PER_WALLET) revert LimitExceeded();
    minted[msg.sender] += qty;
    _mint(msg.sender, qty);
}
```

Here the leaf binds to `msg.sender`, so proofs cannot be used by others.

## Multiple Rounds and Updatable Roots

- Immutable root: simplest and most trustworthy.
- Updatable root (vesting streams, rolling rewards): store cumulative amounts per account and pay `cumulative - alreadyClaimed`; guard root updates with a timelock and emit `RootUpdated(old, new)`.

## Pitfalls

| Pitfall | Effect |
|---------|--------|
| Single-hash leaf of 64 bytes | Internal node could pass as a leaf |
| `abi.encodePacked` with dynamic types | Encoding collisions |
| Leaf not bound to recipient | Anyone with a proof can claim to themselves |
| No claimed tracking | Repeated claims |
| Tree library and contract hashing mismatch | All proofs fail |
| Missing deadline/sweep | Unclaimed funds locked forever |
| Duplicate addresses in input list | Ambiguous allocations; dedupe before building |

## Testing

- Generate the tree in a script, write root and a few proofs to JSON, read them in Foundry with `vm.readFile` + `vm.parseJson`.
- Test: valid claim, double claim, wrong amount, wrong account, proof from another leaf, after deadline.
- Fuzz random leaves against `MerkleProof.verify` to confirm rejection.

## Checklist

- [ ] Double-hashed, `abi.encode` leaves matching the off-chain library
- [ ] Leaf binds recipient (and index for bitmap tracking)
- [ ] Claims tracked; double claim reverts
- [ ] Deadline and sweep path for unclaimed funds
- [ ] Tree data published for independent verification
- [ ] Root changes (if any) timelocked and evented
