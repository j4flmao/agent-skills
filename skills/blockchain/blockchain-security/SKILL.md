---
name: blockchain-security
description: >
  Use this skill when asked about blockchain security, smart contract auditing, DeFi threat modeling, blockchain incident response, bug bounty programs, economic security, formal verification of smart contracts, and blockchain-specific security analysis. Languages: Solidity, Python, Rust, Haskell. Covers threat modeling for DeFi protocols (STRIDE for blockchain), audit methodology (scope, manual review, tooling, report), incident response (emergency pause, fork coordination, compensation), bug bounty programs (Immunefi, Code4rena), economic security (game theory, incentive analysis, MEV), and formal verification (Certora CVL, Halmos, Scribble). References shared skills from skills/security/ (threat-intelligence, secrets-management, siem-engineering) and skills/quality/ (property-based-testing) where core concepts overlap. Do NOT use for: general smart contract testing (use blockchain-testing), standard application security (use skills/security/ skills), or core cryptography (use blockchain-cryptography).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [blockchain, security, audit, formal-verification, phase-blockchain]
---

# Blockchain Security

## Purpose
Guide blockchain-specific security analysis covering smart contract auditing, DeFi threat modeling, economic security, incident response, formal verification, and bug bounty programs. Combines traditional security engineering with blockchain-specific risks like economic attack vectors, flash loans, oracle manipulation, and MEV.

## Agent Protocol

### Trigger
"blockchain security", "smart contract audit", "DeFi security", "DeFi threat model", "blockchain threat modeling", "audit methodology", "blockchain incident response", "emergency pause", "fork coordination", "bug bounty", "Immunefi", "Code4rena", "economic security", "game theory blockchain", "incentive analysis", "MEV security", "certora", "formal verification blockchain", "Halmos", "Scribble", "solidity security", "smart contract vulnerability", "blockchain exploit", "flash loan attack", "oracle manipulation", "reentrancy", "access control blockchain", "cross-chain security", "bridge security"

### Input Context
- Smart contracts or protocol to analyze
- Platform (EVM/Solana/Cosmos/Cardano)
- Security objective (audit/threat model/incident response/pre-audit review)
- Codebase location and audit history
- Previous incidents or vulnerabilities
- TVL and risk exposure

### Output Artifact
Security analysis including: threat model, vulnerability findings, economic analysis, verification approach, and remediation recommendations.

### Response Format
1. **Threat model**: assets, actors, attack vectors, trust assumptions, attack surface
2. **Audit approach**: methodology, tools, timeline, expected coverage
3. **Economic analysis**: incentive structures, game theory, exploit scenarios
4. **Security controls**: mitigations, circuit breakers, monitoring
5. **Verification**: formal properties, invariants, proof techniques
6. **Incident response**: emergency plan, communication template

### Completion Criteria
- Threat model identifies all trust assumptions and attack surfaces
- Vulnerability findings include severity, impact, likelihood, and remediation
- Economic analysis models incentive alignment and identifies exploit paths
- Formal verification specifies key invariants (solvency, access control, correctness)
- Emergency response plan covers: pause, communication, fork coordination, post-mortem

### Max Response Length
5000 tokens

## Decision Trees

### Security Assessment Type
```
Security need:
├── Pre-deployment audit?
│   ├── Early stage → Threat modeling + architecture review
│   │   ├── Identify trust assumptions
│   │   ├── Map attack surface
│   │   └── Design security controls
│   ├── Mid-development → Full audit (automated + manual + fuzz)
│   │   ├── Slither + Mythril static analysis (first pass)
│   │   ├── Manual line-by-line review (second pass)
│   │   ├── Foundry fuzz + invariant tests (third pass)
│   │   ├── Echidna/Medusa property-based fuzzing (fourth pass)
│   │   └── Certora/Halmos formal verification (fifth pass)
│   └── Pre-launch → Final audit + bug bounty launch
│       ├── Re-audit after fixes
│       ├── Immunefi or Code4rena bounty program
│       └── Emergency response plan
├── Incident response?
│   ├── Ongoing exploit → Emergency pause + communication
│   ├── Post-exploit → Damage assessment + recovery plan
│   └── Post-mortem → Root cause analysis + fix implementation
└── Ongoing security?
    ├── Continuous monitoring → Forta, Tenderly alerts
    ├── Bug bounty management → VRT, severity classification
    └── Periodic review → Quarterly parameter review, annual deep audit
```

