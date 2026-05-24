# Smart Contract Audit Methodology

## Overview

Full audit pipeline: **Scope → Manual Review → Automated Analysis → Fuzz/Invariant → Report**

Typical timeline: 2–6 weeks depending on complexity (~500–3000 nSLOC per week per auditor).

---

## Phase 1: Scope

### Scoping Checklist
- [ ] List all contracts and versions (git commit hash)
- [ ] nSLOC (non-empty, non-comment lines) per contract
- [ ] Which Solidity version(s) and compiler settings
- [ ] Dependencies (OpenZeppelin, Chainlink, Uniswap, etc.)
- [ ] Upgradeability: proxy pattern, UUPS vs transparent
- [ ] External dependencies (oracles, bridges, L2 sequencer)
- [ ] Out-of-scope: clearly document what is NOT covered

### Scope Template
```markdown
## Scope
| Contract | Lines | SLOC | Version |
|----------|-------|------|---------|
| Vault.sol | 320 | 280 | v1.2.0 |
| Strategy.sol | 195 | 160 | v1.2.0 |
| Token.sol | 110 | 85 | v1.2.0 |

## Out of Scope
- Chainlink oracle infrastructure
- L1 → L2 bridge relayers
- Frontend / web application

## Assumptions
- Governance multisig (3/5) is trusted
- Chainlink price feed returns prices within ±1%
- ERC-20 tokens used are standard (no fee-on-transfer)
```

---

## Phase 2: Manual Review

### Line-by-Line Code Review
For each function:
1. **Preconditions**: what must be true for correct execution?
2. **Postconditions**: what state changes occur?
3. **State transitions**: is the state machine correct?
4. **Access control**: who can call this?
5. **Arithmetic**: overflow/underflow, rounding direction?
6. **External calls**: reentrancy risk, callback danger?
7. **Gas usage**: unbounded loops, expensive patterns?

### Spec Compliance
- Does the code match the whitepaper / spec?
- Are edge cases documented and handled?
- Are there "surprise" behaviors?

### Access Control Audit Checklist
- [ ] Every state-mutating function has a modifier
- [ ] `onlyOwner` / `onlyRole` not missing
- [ ] `initialize()` cannot be frontrun
- [ ] `_disableInitializers()` called in constructor
- [ ] No unprotected `selfdestruct`, `delegatecall`, `setImplementation`
- [ ] Timelocks are non-bypassable

### Storage Layout Check (Upgradeable Contracts)
```solidity
// Storage gap pattern for upgradeable contracts
contract MyContract is Initializable {
    uint256 public value;
    // Keep storage layout compatible across upgrades
    uint256[50] private __gap;
}
```
- [ ] Storage slots not reused
- [ ] `__gap` reserved for future variables
- [ ] No collision between implementation and proxy slots (ERC-1967)

### Economic Invariants (Manual)
- [ ] Total supply of deposit shares == deposited assets × share price
- [ ] LP token value only changes via fees (not donations)
- [ ] Borrow interest accumulates correctly per second
- [ ] Liquidation bonus exceeds liquidator's gas cost

---

## Phase 3: Automated Analysis

### Slither — Static Analysis
```bash
slither . --detect reentrancy-eth,reentrancy-no-eth,unchecked-transfer
slither . --print human-summary
```

| Detector | Severity | What it finds |
|----------|----------|---------------|
| `reentrancy-*` | High | Reentrancy vulnerabilities |
| `unchecked-transfer` | Medium | Return value of transfer not checked |
| `controlled-delegatecall` | Critical | User-controlled delegatecall |

### Mythril — Symbolic Execution
```bash
myth analyze contract.sol --solc-json solc.json --execution-timeout 60
```

### Echidna — Property-Based Fuzzing
```solidity
contract EchidnaVault is Vault {
    constructor() Vault(address(0xdead)) {}
    function echidna_test_share_price_consistency() public view returns (bool) {
        if (totalSupply() == 0) return true;
        return totalAssets() >= totalSupply() * 1e18 / RATE_DENOMINATOR;
    }
}
```

