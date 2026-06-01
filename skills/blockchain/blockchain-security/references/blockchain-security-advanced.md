# Blockchain Security Advanced Topics

## Economic Security Analysis

### Game Theory in DeFi
Protocols must be incentive-compatible: all participants acting rationally in their self-interest should produce the desired protocol behavior. Analyze: what happens if a rational actor can extract more value by attacking than by participating honestly?

### Liquidation Crisis Scenarios
In a market crash, liquidations cascade: price drops → positions liquidated → assets sold → further price drops. Design liquidation mechanisms to: gradual liquidation (Morpho), auction (MakerDAO), circuit breakers (Aave).

### Oracle Manipulation Economics
Cost to manipulate oracle = cost to move price * number of blocks to maintain. TWAP increases multi-block cost. A minimum of 30-minute TWAP window makes manipulation cost-prohibitive for most attacks.

## Formal Verification in Production

### Certora CVL Workflow
1. Identify critical invariants: solvency, access control, correctness of math
2. Write CVL rules: `rule solvency() { ... }`
3. Run Certora Prover (cloud or local)
4. Analyze counterexamples (found violations)
5. Fix contracts and re-verify

### Invariant Examples
```cvl
// Total supply always equals sum of all balances
rule total_supply_invariant() {
    uint256 total = totalSupply();
    // Certora's sum over all addresses
    assert total == sum_balance(), "totalSupply != sum of balances";
}

// Only admin can pause
rule only_admin_can_pause() {
    require(!isPaused());
    address caller = currentContract; // the caller
    pause@withcall(caller)();
    assert isPaused() => caller == admin(), "non-admin paused";
}
```

## Incident Response Playbook

### Phase 1: Detection (First 5 Minutes)
- Pause/freeze contracts via guardian multi-sig
- Assess scope: which assets, contracts, and chains affected
- Engage security team and auditors
- Prepare communication template

### Phase 2: Containment (First Hour)
- If bridge: pause bridge contracts, stop relayer
- If lending: disable borrowing, set LTV to 0
- If AMM: disable swaps, allow only LP withdrawals
- Notify affected protocols and users

### Phase 3: Recovery (Days to Weeks)
- Root cause analysis with security team
- Fix implementation (new contract version if needed)
- Coordinate with exchanges, bridges, custody providers
- Fork coordination if protocol-level change needed
- Compensation plan for affected users

### Phase 4: Post-Mortem (Weeks After)
- Public post-mortem with: timeline, root cause, fix, lessons
- Implement security improvements: addition of monitoring, circuit breakers
- Update threat model with new attack vectors
- Conduct retraining for development team
