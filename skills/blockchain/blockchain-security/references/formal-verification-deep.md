# Formal Verification for Smart Contracts

## Overview

Formal verification mathematically proves that a smart contract satisfies specified properties for all possible inputs and states. It complements but does not replace manual review and fuzz testing.

| Tool | Technique | Scope | Difficulty |
|------|-----------|-------|------------|
| Certora Prover | Constraint solving + SMT | Contract-level, multi-contract | High |
| Halmos | Symbolic execution (Foundry) | Function-level, Foundry tests | Medium |
| Scribble | Runtime verification | Annotation-based, execution trace | Low |
| Coq / Isabelle | Interactive theorem proving | Protocol-level, computational | Very high |

---

## Certora Prover

### CVL Basics (Certora Verification Language)

#### Rules vs Invariants
```cvl
// INVARIANT: holds at every transaction boundary
invariant totalSupplyConservation()
    totalSupply() == sum(userBalances) + sum(poolBalances);

// RULE: specific property checked at entry/exit of a function
rule mint_only_increases_supply(address user, uint256 amount) {
    uint256 supply_before = totalSupply();
    mint(user, amount);
    uint256 supply_after = totalSupply();
    assert supply_after == supply_before + amount,
        "mint must increase total supply by amount";
}
```

#### require / assert / satisfy
```cvl
rule mint_with_zero_amount() {
    uint256 before = totalSupply();
    mint(user, 0);
    assert totalSupply() == before, "minting 0 should not change supply";
}

// satisfy — existential proof
rule non_owner_can_mint() {
    address nonOwner; require nonOwner != owner();
    satisfy mint(nonOwner, 100); // passes if non-owner can call mint
}

// assert — postcondition
rule borrow_never_exceeds_ltv(address user, uint256 amount) {
    uint256 collateral = getUserCollateral(user);
    borrow(user, amount);
    assert getUserDebt(user) <= collateral * maxLTV / 100;
}
```

#### Parametric Rules
```cvl
rule preservation_of_invariant(method f) {
    uint256 before = totalSupply();
    calldataarg args; f(args);
    assert totalSupply() >= before;
}
```

#### Multi-Contract Rules
```cvl
rule cross_contract_invariant(address attacker, uint256 amount) {
    uint256 total_before = vault.balance() + token.totalSupply();
    calldataarg args; vault.deposit(attacker, amount); vault.withdraw(attacker, amount);
    assert vault.balance() + token.totalSupply() == total_before;
}
```

#### envfree / filter / withEntry
```cvl
// envfree — no blockchain context needed
rule transfer_preserves_supply(address from, address to, uint256 amount) {
    uint256 before = totalSupply();
    transfer(from, to, amount);
    assert totalSupply() == before;
}

// filter — restrict which functions a parametric rule applies to
rule non_admin_functions_cannot_pause(method f) {
    filter { f != pause() && f != setFee(uint256); }
    address nonAdmin; require nonAdmin != owner();
    calldataarg args; f(args);
    assert !paused();
}

// withEntry — call entrypoint before the rule
rule withdraw_respects_user_balance() {
    address user = 0x1234;
    deposit(user, 1000);
    withdraw(user, 1000);
    assert getUserBalance(user) == 0;
}
```

### Practical CVL Examples

```cvl
// Token invariant: total supply conservation
invariant total_supply_conservation()
    totalSupply() == balanceOf(owner()) + balanceOf(treasury()) + lockedInVault();

// Access control: only pauser can pause
rule only_pauser_can_pause() {
    address nonPauser; env e;
    require e.msg.sender == nonPauser && nonPauser != pauser();
    pause@withrevert(e);
    assert lastReverted;
}

// Economic invariant: reserve ratio always above minimum
invariant reserve_ratio_above_min()
    getReserveRatio() >= MIN_RESERVE_RATIO;

rule borrow_cannot_exceed_ltv(address user) {
    uint256 maxBorrow = getUserCollateral(user) * maxLTV / RATE_DENOMINATOR;
    env e;
    borrow@withrevert(e, user, maxBorrow + 1);
    assert lastReverted;
}
```

