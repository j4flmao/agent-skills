# Bitcoin Fees, Mempool Policy, RBF, CPFP and Package Relay

How fees work in practice: fee estimation, Bitcoin Core mempool policy, fee bumping with Replace-By-Fee (RBF) and Child-Pays-For-Parent (CPFP), and newer relay features (TRUC/v3 transactions, package relay, ephemeral anchors). Consensus has no fee rules beyond "inputs >= outputs"; everything here is node policy, which can differ between nodes and versions.

## Fee Fundamentals

```
fee      = sum(inputs) - sum(outputs)
feerate  = fee / vsize          (sat/vB)
```

Miners maximise fees per block weight. They select by **ancestor (package) feerate**, so a low-fee parent can be pulled in by a high-fee child.

## Fee Estimation

```bash
bitcoin-cli estimatesmartfee 6               # target 6 blocks, returns BTC/kvB
bitcoin-cli estimatesmartfee 2 economical
bitcoin-cli getmempoolinfo                   # mempoolminfee, minrelaytxfee
```

- `estimatesmartfee` returns BTC per kvB; convert: `sat/vB = BTC/kvB * 100_000`.
- Estimates lag sudden mempool spikes. For time-critical transactions, sign at a conservative rate and keep the ability to bump.
- External estimators (mempool.space API) help, but treat them as untrusted input and cap the maximum fee in code.

## Key Policy Defaults (Bitcoin Core)

| Policy | Default | Notes |
|--------|---------|-------|
| `minrelaytxfee` / `incrementalrelayfee` | 0.1 sat/vB since Core 29.1 (was 1 sat/vB) | Wallet `-mintxfee` unchanged; older nodes still use 1 sat/vB |
| Mempool size `maxmempool` | 300 MB | Low-fee txs evicted when full; `mempoolminfee` rises |
| Mempool expiry | 336 hours (2 weeks) | |
| Ancestor/descendant limits | 25 txs / 101 kvB | Being replaced by cluster limits in cluster-mempool releases |
| `mempoolfullrbf` | Enabled by default since Core 28.0 | Opt-in signalling no longer required on most nodes |
| Max standard tx weight | 400,000 WU | |
| Dust | depends on output type and dust relay fee (3 sat/vB) | P2WPKH dust ~294 sats, P2TR ~330 sats |

Policy changes between releases; confirm with `bitcoin-cli getnetworkinfo` and the release notes of the version you run.

## Replace-By-Fee (BIP125 rules, as implemented)

A replacement must:
1. Spend at least one of the same inputs as the original.
2. Pay a higher absolute fee than all transactions it evicts combined.
3. Pay for its own bandwidth: `new_fee - old_fees >= incremental_relay_feerate * new_vsize`.
4. Not evict more than 100 transactions.
5. Have a higher feerate than the originals it directly replaces.

With full-RBF default, unconfirmed transactions should be treated as replaceable regardless of the BIP125 signal (`nSequence < 0xfffffffe`). Zero-confirmation acceptance is unsafe.

```bash
bitcoin-cli -rpcwallet=w bumpfee <txid> '{"fee_rate": 25}'     # sat/vB
bitcoin-cli -rpcwallet=w psbtbumpfee <txid>                    # watch-only / hardware wallet flow
```

## Child-Pays-For-Parent

If you control an output of a stuck transaction (recipient or change), spend it with a high-fee child:

```
child_fee >= target_rate * (parent_vsize + child_vsize) - parent_fee
```

Limits: descendant limits can block CPFP when an attacker attaches many children (pinning); the CPFP carve-out exists for two-party contracts.

## Pinning (why protocols care)

Transaction pinning makes a counterparty's transaction hard to replace or bump, e.g. by attaching a large low-feerate child (rule 3 makes replacement expensive) or by filling descendant limits. It matters for Lightning and other contracts with timelocks. Mitigations are the newer policies below.

## TRUC / v3 Transactions (BIP431)

Available in Bitcoin Core 28.0+ policy:
- Transaction `version = 3` opts in.
- An unconfirmed v3 transaction can have at most one unconfirmed child, and the child must be at most 1,000 vB.
- v3 transactions are always replaceable (no signalling needed).
- Sibling eviction: a new child can replace an existing child of the same parent.

These bounds make pinning by large descendants impossible.

## Package Relay and 1P1C

- Core 28.0 relays **one-parent-one-child (1P1C)** packages: a parent below the mempool minimum feerate can enter together with a fee-paying child.
- `submitpackage` RPC accepts a package locally:

```bash
bitcoin-cli submitpackage '["<parent_hex>", "<child_hex>"]'
```

- Package RBF lets a 1P1C package replace another package when both are in clusters of size 2 or less.

## Ephemeral Anchors / Pay-to-Anchor (P2A)

- `P2A` is a keyless anchor output (`OP_1 <0x4e73>`) any party can spend to CPFP.
- Ephemeral dust: a zero-fee v3 parent may carry one dust output (such as a 0-value anchor) if it is spent by a child in the same package.
- Used by Lightning commitment formats and other contract protocols so either party can bump fees without pre-committing feerates.

## Fee Strategy Checklist for Services

- Batch withdrawals: one transaction with many outputs saves the per-tx overhead and change outputs.
- Consolidate UTXOs during low-fee periods (see `reference_guide_6.md`).
- Always create a change output you control, so CPFP is possible.
- Cap fee rate and absolute fee in code to prevent fee-sniping bugs and malformed estimator data from overpaying.
- Monitor stuck transactions; automate bumps with RBF (sender) or CPFP (receiver).
- Do not credit deposits before the confirmations your risk policy requires.

## Pitfalls

| Pitfall | Effect |
|---------|--------|
| Treating `estimatesmartfee` output as sat/vB | Fees 100,000x off |
| Using total size instead of vsize | Overpaying on SegWit inputs |
| Accepting 0-conf payments | Double-spend risk under full-RBF |
| Spending all change in long unconfirmed chains | Hits descendant limits; CPFP fails |
| Hardcoded policy assumptions | Breaks across Core versions |
