---
name: blockchain-testing
description: >
  Use this skill when asked about testing smart contracts, Foundry tests, Hardhat tests, fuzz testing, invariant testing, property-based testing, formal verification, audit preparation, integration testing for dApps, and blockchain testing patterns. Covers Foundry cheatcodes, Echidna fuzzing, Certora verification, Hardhat network forking, mainnet simulation, gas benchmarking, and security audit workflows. Do NOT use for: general web3 frontend testing (use blockchain-web3), smart contract development (use blockchain-application), or core protocol testing (use blockchain-core).
version: "1.1.0"
author: "j4flmao"
license: "MIT"
tags: [blockchain, testing, security, audit, phase-blockchain]
---

# Blockchain Testing

## Purpose
Guide blockchain smart contract testing covering the full testing pyramid: unit tests, integration tests, fuzz tests, invariant tests, formal verification, and audit preparation. Ensures contract correctness before deployment.

## Agent Protocol

### Trigger
"smart contract test", "foundry test", "forge test", "hardhat test", "truffle test", "fuzz testing", "invariant testing", "property-based testing", "echidna", "certora", "formal verification", "audit preparation", "blockchain testing", "web3 testing", "dapp testing", "contract audit", "gas benchmark", "mainnet fork test", "integration test blockchain", "e2e blockchain test", "foundry cheatcode", "forge snapshot"

### Input Context
- Smart contracts to test (with source files)
- Framework preference (Foundry/Hardhat/Truffle)
- Testing phase (unit/fuzz/invariant/formal/audit)
- Existing test suite and coverage
- Target chains (EVM/Solana/Cosmos)
- Security requirements (audit timeline, TVL at risk)

### Output Artifact
Testing strategy specification: framework setup, test organization, fuzz/invariant properties, gas benchmarking, and audit preparation checklist.

### Response Format
1. **Test strategy**: unit vs integration vs fuzz vs invariant vs formal (testing pyramid)
2. **Framework setup**: Foundry/Hardhat configuration, fork URLs, test accounts
3. **Unit tests**: function-by-function coverage with boundary conditions
4. **Fuzz tests**: input ranges, invariant properties, assertion types
5. **Integration tests**: mainnet fork, multi-contract flows, protocol composition
6. **Gas & performance**: benchmark snapshot, optimization targets
7. **Security audit**: tooling (Slither, Mythril, Halmos), manual review checklist

### Completion Criteria
- Unit tests cover all functions with boundary values and error cases
- Fuzz tests defined for all numeric inputs with reasonable ranges
- Invariant tests capture protocol-level properties (solvency, access control, correctness)
- Integration tests validate against mainnet fork with real protocol interactions
- Gas benchmarks established and tracked in CI
- Audit prep checklist completed (static analysis, fuzz, invariant, manual review)

### Max Response Length
4000 tokens

## Decision Trees

### Testing Framework Selection
```
Blockchain platform:
├── EVM (Ethereum, Polygon, Arbitrum, etc.)
│   ├── Solidity → Foundry (default — fastest, most ergonomic)
│   │   ├── forge test: unit + integration + fuzz
│   │   ├── forge coverage: line/branch coverage
│   │   ├── forge snapshot: gas benchmarking
│   │   └── Foundry fuzz: built-in parameterized + stateful fuzzing
│   ├── JavaScript/TypeScript → Hardhat
│   │   ├── Hardhat network: mainnet forking, mining control
│   │   ├── Hardhat chai matchers: ethers-native assertions
│   │   └── Hardhat console.log: debug in Solidity
│   └── Legacy → Truffle (not recommended)
├── Solana → Anchor test framework
│   ├── TypeScript SDK for integration tests
│   ├── Local validator (solana-test-validator)
│   └── Mainnet fork via bankrun
├── Cosmos → Cosmos SDK test suite
│   ├── Go unit tests for modules
│   ├── Integration tests with simapp
│   └── E2E with test network
└── Cairo → StarkNet Foundry / Protostar
```

### Test Type Selection
```
What to test:
├── Individual function correctness?
│   ├── Unit test: specific input → expected output
│   ├── Boundary test: edge cases (0, max, negative, empty)
│   └── Revert test: expected failure conditions
├── Parameter-based correctness?
│   ├── Fuzz test: random inputs for numeric parameters
│   ├── Stateless fuzz: each call independent (forge fuzz)
│   └── Stateful fuzz: sequence of calls with state (foundry invariant, echidna)
├── Protocol-level properties?
│   ├── Invariant test: properties that must always hold
│   └── Examples: totalSupply = sum of balances, solvency, access control
├── Real-world interaction?
│   ├── Mainnet fork test: interact with deployed protocols
│   ├── Integration test: multi-contract flows
│   └── E2E test: complete user journey
└── Security?
    ├── Static analysis (Slither, Aderyn)
    ├── Symbolic execution (Mythril, Halmos)
    ├── Formal verification (Certora CVL)
    └── Manual review (line-by-line)
```

## Foundry Testing Patterns

### Basic Unit Test
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Token.sol";

