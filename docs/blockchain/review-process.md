# Code Review and Security Review Process

## Scope

This process governs all code reviews, security reviews, and audits for blockchain/smart contract projects. It applies to every PR, regardless of size or perceived risk.

---

## PR Review Process

### Workflow

```
Developer → Open PR → CI Checks → Initial Review → Line Review → Security Review → Changes → Approval → Merge
```

### Step-by-step

#### 1. Developer Opens PR

The developer must include:
- Description of changes (what, why, risk assessment)
- Link to issue/ticket
- Test results summary (coverage, gas snapshot)
- Deployment instructions (if applicable)
- Security implications (any access control changes, oracle usage, new dependencies)

#### 2. CI Checks (Automated)

Every PR must pass:

| Check | Tool | Required |
|---|---|---|
| Unit tests pass | forge test / cargo test | Yes |
| Lint passes | forge fmt --check / cargo fmt | Yes |
| Slither analysis | slither . --filter-paths lib/ | Yes (no high findings) |
| Gas diff | forge snapshot --diff | Yes (< 5% increase) |
| Coverage | forge coverage --report lcov | Yes (>= 90%) |
| Dependency audit | npm audit / cargo audit | Yes |
| Code size | wc -c < artifact | Yes (< 24KB) |

CI must fail if any required check fails. CI bypass is only allowed for emergency hotfixes with explicit lead approval.

#### 3. Initial Review (Architecture)

Assigned to 1 senior developer. Focus:
- Does the design match the specification?
- Are there architectural issues?
- Is the upgrade path correct?
- Are there unnecessary dependencies?
- Does it follow the coding standards?

#### 4. Line Review

Assigned to 2 reviewers. Every line must be reviewed:

```typescript
// Reviewer comments should follow this format:
// [REVIEWER_TAG] Comment text
// Tags: QUESTION, ISSUE, SUGGESTION, PRAISE, NIT

// Example:
// [ISSUE] This unchecked arithmetic can overflow on line 42
// [SUGGESTION] Consider using SafeERC20.safeTransfer instead
// [PRAISE] Clean reentrancy guard usage
```

#### 5. Security Review

Assigned to 1 reviewer with security focus. Must go through the Security Review Checklist (see below).

#### 6. Changes Addressed

- Each reviewer comment must be resolved (acknowledged or fixed)
- Re-review: security comments must be re-reviewed
- Re-approval: if significant changes were made

#### 7. Merge

- All approvals received
- All CI checks green
- No unresolved security issues
- Merge only via squash (clean history) or rebase (linear history)

---

## Security Review Checklist

Apply this checklist to every function changed in the PR.

### Access Control

- [ ] Who can call this function? Is there a role check?
- [ ] Is the modifier correctly applied? Any missing modifiers?
- [ ] Can unprivileged users escalate to privileged roles?
- [ ] For `onlyOwner`: is ownership renounced or transferred correctly?
- [ ] For upgradeable contracts: who controls the proxy admin?
- [ ] Can initializer be called again? (check `initialized` variable)
- [ ] Are `__gap` arrays present for storage upgrades?

### Input Validation

- [ ] Are all uint/int parameters bounded? (zero, max, reasonable range)
- [ ] Is `address(0)` checked for new address parameters?
- [ ] Are array lengths checked? (bounded loops)
- [ ] Are amounts positive? (`amount > 0`)
- [ ] Are percentages within valid range? (`<= DENOMINATOR`)
- [ ] Are timestamps in the correct range? (not in past, not too far future)
- [ ] Are Merkle proofs validated? (check root, check proof length)

### Reentrancy

- [ ] Does this function make external calls?
- [ ] Are state variables updated before the external call? (Checks-Effects-Interactions)
- [ ] Are reentrancy guards applied where needed?
- [ ] Can a malicious recipient re-enter the contract?
- [ ] Can flash loans trigger unexpected behavior?
- [ ] Are cross-function reentrancy vectors present?

### Arithmetic

- [ ] Using Solidity 0.8+ checked arithmetic? (or SafeMath for older versions)
- [ ] Are rounding directions documented and correct? (round up vs round down)
- [ ] Are divisions performed after multiplication to preserve precision?
- [ ] Can rounding errors be exploited? (dust amounts, precision loss)
- [ ] Are intermediate overflow risks mitigated? (use uint256 for intermediate values)

### Oracle Usage

- [ ] Is the oracle manipulation-resistant? (TWAP preferred over spot)
- [ ] Is there a fallback oracle if primary fails?
- [ ] Is there a staleness check? (how old is the price?)
- [ ] Are extreme price movements bounded? (deviation check)
- [ ] Can the oracle be frontrun?
- [ ] What happens if oracle returns 0 or negative?
- [ ] What happens if the oracle is paused/deprecated/withdrawn?

### Upgrade Safety

- [ ] Storage layout: new variables appended, not inserted, not reordered
- [ ] Are `__gap` arrays sized at 50 for upgradeable contracts?
- [ ] Is the initializer correctly using `initializer` modifier?
- [ ] UUPS vs Transparent proxy: which is used? UUPS is cheaper but riskier
- [ ] Can the implementation be selfdestructed? (UUPS vulnerability)
- [ ] Is the proxy admin ownable by a multisig with timelock?

### Event Emission

