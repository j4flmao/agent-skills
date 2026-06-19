---
name: blockchain-management
description: >
  Use this skill when asked about blockchain project management, DAO governance, multi-sig operations, treasury management, tokenomics design, and web3 project methodology. Languages: Solidity, TypeScript, Python. Covers DAO governance frameworks (Compound Governor, Aave, Snapshot, Tally), multi-sig wallet operations (Gnosis Safe, Timelock, proposal lifecycle), treasury management (vesting, streaming, diversification, yield), tokenomics design (supply schedule, inflation, staking rewards, emission curve), and web3-specific project methodology (audit-first, progressive decentralization, community governance). For standard management practices (agile, scrum, kanban, risk management, stakeholder management, OKR/KPI), reference shared skills from skills/management/. Do NOT use for: standard project management (use skills/management/pm), team operations (use skills/management/agile-scrum-kanban), cost analysis (use skills/management/cost-benefit), or technical blockchain development (use other blockchain-* skills).
version: "1.2.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [blockchain, management, governance, dao, phase-blockchain]
---

# Blockchain Management

## Purpose
Guide blockchain-specific project management covering DAO governance, multi-sig operations, treasury management, and tokenomics engineering. This skill enforces web3-specific methodology (audit-first, progressive decentralization) distinct from traditional software project management.

## Agent Protocol

### Trigger
"blockchain management", "DAO governance", "Compound Governor", "Snapshot vote", "Tally", "multi-sig", "Gnosis Safe", "timelock", "treasury management", "tokenomics", "token supply", "vesting", "token emission", "web3 project management", "blockchain project methodology", "progressive decentralization", "audit-first", "community governance", "DAO operations", "token launch", "airdrop", "LBP", "IDO", "IEO", "governance attack", "flash loan attack", "DAO legal structure", "Wyoming DAO", "legal wrappers", "contributor compensation", "vesting contract", "streaming", "Sablier", "LlamaPay", "treasury diversification", "yield farming", "on-chain payroll", "delegate", "delegation", "quorum", "proposal lifecycle", "proposer bond", "governance token", "veToken", "vote escrow"

### Input Context
- Blockchain platform (Ethereum/Solana/Cosmos)
- Governance framework preference (Compound/OpenZeppelin/Aave)
- Multi-sig configuration (signer count, threshold)
- Tokenomics parameters (supply cap, emission rate, distribution splits)
- Team and community structure (core team, investors, community treasury)
- Legal jurisdiction and entity structure (if applicable)

### Output Artifact
Governance architecture specification including:
- Contract architecture (governor, timelock, token)
- Multi-sig configuration and signing policy
- Tokenomics model with emission schedule
- Treasury allocation and vesting schedule
- Operational procedures and emergency plans

### Response Format
1. **Governance model**: on-chain vs off-chain, token-weighted vs quadratic, quorum requirements
2. **Operational security**: multisig configuration, signing policies, key management
3. **Treasury strategy**: allocation, vesting, diversification, yield generation
4. **Token economics**: supply model, distribution, incentives, emission schedule
5. **Project methodology**: development lifecycle, audit gates, community involvement

### Completion Criteria
- Governance contract architecture is fully specified with all parameters
- Multi-sig setup includes signer roles, thresholds, and key management procedures
- Tokenomics model includes supply schedule, emission curve, and distribution plan
- Treasury strategy covers vesting schedules, diversification, and yield optimization
- Emergency procedures include pause mechanisms, guardian roles, and communication plans

### Max Response Length
4000 tokens

## Workflow

### Phase 1: Governance Framework Selection
1. Determine on-chain vs off-chain governance based on protocol maturity and community size
2. Select governance framework: OpenZeppelin Governor (modular), Compound GovernorBravo (proven), or Aave v2 (efficient)
3. Configure voting parameters: voting delay (1-3 days), voting period (3-7 days), proposal threshold (0.1-1% supply), quorum (4-20% supply)
4. Select voting mechanism: token-weighted, quadratic, or conviction-based depending on governance goals
5. Design timelock: minimum 48h for parameter changes, 7d for critical upgrades

