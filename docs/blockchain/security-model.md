# Blockchain Security Model

## Threat Model Layers

```
Layer 1: Consensus Attack
├── 51%/34% attack (reorg, double-spend)
├── selfish mining / validator withholding
├── long-range attack (PoS weak subjectivity)
└── eclipse attack (network isolation)

Layer 2: Smart Contract
├── Reentrancy (read-only, cross-function, cross-contract)
├── Oracle manipulation (flash loan, TWAP manipulation)
├── Access control (missing modifier, incorrect role)
├── Economic attack (incentive mismatch, sandwich, arbitrage)
└── Upgradeability (proxy storage collision, timelock bypass)

Layer 3: Cross-Chain
├── Validator compromise (bridge theft)
├── Message relay manipulation
├── Replay attack (same tx on multiple chains)
└── Finality violation (bridge accepts uncleared block)

Layer 4: Infrastructure
├── RPC frontrunning
├── Node DoS (empty block spam, state bloat)
├── MEV-Boost relay censorship
└── Key management (HSM/KMS compromise, shard theft)
```

## Economic Security Models

| Model | Attack Cost | Defense | Example |
|-------|------------|---------|---------|
| PoW | Hash power rental + electricity | ASIC dominance, difficulty adjustment | Bitcoin |
| PoS | Stake slashing (33%+ = loss) | Slashing, social slashing, weak subjectivity | Ethereum |
| BFT | 1/3 Byzantine stake | Proof-of-Lock, evidence submission | Cosmos |
| DAG | 33% stake (DAG-BFT) | Metastability, virtual voting | Avalanche |

## MEV Security

- MEV as security tax: validators extract value → users pay more → L2 adoption
- PBS mitigates: proposer gets published bid, not private orderflow → reduces extractable value
- Risk: relay centralization (single relay: Flashbots has 70%+ market share)
- Solution: ePBS (protocol-level), FOCIL (inclusion lists), MEV smoothing (stake pools)

## Bridge Security Risk

| Attack Type | Example | Loss | Root Cause |
|-------------|---------|------|------------|
| Validator key compromise | Wormhole | $326M | Missing guardian signature validation |
| Smart contract bug | Ronin | $625M | Compromised 5/9 validator keys |
| Economic manipulation | Nomad | $190M | Bridge contract initialization bug |
| Reentrancy across chains | Multichain | $130M | Unverified cross-chain message |

Mitigation: threshold signatures, ZK proofs, watchtower networks, economic bonds, circuit breakers, gradual withdrawals.

## Smart Contract Security (Cross-Reference)

See comprehensive coverage in:
- `blockchain-security/references/threat-modeling.md`
- `blockchain-security/references/audit-methodology.md`
- `blockchain-security/references/incident-response.md`
- `blockchain-security/references/economic-security.md`
- `blockchain-security/references/formal-verification-deep.md`

## Related Skills

- Security comprehensive → `blockchain-security/`
- Cross-chain bridge security → `blockchain-cross-chain/references/bridge-security.md`
- Economic security and MEV → `blockchain-core/references/economic-security-mev.md`
- MEV infrastructure → `blockchain-infrastructure/references/mev-infrastructure.md`
- KMS/HSM security → `blockchain-infrastructure/references/kms-hsm.md`
