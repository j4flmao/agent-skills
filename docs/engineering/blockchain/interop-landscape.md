# Blockchain Interoperability Landscape

## Interoperability Models

```
Atomic Composability         Cross-Chain Messaging
(Shared State)               (Asynchronous)
┌──────────────┐            ┌──────┐   ┌──────┐
│  Single L2   │            │ChainA│   │ChainB│
│  (Arbitrum)  │            │  L1  │   │  L1  │
│  L1          │            └──┬───┘   └──┬───┘
│  (Ethereum)  │               │          │
└──────────────┘               │  Bridge  │
                               └──────────┘
                          
       vs                          vs
                          
Intents                     Shared Sequencer
(Off-Chain Matching)       (Cross-Chain Ordering)
┌──────────────┐            ┌─────────────────┐
│  User signs  │            │ Shared Sequencer │
│  intent off  │            │   (Espresso)     │
│  Relayer     │            ├────────┬────────┤
│  executes    │            │ L2 A   │ L2 B   │
│  on-chain    │            │        │        │
└──────────────┘            └────────┴────────┘
```

## Bridge Architecture Types

| Type | Verification | Trust Model | Latency | Examples |
|------|-------------|-------------|---------|----------|
| External Validator | Multi-sig | N-of-M validators | Minutes | Wormhole, Multichain |
| Optimistic | Fraud proof | 1 honest watcher | Hours (dispute window) | Nomad, Across |
| ZK / Light Client | Validity proof | 1 honest prover | Minutes | zkBridge, IBC, CCIP |
| Liquidity Network | Atomic swap | Liquidity providers | Seconds | Stargate, Hop |
| Native / Canonical | L1 validator | L1 security | Minutes | Arbitrum Bridge |

## Protocol Deep Dives

### IBC (Inter-Blockchain Communication)

- Transport layer: light clients (verify headers), connections (handshake), channels (packet delivery)
- Application layer: ICS-20 (token transfer), ICS-27 (interchain accounts), ICS-721 (NFT)
- Relayer: permissionless, watches packet events, submits proofs
- Security: Each chain validates light client of counterparty
- Ecosystem: 80+ chains (Cosmos hubs, Osmosis, Injective, etc.)

### LayerZero

- UltraLight Node: only needed block header (not full chain state)
- Oracle: reports block hash (Chainlink, Google, etc.)
- Relayer: submits transaction proof to destination
- Stargate: first omnichain DEX using LayerZero
- Security tradeoff: trust in oracle + relayer (unless both corrupt)

### Wormhole

- Guardians: 19 validators observing messages
- VAA (Verified Action Approval): signed by 2/3+ guardians
- NFT bridge, token bridge, native token transfer (NTT)
- Governor: rate limits, automatic pause on abnormal volume
- Risk: 13/19 guardians need to be honest

### Chainlink CCIP

- ARM (Risk Management Network): independent verification
- Commitment: message committed to source chain
- Execution: after ARM validates commitment → executor delivers
- Programmable token transfer (PTT): token + arbitrary calldata
- Rate limits: per-lane, per-message caps
- Emergency: pause any lane via governance

### Axelar

- Gateway: smart contract on each connected chain
- Validators run Amplifier: cross-chain message verification
- GasService: pay gas in any token
- General message passing (GMP): call any contract on any chain

## Atomic Composability Solutions

| Solution | Type | Composability Scope | Latency |
|----------|------|-------------------|---------|
| Single Rollup | Shared sequencing | Within rollup | Seconds |
| Shared Sequencer | Cross-rollup | Participating rollups | Seconds |
| Based Sequencing | L1-driven | L1 + rollups | L1 block time |
| Intents | Off-chain matching | Across any chains | Variable |

## Standardization Landscape

| Standard | Type | Status | Description |
|----------|------|--------|-------------|
| EIP-7683 | Cross-chain intents | Draft | Standardized intent format |
| ERC-7281 | xERC-20 | Final | Burn/mint for bridged tokens |
| ERC-5164 | Cross-chain exec | Draft | L1 → L2 execution |
| ERC-6170 | Cross-chain msg | Draft | Messaging interface |
| ICS-20 | Token transfer | Live | IBC token standard |
| ICS-27 | Interchain accts | Live | Cross-chain account control |
| ICS-721 | NFT transfer | Draft | IBC NFT standard |

## Trust Comparison by Protocol

```
Trust Required
Low ←────────────────────────────────────→ High
IBC    zkBridge  CCIP    Axelar  LayerZero  Wormhole
 │        │        │        │        │          │
 │   ZK proof   Multi-   Val +   Oracle+   Guardian
 │   of state   chain    Amt    Relayer   multisig
 │              verif                         
 │
Self-validating
```

## Related Skills

- Cross-chain comprehensive → `blockchain-cross-chain/`
- IBC deep → `blockchain-cross-chain/references/ibc-deep.md`
- LayerZero/Wormhole → `blockchain-cross-chain/references/layerzero-wormhole.md`
- CCIP → `blockchain-cross-chain/references/ccip-chainlink.md`
- Bridge security → `blockchain-cross-chain/references/bridge-security.md`
- Shared sequencer → `blockchain-cross-chain/references/shared-sequencer.md`
- Atomic composability → `blockchain-cross-chain/references/atomic-composability.md`
- Ethereum L2 → `blockchain-ethereum/references/layer2-scaling.md`