### Phase 2: Multi-Sig Infrastructure
6. Determine signer set: 3/5 for operations, 5/9 for treasury, 7/12 for protocol upgrades
7. Select multi-sig platform: Gnosis Safe (EVM), Squads (Solana), or custom
8. Define signing policies: threshold requirements per operation type, hardware wallet mandates
9. Establish key management: geographic distribution, social recovery, backup procedures
10. Implement timelock integration: multi-sig proposes → timelock enforces delay → execution

### Phase 3: Tokenomics and Treasury
11. Design token supply model: fixed cap, inflationary, or algorithmic based on protocol goals
12. Define emission schedule: halving curve, exponential decay, or linear emission
13. Create distribution plan: team vesting (1y cliff, 3-4y linear), investors, treasury, community rewards
14. Design staking mechanics: lock duration tiers, reward distribution algorithm, unbonding period
15. Establish treasury strategy: diversification targets, yield generation, spending policies

### Phase 4: Operational Procedures
16. Implement monitoring: proposal health dashboard, delegate tracking, timelock watchers
17. Set up communication channels: governance forum, Discord, emergency notification
18. Create emergency response plan: guardian pause, communication template, fork coordination
19. Establish audit schedule: annual comprehensive audit, quarterly parameter review

### Phase 5: Progressive Decentralization
20. Start centralized: core team controls multi-sig with timelock
21. Transition control: hand over governance token control, one module at a time
22. Community governance: full on-chain governance with timelock, guardian emergency role
23. Ongoing evolution: governance parameter adjustment via protocol itself
24. Sunset centralized privileges: renounce or revoke admin roles after proven stability

## Architecture / Decision Trees

### Governance Framework Comparison

| Feature | OpenZeppelin Governor | Compound GovernorBravo | Aave v2 |
|---|---|---|---|
| Modularity | High (pluggable modules) | Low (monolithic) | Medium |
| Gas efficiency | Medium | High | Very High |
| Timelock integration | Native (ITimelock) | Separate Timelock | Separate |
| Vote delegation | Built-in (ERC20Votes) | Built-in | Manual |
| Proposal types | Multiple actions | Single action batch | Multiple actions |
| Cancelation | Proposer + guardian | Proposer only | Admin only |
| Upgradeability | Modular/Replaceable | Complex (proxy migration) | Not designed for upgrade |

### Token Supply Decision Tree

```
Decide: Token Supply Model
├── Need predictable scarcity?
│   ├── YES → Fixed supply with halving (Bitcoin model)
│   │   ├── Total cap: 10M-100B tokens
│   │   ├── Halving interval: 210000-1051200 blocks
│   │   └── Risk: No inflation to fund ongoing development
│   └── NO → Evaluate inflation goals
│       ├── Validator rewards needed?
│       │   ├── YES → Inflationary with decay
│       │   │   ├── Initial inflation: 5-15% annually
│       │   │   ├── Decay: Exponential over 5-10 years
│       │   │   └── Target: Approach 0-2% terminal inflation
│       │   └── NO → Fixed supply or rebase
│       └── Stable purchasing power needed?
│           ├── YES → Rebase/algorithmic (high risk)
│           └── NO → Fixed supply with fee burn
```

### Token Launch Strategy Decision Tree

