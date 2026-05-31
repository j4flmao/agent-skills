# Bridge Incident Response Runbook

> Operational runbook for detecting, containing, eradicating, and recovering
> from cross-chain bridge incidents. Targets production teams operating
> LayerZero, Wormhole, Axelar, CCIP, IBC, or proprietary bridges. Assumes
> 24/7 on-call rotation, war-room comms, and on-chain pause primitives.

---

## 1. Threat Model and Incident Taxonomy

Cross-chain bridges are the highest-value, lowest-defended surface in DeFi.
Lost funds from bridge incidents 2021–2024 exceeded USD 2.8B. Every team
operating a bridge MUST treat incident response as a first-class engineering
discipline, not a security afterthought.

### 1.1 Incident Classes

| Class | Example | Funds at Risk | Time-to-Drain | Primary Defense |
|-------|---------|---------------|---------------|-----------------|
| C1 — Validator/Guardian compromise | Ronin (5/9 keys), Harmony (2/5 keys) | 100% of TVL | Minutes | Threshold rotation, HSM, MPC |
| C2 — Smart contract logic bug | Nomad (replay), Wormhole (signature verify) | 100% of TVL | Minutes–hours | Formal verify, invariant fuzz |
| C3 — Oracle/relayer manipulation | Multichain (admin key), Poly Network (keeper) | 100% of TVL | Minutes | Multi-oracle, ARM, rate limit |
| C4 — Light client / state-proof flaw | zkBridge proof acceptance edge case | 100% of TVL | Minutes | Multiple verifier diversity |
| C5 — Source-chain reorg | PoW reorg, beacon chain reorg | Pending withdrawals | Minutes | Confirmation depth, finality wait |
| C6 — Denial of service | Relayer DoS, oracle outage | Liquidity, UX | Hours–days | Backup relayers, fallback path |
| C7 — Economic exploit | Pricing oracle, slippage in mint/burn | Variable | Minutes | TWAP, circuit breakers |
| C8 — Front-end compromise | DNS hijack, supply-chain JS injection | User wallets only | Hours | CSP, SRI, ENS+IPFS frontends |
| C9 — Governance attack | Malicious upgrade proposal | 100% of TVL | Voting delay | Timelock + monitoring |
| C10 — Replay across forks | Post-merge ETH/ETC style fork | Pending messages | Days | ChainId binding, nonce domain |

### 1.2 Severity Classification

```
SEV-1: Active exploit in progress, funds leaving the bridge.
       Pause within 5 minutes, all-hands war-room.
SEV-2: Confirmed vulnerability, exploit feasible, no active drain.
       Pause within 30 minutes, coordinated disclosure.
SEV-3: Suspected vulnerability under triage, no PoC.
       Investigation within 4 hours, monitor for indicators.
SEV-4: Degraded service (relayer lag, oracle stale) without funds risk.
       Normal on-call response, root cause within 24h.
SEV-5: Informational / near-miss / external report.
       Triage within 1 business day.
```

### 1.3 Detection Sources (must all feed a single SIEM)

- On-chain monitoring: every `MessageSent`, `MessageReceived`, `Pause`,
  `RoleGranted`, `Upgraded`, `OwnershipTransferred` event.
- TVL drift: per-asset, per-chain balance vs expected, every block.
- Relayer/Oracle telemetry: last-seen, signature submission rate, error rate.
- Mempool watchers (Flashbots, Eden, Bloxroute): malicious calldata to the
  bridge router before inclusion.
- Validator/guardian heartbeat: each node signs and gossips a heartbeat;
  alert if quorum drops below `2/3 + safety margin`.
- External threat intel: Forta, Chainalysis, Tenderly Alerts, Hexagate.
- User-reported anomalies: support tickets, Discord, security@ inbox.

---

## 2. On-Chain Pause and Circuit-Breaker Primitives

Every bridge MUST expose at least three independent kill-switches with
distinct authority and distinct latency. Defense in depth applies on-chain.

### 2.1 Layered Pause Architecture