### Vulnerability Severity (Immunefi Standard)
| Severity | Impact | Payout Range |
|----------|--------|-------------|
| Critical | Direct loss of funds, permanent DoS | Up to $10M+ |
| High | Theft of unclaimed yield, temporary DoS | $50K-$500K |
| Medium | Contract fails to deliver expected return, temporarily frozen funds | $5K-$50K |
| Low | Griefing (no direct financial loss) | $1K-$5K |
| None | Informational | No payout |

## DeFi Threat Modeling (STRIDE-Blockchain)

### STRIDE Adapted for Blockchain
| Threat | Blockchain Equivalent | Example |
|--------|----------------------|---------|
| Spoofing | Fake event log emission, counterfeit token | Impostor token impersonation |
| Tampering | State manipulation, reorg, flash loan price | Manipulating oracle price |
| Repudiation | Unauthorized proposal, fake governance | Flash loan governance attack |
| Information disclosure | Mempool snooping, frontrunning | MEV extraction from public tx pool |
| Denial of Service | Gas griefing, block stuffing | Low-cost DoS via state bloat |
| Elevation of Privilege | Unauthorized role assignment, proxy admin | OpenZeppelin UUPS unauthorized upgrade |

### Common Attack Trees

**Reentrancy Attack Tree**
```
├── External call before state update
│   ├── ETH transfer via .call{value}() (forward all gas)
│   ├── ERC-777 callback (tokensToSend hook)
│   └── ERC-1155 callback (onERC1155Received)
├── Recipient is malicious contract
│   └── Malicious fallback re-enters victim function
└── Mitigations:
    ├── Checks-effects-interactions pattern
    ├── ReentrancyGuard (OpenZeppelin)
    └── Pull-over-push for payments
```

**Oracle Manipulation Attack Tree**
```
├── Single oracle price source
│   ├── Flash loan to manipulate AMM price
│   ├── Sandwich attack on oracle update
│   └── Frontrun oracle transaction
├── TWAP manipulation
│   └── Multi-block TWAP manipulation (expensive but possible)
└── Mitigations:
    ├── Redundant oracles (minimum 3 independent sources)
    ├── TWAP with sufficient window (30 min+)
    ├── Stale price checks (max age < 1 hour)
    └── Circuit breakers on price deviation
```

**Flash Loan Attack Tree**
```
├── Borrow large capital from flash loan provider
├── Manipulate price (AMM swap → oracle price change)
├── Exploit protocol with manipulated price
│   ├── Mint undercollateralized position
│   ├── Drain pool via mispriced asset
│   └── Trigger false liquidations
└── Repay flash loan + profit
```

## Vulnerability Catalog

### Reentrancy
```solidity
// VULNERABLE
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount);
    (bool ok, ) = msg.sender.call{value: amount}(""); // external call BEFORE state
    require(ok);
    balances[msg.sender] -= amount; // state update AFTER
}

// FIXED: CEI pattern
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount; // state update FIRST
    (bool ok, ) = msg.sender.call{value: amount}(""); // then external call
    require(ok);
}
```

### Access Control
```solidity
// VULNERABLE: init function unprotected
function initialize(address _owner) external {
    owner = _owner; // anyone can call this
}

// FIXED
function initialize(address _owner) external initializer {
    __Ownable_init(_owner);
}

// VULNERABLE: tx.origin for auth
function adminOnly() external {
    require(tx.origin == owner); // tx.origin can be phished
}

// FIXED: msg.sender for auth
function adminOnly() external {
    require(msg.sender == owner);
}
```

### Flash Loan Attack Example
```solidity
// VULNERABLE: uses spot price for liquidation
function getLiquidationValue(address user) external view returns (uint256) {
    return collateral[user] * getSpotPrice(); // Can be manipulated
}

// FIXED: uses TWAP
function getLiquidationValue(address user) external view returns (uint256) {
    return collateral[user] * getTWAP(30 minutes); // Manipulation resistant
}
```

### ERC-4626 Inflation Attack
```solidity
// VULNERABLE: first depositor manipulates share price
// Attacker mints 1 wei shares, then donates large amount to vault
// share price becomes very high → subsequent depositors get 0 shares

// FIXED: virtual shares + assets
uint256 internal constant VIRTUAL_SHARES = 1e6;
uint256 internal constant VIRTUAL_ASSETS = 1e6;

function convertToShares(uint256 assets) public view returns (uint256) {
    uint256 supply = totalSupply + VIRTUAL_SHARES;
    return assets * supply / (totalAssets() + VIRTUAL_ASSETS);
}
```

