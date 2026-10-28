# Ethereum Transaction Types, Encoding and Lifecycle

How Ethereum transactions are typed, encoded, signed, priced and processed, from wallet signing through the mempool to inclusion and finality. Fee-market math for EIP-1559 and EIP-4844 is summarized; deeper EIP rationale is in the EIP deep-dive reference.

## Typed Transaction Envelope (EIP-2718)

A typed transaction is `TransactionType || TransactionPayload`, where the type is a single byte below `0x7f`. Legacy transactions are RLP lists starting with a byte at or above `0xc0`.

| Type | EIP | Fork | Key fields |
|---|---|---|---|
| `0x00` legacy | (EIP-155 replay protection) | Frontier / Spurious Dragon | `nonce, gasPrice, gasLimit, to, value, data, v, r, s` |
| `0x01` access list | EIP-2930 | Berlin | adds `chainId`, `accessList` |
| `0x02` dynamic fee | EIP-1559 | London | `maxPriorityFeePerGas`, `maxFeePerGas` replace `gasPrice` |
| `0x03` blob | EIP-4844 | Cancun (Dencun) | `maxFeePerBlobGas`, `blobVersionedHashes`; `to` must be non-null |
| `0x04` set code | EIP-7702 | Prague (Pectra) | `authorizationList` of signed delegations for EOAs |

### Type 2 payload
```
0x02 || rlp([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit,
             to, value, data, accessList, signatureYParity, signatureR, signatureS])
```
The signature covers `keccak256(0x02 || rlp([...fields without signature]))`.

### Type 4 (EIP-7702) authorization
```
authorization = [chainId, address, nonce, yParity, r, s]
signed over keccak256(0x05 || rlp([chainId, address, nonce]))
```
After inclusion, the EOA's code is set to the delegation designator `0xef0100 || address`, so calls to the EOA execute the delegate contract's code in the EOA's context. `chainId = 0` authorizations are valid on any chain, which makes them replayable across chains; wallets should avoid them.

## Gas and Fees

### EIP-1559 (execution gas)
- Each block has `baseFeePerGas`, burned. It moves by up to 12.5% per block toward the gas target (half the gas limit).
- Effective tip = `min(maxPriorityFeePerGas, maxFeePerGas - baseFee)`.
- Effective gas price = `baseFee + effective tip`. Sender pays `gasUsed * effectiveGasPrice`; unused gas up to `gasLimit` is not charged.
- Transaction is includable only if `maxFeePerGas >= baseFee`.

### EIP-4844 (blob gas)
- Separate fee market: each blob is 131,072 bytes and uses 131,072 blob gas (`GAS_PER_BLOB = 2^17`).
- Blob base fee adjusts exponentially from `excess_blob_gas`; blob gas is burned.
- Blob counts per block are configured per fork: Cancun target 3 / max 6; Pectra (EIP-7691) target 6 / max 9; Fusaka BPO forks raised to 10/15 (BPO1, December 2025) and 14/21 (BPO2, January 2026).
- Fusaka EIP-7918 sets a reserve price so the blob base fee cannot fall far below the execution cost of including blobs.
- Blob data is not accessible to the EVM; only versioned hashes are (`BLOBHASH` opcode). Blobs are pruned by consensus nodes after about 18 days (4096 epochs).

### Intrinsic gas and limits
- Base cost 21,000; calldata cost per byte (4 zero / 16 non-zero), with EIP-7623 (Pectra) applying a higher floor price for data-heavy transactions.
- Contract creation adds 32,000 plus initcode word cost (EIP-3860, initcode max 49,152 bytes).
- Access list entries: 2,400 per address and 1,900 per storage key.
- Fusaka EIP-7825 caps a single transaction's gas limit at 2^24 (16,777,216).

## Nonces and Replacement
- Nonces are per sender and strictly sequential; a gap blocks later transactions.
- Replace a pending transaction by re-sending the same nonce with higher fees; most clients require at least a 10% bump in both `maxFeePerGas` and `maxPriorityFeePerGas` (blob transactions in geth require a larger bump).
- Cancel = replace with a zero-value self-transfer at the same nonce.

## Lifecycle

```
wallet builds + signs
  -> eth_sendRawTransaction to a node or private relay
  -> txpool validation: signature, chainId, nonce, balance >= gasLimit*maxFee + value (+ blob fees), size limits
  -> gossip over devp2p (eth/68+ announces hashes; blob txs are fetched on demand)
  -> builder selects by effective tip / bundle value (MEV-Boost) or local block building
  -> included in execution payload; receipt produced (status 1 or 0)
  -> block attested; becomes "safe" when justified, "finalized" after FFG finalization
```

Reorg risk: inclusion in `latest` is not final. Confirm against `finalized` for high-value settlement.

## Signing in Code (viem)
```ts
import { createWalletClient, http, parseEther, parseGwei } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const client = createWalletClient({ account, chain: mainnet, transport: http(process.env.RPC_URL) });

const hash = await client.sendTransaction({
  to: "0x000000000000000000000000000000000000dEaD",
  value: parseEther("0.01"),
  maxPriorityFeePerGas: parseGwei("1"),
  maxFeePerGas: parseGwei("30"),
});
```
Keys come from a secret manager or hardware wallet; never hard-code them.

## Inspecting with Foundry cast
```bash
cast tx <hash> --rpc-url $RPC_URL               # decoded fields including type
cast receipt <hash> --rpc-url $RPC_URL           # status, gasUsed, effectiveGasPrice, logs
cast decode-transaction 0x02f8...                # decode raw signed tx
cast run <hash> --rpc-url $RPC_URL               # re-execute locally with traces
```

## Receipt Fields to Check
| Field | Meaning |
|---|---|
| `status` | `0x1` success, `0x0` reverted (gas still charged) |
| `gasUsed`, `effectiveGasPrice` | Actual cost |
| `blobGasUsed`, `blobGasPrice` | Blob cost for type-3 |
| `logs` | Events emitted (none on revert) |
| `contractAddress` | Set for creations |

## Pitfalls
- Using legacy `gasPrice` on EIP-1559 chains, overpaying or getting stuck.
- Setting `maxFeePerGas` too close to current base fee during congestion.
- Ignoring `chainId` checks, enabling replay across chains.
- Treating `status = 1` in `latest` as final.
- Signing EIP-7702 authorizations to untrusted delegate contracts: the delegate controls the account.

## Checklist
- [ ] Correct type chosen (2 for normal, 3 for blobs, 4 only with audited delegates)
- [ ] Fees from `eth_feeHistory` with headroom
- [ ] Nonce management centralized per sender
- [ ] Replacement/cancel logic tested
- [ ] Finality level defined for each business action
