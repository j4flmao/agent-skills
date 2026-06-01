# Blockchain Testing Advanced Topics

## Stateful Fuzzing with Echidna

### Echidna Setup
Echidna tests Solidity contracts with property-based fuzzing. Define functions that check invariant properties. Echidna generates random transaction sequences to break invariants.

```solidity
contract TestToken is Token {
    address[] public users;
    mapping(address => uint256) public userBalances;

    // Echidna invariant: totalSupply == sum of user balances
    function echidna_total_supply_invariant() public view returns (bool) {
        uint256 sum = 0;
        for (uint i = 0; i < users.length; i++) {
            sum += balanceOf(users[i]);
        }
        return totalSupply() == sum;
    }
}
```

### Foundry Invariant Testing
```solidity
contract TokenInvariants is StdInvariant {
    Token public token;
    TokenHandler public handler;

    function setUp() public {
        token = new Token();
        handler = new TokenHandler(token);
        targetContract(address(handler));
    }

    function invariant_totalSupply_sum_of_balances() public {
        uint256 sum = handler.computeTotalBalance();
        assertEq(token.totalSupply(), sum);
    }
}
```

## Formal Verification with Certora

### CVL (Certora Verification Language)
```cvl
methods {
    balanceOf(address) returns uint256;
    totalSupply() returns uint256;
}

rule totalSupplyInvariant() {
    uint256 supply = totalSupply();
    uint256 sum = 0;
    // Certora's parametric sum over all addresses
    address user;
    assert supply == sumBalance(user), 
        "totalSupply != sum of balances";
}
```

### Halmos Symbolic Testing
Halmos performs symbolic execution on Solidity functions. Explores all paths for given symbolic inputs. Useful for proving correctness of complex math or edge case behavior.

## Differential Fuzzing

Compare multiple implementations of the same logic to find discrepancies. Use: reference implementation (Python/JS), audited libraries (OpenZeppelin, Solady), alternative implementations. Report mismatch as potential bug in either implementation.

## Gas Optimization Testing

### Forge Snapshot
- Run `forge snapshot` to capture gas costs
- Commit `.gas-snapshot` to track changes
- `forge snapshot --diff` to compare with previous snapshot
- Alert on gas increases > 5% per function

### Gas Benchmarking Patterns
```solidity
contract GasBench is Test {
    function testGasTransfer() public {
        vm.prank(alice);
        token.transfer(bob, 100e18);
        // forge snapshot captures gas of this call
    }
}
```
