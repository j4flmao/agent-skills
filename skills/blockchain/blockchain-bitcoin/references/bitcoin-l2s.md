# Bitcoin Layer 2s

L2 solutions on Bitcoin.

---

## Stacks

### Overview
- Smart-contract layer on Bitcoin using **Proof-of-Transfer (PoX)**.
- Stacks blocks settle on Bitcoin — every Stacks block commits its hash to a Bitcoin transaction.
- Native token: **STX** (used for gas, stacking, and fees).

### Clarity Language
- **Decidable**: no unbounded loops, no recursion unless provably terminating. Execution cost is predictable at parse time.
- **No reentrancy**: Clarity has no `call`-back pattern — once a function starts, it cannot be interrupted by external calls.
- Static typing, LISP-like syntax, first-class support for traits and error handling.
- Post-conditions: developers declare allowed state changes (similar to a capabilities system).

### Proof-of-Transfer (PoX)
1. Miners bid STX to win the next Stacks block.
2. Winning miner's BTC is sent to **stackers** (STX holders who lock their tokens).
3. Stackers earn BTC yields proportional to their locked STX.
4. PoX reuses Bitcoin's PoW security — miners must spend BTC to mine STX.

### Stacking
- STX holders lock tokens for a cycle (~2 weeks) to participate in PoX.
- Delegated stacking: delegate STX to a pool operator who runs the stacking node.
- Rewards: BTC paid proportionally; no slashing risk (lock-only, not custody).

### sBTC (1:1 BTC Peg)
- Two-way peg: users deposit BTC → receive sBTC on Stacks.
- **Peg-in**: BTC sent to a multisig wallet controlled by Stacker signers.
- **Peg-out**: sBTC burned on Stacks → signers release BTC on L1.
- Signer set rotates with Stacking cycles — no central custodian.
- Nakamoto release makes peg finality faster (Bitcoin-final within ~10 min).

### Nakamoto Release (upgrade)
| Feature              | Pre-Nakamoto        | Post-Nakamoto                          |
|----------------------|---------------------|----------------------------------------|
| Block time           | ~15 min (variable)  | ~5 seconds (subnets)                   |
| Bitcoin finality     | ~1 hour             | ~10 minutes (Bitcoin block finality)   |
| Mining               | Leader-based        | Stacker-selected signers               |
| sBTC                 | Centralized peg     | Decentralized signer set               |

### Clarity Post-Conditions (Example)
```clarity
(define-public (transfer (amount uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) (err u1))
    (try! (ft-transfer? token amount sender recipient))
    (ok true))
)
;; Post-conditions declared at call-site:
;;   (>= (ft-get-balance token tx-sender) amount)
```

### Key dApps on Stacks
| Protocol  | Category     | Description                               |
|-----------|--------------|-------------------------------------------|
| Alex       | DEX / DeFi   | AMM, lending, launchpad on Stacks         |
| Arkadiko   | CDP stablecoin | USDA pegged via over-collateralized STX  |
| MIA        | NFT marketplace | Ordinals-like NFT market on Stacks       |
| Lydian     | DEX          | Concentrated liquidity AMM                |
| Gamma     | NFT tools    | Launchpad and marketplace infrastructure  |

### sBTC Signer Architecture
- Signer set: ~20–100+ Stackers rotated each cycle (electing active signers).
- Threshold signature (FROST): any `t-of-n` signers can authorize peg-out.
- Observers: watch Bitcoin chain for peg-in txs, alert signer set via Stacks.
- Fraud proof: malicious signers slashed via bonded collateral (STX locked in contract).
- Nakamoto reduces finality from ~1 hour to ~10 minutes (one Bitcoin block).

---

## RSK / Rootstock

### Overview
- Smart-contract platform merged-mined with Bitcoin.
- Native token: **RBTC** (1:1 BTC peg via Powpeg).
- Ecosystem token: **RIF** (infrastructure, storage, naming).

### Merged Mining
- Bitcoin miners can mine RSK blocks simultaneously at no extra energy cost.
- Every RSK block header is included in a Bitcoin **merge-mining commitment** (coinbase OP_RETURN).
- RSK's difficulty is adjusted relative to Bitcoin — miners use the same SHA-256 hash.

### Powpeg (2-Way Peg)
- Federated peg: a multisig of **Powpeg signers** (security providers like IOVlabs, Bitrefill, OpenNode).
- Peg-in: deposit BTC to Powpeg address → RSK mints RBTC.
- Peg-out: burn RBTC → Powpeg releases BTC after ~100 RSK blocks (with fraud proofs).
- Signers must post collateral (slashed on misbehavior).

### RSK EVM Compatibility
- RSK Virtual Machine = Ethereum EVM with minor differences.
- Supports Solidity, Hardhat, MetaMask (via custom network config).
- Precompiles for Bitcoin-native operations (e.g., BTC tx verification).
- DECOR+ protocol: synchronizes RSK and Bitcoin block hashes for lightweight SPV proofs.

### DECOR+
- Mining synchronization protocol between Bitcoin and RSK.
- RSK blocks embed the Bitcoin block hash; Bitcoin blocks embed RSK merge-mining data.
- Enables verifiable cross-chain proofs without running a full Bitcoin node on RSK.

