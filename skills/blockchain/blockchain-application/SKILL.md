---
name: blockchain-application
description: >
  Use this skill when asked about smart contract development, Solidity, Vyper, Rust smart contracts (Solana, NEAR, Polkadot), Haskell/Plutus (Cardano), Cairo/StarkNet, dApp backend development, Truffle, Hardhat, Foundry, Anchor, and blockchain application patterns. Languages: Solidity, Vyper, Rust, Haskell, Cairo, Move. Covers EVM-based development (Ethereum, Polygon, Arbitrum, Optimism), SVM-based development (Solana), eUTxO-based development (Cardano), StarkNet/STARK-based development (Cairo), smart contract security, gas optimization, upgradeable contracts, and cross-contract communication. Do NOT use for: blockchain core protocol (use blockchain-core), web3 frontend (use blockchain-web3), or testing (use blockchain-testing).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [blockchain, smart-contracts, solidity, vyper, rust, haskell, cairo, move, application, phase-blockchain]
---

# Blockchain Application

## Purpose
Guide smart contract development across all major blockchain platforms. Covers language selection, contract architecture, security patterns, gas optimization, deployment, and cross-contract communication. Platform-agnostic at the protocol layer; chain-specific at the language and VM layer.

## Agent Protocol

### Trigger
"smart contract", "solidity", "vyper", "evm", "rust smart contract", "solana contract", "anchor framework", "cardano", "plutus", "haskell contract", "cairo", "starknet", "sierra", "hardhat", "foundry", "truffle", "dapp backend", "contract deployment", "gas optimization", "contract security", "cross-contract call", "chainlink", "oracle contract", "defi contract", "nft contract", "move language", "sui contract", "aptos contract"

### Input Context
- Target blockchain and VM type (EVM/SVM/eUTxO/StarkNet/MoveVM)
- Contract purpose (token/DeFi/NFT/oracle/governance/bridge)
- Upgradeability requirements (proxy/non-upgradeable/beacon)
- Security requirements (audit level, formal verification need)
- Performance constraints (gas budget, compute units, TPS needs)
- Existing dependencies (OpenZeppelin, Anchor libraries, Plutus contracts)

### Output Artifact
Complete contract architecture specification: platform selection, contract design, implementation approach, testing strategy, deployment plan, security analysis.

### Response Format
1. **Platform selection**: chain type + VM + language + framework + toolchain
2. **Contract architecture**: entry points, storage layout, external dependencies, upgradeability
3. **Implementation**: key functions with gas considerations and security annotations
4. **Testing strategy**: unit, integration, fuzz, invariant, testnet deployment
5. **Deployment**: constructor args, verification, proxy setup, multi-sig ownership
6. **Risk analysis**: known vulnerabilities specific to this platform/pattern

### Completion Criteria
- Contract architecture follows platform best practices (checks-effects-interactions, access control)
- Storage layout compatible with upgradeability pattern (if upgradeable)
- Gas optimization applied: storage reads minimized, calldata over memory where possible
- Security review covers platform-specific attack vectors (reentrancy, oracle manipulation, flash loans)
- Deployment plan includes verification, multi-sig ownership, and monitoring

### Max Response Length
5000 tokens

## Decision Trees

### Platform Selection
```
Smart contract platform:
├── Need EVM compatibility?
│   ├── YES → Solidity or Vyper
│   │   ├── Solidity: EVM chains (Ethereum, Polygon, Arbitrum, Optimism, Base, BSC)
│   │   │   ├── Toolchain: Foundry (default), Hardhat (complex workflows)
│   │   │   └── Libraries: OpenZeppelin, Solady
│   │   └── Vyper: Simple contracts, audit-friendliness prioritized
│   │       └── Toolchain: ape, brownie
│   ├── NO → Evaluate non-EVM chains
│   │   ├── Solana → Rust + Anchor framework
│   │   │   └── Toolchain: Anchor CLI, Solana CLI
│   │   ├── Cardano → Haskell (Plutus) or Aiken
│   │   │   └── Toolchain: Plutus Tx, cardano-cli
│   │   ├── StarkNet → Cairo
│   │   │   └── Toolchain: Scarb, Starkli
│   │   ├── Sui/Aptos → Move
│   │   │   └── Toolchain: sui CLI / aptos CLI
│   │   └── NEAR/Polkadot → Rust (ink!)
│   │       └── Toolchain: cargo-contract
│   └── Cross-chain? → Consider platform-agnostic architecture
│       └── Abstract core logic, deploy adapters per chain
```

