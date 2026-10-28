# Solana Transaction Construction and Landing

Client-side reference for getting Solana transactions included reliably: transaction anatomy, versioned transactions and address lookup tables, compute budget and priority fees, blockhash expiry and durable nonces, commitment levels, retry strategy, and simulation. Examples use `@solana/web3.js` 1.x (maintenance mode; `@solana/kit` is the successor with a functional API) and the Solana CLI.

## Transaction Anatomy

| Part | Notes |
|------|-------|
| Signatures | Ed25519, one per required signer; the first signer is the fee payer |
| Message header | Counts of signed/read-only accounts |
| Account keys | All accounts referenced, ordered writable-signers first |
| Recent blockhash | Expires after about 150 blocks (roughly a minute or two) |
| Instructions | Program ID index, account indexes, data |
| Address table lookups (v0) | Extra accounts loaded from lookup tables |

Hard limit: a serialized transaction must fit in 1,232 bytes (IPv6 MTU minus headers). That limit, not compute, is often what forces lookup tables or splitting.

## Versioned Transactions and Lookup Tables

```ts
import {
  AddressLookupTableProgram, Connection, Keypair, PublicKey,
  TransactionMessage, VersionedTransaction,
} from '@solana/web3.js'

const connection = new Connection(process.env.SOLANA_RPC_URL!, 'confirmed')

// create + extend a lookup table (once)
const slot = await connection.getSlot()
const [createIx, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
  authority: payer.publicKey, payer: payer.publicKey, recentSlot: slot,
})
const extendIx = AddressLookupTableProgram.extendLookupTable({
  lookupTable: lookupTableAddress, authority: payer.publicKey, payer: payer.publicKey,
  addresses: frequentlyUsedAccounts,
})

// later: use it in a v0 message
const lut = (await connection.getAddressLookupTable(lookupTableAddress)).value
if (!lut) throw new Error(`lookup table ${lookupTableAddress.toBase58()} not found`)

const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
const message = new TransactionMessage({
  payerKey: payer.publicKey,
  recentBlockhash: blockhash,
  instructions,
}).compileToV0Message([lut])

const tx = new VersionedTransaction(message)
tx.sign([payer])
```

Newly extended addresses become usable after the next slot; signers cannot come from a lookup table.

## Compute Budget and Priority Fees

| Instruction | Effect |
|-------------|--------|
| `SetComputeUnitLimit(units)` | Caps compute units for the transaction (default 200,000 per instruction, max 1.4M per transaction) |
| `SetComputeUnitPrice(microLamports)` | Priority fee per compute unit |

Priority fee paid = `compute unit limit × price (micro-lamports) / 1,000,000` lamports, so set the limit close to actual usage: the fee is charged on the requested limit, not on units consumed.

```ts
import { ComputeBudgetProgram } from '@solana/web3.js'

// 1) simulate to measure units
const sim = await connection.simulateTransaction(draftTx, { sigVerify: false, replaceRecentBlockhash: true })
if (sim.value.err) throw new Error(`simulation failed: ${JSON.stringify(sim.value.err)} logs=${sim.value.logs?.join('\n')}`)
const units = Math.ceil((sim.value.unitsConsumed ?? 200_000) * 1.1)

// 2) choose a price from recent fees for the accounts you write
const recent = await connection.getRecentPrioritizationFees({ lockedWritableAccounts: writableAccounts })
const sorted = recent.map((f) => f.prioritizationFee).sort((a, b) => a - b)
const price = sorted.length ? sorted[Math.floor(sorted.length * 0.75)] : 0

const budgetIxs = [
  ComputeBudgetProgram.setComputeUnitLimit({ units }),
  ComputeBudgetProgram.setComputeUnitPrice({ microLamports: price }),
]
```

Fees depend on contention for the specific writable accounts (local fee markets), so query fees for the accounts your transaction writes. Many RPC providers offer their own priority-fee estimation APIs.

## Blockhash Expiry and Confirmation

