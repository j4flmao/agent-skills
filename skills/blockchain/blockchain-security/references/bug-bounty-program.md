# Bug Bounty Programs for Blockchain Projects

## Program Types

| Platform | Format | Payout Model | Best For |
|----------|--------|--------------|----------|
| Immunefi | Ongoing bounty | Fixed + TVL-based | DeFi protocols with significant TVL |
| Code4rena | Competitive audit (1-2 weeks) | Prize pool split by severity | Projects needing broad review quickly |
| Sherlock | Competitive audit + arbitration | Fixed pool, judges resolve disputes | Projects wanting finality |
| Hats Finance | Vault-based, automatic payouts | Premiums paid by protocol | Continuous security coverage |
| Cantina | Invite-only competitive audit | High base rate + bonuses | Mature protocols with complex code |

---

## Immunefi Program Setup

### Program Configuration
```yaml
# immunefi-program.yaml
name: "MyProtocol Bug Bounty"
asset_type: "Smart Contract"
network: "Ethereum"
tvl_at_risk: 500_000_000  # $500M

# Vault (escrow) — required for Immunefi
vault:
  network: ethereum
  asset: usdc
  amount: 1_000_000  # $1M deposited

severity_matrix:
  critical:
    min_payout: 500_000
    max_payout: 1_500_000
    payout_percentage: 0.1  # 10% of TVL at risk
  high:
    min_payout: 50_000
    max_payout: 100_000
  medium:
    min_payout: 5_000
    max_payout: 20_000
  low:
    min_payout: 1_000
    max_payout: 5_000

# Assets at risk
assets_at_risk:
  smart_contracts:
    - 0xVault
    - 0xToken
    - 0xStaking
  out_of_scope:
    - governance_timelock_contracts
    - testnet_deployments
```

### Severity Classification (Immunefi Standard)

| Severity | Direct Loss of Funds | With Preconditions | User Action Required | Examples |
|----------|---------------------|-------------------|---------------------|----------|
| **Critical** | Yes, > $100K | No | No | Reentrancy draining pool, unprotected `selfdestruct` |
| **High** | Yes, ≤ $100K | Yes | No | Oracle manipulation with flash loan (needs ≥ $10M pool) |
| **Medium** | Indirect | Maybe | Yes | Sandwichable withdrawal, temporary freeze via grief |
| **Low** | No | N/A | N/A | Missing events, unused variables, informative |

### Payout Matrix (TVL-Based)

```
TVL at Risk | Critical | High | Medium | Low
------------|----------|------|--------|-----
< $10M      | Up to $100K | Up to $25K | Up to $5K | Up to $1K
$10-100M    | Up to $500K | Up to $50K | Up to $10K | Up to $2.5K
$100M-1B    | Up to $1.5M | Up to $100K | Up to $20K | Up to $5K
> $1B       | Up to $10M  | Up to $250K | Up to $50K | Up to $10K
```

### Immunity Vault Deployment
```solidity
// Example: Deploying an Immunefi vault
// Protocol deposits USDC into vault contract
import {ImmunefiVault} from "@immunefi/vaults/ImmunefiVault.sol";

contract MyProtocolBounty {
    ImmunefiVault public vault;

    constructor() {
        vault = new ImmunefiVault(
            address(this),  // token (USDC)
            1_000_000e6,   // amount
            block.timestamp + 365 days  // expiry
        );
    }

    function fundVault() external onlyOwner {
        USDC.transfer(address(vault), 1_000_000e6);
        vault.deposit();
    }
}
```

### Vulnerability Submission Template
```markdown
## Vulnerability Report

**Title**: [Severity] [Short Description]
**Protocol**: MyProtocol
**Platform**: Immunefi

**Summary**
{2-3 sentences describing the vulnerability and impact}

**Vulnerability Type**
[ ] Reentrancy
[ ] Access Control
[ ] Oracle Manipulation
[ ] Flash Loan Attack
[ ] Logic Error
[ ] Economic Exploit
[ ] Other: _________

**Affected Contract(s)**
- Vault.sol (0x...): line 45-60

**Prerequisites**
- [ ] Flash loan required: {yes/no, amount}
- [ ] User action required: {yes/no}
- [ ] Admin key compromise required: {yes/no}

**Proof of Concept**
```solidity
// Full, runnable PoC
// Include: deploy → setup → exploit → profit
// Attach as .zip file if > 50 lines
```

**Impact**
- Direct loss: {amount and token}
- Indirect loss: {description}
- User funds at risk: {yes/no, percentage}

**Suggested Fix**
{brief description of fix approach}

**Severity Assessment**
- Critical: {justification}
- Is there a precondition? {explain}
- Is attacker profit > $100K? {explain}

**Attachments**
- [ ] PoC code (.zip)
- [ ] Exploit transaction trace
- [ ] Test file (Foundry/Hardhat)
```

