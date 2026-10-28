# Decoding Reverts and Handling Web3 Errors

Turning EVM reverts, RPC failures and wallet rejections into actionable messages: how revert data is encoded, how viem structures errors, a classification table, and user-facing copy guidelines.

## Where Errors Come From

| Layer | Examples |
|-------|----------|
| Wallet (EIP-1193) | User rejected (4001), unauthorized (4100), unsupported method (4200), disconnected (4900), chain disconnected (4901), unrecognized chain on switch (4902) |
| RPC node | Rate limited (HTTP 429), timeout, nonce too low, insufficient funds, execution reverted |
| Contract | `require` message, custom error, panic (assert/overflow/division by zero) |
| Your app | ABI mismatch, wrong chain, decoding failures |

## Revert Data Encoding

| Kind | Selector | Payload |
|------|----------|---------|
| `Error(string)` from `require(cond, "msg")` / `revert("msg")` | `0x08c379a0` | ABI-encoded string |
| `Panic(uint256)` | `0x4e487b71` | Panic code |
| Custom error `error InsufficientBalance(uint256 available, uint256 required)` | `keccak256("InsufficientBalance(uint256,uint256)")[0:4]` | ABI-encoded args |
| Empty | — | `revert()` without data, out-of-gas, or call to an address without code |

Common panic codes: `0x01` assert failed, `0x11` arithmetic overflow/underflow, `0x12` division by zero, `0x21` invalid enum value, `0x32` array index out of bounds, `0x41` memory allocation too large, `0x51` call to zero-initialized function pointer.

## viem Error Structure

viem errors extend `BaseError` with `shortMessage`, `details`, `metaMessages` and a `cause` chain. Walk the chain to find the specific error.

```ts
import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
  InsufficientFundsError,
  HttpRequestError,
} from 'viem'

export type UiError =
  | { kind: 'rejected' }
  | { kind: 'revert'; name: string; args?: readonly unknown[]; reason?: string }
  | { kind: 'funds' }
  | { kind: 'network'; status?: number }
  | { kind: 'unknown'; message: string }

export function classify(err: unknown): UiError {
  if (!(err instanceof BaseError)) return { kind: 'unknown', message: String(err) }

  if (err.walk((e) => e instanceof UserRejectedRequestError)) return { kind: 'rejected' }

  const revert = err.walk((e) => e instanceof ContractFunctionRevertedError)
  if (revert instanceof ContractFunctionRevertedError) {
    return {
      kind: 'revert',
      name: revert.data?.errorName ?? 'Error',
      args: revert.data?.args,
      reason: revert.reason,
    }
  }

  if (err.walk((e) => e instanceof InsufficientFundsError)) return { kind: 'funds' }

  const http = err.walk((e) => e instanceof HttpRequestError)
  if (http instanceof HttpRequestError) return { kind: 'network', status: http.status }

  return { kind: 'unknown', message: err.shortMessage }
}
```

Custom errors decode only if they are in the ABI you pass. Include errors of libraries and inherited contracts (e.g. OpenZeppelin's `ERC20InsufficientBalance`) in the client ABI, or decode manually:

```ts
import { decodeErrorResult } from 'viem'

const decoded = decodeErrorResult({ abi: [...tokenAbi, ...ozErrorsAbi], data: revertData })
// decoded.errorName, decoded.args
```

## Getting Revert Data

- `simulateContract` / `estimateGas` / `call` return revert data before the user signs. Prefer simulation so users never pay for a predictable failure.
- For a mined failed transaction, replay it: `publicClient.call({ ...tx, blockNumber: receipt.blockNumber - 1n })` approximates the state (results can differ if earlier txs in the same block changed state); `debug_traceTransaction` gives the exact result where the provider supports tracing.
- Empty revert data from `estimateGas` sometimes means the provider stripped it; retry via `eth_call` on another provider.

## Mapping to User Messages

| Classification | Message pattern | Action offered |
|----------------|-----------------|----------------|
| rejected | "Transaction cancelled in wallet." | None (not an error state) |
| revert `ERC20InsufficientAllowance` | "Approval needed for this amount." | Approve button |
| revert `ERC20InsufficientBalance` | "Not enough TOKEN." | Show balance |
| revert deadline/slippage errors | "Price moved; try again." | Refresh quote |
| funds | "Not enough ETH for gas." | Show gas estimate |
| network 429 / timeout | "Network busy; retrying." | Auto-retry with backoff |
| wrong chain (4902 or chain mismatch) | "Switch to Base to continue." | Switch-chain button |
| unknown | "Something went wrong." + error ID | Copy details for support |

Map by error *name*, not by matching strings in messages: providers and clients word messages differently.

## Contract-Side Practices That Help Clients

- Use custom errors with parameters instead of strings (cheaper and machine-readable).
- Publish the full ABI including errors (verified source on the explorer).
- Avoid catching and re-throwing generic errors in proxies/routers; bubble original revert data.

## Retry Policy

| Error | Retry? |
|-------|--------|
| HTTP 429/502/503/504, connection reset, timeout on reads | Yes, bounded, exponential backoff with jitter |
| Execution reverted | No (deterministic for given state); re-quote if state-dependent |
| User rejected | No |
| Nonce too low on send | Do not resend blindly; check whether the original was mined |

## Logging

Log `{ errorName, shortMessage, chainId, contract, functionName, args (sanitized), blockNumber, rpcHost }`. Never log private keys, full signatures for auth flows, or user seed material.

## Checklist

- [ ] Simulate before sending; surface decoded revert before signing
- [ ] ABI includes custom errors from all inherited/library contracts
- [ ] Errors classified by type via `err.walk`, not string matching
- [ ] User rejection treated as a neutral outcome
- [ ] Reads retried with backoff; reverts never retried blindly
