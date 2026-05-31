---
name: blockchain-patterns
description: >
  Use this skill when asked about blockchain design patterns, token standards, upgradeable contracts, oracle patterns, layer 2 scaling patterns, cross-chain communication patterns, and common blockchain architecture patterns. Covers ERC standards (20, 721, 1155, 4626, 4337), proxy patterns (UUPS, transparent, beacon), bridge patterns, state channel patterns, sidechain patterns, and MEV-aware design. Do NOT use for: specific language implementation (use blockchain-application), core protocol design (use blockchain-core), or web3 integration (use blockchain-web3).
version: "1.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [blockchain, patterns, architecture, design, tokens, standards, phase-blockchain]
---

# Blockchain Patterns

## Purpose
Catalog and guide the selection of blockchain design patterns covering token standards, contract upgradeability, scaling solutions, cross-chain communication, and protocol architecture. This skill enforces standardized pattern selection with documented trade-offs and security implications.

## Agent Protocol

### Trigger
"blockchain pattern", "token standard", "ERC-20", "ERC-721", "ERC-1155", "ERC-4626", "ERC-4337", "ERC-2612", "ERC-3525", "ERC-3643", "ERC-4907", "ERC-5192", "permit", "upgradeable contract", "proxy pattern", "UUPS", "oracle pattern", "bridge pattern", "layer 2", "state channel", "sidechain", "MEV", "cross-chain", "blockchain design pattern", "smart contract pattern", "vault pattern", "yield-bearing vault", "semi-fungible", "soulbound", "rollup", "validium", "optimistic rollup", "zk-rollup", "IBC", "LayerZero", "light client"

### Input Context
- Requirement type (token/upgrade/oracle/bridge/scaling)
- Target platform (EVM/Solana/Cosmos)
- Security requirements (trust assumptions, upgradeability need)
- Performance requirements (throughput, latency, cost budget)
- Existing infrastructure (current contracts, bridges, oracles in use)

### Output Artifact
Pattern recommendation with:
- Selected pattern with justification against alternatives
- Architecture diagram showing component interactions
- Implementation approach with key contract/system interfaces
- Security analysis with known attacks and mitigations
- Integration guide for existing systems

### Response Format
1. Pattern category (token/upgrade/oracle/bridge/scaling)
2. Problem statement + when to use
3. Implementation approach with trade-offs
4. Security considerations and known pitfalls
5. Code example or reference to canonical implementation

### Completion Criteria
- Pattern selection is justified against at least 2 alternatives with comparison table
- Implementation approach covers storage layout for upgradeable patterns, trust assumptions for bridge patterns
- Security analysis identifies 3+ attack vectors with mitigations
- Integration guide covers dependencies, initialization order, and compatibility considerations
- Code example follows established conventions (OpenZeppelin, Solady for EVM)

### Max Response Length
4000 tokens

## Workflow

### Phase 1: Pattern Identification
1. Identify the architectural problem category (tokenization, upgradeability, scaling, cross-chain, oracle integration)
2. Gather requirements: security level, upgrade frequency, throughput needs, cost constraints
3. Survey available patterns with similar use cases in production
4. Select primary pattern and fallback alternatives

### Phase 2: Architecture Design
5. Design component architecture: which contracts/modules implement which concerns
6. Define storage layout with upgradeability considerations (unstructured storage for proxies)
7. Specify interfaces following established standards (ERC, IBC, ULN)
8. Design initialization sequence with proper access controls

### Phase 3: Implementation Strategy
9. Select reference implementation (OpenZeppelin, Solady, or protocol-specific)
10. Implement core pattern with standardized interfaces
11. Add security controls: pause mechanism, rate limits, access control
12. Implement extension interfaces for future compatibility

### Phase 4: Integration and Testing
13. Test pattern with all standard interfaces (ERC-165 support)
14. Fork-test against mainnet state (simulate real-world interactions)
15. Audit pattern interactions (composability risks, circular dependencies)
16. Deploy with proper initialization and ownership transfer

## Architecture / Decision Trees

### Proxy Pattern Comparison

