# Fuzz, Property & Invariant Testing Reference

## Definitions

| Type | Scope | Stateful? | When to Use |
|------|-------|-----------|-------------|
| **Fuzz test** | Single function call | No | Stateless property of one function |
| **Invariant test** | Protocol state over time | Yes | System-wide safety properties |
| **Property-based test** | General term for both | Either | Any property-driven testing |

---

## Foundry Fuzz Testing

### Signature & Config

```solidity
function testFuzz_MyProperty(uint256 amount, address user, bytes calldata data) public {
    // fuzzer generates all inputs
}
```

```toml
[fuzz]
runs = 10000
max_test_rejects = 65536
seed = "0xdeadbeef"
dictionary_weight = 40
include_storage = true
include_push_bytes = true
```

| Key | Default | Description |
|-----|---------|-------------|
| `runs` | 256 | Fuzz runs per test |
| `max_test_rejects` | 65536 | Max rejects before fail |
| `seed` | random | Deterministic seed |

### Bounded vs Unbounded

```solidity
// Bounded
function testBounded(uint256 amount) public {
    vm.assume(amount > 1e6 && amount < 1e30);
}

// Unbounded
function testUnbounded(uint256 amount) public {
    if (amount == 0) { vm.expectRevert(); }
    else if (amount > maxLimit) { vm.expectRevert(); }
    else { uint256 r = contract.process(amount); assert(r > 0); }
}
```

### Lending LTV Fuzz Example

```solidity
function testFuzz_LTVNeverExceedsMax(uint256 da, uint256 ba) public {
    vm.assume(da > 0 && da <= 1_000_000e18 && ba > 0 && ba <= da);
    deal(address(asset), alice, da);
    vm.startPrank(alice);
    asset.approve(address(pool), da);
    pool.deposit(da);
    vm.assume(ba <= pool.maxBorrow(alice));
    pool.borrow(ba);
    (uint256 debt, uint256 collat) = pool.getAccountInfo(alice);
    assertLe((debt * 1e18) / collat, pool.MAX_LTV());
    vm.stopPrank();
}
```

---

## Foundry Invariant Testing

### Structure

```solidity
contract LendingInvariantTest is StdInvariant, Test {
    LendingHandler public handler;

    function setUp() public {
        pool = new LendingPool();
        handler = new LendingHandler(pool);
        targetContract(address(handler));
        targetSender(address(0x1));
        targetSender(address(0x2));
    }

    function invariant_totalSupplyMatches() public {
        assertEq(pool.totalSupply(), handler.totalDepositedGhost());
    }

    function invariant_solvent() public {
        assertGe(pool.totalReserves(), pool.totalDebt());
    }
}
```

### Handler Pattern

```solidity
contract LendingHandler is CommonBase, StdCheats, StdUtils {
    LendingPool public pool;
    uint256 public totalDepositedGhost;

    function deposit(uint256 amount) public {
        amount = bound(amount, 1e6, 1_000_000e18);
        deal(address(pool.asset()), address(this), amount);
        asset.approve(address(pool), amount);
        pool.deposit(amount);
        totalDepositedGhost += amount;
    }

    function withdraw(uint256 amount) public {
        amount = bound(amount, 0, pool.balanceOf(address(this)));
        if (amount == 0) return;
        pool.withdraw(amount);
        totalDepositedGhost -= amount;
    }
}
```

### Config & Modes

```toml
[invariant]
runs = 256
depth = 128
fail_on_revert = false
```

**Open mode** (default) — fuzzer calls ANY function. **Closed mode** — restrict:

```solidity
targetSelector(FuzzSelector({
    addr: address(handler),
    selectors: [handler.deposit.selector, handler.withdraw.selector]
}));
```

---

## Echidna

### Property Functions

```solidity
contract TestAMM {
    AMM public amm;
    constructor() {
        amm = new AMM(address(new ERC20("A","A",18)), address(new ERC20("B","B",18)));
        ERC20("A","A",18).mint(address(amm), 1e24);
    }
    function echidna_k_invariant() public view returns (bool) {
        (uint256 r0, uint256 r1) = amm.getReserves();
        return r0 * r1 >= amm.INITIAL_K();
    }
}
```

### Config

```yaml
testLimit: 50000
shrinkLimit: 5000
seqLen: 100
contractAddr: "0x1234"
sender: ["0x1000", "0x2000"]
coverage: true
```

```bash
echidna-test . --contract TestAMM --config echidna.yaml
```

| Option | Default | Description |
|--------|---------|-------------|
| `testLimit` | 50000 | Max transactions |
| `shrinkLimit` | 5000 | Steps to shrink failing sequence |
| `seqLen` | 100 | Max sequence length |

---

## Examples

### ERC-20 Total Supply

```solidity
contract ERC20Invariants is StdInvariant, Test {
    function setUp() public {
        token = new ERC20Permit("T", "TST", 18);
        handler = new ERC20Handler(token);
        targetContract(address(handler));
    }
    function invariant_totalSupply() public {
        assertEq(token.totalSupply(), handler.mintedGhost() - handler.burnedGhost());
    }
}
```

### CDP Solvency + Reentrancy

```solidity
// Ghost variable tracks protocol-level state
contract Handler {
    uint256 public totalCollateralGhost;
    function deposit(uint256 amount) public { totalCollateralGhost += amount; }
}

function invariant_solvency() public {
    (uint256 tc, uint256 td) = handler.totalSystemGhosts();
    if (td == 0) return;
    assertGe((tc * 1e18) / td, cdp.MIN_COLLATERAL_RATIO());
}
```

## Comparison Table

| Feature | Foundry Fuzz | Foundry Invariant | Echidna |
|---------|-------------|-------------------|---------|
| Stateless | ✅ `testX(uint)` | ❌ | ❌ |
| Stateful | ❌ | ✅ `invariant_*` | ✅ `echidna_*()` |
| Handler pattern | ❌ | ✅ `targetContract` | Manual |
| Shrinking | ❌ | ✅ | ✅ |
| Coverage-guided | ❌ | ❌ | ✅ |
| Config | `foundry.toml` | `foundry.toml` | `echidna.yaml` |
| Speed | ⚡ Fast | ⚡ Fast | 🐢 Slower |