### RIF Ecosystem
| Service      | Description                                      |
|--------------|--------------------------------------------------|
| RIF Name Service | Domain resolution (.rsk) — similar to ENS     |
| RIF Storage  | Decentralized storage + data availability layer  |
| RIF Payments | L2 payment channels on RSK (similar to LN)       |
| RIF Gateway  | fiat on/off ramp infrastructure                  |

### RSK DeFi Landscape
- **Sovryn**: lending, swapping, margin trading (Bitcoin-native DeFi).
- **Money on Chain**: stablecoin (DoC) backed by RBTC.
- **Tropykus**: lending market based on Compound v2 fork.
- RSK has ~$100M+ TVL across major protocols (as of 2025).

---

## Babylon

### Overview
- Bitcoin staking protocol: trustlessly stake BTC to secure Proof-of-Stake (PoS) chains.
- No bridge, no wrapped token — the stake stays on Bitcoin L1.
- Native token: **BABY** (governance and gas).

### Trustless Staking via Bitcoin Script
- Stake transaction: BTC sent to a **covenant-controlled** UTXO with unbonding timelock.
- Slashing condition: if the staker misbehaves on the PoS chain, a signature from the PoS chain's validator set can slash the BTC.
- Unbonding: timelock expires → staker can reclaim BTC without any third-party approval.

### Covenants & Slashing
- Early Bitcoin covenants (OP_CTV / APO) or emulated with Tapscript.
- Slashing transaction: pre-signed transaction that sends staked BTC to a burn address or rewards address.
- Extractable: the PoS chain can submit a slashing proof to Bitcoin, triggering the covenant path.

### BTC Restaking
- Same staked UTXO can secure **multiple PoS chains** simultaneously (restaking).
- Restaking risk: slash condition from one chain can affect the stake.
- Modular: Babylon acts as a **staking provider** for Cosmos chains, EigenLayer-like AVS, and sovereign rollups.

---

## Lightning Network (Deepened)

### Overview
- Off-chain payment channels using HTLCs (Hash Time-Locked Contracts) and PTLCs (Point Time-Locked Contracts).
- Instant, low-fee, high-throughput Bitcoin payments.

### Payment Channel Lifecycle
1. **Channel Open**: funding transaction (multisig 2-of-2 output on Bitcoin).
2. **Commitment Transactions**: each peer holds a signed but un-broadcast tx reflecting current balance.
3. **Off-chain Updates**: new commitment tx exchanged and signed for each payment (revoking old state via revocation keys).
4. **Channel Close**: cooperative close (low fee, instant) or force close (broadcast commitment tx + CSV delay).

### HTLC / PTLC
| Contract | Mechanism                          | Privacy |
|----------|------------------------------------|---------|
| HTLC     | Hash preimage (SHA-256)            | Low (same hash reveals payment path) |
| PTLC     | Adaptor signature (Schnorr)        | High (no on-chain link between payments) |
- PTLCs use MuSig2 and Taproot — better privacy, smaller on-chain footprint.

### Multi-Path Payments (MPP / Trampoline)
- **MPP**: split a single payment across multiple channels/paths — increases success rate and capacity utilization.
- **Trampoline**: sender delegates pathfinding to a trampoline node (privacy + simplification).

### Gossip Protocol & Routing
- Nodes broadcast `channel_update` and `node_announcement` messages over the Lightning gossip network.
- **Source routing**: the sender assembles the full route (onion-encrypted) before sending.
- **Graph sync**: new nodes sync the network graph from seeds; gossip keeps it fresh.
- **Onion routing (SPHINX)**: each hop only knows its predecessor and successor — no node sees the full path.

### Fee Model
- Each hop charges: `fee_base_msat + (fee_proportional_millionths * amount) / 1_000_000`.
- Defaults: typically 1,000 msat base + 1 ppm (0.0001%).
- Low-fee channels are preferred by routing algorithms (dijkstra-based in `lnd`, `c-lightning`, `eclair`).

### Wumbo Channels
- Channels larger than the default 0.167 BTC limit (enabled via `option_support_large_channel`).
- Required for routing large payments and institutional liquidity.

### Taproot Assets
- Multi-asset protocol on Lightning using Taproot script trees.
- Mint assets (stablecoins, tokens) on Bitcoin, send over Lightning channels.
- Atomic swaps: trade BTC for Taproot Assets in a single off-chain transaction.

### Liquidity Management
- **Loop (Lightning Labs)**: submarine swaps — on-chain BTC ↔ off-chain Lightning balance.
- **LSPs (Lightning Service Providers)**: managed inbound liquidity (e.g., Breez, Voltage, Strike).
  - LSPS0: just-in-time channel opens.
  - LSPS1: liquidity purchase with channel leases.
  - LSPS2: zero-conf channel requests.
- **JIT Channels**: LSP opens a channel when a user receives their first payment.

