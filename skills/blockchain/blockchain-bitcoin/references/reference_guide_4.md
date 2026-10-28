# PSBT Workflows (BIP174 / BIP370) and Multisig Signing

Partially Signed Bitcoin Transactions (PSBTs) are the interchange format between wallet software, coordinators and signers (hardware wallets, HSMs, air-gapped devices). This reference covers PSBT roles, the v0 and v2 formats, multisig coordination with Bitcoin Core, and verification rules for signers.

## Roles

| Role | Responsibility |
|------|----------------|
| Creator | Creates the unsigned transaction / PSBT skeleton |
| Updater | Adds UTXO data, scripts, BIP32 derivation paths |
| Signer | Verifies and adds partial signatures |
| Combiner | Merges PSBTs signed by different parties |
| Finalizer | Builds final `scriptSig` / witness from partial signatures |
| Extractor | Produces the network-serialized transaction |

One tool may perform several roles.

## Format Overview

- Binary, magic bytes `psbt\xff`, then key-value maps: one global map, one map per input, one per output. Usually transported as Base64.
- **PSBTv0 (BIP174)**: global map holds the unsigned transaction.
- **PSBTv2 (BIP370)**: no global unsigned tx; inputs and outputs are fields, so they can be added later (useful for interactive constructions such as coinjoin or payjoin). Bitcoin Core support for v2 is limited; most hardware wallets accept v0.

### Important Per-Input Fields

| Field | Purpose |
|-------|---------|
| `PSBT_IN_NON_WITNESS_UTXO` | Full previous tx; required for legacy inputs, and recommended for SegWit v0 to prevent fee attacks |
| `PSBT_IN_WITNESS_UTXO` | Previous output (amount + script) for SegWit |
| `PSBT_IN_PARTIAL_SIG` | Pubkey -> signature |
| `PSBT_IN_SIGHASH_TYPE` | Requested sighash |
| `PSBT_IN_REDEEM_SCRIPT` / `WITNESS_SCRIPT` | Scripts for P2SH / P2WSH |
| `PSBT_IN_BIP32_DERIVATION` | Pubkey -> fingerprint + path |
| `PSBT_IN_TAP_KEY_SIG`, `TAP_SCRIPT_SIG`, `TAP_LEAF_SCRIPT`, `TAP_BIP32_DERIVATION`, `TAP_INTERNAL_KEY`, `TAP_MERKLE_ROOT` | Taproot fields (BIP371) |

Outputs carry `BIP32_DERIVATION` (and Taproot equivalents) so signers can recognise change.

## Bitcoin Core Single-Sig Flow (watch-only + hardware signer)

```bash
# 1. Watch-only wallet creates and funds the PSBT
bitcoin-cli -rpcwallet=watch walletcreatefundedpsbt '[]' \
  '[{"bc1qdest...": 0.05}]' 0 '{"fee_rate": 12, "includeWatching": true}' true
# -> {"psbt": "cHNidP8B...", "fee": ..., "changepos": 1}

# 2. Inspect before signing
bitcoin-cli decodepsbt "cHNidP8B..."
bitcoin-cli analyzepsbt "cHNidP8B..."    # next role, estimated fee/vsize

# 3. Sign on the hardware wallet (HWI or vendor app)
hwi --fingerprint d34db33f signtx "cHNidP8B..."

# 4. Finalize and broadcast
bitcoin-cli finalizepsbt "cHNidP8B...signed"
bitcoin-cli sendrawtransaction <hex>
```

## 2-of-3 Multisig Flow

```bash
# Coordinator: watch-only descriptor wallet with the multisig descriptor (see reference_guide_3.md)
bitcoin-cli -rpcwallet=ms walletcreatefundedpsbt '[]' '[{"bc1qdest...":1.0}]' 0 '{"fee_rate":10}' true > unsigned.json

# Each signer signs independently
bitcoin-cli -rpcwallet=signerA walletprocesspsbt "<psbt>"   # returns partially signed psbt
hwi -f <fpB> signtx "<psbt>"

# Coordinator combines and finalizes
bitcoin-cli combinepsbt '["<psbtA>", "<psbtB>"]'
bitcoin-cli finalizepsbt "<combined>"
```

`joinpsbts` merges PSBTs with different inputs (e.g. building one tx from several wallets); `combinepsbt` merges signatures for the same transaction.

## Signer Verification Rules

A signer must assume the coordinator is compromised. Before signing, the device should:

1. Verify every input's amount from trusted UTXO data; for SegWit v0, the full previous transaction prevents the "fee attack" where two separately signed PSBTs lie about amounts.
2. Display every non-change output (address and amount) and the fee.
3. Verify change outputs belong to the same wallet: derive the script from the registered descriptor (multisig: all cosigner xpubs registered on the device) and compare.
4. Reject unexpected sighash types (anything other than ALL/DEFAULT unless the user approves).
5. For multisig, require prior registration of the wallet policy (BIP388 wallet policies on Ledger, registration on other devices) so a swapped cosigner key is detected.

## Air-Gapped Transport

| Method | Notes |
|--------|-------|
| microSD | Simple; check file integrity |
| Animated QR (BC-UR / UR2) | Common for mobile coordinators |
| USB with HWI | Not air-gapped but simplest |

## Libraries

| Language | Library |
|----------|---------|
| Rust | `bitcoin` (rust-bitcoin `Psbt`), BDK `Wallet::build_tx`, `sign`, `finalize_psbt` |
| JS/TS | `bitcoinjs-lib` `Psbt` class |
| Python | `embit` (used in air-gapped signers), HWI |

```ts
import * as bitcoin from 'bitcoinjs-lib';

const psbt = new bitcoin.Psbt({ network: bitcoin.networks.testnet });
psbt.addInput({
  hash: prevTxid,
  index: vout,
  witnessUtxo: { script: prevScript, value: BigInt(prevValueSats) },   // bigint in bitcoinjs-lib v7
  bip32Derivation: [{ masterFingerprint, path: "m/84'/1'/0'/0/5", pubkey }],
});
psbt.addOutput({ address: destination, value: BigInt(amountSats) });
psbt.addOutput({ address: changeAddress, value: BigInt(changeSats) });
// signer side: psbt.signInputHD(0, hdRoot); then psbt.finalizeAllInputs(); psbt.extractTransaction().toHex();
```

## Pitfalls

| Pitfall | Consequence |
|---------|-------------|
| Missing BIP32 derivation fields | Hardware wallet cannot find its key or identify change |
| Change not verified against descriptor | Coordinator can redirect "change" to an attacker |
| Using `combinepsbt` on different transactions | Fails or produces an invalid tx |
| Finalizing with fewer than threshold signatures | `complete: false`; must not broadcast |
| Large consolidation PSBT with full prev txs | Exceeds device memory/QR capacity; split into batches |

## Checklist

- [ ] Inputs include UTXO data (full prev tx for legacy/v0 when the signer requires it)
- [ ] Derivation info on inputs and change outputs
- [ ] Multisig wallet policy registered on each signer
- [ ] `analyzepsbt` before signing, `finalizepsbt` returns `complete: true` before broadcast
- [ ] Outputs and fee confirmed on the signer screen, not only on the coordinator
