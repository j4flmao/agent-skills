# Blockchain Incident Response

## IR Lifecycle

```
Preparation → Detection → Triage → Containment → Eradication → Recovery → Post-mortem
     │                                                                       │
     └──────────────────────────── Feedback ─────────────────────────────────┘
```

---

## Preparation

### Emergency Infrastructure
| Component | Tool | Configuration |
|-----------|------|---------------|
| Emergency pause admin | OpenZeppelin Defender | Multisig (3/5) with 48h timelock bypass for emergency |
| Monitoring | Forta, Tenderly | Real-time alerts on suspicious transactions |
| Communication | Discord, Telegram, Signal | Private channels: IR team, public: affected users |
| Fork capability | Tenderly, Foundry | Simulate exploit on fork before on-chain action |
| Backups | Full node archive, database snapshots | Daily automated |

### Emergency Multisig Setup
```solidity
// Emergency Pause
contract EmergencyPausable is Pausable {
    address public emergencyMultisig;

    function pause() external {
        require(
            msg.sender == emergencyMultisig ||
            msg.sender == owner(),
            "not authorized"
        );
        _pause();
    }

    function unpause() external onlyOwner {
        // Only owner can unpause — adds safety
        _unpause();
    }
}
```

### Playbook Preparation
- [ ] Deploy contracts with `emergencyMultisig` role from day one
- [ ] Test emergency pause on testnet fork
- [ ] Have upgrade scripts ready (UUPS or transparent proxy ready)
- [ ] Pre-sign admin transactions (hardware wallet)
- [ ] Maintain on-call rotation with clear escalation path
- [ ] Run tabletop exercises quarterly

### Communication Templates
Alert: "Suspicious activity detected on {contract}. Pausing immediately."
Update: "Confirmed attack on {protocol}. Paused. Investigating root cause."
Resolved: "Attack contained. Post-mortem in progress."

---

## Detection

### On-Chain Monitoring (Forta Agent)
```typescript
async function handleTransaction(txEvent: TransactionEvent) {
    const largeWithdrawals = txEvent.filterLog('Withdraw(address,address,uint256)');
    for (const w of largeWithdrawals) {
        if (w.args.amount.gt(MAX_WITHDRAW)) {
            await Finding.alert({
                name: 'Large Withdrawal',
                severity: FindingSeverity.Critical,
                alertId: 'VAULT-LARGE-WITHDRAW'
            });
        }
    }
}
```

### Detection Signals
| Signal | What It Indicates | Priority |
|--------|-------------------|----------|
| Flash loan usage > 10× TVL | Potential oracle manipulation | Critical |
| Multiple failed transactions from same sender | Bot attack / probing | Medium |
| Unusual profit in single tx | Sandwich / arbitrage beyond norm | Medium |
| Multiple `delegatecall` to new addresses | Proxy hijack attempt | Critical |
| Governance proposal with low participation | Flash loan governance attack | High |
| Large deviation from oracle price | Oracle manipulation | Critical |
| Abnormal event frequency | Spam / DoS attack | Low |

### Mempool Monitoring
```bash
# Subscribe to pending txs for a contract
cast log --address 0xYOUR_CONTRACT --from-block pending
```

### Tenderly Simulation
```bash
# Simulate exploit in Tenderly dashboard
# Or use API:
curl -X POST https://api.tenderly.co/api/v1/account/me/project/p/simulate \
  -H "Content-Type: application/json" \
  -d '{ "network_id": "1", "from": "0x...", "to": "0x...", "input": "0x..." }'
```

---

## Triage

### Assessment Checklist
- [ ] Which contracts are affected?
- [ ] Which funds are at risk? Total loss estimate
- [ ] Is exploit still active? (check pending txs)
- [ ] Can we pause? (is pause mechanism intact?)
- [ ] Are users in immediate danger?
- [ ] Is the attacker still draining?
- [ ] Should we notify validators / sequencer?