```
Decide: Token Launch Method
├── Need broad distribution + price discovery?
│   ├── YES → LBP (Fjord/Copper)
│   │   ├── Advantages: Fair price discovery, anti-bot
│   │   ├── Duration: 24-72 hours
│   │   └── Weight: Start 2-4x, decay to 1x
│   └── NO → Evaluate community goals
├── Building on existing community?
│   ├── YES → Airdrop
│   │   ├── Eligibility: Active users, early adopters, NFT holders
│   │   ├── Distribution: Merkle tree (gas efficient)
│   │   └── Cliff: 3-6 months before claim, linear unlock
│   └── NO → Check capital raise needs
├── Need initial capital?
│   ├── YES → IDO via launchpad (Sushi MISO, Fjord)
│   │   ├── Raise: $100K-5M
│   │   └── Liquidity: Pair with ETH/USDC, lock LP tokens
│   └── NO → Direct listing on DEX
└── Institutional + regulatory compliant?
    └── IEO on centralized exchange (Binance, Coinbase)
        └── Compliance: KYC/AML, jurisdiction restrictions
```

### DAO Legal Entity Decision Tree

```
Decide: DAO Legal Structure
├── Operating in US?
│   ├── Wyoming DAO LLC
│   │   ├── Best for: US-based DAOs
│   │   ├── Liability protection: Yes (LLC shield)
│   │   └── Cost: ~$1,500 registration + annual report
│   ├── Delaware C-Corp
│   │   └── Best for: Raising venture capital alongside token
│   └── Unincorporated DAO
│       └── Risk: Personal liability for members (court dependent)
├── Operating in EU?
│   ├── Malta (MFSA framework)
│   ├── Switzerland (Ethereum Foundation model)
│   └── Cayman Islands foundation
└── Multi-jurisdiction?
    └── Legal wrapper + token issuer in separate jurisdictions
```

## Common Pitfalls

1. **Governance attack via flash loan**: Without block-snapshot voting power, attackers can borrow governance tokens, vote, and return them in one block. Always use `getPastVotes` with block-number snapshot.
2. **Timelock bypass through self-governance**: If the governor can modify its own timelock address or delay, a malicious proposal can set timelock to zero and execute immediately. Make timelock delay immutable or require supermajority to change.
3. **Quorum too low**: A quorum floor below 1% of supply with low voter participation enables hostile takeover. Use dynamic quorum that scales with total supply.
4. **Vesting cliff not enforced**: If tokens are transferred before cliff, contributors exit early. Use escrow contracts that enforce cliff at the contract level, not just in legal agreements.
5. **Treasury diversification delay**: Holding >50% of treasury in the protocol's own token creates systemic risk during market downturns. Diversify treasury into stable assets immediately after token launch.
6. **Emission schedule mutability without supermajority**: If a simple majority can change emission rates, the protocol is vulnerable to governance capture. Require 66%+ supermajority for emission parameter changes.
7. **No emergency pause mechanism**: During exploits, hours of timelock delay can mean total loss. Implement guardian multi-sig with ability to pause critical functions (not execute arbitrary code).
8. **Ignoring L1→L2 governance coordination**: Cross-chain deployments require hub-and-spoke governance model, not independent governance per chain.
9. **Airdrop sybil farming**: Without anti-sybil measures (on-chain activity scoring, Gitcoin Passport, minimum tx count), airdrops get extracted by bots.
10. **LBP ending slippage**: LBP pools without sufficient final weight protection can be manipulated at close. Set minimum price floor or use gradual weight decay to zero.
11. **Vote delegation centralization**: If top 10 delegates hold >50% of voting power, the DAO is effectively centralized. Implement delegation caps, quadratic voting, or conviction voting.
12. **Proposal spam**: Without proposer bond, low-quality or malicious proposals overwhelm governance. Bond must be high enough to deter spam but low enough for legitimate proposers.
13. **Treasury yield overexposure**: Putting >30% of treasury in a single yield protocol creates counter-party risk. Diversify across 5+ independent protocols and asset classes.
14. **Token-weighted governance with whale dominance**: Pure token-weighted voting concentrates power in early investors. Consider quadratic voting (more equitable) or conviction voting (long-term aligned).

## Best Practices