```ts
const signature = await connection.sendRawTransaction(tx.serialize(), {
  skipPreflight: false,
  maxRetries: 0,                    // we handle rebroadcast ourselves
})

const result = await connection.confirmTransaction(
  { signature, blockhash, lastValidBlockHeight },
  'confirmed',
)
if (result.value.err) throw new Error(`tx ${signature} failed: ${JSON.stringify(result.value.err)}`)
```

| Commitment | Meaning | Use |
|------------|---------|-----|
| `processed` | Seen by the node in a block, may be on a minority fork | UI hints only |
| `confirmed` | Voted by a supermajority (optimistic confirmation) | Most app flows |
| `finalized` | Rooted, 31+ confirmed blocks built on top | Exchanges, bridges, irreversible actions |

### Rebroadcast loop
Until the blockhash expires (`blockHeight > lastValidBlockHeight`), resend the same signed bytes every couple of seconds; the same signature cannot execute twice. After expiry, the transaction can never land: rebuild with a new blockhash and sign again.

```ts
async function sendWithRebroadcast(raw: Uint8Array, lastValidBlockHeight: number): Promise<string> {
  const sig = await connection.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 })
  while (true) {
    const status = (await connection.getSignatureStatuses([sig])).value[0]
    if (status?.err) throw new Error(`tx ${sig} failed: ${JSON.stringify(status.err)}`)
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') return sig
    if ((await connection.getBlockHeight('confirmed')) > lastValidBlockHeight) {
      throw new Error(`blockhash expired before ${sig} landed; rebuild and re-sign`)
    }
    await connection.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 })
    await new Promise((r) => setTimeout(r, 2_000))
  }
}
```

Before re-signing with a new blockhash, check whether the old signature landed late to avoid double execution of non-idempotent actions.

## Durable Nonces

For transactions signed offline or by slow multisig processes, replace the recent blockhash with a durable nonce:

```bash
solana-keygen new -o nonce-account.json --no-bip39-passphrase
solana create-nonce-account nonce-account.json 0.0015 --nonce-authority ~/.config/solana/id.json
solana nonce nonce-account.json
```

- The first instruction must be `AdvanceNonceAccount` (`SystemProgram.nonceAdvance`), and the message's blockhash field holds the stored nonce value.
- The transaction stays valid until the nonce is advanced, so guard nonce authority keys carefully: a pre-signed transaction remains executable indefinitely.

## Simulation and Preflight

- Preflight (`skipPreflight: false`) simulates against the RPC node's view before forwarding; it catches errors early but adds latency and uses the node's commitment.
- Read `logs` and `unitsConsumed` from simulation; decode program errors (`InstructionError: [index, { Custom: n }]`) with the program's IDL.
- `replaceRecentBlockhash: true` lets you simulate unsigned drafts.

## Failure Causes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Blockhash not found` | Stale blockhash or node behind | Fetch fresh blockhash from the same RPC; use `confirmed` commitment |
| Never lands, no error | Low priority fee during congestion, dropped by leaders | Raise price, rebroadcast, use staked RPC connections (SWQoS) |
| `exceeded CUs meter` | Compute limit too low | Simulate and set limit with margin |
| `Transaction too large` | > 1,232 bytes | Lookup tables, fewer instructions, split |
| `AccountInUse` / lock contention | Hot writable accounts | Shard state, reduce writable accounts |
| `InsufficientFundsForRent` | New account below rent-exempt minimum | `getMinimumBalanceForRentExemption` |

## Checklist

- [ ] v0 transactions with lookup tables when account count is high
- [ ] Compute limit from simulation with margin; priority price from recent fees on written accounts
- [ ] Rebroadcast same bytes until `lastValidBlockHeight`; rebuild only after expiry and a final status check
- [ ] Commitment chosen per action (`finalized` for irreversible effects)
- [ ] Durable nonces only with tightly controlled authority
- [ ] Simulation logs captured for diagnostics