## Audit Methodology

### Phase 1: Scope & Recon
1. Define audit scope: contracts, functions, interactions
2. Review specification and architecture documentation
3. Understand trust model: admin roles, upgrade paths, emergency mechanisms
4. Set up local environment with all dependencies

### Phase 2: Automated Analysis
5. Run Slither: detect common vulnerabilities, generate inheritance graph
6. Run Mythril: symbolic execution for deep vulnerability detection
7. Run Aderyn: Solidity static analyzer for spec violations
8. Run Halmos: symbolic testing for complex assertions
9. Run semgrep with custom rules

### Phase 3: Manual Review
10. Storage layout review: collision risks, upgrade compatibility
11. Access control review: privilege escalation paths, role hierarchy
12. Business logic review: correctness, edge cases, integer handling
13. External dependency review: oracle, bridge, token interactions
14. Economic analysis: incentive alignment, MEV exposure, game theory

### Phase 4: Fuzz & Invariant
15. Parameterized fuzzing with Foundry
16. Invariant tests with Echidna or Medusa
17. Stateful fuzzing with Foundry fuzz
18. Differential testing with reference implementation

### Phase 5: Formal Verification
19. Certora CVL for critical invariants (solvency, access control)
20. Scribble for annotation-based formal specs
21. Halmos for symbolic testing of complex logic

### Phase 6: Report & Remediation
22. Document findings with severity, impact, exploit scenario, fix
23. Retest fixes after remediation
24. Final report with methodology, findings, and risk assessment

### Audit Tools Comparison
| Tool | Type | Best For | Limitations |
|------|------|----------|-------------|
| Slither | Static analysis | First-pass vulnerability detection, inheritance analysis | False positives, limited deep logic |
| Mythril | Symbolic execution | Complex state-exploration bugs | Slow, state explosion |
| Echidna | Property-based fuzzing | Invariant testing with custom properties | Requires writing properties |
| Foundry fuzz | Parameterized fuzzing | Input-range fuzzing, stateful tests | Less directed than Echidna |
| Certora | Formal verification | Critical invariants, solvency proofs | Expensive, requires CVL DSL |
| Halmos | Symbolic testing | Bounded verification of assertions | Not fully automated |
| Aderyn | Static analysis | Solidity spec compliance | Limited depth |

## Formal Verification

### Certora CVL Example
```cvl
// Certora Verification Language: define invariants
rule total_supply_invariant() {
    // totalSupply must equal sum of all balances
    uint256 total = totalSupply();
    uint256 sum = 0;
    address user;
    // Quantified assertion over all users (handled by Certora)
    assert total == currentContract.balance + sumOfAllUserBalances();
}

rule no_double_withdrawal(address user) {
    uint256 balance_before = balanceOf(user);
    uint256 amount = balance_before / 2;
    
    withdraw(amount);
    withdraw(amount);
    
    uint256 balance_after = balanceOf(user);
    assert balance_after == 0;
}
```

## Economic Security

### Game Theory Analysis Framework
```
Protocol economic security:
├── Nash equilibrium analysis
│   ├── Does a rational user have incentive to act honestly?
│   └── Is there a profitable deviation path?
├── Attack cost vs. profit
│   ├── How much capital required for exploit?
│   └── What is the expected profit from exploit?
├── MEV analysis
│   ├── What MEV opportunities exist?
│   └── Can MEV disrupt protocol equilibrium?
└── Composability risk
    ├── What other protocols does this interact with?
    └── Can a failure cascade through the system?
```

## Incident Response

### Emergency Response Playbook
```solidity
// Emergency pause pattern
contract Pausable {
    bool public paused;
    address public guardian;

    modifier whenNotPaused() {
        require(!paused, "PAUSED");
        _;
    }

    function pause() external {
        require(msg.sender == guardian, "NOT_GUARDIAN");
        paused = true;
        emit EmergencyPaused(msg.sender);
    }

    function unpause() external {
        require(msg.sender == guardian, "NOT_GUARDIAN");
        paused = false;
        emit EmergencyUnpaused(msg.sender);
    }
}
```