```
Layer 0 — Hot pause (multisig or any single guardian)
          - Latency: 1 block
          - Scope: entire bridge, all routes
          - Authority: 1-of-N guardian set (auditors, sec eng, sec partners)
          - Reversible: requires governance unpause (timelock)

Layer 1 — Per-route pause (per src/dst pair or per asset)
          - Latency: 1 block
          - Scope: a single message route or token
          - Authority: ops multisig (2-of-3)
          - Reversible: ops multisig

Layer 2 — Rate limit / cap (auto)
          - Latency: continuous
          - Scope: per-asset, per-window
          - Authority: contract-enforced (no human)
          - Reversible: window expires

Layer 3 — Governance halt
          - Latency: timelock delay (48h+) bypassed only in emergency proposal
          - Scope: upgrade, parameter change
          - Authority: token holders / DAO
          - Reversible: governance vote
```

### 2.2 Solidity Reference (OpenZeppelin v5)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControlDefaultAdminRules}
    from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract BridgeRouter is AccessControlDefaultAdminRules, Pausable {
    bytes32 public constant GUARDIAN_ROLE   = keccak256("GUARDIAN_ROLE");
    bytes32 public constant OPERATOR_ROLE   = keccak256("OPERATOR_ROLE");
    bytes32 public constant GOVERNOR_ROLE   = keccak256("GOVERNOR_ROLE");

    /// @notice perAsset[token] cumulative outbound in window
    mapping(address => uint256) public outboundWindow;
    /// @notice perAsset[token] cap in window
    mapping(address => uint256) public outboundCap;
    /// @notice window length seconds
    uint256 public constant WINDOW = 1 hours;
    mapping(address => uint256) public windowStart;

    mapping(bytes32 routeId => bool) public routePaused;

    event GuardianPause(address indexed by, string reason);
    event RoutePause(bytes32 indexed routeId, address by, string reason);
    event RateLimitHit(address indexed token, uint256 amount, uint256 cap);

    /// L0: any guardian can pause globally
    function guardianPause(string calldata reason)
        external onlyRole(GUARDIAN_ROLE)
    {
        _pause();
        emit GuardianPause(msg.sender, reason);
    }

    /// L1: per-route pause (operator multisig)
    function pauseRoute(bytes32 routeId, string calldata reason)
        external onlyRole(OPERATOR_ROLE)
    {
        routePaused[routeId] = true;
        emit RoutePause(routeId, msg.sender, reason);
    }

    /// L2: rate-limit check called on every outbound message
    function _checkRateLimit(address token, uint256 amount) internal {
        if (block.timestamp >= windowStart[token] + WINDOW) {
            windowStart[token] = block.timestamp;
            outboundWindow[token] = 0;
        }
        outboundWindow[token] += amount;
        if (outboundWindow[token] > outboundCap[token]) {
            emit RateLimitHit(token, amount, outboundCap[token]);
            revert("rate limit");
        }
    }

    /// Only governor can unpause (forces deliberate restart)
    function unpause() external onlyRole(GOVERNOR_ROLE) {
        _unpause();
    }
}
```

### 2.3 Pause-First Discipline

When in doubt, pause. The cost of an erroneous 15-minute pause is user
inconvenience and a post-mortem. The cost of a delayed pause during an
active exploit is total TVL. The on-call MUST be authorized and
psychologically permitted to pause unilaterally.

---

## 3. Incident Response Phases (NIST SP 800-61 adapted)

### 3.1 Preparation (continuous)

- Maintain a runbook in two locations: git repo and printed binder in a safe.
- Quarterly tabletop exercise: simulate a SEV-1 with mock multisig signers.
- Pre-signed pause transactions stored in a tamper-evident vault, signed by
  M-of-N guardians, with replay protection scoped to the next 24 hours.
- War-room channels pre-provisioned: Signal group, Slack #sev1, Zoom bridge.
- On-call PagerDuty schedule with secondary and tertiary tiers.
- External counsel and PR firm on retainer with breach NDA.
- Funded recovery wallet (gas + emergency liquidity) on every supported chain.
- Pre-mapped contract dependency graph (proxy, implementation, libraries).
- Bug bounty live on Immunefi with 10% of TVL cap, minimum USD 1M for
  critical.

### 3.2 Detection and Triage (target: < 5 min from anomaly to page)

```
[Alert fires]
    ↓
[Pager rotates to on-call sec eng]
    ↓
[Triage in 5 min using runbook §3.2.1 checklist]
    ↓
