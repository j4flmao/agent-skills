---
name: blockchain-testing
description: >
  Use this skill when asked about testing smart contracts, Foundry tests, Hardhat tests, fuzz testing, invariant testing, property-based testing, formal verification, audit preparation, integration testing for dApps, and blockchain testing patterns. Covers Foundry cheatcodes, Echidna fuzzing, Certora verification, Hardhat network forking, mainnet simulation, gas benchmarking, and security audit workflows. Do NOT use for: general web3 frontend testing (use blockchain-web3), smart contract development (use blockchain-application), or core protocol testing (use blockchain-core).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [blockchain, testing, security, audit, phase-blockchain]
---

# blockchain-testing

## Trigger
"smart contract test", "foundry test", "forge test", "hardhat test", "truffle test", "fuzz testing", "invariant testing", "property-based testing", "echidna", "certora", "formal verification", "audit preparation", "blockchain testing", "web3 testing", "dapp testing", "contract audit", "gas benchmark", "mainnet fork test", "integration test blockchain", "e2e blockchain test"

## Rules
1. Use Foundry (forge) as the default Solidity testing framework — it is the fastest and most ergonomic
2. Always write fuzz tests for functions with numeric inputs — edge cases are where bugs live. Use Foundry fuzz + Echidna for comprehensive coverage.
3. Write invariant tests for protocol-level properties (total supply, solvency, access control)
4. Test against a mainnet fork to validate real-world interactions with existing protocols
5. Use Echidna or Foundry invariant tester for property-based testing
6. Include gas benchmarks (forge snapshot) in CI to track gas cost regressions
7. Simulate various network conditions: reorgs, failed transactions, out-of-gas scenarios
8. Before audit: full fuzz coverage, invariant tests, slither analysis, manual review checklist

## Response Format
1. **Test strategy**: unit vs integration vs fuzz vs invariant vs formal
2. **Framework setup**: Foundry/Hardhat configuration, fork URLs, test accounts
3. **Unit tests**: function-by-function coverage with boundary conditions
4. **Fuzz tests**: input ranges, invariant properties, assertion types
5. **Integration tests**: mainnet fork, multi-contract flows, protocol composition
6. **Gas & performance**: benchmark snapshot, optimization targets
7. **Security audit**: tooling (Slither, Mythril, Halmos), manual review checklist

## Phase
blockchain → blockchain-testing