### Governance Design
- Use OpenZeppelin Governor for new projects (modular, audited, actively maintained)
- Always snapshot voting power at proposal block (prevent flash loan attacks)
- Implement dynamic quorum that adjusts based on historical participation
- Require proposer bond (100-10,000 tokens) to prevent spam proposals
- Add cancelation role for guardian multi-sig with 48h timelock override
- Use EIP-712 for off-chain vote delegation (Snapshot compatibility)
- Implement governor toggle for pause during migration or emergency

### Multi-Sig Operations
- Minimum 3/5 for non-critical, 5/9 for treasury, 7/12 for protocol upgrades
- Geographic distribution of signers across different jurisdictions
- Hardware wallets (Ledger/Trezor) for all treasury signers
- Quarterly key signing ceremonies with backup verification
- Social recovery setup for lost keys
- Simulate transaction on Tenderly before mainnet execution
- Rotate signers annually and after any security incident

### Tokenomics Engineering
- Total supply should be determined by security budget requirements, not arbitrary caps
- Use exponential decay emission curves for smooth transitions
- Team vesting: 1-year cliff minimum, 3-4 year linear vesting
- Treasury allocation: 20-40% of total supply, released over 4+ years
- Community rewards: 30-50% of total supply for ecosystem growth
- Airdrop: 5-15% of total supply, targeting active protocol users
- Liquidity seeding: 5-10%, with LP tokens locked or in incentivized pools

### Treasury Management
- Target allocation: 40% stablecoins, 30% blue-chip crypto (ETH/BTC), 20% LP positions, 10% yield-bearing
- Use streaming protocols (Sablier, LlamaPay) for ongoing contributor payments
- Diversify yield sources: 5+ protocols across lending, LP, RWA
- Implement spending policy: ≤5% of treasury per quarter without governance vote
- Maintain 12-month operating runway in stable assets at all times
- Use ZK-proofs for private treasury reporting (if needed)

### Proposal Lifecycle Template
1. **Temperature check**: 5-day Snapshot vote (off-chain, signaling only)
2. **Formal proposal**: On-chain proposal with full calldata + description hash
3. **Voting period**: 3-7 days depending on governance framework
4. **Timelock queue**: 48h minimum after vote passes
5. **Execution**: After timelock delay expires, anyone can execute
6. **Post-execution monitoring**: 7-day watch period for anomalous behavior

## Compared With

| Aspect | Traditional PM | Web3 PM |
|---|---|---|
| Decision making | Centralized (management) | Distributed (token vote) |
| Upgrade process | CI/CD pipeline | Governance proposal + timelock |
| Incident response | Central authority can act immediately | Timelock delays response |
| Funding | Budget allocation | Treasury management + token emission |
| Stakeholder alignment | Shareholder value | Token holder alignment |
| Security model | Perimeter defense | Economic security + code audits |
| Transparency | Internal reporting | On-chain transparency |

## DAO Tooling Comparison

| Tool | Category | Chain | Key Feature |
|---|---|---|---|
| Tally | Governance dashboard | Multi-chain | Proposal creation + voting |
| Snapshot | Off-chain voting | Multi-chain | Gasless signaling votes |
| Gnosis Safe | Multi-sig | EVM | Modular security modules |
| Zodiac | DAO modules | EVM | Reality.eth, exit, bridge modules |
| Aragon | DAO framework | EVM | Modular OSx framework |
| Syndicate | Investment DAOs | EVM | On-chain fund management |
| Utopia | Contributor mgmt | EVM | Role-based access for teams |
| Juicy | Contributor mgmt | EVM | Stream + role management |
| Sablier | Payment streaming | EVM | Real-time money streaming |
| LlamaPay | Payment streaming | Multi-chain | Vesting + streaming |
| Coordinape | Compensation | EVM | Peer-to-peer reward allocation |
| SourceCred | Contribution tracking | Off-chain | Graph-based cred scoring |
| DeepDAO | DAO analytics | Off-chain | Governance health metrics |