[If SEV-1: pause + escalate]      [If SEV-2: investigate + monitor]
```

#### 3.2.1 Triage Checklist (60 seconds)

1. What event fired the alert? (link to dashboard)
2. Is funds actively moving out of the bridge? (TVL delta last 5 blocks)
3. Is the on-chain pause path available? (test transaction simulation)
4. Has anyone else been paged?
5. Declare SEV level out loud, write in incident channel.

### 3.3 Containment

**Short-term (minutes)**
- Pause: Layer 0 first, then Layer 1 per route once scope known.
- Block at the front-end: take down or display banner.
- Blacklist attacker addresses at the token contract if controlled.
- Coordinate with CEXs (Binance, Coinbase, OKX security contacts) to
  freeze incoming flows. Pre-established contact lists are critical.
- Reach out to chain validators (Tendermint chains) or sequencer ops
  (rollups) to censor attacker transactions if last-resort.
- Notify mempool builders (Flashbots) to drop attacker bundles.

**Long-term (hours–days)**
- Deploy patched implementation behind proxy.
- Migrate funds to a fresh vault if root key compromise suspected.
- Rotate guardian/oracle/relayer keys.
- Update front-end with safe routes only.

### 3.4 Eradication
- Confirm attacker no longer has access (key rotation complete).
- Patch verified by external auditor (not the original auditor).
- All exploited paths covered by new invariant tests + fuzz harness.
- Reproduce exploit in a forked test environment; confirm patch blocks it.

### 3.5 Recovery
- Stage unpause via governance proposal with full disclosure.
- Whitelist withdrawals first, deposits later (drain mode).
- Per-asset, per-route gradual unpause with monitored caps.
- Monitor for 14 days at elevated alerting before declaring stable.

### 3.6 Lessons Learned
- Public post-mortem within 7 days for SEV-1/2.
- Update runbook, alerts, and tests within 30 days.
- Bug bounty payout decision within 30 days.
- Compensation plan published within 14 days if user funds lost.

---

## 4. War-Room Playbook (SEV-1)

### 4.1 Roles

| Role | Responsibility | Skill | Authority |
|------|----------------|-------|-----------|
| Incident Commander (IC) | Coordinates, makes call | Senior eng or sec lead | Final say |
| Tech Lead | Drives technical investigation | Bridge core dev | Code merges |
| Comms Lead | Status page, Twitter, partners | Marketing/PR | External comms |
| Forensics Lead | Captures evidence | Sec eng | Read-only access |
| Liaison | Talks to CEXs, validators, LE | Senior eng or BD | Pre-approved contacts |
| Scribe | Timestamped log of every action | Anyone available | None |

### 4.2 Time-Boxed Cadence

```
T+0   Alert fires
T+2   On-call acknowledges
T+5   SEV declared, war-room spun up
T+10  Pause executed if SEV-1
T+15  Initial status page entry (yellow)
T+30  Internal sync: scope, blast radius
T+60  First external comms (Twitter, Discord)
T+120 Detailed incident summary published
T+24h Provisional post-mortem
T+7d  Full post-mortem + remediation roadmap
```

### 4.3 Communication Templates

**Status page (initial)**
```
We are investigating reports of unusual activity on the <bridge name>
route between <src> and <dst>. As a precaution, bridge transfers are
PAUSED. User funds in custody are safe. No further action is required.
Next update in 30 minutes.
```

**Status page (post-containment)**
```
The bridge remains PAUSED while we complete a root-cause investigation.
Identified scope: <token / route>. Estimated impact: <USD>. Affected
users: <list / search tool>. No new transactions will be processed
until further notice. Next update in 2 hours.
```

**Internal #sev1 message**
```
[IC] declaring SEV-1, type C2 (contract bug).
TX hashes: 0xabc, 0xdef.
TVL delta last 10 min: -$4.2M.
Pause executed: 0x123 (block 19847123, by guardian alice).
Tech lead: bob. Comms: carol. Forensics: dave.
Bridge in #war-room-2024-04-12. Zoom: <link>.
```

---

## 5. Multi-Chain Coordination

### 5.1 Cross-Chain Pause Sequencing

When pausing a bridge that spans N chains:

1. **Pause destination chains first.** Stops new mints/releases.
2. **Pause source chains second.** Stops new locks/deposits.
3. **Notify relayers/oracles.** They MAY have in-flight messages cached.
4. **Wait `confirmations + safety` blocks** before declaring quiescence.
5. Reconcile pending messages: enumerate `Sent` events with no matching
   `Received`, classify as (deliverable / replay-able / lost).

### 5.2 Pending-Message Reconciliation Script (pseudocode)

```python
def reconcile(src_chain, dst_chain, from_block, to_block):
    sent = src_chain.logs(BridgeRouter, "MessageSent",
                          from_block, to_block)
    recv = dst_chain.logs(BridgeRouter, "MessageReceived",
                          from_block, to_block + finality_skew)

    sent_by_id = {e.message_id: e for e in sent}
    recv_by_id = {e.message_id: e for e in recv}

    delivered  = sent_by_id.keys() & recv_by_id.keys()
    pending    = sent_by_id.keys() - recv_by_id.keys()
    orphan_dst = recv_by_id.keys() - sent_by_id.keys()  # CRITICAL

    return {
        "delivered": delivered,
        "pending":   pending,
        "orphan_dst": orphan_dst,   # destination received w/o source — exploit signature
    }