- [ ] Are all state changes emitting events?
- [ ] Are indexed parameters useful for filtering? (max 3 indexed)
- [ ] Are sensitive parameters emitted? (private keys, secrets)
- [ ] Are amounts and addresses in events consistent with state changes?

### Gas Optimization

- [ ] Are loops bounded? (no unbounded iteration)
- [ ] Are storage reads minimized? (cache in memory)
- [ ] Are `immutable`/`constant` variables used where possible?
- [ ] Is EIP-2929 awareness applied? (warm/cold storage slots)
- [ ] Are events emitted at correct positions? (after state change)
- [ ] Is calldata used over memory for read-only parameters?
- [ ] Is batch processing possible for multiple operations?

---

## Audit Gates

### Pre-Audit Requirements

Before submitting to external auditors:

- [ ] Fuzz tests run with >= 10000 runs per function
- [ ] Invariant tests run with >= 1000 runs
- [ ] Slither analysis: no high/critical findings
- [ ] Manual security review completed internally
- [ ] All known issues documented in `KNOWN_ISSUES.md`
- [ ] Code frozen (no new features, only audit fixes)
- [ ] NatSpec complete across all contracts
- [ ] Deployment scripts tested end-to-end
- [ ] Threat model document prepared
- [ ] Access control matrix prepared (who can do what)

### Audit Phase

```
Week 1-2:  Auditor familiarization + automated scanning
Week 3-4:  Manual line-by-line review
Week 5:    Auditor writes report with findings
Week 6:    Client remediation period
Week 7:    Re-audit of changed code (if high/critical findings)
```

### Post-Audit Requirements

- [ ] All findings addressed:
  - High/Critical: MUST be fixed
  - Medium: SHOULD be fixed or acknowledged with explicit risk acceptance
  - Low/Informational: SHOULD be fixed, MAY be acknowledged
- [ ] Findings log with resolution status in `AUDIT_FINDINGS.md`
- [ ] Re-audit for any high/critical fixes
- [ ] Updated deployment plan reflecting audit recommendations

---

## Approval Matrix

| Change Type | Description | Approvals Required | Audit Required |
|---|---|---|---|
| Minor | Comments, NatSpec, variable renaming, formatting | 1 | No |
| Low risk | Event changes, non-functional refactoring, test additions | 1 | No |
| Logic change | New function, parameter change, state variable addition | 2 | No |
| Moderate risk | Role changes, pause/unpause logic, fee changes | 2 | Recommended |
| Security-sensitive | Upgrade logic, access control, asset management, oracle changes | 3 | Yes |
| Critical | Proxy/implementation upgrade, ownership transfer, emergency functions | 3 + lead | Yes |
| Emergency | Critical vulnerability fix | 2 + lead + immediate deploy | Post-mortem audit |

---

## Templates

### PR Template

```markdown
## Description
[Brief description of changes]

## Related Issue
Closes #XXX

## Risk Assessment
[ ] Low - No logic change
[ ] Medium - Logic change, no asset risk
[ ] High - Asset risk, access control change, upgrade

## Testing
- Unit tests: [PASS/FAIL] (coverage: XX%)
- Fuzz tests: [PASS/FAIL] (runs: XXXX)
- Invariant tests: [PASS/FAIL] (runs: XXXX)
- Gas snapshot diff: [+XX/-XX]

## Security Checklist
- [ ] Access control reviewed
- [ ] Input validation complete
- [ ] Reentrancy considerations addressed
- [ ] Arithmetic checked
- [ ] Events emitted

## Deployment
- [ ] Deployment scripts updated
- [ ] Config files updated
- [ ] Post-deploy checks defined

## Reviewer Notes
[Anything specific reviewers should focus on]
```

### Audit Handoff Template

```markdown
# Audit Handoff Document

## Project Overview
- Name: [Project Name]
- Commit hash: [git commit]
- Branch: [branch name]
- Contracts audited: [list of contracts]

## Scope
- Total SLOC: [number]
- Lines of tests: [number]
- Test coverage: [percentage]

## Architecture
[Brief architecture description]

## Threat Model
- Trust assumptions: [who/what is trusted]
- Attack surfaces: [entry points]
- Assets at risk: [ETH, tokens, NFTs]
- Roles: [list of roles and permissions]

## Known Issues
[List pre-audit known issues and design decisions]

## Access Control Matrix
| Function | Admin | User | Public | Multisig |
|---|---|---|---|---|
| pause() | - | - | - | X |
| withdraw() | - | X | - | - |
| upgradeTo() | - | - | - | X |

## Previous Audits
[Link to previous audit reports]
```

### Security Review Report Template

```markdown
# Security Review Report

## Review Metadata
- Reviewer: [name]
- Date: [date]
- Commit: [git hash]
- Scope: [contracts/functions reviewed]

## Summary
- Total findings: [N]
  - Critical: [N]
  - High: [N]
  - Medium: [N]
  - Low: [N]
  - Informational: [N]

## Critical Findings
### [C-01] Title
- **Location**: File.sol:L42-L55
- **Description**: [issue description]
- **Impact**: [potential damage]
- **Recommendation**: [fix suggestion]
- **Status**: Open / Fixed / Acknowledged

## High Findings
...

## Medium Findings
...

## Low Findings
...

## Informational
...

## Appendix
[Any additional diagrams, references, or supporting analysis]
```
