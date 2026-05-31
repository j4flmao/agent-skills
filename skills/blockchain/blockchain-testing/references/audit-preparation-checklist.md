# Audit Preparation Checklist

## Overview

A smart contract audit is the most critical quality gate before mainnet deployment. Proper audit preparation reduces audit cost (fewer findings → fewer re-audit rounds), shortens audit timeline (cleaner code → faster review), and significantly reduces the risk of post-deployment vulnerabilities. This reference provides a comprehensive pre-audit checklist covering code quality, test coverage, fuzz testing, formal verification, documentation, and operational readiness. It also covers the audit lifecycle from vendor selection through findings remediation to post-audit actions.

## Core Architecture Concepts

### Audit Readiness Maturity Model

| Level | Description | Entry Criteria | Typical Timeline |
|---|---|---|---|
| **L1: Pre-audit** | Internal development phase | Code complete with unit tests | N/A |
| **L2: Audit-ready** | Code frozen, fuzz tested, documented | All L1 + fuzz tests pass, no known bugs | 2-4 weeks of prep |
| **L3: In-audit** | Under external review | All L2 + spec docs delivered, Q&A completed | 2-6 weeks |
| **L4: Findings resolved** | All issues fixed or acknowledged | All L3 + finding remediation complete | 1-3 weeks of fix |
| **L5: Production** | Deployed with monitoring | All L4 + deployment verified, monitoring alerting active | After deploy |

### Audit Scope Dimensions

```
Audit Scope
│
├─ Smart Contract Logic
│   ├─ Access control (RBAC, ownership, role management)
│   ├─ Business logic (math, ordering, state transitions)
│   ├─ Oracle integration (price feeds, data sources)
│   └─ Cross-contract calls (composability, reentrancy)
│
├─ Economic Security
│   ├─ Incentive alignment (tokenomics, fee structures)
│   ├─ MEV resistance (frontrunning, sandwich attacks)
│   ├─ Liquidity and slippage modeling
│   └─ Oracle manipulation economics
│
├─ Protocol Infrastructure
│   ├─ Upgrade mechanism (UUPS, transparent proxy)
│   ├─ Emergency pause / circuit breaker
│   ├─ Timelock and governance integration
│   └─ Cross-chain bridge messaging
│
└─ Operational Security
    ├─ Admin key management and multisig configuration
    ├─ Deployment and initialization safety
    ├─ Parameter validation and bounds checking
    └─ Event emission and off-chain indexing
```

## Architecture Decision Trees

### Audit Vendor Selection

```
Selecting an audit firm?
├── Budget?
│   ├── < $30K → Solo auditor (Code4rena, Sherlock, private auditor)
│   ├── $30K-$100K → Mid-tier firm (Consensys Diligence, Trail of Bits, Spearbit)
│   └── > $100K → Top-tier (OpenZeppelin, Trail of Bits, Sigma Prime)
├── Protocol complexity?
│   ├── Simple ERC20/721 → Any qualified auditor
│   ├── DeFi / Lending → Look for DeFi specialization
│   ├── ZK / L2 → Must have ZK-specific audit experience
│   └── Cross-chain / Bridge → Bridge security track record needed
└── Timeline?
    ├── < 2 weeks → Competitive audit (Code4rena, Sherlock)
    ├── 2-6 weeks → Traditional audit engagement
    └── > 6 weeks → Multi-round audit with formal verification
```

### Finding Severity Classification

```
Finding severity?
├── Critical
│   ├─ Direct loss of user funds
│   ├─ Unauthorized minting or transfers
│   └─ Permanent protocol freeze
├── High
│   ├─ Loss of funds under specific conditions
│   ├─ Broken core protocol invariant
│   └─ Griefing / permanent denial of service
├── Medium
│   ├─ Temporary loss of funds
│   ├─ Incorrect event emission
│   ├─ Violation of expected behavior
│   └─ Frontrunning opportunity with low profit
└── Low / Informational
    ├─ Gas inefficiency
    ├─ Unused code / dead code
    ├─ Best practice deviation
    └─ Missing parameter validation
```

## Implementation Strategies

### Pre-Audit Code Freeze Process