```

`orphan_dst` is the canonical signature of a forgery or replay. Any
non-empty `orphan_dst` is automatically SEV-1.

### 5.3 Coordinating with Validators / Sequencers

- **Cosmos / IBC**: contact channel-governance and chain governance to
  freeze the channel via gov proposal. Pre-establish relationships with
  top-20 validators of each connected chain.
- **Ethereum L2 rollups**: contact the sequencer operator. Most rollups
  in 2024 are still centralized; the operator can censor the attacker's
  L2 tx or delay batch posting.
- **Optimistic rollups**: a fraud proof window may permit reverting the
  attacker's batch if discovered in time. Coordinate with Cannon/MIPS
  proposer.
- **zk-rollups**: state is final once proven; censorship at the sequencer
  is the only practical lever.

---

## 6. Forensics

### 6.1 Evidence to Capture (read-only, before any state change)

- Full block range covering the incident from all involved chains.
- Mempool dumps from monitored builders.
- Trace of every attacker transaction (Tenderly / Foundry trace).
- Storage diffs of the bridge contracts (eth_getStorageAt before/after).
- Off-chain logs: relayer, oracle, validator, sequencer, RPC providers.
- Front-end logs and access logs (CDN, WAF).
- DNS lookup history (Cloudflare, Route53 audit).
- All admin key access logs (HSM audit, multisig signer activity).
- Threat intel reports (Forta, Hexagate, Chainalysis).

### 6.2 Chain of Custody

- Store evidence in a write-once bucket (S3 Object Lock, IPFS pinned).
- Hash every artifact (sha256), sign with the IC's PGP key.
- Tag with incident ID, timestamp, source.
- Restrict access to (Forensics Lead, IC, external counsel, auditors).

### 6.3 Attribution

Bridge exploits are increasingly state-sponsored (DPRK Lazarus has driven
50%+ of bridge thefts since 2022). Attribution is law enforcement's job,
not the on-call's. Provide evidence; do not speculate publicly.

---

## 7. Recovery, Restitution, and Restart

### 7.1 Restart Gates

```
Gate 0: Root cause documented and reproduced in test environment.
Gate 1: Patch deployed, audited by external party not in original audit.
Gate 2: Invariant suite + fuzz harness covers the failure mode.
Gate 3: Bug bounty paid (if applicable).
Gate 4: Status page green draft approved by IC + legal.
Gate 5: Compensation plan approved (if user funds lost).
Gate 6: Governance proposal to unpause passes (timelock observed).
Gate 7: Gradual unpause with caps; 14-day monitored window.
```

Skipping any gate is grounds for the IC to refuse restart.

### 7.2 Compensation Models

| Model | Source | Notes |
|-------|--------|-------|
| Treasury reimbursement | Project treasury | Fastest, signals confidence; depletes runway |
| Insurance payout | Nexus Mutual, Sherlock, Chainproof | Coverage caps and exclusions |
| Token issuance | New emission | Dilutes holders; needs governance |
| Recovery from attacker | Whitehat negotiation, bug bounty | Uncertain, 10–30% of exploited typical |
| Pro-rata haircut | LP / user | Last resort, severe reputation damage |

### 7.3 Whitehat Negotiation Protocol

If the attacker contacts you (or you can contact them):

- All comms through a legal-approved channel (encrypted, logged).
- Offer bug bounty (10% of recovered, capped at policy).
- Time-limited (48h) — after that, public attribution and LE referral.
- Never threaten without legal review.
- Document everything for chain analysis firms (Chainalysis, TRM).

---

## 8. Post-Incident Engineering

### 8.1 Mandatory Engineering Outputs

- Public post-mortem (markdown, in repo): timeline, root cause, fix,
  prevention. Use blameless template.
- New invariant test in foundry / hardhat covering the failure.
- New fuzz harness (Echidna / Medusa) targeting the regression.
- New alert with explicit threshold and runbook link.
- New chaos test if the failure was operational.
- New tabletop scenario added to quarterly rotation.

### 8.2 Post-Mortem Template Skeleton

```
# Post-Mortem: <Incident Name>

