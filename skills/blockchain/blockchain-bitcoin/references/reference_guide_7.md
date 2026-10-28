# Bitcoin Development and Testing with Regtest, Signet and Testnet4

How to build and test Bitcoin applications without risking real funds: choosing a test network, scripting regtest for deterministic tests, using signet for integration, Bitcoin Core's functional test framework, and tooling such as Polar and Nigiri.

## Network Choice

| Network | Blocks | Coins | Use |
|---------|--------|-------|-----|
| regtest | Mined on demand by you | Free, local | Unit/integration tests, CI |
| signet (default) | Signed by a central signer, ~10 min | Faucets | Shared integration testing, stable block times |
| Custom signet | Your own signer | Yours | Team-wide staging with controlled reorgs/forks |
| testnet4 (BIP94) | PoW, public | Faucets | Replaced testnet3 (unreliable difficulty resets); behaves more like mainnet |
| mainnet | Real | Real | Production; small canary amounts only for final checks |

Address prefixes: mainnet `bc1`, signet/testnet `tb1`, regtest `bcrt1`. Coin type in derivation paths is `1'` for all test networks.

## Regtest Quick Start

```bash
bitcoind -regtest -daemon -fallbackfee=0.0002 -txindex=1
bitcoin-cli -regtest createwallet dev
ADDR=$(bitcoin-cli -regtest -rpcwallet=dev getnewaddress)
bitcoin-cli -regtest generatetoaddress 101 "$ADDR"     # coinbase needs 100 confirmations to mature
bitcoin-cli -regtest -rpcwallet=dev getbalance
TXID=$(bitcoin-cli -regtest -rpcwallet=dev sendtoaddress "$(bitcoin-cli -regtest -rpcwallet=dev getnewaddress)" 1.5)
bitcoin-cli -regtest generatetoaddress 1 "$ADDR"
bitcoin-cli -regtest -rpcwallet=dev gettransaction "$TXID"
```

`fallbackfee` is needed because regtest has no fee history for estimation.

## Simulating Real-World Conditions

| Scenario | How |
|----------|-----|
| Confirmations | `generatetoaddress N <addr>` |
| Reorg | `invalidateblock <hash>` then mine a competing chain; `reconsiderblock` to undo |
| Time-based locks | `setmocktime <unix>` (regtest only) then mine |
| Mempool eviction / low fees | Start with small `-maxmempool` and flood with transactions |
| RBF | `bumpfee` before mining |
| Two-party flows | Run two nodes, `addnode`/`-connect` to each other |
| Stuck transaction | `prioritisetransaction` locally, or create low-fee tx and don't mine |

## Python Integration Test Harness (pytest)

```python
import subprocess, json, pytest

def cli(*args, wallet=None):
    cmd = ["bitcoin-cli", "-regtest"] + ([f"-rpcwallet={wallet}"] if wallet else []) + list(args)
    out = subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=30).stdout.strip()
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return out

@pytest.fixture
def funded_wallet(tmp_path):
    name = f"w{tmp_path.name}"
    cli("createwallet", name)
    addr = cli("getnewaddress", wallet=name)
    cli("generatetoaddress", "101", addr)
    return name

def test_deposit_is_credited_after_one_confirmation(funded_wallet, deposit_service):
    # Arrange
    deposit_addr = deposit_service.new_address(user_id=42)

    # Act
    txid = cli("sendtoaddress", deposit_addr, "0.25", wallet=funded_wallet)
    cli("generatetoaddress", "1", cli("getnewaddress", wallet=funded_wallet))
    deposit_service.poll()

    # Assert
    assert deposit_service.credited(user_id=42) == 25_000_000
    assert deposit_service.last_txid(user_id=42) == txid

def test_reorged_deposit_is_reversed(funded_wallet, deposit_service):
    deposit_addr = deposit_service.new_address(user_id=7)
    cli("sendtoaddress", deposit_addr, "0.1", wallet=funded_wallet)
    block = cli("generatetoaddress", "1", cli("getnewaddress", wallet=funded_wallet))[0]
    deposit_service.poll()

    cli("invalidateblock", block)          # tx returns to mempool; drop it to simulate double-spend
    deposit_service.poll()

    assert deposit_service.credited(user_id=7) == 0
```

Run bitcoind in a container per CI job, or use a fresh `-datadir` per test session.

## Bitcoin Core Functional Test Framework

For testing node-level behaviour or contributing to Core, `test/functional/` in the Bitcoin Core repo provides `BitcoinTestFramework` with multiple nodes, `generate`, `sync_all`, mocktime and P2P message injection (`P2PInterface`). Use it when you need precise control over P2P messages or policy.

## Tooling

| Tool | Purpose |
|------|---------|
| Polar | GUI to spin up regtest Bitcoin + Lightning (LND, CLN, eclair) networks in Docker |
| Nigiri | CLI regtest box with Bitcoin Core, Electrs, Esplora explorer, faucet command |
| Esplora / mempool (self-hosted) | Explorer on regtest/signet |
| `bitcoin-util grind` / custom signet scripts | Create a custom signet |
| BDK + `electrsd`/`bitcoind` crates | Rust test harnesses that download and run binaries |

## Custom Signet

```ini
# bitcoin.conf
signet=1
[signet]
signetchallenge=5121<33-byte-pubkey>51ae     # 1-of-1 multisig challenge example
addnode=signet-seed.internal:38333
```

The signer mines blocks with `contrib/signet/miner`. A custom signet lets QA teams share a persistent chain with predictable block times.

## Testing Checklist by Feature

| Feature | Must test |
|---------|-----------|
| Deposits | 0/1/N confirmations, reorg reversal, duplicate notifications, RBF-replaced deposit |
| Withdrawals | Fee caps, batching, RBF bump, insufficient funds, address validation per network |
| Address handling | Rejecting mainnet addresses on test networks and vice versa, bech32 vs bech32m |
| Timelocks | Before and after maturity with `setmocktime` |
| PSBT/hardware | Signer rejects modified change, threshold handling |

## Pitfalls

- Testing only on regtest with instant blocks; integration bugs appear with real block times (use signet).
- Hardcoding `tb1` assumptions; regtest uses `bcrt1`.
- Forgetting coinbase maturity (100 blocks).
- Sharing a regtest datadir between parallel CI jobs.
- Using testnet3 for new work; use testnet4 or signet.

## Checklist

- [ ] Regtest harness in CI with fresh state per run
- [ ] Reorg, RBF and fee-spike scenarios covered
- [ ] Network-specific address validation tested
- [ ] Signet (public or custom) used for staging
- [ ] Mainnet canary with minimal amounts before full launch