| Feature | UUPS | Transparent | Beacon |
|---|---|---|---|
| Upgrade function | Implementation | Proxy | Beacon |
| Gas cost per call | Low (1 SLOAD) | Medium (2 SLOAD) | Low (1 SLOAD + beacon read) |
| Deployment cost | Low (no admin) | High (admin storage) | Medium (beacon deploy) |
| Multiple implementations | No (1:1) | No (1:1) | Yes (1:N) |
| Storage collision risk | Low | Low (admin at high slot) | Low |
| Recommended | Default choice | Legacy projects | Many instances (ERC-1167 clones) |

### Scaling Pattern Decision Tree

```
Decide: Scaling Pattern
├── Need general smart contracts?
│   ├── YES → Rollup (Optimistic or ZK)
│   │   ├── EVM-equivalent needed?
│   │   │   ├── YES → Optimism OP Stack / Arbitrum Nitro
│   │   │   └── YES + fast finality → Scroll / Linea (ZK-EVM)
│   │   └── EVM-compatible acceptable?
│   │       └── ZKSync Era / StarkNet
│   └── NO → Check use case
│       ├── Payments only → Lightning Network / State channels
│       ├── Gaming / NFT → Validium (Immutable X)
│       └── Custom chain → App-chain (RollOps, Polygon CDK)
├── Need cross-chain interaction?
│   ├── Canonical bridge (single L1↔L2)
│   ├── IBC (multiple chains, trustless)
│   │   └── Both chains must be IBC-enabled
│   ├── External verifier (LayerZero, Wormhole)
│   │   └── Any chain pair, trust in verifier set
│   └── ZK-bridge (trustless, unilateral)
│       └── Any pair, proving cost is barrier
└── Need decentralized oracle?
    ├── Pull model (Chainlink): Request → Aggregation → Response
    └── Push model (Pyth, Chronicle): Publisher → On-chain → Consumer
```

## Common Pitfalls

1. **Storage collision in proxy upgrades**: Adding new variables before existing ones shifts storage slots. Use unstructured storage (EIP-1967) and never change variable order.
2. **Initialization frontrunning**: Uninitialized proxy implementations can be frontrun. Use constructor + disableInitializers() pattern.
3. **Bridge trust mirroring**: Using the same signers for bridge and protocol governance creates a single point of compromise.
4. **Insufficient oracle staleness**: Not checking oracle timestamp allows stale price consumption. Always verify `updatedAt` is within acceptable window.
5. **Calldata not compressed for L2**: Posting uncompressed transaction data to L1 increases rollup costs 10x+. Implement state diff compression.
6. **Missing ERC-165 interface support**: Contracts that don't implement `supportsInterface` break composability with other contracts.
7. **Reentrancy in cross-chain callbacks**: Cross-chain message execution reenters the calling contract. Use reentrancy guards on all message handlers.
8. **Beacon pattern update delay**: Beacon proxy updates affect ALL implementation contracts atomically—coordinate upgrades carefully.
9. **EIP-1967 storage slot collision**: Using wrong storage slot for proxy admin or implementation UUID breaks proxy detection tools.
10. **MEV extraction in AMM patterns**: Unprotected AMM functions enable sandwich attacks. Implement slippage protection and commit-reveal.

## Best Practices

### Token Contract Patterns
- Use ERC-20 for fungible tokens with ERC-2612 (permit) for gasless approvals
- Use ERC-721 for NFTs with ERC-4907 (rental) for lending market compatibility
- Use ERC-1155 for multi-token contracts (games, metaverse)
- Use ERC-4626 for yield-bearing vaults (standardized share accounting)
- Use ERC-4337 for account abstraction (wallet contract + EntryPoint)

### Upgradeable Contract Patterns
- Default to UUPS proxy pattern for new projects
- Use transparent proxy only for contracts with many upgrade functions
- Use beacon pattern for ERC-1167 minimal proxy families
- Always use `initialize` function instead of constructor (callable once)
- Store implementation address in EIP-1967 storage slot for compatibility

### Bridge Patterns
- Use canonical bridge for simple L1↔L2 asset transfer
- Use IBC for multi-chain trustless message passing (Cosmos ecosystem)
- Use LayerZero for flexible cross-chain messaging with configurable security
- Implement rate limiting and tiered withdrawal for high-value bridges
- Use ZK-bridge for maximum trust minimization at higher cost

