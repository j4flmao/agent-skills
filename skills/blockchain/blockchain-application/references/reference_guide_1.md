# Foundry Workflow: forge, cast, anvil, chisel

Foundry is the Rust-based Solidity toolchain used by most new EVM projects. This reference covers project setup, configuration, and the day-to-day commands for building, testing, deploying and inspecting contracts. Fuzz/invariant testing depth is in `reference_guide_7.md`; deployment scripts in `reference_guide_3.md`.

## Install and Initialize

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup                       # install/update forge, cast, anvil, chisel
forge init my-protocol
cd my-protocol
forge install OpenZeppelin/openzeppelin-contracts
```

Layout:

```
src/          contracts
test/         *.t.sol tests
script/       *.s.sol deployment scripts
lib/          dependencies (git submodules or soldeer)
foundry.toml
```

Dependencies can also be managed with `forge soldeer install` (Soldeer registry) instead of git submodules.

## foundry.toml

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.28"
optimizer = true
optimizer_runs = 200
via_ir = false
evm_version = "cancun"
remappings = ["@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/"]
fs_permissions = [{ access = "read", path = "./deployments" }]

[profile.default.fuzz]
runs = 1000

[profile.ci.fuzz]
runs = 10000

[rpc_endpoints]
mainnet = "${MAINNET_RPC_URL}"
sepolia = "${SEPOLIA_RPC_URL}"

[etherscan]
sepolia = { key = "${ETHERSCAN_API_KEY}" }

[fmt]
line_length = 120
```

Select a profile with `FOUNDRY_PROFILE=ci forge test`. Set `evm_version` to what your target chains support; some L2s lag mainnet hard forks.

## Core forge Commands

| Command | Purpose |
|---------|---------|
| `forge build` | Compile; `--sizes` shows bytecode size vs 24 KiB limit |
| `forge test -vvv` | Run tests; more `v` = traces on failure |
| `forge test --mt testWithdraw` | Filter by test name (`--mc` for contract) |
| `forge test --gas-report` | Per-function gas table |
| `forge snapshot` / `--diff` | Gas snapshot file and comparison |
| `forge coverage --report lcov` | Coverage |
| `forge fmt` | Format |
| `forge inspect Vault storageLayout` | Storage layout (important for upgrades) |
| `forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify` | Deploy and verify |
| `forge verify-contract <addr> src/Vault.sol:Vault --chain sepolia` | Verify after the fact |

## A Minimal Test

```solidity
// test/Counter.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Counter} from "../src/Counter.sol";

contract CounterTest is Test {
    Counter internal counter;
    address internal alice = makeAddr("alice");

    function setUp() public {
        counter = new Counter();
    }

    function test_IncrementByOwner() public {
        counter.increment();
        assertEq(counter.number(), 1);
    }

    function test_RevertWhen_NotOwner() public {
        vm.prank(alice);
        vm.expectRevert(Counter.NotOwner.selector);
        counter.increment();
    }
}
```

Common cheatcodes: `vm.prank`/`startPrank`, `vm.deal`, `vm.warp`, `vm.roll`, `vm.expectRevert`, `vm.expectEmit`, `vm.mockCall`, `deal(token, who, amount)` (forge-std helper for ERC-20 balances).

## Mainnet Fork Testing

```solidity
function setUp() public {
    vm.createSelectFork(vm.rpcUrl("mainnet"), 21_000_000); // pin a block for determinism
}
```

Pinning a block number makes forks cacheable and reproducible. Use an archive-capable RPC.

## anvil: Local Node

```bash
anvil                                    # local chain, 10 funded dev accounts
anvil --fork-url $MAINNET_RPC_URL --fork-block-number 21000000
anvil --block-time 2                     # interval mining
```

The printed dev private keys are public knowledge; never use them on a real network.

## cast: Chain Swiss Army Knife

```bash
cast call $TOKEN "balanceOf(address)(uint256)" $ADDR --rpc-url sepolia
cast send $COUNTER "increment()" --rpc-url sepolia --account deployer
cast sig "transfer(address,uint256)"               # 0xa9059cbb
cast calldata "transfer(address,uint256)" $TO 1e18
cast 4byte-decode 0xa9059cbb000...                  # decode calldata
cast receipt $TX_HASH --rpc-url sepolia
cast run $TX_HASH --rpc-url mainnet                 # replay with trace
cast storage $ADDR 0 --rpc-url mainnet              # raw slot read
cast wallet import deployer --interactive           # encrypted keystore
```

## Key Management

- Use `cast wallet import` keystores (`--account name`) or hardware wallets (`--ledger`, `--trezor`) instead of `--private-key` on the command line or in `.env`.
- For production deployments prefer a multisig (Safe) as owner and a deployer key with minimal funds.

## chisel

`chisel` is a Solidity REPL for quickly checking expressions, ABI encoding or storage packing:

```
➜ uint256 x = type(uint128).max; x + 1
➜ abi.encodePacked(uint8(1), address(0))
```

## CI Example

```yaml
- uses: actions/checkout@v4
  with: { submodules: recursive }
- uses: foundry-rs/foundry-toolchain@v1
- run: forge fmt --check
- run: forge build --sizes
- run: forge test -vvv
  env: { FOUNDRY_PROFILE: ci }
```

## Pitfalls

- Unpinned `solc_version` producing different bytecode across machines.
- Fork tests without a block number: flaky and slow.
- Forgetting `submodules: recursive` in CI checkout.
- Using `tx.origin` assumptions in tests that `vm.prank` does not set (use `vm.prank(sender, origin)`).

## Checklist

- [ ] Solidity version, optimizer and EVM version pinned
- [ ] Remappings explicit; dependencies pinned to tags
- [ ] Gas snapshot checked in CI
- [ ] Fork tests pinned to a block
- [ ] Keys in keystore/hardware wallet, never in plain env files
