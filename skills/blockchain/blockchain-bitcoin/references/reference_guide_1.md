# Bitcoin Transaction Anatomy and Serialization

Byte-level structure of Bitcoin transactions: fields, SegWit serialization (BIP141/144), txid vs wtxid, weight and virtual size, and the sighash flags that decide what a signature commits to. Script and Taproot spending rules are in `bitcoin-script-and-taproot.md`.

## Transaction Fields

| Field | Size | Notes |
|-------|------|-------|
| `version` | 4 bytes LE | 1, 2 (enables BIP68 relative locktime), 3 (TRUC policy, BIP431) |
| `marker` + `flag` | 1 + 1 byte | `0x00 0x01`, present only in SegWit serialization |
| input count | CompactSize | |
| inputs | variable | `prevout` (txid 32 bytes, internal byte order + vout 4 bytes LE), `scriptSig` (CompactSize length + bytes), `nSequence` 4 bytes |
| output count | CompactSize | |
| outputs | variable | `value` 8 bytes LE (satoshis), `scriptPubKey` (CompactSize length + bytes) |
| witness | variable | Per input: item count, then each item length-prefixed; SegWit serialization only |
| `nLockTime` | 4 bytes LE | Block height (< 500,000,000) or Unix time |

### CompactSize Encoding

| Value | Encoding |
|-------|----------|
| 0 to 252 | 1 byte |
| 253 to 0xffff | `0xfd` + 2 bytes LE |
| up to 0xffffffff | `0xfe` + 4 bytes LE |
| larger | `0xff` + 8 bytes LE |

## txid vs wtxid

- `txid = SHA256d(serialization without marker, flag and witness)`. Witness data cannot change it, which fixed third-party malleability for SegWit spends.
- `wtxid = SHA256d(full SegWit serialization)`. Used in the witness commitment in the coinbase and in BIP339 wtxid-based relay.
- Hashes are displayed in reverse byte order (RPC, explorers) relative to their internal serialization.

## Output Script Types

| Type | scriptPubKey | Address prefix (mainnet) | Spend data |
|------|--------------|--------------------------|------------|
| P2PKH | `OP_DUP OP_HASH160 <20B> OP_EQUALVERIFY OP_CHECKSIG` | `1...` | scriptSig: sig + pubkey |
| P2SH | `OP_HASH160 <20B> OP_EQUAL` | `3...` | scriptSig: args + redeemScript |
| P2WPKH | `OP_0 <20B>` | `bc1q...` (bech32) | witness: sig + pubkey |
| P2WSH | `OP_0 <32B>` | `bc1q...` (longer) | witness: args + witnessScript |
| P2TR | `OP_1 <32B x-only key>` | `bc1p...` (bech32m, BIP350) | witness: Schnorr sig, or script + control block |
| OP_RETURN | `OP_RETURN <data>` | none | unspendable; data carrier |

## Weight and Virtual Size (BIP141)

```
weight = base_size * 3 + total_size
       = (non-witness bytes * 4) + (witness bytes * 1)
vsize  = ceil(weight / 4)
```

- Block limit: 4,000,000 weight units.
- Fee rate is quoted in sat/vB: `fee / vsize`.
- Witness bytes are discounted 4x, so SegWit and Taproot inputs are cheaper than legacy ones.

### Approximate Input/Output Sizes

| Component | vbytes (approx.) |
|-----------|------------------|
| Tx overhead (SegWit) | 10.5 |
| P2WPKH input | 68 |
| P2TR key-path input | 57.5 |
| P2PKH input | 148 |
| P2WPKH output | 31 |
| P2TR output | 43 |

Signature sizes vary slightly (ECDSA DER 71-73 bytes), so estimate conservatively; Schnorr signatures are a fixed 64 bytes (65 with a non-default sighash byte).

## Sighash Flags

| Flag | Value | Signature commits to |
|------|-------|----------------------|
| `SIGHASH_ALL` | 0x01 | All inputs and all outputs |
| `SIGHASH_NONE` | 0x02 | All inputs, no outputs |
| `SIGHASH_SINGLE` | 0x03 | All inputs, the output with the same index |
| `ANYONECANPAY` modifier | 0x80 | Only this input (combined with above) |
| `SIGHASH_DEFAULT` (Taproot) | 0x00 | Same as ALL, 64-byte signature |

Signature digest algorithms:
- Legacy: original algorithm (quadratic hashing issue).
- SegWit v0: BIP143 digest, commits to the input amount, which protects offline signers from fee lies.
- Taproot: BIP341 digest, commits to all input amounts and scriptPubKeys.

## Decoding with Bitcoin Core

```bash
bitcoin-cli decoderawtransaction <hex>
bitcoin-cli getrawtransaction <txid> 2      # verbosity 2 includes prevout info (needs txindex or mempool/wallet tx)
bitcoin-cli testmempoolaccept '["<hex>"]'   # policy check without broadcasting
```

## Building a Transaction in Python (python-bitcoinlib style)

Use maintained libraries rather than hand-assembling bytes: `bitcoinlib`, `python-bitcoin-utils`, `embit` (Python); `bitcoinjs-lib` (JS); `rust-bitcoin` / BDK (Rust). For wallets, BDK provides coin selection, descriptors and PSBT out of the box.

```python
# python-bitcoin-utils, regtest P2WPKH spend
from bitcoinutils.setup import setup
from bitcoinutils.transactions import Transaction, TxInput, TxOutput, TxWitnessInput
from bitcoinutils.keys import PrivateKey

setup("regtest")
priv = PrivateKey.from_wif(WIF_FROM_REGTEST_WALLET)
pub = priv.get_public_key()

txin = TxInput(PREV_TXID, PREV_VOUT)
txout = TxOutput(to_satoshis(0.0999), DEST_ADDRESS.to_script_pub_key())
tx = Transaction([txin], [txout], has_segwit=True)

sig = priv.sign_segwit_input(tx, 0, pub.get_address().to_script_pub_key(), to_satoshis(0.1))
tx.witnesses.append(TxWitnessInput([sig, pub.to_hex()]))
print(tx.serialize())
```

`PREV_TXID`, `DEST_ADDRESS` and the WIF come from your regtest wallet.

## Pitfalls

- Mixing display (reversed) and internal byte order for txids.
- Computing fee rate from `total_size` instead of `vsize`.
- Forgetting the input amount when signing SegWit inputs (signature invalid).
- Sending to a bech32 (v0) checksum for a v1+ program; Taproot addresses must use bech32m.
- Outputs below the dust threshold are non-standard and will not relay.
- Assuming `nSequence = 0xffffffff` everywhere: it disables nLockTime and relative timelocks.

## Checklist

- [ ] Use a maintained library for serialization and signing
- [ ] Estimate vsize per input/output type before setting fees
- [ ] Verify with `testmempoolaccept` before broadcasting
- [ ] Use bech32m for Taproot, bech32 for v0
- [ ] Sighash ALL/DEFAULT unless a protocol requires otherwise