### Dual-Funded Channels (v1.1)
- Both peers contribute to the channel opening (not just one-sided funding).
- Negotiated via `accept_channel2` messages — each side proposes an amount.
- Enables **splicing**: modify channel capacity mid-life (add or remove funds without closing).
- Splicing uses a single on-chain tx: old channel output + new input → new channel output.

### Important Lightning Implementations
| Implementation | Language | Developer           | Features                           |
|----------------|----------|---------------------|------------------------------------|
| LND            | Go       | Lightning Labs       | Most popular, Loop, Taproot Assets |
| Core Lightning | C        | Blockstream          | Fast, minimal, well-specified      |
| Eclair         | Scala    | ACINQ               | Mobile-first (Phoenix)             |
| LDK            | Rust     | Lightning Dev Kit    | Embeddable library, not a node     |
| Rust-Lightning | Rust     | Community            | LDK successor                      |

### Lightning Network Statistics (approximate)
- **Capacity**: ~5,000+ BTC in channels.
- **Nodes**: ~15,000+ publicly announced.
- **Channels**: ~60,000+ public channels.
- **Median channel size**: ~500,000–1,000,000 sat.
- **Routing success rate**: 70–95% depending on MPP and amount.

---

## Discreet Log Contracts (DLCs)

### Overview
- Oracle-based conditional payments on Bitcoin.
- No smart contract execution — only cryptographic verification of oracle attestations.

### How It Works
1. **Offer/Dibbs**: party A and party B lock BTC into a DLC output.
2. **Oracle**: publishes a numeric outcome (event X happens at time T).
3. **Attestation**: oracle reveals `Schnorr(R, m)` signature → both parties can settle the contract per the outcome.
4. **Settlement**: the winning party claims the BTC using the oracle's attestation.

### Cross-Chain Swaps
- DLCs enable **atomic swaps** without HTLCs: lock BTC in a DLC, settle based on an oracle confirming another chain's state.
- No need for bidirectional hash preimages — just attestation of the swap completion.

### Limitations
- Requires an oracle (trusted or threshold). Decentralized oracle networks (e.g., dLCBT, UMIPs) reduce single-point-of-failure.
- No Turing-complete logic — only outcomes pre-defined at contract setup.

### CET (Contract Execution Transaction)
- Pre-signed before the DLC is created — one CET per possible outcome.
- Each CET spends the DLC funding output, sending BTC to winner or splitting per outcome.
- Oracle attestation unlocks the CET corresponding to the real-world result.
- All other CETs are invalidated once one is broadcast.

---

## BitVM

### Overview
- Computationally complete verification on Bitcoin using fraud proofs and Taproot trees.
- Proposed by Robin Linus (2024) — enables arbitrary program execution verified on Bitcoin L1.
- No soft fork needed — works with existing Bitcoin Script.

### Core Idea
1. **Prover** claims a computation result.
2. **Verifier** can challenge the claim via a binary search through the computation trace.
3. If the prover is dishonest, the verifier reveals a fraud proof on Bitcoin.
4. Bitcoin script only needs to evaluate a single step of the computation (a NAND gate).

### Taproot Tree as Program ROM
- The entire program is committed as a **binary Merkle tree** of NAND gate evaluations.
- Each leaf in a Taproot script tree encodes one possible gate input/output combination.
- The prover pre-signs transactions for each step; the verifier can challenge any step.
- Challenge-response protocol: bisect the computation until the exact failing gate is identified.

### Limitations
- High off-chain communication overhead (many rounds for large programs).
- Not yet production-ready — mostly theoretical with proof-of-concept implementations (e.g., BitVMX).
- Requires an honest verifier assumption for the challenge protocol.

---

## Comparison Table

| Layer      | Security Model               | Peg Mechanism               | Programmability            | Ecosystem Maturity           |
|------------|------------------------------|------------------------------|----------------------------|------------------------------|
| Stacks     | PoX (reuses BTC PoW)         | sBTC (signer-based 2wp)      | Clarity (decidable)        | High — DeFi, NFTs, DEX       |
| RSK        | Merged Mining (with BTC)     | Powpeg (fed. multisig)       | EVM (Solidity)             | Medium — DeFi, RIF           |
| Babylon    | Bitcoin script covenant      | None (native staking)        | None (PoS security)        | Early — Cosmos, restaking    |
| Lightning  | Channel disputes (BTC script)| Off-chain channels           | None (payment only)        | High — payments, LSPs        |
| DLCs       | Oracle attestation           | Conditional BTC lock         | Conditional only           | Niche — derivatives          |
| BitVM      | Fraud proof on Bitcoin       | None (off-chain computation) | Arbitrary (via NAND gates) | Experimental — proofs of concept |

### Strengths & Weaknesses
- **Stacks**: richest programmability, but sBTC peg relies on signer honesty (economic security via stacking).
- **RSK**: EVM compatibility = easy porting, but peg is federated (centralization risk).
- **Babylon**: truly trustless staking, but no general-purpose smart contracts.
- **Lightning**: most mature L2, massive capacity, but no programmability beyond payments.
- **DLCs**: minimal trust assumptions for contracts, but limited to oracle-defined outcomes.
- **BitVM**: general-purpose verification on Bitcoin, but high overhead and not production-ready.
