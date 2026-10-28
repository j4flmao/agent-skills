# Ethereum Network Upgrades: History, Contents and Activation

A reference of Ethereum mainnet hard forks since the Merge, what each changed for developers and node operators, and how upgrades are specified, scheduled and activated. Pre-Merge forks are listed briefly for context.

## How Upgrades Work

| Step | Detail |
|---|---|
| Proposal | EIPs (execution and shared) and consensus-specs changes |
| Scoping | All Core Devs calls (ACDE for execution, ACDC for consensus) mark EIPs Proposed / Considered (CFI) / Scheduled (SFI) for inclusion |
| Devnets | Short-lived networks for client interop |
| Public testnets | Holesky (being retired), Sepolia, and Hoodi (launched March 2025 for validator testing) fork first |
| Mainnet | Activated by timestamp (EL) and epoch (CL) with the same instant |
| Naming | EL forks are named after Devcon cities (Shanghai, Cancun, Prague, Osaka, Amsterdam); CL forks after stars (Capella, Deneb, Electra, Fulu, Gloas); combined names: Shapella, Dencun, Pectra, Fusaka, Glamsterdam |

Since Fusaka, **Blob-Parameter-Only (BPO) forks** (EIP-7892) change only blob target/max via client configuration, without a full upgrade.

## Pre-Merge Summary

| Fork | Year | Notable |
|---|---|---|
| Frontier, Homestead | 2015–2016 | Launch, `DELEGATECALL` |
| Tangerine Whistle, Spurious Dragon | 2016 | Gas repricing (EIP-150), replay protection (EIP-155) |
| Byzantium, Constantinople/Petersburg | 2017–2019 | `REVERT`, `STATICCALL`, `CREATE2`, bitwise shifts |
| Istanbul, Berlin | 2019–2021 | Calldata repricing, access lists (EIP-2929/2930), typed txs (EIP-2718) |
| London | Aug 2021 | EIP-1559 fee market, refund reduction (EIP-3529), `0xEF` code rejection (EIP-3541) |
| Paris (the Merge) | Sep 2022 | Proof-of-stake; `DIFFICULTY` becomes `PREVRANDAO` (EIP-4399); Engine API |

## Post-Merge Upgrades

### Shanghai / Capella ("Shapella"), April 2023
- EIP-4895: validator withdrawals pushed from CL to EL (partial and full).
- EIP-3855 `PUSH0`, EIP-3860 initcode size limit and metering, EIP-3651 warm `COINBASE`.
- Developer impact: compile with `PUSH0` only for chains that support it (Solidity `evmVersion`).

### Cancun / Deneb ("Dencun"), March 2024
- EIP-4844: blob-carrying transactions (type 3), KZG commitments, separate blob fee market; L2 data costs fell sharply.
- EIP-1153: transient storage (`TLOAD`/`TSTORE`), useful for reentrancy locks and per-transaction state.
- EIP-5656: `MCOPY`.
- EIP-6780: `SELFDESTRUCT` only deletes code/storage when called in the same transaction as creation.
- EIP-4788: beacon block root available in the EVM (trust-minimized staking/restaking proofs).
- EIP-7516: `BLOBBASEFEE` opcode.

### Prague / Electra ("Pectra"), May 2025
- EIP-7702: EOAs can set code via delegation (type-4 transactions); enables batching and sponsorship for existing accounts.
- EIP-7251: max effective balance raised to 2048 ETH (consolidation of validators), with compounding withdrawal credentials (`0x02`).
- EIP-7002: execution-layer triggerable withdrawals/exits (withdrawal-credential owner can exit).
- EIP-6110: validator deposits processed from EL, reducing deposit delay.
- EIP-7685: general execution-layer requests (`requestsHash` in header).
- EIP-7691: blob target/max raised from 3/6 to 6/9.
- EIP-7623: higher calldata floor cost for data-heavy transactions (pushes DA to blobs).
- EIP-2537: BLS12-381 precompiles. EIP-2935: recent block hashes stored in state.
- EIP-7549: committee index moved out of attestation data (more efficient aggregation).

### Osaka / Fulu ("Fusaka"), December 3, 2025
- EIP-7594 PeerDAS: nodes sample erasure-coded blob columns instead of downloading all blobs, enabling higher blob counts.
- EIP-7892: BPO forks. BPO1 (December 2025) set blobs target/max to 10/15; BPO2 (January 7, 2026) to 14/21.
- EIP-7918: blob base fee bounded below relative to execution base fee.
- EIP-7825: per-transaction gas limit cap of 2^24 (16,777,216 gas).
- EIP-7823 / EIP-7883: MODEXP input bounds and gas repricing.
- EIP-7939: `CLZ` (count leading zeros) opcode. EIP-7951: secp256r1 (P-256) signature verification precompile, useful for passkeys.
- EIP-7917: deterministic proposer lookahead. EIP-7934: RLP block size limit. EIP-7642: eth/69 networking. EIP-7910: `eth_config` RPC.
- Block gas limit: validators raised the default gas limit target during 2025 (to 45M, then 60M around Fusaka); the limit is set by validator signaling, not by fork.

### Next: Amsterdam / Gloas ("Glamsterdam")
Headliners selected in 2025: enshrined proposer-builder separation (ePBS, EIP-7732) and block-level access lists (EIP-7928). Check All Core Devs notes and ethereum.org for the current scope and schedule before relying on it.

## Operator Checklist per Upgrade
1. Read the official announcement on blog.ethereum.org (lists minimum client versions).
2. Upgrade both EL and CL clients before the fork epoch; also upgrade validator client, MEV-Boost and any relays/builders.
3. Confirm with `eth_config` (EL) or the Beacon API fork schedule (`/eth/v1/config/fork_schedule`) that the node knows the fork.
4. Watch peers, sync status and missed attestations around the fork.
5. For L2s and dapps: update compilers/EVM version targets, gas estimations and fee logic (e.g. new blob parameters).

## Developer Impact Matrix

| Change | Who must act |
|---|---|
| New opcodes (`PUSH0`, `MCOPY`, `TSTORE`, `CLZ`) | Compiler `evmVersion` per target chain; L2s may lag mainnet |
| Fee changes (EIP-7623, blob params, EIP-7918) | Wallet/L2 fee estimators, batch posters |
| Tx gas cap (EIP-7825) | Deployers of very large transactions; split work |
| EIP-7702 | Wallets (delegation UX and safety), contracts that assumed `tx.origin == msg.sender` means "EOA without code" |
| Staking changes (7251, 7002, 6110) | Staking providers, withdrawal-credential management |

## Pitfalls
- Assuming an L2 or sidechain supports the newest opcodes because mainnet does.
- Using `extcodesize == 0` or `tx.origin` checks to detect EOAs after EIP-7702.
- Upgrading only one of the EL/CL pair.
- Hard-coding blob counts or fee constants that BPO forks change.

## Checklist
- [ ] Upgrade calendar tracked from official announcements
- [ ] Client versions verified per fork
- [ ] Compiler EVM targets set per chain
- [ ] Fee estimation reads parameters rather than constants
- [ ] EOA-detection logic reviewed post-7702