### Certora Prover — Formal Verification
```bash
certoraRun Vault.sol --verify Vault:vaultRules.spec
```

See `formal-verification-deep.md` for full CVL reference.

---

## Phase 4: Fuzz / Invariant Testing

### Foundry Invariant Testing
```solidity
contract VaultInvariants is Test {
    Vault public vault;
    function setUp() public {
        vault = new Vault(address(new ERC20("T", "T")));
    }
    function invariant_total_assets_non_decreasing() public {
        uint256 before = vault.totalAssets();
        // Fuzzer calls random deposit/withdraw sequences
        uint256 after = vault.totalAssets();
        assertGe(after, before);
    }
}
```

```bash
forge test --match-invariant -vvv
```

---

## Phase 5: Report

### Severity Classification (CVSS Adapted for Smart Contracts)

| Severity | Criteria | Examples |
|----------|----------|----------|
| **Critical** | Direct loss of user/protocol funds > $100K, no meaningful precondition | Reentrancy draining entire pool, unprotected `selfdestruct` |
| **High** | Direct loss of funds with precondition, or permanent freeze of > 1% TVL | Oracle manipulation via flash loan, access control bypass with admin key |
| **Medium** | Indirect loss, temporary freeze, MEV capture exceeding normal fees | Sandwichable withdrawal, missing event emission, gas griefing |
| **Low** | Best practice violation, informational, minimal economic impact | Unlocked `pragma`, missing `indexed` events |
| **Informational** | Style, documentation, minor optimization | Typos, NatSpec missing, unused imports |

### Finding Template
```markdown
## [H-01] Reentrancy in `withdraw()` Allows Draining Pool

**Severity**: Critical
**Status**: Fixed in commit `abc1234`
**File**: `src/Vault.sol:L45-L60`

**Description**
The `withdraw()` function sends ETH before updating the user's balance,
allowing reentrancy via the recipient's fallback function.

**Impact**
An attacker can drain the entire pool by re-entering `withdraw()` before
their balance is decremented.

**Proof of Concept**
```solidity
// Attack.sol
contract Attack {
    Vault v;
    constructor(Vault _v) { v = _v; }
    receive() external payable {
        if (address(v).balance >= msg.value) {
            v.withdraw();
        }
    }
    function attack() external payable {
        v.deposit{value: msg.value}();
        v.withdraw();
    }
}
```

**Recommended Fix**
Apply checks-effects-interactions: update balance before external call.
Using OpenZeppelin's `ReentrancyGuard` is recommended.

**Code Diff**
```diff
+   using ReentrancyGuard for Vault;
-   function withdraw() external {
+   function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
+       balances[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
-       balances[msg.sender] = 0;
    }
```
```

### Post-Audit Verification
- [ ] Each finding is addressed (fixed, acknowledged, or disputed)
- [ ] Fix commit is reviewed and does not introduce new issues
- [ ] Re-run automated tools on fixed code

---

## Tools Comparison

| Tool | Type | Strengths | Weaknesses |
|------|------|-----------|------------|
| Slither | Static analysis | Fast, 90+ detectors | False positives |
| Mythril | Symbolic execution | Complex reentrancy detection | Slow, state explosion |
| Echidna | Fuzzing | Stateful, low false positives | Requires good invariants |
| Certora | Formal verification | Proves absence of bugs | Expensive, steep learning curve |
| Foundry fuzz | Fuzzing | Integrated with forge | Less sophisticated corpus |
| Halmos | Symbolic + Foundry | Loop abstraction | Newer, smaller community |

## References
- Consensys Diligence audit methodology
- Trail of Bits "Assumed Breach" methodology
- `skills/quality/property-based-testing` for fuzz/invariant foundations
