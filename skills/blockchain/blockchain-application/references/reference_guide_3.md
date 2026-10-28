# Contract Deployment and Verification

How to deploy EVM contracts reproducibly: Foundry scripts, deterministic addresses with CREATE2, multi-chain deployments, source verification, and handing ownership to a multisig.

## Foundry Deployment Script

```solidity
// script/Deploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {Vault} from "../src/Vault.sol";

contract Deploy is Script {
    function run() external returns (Vault vault) {
        address asset = vm.envAddress("ASSET");
        address owner = vm.envAddress("OWNER_SAFE");

        vm.startBroadcast();               // signer chosen by CLI flags
        vault = new Vault(asset, owner);
        vm.stopBroadcast();

        console2.log("Vault deployed at", address(vault));
    }
}
```

```bash
# dry run (simulation only)
forge script script/Deploy.s.sol --rpc-url sepolia --account deployer

# broadcast + verify
forge script script/Deploy.s.sol --rpc-url sepolia --account deployer --broadcast --verify

# resume a partially broadcast run
forge script script/Deploy.s.sol --rpc-url sepolia --account deployer --resume
```

Foundry writes `broadcast/Deploy.s.sol/<chainId>/run-latest.json` with tx hashes and addresses: commit it (minus secrets) as a deployment record.

## Deterministic Addresses with CREATE2

Address = `keccak256(0xff ++ deployer ++ salt ++ keccak256(initCode))[12:]`. Same deployer, salt and init code yield the same address on every chain.

```solidity
vm.startBroadcast();
Vault vault = new Vault{salt: bytes32("vault-v1")}(asset, owner);
vm.stopBroadcast();
```

In scripts, Foundry routes `new X{salt: s}` through the deterministic deployment proxy at `0x4e59b44847b379578588920cA78FbF26c0B4956C`, which exists on most EVM chains. Constructor arguments are part of init code, so differing args per chain change the address.

Front-running consideration: anyone can deploy the same init code at that address first. If that matters, include `msg.sender` in the salt via a factory you control, or use CREATE3-style factories where the address depends only on deployer + salt.

## Constructor vs Initializer

| Pattern | Use |
|---------|-----|
| Constructor args | Non-upgradeable contracts |
| `initialize()` + `_disableInitializers()` in constructor | Upgradeable implementations behind proxies |

For proxies, deploy implementation and proxy and initialize in the same transaction (e.g. `new ERC1967Proxy(impl, abi.encodeCall(Vault.initialize, (...)))`) to prevent initializer front-running.

## Source Verification

```bash
forge verify-contract 0xAddr src/Vault.sol:Vault \
  --chain sepolia \
  --constructor-args $(cast abi-encode "constructor(address,address)" $ASSET $OWNER) \
  --watch
```

Options:
- Etherscan-family explorers (API key per explorer; Etherscan API V2 uses one key across supported chains).
- Sourcify (`--verifier sourcify`), which needs no key and does full metadata matching.
- Blockscout (`--verifier blockscout --verifier-url <instance>/api/`).

Verification fails when compiler version, optimizer runs, `via_ir`, EVM version or remappings differ from the build. Keep them in `foundry.toml`, not CLI flags.

## Multi-Chain Deployments

```bash
for chain in sepolia base-sepolia arbitrum-sepolia; do
  forge script script/Deploy.s.sol --rpc-url $chain --account deployer --broadcast --verify
done
```

Check per chain:
- EVM version support (e.g. `PUSH0` from Shanghai, transient storage from Cancun).
- Precompile and opcode differences on some L2s and zkEVMs (zkSync Era uses a different compiler, `zksolc`, and different CREATE2 derivation).
- Block time assumptions in time-based logic.
- Canonical addresses of dependencies (WETH, USDC, Chainlink feeds) differ per chain; store them in a per-chain config file.

## Ownership Handoff

```solidity
// OpenZeppelin Ownable2Step
vault.transferOwnership(safe);   // pending
// later, executed from the Safe:
vault.acceptOwnership();
```

Two-step transfer prevents sending ownership to a mistyped address. Grant admin roles to a Safe multisig or a Timelock controlled by the Safe; renounce deployer roles after setup.

## Post-Deployment Verification Script

```solidity
function run() external view {
    Vault v = Vault(vm.envAddress("VAULT"));
    require(v.owner() == vm.envAddress("OWNER_SAFE"), "owner");
    require(address(v.asset()) == vm.envAddress("ASSET"), "asset");
    require(!v.paused(), "paused");
}
```

Run it against each chain after deployment and in monitoring.

## Deployment Record

Keep a `deployments/<chainId>.json`:

```json
{
  "Vault": { "address": "0x...", "tx": "0x...", "block": 7012345, "commit": "3f2c1ab", "solc": "0.8.28" }
}
```

## Pitfalls

- Deploying from a hot key that retains admin rights.
- Unverified source: users and auditors cannot review.
- Assuming identical addresses across chains while constructor args differ.
- Leaving an implementation contract uninitialized (can be initialized by anyone).
- Gas price spikes: set `--with-gas-price` or `--priority-gas-price` for L1, and check L2 data fee behavior.

## Checklist

- [ ] Simulation run reviewed before `--broadcast`
- [ ] Compiler settings in `foundry.toml`, matching verification
- [ ] Source verified on explorer and/or Sourcify
- [ ] Ownership moved to multisig/timelock via two-step transfer
- [ ] Per-chain addresses and config recorded in repo
- [ ] Post-deploy assertion script passes