### Certora Run Configuration
```bash
certoraRun contracts/Vault.sol --verify Vault:vaultRules.spec --solc solc8.20
certoraRun contracts/Vault.sol contracts/Token.sol --verify Vault:vaultRules.spec --verify Token:tokenRules.spec --link Vault:token=Token
```

---

## Halmos — Symbolic Testing for Foundry

### Basic Usage
```solidity
contract TokenProperties is Test {
    Token public token;
    function setUp() public { token = new Token(address(0xdead)); }

    function prove_mint_preserves_invariant(uint256 amount) public {
        vm.assume(amount <= token.maxSupply() - token.totalSupply());
        uint256 before = token.totalSupply();
        token.mint(address(this), amount);
        assertEq(token.totalSupply(), before + amount);
    }
}
```

```bash
halmos --contract TokenProperties --function prove_mint_preserves_invariant
```

### Loop Abstraction
```solidity
function prove_batch_transfer(uint256[] calldata amounts) public {
    vm.assume(amounts.length <= 10);
    uint256 before = token.totalSupply();
    for (uint256 i = 0; i < amounts.length; i++) token.safeTransfer(users[i], amounts[i]);
    assertEq(token.totalSupply(), before);
}
```

### Comparison: Halmos vs Certora
| Aspect | Halmos | Certora |
|--------|--------|---------|
| Language | Solidity (native Foundry) | CVL (custom DSL) |
| Loop handling | Bounded abstraction | Optimistic unfolding |
| Multi-contract | Manual (forge test) | Native `--link` |
| Speed | Fast (local) | Moderate (remote) |
| Learning curve | Low | High |
| Best for | Function-level properties | System-level invariants |

---

## Scribble — Runtime Verification

### Annotations & Examples
```solidity
contract Vault {
    /// @if_succeeds totalSupply() == old(totalSupply()) + msg.value;
    function deposit() external payable {
        balances[msg.sender] += msg.value; totalSupply += msg.value;
    }

    /// @if_succeeds totalSupply() == old(totalSupply()) - amount;
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount);
        balances[msg.sender] -= amount; totalSupply -= amount;
        (bool ok,) = msg.sender.call{value: amount}(""); require(ok);
    }
}
```

| Annotation | When Checked |
|------------|-------------|
| `@if_succeeds` | After successful function call |
| `@if_updated` | When storage variable changes |
| `@invariant` | At every transaction boundary |
| `@reverts` | When function reverts |

### Scribble vs Certora vs Fuzzing
| Approach | Overhead | Guarantee | False Positives | Complexity |
|----------|----------|-----------|-----------------|------------|
| Scribble | Runtime gas | Per-tx execution | No | Low |
| Certora | Off-chain | All paths | Possible | High |
| Foundry fuzz | Off-chain | Sampled paths | No | Medium |

---

## Coq / Isabelle — Protocol-Level Verification

### When to Use
- Cross-chain bridge protocols (IBC verified in Coq)
- Consensus mechanisms (Casper verified in Isabelle)
- L2 state machine correctness
- Economic mechanism design

### Notable Verified Protocols
| Protocol | Tool | What Was Verified |
|----------|------|-------------------|
| Ethereum deposit contract | Isabelle/HOL | No tokens locked forever |
| Cosmos IBC | Coq | No double-spending across chains |
| Tezos Michelson | Coq | Type safety |
| NEAR Rainbow Bridge | SMT (Z3) | Validator set security |

---

## Tool Selection Guide

| Goal | Recommended Tool |
|------|-----------------|
| Function-level properties | Halmos (Foundry-native) |
| Simple invariants | Scribble (low overhead) |
| System/economic invariants | Certora (multi-contract) |
| Protocol-level verification | Coq / Isabelle |

## References
- Certora Prover: `https://docs.certora.com/`
- Halmos: `https://github.com/a16z/halmos`
- Scribble: `https://docs.scribble.codes/`
- `skills/quality/property-based-testing` for fuzz foundations
