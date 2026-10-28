# Testing Signatures, EIP-712 and Permits

Off-chain signatures (EIP-712 typed data, ERC-2612 `permit`, Permit2, meta-transactions, ERC-1271 contract signatures) move authorization out of transactions. Bugs here are usually replay, malleability or domain mistakes. This reference shows how to generate signatures in Foundry tests and which negative cases every signature-verifying contract must cover.

## Generating Keys and Signatures in Foundry

```solidity
(address signer, uint256 signerPk) = makeAddrAndKey("signer");

bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
(uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
bytes memory sig = abi.encodePacked(r, s, v);   // 65-byte format expected by ECDSA.recover

// Compact EIP-2098 signature
(bytes32 r2, bytes32 vs) = vm.signCompact(signerPk, digest);
```

Never use real private keys in tests; `makeAddrAndKey` derives deterministic test keys from a label.

## EIP-712 Struct Hash Helper

```solidity
bytes32 constant ORDER_TYPEHASH =
    keccak256("Order(address maker,address token,uint256 amount,uint256 nonce,uint256 deadline)");

function _hashOrder(Order memory o) internal pure returns (bytes32) {
    return keccak256(abi.encode(ORDER_TYPEHASH, o.maker, o.token, o.amount, o.nonce, o.deadline));
}

function _sign(uint256 pk, Order memory o) internal view returns (bytes memory) {
    bytes32 digest = keccak256(abi.encodePacked("\x19\x01", exchange.DOMAIN_SEPARATOR(), _hashOrder(o)));
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
    return abi.encodePacked(r, s, v);
}
```

Cross-check the digest against an off-chain implementation (viem `hashTypedData`, ethers `TypedDataEncoder.hash`) in at least one test fixture so the frontend and contract agree. Recent Foundry versions also provide `vm.eip712HashStruct` / `vm.eip712HashTypedData` cheatcodes to compute hashes from type strings.

## ERC-2612 Permit Test

```solidity
function test_Permit_SetsAllowance() public {
    // Arrange
    (address owner, uint256 pk) = makeAddrAndKey("owner");
    uint256 deadline = block.timestamp + 1 hours;
    bytes32 structHash = keccak256(abi.encode(
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
        owner, spender, 100e18, token.nonces(owner), deadline
    ));
    bytes32 digest = keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);

    // Act
    token.permit(owner, spender, 100e18, deadline, v, r, s);

    // Assert
    assertEq(token.allowance(owner, spender), 100e18);
    assertEq(token.nonces(owner), 1);
}
```

## Mandatory Negative Tests

| Case | How to test | Expected |
|------|-------------|----------|
| Replay same signature | Call twice | Second call reverts (nonce used) |
| Expired deadline | `vm.warp(deadline + 1)` | Revert |
| Wrong signer | Sign with another key | Revert |
| Tampered field | Change amount after signing | Revert |
| Cross-chain replay | `vm.chainId(otherId)` then submit | Revert (domain separator includes chainId; must be recomputed when chainId changes) |
| Cross-contract replay | Submit to another deployment | Revert (verifyingContract in domain) |
| Malleable `s` (upper half) | `s' = n - s`, `v' = v ^ 1` (27<->28) | Revert if using OZ `ECDSA` (rejects high-s) |
| `ecrecover` returns zero | Garbage signature | Revert; never compare to `address(0)` owner |
| Wrong signature length | 64/66 bytes | Revert or accept only EIP-2098 explicitly |
| Front-run permit | Third party calls `permit` first, then user's tx calls permit again | User tx must not fail; wrap permit in try/catch and check allowance |

```solidity
uint256 constant SECP256K1_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;

function test_RevertWhen_SignatureMalleated() public {
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
    bytes32 sHigh = bytes32(SECP256K1_N - uint256(s));
    uint8 vFlipped = v == 27 ? 28 : 27;
    vm.expectRevert();   // OZ ECDSA: ECDSAInvalidSignatureS
    verifier.execute(order, abi.encodePacked(r, sHigh, vFlipped));
}
```

## Contract Signatures (ERC-1271)

Smart-account users sign with contracts. Test both EOAs and a mock ERC-1271 wallet:

```solidity
contract Mock1271Wallet {
    address immutable owner;
    constructor(address o) { owner = o; }
    function isValidSignature(bytes32 hash, bytes calldata sig) external view returns (bytes4) {
        return ECDSA.recover(hash, sig) == owner ? bytes4(0x1626ba7e) : bytes4(0xffffffff);
    }
}
```

Use OpenZeppelin `SignatureChecker.isValidSignatureNow` in contracts so both paths work. Also test counterfactual (not-yet-deployed) accounts if you support ERC-6492.

## Permit2

For Uniswap Permit2 integrations, test on a fork (Permit2 is deployed at the same address on many chains) using `SignatureTransfer`/`AllowanceTransfer` typed data; cover expired `sigDeadline`, nonce bitmap reuse and wrong spender.

## Fuzzing Signature Logic

```solidity
function testFuzz_RevertWhen_SignerIsNotMaker(uint256 otherPk) public {
    otherPk = bound(otherPk, 1, SECP256K1_N - 1);
    vm.assume(otherPk != makerPk);
    Order memory o = _order(maker);
    vm.expectRevert(Exchange.InvalidSignature.selector);
    exchange.fill(o, _sign(otherPk, o));
}
```

## Checklist

- [ ] Digest matches an off-chain implementation (viem/ethers) for a fixed vector
- [ ] Nonces consumed; replay reverts
- [ ] Deadline, chainId and verifyingContract enforced
- [ ] High-s and zero-address recovery rejected (OpenZeppelin `ECDSA`)
- [ ] ERC-1271 wallets supported and tested
- [ ] Permit front-running does not break user flows