### Upgradeability Decision
```
Need upgradeable contract?
├── YES:
│   ├── UUPS → Default for new projects (gas-efficient, clean storage)
│   ├── Transparent → Legacy projects, many upgrade functions
│   └── Beacon → Many child contracts (ERC-1167 clones)
├── NO → Immutable contract
│   └── Better security posture, no upgrade governance overhead
└── Hybrid → Immutable core + upgradeable periphery
```

### Language Selection for EVM
```
EVM language choice:
├── Solidity (default for most projects)
│   ├── Pros: Largest ecosystem, most tutorials, OpenZeppelin libs
│   ├── Cons: More attack surface (implicit behavior, inheritance)
│   └── Best for: Complex protocols, composability-focused
├── Vyper (audit-first projects)
│   ├── Pros: Simpler, fewer foot-guns, explicit behavior
│   ├── Cons: Smaller ecosystem, limited libraries
│   └── Best for: Simple contracts, high-value vaults, DAO treasuries
└── Huff (low-level EVM)
    ├── Pros: Full control over bytecode, optimal gas
    ├── Cons: No safety rails, manual memory management
    └── Best for: Gas-critical operations, precompile-like contracts
```

## Architecture Patterns

### Checks-Effects-Interactions (Mandatory)
```solidity
function withdraw(uint256 amount) external {
    // 1. CHECKS: validate conditions
    require(balanceOf[msg.sender] >= amount, "insufficient balance");

    // 2. EFFECTS: update state first
    balanceOf[msg.sender] -= amount;

    // 3. INTERACTIONS: external calls last
    (bool ok, ) = msg.sender.call{value: amount}("");
    require(ok, "transfer failed");
}
```

### Access Control Patterns
- **Ownable**: Single owner, simplest model
- **Roles (OpenZeppelin AccessControl)**: DEFAULT_ADMIN_ROLE + specific roles (MINTER_ROLE, PAUSER_ROLE)
- **Timelock**: All sensitive operations delayed by 48h-7d
- **Multi-sig**: M-of-N signers for admin operations

### Storage Layout Patterns
```solidity
// Upgrade-safe storage layout
// 1. Always append new variables at the end
// 2. Never reorder or delete existing variables
// 3. Use gap arrays for future storage slots

contract BaseV1 {
    uint256 public value1;
    uint256 public value2;
    uint256[50] private __gap; // Reserved for future upgrades
}

contract BaseV2 is BaseV1 {
    uint256 public value3;    // Appended, safe
    uint256[49] private __gap; // Reduced by 1
}
```

### Solidity Gas Optimization Patterns
```solidity
// BAD: reads storage repeatedly
function sum() external view returns (uint) {
    uint total = 0;
    for (uint i = 0; i < arr.length; i++) {
        total += arr[i]; // SLOAD every iteration
    }
    return total;
}

// GOOD: cache array length and use unchecked
function sum() external view returns (uint) {
    uint len = arr.length;
    uint total = 0;
    for (uint i = 0; i < len; i++) {
        unchecked { total += arr[i]; }
    }
    return total;
}

// Gas optimization techniques:
// 1. Use calldata instead of memory for read-only function params
// 2. Pack structs tightly (uint128 + uint128 saves slot)
// 3. Use custom errors instead of require strings
// 4. Short-circuit: check cheapest conditions first in require
// 5. Use Solady's LibString over OpenZeppelin for simple ops

error InsufficientBalance(uint256 available, uint256 required);

function optimizedTransfer(address to, uint256 amount) external {
    uint256 bal = balanceOf[msg.sender]; // Cache storage
    if (bal < amount) {
        revert InsufficientBalance(bal, amount);
    }
    unchecked {
        balanceOf[msg.sender] = bal - amount; // Safe due to check above
        balanceOf[to] += amount;
    }
}
```

