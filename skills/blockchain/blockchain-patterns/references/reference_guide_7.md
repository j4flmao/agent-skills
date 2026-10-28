# On-Chain Governance: Governor, Votes and Timelock

Token-based on-chain governance lets holders propose and execute protocol changes. This reference covers the OpenZeppelin Governor stack (v5), voting tokens with checkpoints, timelock execution, parameter choices, and known attack patterns.

## Architecture

```
ERC20Votes token ──(delegated voting power, checkpoints)──► Governor
                                                            │ propose / vote / queue
                                                            ▼
                                                     TimelockController ──► protocol contracts
```

| Contract | Responsibility |
|----------|----------------|
| `ERC20Votes` / `ERC721Votes` | Track voting power history via checkpoints; holders must delegate (even to self) to vote |
| `Governor` + extensions | Proposal lifecycle, counting, quorum |
| `GovernorTimelockControl` | Queues successful proposals in the timelock |
| `TimelockController` | Enforces delay; is the admin/owner of protocol contracts |

## Voting Token

```solidity
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

contract GovToken is ERC20, ERC20Permit, ERC20Votes {
    constructor(address treasury) ERC20("Gov", "GOV") ERC20Permit("Gov") {
        _mint(treasury, 100_000_000e18);
    }
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }
    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
```

Voting power is read at a past snapshot (`getPastVotes(account, timepoint)`), which blocks "buy tokens, vote, sell" within one proposal. By default the clock is block numbers; override `clock()`/`CLOCK_MODE()` (ERC-6372) to use timestamps, which suits L2s with irregular block times.

## Governor

```solidity
import {Governor} from "@openzeppelin/contracts/governance/Governor.sol";
import {GovernorSettings} from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import {GovernorCountingSimple} from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import {GovernorVotes} from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import {GovernorVotesQuorumFraction} from "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import {GovernorTimelockControl} from "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

contract ProtocolGovernor is
    Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes,
    GovernorVotesQuorumFraction, GovernorTimelockControl
{
    constructor(IVotes token, TimelockController timelock)
        Governor("ProtocolGovernor")
        GovernorSettings(1 days, 5 days, 100_000e18) // votingDelay, votingPeriod, proposalThreshold (units follow clock)
        GovernorVotes(token)
        GovernorVotesQuorumFraction(4)               // 4% of total supply at snapshot
        GovernorTimelockControl(timelock)
    {}
    // Required overrides (state, proposalNeedsQueuing, _queueOperations, _executeOperations,
    // _cancel, _executor, votingDelay, votingPeriod, proposalThreshold) delegate to super;
    // the OpenZeppelin Contracts Wizard generates them.
}
```

With timestamp clock mode, `1 days` etc. are seconds; with block mode, values are block counts.

## Proposal Lifecycle

| State | Trigger |
|-------|---------|
| Pending | `propose(targets, values, calldatas, description)` |
| Active | After `votingDelay` |
| Succeeded / Defeated | After `votingPeriod`; for > against and quorum reached |
| Queued | `queue(...)` schedules in timelock |
| Executed | `execute(...)` after timelock delay |
| Canceled / Expired | Proposer cancel before active, or not executed in time |

Proposal ID is `hashProposal(targets, values, calldatas, keccak256(description))`.

## Timelock Wiring

- Governor gets `PROPOSER_ROLE` and `CANCELLER_ROLE` on the timelock.
- `EXECUTOR_ROLE` granted to `address(0)` (anyone can execute after delay) or to the Governor.
- Remove the deployer's admin role from the timelock after setup.
- The timelock (not the Governor) owns protocol contracts and holds treasury funds.

## Parameter Considerations

| Parameter | Trade-off |
|-----------|-----------|
| Voting delay | Time for holders to delegate/acquire before snapshot vs speed |
| Voting period | Participation vs agility |
| Proposal threshold | Spam resistance vs inclusiveness |
| Quorum | Too low: capture by small coalitions; too high: paralysis |
| Timelock delay | User exit window vs incident response speed |

Pair slow governance with a narrowly scoped guardian (e.g. a Safe that can only pause or cancel queued proposals).

## Attack Patterns

| Attack | Mitigation |
|--------|-----------|
| Flash-loan voting | Snapshot-based voting power (`getPastVotes` at proposal start) |
| Borrowed/rented votes, vote buying | Higher quorum, longer delays, monitoring delegations |
| Malicious proposal with hidden calldata | Decode and simulate every action (Tenderly, `cast`), publish human-readable descriptions |
| Low-turnout capture | Quorum, guardian veto, delegate programs |
| Governor granting itself unlimited mint | Hard caps in token contract outside governance reach |
| Proposal front-running by copying IDs | OZ v5 supports proposer suffix `#proposer=0x...` in description |

## Off-Chain Voting

Snapshot (signature-based, gasless) votes are cheap but need a trusted executor (multisig) to enact results; tools such as oSnap (UMA) bridge results to on-chain execution with an optimistic dispute window.

## Testing

```solidity
function test_ProposalExecutesThroughTimelock() public {
    vm.prank(holder); token.delegate(holder);
    vm.roll(block.number + 1); vm.warp(block.timestamp + 1);

    uint256 id = governor.propose(targets, values, calldatas, "Set fee to 25 bps");
    vm.warp(block.timestamp + governor.votingDelay() + 1);
    vm.prank(holder); governor.castVote(id, 1);           // 1 = For
    vm.warp(block.timestamp + governor.votingPeriod() + 1);
    governor.queue(targets, values, calldatas, keccak256(bytes("Set fee to 25 bps")));
    vm.warp(block.timestamp + timelock.getMinDelay() + 1);
    governor.execute(targets, values, calldatas, keccak256(bytes("Set fee to 25 bps")));
    assertEq(feeController.feeBps(), 25);
}
```

## Checklist

- [ ] Votes token with checkpoints; delegation explained in UI
- [ ] Clock mode matches chain (timestamp on L2s)
- [ ] Timelock owns protocol contracts; deployer roles renounced
- [ ] Quorum, threshold, delays justified and documented
- [ ] Guardian powers limited to pause/cancel
- [ ] Every proposal's calldata decoded and simulated before voting
