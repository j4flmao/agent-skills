# EIP-7702 Delegation and Wallet Batching (EIP-5792)

EIP-7702 (activated on Ethereum mainnet with the Pectra upgrade in May 2025) lets an externally owned account (EOA) point its code at a smart-contract implementation. This reference explains the mechanism, how dApps should use it (mostly through wallets via EIP-5792), how to build delegate contracts safely, and how it relates to ERC-4337. Basic ERC-4337 setup is covered in `blockchain-web3-advanced.md`.

## Mechanism

- New transaction type `0x04` (set-code) carries an `authorizationList`.
- Each authorization is a signed tuple `(chain_id, address, nonce, y_parity, r, s)` by the EOA key.
- When processed, the EOA's code becomes the delegation designator `0xef0100 || address`. Calls to the EOA execute `address`'s code in the EOA's context (its storage, balance).
- The delegation persists until replaced by another authorization. Authorizing `address(0)` clears it.
- The EOA private key keeps full control; it can always sign a new authorization or ordinary transactions.

| Field | Note |
|-------|------|
| `chain_id` | Specific chain, or `0` = valid on every chain (avoid unless intended) |
| `nonce` | Must equal the EOA's nonce at processing time |
| `address` | Delegate implementation |

If the EOA itself sends the set-code transaction, the transaction consumes one nonce first, so the authorization must use `nonce + 1`.

## What It Enables

| Capability | How |
|------------|-----|
| Batching (approve + swap in one tx) | Delegate implements `execute(calls[])` |
| Gas sponsorship | A relayer sends the type-4 tx or later calls into the delegated EOA; delegate verifies EOA signature |
| Session keys / spending limits | Delegate stores policies in the EOA's storage |
| ERC-4337 compatibility | Delegate implements the 4337 account interface; EOA keeps its address |

## dApp Integration: Prefer EIP-5792

Most wallets do not let dApps request arbitrary delegations, because a malicious delegate controls the account. dApps should request *capabilities* and batched calls; the wallet decides whether to use 7702, a 4337 smart account, or sequential transactions.

```ts
import { encodeFunctionData, erc20Abi, parseUnits } from 'viem'

// wagmi: useSendCalls / useCallsStatus; viem: walletClient.sendCalls / waitForCallsStatus
const { id } = await walletClient.sendCalls({
  account,
  calls: [
    { to: USDC, data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [ROUTER, parseUnits('100', 6)] }) },
    { to: ROUTER, data: swapCalldata },
  ],
})
const result = await walletClient.waitForCallsStatus({ id })
```

Check support first with `wallet_getCapabilities` (viem `getCapabilities`) and fall back to separate transactions when atomic batching is unavailable.

## Direct Use (wallets, backends, tests)

```ts
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

const eoa = privateKeyToAccount(process.env.TEST_EOA_KEY as `0x${string}`)
const client = createWalletClient({ account: eoa, chain: sepolia, transport: http(process.env.SEPOLIA_RPC_URL) })

const authorization = await client.signAuthorization({
  contractAddress: DELEGATE_IMPL,
  executor: 'self',            // EOA sends the tx itself → nonce + 1 handled by viem
})

const hash = await client.sendTransaction({
  authorizationList: [authorization],
  to: eoa.address,
  data: initCalldata,          // optional: call the delegate's init in the same tx
})
```

When a relayer submits the transaction, omit `executor: 'self'`; the authorization then uses the EOA's current nonce and the relayer pays gas.

## Writing a Delegate Contract

Delegates run in the EOA's context without a constructor. Requirements:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract BatchDelegate {
    struct Call { address to; uint256 value; bytes data; }

    /// @custom:storage-location erc7201:example.batchdelegate
    struct Layout { uint256 nonce; }
    // keccak256(abi.encode(uint256(keccak256("example.batchdelegate")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant SLOT = 0x161cf0e2981e7d796e4437b46db56aad7d76d8279f4b0dedda3cb68f143fe000;

    error Unauthorized();
    error CallFailed(uint256 index, bytes reason);

    function _layout() private pure returns (Layout storage l) {
        bytes32 s = SLOT;
        assembly { l.slot := s }
    }

    /// Direct call by the EOA itself.
    function execute(Call[] calldata calls) external payable {
        if (msg.sender != address(this)) revert Unauthorized();
        _run(calls);
    }

    /// Sponsored call: anyone may submit, the EOA key must have signed this batch.
    function executeWithSig(Call[] calldata calls, uint256 deadline, bytes calldata sig) external payable {
        if (block.timestamp > deadline) revert Unauthorized();
        Layout storage l = _layout();
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(
            keccak256(abi.encode(block.chainid, address(this), l.nonce, deadline, calls))
        );
        if (ECDSA.recover(digest, sig) != address(this)) revert Unauthorized();
        l.nonce++;
        _run(calls);
    }

    function _run(Call[] calldata calls) private {
        for (uint256 i; i < calls.length; ++i) {
            (bool ok, bytes memory ret) = calls[i].to.call{value: calls[i].value}(calls[i].data);
            if (!ok) revert CallFailed(i, ret);
        }
    }

    receive() external payable {}
}
```

Production delegates should use EIP-712 typed data rather than the simplified digest above, and must be audited; prefer well-reviewed implementations shipped by wallets or account-abstraction libraries.

Rules:
- **Authorization**: inside the delegate, `address(this)` is the EOA. Authenticate with `msg.sender == address(this)` or a signature recovered to `address(this)`.
- **Replay**: include chain ID, nonce and deadline in signed payloads.
- **Initialization**: there is no constructor; an unprotected `initialize()` can be front-run between delegation and init. Require the EOA's signature for init or do it in the same set-code transaction.
- **Storage**: switching delegates keeps old storage. Use ERC-7201 namespaced storage to avoid collisions between implementations.
- **Receiving tokens**: implement `receive()` and ERC-721/1155 receiver hooks if the account should accept them.

## Impact on Existing Contracts

| Assumption | Status after 7702 |
|------------|-------------------|
| `tx.origin == msg.sender` means "called by an EOA, not a contract" | False: a delegated EOA can execute arbitrary logic; do not use as a reentrancy or bot guard |
| `extcodesize(addr) == 0` means EOA | False for delegated EOAs (code is the 23-byte designator) |
| EOAs cannot batch | False |
| EOA signatures verify by `ecrecover` | Still true; ERC-1271 may also be implemented by the delegate |

## 7702 vs ERC-4337

| Aspect | EIP-7702 | ERC-4337 smart account |
|--------|----------|------------------------|
| Address | Keeps existing EOA address | New contract address |
| Root key | EOA key always has full control | Configurable (multisig, passkeys, recovery) |
| Protocol support | Native tx type | Contracts + bundlers + EntryPoint |
| Combine | A 7702 delegate can implement 4337 interfaces, so an EOA can use bundlers/paymasters | — |

Because the EOA key cannot be rotated away, 7702 does not provide key recovery on its own.

## Checklist

- [ ] dApp uses EIP-5792 `sendCalls` with capability detection and fallback
- [ ] Authorizations use a specific `chain_id`, never `0` by default
- [ ] Delegate authenticates via `address(this)`, protects init, uses namespaced storage
- [ ] Contracts no longer rely on `tx.origin` or code-size EOA checks
- [ ] Delegate implementations audited; clearing delegation (address 0) documented