### Factory Pattern (Minimal Proxy)
```solidity
// EIP-1167: Deploy minimal proxies (costs ~200 gas vs 500K for full contract)
contract Factory {
    event CloneDeployed(address indexed clone, address indexed creator);

    function createClone(address implementation) external returns (address clone) {
        // ERC-1167 bytecode: 3D602D8060... (20 bytes implementation address embedded)
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(ptr, 0x14), shl(0x60, implementation))
            mstore(add(ptr, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            clone := create(0, ptr, 0x37)
        }
        require(clone != address(0), "CLONE_FAILED");
        emit CloneDeployed(clone, msg.sender);
    }
}
```

## Cross-Contract Communication

### EVM Call Patterns
```
EVM:
├── Direct call: Interface(target).function(args) — simple, synchronous
├── Delegatecall: Proxy pattern, upgradeable storage
├── Staticcall: Read-only external call (EIP-214)
└── Low-level: address.call{value, gas}(data) — for arbitrary calls

Solana:
├── CPI (Cross-Program Invocation): invoke() or invoke_signed()
└── PDA signing: Programs sign for PDAs via invoke_signed()

Cardano:
├── Script-to-script: Redeemer-based validation
└── One-shot contracts: eUTxO model, no persistent state

Move (Sui/Aptos):
├── Module imports: direct function calls within VM
└── Object transfers: sui::transfer for object ownership
```

### Cross-Contract Error Handling
```solidity
// Solidity: handle external call failures
function safeBatchTransfer(address[] calldata targets, bytes[] calldata data)
    external returns (bool[] memory successes)
{
    successes = new bool[](targets.length);
    for (uint i = 0; i < targets.length; i++) {
        (successes[i], ) = targets[i].call{gas: 10000}(data[i]);
        // Don't revert on individual failure
    }
}
```

## Platform-Specific Patterns

### EVM (Solidity)
- Storage: 32-byte slot-based, SSTORE costs 20K (cold) / 2.9K (warm)
- Events: emit for off-chain indexing, topics up to 4 (3 indexed + 1 non-indexed)
- ABI encoding: abi.encode (padded) vs abi.encodePacked (tight)
- Precompiles: ecrecover (0x01), SHA-256 (0x02), RIPEMD-160 (0x03), identity (0x04), modexp (0x05), BN254 (0x06, 0x07, 0x08), BLS12-381 (0x0a-0x0d)
- CREATE2: deterministic address deployment (same address across chains)

### Solana (Rust + Anchor)
```rust
#[derive(Accounts)]
pub struct CreateUser<'info> {
    #[account(init, payer = user, space = 8 + User::INIT_SPACE)]
    pub user_account: Account<'info, User>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct User {
    pub name: String,
    pub age: u8,
}
```

### Cardano (Plutus)
- eUTxO model: no global state, contracts are validators
- Datum: on-chain data locked at script address
- Redeemer: spending condition
- Script context: entire transaction context available to validator
- Plutus Tx: compile Haskell to Plutus Core (UPLC)
- Aiken: Rust-like language for Cardano (simpler than Haskell)

### StarkNet (Cairo)
- Storage: contract-level storage variables, accessed via read()/write()
- UDC (Universal Deployer Contract): standardized contract deployment
- L1<>L2 messaging: send_message_to_l1, consume_message_from_l1
- Sierra: intermediate representation between Cairo and CASM
- Contract class: immutable code, deployed as instances

### Move (Sui/Aptos)
- Resource-oriented: assets are resources, cannot be copied or dropped
- Object-centric (Sui): objects, not accounts, are the unit of storage
- Global storage (Aptos): Move modules manage access to globally stored resources
- Abilities: copy, drop, store, key — define what operations are allowed on a type
- Move Prover: formal verification for Move contracts

## Security Patterns

### Common Vulnerability Mitigations
| Vulnerability | Mitigation |
|---|---|
| Reentrancy | Checks-effects-interactions, ReentrancyGuard |
| Flash loan manipulation | TWAP pricing, min/max output constraints |
| Oracle manipulation | Redundant oracles, stale price checks, circuit breakers |
| Frontrunning | Commit-reveal, submarine sends, FCFS ordering |
| Signature replay | Include chain ID, contract address, nonce in EIP-712 |
| Access control | Timelock + multi-sig, not single admin key |
| Integer overflow | Solidity 0.8+ built-in checks, SafeMath for older |
| Uninitialized proxy | Constructor + disableInitializers() |
| Storage collision | EIP-1967 structured storage, no gap variables |
| ERC-4626 inflation | Virtual shares + assets on first deposit |