### Incident Response Phases
```
1. DETECT: Monitoring alert, community report, or security partner notification
   - Forta bot detects anomalous activity
   - Tenderly alert on unexpected state changes
   - Community report via Discord/Immunefi

2. ASSESS: Guardian multi-sig evaluates severity (15-30 min)
   - Is there an active exploit?
   - What is compromised? (contract, key, oracle, bridge?)
   - What is the damage scope? (TVL at risk)

3. PAUSE: Guardian pauses affected contracts
   - Emergency pause kill switch (guardian only)
   - Stop deposits, withdraws, liquidations as needed
   - Can't pause critical owner functions (timelock bypass)

4. COMMUNICATE: Pre-prepared message template
   - "We are aware of an issue with [contract]. All funds are safe. Paused while investigating."
   - Twitter/Discord/Governance forum within 30 min
   - Regular updates every 2 hours

5. MITIGATE: Emergency proposal with fix
   - Upgrade contract (if upgradeable) or deploy new version
   - Requires timelock delay (unless emergency bypass)
   
6. RESUME: Governance vote to unpause + validate fix
   - Multi-sig unpause after fix confirmed
   - Bug bounty payout for reporter

7. POST-MORTEM: Public incident report within 7 days
   - Root cause analysis
   - Timeline of events
   - Fix details
   - Lessons learned
```

## Rules
1. Always start with threat modeling before writing any code — identify assets, trust boundaries, attack surfaces
2. Audit pipeline: scope → manual review → automated tooling → fuzz/invariant → formal verification → report
3. Economic security is as important as code security — analyze game theory and incentive alignment
4. Bug bounty programs follow Immunefi severity: Critical (up to $1M+), High ($50K-$100K), Medium ($5K-$20K), Low ($1K-$5K)
5. Incident response: freeze/pause contract → assess damage → communicate → fork coordination → post-mortem → compensation
6. Formal verification complements but does NOT replace manual review and fuzz testing
7. Always verify signature malleability (low-s for ECDSA), nonce reuse, and signature replay protection
8. Cross-chain bridges require additional security layers: rate limiting, circuit breakers, tiered security
9. ERC-4626 vaults must prevent inflation attacks with virtual shares + assets
10. Flash loan resistance requires TWAP pricing, not spot prices for critical operations
11. Upgradeable contracts must have disabled initializers on implementation contracts
12. All admin functions should be behind timelock + multi-sig, never single-key control
13. Oracle prices must be validated for freshness (staleness threshold) and deviation
14. Economic security analysis must model worst-case market conditions, not average
15. Bug bounties must cover the protocol's total value secured (TVS) for adequate incentives

## Implementation Examples

### Security Analysis (Solidity — Reentrancy Guard)
```solidity
contract ProtectedVault {
    using SafeERC20 for IERC20;
    uint256 private _status = 1; // 1=unlocked 2=locked
    modifier nonReentrant() {
        require(_status == 1, "Reentrant call");
        _status = 2; _;
        _status = 1;
    }
    function withdraw(uint256 amount) external nonReentrant {
        uint256 bal = balances[msg.sender];
        require(bal >= amount, "Insufficient");
        balances[msg.sender] = bal - amount; // Effects first
        token.safeTransfer(msg.sender, amount); // Interaction last
    }
}
```

### Formal Verification — Certora CVL
```cvl
methods {
    function totalAssets() external returns (uint256);
    function totalSupply() external returns (uint256);
}
invariant solvency()
    totalAssets() >= totalSupply()
    filtered on f { f.contract != currentContract }
```
  - references/bug-bounty-program.md — Bug Bounty Programs for Blockchain Projects
  - references/economic-security.md — Economic Security in Blockchain Systems
  - references/formal-verification-deep.md — Formal Verification for Smart Contracts
  - references/incident-response.md — Blockchain Incident Response
  - references/smart-contract-security.md — Smart Contract Security
  - references/threat-modeling.md — Threat Modeling for Blockchain Systems
  - references/blockchain-vulnerability-catalog.md — Common Blockchain Vulnerabilities Catalog
  - references/cross-chain-security.md — Cross-Chain Security Considerations
  - references/flash-loan-attack-patterns.md — Flash Loan Attack Patterns

## Architecture Decision Trees

