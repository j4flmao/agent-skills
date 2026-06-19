---
name: blockchain-patterns
description: >
  Use this skill when asked about blockchain design patterns, token standards, upgradeable contracts, oracle patterns, layer 2 scaling patterns, cross-chain communication patterns, and common blockchain architecture patterns. Covers ERC standards (20, 721, 1155, 4626, 4337), proxy patterns (UUPS, transparent, beacon), bridge patterns, state channel patterns, sidechain patterns, and MEV-aware design. Do NOT use for: specific language implementation (use blockchain-application), core protocol design (use blockchain-core), or web3 integration (use blockchain-web3).
version: "1.2.0"
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
"blockchain pattern", "token standard", "ERC-20", "ERC-721", "ERC-1155", "ERC-4626", "ERC-4337", "ERC-2612", "ERC-3525", "ERC-3643", "ERC-4907", "ERC-5192", "permit", "upgradeable contract", "proxy pattern", "UUPS", "oracle pattern", "bridge pattern", "layer 2", "state channel", "sidechain", "MEV", "cross-chain", "blockchain design pattern", "smart contract pattern", "vault pattern", "yield-bearing vault", "semi-fungible", "soulbound", "rollup", "validium", "optimistic rollup", "zk-rollup", "IBC", "LayerZero", "light client", "AMM", "constant product", "lending pool", "compound fork", "aave fork", "flash loan", "governance token", "veToken", "vote escrow", "factory pattern", "minimal proxy", "EIP-1167", "EIP-1967", "EIP-1822", "EIP-2535", "diamond pattern", "multi-facet", "federated sidechain", "ZK-bridge", "optimistic bridge", "PBS", "MEV-Boost", "ePBS", "ERC-5218", "NFT rental", "soulbound token", "account abstraction", "ERC-6551", "TBA", "token bound account", "ERC-6909"

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

| Feature | UUPS | Transparent | Beacon | Diamond (EIP-2535) |
|---|---|---|---|---|
| Upgrade function | Implementation | Proxy | Beacon | Diamond owner |
| Gas cost per call | Low (1 SLOAD) | Medium (2 SLOAD) | Low (1 SLOAD + beacon read) | Low (1 SLOAD + facet map) |
| Deployment cost | Low (no admin) | High (admin storage) | Medium (beacon deploy) | High (facet setup) |
| Multiple implementations | No (1:1) | No (1:1) | Yes (1:N) | Yes (N:M facets) |
| Storage collision risk | Low | Low (admin at high slot) | Low | Low (diamond storage) |
| Max implementations | 1 | 1 | Unlimited | Unlimited (48 facets) |
| Recommended | Default choice | Legacy projects | Many instances (ERC-1167 clones) | Large, modular protocols |

### Token Standard Selection Decision Tree

```
Decide: Token Standard
├── Fungible token?
│   ├── Standard → ERC-20 + ERC-2612 (permit)
│   ├── Yield-bearing vault → ERC-4626 (share-based accounting)
│   ├── Minimal gas (no permit) → ERC-20 (Solady)
│   └── Semi-fungible → ERC-3525 (financial NFTs: invoices, bonds)
├── Non-fungible token?
│   ├── Standard → ERC-721
│   ├── Rental support → ERC-4907 (adds user/expires roles)
│   ├── Soulbound → ERC-5192 (non-transferrable)
│   ├── Token-bound account → ERC-6551 (NFT owns assets)
│   └── Fractionalized → ERC-20 wrapper (fractionalize floor prices)
├── Multi-token contract?
│   ├── Single contract → ERC-1155 (minimal deployment cost)
│   ├── Tiered access → ERC-1155 with role mapping
│   └── Dynamic supply → ERC-1155 with mint/burn hooks
└── Account abstraction?
    ├── Smart wallet → ERC-4337 (EntryPoint + account contract)
    └── Session keys → ERC-4337 with ephemeral key module
```

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

### AMM Pattern Selection

```
Decide: AMM Model
├── General trading (correlated assets)?
│   ├── Constant Product (x*y=k) → Uniswap v2
│   │   ├── Pros: Simple, proven, universal
│   │   ├── Cons: High slippage on large trades
│   │   └── Use: Correlated + uncorrelated pairs
│   ├── Concentrated Liquidity → Uniswap v3
│   │   ├── Pros: 4000x capital efficiency
│   │   ├── Cons: LP complexity, IL management
│   │   └── Use: Professional LPs, stable pairs
│   └── Stable Swap → Curve
│       ├── Pros: Minimal slippage for stablecoins
│       └── Cons: Only works for near-identical assets
├── Need dynamic fees?
│   ├── Maverick: Directional LP (concentrated + dynamic)
│   └── Trader Joe v2: Bin-step LP (narrow bins per fee tier)
└── Need volatility-based pools?
    └── Gyroscope: Multi-dimensional invariant
```