## Production Considerations

### Deployment Checklist
- [ ] Constructor args verified and tested
- [ ] Proxy admin transferred to multi-sig (not deployer EOA)
- [ ] Implementation contract initialized and disabled
- [ ] Contract verified on block explorer
- [ ] Ownership transferred to timelock + governance
- [ ] Emergency pause mechanism tested
- [ ] Rate limits configured for high-value functions
- [ ] Monitoring alerts set up for suspicious activity

### Multi-Chain Deployment
- Deterministic addresses via CREATE2 (same address on all EVM chains)
- Proxy admin same address on all chains via CREATE2
- Deployment scripts idempotent (check if already deployed)
- Cross-chain governance for upgrade coordination
- L1 as source of truth, L2 as execution layer

### Gas Budget Guidelines (EVM)
- Simple transfer: 21,000 gas
- ERC-20 transfer: ~50,000 gas
- ERC-721 mint: ~100,000 gas
- Uniswap swap: ~150,000 gas
- Complex AMM operation: ~300,000 gas
- L1 block gas limit: 30M (Ethereum)
- L2 block gas limit: 30M-1B (depends on L2)

## Rules
1. Use Solidity for EVM chains (Ethereum, Polygon, Arbitrum, Optimism, Base, BSC)
2. Use Rust for Solana (Anchor framework as default), NEAR, and Polkadot ink!
3. Use Haskell/Plutus for Cardano smart contracts
4. Always follow checks-effects-interactions pattern regardless of language
5. Use Foundry (forge) for Solidity development and testing as default toolchain
6. Include gas optimization in every code review — storage is expensive, calldata is cheaper
7. Never hardcode sensitive parameters — use constructor args, setters with timelock
8. Default to UUPS for upgradeable contracts over transparent proxy
9. Use OpenZeppelin audited libraries over custom implementations
10. Always use explicit visibility (public, external, internal, private)
11. Avoid tx.origin for authentication — use msg.sender
12. Validate all external inputs with require or custom errors
13. Emit events for all state-changing operations
14. Test on testnet with real conditions before mainnet
15. Transfer ownership to multi-sig or timelock, not EOA
16. Use calldata over memory for read-only function parameters
17. Pack storage variables tightly (uint128 + uint128, address + uint64)
18. Prefer ERC-1167 minimal proxies for cheap contract cloning
19. Use CREATE2 for deterministic addresses across chains
20. Always include reentrancy guards on cross-chain message handlers

## References
  - references/blockchain-application-advanced.md — Blockchain Application Advanced Topics
  - references/blockchain-application-fundamentals.md — Blockchain Application Fundamentals
  - references/cairo-language.md — Cairo Language (StarkNet)
  - references/contract-security.md — Smart Contract Security
  - references/haskell-plutus.md — Haskell & Plutus (Cardano)
  - references/move-language.md — Move Language (Sui & Aptos)
  - references/rust-smart-contracts.md — Rust Smart Contracts
  - references/smart-contract-patterns.md — Smart Contract Design Patterns
  - references/solidity-evm.md — Solidity & EVM Deep Dive
  - references/vyper-language.md — Vyper Language
  - references/cross-chain-deployment.md — Cross-Chain Deployment Strategy
  - references/gas-optimization-patterns.md — Gas Optimization Techniques

## Implementation Examples

### Solidity — Gas-Optimized ERC-20
```solidity
contract OptimizedToken {
    uint256 public totalSupply;
    string public name;
    string public symbol;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol) {
        name = _name; symbol = _symbol;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    event Transfer(address indexed from, address indexed to, uint256 amount);
}
```

### Solana Anchor Program
```rust
use anchor_lang::prelude::*;
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod counter {
    use super::*;
    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        ctx.accounts.counter.count += 1;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut, seeds = [b"counter", authority.key().as_ref()], bump)]
    pub counter: Account<'info, CounterState>,
    pub authority: Signer<'info>,
}

#[account]
pub struct CounterState { pub count: u64, pub authority: Pubkey }
```

## Phase
blockchain → blockchain-application

## Handoff
blockchain-application → blockchain-testing (for test strategy implementation)
blockchain-application → blockchain-security (for pre-audit review)