```
Blockchain Security Approach
├── Audit phase?
│   ├── Pre-development → Threat model + formal spec
│   ├── Post-development → Smart contract audit + fuzzing
│   ├── Pre-deployment → Comprehensive security review + bug bounty
│   └── Post-deployment → Continuous monitoring + incident response
├── Vulnerability type?
│   ├── Reentrancy → ReentrancyGuard, checks-effects-interactions
│   ├── Access control → OpenZeppelin AccessControl, multisig
│   ├── Oracle manipulation → TWAP, multiple sources, circuit breaker
│   └── Math errors → SafeMath (pre-0.8), overflow checks (0.8+)
├── Formal verification needed?
│   ├── Yes (high-value) → Certora / Halmos (rule-based verification)
│   ├── Yes (ZK circuits) → Circom compiler checks, zkVerify
│   └── No → Standard audit + fuzz testing
└── Bug bounty program?
    ├── Yes → Immunefi / HackerOne (up to 10% of TVL)
    └── No → Internal audits only (higher residual risk)
```

**Decision criteria**: Evaluate TVL at risk, regulatory requirements, team security maturity, and budget.

## Implementation Patterns

### Reentrancy Protection
```solidity
// blockchain-security/contracts/ReentrancyGuard.sol
pragma solidity ^0.8.20;

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}
```

### Access Control with Timelock
```solidity
// blockchain-security/contracts/TimelockController.sol
contract TimelockController {
    uint256 public constant MIN_DELAY = 2 days;
    uint256 public constant GRACE_PERIOD = 14 days;
    mapping(bytes32 => bool) public queuedTransactions;

    event Queued(bytes32 indexed txHash, address target, uint256 value, bytes data, uint256 executeTime);
    event Executed(bytes32 indexed txHash);

    function queue(address target, uint256 value, bytes calldata data) external onlyRole(PROPOSER_ROLE) {
        bytes32 txHash = keccak256(abi.encode(target, value, data, block.timestamp + MIN_DELAY));
        queuedTransactions[txHash] = true;
        emit Queued(txHash, target, value, data, block.timestamp + MIN_DELAY);
    }

    function execute(address target, uint256 value, bytes calldata data) external onlyRole(EXECUTOR_ROLE) {
        bytes32 txHash = keccak256(abi.encode(target, value, data, block.timestamp));
        require(queuedTransactions[txHash], "Not queued");
        delete queuedTransactions[txHash];
        (bool success,) = target.call{value: value}(data);
        require(success, "Execution failed");
        emit Executed(txHash);
    }
}
```

## Production Considerations

- **Audit frequency**: Full audit before mainnet deploy; re-audit on major upgrade (> 20% code change).
- **Bug bounty**: Launch Immunefi bounty (up to 10% TVL); scope all contracts and frontend.
- **Monitoring**: Deploy Forta/OpenZeppelin Defender Sentinel for transaction monitoring.
- **Incident response**: Pre-defined IR playbook; pause contracts within 30 min of exploit detection.
- **Insurance**: Purchase DeFi insurance (Nexus Mutual, Sherlock) for TVL coverage.
- **Responsible disclosure**: Maintain security.txt; private disclosure channel for vulnerability reports.

## Anti-Patterns

| Anti-Pattern | Consequence | Solution |
|---|---|---|
| Skipping threat model | Miss architecture-level vulnerabilities | Mandatory threat model before code |
| Only automated audits | Miss logic bugs | Manual review + automated + fuzzing |
| No timelock on upgrades | Compromised owner upgrades malicious code | Enforce minimum 48h timelock |
| Fixing bugs without re-audit | New bugs introduced | Re-audit > 20% code changes |
| No pause mechanism | Can't stop exploit in progress | Implement pausable + emergency stop |

## Performance Optimization

- **Gas-efficient access control**: Use bitmap-based roles (BitMaps) instead of array for role management.
- **Batch verification**: Verify multiple signatures in single operation for multisig.
- **Storage-efficient audits**: Use event-based audit trail instead of on-chain storage for non-critical logs.
- **Off-chain monitoring**: Use The Graph subgraph for security monitoring; avoid on-chain overhead.
- **Selective audit scope**: Focus formal verification on critical paths (token transfers, liquidations).

## Security Considerations

- **Checks-effects-interactions**: Always follow pattern: validate → update state → external calls.
- **Proxy security**: Use transparent proxy (EIP-1967) to avoid function selector collisions.
- **Access control**: Implement role-based access with OpenZeppelin AccessControl; avoid `onlyOwner`.
- **Signature replay**: Include domain separator, nonce, and chain ID; validate expiry.
- **Randomness**: Use Chainlink VRF for on-chain randomness; never use block.timestamp or blockhash.
- **Governance attack resistance**: Implement flash loan resistant voting; time-weighted voting power.

## Phase
blockchain → blockchain-security