```markdown
# Pre-Audit Freeze Checklist

## 2 Weeks Before Audit
- [ ] Feature-complete: all planned functionality implemented
- [ ] No pending design decisions
- [ ] NatSpec written for all public/external functions
- [ ] Known limitations documented in README
- [ ] Formal specification written (if applicable)
- [ ] Architecture Decision Records (ADRs) created for design choices

## 1 Week Before Audit
- [ ] Code freeze announced to team
- [ ] Only critical bug fixes merged (no new features)
- [ ] Test suite executed with 100% pass rate
- [ ] `forge coverage` report generated and reviewed
- [ ] Fuzz tests run for minimum 24 hours with no failures
- [ ] `forge snapshot` taken for gas baseline
- [ ] Slither analysis run and all findings addressed or acknowledged
- [ ] Deployment scripts finalized and tested against fork

## Day Before Audit
- [ ] Final commit hash tagged (e.g., `audit-v1`)
- [ ] Latest test run attached to audit package
- [ ] Known issues list compiled with rationale
- [ ] Setup guide for auditor (how to compile, test, deploy)
- [ ] Deployed testnet instances URLs (if applicable)
- [ ] Documentation bundle sent to auditor
```

### Test Suite Requirements

```solidity
// Minimum test coverage targets
// Coverage: >= 95% lines, >= 90% branches
// All invariant tests must pass with 10,000+ runs
// All fuzz tests must pass with 5,000+ runs per function

// Example: Comprehensive test structure
contract TokenAuditTest is Test {
    using stdStorage for StdStorage;

    // Unit tests: each function, each access control modifier
    function test_mint_onlyOwner() public { /* ... */ }
    function test_mint_revokedOwner() public { /* ... */ }
    function test_mint_maxSupply() public { /* ... */ }

    // Fuzz tests: random valid inputs
    function testFuzz_mint(address to, uint256 amount) public {
        vm.assume(to != address(0));
        vm.assume(amount > 0);
        vm.assume(totalSupply() + amount <= maxSupply);
        token.mint(to, amount);
        assertEq(token.balanceOf(to), amount);
    }

    // Invariant tests: protocol properties must always hold
    function invariant_totalSupplyBounded() public {
        assertLe(token.totalSupply(), token.maxSupply());
    }

    function invariant_noZeroBalanceMinters() public {
        // All minters must have been called by owner
    }

    // Boundary tests: edge cases
    function test_mint_zeroAmount_reverts() public { /* ... */ }
    function test_mint_toZeroAddress_reverts() public { /* ... */ }
    function test_mint_exceedMaxSupply_reverts() public { /* ... */ }
}
```

### Fuzz Testing Requirements

```solidity
// Pre-audit fuzz test requirements:
// - All state-modifying functions with numeric inputs: 5,000+ fuzz runs
// - Core protocol functions: 10,000+ fuzz runs
// - Invariant tests: 10,000+ runs with 10+ contract actors

// Foundry invariant test configuration
// foundry.toml
[fuzz]
runs = 5000
dictionary_weight = 40
include_storage = true
include_push_bytes = true

[invariant]
runs = 10000
depth = 100
fail_on_revert = false
call_override = false

// Echidna configuration for deeper analysis
// echidna.yaml
testMode: assertion
testLimit: 100000
seqLen: 100
shrinkLimit: 5000
coverage: true
corpusDir: "echidna-corpus"
```

### Formal Verification Requirements

```solidity
// For critical contracts, Halmos or Certora formal verification is recommended

// Halmos (symbolic execution) configuration
// Run: halmos --solver-timeout-assertion 300

// Certora specification example
// certora/specs/Token.spec
rule total_supply_invariant() {
    mathint total_before = totalSupply();
    // Assume any valid mint operation
    uint256 amount;
    // The total supply must increase by exactly `amount`
    assert totalSupply() == total_before + amount;
}

rule no_mint_to_zero() {
    // It should never be possible to mint to address 0
    env e;
    require e.msg.sender == owner;
    // ... verify revert on mint(0, amount)
}
```

## Integration Patterns

### Audit Package Structure

