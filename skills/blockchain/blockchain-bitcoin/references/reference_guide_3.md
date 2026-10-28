# Bitcoin HD Wallets, Output Descriptors and Miniscript

Key derivation and wallet description standards: BIP39 mnemonics, BIP32 hierarchical deterministic keys, derivation path conventions (BIP44/49/84/86/48), output script descriptors (BIP380-386) and Miniscript. Descriptors are how modern wallets (Bitcoin Core, BDK, hardware wallets, Sparrow) describe exactly which scripts they watch and sign for.

## BIP39 Mnemonic to Seed

```
entropy (128-256 bits) + checksum -> 12-24 words (2048-word list)
seed = PBKDF2-HMAC-SHA512(password = mnemonic, salt = "mnemonic" + passphrase, 2048 iterations) -> 64 bytes
```

- The optional passphrase creates an entirely different wallet; losing it loses funds.
- Mnemonic checksums catch typos but do not authenticate the passphrase.
- Generate entropy from a CSPRNG or hardware RNG only.

## BIP32 Derivation

```
master: I = HMAC-SHA512(key = "Bitcoin seed", data = seed)
        master_privkey = I[0:32], chain_code = I[32:64]
child i (normal, i < 2^31):   uses parent public key  -> xpub can derive children
child i' (hardened, i >= 2^31): uses parent private key -> xpub cannot derive
```

Security property: an xpub plus any non-hardened child private key reveals the parent private key. Never share an xpub together with child private keys, and harden account-level paths.

## Path Conventions

| Standard | Path | Script | Address |
|----------|------|--------|---------|
| BIP44 | `m/44'/0'/account'/change/index` | P2PKH | `1...` |
| BIP49 | `m/49'/0'/account'/change/index` | P2SH-P2WPKH | `3...` |
| BIP84 | `m/84'/0'/account'/change/index` | P2WPKH | `bc1q...` |
| BIP86 | `m/86'/0'/account'/change/index` | P2TR key-path | `bc1p...` |
| BIP48 | `m/48'/0'/account'/script_type'` | Multisig (2' = P2WSH, 1' = P2SH-P2WSH) | |

- Coin type `0'` mainnet, `1'` for testnet/signet/regtest.
- `change` = 0 receive, 1 change. Descriptors express this as the multipath `<0;1>` (BIP389).
- Gap limit (commonly 20): wallets stop scanning after N unused consecutive addresses.

## Extended Key Version Bytes

| Prefix | Meaning |
|--------|---------|
| `xpub` / `xprv` | Mainnet, script type not implied |
| `ypub` / `zpub` | Mainnet SLIP-132 hints for P2SH-P2WPKH / P2WPKH |
| `tpub` / `tprv` | Test networks |

SLIP-132 prefixes are a convention; descriptors replace them by stating the script explicitly. Prefer descriptors over `zpub`-style export.

## Output Descriptors

```
wpkh([d34db33f/84'/0'/0']xpub6CUG.../<0;1>/*)#checksum
tr([d34db33f/86'/0'/0']xpub6BgB.../0/*)
sh(wpkh(...))
wsh(sortedmulti(2,[fp1/48'/0'/0'/2']xpubA/<0;1>/*,[fp2/48'/0'/0'/2']xpubB/<0;1>/*,[fp3/48'/0'/0'/2']xpubC/<0;1>/*))
tr(INTERNAL_KEY,{pk(KEY_A),and_v(v:pk(KEY_B),older(52560))})
```

| Element | Meaning |
|---------|---------|
| `[fingerprint/path]` | Key origin: master fingerprint and derivation path (needed by signers) |
| `/*` | Ranged descriptor; derive index |
| `<0;1>` | Multipath: receive and change chains in one descriptor |
| `#checksum` | 8-char descriptor checksum |
| `sortedmulti` | BIP67 key sorting, order-independent multisig |

### Bitcoin Core Descriptor Wallets

Legacy (BDB) wallets were removed from Bitcoin Core in v30; descriptor wallets (SQLite) are the only kind. Use `migratewallet` on older versions to convert legacy wallets.

```bash
bitcoin-cli createwallet "watch" true true "" false true     # disable_private_keys, blank, descriptors
bitcoin-cli getdescriptorinfo "wpkh([d34db33f/84'/0'/0']xpub.../0/*)"   # adds checksum
bitcoin-cli -rpcwallet=watch importdescriptors '[{"desc":"wpkh(...)#cs","timestamp":1700000000,"active":true,"range":[0,999]}]'
bitcoin-cli deriveaddresses "wpkh(...)#cs" "[0,9]"
bitcoin-cli -rpcwallet=watch listdescriptors
```

Set `timestamp` to the wallet birth time to limit rescans; `"now"` skips history.

## Miniscript

Miniscript (supported in Bitcoin Core descriptors for P2WSH and Taproot) is a structured subset of Script that can be analysed for correctness, malleability, and worst-case satisfaction size.

Policy language (human-friendly) compiles to Miniscript:

```
policy:     or(99@pk(A), and(pk(B), older(12960)))
miniscript: or_d(pk(A),and_v(v:pk(B),older(12960)))
descriptor: wsh(or_d(pk(A),and_v(v:pk(B),older(12960))))
```

Common fragments: `pk(K)`, `pkh(K)`, `multi(k,...)`, `multi_a(k,...)` (Taproot), `older(n)` (relative), `after(n)` (absolute), `sha256(H)`, `and_v`, `or_d`, `or_i`, `thresh(k,...)`.

Use cases: inheritance/decaying multisig, vaults with recovery keys after a timelock, HTLC-like conditions. Compile and analyse with rust-miniscript or the online compilers; verify the spending paths on regtest before funding.

## Taproot Wallet Notes

- `tr(KEY)` alone is a single-key wallet (BIP86) with a key-path spend only.
- Add script leaves for backup paths; key-path spends reveal nothing about unused leaves.
- MuSig2 (BIP327) aggregates multiple keys into one Taproot key; descriptor support is `musig()` (BIP390) in recent wallets.

## Backup Requirements

| Wallet type | Must back up |
|-------------|--------------|
| Single-sig | Mnemonic (+ passphrase) and script type/path |
| Multisig | Every cosigner's xpub with origin info, the full descriptor, plus each signer's seed |
| Miniscript/Taproot scripts | Full descriptor (all keys, timelocks, tree) |

A multisig wallet cannot be reconstructed from seeds alone if the descriptor (other xpubs, ordering, script) is lost.

## Pitfalls

- Mixing script types under one path (funds visible in one wallet, invisible in another).
- Sharing an xpub that has non-hardened derivations above leaked child keys.
- Omitting key origin info; hardware signers then cannot find the key.
- Restoring with a wrong gap limit and concluding funds are missing.
- Testing a recovery path only after funding a wallet.

## Checklist

- [ ] CSPRNG/hardware entropy; mnemonic and passphrase stored separately
- [ ] Standard derivation paths per script type
- [ ] Descriptors (with checksums and origins) exported and backed up
- [ ] Multisig descriptor stored with every cosigner
- [ ] Miniscript policies analysed and tested on regtest/signet