## Performance Considerations

- **Governance gas costs**: Each vote cast costs ~50-100k gas. With 10,000 voters, a single proposal cycle costs 0.5-1 ETH in gas
- **Optimization**: Batch vote casting with EIP-712 signatures and delegated relayer
- **Snapshot for signaling**: Off-chain voting reduces costs by 1000x for non-binding votes
- **L2 deployment**: Deploy governance on L2 (Arbitrum/Optimism) with cross-chain message relay to L1 for execution
- **Proposer bond recovery**: Gas for executing cancelation should be recoverable from bond
- **Timelock gas**: A single timelock execute can cost 200k-500k gas depending on action count

## Operations & Maintenance

### Monitoring Requirements
- **Proposal tracker**: Real-time dashboard of active proposals, quorum progress, voting deadline
- **Delegate tracker**: Large delegation changes (>1% supply) trigger alert
- **Timelock watcher**: Monitor queued transactions, execute when delay expires
- **Treasury tracker**: Portfolio allocation, yield rates, spending velocity
- **Cross-chain monitor**: Bridge delays, message failures for multi-chain governance
- **Signer activity**: Track multi-sig signer participation rates (inactive signers should rotate out)

### Maintenance Schedule
- **Weekly**: Check pending proposals, execute queued transactions
- **Monthly**: Review treasury allocation, rebalance if needed
- **Quarterly**: Governance parameter review (quorum, delay, threshold)
- **Annual**: Comprehensive security audit of governance contracts
- **Emergency**: Immediate pause and assessment for critical vulnerabilities
- **Signer rotation**: Every 6-12 months or after any hardware wallet sunset

### Emergency Response Playbook
1. **Detect**: Monitors flag anomalous on-chain activity (large transfers, unexpected proposals)
2. **Assess**: Guardian multi-sig evaluates severity (30-minute window)
3. **Pause**: Guardian pauses affected contracts via timelock override
4. **Communicate**: Pre-prepared message template → Discord/Twitter/Governance forum
5. **Mitigate**: Emergency proposal with fix (requires timelock delay)
6. **Resume**: Governance vote to unpause + validate fix
7. **Post-mortem**: Public incident report within 7 days

## Rules

1. Block-snapshot voting power is mandatory—never allow current-balance voting
2. Timelock minimum 48 hours for parameter changes, 7 days for critical/upgrade proposals
3. Guardian multi-sig can pause but NEVER execute arbitrary code without governance approval
4. Quorum must be dynamic (percentage of supply) not static number
5. Team/investor tokens must have smart-contract-enforced vesting with cliff
6. Treasury must hold <50% in protocol's own token after 6 months of launch
7. Emission parameter changes require supermajority (66%+) and extended timelock (14d+)
8. All governance contracts must have emergency pause mechanism with guardian role
9. Cross-chain governance requires hub-and-spoke architecture, not independent governance per chain
10. Proposer bond is mandatory to prevent proposal spam and griefing
11. Vote delegation changes during active proposal must use snapshot voting power
12. Governance upgrades require two-phase: propose timelock change then execute
13. Maximum gas per proposal execution block: 10M gas for mainnet L1
14. Off-chain proposal metadata must be bound to on-chain calldata via description hash
15. Liquid staking derivatives used in governance must handle depeg scenarios
16. All governance parameter changes must emit events with old/new values for off-chain indexers
17. Contributor compensation must be on-chain (streaming or vesting), not discretionary
18. Airdrop claims must use Merkle tree verification with anti-sybil filtering
19. Treasury yield positions must have withdrawal to stable assets in <7 days (no long locks)
20. Signer set must have >50% turnover every 12 months to prevent key concentration risk
21. Governance forum discussions must have minimum 72-hour discussion period before on-chain proposal
22. Proposal descriptions must include clear success criteria and risk assessment
23. All timelock delays must be measured in blocks (not seconds) for fork consistency
24. Multisig transaction hashes must be verified against Tenderly simulation before signing
25. Token launches must have anti-bot protection (weighted LBP, Merkle-whitelist, or Proof-of-Humanity)