```
audit-delivery-v1/
├── contracts/
│   ├── src/
│   │   ├── Token.sol
│   │   ├── Vault.sol
│   │   └── ...
│   └── foundry.toml
├── test/
│   ├── Token.t.sol
│   ├── Vault.t.sol
│   ├── invariant/
│   │   └── ProtocolInvariants.t.sol
│   └── fuzz/
│       └── TokenFuzz.t.sol
├── certora/
│   ├── specs/
│   │   └── Token.spec
│   └── conf/
│       └── Token.conf
├── docs/
│   ├── specification.md
│   ├── architecture.md
│   ├── risk-analysis.md
│   └── known-issues.md
├── coverage/
│   ├── index.html
│   └── lcov.info
├── deploy/
│   ├── DeployToken.s.sol
│   └── deploy-config.json
└── README.md
```

### Auditor Communication Protocol

```markdown
# During Audit: Q&A Protocol

1. **Code freeze is absolute** — no changes during audit unless critical
2. **Batch questions** — collect all questions for 24 hours, answer in batch
3. **Document every answer** — maintain a Q&A log for the team
4. **If a fix is necessary mid-audit**:
   - Create a minimal diff (just the fix)
   - Mark the original code and the fix
   - Ask auditor to re-verify the specific area
   - Do NOT merge new features
5. **Weekly sync** — 30-min call to align on progress, no scope creep
6. **Final delivery** — auditor provides report with findings, severity, recommendations
```

## Performance Optimization

### Cost Reduction Strategies for Audit

| Strategy | Cost Impact | Timeline Impact | Risk Reduction |
|---|---|---|---|
| Pre-audit fuzz testing (2 weeks) | -15-25% audit cost | +2 weeks prep | -40% critical findings |
| Formal verification add-on | +30-50% audit cost | +2-4 weeks | -60% critical findings |
| Multiple small audits vs one large | -10-20% total cost | Fragmented timeline | -20% finding overlap |
| Competitive audit (Code4rena) | -50-70% vs top-tier | +1 week judging | Wider coverage, less depth |
| Re-audit after major changes | Full audit cost | Full timeline | Essential for safety |

## Security Considerations

### Pre-Audit Vulnerability Self-Checklist

```solidity
// Common pre-audit findings to check yourself:

// 1. Reentrancy: all external calls made before state changes?
function withdraw(uint256 amount) external {
    // BAD: external call before state change
    (bool sent, ) = msg.sender.call{value: amount}("");
    require(sent, "Transfer failed");
    balances[msg.sender] -= amount;

    // GOOD: checks-effects-interactions pattern
    balances[msg.sender] -= amount;
    (bool sent, ) = msg.sender.call{value: amount}("");
    require(sent, "Transfer failed");
}

// 2. Access control: every external function has appropriate modifier?
// Check: has `onlyOwner`, `onlyRole`, or similar?
function criticalAction() external { // No modifier → critical finding
    // ...
}

// 3. Integer overflow/underflow? (Checked automatically in Solidity 0.8+)
// But unchecked blocks need manual review
function unsafeDecrement(uint256 a, uint256 b) external pure returns (uint256) {
    unchecked {
        return a - b; // Will underflow if a < b → check callers
    }
}

// 4. Oracle manipulation: using spot price without TWAP?
function getCollateralRatio(address user) public view returns (uint256) {
    uint256 spotPrice = oracle.latestAnswer(); // Manipulable!
    // GOOD: use TWAP
    uint256 twapPrice = oracle.consult(token, 30 minutes);
}

// 5. Frontrunning: transaction ordering dependency?
function claim(uint256 amount) external {
    require(amount <= rewards[msg.sender], "Too much");
    // Someone monitoring mempool can frontrun if this is time-sensitive
}
```

### Critical Pre-Audit Checks

| Check Area | What to Verify | Tool |
|---|---|---|
| Access control | Every external function has a modifier | Slither `access-control` |
| Reentrancy | All state changes happen before external calls | Slither `reentrancy` |
| Uninitialized proxies | Implementation contract initialized? | Manual review |
| Delegatecall safety | No storage collision in proxies | Slither `delegatecall` |
| Timestamp dependence | `block.timestamp` used for randomness? | Manual review |
| tx.origin usage | Should use `msg.sender` instead | Slither `tx-origin` |
| Unchecked return values | External call return value checked? | Slither `unchecked-transfer` |
| Selfdestruct | Can be triggered maliciously? | Slither `suicidal` |
| Shadowed state variables | Variable naming collisions | `solc` warning |
| Uninitialized storage | Storage pointers to wrong slots | Slither `uninitialized-state` |

