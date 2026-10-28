# Bitcoin Timelocks: nLockTime, nSequence, CLTV and CSV

Bitcoin has four timelock mechanisms, two absolute and two relative, each at the transaction level and the script level. They underpin Lightning, vaults, inheritance schemes, HTLCs and fee-sniping protection. This reference gives the exact encoding rules and the interactions that commonly break.

## Overview

| Mechanism | Level | Type | Defined in | Enforced by |
|-----------|-------|------|------------|-------------|
| `nLockTime` | Transaction | Absolute | Original protocol, BIP113 (median time past) | Tx cannot be mined before the height/time |
| `OP_CHECKLOCKTIMEVERIFY` (CLTV) | Script | Absolute | BIP65 | Output cannot be spent before height/time |
| `nSequence` relative lock | Transaction input | Relative | BIP68 | Input cannot be mined until N blocks/time after its prevout confirmed |
| `OP_CHECKSEQUENCEVERIFY` (CSV) | Script | Relative | BIP112 | Output cannot be spent until N blocks/time after it confirmed |

Script-level opcodes do not enforce time themselves: they verify that the spending transaction's `nLockTime` / `nSequence` carries an appropriate value, and the transaction-level rule then enforces it.

## Absolute: nLockTime

- `nLockTime < 500,000,000`: interpreted as a block height. Otherwise: Unix timestamp.
- Time locks compare against **median time past (MTP)** of the last 11 blocks (BIP113), which lags wall-clock time by roughly an hour.
- `nLockTime` is only enforced if at least one input has `nSequence != 0xffffffff`.

### Anti-Fee-Sniping

Wallets set `nLockTime` to the current block height (sometimes randomly a few blocks lower), so a miner gains nothing by re-mining the previous block to steal its fees. Bitcoin Core does this by default.

## Absolute: CLTV (BIP65)

```
<expiry> OP_CHECKLOCKTIMEVERIFY OP_DROP <pubkey> OP_CHECKSIG
```

CLTV fails unless:
- the stack top is non-negative,
- it is the same type (height vs time) as the transaction's `nLockTime`,
- `nLockTime >= expiry`,
- the input's `nSequence != 0xffffffff`.

Miniscript: `after(n)`.

## Relative: nSequence (BIP68)

Applies only when transaction `version >= 2` and bit 31 (disable flag) is clear.

```
bit 31 (1 << 31): disable flag   -> if set, no relative lock
bit 22 (1 << 22): type flag      -> 0 = blocks, 1 = time in units of 512 seconds
bits 0-15:        value          -> up to 65535 blocks or 65535 * 512 s (~388 days)
```

| Desired lock | nSequence value |
|--------------|-----------------|
| 144 blocks (~1 day) | `0x00000090` |
| ~1 week in time units (1182 * 512 s) | `0x0040049E` |
| No relative lock, RBF signalled | `0xfffffffd` |
| No relative lock, nLockTime enabled, no RBF signal | `0xfffffffe` |
| Final | `0xffffffff` |

Other bits must be zero for future soft-fork compatibility; Core treats non-standard bit patterns carefully, so set only the defined bits.

## Relative: CSV (BIP112)

```
<n> OP_CHECKSEQUENCEVERIFY OP_DROP <pubkey> OP_CHECKSIG
```

CSV fails unless the transaction `version >= 2`, the input's `nSequence` has the disable flag clear, uses the same type flag as `<n>`, and its value is `>=` the script's value. Miniscript: `older(n)`.

## Common Constructions

### Revocable / Delayed Path (Lightning-style)

```
OP_IF
    <revocation_pubkey>
OP_ELSE
    <to_self_delay> OP_CHECKSEQUENCEVERIFY OP_DROP
    <local_delayed_pubkey>
OP_ENDIF
OP_CHECKSIG
```

The owner must wait `to_self_delay` blocks after the commitment confirms; the counterparty can use the revocation key immediately if an old state is broadcast.

### HTLC

```
OP_IF
    OP_SHA256 <payment_hash> OP_EQUALVERIFY <receiver_pubkey>
OP_ELSE
    <cltv_expiry> OP_CHECKLOCKTIMEVERIFY OP_DROP <sender_pubkey>
OP_ENDIF
OP_CHECKSIG
```

### Inheritance / Recovery (Taproot, Miniscript)

```
tr(OWNER_KEY, and_v(v:pk(HEIR_KEY), older(52560)))
```

Owner spends via key path at any time; the heir can spend after about one year (52,560 blocks) without the owner having moved the coins. Spending (or refreshing) the coins resets the relative timer, so the owner must periodically move funds to keep the heir path locked.

## Height vs Time

| Prefer | Because |
|--------|---------|
| Blocks | Deterministic count; easy to test on regtest; standard in Lightning |
| Time | Human-facing deadlines (contracts) where block-time variance matters more |

Block-based locks drift relative to calendar time (blocks average ~10 minutes but vary). Time-based locks use MTP, so they release roughly an hour after the wall-clock time.

## Testing Timelocks

```bash
# regtest: advance by mining
bitcoin-cli -regtest generatetoaddress 144 <addr>

# time-based: move mock time forward, then mine so MTP advances
bitcoin-cli -regtest setmocktime $(( $(date +%s) + 8*24*3600 ))
bitcoin-cli -regtest generatetoaddress 11 <addr>

# check the spend is accepted before broadcasting
bitcoin-cli -regtest testmempoolaccept '["<signed_hex>"]'
# premature spends fail with "non-final" (nLockTime/CLTV) or "non-BIP68-final" (CSV)
```

## Pitfalls

| Pitfall | Result |
|---------|--------|
| `nSequence = 0xffffffff` on the input spending a CLTV output | CLTV fails |
| Transaction `version = 1` with CSV | CSV fails (BIP68 inactive) |
| Mixing height and time types between script and tx | Script fails |
| Expecting time locks at exact wall-clock time | Release ~1 h late due to MTP |
| Relative lock counted from broadcast | It counts from when the **prevout confirmed** |
| Forgetting the owner must refresh inheritance UTXOs | Heir path becomes spendable unexpectedly |
| Not testing the timelocked path before funding | Funds may be unspendable |

## Checklist

- [ ] Correct transaction version (2+) for relative locks
- [ ] Input `nSequence` encodes the lock with only defined bits set
- [ ] `nLockTime` set when using CLTV, same type as script
- [ ] Every spending path exercised on regtest with `testmempoolaccept`
- [ ] Operational plan for timelock refresh (inheritance/vault designs)