## Implementation Examples

### Governor Contract (OpenZeppelin — Minimal)
```solidity
contract MyGovernor is
    Governor,
    GovernorSettings,
    GovernorCompatibilityBravo,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl,
    GovernorPreventLateQuorum
{
    constructor(
        IVotes _token,
        TimelockController _timelock,
        uint256 _votingDelay,   // blocks before voting starts
        uint256 _votingPeriod,  // duration in blocks
        uint256 _quorumPercent  // e.g., 4 = 4% of supply
    )
        Governor("MyGovernor")
        GovernorSettings(_votingDelay, _votingPeriod, 0) // proposal threshold = 0
        GovernorVotesQuorumFraction(_quorumPercent)
        GovernorPreventLateQuorum(1 days)
        GovernorTimelockControl(_timelock)
    {}

    // Required overrides
    function votingDelay() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }
    function votingPeriod() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }
    function quorum(uint256 blockNumber) public view override(IGovernor, GovernorVotesQuorumFraction) returns (uint256) {
        return super.quorum(blockNumber);
    }
    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }
    function supportsInterface(bytes4 interfaceId) public view override(Governor, GovernorTimelockControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    function proposalNeedsQueuing(uint256 proposalId) public view override(Governor, GovernorTimelockControl) returns (bool) {
        return super.proposalNeedsQueuing(proposalId);
    }
}
```

### Timelock Controller with Multi-Sig Guardian
```solidity
// Timelock with guardian override for emergency pause
contract ProtectedTimelock is TimelockController {
    address public guardian;

    modifier onlyGuardian() {
        require(msg.sender == guardian, "Not guardian");
        _;
    }

    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address _guardian
    ) TimelockController(minDelay, proposers, executors, _guardian) {
        guardian = _guardian;
    }

    // Guardian can cancel malicious proposals before delay expires
    // But CANNOT execute arbitrary code
    function guardianCancel(bytes32 id) external onlyGuardian {
        _cancel(id);
    }

    // Guardian can pause all operations
    bool public paused;
    function pause() external onlyGuardian { paused = true; }
    function unpause() external onlyGuardian { paused = false; }

    function execute(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt
    ) public payable override {
        require(!paused, "System paused");
        super.execute(target, value, data, predecessor, salt);
    }
}
```

### Vesting Contract (Team/Investor Tokens)
```solidity
contract VestingEscrow {
    IERC20 public token;
    address public beneficiary;
    uint256 public totalAmount;
    uint256 public startTime;
    uint256 public cliffDuration;
    uint256 public totalDuration;

    uint256 public released;

    constructor(
        address _token,
        address _beneficiary,
        uint256 _totalAmount,
        uint256 _startTime,
        uint256 _cliffDuration,
        uint256 _totalDuration
    ) {
        token = IERC20(_token);
        beneficiary = _beneficiary;
        totalAmount = _totalAmount;
        startTime = _startTime;
        cliffDuration = _cliffDuration;
        totalDuration = _totalDuration;
    }

    // Computable vesting schedule — transparent and immutable
    function releasableAmount() public view returns (uint256) {
        if (block.timestamp < startTime + cliffDuration) return 0;
        if (block.timestamp >= startTime + totalDuration) return totalAmount - released;

        uint256 elapsed = block.timestamp - startTime;
        return (totalAmount * elapsed) / totalDuration - released;
    }

    function release() external {
        uint256 amount = releasableAmount();
        require(amount > 0, "No tokens to release");
        released += amount;
        token.safeTransfer(beneficiary, amount);
        emit Released(beneficiary, amount);
    }

    event Released(address indexed beneficiary, uint256 amount);
}
```