## Operational Excellence

### Post-Audit Fix Protocol

```markdown
# After Receiving Audit Report

## Phase 1: Triage (24-48 hours)
1. Read full report, classify all findings
2. Tag each finding: fix / acknowledge / dispute
3. Prioritize by severity
4. Assign owners for each fix

## Phase 2: Fix (based on severity)
- Critical/High: fix within 48 hours
- Medium: fix within 1 week
- Low/Informational: fix before deployment or document rationale

## Phase 3: Re-audit
- Critical/High findings → re-audit required
- Medium findings → re-audit recommended
- Low findings → auditor verification may suffice

## Phase 4: Deployment readiness
- All fixes merged to main branch
- Re-audit complete with no new critical/high findings
- Fix commit hash tagged as `audit-v2`
- Deployer multisig configured
- Monitoring and alerting for deployed contracts
```

### Multi-Audit Strategy

```yaml
# For high-value protocols, consider multi-layered audit approach:
audit_strategy:
  round_1:
    firm: "Trail of Bits"
    focus: "Core protocol logic and access control"
    timeline: "4 weeks"

  round_2:
    firm: "Code4rena"
    focus: "Economic security and edge cases"
    timeline: "2 weeks + 1 week judging"

  round_3:
    firm: "Specialist auditor"
    focus: "Specific critical components (e.g., ZK circuits)"
    timeline: "2 weeks"

  formal_verification:
    tool: "Certora"
    focus: "Core invariants and mathematical properties"
    timeline: "2-4 weeks"
```

## Testing Strategy

### Post-Audit Regression Tests

```solidity
// After fixing audit findings, add regression tests:
contract AuditFixRegressionTest is Test {
    // For each fixed finding, create a test that would have caught it
    function test_audit_AUDIT_001_reentrancy_prevented() public {
        // Attack scenario that would have succeeded before fix
        address attacker = address(new ReentrancyAttacker(address(vault)));
        vm.deal(attacker, 10 ether);
        vm.prank(attacker);
        // The attacker should not be able to drain
        vm.expectRevert();
        ReentrancyAttacker(attacker).attack();
    }

    function test_audit_AUDIT_002_access_control_enforced() public {
        // Non-owner should not be able to call protected functions
        vm.prank(address(0x1234));
        vm.expectRevert("Ownable: caller is not the owner");
        token.mint(address(this), 100);
    }
}
```

## Common Pitfalls

| Pitfall | Consequence | Prevention |
|---|---|---|
| Sending unfinished code to audit | Wasted audit budget on code that will change | Only send code-frozen, feature-complete contracts |
| No fuzz testing before audit | Audit finds obvious fuzz-level bugs, wasting finding slots | 5000+ fuzz runs per function before submission |
| Poor documentation / spec | Auditor misses architectural assumptions, subtle bugs | Write complete specification before audit |
| Ignoring economic security | Audit finds logic bugs but misses economic attacks | Include economic modeling in audit scope |
| Rushing the audit timeline | Superficial review, missed vulnerabilities | Minimum 2 weeks for any meaningful audit |
| Not verifying auditor track record | Picking cheapest without reference checks | Request past audit reports from similar protocols |
| One audit is enough | No protocol has zero bugs after one audit | Plan for 2-3 audit rounds + formal verification |
| No regression tests for fixes | Fix introduces new bug in unrelated area | Add specific regression test for each finding fix |

## Key Takeaways

1. **Code freeze first** — never send moving code to an auditor. Freeze 1-2 weeks before delivery.
2. **Fuzz test until no failures** — run Foundry fuzz + Echidna for minimum 24 hours with zero failures before audit.
3. **Write a specification** — a formal or natural-language spec helps auditors understand your intent and catch deviations.
4. **Audit is not a substitute for testing** — auditors find what tests miss; they should not be your QA team.
5. **Plan for multiple audit rounds** — no protocol goes from pre-audit to production in one round. Budget for at least 2 rounds.
6. **Document known issues** — telling the auditor "we know about X, decided it's acceptable" saves their time and avoids false positives.
7. **Fix finding root causes, not symptoms** — a reentrancy fix should add checks-effects-interactions, not just one `nonReentrant` modifier on the reported function.
8. **Add regression tests for every finding** — ensure the exact vulnerability scenario is covered in the test suite post-fix.