## TL;DR
1 paragraph. What happened, impact, status.

## Timeline (UTC)
- HH:MM event 1
- HH:MM event 2

## Root Cause
Technical narrative with code excerpts.

## Impact
- Funds: <USD>
- Users affected: <count, list link>
- Downtime: <hh:mm>
- SLO breaches: <list>

## What Went Well
- ...

## What Went Wrong
- ...

## Lucky Breaks
- ...

## Action Items
| ID | Action | Owner | Due | Status |
| AI-1 | ... | ... | ... | ... |
```

### 8.3 Long-Term Hardening

- Diversify verification: never depend on a single oracle, single
  guardian set, or single light-client implementation.
- Adopt zero-trust between bridge components (each verifies cryptographic
  proofs, no implicit trust).
- Reduce blast radius: per-asset, per-route, per-day caps.
- Adopt circuit breakers tied to TVL drift, not just transaction count.
- Maintain a public dashboard of bridge invariants (Total Locked vs Total
  Minted must always equal, etc.) so anyone can detect drift.

---

## 9. Decision Tree: When to Pause

```
Anomaly detected
        │
        ├─ Is funds movement abnormal? ─── yes ──→ PAUSE (L0)
        │                                         then investigate
        │
        ├─ Is a guardian/oracle/relayer offline?
        │       │
        │       ├─ Below 2/3 quorum? ── yes ──→ PAUSE (L0)
        │       └─ above quorum? ───── monitor, page
        │
        ├─ External report (researcher, partner)?
        │       │
        │       ├─ Critical CVE/PoC? ── yes ──→ PAUSE (L0), war-room
        │       └─ Speculation? ────── triage, do not pause yet
        │
        ├─ Source chain reorg deeper than confirmation depth?
        │       │
        │       └─ yes ──→ PAUSE affected route (L1)
        │
        ├─ Rate limit triggered?
        │       │
        │       └─ Automatic (already enforced); investigate cause
        │
        └─ Front-end / DNS compromise?
                │
                └─ Take down FE, post banner; bridge contracts safe
```

---

## 10. Observability Reference

### 10.1 Required Metrics (Prometheus / OpenTelemetry)

```
bridge_tvl_usd{chain,asset}                      gauge
bridge_message_sent_total{chain_src,chain_dst}   counter
bridge_message_delivered_total{...}              counter
bridge_message_in_flight{...}                    gauge
bridge_pending_age_seconds{...}                  histogram
bridge_guardian_online{guardian_id}              gauge (0/1)
bridge_oracle_lag_blocks{oracle_id}              gauge
bridge_relayer_balance_native{relayer,chain}     gauge
bridge_pause_state{layer,scope}                  gauge (0/1)
bridge_rate_limit_used_ratio{token}              gauge (0..1)
bridge_admin_event_total{event}                  counter
```

### 10.2 SLOs

| SLO | Target | Window | Page on |
|-----|--------|--------|---------|
| Message E2E delivery | p99 < 5 min | 1h | > 10 min |
| Guardian quorum | >= 5/7 | live | < 5/7 |
| TVL invariant drift | 0 | live | any nonzero |
| Pause-tx propagation | < 30s | live | > 60s |
| Pending message backlog | < 100 | live | > 1000 |
| Oracle lag | < 6 blocks | live | > 12 blocks |

### 10.3 Alert Routing

```
SEV-1 indicator → PagerDuty SEV-1 service → primary on-call (5 min ack)
                                          → secondary on-call (10 min)
                                          → IC rotation (15 min)
                → Auto-page comms lead (15 min if not acked)
                → Auto-create war-room Slack channel + Zoom

