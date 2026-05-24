# DAO Governance

## Overview

DAO governance divides into on-chain governance (binding execution on-chain) and off-chain governance (signal voting with social consensus). Most mature protocols use a hybrid: off-chain temperature checks → on-chain proposal execution.

---

## 1. On-Chain Governance Frameworks

### 1.1 Compound Governor Bravo

The canonical on-chain governance model. Compound v2 Governor is the most forked DAO framework.

**Proposal Lifecycle:**

```
Proposal Created → Voting Delay → Voting Period → Queue → Execute
     |                 |               |            |
   Quorum check    Token holders    Vote cast    Timelock
   (2% of supply)  cannot vote      (3 days)     (2 days)
```

**Voting Power:** 1 COMP = 1 vote. Delegation required (self-delegation or delegate to another address).

**Config Parameters (Bravo):**

| Parameter | Typical Value | Rationale |
|-----------|---------------|-----------|
| votingDelay | 1 block (~13s) | Prevents flash loan voting |
| votingPeriod | 57600 blocks (~7 days) | Allows global participation |
| proposalThreshold | 1% of total supply | Prevents spam proposals |
| quorumVotes | 4% of total supply | Ensures minimum participation |

**Solidity Integration:**

```solidity
// GovernorBravoDelegate — proposal creation
function propose(
    address[] memory targets,
    uint[] memory values,
    string[] memory signatures,
    bytes[] memory calldatas,
    string memory description
) public returns (uint) {
    require(governorAlpha.proposalCount() < proposalCount, "GovernorBravo::propose: alpha proposals not counted");
    require(getPriorVotes(msg.sender, block.number - 1) > proposalThreshold, "GovernorBravo::propose: proposer votes below threshold");

    uint latestProposalId = governorAlpha.latestProposalIds(msg.sender);
    require(latestProposalId < proposalCount, "GovernorBravo::propose: one live proposal per proposer");

    uint proposalId = proposalCount;
    Proposal storage newProposal = proposals[proposalId];
    // ... populate proposal fields

    proposalCount++;
    emit ProposalCreated(proposalId, msg.sender, targets, values, signatures, calldatas, description, startBlock, endBlock);
    return proposalId;
}
```

**Cast Vote:**

```solidity
function castVote(uint proposalId, uint8 support) public {
    // support: 0 = Against, 1 = For, 2 = Abstain
    require(state(proposalId) == ProposalState.Active, "GovernorBravo::castVote: voting is no longer active");
    uint votes = getPriorVotes(msg.sender, block.number - 1);
    // ... record vote, update tally
}
```

### 1.2 OpenZeppelin Governor

Modular framework. Compose from building blocks.

**Module System:**

| Module | Purpose |
|--------|---------|
| GovernorVotes | Attach ERC20Votes as voting power source |
| GovernorVotesQuorumFraction | Quorum as % of total supply |
| GovernorCountingSimple | For/Against/Abstain |
| GovernorTimelockControl | Add TimelockController |
| GovernorProposalThreshold | Minimum votes to propose |

**Deployment Pattern:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorProposalThreshold.sol";

contract MyGovernor is
    Governor,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl,
    GovernorProposalThreshold
{
    constructor(IVotes _token, TimelockController _timelock)
        Governor("MyGovernor")
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4) // 4% quorum
        GovernorTimelockControl(_timelock)
    {
        // Voting delay: 1 block, Voting period: 50400 blocks (~7 days)
    }

    function votingDelay() public pure override returns (uint256) { return 1; }
    function votingPeriod() public pure override returns (uint256) { return 50400; }
    function proposalThreshold() public pure override returns (uint256) { return 100e18; } // 100 tokens

    function _executor() internal view override returns (address) {
        return super._executor(); // TimelockController
    }
}
```

### 1.3 Aave Governance

Two-token governance: AAVE (voting power) + stkAAVE (activated by staking). Cross-chain via bridge.

**V2 Architecture:**

```
Aave Proposal → AIP (Aave Improvement Proposal) → Snapshot → On-chain Vote → Execution
                                                      |
                                               stkAAVE activated
                                               (40% quorum, 20% differential)
```

**Cross-Chain Governance (v3):**

```
Ethereum Mainnet ← Governance Bridge → Polygon/Avalanche/Arbitrum/Optimism
        |                                     |
  Proposal created                     Cross-chain payload
  Vote on mainnet                      Executed via bridge
