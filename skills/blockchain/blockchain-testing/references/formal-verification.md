# Formal Verification Reference

## Comparison: Certora vs Halmos vs Scribble

| Feature | Certora Prover | Halmos | Scribble |
|---------|---------------|--------|----------|
| **Type** | Formal verification | Symbolic execution | Runtime assertion gen |
| **Language** | CVL (custom) | Solidity + foundry | Solidity annotations |
| **Cost** | Paid (free tier limited) | Free | Free |
| **Setup** | Complex (config, specs) | Minimal (forge plugin) | Minimal (npm) |
| **Proves** | ∀ behaviors, all paths | ∀ paths to given depth | Only tested inputs |
| **Loop handling** | Loop invariants needed | Configurable unrolling | N/A |
| **Multi-contract** | ✅ Full | ✅ | ✅ |

---

## Certora Prover

### CVL Basics

```cvl
rule totalSupplyInvariant() {
    env e;
    uint256 supply = totalSupply(e);
    assert supply >= 0, "Supply negative";
}

invariant totalSupplyMatches()
    totalSupply() == to_uint256(sumOfBalances())
    { preserved with { ... } }
```

### Rules vs Invariants

| Type | Purpose | Syntax |
|------|---------|--------|
| **Rule** | Property under conditions | `rule name(params) { assert ... }` |
| **Invariant** | Always holds | `invariant name() expression` |
| **Parametric** | Checked for every function | `rule name(method f) { ... }` |
| **Filtered** | Specific functions only | `rule name() filtered { f -> ... }` |

### envfree, filter, withEntry

```cvl
rule envfreeExample() envfree { assert totalSupply() >= 0; }
rule onlyTransfer(method f) filtered { f.selector == transfer.selector } { }
invariant positiveSupply() totalSupply() > 0 { preserved with { entry point; } }
```

### Parametric Rule

```cvl
methods { transfer(address,uint256) returns bool; mint(address,uint256); }

rule supplyPreserved(method f) filtered { f.isExternal && !f.isView } {
    uint256 before = totalSupply();
    calldataarg args;
    f(e, args);
    assert before == totalSupply(), "Supply changed";
}
```

### Config & CLI

```json
{
  "files": ["contracts/Token.sol"],
  "spec": "certora/specs/Token.spec",
  "solc": "solc8.24",
  "optimistic_loop": true,
  "loop_iter": "3",
  "rule_sanity": "basic"
}
```

```bash
certoraRun certora/conf/Token.conf \
  --verify Token:certora/specs/Token.spec \
  --cloud --wait_for_results
```

### CVL: ERC-20 Total Supply

```cvl
methods {
    totalSupply() returns uint256 envfree;
    balanceOf(address) returns uint256 envfree;
    transfer(address,uint256) returns bool;
    mint(address,uint256);
    burn(address,uint256);
}

rule transferPreservesSupply(method f) filtered {
    f.selector == transfer.selector
} {
    uint256 before = totalSupply();
    address to; uint256 amount; env e;
    transfer(e, to, amount);
    assert before == totalSupply(), "Transfer changed supply";
}

rule mintIncreasesSupply() {
    address to; uint256 amount; env e;
    uint256 before = totalSupply();
    uint256 balBefore = balanceOf(to);
    mint(e, to, amount);
    assert totalSupply() == before + amount;
    assert balanceOf(to) == balBefore + amount;
}
```

---

## Halmos — Symbolic Test Runner

### Overflow Detection

```solidity
contract OverflowTest {
    function add(uint256 a, uint256 b) public pure returns (uint256) {
        unchecked { return a + b; }
    }
    function safeAdd(uint256 a, uint256 b) public pure returns (uint256) {
        require(b <= type(uint256).max - a, "overflow");
        return a + b;
    }
}

contract HalmosOverflowCheck is Test {
    function check_add_overflow(uint256 a, uint256 b) public {
        vm.assume(a > 0 && b > 0);
        vm.expectRevert("overflow");
        this.safeAdd(a, b);
    }

    function check_never_overflow(uint256 a, uint256 b) public {
        vm.assume(a <= 100_000e18 && b <= 100_000e18);
        vm.assume(b <= type(uint256).max - a);
        assert(safeAdd(a, b) >= a && safeAdd(a, b) >= b);
    }
}
```

### Loop Unrolling

```solidity
// halmos --loop 5
function sum(uint256[] memory arr) public pure returns (uint256) {
    uint256 total = 0;
    for (uint256 i = 0; i < arr.length; i++) total += arr[i];
    return total;
}
```

### CLI

```bash
pip install halmos
halmos --function check_never_overflow
halmos --loop 10 --match-contract LoopTest
halmos --solver-timeout 120000 -vvv
halmos --counterexample
```

### Reentrancy Check

```solidity
function check_reentrancy_guard() public {
    vault.deposit(100 ether);
    vault.withdraw(50 ether);
    assert(address(vault).balance == vault.totalDeposits());
}
```

---

## Scribble — Runtime Annotations

### Annotation Types

| Annotation | Scope | Description |
|------------|-------|-------------|
| `@if_succeeds` | Function | Assertion after successful execution |
| `@if_updated` | Variable | Runs when modified |
| `@invariant` | Contract | Always holds |
| `@behavior` | Group | Groups annotations |

### Access Control Example

```solidity
import "scribble/Scribble.sol";

contract Vault {
    mapping(address => uint256) public balances;
    address public owner;

    constructor() { owner = msg.sender; }

    /// @if_succeeds msg.sender == owner;
    /// @if_succeeds (amount > 0) ==> (balances[to] > old(balances[to]));
    function mint(address to, uint256 amount) public {
        require(msg.sender == owner, "!owner");
        balances[to] += amount;
    }

    /// @if_succeeds balances[from] == old(balances[from]) - amount;
    /// @if_succeeds balances[to] == old(balances[to]) + amount;
    /// @invariant totalMinted >= totalBurned;
    function transfer(address from, address to, uint256 amount) public {
        require(balances[from] >= amount);
        balances[from] -= amount;
        balances[to] += amount;
    }
}
```

### CLI

```bash
scribble --output-dir scribbled/ contracts/Token.sol
scribble --compile contracts/Token.sol
forge test --using scribbled/Token.sol
```

---

## Pre-Audit Checklist

| # | Item | Tool |
|---|------|------|
| 1 | Arithmetic overflow/underflow | Halmos / Scribble |
| 2 | Access control bypass | Certora / Scribble |
| 3 | Reentrancy | Halmos |
| 4 | Total supply invariant | Certora |
| 5 | Solvency (assets ≥ liabilities) | Certora |
| 6 | Share price inflation attack | Halmos |
| 7 | Flash loan / price manipulation | Halmos |
| 8 | Oracle manipulation | Certora + manual |
| 9 | delegatecall storage collisions | Certora |
| 10 | Selfdestruct triggers | Certora |
| 11 | Unbounded loops (gas bomb) | Halmos |
| 12 | Signature replay | Certora |
| 13 | Timelock bypass | Certora |
| 14 | Fee rounding | Halmos / Scribble |
| 15 | Upgradeability collisions | Certora |