contract TokenTest is Test {
    Token public token;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        token = new Token("Test", "TST", 18);
        token.mint(alice, 1000 ether);
    }

    function testTransfer() public {
        vm.prank(alice);
        token.transfer(bob, 100 ether);

        assertEq(token.balanceOf(alice), 900 ether);
        assertEq(token.balanceOf(bob), 100 ether);
    }

    function testTransferInsufficientBalance() public {
        vm.prank(bob);
        vm.expectRevert();
        token.transfer(alice, 1 ether);
    }
}
```

### Fuzz Test
```solidity
contract FuzzTest is Test {
    Token public token;

    function setUp() public {
        token = new Token("Test", "TST", 18);
    }

    // Stateless fuzz: random inputs, single call
    function testFuzzTransfer(uint256 amount) public {
        address alice = makeAddr("alice");
        token.mint(alice, type(uint96).max); // bound to reasonable max
        vm.assume(amount > 0);
        vm.assume(amount <= token.balanceOf(alice));

        vm.prank(alice);
        token.transfer(makeAddr("bob"), amount);
    }

    // Handler-based stateful fuzz
    function testStatefulTransfer(StatefulHandler handler) public {
        // handler runs random sequences of operations
        // invariant checked after each sequence
    }
}
```

### Invariant Test
```solidity
// Invariant: totalSupply always equals sum of all balances
contract TokenInvariants is Test {
    Token public token;
    TokenHandler public handler;

    function setUp() public {
        token = new Token("Test", "TST", 18);
        handler = new TokenHandler(token);
        targetContract(address(handler));
    }

    function invariant_totalSupply_equals_sum_of_balances() public {
        uint256 totalSupply = token.totalSupply();
        uint256 sumBalances = handler.sumAllBalances();
        assertEq(totalSupply, sumBalances);
    }

    function invariant_no_zero_address_balance() public {
        assertEq(token.balanceOf(address(0)), 0);
    }
}
```

### Mainnet Fork Test
```solidity
contract ForkTest is Test {
    using stdStorage for StdStorage;

    IUniswapV2Router router;
    IERC20 token;

    function setUp() public {
        // Fork mainnet at specific block
        vm.createSelectFork(vm.envString("MAINNET_RPC_URL"), 18000000);

        router = IUniswapV2Router(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        token = IERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48); // USDC

        // Deal tokens to test account
        deal(address(token), address(this), 100_000e6);
    }

    function testSwapOnMainnet() public {
        token.approve(address(router), 1000e6);

        address[] memory path = new address[](2);
        path[0] = address(token);
        path[1] = router.WETH();

        uint256[] memory amounts = router.swapExactTokensForETH(
            1000e6, 0, path, address(this), block.timestamp
        );

        assertGt(amounts[1], 0); // Got some ETH
    }
}
```

## Gas Benchmarking

```solidity
// forge snapshot — captures gas costs in .gas-snapshot
// forge diff-check — compares against previous snapshot
// forge snapshot --diff — shows gas cost changes

contract GasBenchmark is Test {
    using stdStorage for StdStorage;

    Token public token;

    function setUp() public {
        token = new Token("Test", "TST", 18);
    }

    function testGasTransfer() public {
        vm.prank(makeAddr("alice"));
        token.transfer(makeAddr("bob"), 100 ether);
        // forge snapshot captures this call's gas
    }
}
```

## Security Audit Testing Flow

```
Phase 1: Static Analysis
├── slither src/ — detect vulnerabilities
├── aderyn src/ — Solidity spec violations
└── semgrep — custom rule patterns

Phase 2: Fuzz Testing
├── Foundry fuzz — parameterized fuzzing (10K+ runs)
├── Echidna — property-based fuzzing (stateful)
└── Medusa — parallel fuzzing (multi-core)

Phase 3: Formal Verification
├── Certora CVL — key invariants (solvency, access)
├── Halmos — symbolic testing for complex assertions
└── Scribble — annotation-based formal specs

Phase 4: Integration
├── Mainnet fork test — real protocol interactions
├── Slither upgrade check — UUPS upgrade safety
└── Gas snapshot — cost regression check
```

## Rules
1. Use Foundry (forge) as default Solidity testing framework — fastest and most ergonomic
2. Always write fuzz tests for functions with numeric inputs — edge cases are where bugs live
3. Write invariant tests for protocol-level properties (total supply, solvency, access control)
4. Test against a mainnet fork to validate real-world interactions with existing protocols
5. Use Echidna or Foundry invariant tester for property-based testing
6. Include gas benchmarks (forge snapshot) in CI to track gas cost regressions
7. Simulate various network conditions: reorgs, failed txns, out-of-gas scenarios
8. Before audit: full fuzz coverage, invariant tests, slither analysis, manual review checklist
9. Coverage is a guide, not a target — 100% coverage doesn't mean 100% correctness
10. Always test on a testnet deployment before mainnet

## References
  - references/audit-preparation-checklist.md — Audit Preparation Checklist
  - references/blockchain-testing-advanced.md — Blockchain Testing Advanced Topics
  - references/blockchain-testing-fundamentals.md — Blockchain Testing Fundamentals
  - references/chaos-testing.md — Chaos Testing Reference
  - references/differential-fuzz-regression.md — Differential Fuzz & Regression
  - references/formal-verification.md — Formal Verification Reference
  - references/foundry-testing.md — Foundry Testing Reference
  - references/fuzz-property-testing.md — Fuzz, Property & Invariant Testing Reference
  - references/hardhat-testing.md — Hardhat Testing Reference
  - references/integration-e2e.md — Integration & E2E Testing Reference
  - references/forge-cheatcodes.md — Foundry Cheatcode Reference
  - references/test-strategy-templates.md — Test Strategy Templates

## Phase
blockchain → blockchain-testing
