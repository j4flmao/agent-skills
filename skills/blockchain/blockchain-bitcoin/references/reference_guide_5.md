# Bitcoin Core Node Operations and RPC Integration

Running Bitcoin Core as infrastructure for an application (exchange, wallet backend, indexer): configuration, storage modes, RPC authentication, ZMQ notifications, monitoring and upgrade practice. Internal architecture of Core is in `bitcoin-core-deep.md`.

## Deployment Modes

| Mode | Setting | Disk | Supports |
|------|---------|------|----------|
| Full archival | default | Full chain (hundreds of GB and growing) | Everything, including rescans from genesis |
| Pruned | `prune=N` (MB, minimum 550) | ~N MB of blocks + chainstate | Validation, wallet; no old block serving, limited rescans |
| Archival + `txindex=1` | | Extra index | `getrawtransaction` for any txid |
| `blockfilterindex=1` | | Compact filters (BIP158) | Light-client serving (`peerblockfilters=1`), fast wallet rescans |
| `coinstatsindex=1` | | | `gettxoutsetinfo` quickly for any height |
| assumeutxo | `loadtxoutset` snapshot | | Usable quickly; background validation of history continues |

Indexers (Electrs, Fulcrum, mempool backend) usually need an unpruned node and often `txindex`.

## bitcoin.conf Example (service backend)

```ini
# network
server=1
listen=1
# regtest=1 / signet=1 / testnet4=1 for non-mainnet (sections [main], [test], [signet], [regtest], [testnet4])

# storage
txindex=1
blockfilterindex=1
dbcache=4000          # MB of UTXO cache; larger speeds IBD, release after sync

# RPC
rpcbind=127.0.0.1
rpcallowip=127.0.0.1
rpcauth=appuser:<salt>$<hash>    # generated with share/rpcauth/rpcauth.py
rpcworkqueue=64
rpcthreads=8

# ZMQ notifications
zmqpubrawblock=tcp://127.0.0.1:28332
zmqpubrawtx=tcp://127.0.0.1:28333
zmqpubhashblock=tcp://127.0.0.1:28334
zmqpubsequence=tcp://127.0.0.1:28336

# privacy / networking
# proxy=127.0.0.1:9050   # route through Tor
# onlynet=onion
maxconnections=40
```

## RPC Authentication

| Method | Use |
|--------|-----|
| Cookie file (`.cookie` in datadir) | Default; local processes running as the same user |
| `rpcauth=user:salt$hash` | Multiple users, no plaintext password in config |
| `rpcuser`/`rpcpassword` | Deprecated style; avoid |
| `rpcwhitelist=user:method1,method2` | Restrict which RPCs a user may call |

Never expose port 8332 to the internet. RPC is plain HTTP; put it behind localhost, a private network, or an authenticated TLS proxy.

## Calling RPC

```bash
bitcoin-cli -rpcwallet=hot getbalances
curl --user appuser --data-binary \
  '{"jsonrpc":"2.0","id":"1","method":"getblockchaininfo","params":[]}' \
  -H 'content-type: application/json' http://127.0.0.1:8332/
```

Recent versions accept JSON-RPC 2.0 requests (`"jsonrpc":"2.0"`), which return proper HTTP status codes and omit `error: null` noise.

```python
import requests

def rpc(method: str, params: list | None = None, wallet: str | None = None):
    url = "http://127.0.0.1:8332/" + (f"wallet/{wallet}" if wallet else "")
    r = requests.post(
        url,
        json={"jsonrpc": "2.0", "id": method, "method": method, "params": params or []},
        auth=(RPC_USER, RPC_PASSWORD),     # load from env/secret store
        timeout=(3.05, 30),
    )
    body = r.json()
    if body.get("error"):
        raise RuntimeError(f"RPC {method} failed: {body['error']}")
    return body["result"]
```

## Useful RPCs for Services

| Task | RPC |
|------|-----|
| Sync status | `getblockchaininfo` (`initialblockdownload`, `verificationprogress`) |
| Peers/network | `getnetworkinfo`, `getpeerinfo` |
| Mempool | `getmempoolinfo`, `getrawmempool true`, `getmempoolentry` |
| Fee estimate | `estimatesmartfee` |
| Deposit detection | `listsinceblock <blockhash>` (handles reorgs), `gettransaction` |
| Policy test | `testmempoolaccept` |
| Broadcast | `sendrawtransaction` (set `maxfeerate` guard) |
| UTXO lookup | `gettxout`, `scantxoutset` |

## Deposit Detection Pattern

1. Subscribe to `zmqpubsequence` / `rawblock` for fast wakeups; ZMQ is lossy, so never rely on it alone.
2. Periodically call `listsinceblock <last_processed_hash>` on the wallet and process `transactions` and `removed` (reorged) entries.
3. Credit only after N confirmations per your risk policy; reorg-handling must be able to reverse unconfirmed or shallow credits.
4. Persist the last processed block hash (not height) to detect reorgs.

## Monitoring

- Health: block height vs peers/explorer, `verificationprogress`, mempool size, number of peers (inbound/outbound), disk free.
- Prometheus exporters exist (community `bitcoin-prometheus-exporter`); or scrape RPC.
- Alert on: no new block for > 60 minutes (possible but rare; correlate with network), `warnings` field in `getblockchaininfo`/`getnetworkinfo`, RPC latency, disk > 80%.

## Upgrades

- Read release notes for policy and RPC changes (e.g. default relay fee changes, wallet removals).
- Major versions are supported for a limited period; stay on maintained releases.
- Verify release signatures (`SHA256SUMS` + `SHA256SUMS.asc` signed by builders' keys) before installing.
- Stop with `bitcoin-cli stop`, never kill -9 during writes; back up wallets first.
- Test on signet/regtest with your integration suite before mainnet rollout.

## Hardening

- Run as a dedicated unprivileged user; systemd unit with `ProtectSystem=full`, `PrivateTmp=true`, `NoNewPrivileges=true`.
- Separate hot wallet node from public-facing infrastructure; keep large balances in cold storage.
- Firewall: allow 8333 (P2P) if serving peers; never 8332 (RPC) or ZMQ ports publicly.
- Back up wallet files with `backupwallet` and descriptors; encrypt wallets (`encryptwallet`).

## Checklist

- [ ] Storage mode matches the workload (txindex/filters for indexers)
- [ ] RPC bound to localhost/private network with `rpcauth` and method whitelist
- [ ] Deposit processing uses `listsinceblock` with reorg handling; ZMQ only as trigger
- [ ] `maxfeerate` guard on broadcasts
- [ ] Release signatures verified; upgrade tested on signet
- [ ] Monitoring of height, peers, mempool, disk
