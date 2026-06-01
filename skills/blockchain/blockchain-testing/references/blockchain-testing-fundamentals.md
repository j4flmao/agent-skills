# Blockchain Testing Fundamentals

## Testing Pyramid for Smart Contracts

### Unit Tests
Test individual functions in isolation. Cover: happy path (expected inputs), edge cases (boundary values), revert conditions (expected failures). Use Foundry's cheatcodes (vm.prank, vm.expectRevert) for state manipulation. Target: every function has at least one test for each outcome.

### Integration Tests
Test multi-contract interactions. Cover: cross-contract calls, protocol compositions, token interactions. Use mainnet forking to test against real protocol state. Mock external dependencies when fork isn't available.

### Fuzz Tests
Generated random inputs test edge cases humans miss. Stateless fuzz: random parameters per call. Stateful fuzz: random sequence of operations. Uses Foundry built-in fuzzer or Echidna for complex stateful tests.

### Invariant Tests
Properties that must always hold: total supply = sum of balances, solvency (assets >= liabilities), access control (only admin can pause). Invariant tests run random sequences of operations and verify invariants after each sequence.

## Foundry Basics

### Test Structure
```solidity
contract MyTest is Test {
    MyContract public contract;
    
    function setUp() public {
        contract = new MyContract();
    }
    
    function testFunctionName_Scenario() public {
        vm.prank(alice);
        // test logic
        assertEq(result, expected);
    }
}
```

### Common Cheatcodes
| Cheatcode | Purpose |
|---|---|
| vm.prank(address) | Set msg.sender for next call |
| vm.startPrank(address) | Set msg.sender for all subsequent calls |
| vm.deal(address, amount) | Set ETH balance |
| vm.store(address, slot, value) | Write to arbitrary storage slot |
| vm.roll(blockNumber) | Set block number |
| vm.warp(timestamp) | Set block timestamp |
| vm.expectRevert(bytes) | Expect next call to revert |

## Testing Workflow

### Pre-Commit
Run forge test locally. Check gas snapshot diff. Run Slither for static analysis. Review test coverage (forge coverage).

### CI Pipeline
Every push: lint → unit tests → fuzz tests (1000 runs) → gas snapshot → coverage report. Every PR: same + integration tests with mainnet fork.

### Pre-Audit Checklist
- [ ] Full fuzz coverage on all numeric parameters
- [ ] Invariant tests for all protocol-level properties
- [ ] Mainnet fork tests for all external interactions
- [ ] Slither analysis (zero high-severity findings)
- [ ] Gas snapshot (reviewed for anomalies)
- [ ] Manual review (line-by-line by at least one other person)