### Treasury Rebalancing Strategy
```solidity
contract TreasuryManager {
    using SafeERC20 for IERC20;

    // Target allocation: 40% stablecoin, 30% ETH/BTC, 20% LP, 10% yield
    struct Allocation {
        uint256 stablePercent;   // e.g., 4000 = 40.00%
        uint256 blueChipPercent; // e.g., 3000 = 30.00%
        uint256 lpPercent;       // e.g., 2000 = 20.00%
        uint256 yieldPercent;    // e.g., 1000 = 10.00%
    }

    Allocation public targetAllocation;
    uint256 public rebalanceThreshold = 500; // 5% deviation triggers rebalance

    // Yield positions across protocols for diversification
    IYieldProvider[] public yieldProviders;

    function rebalance() external onlyRole(GOVERNOR_ROLE) {
        uint256 totalUSD = getTotalUSD();
        uint256 stableValue = getStableValue();
        uint256 blueChipValue = getBlueChipValue();
        uint256 lpValue = getLPValue();
        uint256 yieldValue = getYieldValue();

        // Check deviation from target
        uint256 stablePct = stableValue * 10000 / totalUSD;
        require(
            absDiff(stablePct, targetAllocation.stablePercent) > rebalanceThreshold ||
            absDiff(blueChipValue * 10000 / totalUSD, targetAllocation.blueChipPercent) > rebalanceThreshold,
            "Within threshold"
        );

        // Execute rebalancing swaps via DEX aggregator (1inch/Paraswap)
        _executeSwaps();
    }

    function absDiff(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : b - a;
    }
}
```

### Delegate Voting System
```solidity
contract DelegateVoting is ERC20Votes {
    // Token holders can delegate voting power to any address
    function delegateTo(address delegatee) external {
        _delegate(msg.sender, delegatee);
    }

    // Snapshot voting power at a specific block
    function getVotingPower(address account, uint256 blockNumber) public view returns (uint256) {
        return getPastVotes(account, blockNumber);
    }

    // Prevent flash loan attacks — uses block snapshot, not current balance
    // This is enforced by ERC20Votes: getPastVotes reads from checkpoint at blockNumber
}

// Combined with Governor:
// Governor uses token.getPastVotes(account, proposalSnapshot(proposalId))
// This ensures voting power was locked at proposal block — flash loan cannot influence it
```

### Cross-Chain Governance (Hub-and-Spoke)
```solidity
// Hub chain (L1): Governor + Timelock
// Spoke chains (L2, sidechains): Bridge adapters

contract CrossChainGovernor is Governor {
    using CrossChainEnabled for address;

    // Execute governance actions on spoke chains via bridge
    function proposeAndExecuteCrossChain(
        address target,
        uint256 value,
        bytes memory data,
        uint256 dstChainId,
        bytes memory adapterParams
    ) external onlyGovernance {
        // Queue on hub timelock
        _queueOperation(target, value, data, bytes32(0), bytes32(dstChainId));

        // Send cross-chain message to spoke
        ILayerZeroEndpoint(endpoint).send{value: msg.value}(
            dstChainId,
            trustedRemoteLookup[dstChainId],
            abi.encode(target, value, data),
            payable(msg.sender),
            address(0x0),
            adapterParams
        );
    }

    // Received from spoke chain: execute with hub governance approval
    function receiveFromSpoke(bytes memory message) external {
        (address target, uint256 value, bytes memory data) = abi.decode(message, (address, uint256, bytes));

        // Verify spoke chain message carries hub governance weight
        // Only execute if corresponding hub proposal passed and timelock expired
        _execute(target, value, data);
    }
}
```

