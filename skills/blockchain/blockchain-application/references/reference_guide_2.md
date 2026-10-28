# Solidity Gas Optimization

Gas cost shapes contract design on EVM chains. This reference lists the optimizations that matter, the costs behind them, and the ones that trade safety or readability for negligible savings. Always measure with `forge test --gas-report` / `forge snapshot --diff`.

## Where Gas Goes

| Operation | Approximate cost (post-Berlin/London) |
|-----------|---------------------------------------|
| `SSTORE` zero -> non-zero | 20,000 (+2,100 if cold) |
| `SSTORE` non-zero -> non-zero | 2,900 (+2,100 if cold) |
| `SSTORE` non-zero -> zero | refund, capped at 1/5 of tx gas (EIP-3529) |
| `SLOAD` cold / warm | 2,100 / 100 |
| Cold account access (`BALANCE`, `EXTCODESIZE`, `CALL`) | 2,600 |
| Calldata byte zero / non-zero | 4 / 16 |
| `LOG` base + per topic + per byte | 375 + 375 + 8 |
| `TSTORE` / `TLOAD` (EIP-1153, Cancun) | 100 / 100 |

Storage dominates. Most optimizations reduce the number of storage slots touched.

## Storage Packing

```solidity
// 3 slots
struct PositionBad {
    uint256 amount;
    address owner;     // 20 bytes
    uint256 openedAt;
}

// 2 slots: owner (20) + openedAt (8) + flags (1) share one slot
struct Position {
    uint256 amount;
    address owner;
    uint64 openedAt;
    bool active;
}
```

Pack fields that are read/written together. Packing fields that are updated separately can cost more because each write reads-modifies the shared slot.

## Cache Storage Reads

```solidity
// Reads totalSupply from storage each iteration
for (uint256 i; i < holders.length; ++i) { ... }

// Cache length and repeated storage values in memory/stack
uint256 len = holders.length;
uint256 supply = totalSupply;
for (uint256 i; i < len; ++i) { ... }
```

## immutable and constant

```solidity
uint256 public constant FEE_BPS = 30;          // inlined at compile time
address public immutable asset;                // stored in bytecode, set in constructor
```

Both avoid `SLOAD`. Use them for anything fixed at deployment.

## Calldata over Memory for External Inputs

```solidity
function batchTransfer(address[] calldata to, uint256[] calldata amounts) external { ... }
```

`calldata` avoids copying arrays into memory.

## Custom Errors

```solidity
error InsufficientBalance(uint256 available, uint256 required);

if (bal < amount) revert InsufficientBalance(bal, amount);
```

Cheaper to deploy and revert than `require(cond, "long string")`. Since Solidity 0.8.26, `require(cond, CustomError())` is also supported (via-IR first, legacy pipeline in 0.8.27).

## unchecked Arithmetic

```solidity
for (uint256 i; i < len; ) {
    // body
    unchecked { ++i; }   // i < len guarantees no overflow
}
```

Since 0.8.22 the compiler automatically omits overflow checks for simple `for` loop increments of this form, so manual `unchecked` in loop headers is often unnecessary. Only use `unchecked` where overflow is mathematically impossible; document why.

## Events Instead of Storage for History

If data is only needed off-chain (history, analytics), emit an event rather than storing an array. Indexers reconstruct it.

## Mappings vs Arrays

- Mapping lookups are O(1); iterating arrays on-chain is unbounded gas and a DoS risk.
- Avoid on-chain loops over user-growable arrays; use pull patterns or pagination.

## Transient Storage (Cancun)

```solidity
// tstore/tload in inline assembly since 0.8.24; `transient` state variables (value types) since 0.8.28
bool transient locked;

modifier nonReentrant() {
    require(!locked, "reentrant");
    locked = true;
    _;
    locked = false;
}
```

OpenZeppelin 5.1+ ships `ReentrancyGuardTransient`. Transient storage is cleared at the end of the transaction, not the call; only use it where the target chain supports Cancun opcodes.

## Short-Circuit and Ordering

Put cheap checks (calldata comparisons) before expensive ones (external calls, storage reads) in conditions and modifiers.

## Minimal Proxies for Repeated Deployments

Deploying many identical contracts: use EIP-1167 clones (`Clones.clone`) which deploy ~45 bytes of bytecode delegating to one implementation. See blockchain-patterns factory reference.

## Compiler Settings

| Setting | Effect |
|---------|--------|
| `optimizer_runs` low (e.g. 200) | Smaller deploy cost, slightly costlier calls |
| `optimizer_runs` high (e.g. 10,000+) | Cheaper calls for frequently used contracts |
| `via_ir = true` | Better optimization in many cases, slower compiles, fixes "stack too deep" |

## Optimizations Not Worth It

| Trick | Why to skip |
|-------|-------------|
| Inline assembly for simple math | Bypasses safety checks; small savings; audit cost |
| `!= 0` vs `> 0` micro-swaps | Negligible with current optimizer |
| Removing access control or input checks | Security risk |
| Single-letter names | No effect on gas |

## Measuring

```bash
forge test --gas-report
forge snapshot              # writes .gas-snapshot
forge snapshot --diff       # compare to committed snapshot
```

Commit `.gas-snapshot` and fail CI on unexpected regressions with `forge snapshot --check`.

## Checklist

- [ ] Struct fields packed by access pattern
- [ ] Repeated storage reads cached
- [ ] `immutable`/`constant` for deploy-time values
- [ ] Custom errors instead of revert strings
- [ ] No unbounded loops over storage arrays
- [ ] `unchecked` only with a written invariant
- [ ] Gas snapshot tracked in CI
