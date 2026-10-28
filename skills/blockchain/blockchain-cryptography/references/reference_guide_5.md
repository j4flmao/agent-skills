# On-Chain Signature Verification in Solidity: ecrecover, EIP-712, EIP-1271

Smart contracts verify off-chain signatures for permits, meta-transactions, order books, allowlists and account abstraction. Most signature-related exploits come from verification mistakes, not broken cryptography: replay across chains or contracts, malleable signatures, unchecked zero addresses, and missing nonces. This reference covers correct verification patterns.

## ecrecover Basics

`ecrecover(bytes32 hash, uint8 v, bytes32 r, bytes32 s) returns (address)` recovers the signer of an ECDSA secp256k1 signature.

Pitfalls of calling it directly:
- Returns `address(0)` on invalid input instead of reverting. Comparing to an uninitialized `signer` variable (zero) then passes.
- Accepts both `s` and `n - s` (signature malleability). If signatures are used as unique identifiers (for example "used signature" mappings), an attacker can submit the flipped variant.
- `v` must be 27 or 28.

Use OpenZeppelin `ECDSA.recover` / `ECDSA.tryRecover`, which reject high-`s` values (`s > n/2`) and invalid `v`, and revert on zero-address recovery.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract SimpleVerify {
    using ECDSA for bytes32;

    function signerOf(bytes32 digest, bytes calldata sig) public pure returns (address) {
        // digest must already be an EIP-191 or EIP-712 digest
        return digest.recover(sig);
    }

    function personalSignDigest(bytes32 dataHash) public pure returns (bytes32) {
        return MessageHashUtils.toEthSignedMessageHash(dataHash); // "\x19Ethereum Signed Message:\n32"
    }
}
```

Track replay by nonce or by a hash of the signed message contents, never by the raw signature bytes.

## EIP-191 vs EIP-712

| Standard | Prefix | Use |
|----------|--------|-----|
| EIP-191 version 0x45 (`personal_sign`) | `"\x19Ethereum Signed Message:\n" + len` | Human-readable login messages (SIWE, EIP-4361) |
| EIP-712 typed data | `"\x19\x01" || domainSeparator || structHash` | Structured authorizations (permits, orders, votes) |

The `\x19` prefix ensures a signed message can never be a valid RLP transaction. Prefer EIP-712 for anything that authorizes value transfer: wallets display the fields, and the domain separator prevents cross-contract and cross-chain replay.

## EIP-712 Implementation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

contract Vouchers is EIP712, Nonces {
    bytes32 private constant CLAIM_TYPEHASH =
        keccak256("Claim(address to,uint256 amount,uint256 nonce,uint256 deadline)");

    address public immutable issuer;

    error Expired();
    error BadSigner();

    constructor(address _issuer) EIP712("Vouchers", "1") { issuer = _issuer; }

    function claim(address to, uint256 amount, uint256 deadline, bytes calldata sig) external {
        if (block.timestamp > deadline) revert Expired();
        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, to, amount, _useNonce(to), deadline)
        );
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), sig);
        if (signer != issuer) revert BadSigner();
        _mint(to, amount); // effects after all checks
    }
}
```

Rules:
- The domain separator includes `name`, `version`, `chainId` and `verifyingContract`. OpenZeppelin's `EIP712` recomputes it if `block.chainid` changes (fork protection).
- The typehash string must match the struct exactly: field order, types, no spaces after commas. Nested structs are appended in alphabetical order after the primary type.
- Dynamic types (`string`, `bytes`) are hashed with `keccak256` inside `abi.encode`; arrays are hashed as the keccak of the concatenated encoded elements.
- Include a nonce and a deadline. Use sequential nonces (`Nonces`) or a bitmap for unordered nonces (as Permit2 does).

## Contract Signers: EIP-1271

Smart-contract wallets (Safe, ERC-4337 accounts) cannot produce ECDSA signatures; they implement:

```solidity
function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4 magicValue);
// returns 0x1626ba7e when valid
```

Verify both EOA and contract signers with OpenZeppelin `SignatureChecker.isValidSignatureNow(signer, hash, signature)`, which tries ECDSA recovery and falls back to EIP-1271 for contracts.

Considerations:
- EIP-1271 validity can change over time (owners rotate); do not cache results.
- The call is external: guard against reentrancy and gas griefing in the surrounding function.
- ERC-6492 extends verification to counterfactual (not yet deployed) smart accounts; support it off-chain in sign-in flows if users have undeployed accounts.

## Compact Signatures (EIP-2098)

EIP-2098 encodes `(r, s, v)` in 64 bytes by storing the `v` parity in the top bit of `s`. OpenZeppelin `ECDSA.recover(hash, r, vs)` accepts it. If a contract accepts both 65-byte and 64-byte forms, the same signature has two encodings: again, never use signature bytes as a replay key.

## Permit Patterns

- **EIP-2612 `permit`**: ERC-20 approvals by signature; the token must implement it.
- **Permit2** (Uniswap): one approval to the Permit2 contract, then signature-based transfers with unordered nonces and expirations for any ERC-20.

Phishing risk: users sign permits that grant unlimited allowances to attackers without an on-chain transaction. Front ends and wallets should show spender, amount and deadline clearly; contracts should use bounded amounts and short deadlines.

## Replay Protection Summary

| Replay vector | Defense |
|---------------|---------|
| Same contract, same chain | Nonce (sequential or bitmap), mark consumed |
| Different contract | `verifyingContract` in domain |
| Different chain / fork | `chainId` in domain, recomputed on chain ID change |
| Signature malleability | Low-`s` enforcement; replay key = message hash, not signature |
| Expired intent reused | Deadline checked against `block.timestamp` |
| Cross-function reuse | Distinct typehash per action |

## Testing

```solidity
// Foundry: sign EIP-712 digests in tests
(address alice, uint256 aliceKey) = makeAddrAndKey("alice");
bytes32 digest = vouchers.hashForTest(alice, 100, deadline); // expose _hashTypedDataV4 in a test harness
(uint8 v, bytes32 r, bytes32 s) = vm.sign(aliceKey, digest);
bytes memory sig = abi.encodePacked(r, s, v);
```

Test: wrong signer, expired deadline, replayed nonce, signature from another chain ID (`vm.chainId`), malleated high-`s` signature, and contract signers via a mock EIP-1271 wallet.

## Checklist

- [ ] OpenZeppelin `ECDSA` / `SignatureChecker` instead of raw `ecrecover`
- [ ] EIP-712 domain with name, version, chainId, verifyingContract
- [ ] Nonce and deadline in every signed authorization
- [ ] Replay tracked by message hash or nonce, never by signature bytes
- [ ] EIP-1271 supported for smart-contract wallets
- [ ] Typehash strings verified against off-chain signing code with shared test vectors
