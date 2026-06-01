# Blockchain Cross-Chain Advanced Topics

## Shared Sequencer Architecture

### How Shared Sequencers Work
Multiple rollups share a single sequencer set. The shared sequencer orders transactions across rollups and commits to a single global order. This enables atomic cross-rollup composability (transactions on rollup A and B are ordered in the same block).

### Projects
- **Espresso**: Shared sequencing with HotShot consensus. Offers confirmation via DA committee.
- **Astria**: Shared sequencer with Celestia DA. Allows sovereign rollups with shared ordering.
- **Radius**: Shared sequencer with coprocessor for pre-confirmation.

## Bridge Security Architecture

### Rate Limiting Design
Every bridge should have configurable rate limits:
- Per-asset: max amount of a single asset per period
- Per-validator: max messages a validator set can sign per period
- Global: total value bridge can process per period
- Tiered: lower limits for new assets, higher for established

### Emergency Pause
Bridge contracts must have:
- Guardian multi-sig with pause capability (NOT upgrade capability)
- Automatic pause on suspicious activity (anomalous message volume, value)
- Timelock for unpause (min 48h to prevent hasty resumption)
- Communication plan for paused state

## Atomic Composability vs. Async Composability

### Atomic
Transactions across chains either all succeed or all fail. Requires shared sequencer or synchronous execution zone. Benefits: no stuck state, no recovery needed. Cost: latency from synchronous consensus.

### Async
Transactions on different chains are independent with eventual consistency. Benefits: independent liveness, parallel execution. Cost: stuck state possible (one side succeeds, other fails), requires recovery mechanisms.

## Token Representation Security

### Wrapped Token Risk
Wrapped tokens depend on the bridge's security. If the bridge is exploited, wrapped tokens become worthless. Mitigations: over-collateralization, insurance funds, tiered risk classification.

### Canonical Token Standardization
For multi-chain tokens, designate one chain as the canonical issuance chain. Other chains use bridge-deployed wrapped versions. Governance can freeze/upgrade bridges if needed. Native issuance on each chain (like USDC) is safest but requires multi-chain deployment coordination.
