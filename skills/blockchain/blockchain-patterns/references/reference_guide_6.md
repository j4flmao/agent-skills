# Account Abstraction: ERC-4337 and EIP-7702

Account abstraction lets user accounts run custom validation logic: multisig and passkey signers, session keys, gas sponsorship, batched calls and recovery. This reference covers ERC-4337 (smart contract accounts via an alt-mempool) and EIP-7702 (EOAs delegating to contract code, activated in the Pectra upgrade, May 2025).

## Components of ERC-4337

| Component | Role |
|-----------|------|
| Smart account | Contract wallet implementing `validateUserOp` and execution functions |
| UserOperation | Pseudo-transaction describing what the account wants to do |
| Bundler | Off-chain node collecting UserOps, simulating them, submitting `handleOps` |
| EntryPoint | Singleton contract that validates and executes UserOps |
| Paymaster | Optional contract that sponsors gas or accepts ERC-20 for gas |
| Factory | Deploys the account on first use (counterfactual address via CREATE2) |
| Aggregator | Optional, verifies aggregated signatures (e.g. BLS) |

EntryPoint versions: v0.6, v0.7 (packed UserOperation), v0.8 (adds native EIP-7702 support). Accounts, bundlers and paymasters must agree on the version.

## Flow

```
User signs UserOp ──► Bundler (eth_sendUserOperation)
                         │ simulate validation under ERC-7562 rules
                         ▼
                   EntryPoint.handleOps([ops], beneficiary)
                         ├─ deploy account via factory if initCode/factory set
                         ├─ account.validateUserOp(op, hash, missingFunds)
                         ├─ paymaster.validatePaymasterUserOp (if any)
                         ├─ execute op.callData on account
                         └─ paymaster.postOp, refund/charge
```

## Minimal Account Validation (conceptual)

```solidity
function validateUserOp(PackedUserOperation calldata op, bytes32 userOpHash, uint256 missingAccountFunds)
    external
    returns (uint256 validationData)
{
    require(msg.sender == address(entryPoint), "only EntryPoint");
    bytes32 digest = MessageHashUtils.toEthSignedMessageHash(userOpHash);
    if (ECDSA.recover(digest, op.signature) != owner) return SIG_VALIDATION_FAILED; // 1
    if (missingAccountFunds > 0) {
        (bool ok, ) = payable(msg.sender).call{value: missingAccountFunds}("");
        (ok);
    }
    return 0; // or pack validAfter/validUntil for time-bounded validity
}
```

Use audited implementations rather than writing your own: eth-infinitism `SimpleAccount` (reference), Safe with the 4337 module, Kernel (ZeroDev), Coinbase Smart Wallet, Biconomy Nexus, Alchemy Modular Account. Modular accounts follow ERC-7579 (validators, executors, hooks, fallback modules) or ERC-6900.

## Validation Rules (ERC-7562)

Bundlers reject UserOps whose validation could be invalidated by other transactions (DoS protection). During validation an account must not, roughly:
- Use banned opcodes such as `TIMESTAMP`, `NUMBER`, `BLOCKHASH`, `GASPRICE`, `BALANCE` of other accounts.
- Access storage not associated with the account (with specific exceptions for staked entities).

Put time logic in `validationData` (validAfter/validUntil) rather than reading `block.timestamp`.

## Paymasters

| Type | Behavior |
|------|----------|
| Verifying/sponsoring | Off-chain service signs approval; dApp pays gas |
| ERC-20 | Account pays in a token; paymaster converts via oracle price |

Paymasters must stake in EntryPoint and must protect themselves against griefing: check signatures, bound gas, and verify `postOp` can collect payment.

## EIP-7702: EOAs with Code

Transaction type `0x04` carries an authorization list `(chain_id, address, nonce, y_parity, r, s)`. After it executes, the EOA's code is set to the delegation designator `0xef0100 || address`, so calls to the EOA run that contract's code in the EOA's context. The EOA's private key still controls the account.

Uses:
- Batch calls from an existing EOA (approve + swap).
- Gas sponsorship and session keys via a delegated smart-account implementation.
- Compatibility with 4337 tooling (EntryPoint v0.8 understands 7702 accounts).

Risks:
- A malicious delegate contract gets full control of the EOA's assets; wallets should only allow delegation to vetted implementations, and users should never sign raw 7702 authorizations from dApps.
- `chain_id = 0` authorizations are valid on every chain: replay across chains.
- Storage persists across re-delegation to a different implementation: storage layout collisions. Use namespaced storage (ERC-7201).
- Contracts that assumed `tx.origin == msg.sender` means "EOA without code", or `extcodesize == 0` means EOA, are broken by 7702.

## Choosing

| Need | Option |
|------|--------|
| New users, social/passkey login, recovery | 4337 smart account (counterfactual) |
| Existing EOA users wanting batching/sponsorship | 7702 delegation to a vetted 4337/7579-compatible account |
| Organization treasury | Safe multisig (optionally 4337 module) |

## dApp Integration

- Use EIP-5792 (`wallet_sendCalls`) to request batched calls; the wallet chooses 4337/7702 under the hood.
- Verify signatures with ERC-1271 (and ERC-6492 for not-yet-deployed accounts); never assume `ecrecover`.
- Do not rely on `tx.origin` or `extcodesize` checks to detect humans.
- SDKs: permissionless.js, viem account-abstraction module, Alchemy/Pimlico/ZeroDev/Biconomy SDKs.

## Checklist

- [ ] EntryPoint version aligned across account, bundler, paymaster
- [ ] Audited account implementation; modules reviewed
- [ ] Validation follows ERC-7562; time limits via validationData
- [ ] Paymaster staked, signature-gated, griefing-resistant
- [ ] 7702 delegates vetted; chain-specific authorizations; namespaced storage
- [ ] Contracts do not use `tx.origin`/`extcodesize` as EOA checks
- [ ] ERC-1271/6492 signature verification in dApps
