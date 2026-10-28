# Bitcoin UTXO Management, Coin Selection and Privacy

Bitcoin wallets hold sets of unspent outputs (UTXOs), not balances. How a wallet picks inputs and creates change determines fees, transaction size, future spendability and how much the transaction graph reveals. This reference covers coin selection algorithms, consolidation, change handling and on-chain privacy for wallet and exchange engineers.

## The UTXO Model

- Each output is spent whole; any excess goes to a change output (or to fees).
- Every input costs vbytes (`reference_guide_1.md`), so many small UTXOs become expensive to spend when fees rise.
- **Effective value** of a UTXO at feerate `r`: `value - r * input_vsize`. If negative, the UTXO is uneconomical at that feerate.

## Coin Selection Algorithms

| Algorithm | Idea | Used by |
|-----------|------|---------|
| Branch and Bound (BnB) | Search for an input set whose effective value matches the target within a cost window, so no change is needed | Bitcoin Core, BDK |
| CoinGrinder | Minimise input weight when fees are high | Bitcoin Core (27.0+) |
| Knapsack | Random-ish approximation of target + change | Bitcoin Core (fallback) |
| Single Random Draw (SRD) | Randomly add UTXOs until target is met | Bitcoin Core, BDK |
| Largest-first | Simple; leaks information, fragments less | Simple custodial systems |

Bitcoin Core runs several algorithms and chooses the result with the lowest **waste**:

```
waste = sum(input_weight * (current_feerate - long_term_feerate)) + cost_of_change (or excess if changeless)
```

At high feerates the waste metric prefers fewer inputs; at low feerates it prefers spending more inputs (cheap consolidation).

## Change Output Rules

- Match change script type to the payment output where possible (a P2TR change next to a P2WPKH payment reveals which output is change).
- Avoid round-number payments plus odd change; prefer changeless (BnB) where possible.
- Never reuse addresses for change; derive from the internal (change) chain.
- If change would be below dust or not worth its future spending cost, add it to the fee instead.

## Consolidation

```bash
# Bitcoin Core: spend many small UTXOs to one address at a low feerate
bitcoin-cli -rpcwallet=hot listunspent 6 9999999 '[]' true '{"maximumAmount":0.001}'
bitcoin-cli -rpcwallet=hot sendall '["bc1q...own"]' '{"fee_rate":2,"inputs":[{"txid":"...","vout":0}, ...]}'
```

- Consolidate during low-fee periods; consolidation links all inputs to one owner (privacy cost).
- For exchanges, consolidate deposit UTXOs per policy (size thresholds, age) and keep a pool of mid-sized UTXOs for withdrawals.
- Keep consolidation transactions under standard size (100 kvB) and hardware wallet limits.

## Batching Withdrawals

- One transaction paying many recipients shares the fixed overhead and a single change output.
- Trade-off: a stuck batch delays everyone in it; ensure you can RBF (you are the sender) and avoid CPFP-dependent receivers.
- Do not batch if recipients need independent confirmation guarantees.

## Privacy Heuristics (what chain analysis assumes)

| Heuristic | Assumption | Mitigation |
|-----------|------------|------------|
| Common-input-ownership | All inputs belong to one entity | Avoid merging unrelated UTXOs; use coin control |
| Change detection | Change is the output with different script type / non-round amount / newly derived address | Matching script types, changeless txs |
| Address reuse | Same address = same owner | Fresh address per payment (BIP32 wallets) |
| Timing and amount correlation | Deposits/withdrawals with matching amounts | Avoid exact pass-through amounts |

## Coin Control and Labels

- Label UTXOs by source (KYC exchange, peer-to-peer, salary) using BIP329 label export so labels survive wallet migrations.
- Freeze dust or unknown UTXOs received unsolicited (dusting attacks try to link addresses when they are merged).
- Bitcoin Core: `lockunspent false '[{"txid":"...","vout":1}]'` prevents automatic selection.

## Collaborative Transactions

- **PayJoin (BIP78, BIP77 v2 async)**: receiver contributes an input, breaking the common-input heuristic and hiding the payment amount.
- **CoinJoin**: many users join inputs and equal-value outputs. Evaluate the legal and exchange-policy context of your jurisdiction and service before integrating; some exchanges flag CoinJoin outputs.
- **Silent Payments (BIP352)**: static reusable payment code; each payment lands at a unique Taproot output without interaction. Requires scanning support from the receiver's wallet.

## Exchange / Custodian UTXO Policy Template

| Policy | Example setting |
|--------|-----------------|
| Deposit addresses | One fresh address per user deposit request |
| Confirmations before credit | Set per amount and risk tier |
| Hot wallet UTXO pool | Target count range and size buckets |
| Consolidation trigger | Feerate below threshold and UTXO count above threshold |
| Max inputs per tx | Bounded to stay under standard size |
| Change type | Same as most common withdrawal type (often P2WPKH or P2TR) |

## Pitfalls

- Spending a dust UTXO received from an unknown sender together with your main coins.
- Fragmenting a wallet into thousands of small UTXOs through many small deposits, then hitting a fee spike.
- Address reuse for "convenience" (static deposit addresses for many users).
- Ignoring effective value: including inputs that cost more to spend than they contribute.

## Checklist

- [ ] Coin selection uses waste/effective value, not largest-first, for user wallets
- [ ] Change type matches payment type; no address reuse
- [ ] Consolidation scheduled for low-fee windows with size limits
- [ ] UTXO labels exported (BIP329); unknown dust frozen
- [ ] Batching strategy and RBF policy defined for withdrawals
