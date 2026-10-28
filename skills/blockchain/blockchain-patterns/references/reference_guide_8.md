# Emergency Controls: Pausable, Circuit Breakers, Rate Limits

Immutable code needs safety valves. This reference covers patterns that limit damage during an incident: pausing, granular feature flags, withdrawal rate limits, caps, guardian roles, and incident runbooks. These patterns reduce blast radius; they do not replace audits.

## Pause Design

```solidity
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract LendingPool is Pausable, AccessControl {
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    constructor(address timelock, address guardian) {
        _grantRole(DEFAULT_ADMIN_ROLE, timelock);
        _grantRole(GUARDIAN_ROLE, guardian);
    }

    function pause() external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); } // slower path

    function borrow(uint256 amount) external whenNotPaused { /* ... */ }
    function repay(uint256 amount) external { /* never block repayment */ }
    function withdraw(uint256 amount) external { /* consider leaving open */ }
}
```

Principles:
- Pause should stop risk-increasing actions (deposit into a broken market, borrow, mint, bridge out) but not risk-reducing ones (repay, add collateral, often withdraw).
- Pausing is fast (guardian); unpausing is deliberate (timelock/multisig) to avoid an attacker-controlled guardian toggling.
- Document exactly which functions are pausable; users and integrators need to know.

In OZ v5, `Pausable` moved to `@openzeppelin/contracts/utils/Pausable.sol`.

## Granular Switches

A single global pause is blunt. Use per-feature or per-market flags:

```solidity
mapping(address market => uint8 flags) public marketFlags;
uint8 constant DEPOSIT_PAUSED = 1 << 0;
uint8 constant BORROW_PAUSED  = 1 << 1;
uint8 constant LIQ_PAUSED     = 1 << 2;

modifier notPaused(address market, uint8 flag) {
    if (marketFlags[market] & flag != 0) revert FeaturePaused(market, flag);
    _;
}
```

Be careful pausing liquidations: it can leave bad debt accumulating.

## Rate Limits (Withdrawal Circuit Breaker)

Limit outflow per time window so an exploit cannot drain everything in one block.

```solidity
uint256 public immutable windowLength = 1 hours;
uint256 public immutable maxOutflowPerWindow;
uint256 public windowStart;
uint256 public outflowInWindow;

function _checkOutflow(uint256 amount) internal {
    if (block.timestamp >= windowStart + windowLength) {
        windowStart = block.timestamp;
        outflowInWindow = 0;
    }
    outflowInWindow += amount;
    if (outflowInWindow > maxOutflowPerWindow) revert RateLimited(outflowInWindow, maxOutflowPerWindow);
}
```

A fixed window allows up to 2x the limit across a boundary; a token-bucket or sliding window is smoother. ERC-7265 proposed a standardized circuit breaker interface; it remains a draft, so evaluate implementations critically. Bridges commonly use per-token rate limits (e.g. Chainlink CCIP token pool rate limiters).

Trade-off: rate limits also delay legitimate large users. Offer a delayed-withdrawal queue for amounts above the limit.

## Caps

| Cap | Purpose |
|-----|---------|
| Supply/deposit cap per asset | Limits exposure to a new or risky asset |
| Borrow cap | Limits bad-debt potential |
| Per-transaction max | Slows exploitation |
| Oracle deviation bound | Rejects prices that move more than X% from last good value |

Raise caps gradually as code and markets mature.

## Oracle Safety Checks

```solidity
(, int256 answer, , uint256 updatedAt, ) = feed.latestRoundData();
if (answer <= 0) revert BadPrice();
if (block.timestamp - updatedAt > MAX_STALENESS) revert StalePrice();
```

On L2s also check the sequencer uptime feed and apply a grace period after the sequencer comes back.

## Guardian Role Design

- Held by a multisig of responders with on-call coverage, separate from the governance multisig.
- Powers limited to pause, cancel queued timelock operations, lower caps. Never: upgrade, move funds, unpause.
- Consider automatic pause triggers from monitoring (Forta bots, Hypernative, custom), with a human to unpause.
- Optional expiry: guardian powers sunset after a date unless renewed by governance.

## Upgrades as an Emergency Tool

Upgradeable contracts allow patches but add key risk. If using them:
- Upgrades go through timelock in normal operation.
- An emergency upgrade path, if any, requires a higher multisig threshold and is publicly documented.

## Incident Runbook (outline)

1. Detect: alert from monitors (abnormal outflows, invariant breaks, oracle deviations).
2. Contain: guardian pauses affected features; coordinate with bridges/exchanges if funds move cross-chain.
3. Assess: reproduce on a fork (`anvil --fork-url ... --fork-block-number`), identify root cause.
4. Communicate: status updates on official channels; never ask users to sign transactions to "secure" funds.
5. Remediate: patch via governance or upgrade path; whitehat recovery coordination (e.g. SEAL 911) if needed.
6. Post-mortem: publish timeline, root cause, fixes.

Prepare and rehearse the pause transactions in advance (pre-built Safe batches).

## Testing

- Every pausable function reverts when paused; risk-reducing functions still work.
- Only guardian can pause; only admin can unpause.
- Rate limit resets after the window; boundary behavior tested.
- Fuzz sequences including pause/unpause in invariant handlers.

## Checklist

- [ ] Pause covers risk-increasing actions only; documented
- [ ] Guardian can pause, cannot unpause/upgrade/withdraw
- [ ] Per-market flags for granular response
- [ ] Outflow rate limits or delayed withdrawal for large exits
- [ ] Supply/borrow caps on new assets
- [ ] Oracle staleness and sequencer checks
- [ ] Rehearsed incident runbook and pre-signed pause batches