### Severity Classification for Incidents
| Level | Criteria | Response |
|-------|----------|----------|
| S1 Critical | > $1M loss or user funds at direct risk | Full IR team, immediate pause, public advisory |
| S2 High | $100K – $1M or > 10% TVL affected | Pause, notify partners, assess |
| S3 Medium | $10K – $100K or temporary freeze | Monitor, prepare fix, low-key |
| S4 Low | < $10K or no funds at risk | Document, fix in next release |

### Triage Example: Oracle Manipulation
```
1. Detect: Large DEX swap → borrow on lending protocol
2. Check: Is oracle TWAP-based? How many blocks?
3. Action: If TWAP ≥ 30 min → pause → blacklist → simulate unwind
```

---

## Containment

### Containment Actions (in order of escalation)
1. **Pause contract** — stop all state mutation immediately
2. **Blacklist attacker** — prevent further interaction (if supported)
3. **Transfer ownership to emergency multisig** — if admin key is at risk
4. **Upgrade contract** — deploy emergency fix via proxy
5. **Notify bridge validators** — halt cross-chain messages
6. **Contact CEX** — freeze attacker's deposited funds (if possible)

### Emergency Pause
```solidity
contract EmergencyPausable is Pausable {
    address public emergencyMultisig;

    function pause() external {
        require(msg.sender == emergencyMultisig || msg.sender == owner(), "not authorized");
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
```

### Web3 Emergency Tools
| Tool | Use Case | Access |
|------|----------|--------|
| OpenZeppelin Defender | Admin actions, pause, sentinel | Web UI + API |
| Tenderly | Simulation, debugging, forking | Web UI + API |
| Forta | On-chain monitoring, alerts | Dev SDK, web UI |
| Safe (Gnosis) | Multisig, batched transactions | Web UI |
| Flashbots Protect | MEV-aware submission | RPC endpoint |

---

## Eradication

### Fix Development
1. **Root cause**: full review of exploit tx trace
2. **Write fix**: minimal change, avoid secondary breakage
3. **Simulate fix**: fork + replay exploit, verify fix prevents it
4. **Re-audit fix**: 2 peer reviews minimum
5. **Deploy**: proxy upgrade or new contracts

---

## Recovery

### Unpause Procedure
1. Ensure exploit is fully understood and fixed
2. Verify fix on Tenderly fork with full exploit replay
3. Update all off-chain monitoring rules
4. Deploy fix contract / proxy upgrade
5. Test unpause on testnet fork
6. Monitor for 24h after unpause before resuming full operations

### Compensation Plan
- **Full coverage**: return 100% of lost funds (mint, insurance, treasury)
- **Partial coverage**: pro-rata split of recoverable funds
- **Tokens**: issue recovery/IOU tokens redeemable later
- **Snapshot**: use pre-exploit balances for airdrop of new contract
- **Fork**: if governance is compromised, consider forking

### Communication Timeline
```
T+0h: "Incident detected, pausing" → T+1h: "Scope assessed"
T+4h: "Root cause identified" → T+24h: "Fix applied"
T+48h: "Unpaused, compensation" → T+7d: "Post-mortem published"
```

---

## Post-Mortem

### Post-Mortem Template
```markdown
# Post-Mortem
**Date**: {date} | **Severity**: {S1-S4} | **Loss**: {amount}

## Summary
{overview of what happened}

## Root Cause & Timeline
| Time | Event | Notes |
|------|-------|-------|
| 12:00 | Large swap detected | Forta alert |
| 12:02 | Emergency pause triggered | 2 min response |

## Impact
- Loss: {amount} | Users: {count} | TVL delta: {before → after}

## Lessons Learned & Controls Added
1. New Forta rule for flash loan + borrow pattern
2. Circuit breaker: pause if borrow > 10× 24h average
3. Emergency drill scheduled: {date}
```

---

## Role Assignments

| Role | Responsibility |
|------|----------------|
| Incident Commander | Overall coordination |
| Technical Lead | Root cause, fix development |
| Communication Lead | User updates, partner notifications |
| Legal Counsel | Regulatory obligations |

## References
- Immunefi Incident Response Guide
- OpenZeppelin Defender Emergency Pause Guide
- `skills/security/threat-intelligence` for CTI