### Airdrop Merkle Distributor
```solidity
contract AirdropDistributor {
    IERC20 public token;
    bytes32 public merkleRoot;
    uint256 public claimStart;
    uint256 public claimEnd;

    // Tracks claimed addresses
    mapping(address => bool) public isClaimed;

    constructor(
        address _token,
        bytes32 _merkleRoot,
        uint256 _claimStart,
        uint256 _claimEnd
    ) {
        token = IERC20(_token);
        merkleRoot = _merkleRoot;
        claimStart = _claimStart;
        claimEnd = _claimEnd;
    }

    function claim(
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external {
        require(block.timestamp >= claimStart, "Claim not started");
        require(block.timestamp <= claimEnd, "Claim ended");
        require(!isClaimed[msg.sender], "Already claimed");

        // Verify Merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        require(MerkleProof.verify(merkleProof, merkleRoot, leaf), "Invalid proof");

        isClaimed[msg.sender] = true;
        require(token.transfer(msg.sender, amount), "Transfer failed");
        emit Claimed(msg.sender, amount);
    }

    event Claimed(address indexed claimant, uint256 amount);
}
```

### Contributor Payment Streaming (Sablier-style)
```solidity
contract PaymentStream {
    IERC20 public token;
    address public sender;
    address public recipient;
    uint256 public totalAmount;
    uint256 public startTime;
    uint256 public stopTime;
    uint256 public withdrawn;

    modifier onlySender() { require(msg.sender == sender, "Not sender"); _; }
    modifier onlyRecipient() { require(msg.sender == recipient, "Not recipient"); _; }

    constructor(
        address _token,
        address _recipient,
        uint256 _totalAmount,
        uint256 _duration
    ) {
        token = IERC20(_token);
        sender = msg.sender;
        recipient = _recipient;
        totalAmount = _totalAmount;
        startTime = block.timestamp;
        stopTime = block.timestamp + _duration;

        token.safeTransferFrom(msg.sender, address(this), _totalAmount);
    }

    function withdrawable() public view returns (uint256) {
        if (block.timestamp <= startTime) return 0;
        if (block.timestamp >= stopTime) return totalAmount - withdrawn;

        uint256 elapsed = block.timestamp - startTime;
        uint256 duration = stopTime - startTime;
        return (totalAmount * elapsed) / duration - withdrawn;
    }

    function withdraw() external onlyRecipient {
        uint256 amount = withdrawable();
        require(amount > 0, "Nothing to withdraw");
        withdrawn += amount;
        token.safeTransfer(recipient, amount);
    }

    function cancel() external onlySender {
        token.safeTransfer(sender, totalAmount - withdrawn);
    }

    // Governance: % of tokens with streaming creates predictable sell pressure
    // Calculate daily sell volume = totalStreamingAmount / averageStreamDuration
}
```

## Performance Considerations

- **Governance gas costs**: Each vote cast costs ~50-100k gas. With 10,000 voters, a single proposal cycle costs 0.5-1 ETH in gas
- **Optimization**: Batch vote casting with EIP-712 signatures and delegated relayer
- **Snapshot for signaling**: Off-chain voting reduces costs by 1000x for non-binding votes
- **L2 deployment**: Deploy governance on L2 (Arbitrum/Optimism) with cross-chain message relay to L1 for execution
- **Proposer bond recovery**: Gas for executing cancelation should be recoverable from bond
- **Timelock gas**: A single timelock execute can cost 200k-500k gas depending on action count

## References
- references/blockchain-management-advanced.md — Blockchain Management Advanced Topics
- references/blockchain-management-fundamentals.md — Blockchain Management Fundamentals
- references/dao-governance.md — DAO Governance
- references/dao-operations-lifecycle.md — DAO Operations Lifecycle
- references/multi-sig-operations.md — Multi-Sig Operations
- references/project-methodology.md — Web3 Project Methodology
- references/token-engineering-and-emissions.md — Token Engineering & Emissions
- references/tokenomics-design.md — Tokenomics Design
- references/treasury-management.md — Treasury Management

## Handoff
blockchain-management → blockchain-tokenomics (for deep token model implementation)
blockchain-management → blockchain-security (for audit and governance security)