### Cross-Chain Bridge Architecture

```
Decide: Bridge Architecture
├── Same chain family (EVM↔EVM)?
│   ├── Trustless → Canonical bridge (L1↔L2)
│   │   ├── Messages: ~30 min finality
│   │   ├── Security: Inherits L1 security
│   │   └── Cost: L1 gas for validity proof
│   └── Fast → External validator (LayerZero, Axelar)
│       ├── Messages: ~1 minute
│       ├── Security: Trust in DVN/verifier set
│       └── Cost: Oracle + relayer fees
├── Heterogeneous chains (EVM↔Cosmos)?
│   ├── IBC (if Cosmos-enabled)
│   └── ZK-bridge (any pair, trustless)
└── Maximum security?
    ├── ZK light client bridge (trustless, unilateral)
    └── Optimistic bridge (fraud proof window)
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
11. **ERC-4626 inflation attack**: Early depositors can manipulate share price, stealing from later depositors. Use virtual shares + assets as defense.
12. **ERC-2612 permit replay**: Without nonce or deadline checking, valid permits can be replayed. Always include nonce and validate deadline.
13. **Cross-chain message timeout**: Messages stuck in bridge without timeout handling lock user funds forever. Implement cancelation with timeout.
14. **Selfdestruct in proxy implementation**: If the implementation has `selfdestruct`, the proxy loses all funds. Never use selfdestruct in upgradeable contracts.
15. **Diamond storage collision**: Multiple facets using the same storage namespace cause data corruption. Use diamond storage pattern with unique namespace.

## Best Practices

### Token Contract Patterns
- Use ERC-20 for fungible tokens with ERC-2612 (permit) for gasless approvals
- Use ERC-721 for NFTs with ERC-4907 (rental) for lending market compatibility
- Use ERC-1155 for multi-token contracts (games, metaverse)
- Use ERC-4626 for yield-bearing vaults (standardized share accounting)
- Use ERC-4337 for account abstraction (wallet contract + EntryPoint)
- Use ERC-6551 for token-bound accounts (NFT owns other tokens)
- Use ERC-6909 for minimal multi-token (gas-optimized multi-token)

### Upgradeable Contract Patterns
- Default to UUPS proxy pattern for new projects
- Use transparent proxy only for contracts with many upgrade functions
- Use beacon pattern for ERC-1167 minimal proxy families
- Use diamond (EIP-2535) for large, modular protocols with many functions
- Always use `initialize` function instead of constructor (callable once)
- Store implementation address in EIP-1967 storage slot for compatibility

### Bridge Patterns
- Use canonical bridge for simple L1↔L2 asset transfer
- Use IBC for multi-chain trustless message passing (Cosmos ecosystem)
- Use LayerZero for flexible cross-chain messaging with configurable security
- Implement rate limiting and tiered withdrawal for high-value bridges
- Use ZK-bridge for maximum trust minimization at higher cost
- Always include timeout + cancelation for pending cross-chain messages

### DeFi Protocol Patterns
- AMM: Constant product (Uniswap v2) for simplicity, concentrated liquidity (v3) for efficiency
- Lending: Pool-based (Aave/Compound) for capital efficiency, peer-to-peer for niche assets
- Governance: Token-weighted for simplicity, quadratic for fairness, veToken for alignment
- Oracle: Push (Pyth, Chronicle) for high-frequency, Chainlink pull for general purpose

### MEV-Aware Design
- Include slippage tolerance in all AMM interactions
- Use commit-reveal schemes for order submission
- Implement private mempool integration (Flashbots Protect)
- Batch auctions for large trades (CowSwap model)
- Oracle extraction protection: use TWAP not spot price for liquidations
- Use `block.timestamp` and `block.number` guards against MEV timing manipulation

## Advanced Token Standards Reference

| Standard | Category | Key Feature |
|---|---|---|
| ERC-2612 | Fungible | Gasless approve via off-chain signature (permit) |
| ERC-4626 | Vault | Standardized yield-bearing share accounting |
| ERC-3525 | Semi-fungible | Financial NFTs with slot/value model |
| ERC-3643 | Security | Permissioned transfer, compliance wrapper |
| ERC-4907 | NFT | Rental roles (user + expires) |
| ERC-5192 | NFT | Soulbound (non-transferrable) |
| ERC-5218 | NFT | NFT rental with temporal ownership |
| ERC-6551 | NFT | Token-bound account (NFT = smart wallet) |
| ERC-6909 | Multi-token | Minimal ERC-1155 alternative (gas optimized) |
| ERC-1155 | Multi-token | Single contract for infinite token types |
| ERC-4337 | Account abstraction | Smart wallet via EntryPoint |
| ERC-6900 | Account abstraction | Modular smart accounts |

## Compared With

| Aspect | Rollup | State Channel | Plasma | Validium |
|---|---|---|---|---|
| Throughput | 2,000-100,000 TPS | Unlimited (off-chain) | 10,000+ TPS | 10,000+ TPS |
| Finality | Minutes (ZK) / 7d (Optimistic) | Instant | Hours | Minutes |
| Data availability | On-chain | Off-chain | On-chain (compressed) | Off-chain (DAC) |
| General computation | Yes (EVM or ZK-EVM) | No (payment/state) | Limited (predicates) | Yes (EVM) |
| Capital efficiency | High | Medium | Low | High |
| User experience | Good (like L1) | Excellent (instant) | Poor (challenge period) | Good |

## DeFi Lending Pool Pattern Comparison

| Feature | Pool-based (Aave/Compound) | Peer-to-peer (Morpho) | Isolated (Euler) |
|---|---|---|---|
| Capital efficiency | High (aggregated) | Medium (order book) | Medium (per-pair) |
| Liquidation | Soft (health factor) | Hard (position level) | Soft + IRM-based |
| Risk isolation | No (pool-wide risk) | Partial (per pair) | Yes (per market) |
| Oracle dependency | Single oracle | Single oracle | Per-market oracle |
| Upgradeability | Proxy-based | Proxy-based | Diamond (EIP-2535) |

## Operations & Maintenance

### Upgrade Management
- Multi-sig + timelock governance for all upgradeable contract admin keys
- Test upgrades on testnet with exact bytecode before mainnet
- Maintain implementation contract verified on block explorer
- Document storage layout changes in each upgrade
- Use `StorageSlot` library to prevent storage collision across upgrades
- Maintain upgrade history with `__gap` arrays for future storage

### Bridge Operations
- Monitor relayer uptime and gas economics
- Track pending cross-chain messages for timeout expiry
- Maintain emergency pause capabilities for bridge contracts
- Regular security reviews of verifier set composition
- Track total value secured (TVS) per bridge route
- Monitor for anomalous message patterns (potential bridge attacks)

### DeFi Protocol Operations
- Monitor oracle price deviation and staleness daily
- Track liquidity depth changes across all AMM pools
- Verify liquidation health factors are in expected ranges
- Run daily invariant checks (supply = borrow + reserves)
- Gas optimization review every quarter (reduce costs for users)

### MEV Monitoring
- Detect sandwich attacks on AMM pools (frontrun + backrun same tx)
- Track validator proposer boost usage for block reorgs
- Monitor private mempool (Flashbots) usage and censored transactions
- Report MEV extracted per block from the protocol
- Implement MEV tax or redistribution when applicable

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
17. ERC-4626 vaults must implement virtual shares to prevent inflation attacks
18. Cross-chain message timeout must be at least 2x the optimistic finality window
19. AMM pools must have minimum liquidity threshold to prevent manipulation
20. Lending pool oracles must use TWAP (not spot) for liquidation triggers
21. Diamond facets must use unique namespace for each storage layout
22. Beacon upgrades must be coordinated across all active proxies atomically
23. NFT market contracts must implement EIP-2981 (royalty standard) for creator fees
24. Off-chain oracles must not be the sole price source for liquidation-level decisions
25. Token contracts must implement `_beforeTokenTransfer` hooks for composability

## Implementation Examples

### UUPS Proxy Pattern (Solidity)
```solidity
// UUPS upgradeable proxy — OpenZeppelin style
contract UUPSProxy is ERC1967Proxy {
    constructor(address _logic, bytes memory _data) ERC1967Proxy(_logic, _data) {}
}

