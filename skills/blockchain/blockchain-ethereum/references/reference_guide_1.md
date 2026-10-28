# Ethereum JSON-RPC and Engine API Reference

Two APIs connect the pieces of an Ethereum node: the public **execution JSON-RPC API** used by wallets, dapps and indexers, and the authenticated **Engine API** used by the consensus client to drive the execution client. This guide covers both, with block tags, common methods, error handling and operational limits.

## Node Topology

```
 dapps / wallets / indexers
          |  JSON-RPC (HTTP :8545, WS :8546)
          v
 Execution client (geth, reth, Nethermind, Erigon, Besu)
          ^  Engine API (HTTP :8551, JWT-authenticated)
          |
 Consensus client (Lighthouse, Prysm, Teku, Nimbus, Lodestar, Grandine)
          |  Beacon API (HTTP :5052 / :3500 / :5051 depending on client)
          v
 validator clients, staking tools, light clients
```

## Block Tags

| Tag | Meaning |
|---|---|
| `latest` | Head of the canonical chain as seen by this node (can reorg) |
| `pending` | Client-specific view including mempool; avoid for correctness |
| `safe` | Block justified by the consensus layer; reorg very unlikely |
| `finalized` | Finalized by Casper FFG (about two epochs, roughly 13 minutes, behind head in normal conditions) |
| `earliest` | Genesis (or earliest available block on pruned nodes) |
| `0x...` | Explicit block number; or use EIP-1898 `{ "blockHash": "0x..." }` object |

Indexers and bridges should read `finalized` (or `safe` with reorg handling); UIs may show `latest`.

## Core Read Methods

| Method | Use |
|---|---|
| `eth_chainId` | Chain ID (EIP-155); check before signing |
| `eth_blockNumber` | Latest block number |
| `eth_getBlockByNumber` / `ByHash` | Block header and transactions (`true` for full objects) |
| `eth_getTransactionByHash` | Transaction fields |
| `eth_getTransactionReceipt` | Status, gas used, logs, effective gas price, blob gas fields |
| `eth_getBalance`, `eth_getCode`, `eth_getStorageAt`, `eth_getTransactionCount` | Account state at a block |
| `eth_call` | Execute a call without a transaction; supports state overrides (third parameter) in major clients |
| `eth_estimateGas` | Gas estimate by binary search over execution |
| `eth_getLogs` | Logs filtered by block range, address, topics |
| `eth_getProof` | Merkle proofs for account and storage (EIP-1186) |
| `eth_feeHistory` | Base fee and reward percentiles for fee estimation |
| `eth_maxPriorityFeePerGas` | Client suggestion for tip |
| `eth_blobBaseFee` | Current blob base fee (EIP-4844) |
| `eth_simulateV1` | Multi-block, multi-call simulation with state and block overrides (supported by major clients) |
| `eth_config` | Fork configuration of the node (EIP-7910, added around Fusaka) |

### Example: call with state override
```bash
curl -s -X POST localhost:8545 -H 'content-type: application/json' --data '{
  "jsonrpc":"2.0","id":1,"method":"eth_call",
  "params":[
    {"to":"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48","data":"0x70a08231000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045"},
    "finalized"
  ]}'
```

### Example: fee estimation with feeHistory
```bash
cast rpc eth_feeHistory 20 latest '[10,50,90]'
```
Typical EIP-1559 strategy: `maxPriorityFeePerGas` = median of recent 50th-percentile rewards; `maxFeePerGas` = `2 * nextBaseFee + maxPriorityFeePerGas` to survive several full blocks.

## Write Methods
- `eth_sendRawTransaction`: submit a signed, RLP/typed-encoded transaction. Nodes never need private keys.
- `eth_sendRawTransactionSync` and private/bundle endpoints (`eth_sendBundle`, `eth_sendPrivateTransaction`) are provider or builder extensions, not part of the core spec.
- Do not use `eth_sendTransaction`/`personal_*` with keys stored in the node on public infrastructure.

## Subscriptions (WebSocket)
```json
{"jsonrpc":"2.0","id":1,"method":"eth_subscribe","params":["newHeads"]}
{"jsonrpc":"2.0","id":2,"method":"eth_subscribe","params":["logs",{"address":"0x...","topics":["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]}]}
```
Subscriptions emit removed logs (`"removed": true`) on reorgs; consumers must handle them.

## eth_getLogs Limits
- Providers cap range and result size (often a few thousand blocks or 10,000 results); split queries by block range and back off on "query returned more than N results".
- Filter by `address` and `topics[0]` whenever possible; topic arrays are OR within a position, AND across positions.
- Pre-Merge-era style filters (`eth_newFilter`) are stateful and expire; prefer stateless `eth_getLogs` loops for indexing.

## Errors

| Code | Meaning |
|---|---|
| `-32700` | Parse error |
| `-32600` | Invalid request |
| `-32601` | Method not found (often disabled namespace) |
| `-32602` | Invalid params |
| `-32603` | Internal error |
| `-32000` | Generic server error: "nonce too low", "insufficient funds", "replacement transaction underpriced", "max fee per gas less than block base fee" |
| `3` | Execution reverted, `data` holds revert payload (ABI-encoded `Error(string)`, `Panic(uint256)` or custom error) |

Revert data decoding: selector `0x08c379a0` = `Error(string)`, `0x4e487b71` = `Panic(uint256)`.

## Debug and Trace Namespaces
- `debug_traceTransaction`, `debug_traceCall` with tracers (`callTracer`, `prestateTracer`, custom JS tracers in geth); `trace_*` (Parity-style) in Erigon, Nethermind and reth.
- Expensive and need archive or recent state; never expose publicly without auth and rate limits.

## Engine API (EL <-> CL)

Authenticated with a shared 32-byte hex secret (JWT HS256, `iat` claim within about 60 s):
```bash
openssl rand -hex 32 > /secrets/jwt.hex
geth --authrpc.addr 127.0.0.1 --authrpc.port 8551 --authrpc.jwtsecret /secrets/jwt.hex
lighthouse bn --execution-endpoint http://127.0.0.1:8551 --execution-jwt /secrets/jwt.hex
```

| Method family | Role |
|---|---|
| `engine_newPayloadV*` | CL hands a new execution payload to EL for validation; returns `VALID`, `INVALID`, `SYNCING` or `ACCEPTED` |
| `engine_forkchoiceUpdatedV*` | CL sets head, safe and finalized hashes; optionally starts payload building with `payloadAttributes` |
| `engine_getPayloadV*` | Proposer retrieves the built payload (plus blobs bundle and block value) |
| `engine_getBlobsV*` | CL fetches blobs from the EL mempool (speeds up blob propagation) |
| `engine_exchangeCapabilities` | Negotiate supported methods |

Version suffixes increase with forks (for example V3 for Cancun blobs, V4 for Prague execution requests); clients must use the version matching the active fork.

## Operational Guidance
- Bind JSON-RPC to localhost or a private network; put a reverse proxy with auth, rate limits and method allow-lists in front.
- Disable `admin`, `debug`, `personal`, `txpool` namespaces on public endpoints.
- Use separate nodes for heavy tracing and for latency-sensitive reads.
- For multi-provider setups, compare block hashes across providers before trusting data.

## Checklist
- [ ] Correct block tag per use case (`finalized` for irreversible actions)
- [ ] Reorg handling for logs and subscriptions
- [ ] `eth_getLogs` range splitting and retries with backoff
- [ ] Revert data decoded and surfaced
- [ ] Engine API only on localhost/private network with JWT
- [ ] Dangerous namespaces disabled publicly