## Compared With

| Aspect | Rollup | State Channel | Plasma | Validium |
|---|---|---|---|---|
| Throughput | 2,000-100,000 TPS | Unlimited (off-chain) | 10,000+ TPS | 10,000+ TPS |
| Finality | Minutes (ZK) / 7d (Optimistic) | Instant | Hours | Minutes |
| Data availability | On-chain | Off-chain | On-chain (compressed) | Off-chain (DAC) |
| General computation | Yes (EVM or ZK-EVM) | No (payment/state) | Limited (predicates) | Yes (EVM) |
| Capital efficiency | High | Medium | Low | High |
| User experience | Good (like L1) | Excellent (instant) | Poor (challenge period) | Good |

## Performance Considerations

- **UUPS vs. Beacon**: UUPS costs ~200 gas more per call than beacon, but avoids an external read
- **ERC-1155 batch transfers**: 80% cheaper than individual ERC-721 transfers for 5+ items
- **Calldata vs. blob cost**: EIP-4844 blobs reduce L2 data availability cost from ~16 gas/byte to ~1-2 gas/byte
- **Merkle proof verification**: O(log n) gas for inclusion proof; optimize with sorted merkle trees
- **Oracle update frequency**: Push-based oracles (Pyth) update every ~400ms vs pull-based (Chainlink) ~20 min

## Operations & Maintenance

### Upgrade Management
- Multi-sig + timelock governance for all upgradeable contract admin keys
- Test upgrades on testnet with exact bytecode before mainnet
- Maintain implementation contract verified on block explorer
- Document storage layout changes in each upgrade

### Bridge Operations
- Monitor relayer uptime and gas economics
- Track pending cross-chain messages for timeout expiry
- Maintain emergency pause capabilities for bridge contracts
- Regular security reviews of verifier set composition

## Rules

1. Default to UUPS proxy for upgradeable contracts—transparent only for upgrade-function-heavy contracts
2. Always use EIP-1967 storage slots for proxy implementation and admin addresses
3. Never use `selfdestruct` in upgradeable contracts (renders proxy unusable)
4. Always check oracle staleness (`updatedAt` within [block.timestamp - threshold])
5. Implement pull-over-push for all payment distribution patterns
6. Use checks-effects-interactions in ALL contract functions, not just token transfers
7. Cross-chain bridge contracts must have emergency pause and rate limiting
8. Beacon proxy implementations must use `delegatecall`-compatible storage layouts
9. ERC-165 interface detection is mandatory for all composable contracts
10. Reentrancy guards on all message execution handlers in cross-chain contracts
11. EIP-2612 permit must check `ecrecover` address matches `owner` exactly (not just non-zero)
12. Rollup batch submissions must include data availability commitment for state reconstruction
13. Optimistic bridges require minimum 30-minute challenge window for standard, 7 days for high-value
14. All oracle price feeds must be redundant (minimum 3 independent sources)
15. State channel designs must include watchtower service for offline user protection
16. Proposer-builder separation (PBS) patterns require MEV-Boost or ePBS integration

## References
- references/advanced-token-standards.md — Advanced Token Standards
- references/blockchain-patterns-advanced.md — Blockchain Patterns Advanced Topics
- references/blockchain-patterns-fundamentals.md — Blockchain Patterns Fundamentals
- references/cross-chain-communication-patterns.md — Cross-Chain Communication Patterns
- references/erc-4626-vault.md — ERC-4626 Yield-Bearing Vault Standard
- references/layer2-scaling-patterns.md — Layer-2 Scaling Patterns
- references/mev-and-order-flow.md — MEV & Order Flow Patterns
- references/oracle-and-bridge-patterns.md — Oracle & Bridge Patterns
- references/token-standards.md — Token Standards & Contracts
- references/upgradeable-contracts.md — Upgradeable Contract Patterns

## Handoff
blockchain-patterns → blockchain-application (for pattern implementation in code)
blockchain-patterns → blockchain-security (for pattern-specific security analysis)
blockchain-patterns → blockchain-core (for scaling protocol integration)
