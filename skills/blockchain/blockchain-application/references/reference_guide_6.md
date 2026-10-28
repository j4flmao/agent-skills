# Signatures: EIP-712, ERC-2612 Permit, ERC-1271

Off-chain signatures let users authorize actions without sending a transaction (gasless approvals, meta-transactions, order books). They are also a frequent source of replay and malleability bugs. This reference covers typed-data signing and safe verification.

## Signature Types

| Scheme | What is signed | Use |
|--------|---------------|-----|
| `eth_sign` raw hash | 32-byte hash | Avoid: users cannot see what they sign |
| EIP-191 `personal_sign` | `"\x19Ethereum Signed Message:\n" + len + msg` | Login messages (e.g. SIWE, ERC-4361) |
| EIP-712 typed data | Domain + structured data hash | Permits, orders, votes, meta-tx |
| ERC-1271 | Contract decides validity via `isValidSignature` | Smart-contract wallets (Safe, 4337 accounts) |

## EIP-712 Structure

```
digest = keccak256("\x19\x01" ++ domainSeparator ++ hashStruct(message))
domainSeparator = hashStruct(EIP712Domain{name, version, chainId, verifyingContract})
```

The domain binds the signature to one contract on one chain, preventing cross-contract and cross-chain replay.

## Contract Side (OpenZeppelin v5)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

contract Vouchers is EIP712, Nonces {
    bytes32 private constant CLAIM_TYPEHASH =
        keccak256("Claim(address account,uint256 amount,uint256 nonce,uint256 deadline)");

    address public immutable signer;
    error Expired();
    error BadSignature();

    constructor(address signer_) EIP712("Vouchers", "1") { signer = signer_; }

    function claim(address account, uint256 amount, uint256 deadline, bytes calldata sig) external {
        if (block.timestamp > deadline) revert Expired();
        bytes32 structHash = keccak256(abi.encode(CLAIM_TYPEHASH, account, amount, _useNonce(account), deadline));
        bytes32 digest = _hashTypedDataV4(structHash);
        if (!SignatureChecker.isValidSignatureNow(signer, digest, sig)) revert BadSignature();
        _payout(account, amount);
    }

    function _payout(address account, uint256 amount) internal { /* transfer */ }
}
```

Key points:
- `_useNonce` increments per account: each signature usable once.
- `deadline` bounds validity.
- `EIP712` caches the domain separator and recomputes it if `block.chainid` changes (fork safety).
- `SignatureChecker` handles both EOAs (ECDSA) and contract wallets (ERC-1271).
- OZ `ECDSA.recover` rejects malleable high-`s` signatures; never use raw `ecrecover` without these checks and a zero-address check.

## Client Side with viem

```typescript
const signature = await walletClient.signTypedData({
  account,
  domain: { name: 'Vouchers', version: '1', chainId: 1, verifyingContract: '0xVouchers' },
  types: {
    Claim: [
      { name: 'account', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  },
  primaryType: 'Claim',
  message: { account, amount: 10n ** 18n, nonce, deadline },
});
```

Wallets render typed fields so users can see what they authorize.

## ERC-2612 Permit

```solidity
// token implements ERC20Permit
token.permit(owner, spender, value, deadline, v, r, s);
token.transferFrom(owner, address(this), value);
```

Front-running caveat: anyone who sees the permit in the mempool can submit it first, making your `permit` call revert even though the allowance is set. Wrap in `try token.permit(...) {} catch {}` and then check allowance, as OpenZeppelin recommends.

Not every token supports permit (e.g. some major stablecoins use different schemes or none). Uniswap's Permit2 provides signature-based approvals for any ERC-20 after a one-time approval to the Permit2 contract.

## ERC-1271 for Contract Wallets

```solidity
interface IERC1271 {
    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4 magicValue);
}
// valid if it returns 0x1626ba7e
```

Do not require `ecrecover(...) == owner` when owners may be smart wallets. For counterfactual (not yet deployed) accounts, ERC-6492 wraps signatures so verifiers can simulate deployment.

## Replay Protection Checklist by Dimension

| Replay across | Protection |
|---------------|------------|
| Same contract, same action | Nonce (sequential or bitmap) |
| Different contracts | `verifyingContract` in domain |
| Different chains | `chainId` in domain |
| Time | `deadline` |
| Different functions | Distinct typehash per action |

Bitmap nonces (as in Permit2) allow out-of-order use; sequential nonces enforce ordering.

## Common Bugs

- Signing `abi.encodePacked` of dynamic types: ambiguous concatenation collisions. Use `abi.encode` and EIP-712.
- Missing nonce or reusing a signature for multiple claims.
- Not including the `account`/recipient, letting anyone redeem someone else's voucher.
- Accepting `ecrecover` returning `address(0)` as valid for an unset signer.
- Hashing arrays/structs inconsistently with the EIP-712 spec (arrays hashed as `keccak256` of concatenated encoded elements).

## Testing

```solidity
(address signerAddr, uint256 pk) = makeAddrAndKey("signer");
bytes32 digest = vouchers.hashClaim(alice, 1e18, 0, deadline); // expose a view helper for tests
(uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
vouchers.claim(alice, 1e18, deadline, abi.encodePacked(r, s, v));

vm.expectRevert(Vouchers.BadSignature.selector);
vouchers.claim(alice, 1e18, deadline, abi.encodePacked(r, s, v)); // replay fails
```

## Checklist

- [ ] EIP-712 domain includes name, version, chainId, verifyingContract
- [ ] Nonce and deadline in every signed struct
- [ ] Recipient bound in the signed data
- [ ] `SignatureChecker`/`ECDSA` from OZ, no raw `ecrecover`
- [ ] ERC-1271 supported for smart wallets
- [ ] Permit calls tolerate front-running
- [ ] Replay tests in the suite