```

**Key Difference from Compound:** Aave requires staking AAVE (stkAAVE) for voting, creating aligned incentives. AAVE that is lent on Aave does NOT count for voting unless withdrawn.

---

## 2. Off-Chain Governance

### 2.1 Snapshot

Gasless off-chain voting. Uses cryptographic signatures. Results executed by multi-sig.

**Voting Strategies:**

| Strategy | Weight | Use Case |
|----------|--------|----------|
| token-weighted-balance | 1 token = 1 vote | Standard token voting |
| quadratic | sqrt(tokens) = vote power | Minority protection |
| delegation | Delegated balance | Compound-like |
| whitelist | Equal weight per address | Early community votes |
| erc20-balance-of | Balance at block | Multi-token voting |
| cross-chain-balance | Balance on L2 | L2 tokens |

**Snapshot Space Configuration (JSON):**

```json
{
  "name": "My DAO",
  "network": "1",
  "symbol": "VOTE",
  "strategies": [
    {
      "name": "erc20-balance-of",
      "params": {
        "address": "0x...",
        "symbol": "GOV",
        "decimals": 18
      }
    }
  ],
  "members": [],
  "filters": {
    "defaultTab": "all",
    "minScore": 0
  }
}
```

**Vote Types:**

- **Single choice**: pick one option (most common)
- **Approval**: approve any number of options
- **Quadratic**: quadratic voting formula
- **Ranked choice**: rank preferences (IRV)
- **Basic**: For/Against/Abstain

### 2.2 Tally

Proposal management dashboard. Wraps on-chain governance with UI.

**Tally Integration:**

- Connects to Governor Bravo / OZ Governor contracts
- Displays proposal status, vote tally, delegate tracking
- Supports proposal creation directly from UI
- Real-time voting analytics

---

## 3. Governance Attacks

### 3.1 Flash Loan Voting

**Attack:** Borrow tokens via flash loan, vote on proposal, return tokens in same block.

**Mitigation:** votingDelay >= 1 block. Prevents flash loan from holding tokens across blocks.

```solidity
// Protected: votes snapshotted at start block, not current block
function getPriorVotes(address account, uint blockNumber) public view returns (uint96) {
    require(blockNumber < block.number, "prior votes: not yet determined");
    return _checkpoints[account][_findCheckpointSpan(account, SafeCast.toUint32(blockNumber))].votes;
}
```

### 3.2 Whale Governance Capture

**Attack:** Large holder buys enough tokens to pass any proposal unilaterally.

**Mitigation:**

| Defense | Effectiveness |
|---------|---------------|
| Quorum threshold | Partial — whale can meet quorum alone |
| Quadratic voting | High — vote cost increases quadratically |
| Conviction voting | High — time-weighted voting power |
| Proposal threshold cap | Medium — limits proposal frequency |
| Timelock + veto | High — community can cancel malicious proposal |

### 3.3 Proposal Spam

**Attack:** Submit many proposals with low-quality content to drain attention.

**Mitigation:** proposalThreshold (e.g., 1% of supply) and proposer whitelist in early stages.

### 3.4 Voting Manipulation

- **Sybil attack**: create many addresses to amplify vote. Mitigation: quadratic voting, identity verification (Gitcoin Passport).
- **Bribery**: buy votes via smart contract. Mitigation: commit-reveal voting schemes, ZK voting.
- **Vote selling**: delegate-for-hire. Mitigation: non-transferable voting power, soulbound tokens.

---

## 4. Proposal Lifecycle (Full Flow)

```
┌──────────────────────────────────────────────────────────────┐
│                   PROPOSAL LIFECYCLE                          │
├──────────────────────────────────────────────────────────────┤
│ 1. Forum Discussion        (off-chain, 3-7 days)              │
│    → RFC (Request for Comment)                                │
│ 2. Temperature Check       (Snapshot, 3-5 days)               │
│    → Signal vote, not binding                                 │
│ 3. On-Chain Proposal       (Governor contract)                │
│    → Created by qualified proposer                            │
│ 4. Voting Delay            (1 block, prevents flash loans)    │
│ 5. Voting Period           (3-7 days)                         │
│    → Token holders cast For/Against/Abstain                  │
│ 6. Queue                   (Timelock enqueue, gas required)   │
│ 7. Timelock Delay          (2-7 days)                         │
│    → Community can monitor, veto if malicious                 │
│ 8. Execute                 (Calls target with calldata)       │
└──────────────────────────────────────────────────────────────┘
```

## 5. Voting Configuration Parameters

| Parameter | Minimum | Recommended | Maximum | Effect When Too Low | Effect When Too High |
|-----------|---------|-------------|---------|---------------------|----------------------|
| votingDelay | 0 | 1-3 blocks | 1 day | Flash loan attacks | Delays urgent proposals |
| votingPeriod | 1 hour | 3-7 days | 30 days | Low participation | Slow decision making |
| quorum | 0.5% | 4-10% | 20% | Easy to pass bad proposals | Paralysis |
| proposalThreshold | 0 | 0.5-1% | 5% | Spam proposals | Centralized proposal power |
| timelock | 0 | 2-7 days | 30 days | No review window | Delays emergency fixes |

## 6. Governance Framework Comparison

| Feature | Compound Bravo | OZ Governor | Aave v2 |
|---------|---------------|-------------|---------|
| Voting token | COMP | Any ERC20Votes | AAVE + stkAAVE |
| Quorum | Fixed % | Configurable % | Configurable % |
| Proposal threshold | Fixed | Configurable | Configurable |
| Timelock | Built-in | Optional module | Built-in |
| Cross-chain | No | No | Yes (v3) |
| Abstain support | Yes | Yes | No |
| Upgradeable | Yes (Bravo) | No (UUPS optional) | Yes |
| Gas efficient | Moderate | Higher (modular) | Moderate |
| Forks | 100+ | 50+ | 10+ |

**Recommendation:** Use OpenZeppelin Governor for new projects (most battle-tested, modular, actively maintained). Use Compound Bravo if you need upgradeable governance. Use Aave model if you have two-token economics (governance + staked).