abstract contract UUPSUpgradeable is Initializable, UUPSUpgradeable {
    function _authorizeUpgrade(address newImplementation) internal virtual;

    function upgradeTo(address newImplementation) external virtual onlyProxy {
        _authorizeUpgrade(newImplementation);
        _upgradeToAndCallUUPS(newImplementation, new bytes(0));
    }

    // Storage gap for future variables
    uint256[50] private __gap;
}

// Example usage
contract MyContractV1 is UUPSUpgradeable {
    uint256 public value;

    function initialize(uint256 _value) public initializer {
        __UUPSUpgradeable_init();
        value = _value;
    }

    function setValue(uint256 _value) external {
        value = _value;
    }
}

contract MyContractV2 is MyContractV1 {
    function setValue(uint256 _value) external override {
        require(_value > 0, "Zero not allowed");
        value = _value;
    }
}
```

### ERC-4626 Yield-Bearing Vault (Solidity)
```solidity
contract YieldVault is ERC4626, ERC20Permit {
    using SafeERC20 for IERC20;

    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol
    ) ERC4626(_asset) ERC20(_name, _symbol) ERC20Permit(_name) {
        // Virtual shares defense against inflation attack
        _mint(address(this), 10**6); // 1M virtual shares
        _asset.safeTransferFrom(msg.sender, address(this), 10**6); // 1M virtual assets
    }

    // Override to add fees
    function _afterDeposit(uint256 assets, uint256 shares) internal override {
        // Fee: 0.1% deposit fee
        uint256 fee = assets / 1000;
        _asset.safeTransfer(treasury, fee);
    }

    // Override to add performance fee on withdraw
    function _beforeWithdraw(uint256 assets, uint256 shares) internal override {
        uint256 totalAssets = totalAssets();
        uint256 totalSupply = totalSupply() - 10**6; // Exclude virtual shares
        uint256 navPerShare = totalAssets / totalSupply;
        // Performance fee: 10% of yield above NAV
        if (navPerShare > highWaterMark) {
            uint256 yield = (navPerShare - highWaterMark) * shares;
            uint256 perfFee = yield / 10;
            _asset.safeTransfer(treasury, perfFee);
            highWaterMark = navPerShare;
        }
    }

    uint256 public highWaterMark;
    address public treasury;
}
```

### Cross-Chain Message Pattern (LayerZero OFT)
```solidity
contract MyOFT is OFT {
    // LayerZero OFT — send tokens cross-chain
    function sendCrossChain(
        uint16 _dstChainId,
        address _to,
        uint256 _amount,
        address payable _refundAddress,
        bytes memory _adapterParams
    ) external payable {
        _send(_msgSender(), _dstChainId, _to, _amount, msg.value, _adapterParams);
    }

    // Override to enforce rate limiting
    function _debitFrom(
        address _from,
        uint16 _dstChainId,
        bytes memory _toAddress,
        uint256 _amount
    ) internal override returns (uint256) {
        uint256 sentToday = dailyVolume[_dstChainId][block.timestamp / 86400];
        require(sentToday + _amount <= dailyLimit, "Rate limit exceeded");
        dailyVolume[_dstChainId][block.timestamp / 86400] = sentToday + _amount;
        return super._debitFrom(_from, _dstChainId, _toAddress, _amount);
    }

    mapping(uint16 => mapping(uint256 => uint256)) public dailyVolume;
    uint256 public dailyLimit = 100_000 * 10**18; // 100k tokens/day
}
```

### AMM Constant Product Pool (Minimal)
```solidity
contract ConstantProductPool {
    IERC20 public token0;
    IERC20 public token1;
    uint256 public reserve0;
    uint256 public reserve1;

    function swap(uint256 amount0Out, uint256 amount1Out, address to) external {
        require(amount0Out > 0 || amount1Out > 0, "No output");
        require(amount0Out < reserve0 && amount1Out < reserve1, "Insufficient liquidity");

        uint256 balance0Before = token0.balanceOf(address(this));
        uint256 balance1Before = token1.balanceOf(address(this));

        // Transfer output tokens
        if (amount0Out > 0) token0.safeTransfer(to, amount0Out);
        if (amount1Out > 0) token1.safeTransfer(to, amount1Out);

        // Verify invariant: (r0 - a0) * (r1 - a1) >= r0 * r1
        uint256 balance0After = token0.balanceOf(address(this));
        uint256 balance1After = token1.balanceOf(address(this));

        uint256 amount0In = balance0After - (reserve0 - amount0Out);
        uint256 amount1In = balance1After - (reserve1 - amount1Out);

        require(amount0In > 0 || amount1In > 0, "Insufficient input");

        uint256 balance0Adjusted = balance0After * 1000 - amount0In * 3; // 0.3% fee
        uint256 balance1Adjusted = balance1After * 1000 - amount1In * 3;

        require(
            balance0Adjusted * balance1Adjusted >= reserve0 * reserve1 * 1_000_000,
            "Invariant failed"
        );

        (reserve0, reserve1) = (balance0After, balance1After);

        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    event Swap(address indexed sender, uint256 amount0In, uint256 amount1In,
               uint256 amount0Out, uint256 amount1Out, address indexed to);
}
```

### Flash Loan Pattern (Minimal)
```solidity
contract FlashLoanProvider {
    IERC20 public token;
    uint256 public protocolFee = 9; // 0.09% fee

    function flashLoan(uint256 amount, address receiver, bytes calldata data) external {
        uint256 balanceBefore = token.balanceOf(address(this));
        require(balanceBefore >= amount, "Insufficient liquidity");

        token.safeTransfer(receiver, amount);

        // Callback to borrower
        IFlashLoanReceiver(receiver).executeOperation(amount, protocolFee, data);

        // Verify repayment + fee
        uint256 balanceAfter = token.balanceOf(address(this));
        require(balanceAfter >= balanceBefore + amount * protocolFee / 10000, "Repayment failed");

        emit FlashLoan(receiver, amount, protocolFee);
    }

    event FlashLoan(address indexed receiver, uint256 amount, uint256 fee);
}

interface IFlashLoanReceiver {
    function executeOperation(uint256 amount, uint256 fee, bytes calldata data) external;
}
```

### Factory + Minimal Proxy Pattern (ERC-1167)
```solidity
contract WalletFactory {
    address public immutable implementation;

    event WalletCreated(address indexed wallet, address indexed owner);

    constructor(address _implementation) {
        implementation = _implementation;
    }

    function createWallet(address owner, bytes32 salt) external returns (address) {
        bytes memory initData = abi.encodeWithSelector(Wallet.initialize.selector, owner);

        address wallet = Clones.cloneDeterministic(implementation, salt);
        // Deploy cost: ~200 gas (ERC-1167 minimal proxy)
        // vs ~500k gas for full contract deployment

        IProxy(wallet).initialize(initData);
        emit WalletCreated(wallet, owner);
        return wallet;
    }
}

// ERC-1167 minimal proxy bytecode:
// 0x363d3d373d3d3d363d73{b_20 bytes address}5af43d82803e903d91602b57fd5bf3
```

## Security Analysis Per Pattern

| Pattern | Primary Attack Vector | Mitigation |
|---------|----------------------|------------|
| UUPS Proxy | Initialization frontrunning | Constructor `_disableInitializers()` |
| Transparent Proxy | Function selector collision | Admin storage at `0xb53127684a...` (EIP-1967) |
| Beacon Proxy | Beacon implementation change mid-transaction | Atomic updates with reentrancy guard |
| Diamond (EIP-2535) | Storage collision across facets | Diamond storage with unique namespace |
| ERC-4626 Vault | Inflation attack | Virtual shares + assets (OpenZeppelin fix) |
| AMM Constant Product | Sandwich attack | Slippage tolerance + TWAP oracle |
| AMM Concentrated Liquidity | Range manipulation | Tick-based pricing, immutable tick boundaries |
| Bridge (Canonical) | Reorg finality gap | Challenge window (7d Optimistic / 30min ZK) |
| Bridge (External Verifier) | Verifier collusion | Threshold signing + economic bonding |
| LayerZero | DVN compromise | Multiple DVN paths + security stack |
| State Channel | Watchtower offline | Watchtower service, challenge period |
| Flash Loan | Oracle manipulation | TWAP oracle, min-max bounds checks |
| ERC-20 Permit | Signature replay (cross-chain) | Include chain ID in domain separator |
| ERC-4337 AA | EntryPoint DoS | Per-account staking + gas limits |

## Performance Considerations

- **UUPS vs. Beacon**: UUPS costs ~200 gas more per call than beacon, but avoids an external read
- **ERC-1155 batch transfers**: 80% cheaper than individual ERC-721 transfers for 5+ items
- **Calldata vs. blob cost**: EIP-4844 blobs reduce L2 data availability cost from ~16 gas/byte to ~1-2 gas/byte
- **Merkle proof verification**: O(log n) gas for inclusion proof; optimize with sorted merkle trees
- **Oracle update frequency**: Push-based oracles (Pyth) update every ~400ms vs pull-based (Chainlink) ~20 min
- **Concentrated liquidity**: 2000x capital efficiency vs constant product at 1% fee tier
- **ERC-1167 minimal proxy**: ~200 gas to deploy vs ~500,000 for full contract
- **Beacon proxy**: ~100 gas overhead per call vs ~200 for transparent proxy
- **Diamond proxy**: ~250 gas overhead per call (facet map lookup + delegatecall)
- **EIP-2535 diamond storage**: No collision risk, but ~5000 gas per namespace registration

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