---

## Code4rena Competitive Audit

### Contest Format
```
┌─────────────────────────────────────────────────┐
│ Phase            │ Duration │ Activity           │
├──────────────────┼──────────┼───────────────────┤
│ Registration     │ 1 week   │ Wardens sign up    │
│ Contest          │ 1-2 weeks│ Wardens submit bugs│
│ Judging          │ 1 week   │ Judges triage      │
│ Review           │ 1 week   │ Wardens appeal     │
│ Finalized        │ -        │ Results published  │
└─────────────────────────────────────────────────┘
```

### Finding Scoring (Code4rena)
```yaml
scoring:
  high: 1000 points (10 ETH equivalent)
  medium: 500 points (3 ETH equivalent)
  gas: 0 points (fixed bonus pool)

# 50-75% findings: "known" or "duplicate" → reduced payout
# Best finding: bonus up to 25% of total pool

# Judging criteria:
  - Reproducibility (high weight)
  - Impact (high weight)
  - Likelihood (medium weight)
  - Uniqueness (medium weight)
```

### Code4rena Submission Example
```markdown
## Lines of code
https://github.com/protocol/repo/blob/main/src/Vault.sol#L45-L60

## Vulnerability details

### Impact
The `withdraw()` function does not apply the reentrancy guard,
allowing an attacker to drain the entire vault.

### Proof of Concept
1. Deploy `Vault` and deposit 100 ETH
2. Deploy `Attack` contract
3. Call `Attack.attack()` with 1 ETH
4. Attacker balance: 101 ETH (entire vault)

```solidity
function attack() external payable {
    vault.deposit{value: msg.value}();
    vault.withdraw();
    // receive() re-enters withdraw() before balance update
}
```

### Recommended Mitigation Steps
Add `nonReentrant` modifier to `withdraw()`.

### Assessed type
Reentrancy
```

---

## Hats Finance

### Vault-Based Continuous Coverage
```solidity
// Hats Vault integration
import {IHatsVault} from "@hats/vault/IHatsVault.sol";

contract HatsBountyVault {
    IERC20 public premiumToken;  // USDC
    uint256 public premiumRate;  // e.g., 500 basis points/year
    uint256 public tvlCovered;

    function depositPremium(uint256 amount) external onlyOwner {
        premiumToken.transferFrom(msg.sender, address(this), amount);
        hatsVault.deposit(address(this), amount);
    }

    function claimBounty(address recipient, uint256 amount) external onlyHatsArbitrator {
        hatsVault.withdraw(recipient, amount);
    }
}
```

---

## SneakClub

SneakClub is a private, invite-only bug bounty platform focused on high-severity findings. Key differences:
- **Private**: only vetted researchers participate
- **High trust**: researchers and protocols sign NDAs
- **High payout**: typically 2-3× Immunefi rates for same severity
- **Discretion**: findings disclosed privately, no public report required

---

## Comparison: Immunefi vs Code4rena vs Sherlock

| Aspect | Immunefi | Code4rena | Sherlock |
|--------|----------|-----------|----------|
| **Format** | Ongoing | 1-2 week contest | Contest + arbitration |
| **Payout** | Severity + TVL | Prize pool split | Fixed pool |
| **Coverage** | Continuous | Point-in-time | Point-in-time |
| **Judging** | Protocol decides | 3 judges + appeals | 3 judges + arbitrator |
| **Gas findings** | Not rewarded | Separate pool | Not rewarded |
| **Best for** | Ongoing security | Deep dive | Finality |

---

## Submission Best Practices
1. **Always provide a runnable PoC** — Foundry/Hardhat test that proves the exploit
2. **Show profit** — include exact profit in USD/ETH
3. **List preconditions** — flash loan size, timing, admin actions needed
4. **Compare to severity matrix** — justify Critical vs High
5. **Include mitigation suggestion** — code diff preferred over description
6. **Avoid duplicates** — check known issues list first

## References
- Immunefi Severity Classification: `https://immunefi.com/severity/`
- Code4rena Wardens Guide
- Sherlock Criteria for Valid Findings
