# L1 Protocol Threat Model

Defensive threat model for layer-1 protocols and node software: network-level, consensus-level, economic and implementation threats, with the mitigations real clients use. Intended for protocol designers, client developers and node operators. MEV-specific economics are in `economic-security-mev.md`.

## Assets and Assumptions

| Asset | Property to protect |
|-------|---------------------|
| Canonical chain | Safety (no conflicting finalized history), liveness (progress) |
| Node availability | Resistance to resource exhaustion |
| User funds | Only valid signed transactions move them |
| Peer view of the network | Not monopolized by an attacker |

Typical assumptions: honest majority of hash power (PoW) or > 2/3 honest stake (BFT finality), bounded network delay for liveness, standard cryptographic hardness.

## Network-Layer Threats

### Eclipse attack
Attacker controls all of a victim's peer connections, feeding a fake or stale chain, delaying blocks, or enabling double spends against the victim.

Mitigations used in practice:
- Outbound peers selected with diversity across network groups; Bitcoin Core supports `asmap` to diversify by autonomous system.
- Anchor connections: Bitcoin Core re-connects to two block-relay-only peers from the previous run on restart.
- Extra block-relay-only connections that do not gossip addresses or transactions (harder to fingerprint).
- Peer eviction logic that protects long-lived, low-latency and diverse peers.
- Operators: run multiple nodes in different networks; compare tips; alert on divergence.

### Sybil and address-table poisoning
Attacker floods address tables with its own nodes. Mitigations: bucketed address manager keyed by source group, limits per source, rate-limited address gossip.

### Denial of service
| Vector | Defense |
|--------|---------|
| Large or malformed messages | Size limits and cheap rejection before parsing |
| Expensive validation (invalid blocks with valid headers) | Require PoW / proposer signature before body work; cache invalid hashes; ban relayers |
| Mempool flooding | Minimum relay fee, eviction by fee rate, per-sender limits |
| Low-work header spam | Headers presync / minimum chain work before storing |
| Connection exhaustion | Inbound limits, eviction, per-IP caps |

## Consensus-Layer Threats

### Majority (51%) attack — PoW
An attacker with majority hash power can reorganize recent blocks, double-spend, and censor. They cannot steal funds without keys or create invalid transactions that honest nodes accept. Defense for receivers: confirmation depth proportional to value and to the cost of renting hash power for the chain; small-hashrate chains have been reorganized repeatedly via rented hash power.

### Selfish mining
A miner withholds found blocks to waste honest work and gain a disproportionate share of rewards (Eyal and Sirer, 2013). Profitability depends on hash share and how ties propagate. Mitigations: fast block propagation (compact blocks), honest tie-breaking behaviour, monitoring orphan rates.

### Long-range attack — PoS
Keys of validators that have exited can sign an alternative history from far back at no cost. Fresh nodes cannot distinguish it by "most work". Mitigation: weak subjectivity — sync from a recent trusted checkpoint and refuse reorgs beyond the finalized checkpoint.

### Finality-reversion and slashing
Ethereum's Casper FFG makes conflicting finalization require ≥ 1/3 of stake to commit slashable offenses (double votes or surround votes). Validators must run slashing protection databases (EIP-3076 interchange format) and never run the same keys on two machines.

### Liveness attacks
If > 1/3 of stake is offline or withholding, finality stops. Ethereum's inactivity leak gradually reduces the inactive stake until the online validators regain a 2/3 supermajority.

### Timestamp manipulation
PoW chains bound block time by median-time-past and future drift. Bitcoin's difficulty calculation has a known time-warp weakness (exploited on some testnets and altcoins); fixes have been proposed as part of a consensus-cleanup soft fork. Protocol designers should bound timestamps relative to both past and future and compute difficulty over overlapping windows.

## Economic Threats

| Threat | Description | Mitigation |
|--------|-------------|------------|
| Bribery / P+ε attacks | Paying participants to deviate | Slashing, collateral larger than bribe budgets |
| Stake/hash centralization | Few pools/operators control safety | Client and operator diversity, decentralized staking protocols, transparency |
| Fee-sniping | Miners reorg to steal high-fee blocks | `nLockTime` set to current height by wallets (anti-fee-sniping) |
| Transaction censorship | Builders/proposers exclude txs | Inclusion lists (proposed for Ethereum), multiple relays/builders |

## Implementation Threats

- **Consensus bugs**: one client accepting a block others reject splits the network. Defenses: shared conformance tests, differential fuzzing, client diversity (no client above 2/3 share on PoS), staged rollouts.
- **Memory safety and parsing bugs** in P2P code: fuzz every decoder, prefer memory-safe languages for new code, sandbox components where possible.
- **Key management**: validator and miner payout keys in HSMs or remote signers (e.g. Web3Signer) with slashing protection.
- **Supply chain**: reproducible builds (Bitcoin Core uses Guix-based reproducible builds with multiple signers), verify release signatures before upgrade.

## Threat → Control Matrix

| Threat | Protocol control | Client control | Operator control |
|--------|------------------|----------------|------------------|
| Eclipse | — | Diverse outbound, anchors | Multiple nodes, tip comparison |
| 51% / reorg | Finality gadget | Reorg depth limits (finalized) | Confirmation policy |
| Long-range | Weak subjectivity period | Checkpoint sync | Trusted checkpoint sources |
| DoS | Fees, size limits | Cheap-first validation, bans | Rate limits, firewalls |
| Slashing | Penalties | Slashing protection DB | Single active signer per key |
| Consensus bug | Spec tests | Fuzzing | Client diversity |

## Checklist

- [ ] Assumptions (honest majority, synchrony) written down per component
- [ ] Network: diversity, anchors, eviction protection, message limits
- [ ] Consensus: finality rules, weak subjectivity checkpoints, slashing protection
- [ ] Economic: confirmation policy per value tier, censorship monitoring
- [ ] Implementation: conformance tests, fuzzing, reproducible signed releases