SEV-2 indicator → PagerDuty SEV-2 service → primary on-call (15 min ack)

SEV-3+         → Slack alert only, no page
```

---

## 11. Cross-Chain Specific Gotchas

- **Finality skew**: a "delivered" message on the destination may not be
  final on the source if a reorg occurs. Always verify against source
  finality before considering delivery irreversible.
- **Replay across chain ID changes**: a hard fork (e.g., ETH→ETC) creates
  a chain with duplicate state and pending messages. Bind every message
  to `(chainId, blockNumber)` and reject unknown chainIds.
- **Light-client trusting period**: Tendermint light clients drift if
  the trusting period expires before update; bridges can be frozen at
  this layer. Monitor trusting-period remaining.
- **Guardian / validator set rotations**: a missed rotation can render
  the destination unable to verify new source messages. Treat set
  rotation as a coordinated change with rehearsal.
- **Token decimals mismatch**: source 18-decimal, destination 6-decimal.
  Off-by-decimals errors are common; encode decimals on every message.
- **Permit / signature replay**: ERC-2612 signatures used for cross-chain
  approvals must include source chain ID and destination chain ID.
- **MEV at the destination**: arbitrage bots may front-run a delayed
  mint; design the destination to mint atomically with the user's
  destination-side action to avoid this.
- **Refund flows**: when a message fails on the destination, the user
  must be refunded on the source. The refund path is itself a
  cross-chain message and inherits all the same risks.

---

## 12. Quarterly Drill Catalog

Run at least one every quarter; rotate. Each must include the comms
lead and an external observer.

1. SEV-1 guardian compromise (M-of-N keys assumed leaked).
2. SEV-2 contract bug — PoC arrives at security@; race the disclosure.
3. SEV-1 oracle manipulation — pricing feed reports 10x.
4. SEV-1 source-chain reorg of depth > confirmation.
5. SEV-2 relayer outage — primary down, fallback misconfigured.
6. SEV-1 front-end DNS hijack with malicious approval prompts.
7. SEV-2 governance proposal hijack — malicious upgrade in timelock.
8. SEV-1 supply-chain attack on JS dependencies of the FE.
9. SEV-2 censorship — sequencer refuses pause transaction.
10. SEV-1 multi-chain coordinated attack across 3 routes simultaneously.

After each drill: a written debrief, runbook PR within 48h, action items
in the issue tracker with owners.

---

## 13. References (further reading)

- NIST SP 800-61 r2 — Computer Security Incident Handling Guide.
- Rekt.news bridge post-mortems (Ronin, Nomad, Wormhole, Multichain,
  Harmony, Poly, Qubit, Meter, Anyswap, Orbit).
- Google SRE Workbook ch.9 — Incident Response.
- IETF RFC 2350 — CSIRT description template.
- Chainalysis crypto-crime annual report — bridge sections.
- Trail of Bits "Are blockchain bridges secure?" series.
- a16z "Cross-chain bridges: a deep dive" by Arjun Bhuptani.
- LayerZero / Wormhole / Axelar / CCIP whitepapers — security model
  sections.
- Immunefi Vulnerability Severity Classification System v2.3 for
  bridges.

---

## 14. Checklist (laminate this)

```
[ ] Anomaly verified, not a false alarm
[ ] Severity declared out loud
[ ] On-call paged + Incident Commander identified
[ ] War-room channel opened (#sev1-<date>)
[ ] Pause executed (which layer? which scope?)
[ ] Status page updated (yellow within 15 min)
[ ] Forensics started (do not disturb evidence)
[ ] Comms lead notified, drafting public update
[ ] CEX / validator / sequencer liaison reached
[ ] Pending message reconciliation running
[ ] Recovery wallet on standby
[ ] Bug bounty triage if external report
[ ] External counsel notified
[ ] Insurance carrier notified (clock starts)
[ ] LE referral prepared if criminal nexus
[ ] Hourly cadence locked in
[ ] Scribe logging timestamped events
[ ] Restart gates listed and assigned
```
