# Transaction Submission and Nonce Management

Sending EVM transactions reliably from backends, relayers and bots: nonce allocation, fee selection, simulation, confirmation tracking, replacement of stuck transactions, and idempotency. Examples use viem v2. Front-end wallet flows are covered in `wallet-integration.md`.

## Lifecycle

```text
build ─► simulate ─► sign ─► broadcast ─► pending ─► included ─► safe ─► finalized
                                 │            │
                                 │            └─ replaced (same nonce, higher fee) / dropped
                                 └─ rejected by node (nonce too low, underpriced, insufficient funds)
```

A transaction is identified by `(from, nonce)` until mined; its hash changes if you replace it. Track by `(from, nonce)` in your database, not only by hash.

## Client Setup

```ts
import { createPublicClient, createWalletClient, http, fallback } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet } from 'viem/chains'

const rpcPrimary = process.env.RPC_URL_PRIMARY
const rpcSecondary = process.env.RPC_URL_SECONDARY
const key = process.env.RELAYER_PRIVATE_KEY as `0x${string}` | undefined
if (!rpcPrimary || !rpcSecondary || !key) throw new Error('RPC_URL_PRIMARY, RPC_URL_SECONDARY and RELAYER_PRIVATE_KEY are required')

const transport = fallback([
  http(rpcPrimary, { timeout: 10_000, retryCount: 2 }),
  http(rpcSecondary, { timeout: 10_000, retryCount: 2 }),
])

export const publicClient = createPublicClient({ chain: mainnet, transport })
export const account = privateKeyToAccount(key)   // prefer a KMS/HSM-backed signer in production
export const walletClient = createWalletClient({ chain: mainnet, transport, account })
```

## Nonce Management

| Strategy | When | Risk |
|----------|------|------|
| Let the node assign (`pending` nonce each send) | Low volume, single process | Races when sends overlap |
| Local nonce manager (in-process) | One process per account | Lost on restart; must resync |
| Database-allocated nonces | Multiple workers per account | Needs gap handling |
| One account per worker | Horizontal scaling | More keys to fund and secure |

viem ships a per-process nonce manager:

```ts
import { nonceManager } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const account = privateKeyToAccount(key, { nonceManager })
```

Database allocation pattern (PostgreSQL):

```sql
CREATE TABLE relayer_nonces (
  address BYTEA PRIMARY KEY,
  next_nonce BIGINT NOT NULL
);
-- allocate atomically
UPDATE relayer_nonces SET next_nonce = next_nonce + 1
WHERE address = $1
RETURNING next_nonce - 1 AS nonce;
```

Gaps: if nonce N is allocated but never broadcast, every later nonce is stuck. On failure before broadcast, either reuse N for the next job or send a 0-value self-transfer at N to fill the gap. On startup, reconcile with `getTransactionCount({ address, blockTag: 'pending' })` and `'latest'`.

## Simulate Before Sending

```ts
import { erc20Abi, parseUnits } from 'viem'

const { request } = await publicClient.simulateContract({
  account,
  address: USDC,
  abi: erc20Abi,
  functionName: 'transfer',
  args: [recipient, parseUnits('25', 6)],
})
const hash = await walletClient.writeContract(request)
```

Simulation catches reverts and returns the prepared request (including gas). It runs against current state; the result can still differ at inclusion time.

## Fees (EIP-1559)

```ts
const { maxFeePerGas, maxPriorityFeePerGas } = await publicClient.estimateFeesPerGas()
```

viem's estimate is roughly `baseFee × multiplier + priority`. For time-sensitive flows, cap `maxFeePerGas` at a business limit and fail loudly rather than overpay. Unused headroom between `maxFeePerGas` and the actual base fee is not charged.

## Waiting for Confirmation

```ts
const receipt = await publicClient.waitForTransactionReceipt({
  hash,
  confirmations: 2,
  timeout: 180_000,
  onReplaced: (r) => {
    // r.reason: 'replaced' | 'repriced' | 'cancelled'
    logger.warn({ old: hash, new: r.transaction.hash, reason: r.reason }, 'tx replaced')
  },
})
if (receipt.status !== 'success') {
  throw new Error(`tx ${hash} reverted in block ${receipt.blockNumber}`)
}
```

A receipt with `status: 'reverted'` still consumed gas and the nonce. For irreversible business actions, wait for the `finalized` tag (see blockchain-core reorg guide).

## Replacing Stuck Transactions

A pending tx with a fee below the market can sit indefinitely. Replace it by re-sending the same nonce with higher fees. Nodes require a minimum bump (geth default 10% on both `maxFeePerGas` and `maxPriorityFeePerGas`).

```ts
async function speedUp(original: { nonce: number; to: `0x${string}`; data: `0x${string}`; value: bigint;
                                   maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }) {
  const bump = (x: bigint) => (x * 125n) / 100n          // 25% to clear the 10% minimum comfortably
  const fees = await publicClient.estimateFeesPerGas()
  return walletClient.sendTransaction({
    ...original,
    maxFeePerGas: fees.maxFeePerGas > bump(original.maxFeePerGas) ? fees.maxFeePerGas : bump(original.maxFeePerGas),
    maxPriorityFeePerGas: bump(original.maxPriorityFeePerGas),
  })
}

// cancel = same nonce, 0 value to self, bumped fees
```

Both the original and replacement may be visible for a while; whichever is mined first wins. Record every hash for a `(from, nonce)` and settle when one is included.

## Idempotency

Jobs are retried. Make sends idempotent:
- Store `job_id → (from, nonce, hashes[])` before broadcasting.
- On retry, if a hash exists, poll it instead of sending again.
- For contract calls, include a unique request ID that the contract rejects if reused when duplicates are harmful (e.g. payouts).

## Error Mapping

| Node error (message varies by client) | Meaning | Action |
|----------------------------------------|---------|--------|
| nonce too low | Nonce already used | Resync nonce; check if your tx was mined |
| replacement transaction underpriced | Bump below minimum | Increase both fee fields more |
| insufficient funds for gas * price + value | Balance too low | Alert, top up relayer |
| intrinsic gas too low / exceeds block gas limit | Bad gas limit | Re-estimate |
| already known | Same tx already in mempool | Treat as sent; track hash |

viem maps common node errors to typed errors such as `NonceTooLowError`, `InsufficientFundsError`, `IntrinsicGasTooLowError` and `FeeCapTooLowError`; unmapped messages surface as the raw RPC error. Walk the cause chain with `err.walk()` (see `reference_guide_4.md`).

## Operational Controls

- Monitor relayer balance and pending count per account; alert on growth.
- Bound concurrency per account (pending txs) to limit blast radius of a stuck nonce.
- Keep keys in KMS/HSM or a remote signer; rotate and limit funds per hot account.
- Log `(job_id, from, nonce, hash, maxFee, priorityFee, status)` for every attempt.

## Checklist

- [ ] Nonces allocated atomically; gaps detected and filled
- [ ] Every write simulated first
- [ ] Fee caps enforced from configuration
- [ ] Receipts checked for `status`; replacements handled
- [ ] Sends idempotent across retries; all hashes per nonce recorded
