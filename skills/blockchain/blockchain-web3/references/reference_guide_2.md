# Message Signing: EIP-191, EIP-712, SIWE and Contract-Wallet Signatures

Off-chain signatures for authentication, permits, orders and meta-transactions: which standard to use, how to build and verify each with viem, how smart-contract wallets sign (ERC-1271, ERC-6492), and the replay and phishing pitfalls.

## Standards at a Glance

| Standard | Signs | Use for | Wallet UX |
|----------|-------|---------|-----------|
| EIP-191 `personal_sign` | `"\x19Ethereum Signed Message:\n" + len + message` | Simple text, login messages | Shows text |
| EIP-712 `eth_signTypedData_v4` | Structured data with a domain separator | Permits, orders, votes, anything parsed on-chain | Shows fields |
| EIP-4361 SIWE | EIP-191 message in a fixed text format | Web login | Shows readable login request |
| ERC-1271 | `isValidSignature(hash, sig)` on a contract | Verifying signatures from smart accounts / multisigs | — |
| ERC-6492 | Wrapper for signatures from not-yet-deployed smart accounts | Counterfactual accounts | — |

Never use raw `eth_sign` on arbitrary hashes; wallets warn or block it because a user can be tricked into signing a transaction hash.

## EIP-191

```ts
// client: sign
const signature = await walletClient.signMessage({ account, message: 'Link account 42 to Discord' })

// server: verify (works for EOAs and, via publicClient, ERC-1271/6492 contract wallets)
const ok = await publicClient.verifyMessage({ address, message: 'Link account 42 to Discord', signature })
```

`publicClient.verifyMessage` performs universal verification (EOA recovery, ERC-1271 call, ERC-6492 unwrapping). The standalone `verifyMessage` from `viem` only recovers EOA signatures.

## EIP-712 Typed Data

```ts
const domain = {
  name: 'Example Exchange',
  version: '1',
  chainId: 1,
  verifyingContract: '0x1111111111111111111111111111111111111111',
} as const

const types = {
  Order: [
    { name: 'maker', type: 'address' },
    { name: 'sellToken', type: 'address' },
    { name: 'buyToken', type: 'address' },
    { name: 'sellAmount', type: 'uint256' },
    { name: 'minBuyAmount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const

const message = {
  maker: account.address,
  sellToken: WETH,
  buyToken: USDC,
  sellAmount: 10n ** 18n,
  minBuyAmount: 3_000_000_000n,
  nonce: 7n,
  deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
} as const

const signature = await walletClient.signTypedData({ account, domain, types, primaryType: 'Order', message })
const valid = await publicClient.verifyTypedData({ address: account.address, domain, types, primaryType: 'Order', message, signature })
```

On-chain verification (Solidity, OpenZeppelin 5.x):

```solidity
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

contract Exchange is EIP712("Example Exchange", "1") {
    struct Order {
        address maker;
        address sellToken;
        address buyToken;
        uint256 sellAmount;
        uint256 minBuyAmount;
        uint256 nonce;
        uint256 deadline;
    }

    bytes32 private constant ORDER_TYPEHASH = keccak256(
        "Order(address maker,address sellToken,address buyToken,uint256 sellAmount,uint256 minBuyAmount,uint256 nonce,uint256 deadline)"
    );
    mapping(address => mapping(uint256 => bool)) public usedNonce;

    error Expired();
    error NonceUsed();
    error BadSignature();

    function _verify(Order calldata o, bytes calldata sig) internal {
        if (block.timestamp > o.deadline) revert Expired();
        if (usedNonce[o.maker][o.nonce]) revert NonceUsed();
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            ORDER_TYPEHASH, o.maker, o.sellToken, o.buyToken, o.sellAmount, o.minBuyAmount, o.nonce, o.deadline
        )));
        if (!SignatureChecker.isValidSignatureNow(o.maker, digest, sig)) revert BadSignature();
        usedNonce[o.maker][o.nonce] = true;
    }
}
```

`SignatureChecker` handles both EOAs (ECDSA, rejects malleable `s`) and ERC-1271 contracts.

### Replay protection checklist for typed data
- Domain includes `chainId` and `verifyingContract`.
- Message includes a nonce (sequential or bitmap) and a deadline.
- Nonce consumed on use; provide a cancel path (increment nonce on-chain).

## Sign-In with Ethereum (EIP-4361)

```ts
import { createSiweMessage, generateSiweNonce } from 'viem/siwe'

// server: issue nonce, store in session
const nonce = generateSiweNonce()

// client: build and sign
const message = createSiweMessage({
  domain: 'app.example.com',
  address: account.address,
  statement: 'Sign in to Example.',
  uri: 'https://app.example.com',
  version: '1',
  chainId: 1,
  nonce,
  issuedAt: new Date(),
  expirationTime: new Date(Date.now() + 10 * 60_000),
})
const signature = await walletClient.signMessage({ account, message })

// server: verify
const valid = await publicClient.verifySiweMessage({
  message,
  signature,
  domain: 'app.example.com',
  nonce: session.nonce,
})
```

Server rules:
- Nonce single-use, bound to the session, short TTL.
- Check `domain` and `uri` match your origin (wallets also warn on mismatch, which is the phishing defence).
- Use `publicClient.verifySiweMessage` so smart-account users can log in.
- After verification, issue your own session (HTTP-only cookie); do not keep re-verifying signatures per request.

## Smart-Contract Wallets

| Case | Verification |
|------|--------------|
| Deployed smart account (Safe, Coinbase Smart Wallet, ERC-4337 accounts) | ERC-1271 `isValidSignature(bytes32 hash, bytes sig)` returns `0x1626ba7e` |
| Counterfactual (not yet deployed) | ERC-6492: signature wrapped with factory + calldata; verifier simulates deployment then calls ERC-1271 |
| EIP-7702-delegated EOA | ECDSA recovery still works for the EOA key; delegated code may also implement ERC-1271 |

Consequences:
- `ecrecover`-only verification rejects smart-account users. Use universal verifiers off-chain and `SignatureChecker` on-chain.
- ERC-1271 results can change over time (owners rotate); verify at use time.

## Phishing and UX Risks

| Risk | Mitigation |
|------|------------|
| Permit/Permit2 signatures draining tokens | Show amounts/spenders clearly; short deadlines; users should review in wallet |
| Blind signing of opaque hashes | Use EIP-712 so wallets render fields |
| Cross-site signature reuse | Domain binding (EIP-712 domain, SIWE domain/uri) |
| Login signatures used as consent for other actions | Distinct statements and types per purpose |

## Checklist

- [ ] EIP-712 for anything a contract verifies; EIP-191 only for human-readable text
- [ ] Domain has chainId + verifyingContract; messages have nonce + deadline
- [ ] Off-chain verification via `publicClient.verify*` (ERC-1271/6492 aware)
- [ ] On-chain verification via `SignatureChecker`
- [ ] SIWE nonce single-use, domain checked, session issued after verify
