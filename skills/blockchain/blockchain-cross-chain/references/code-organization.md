# Code Organization for Cross-Chain Projects

How to structure a repository that deploys contracts to many chains and connects them with a messaging protocol (LayerZero, Wormhole, Chainlink CCIP, Hyperlane, Axelar, IBC): contract layering, per-chain configuration, deployment scripts and artifacts, testing layout, and governance of configuration changes.

## Repository Layout (Foundry-based)

```text
cross-chain-app/
  foundry.toml
  remappings.txt
  package.json                     # protocol packages and tooling (e.g. LayerZero devtools)
  src/
    core/                          # chain-agnostic business logic (no messaging imports)
      Vault.sol
      interfaces/IVault.sol
    messaging/                     # protocol adapters: encode, send, receive
      LzVaultMessenger.sol
      CcipVaultMessenger.sol
      MessageCodec.sol             # versioned payload encoding shared by all adapters
    tokens/
      MyOFT.sol
    access/
      Roles.sol
  script/
    Deploy.s.sol                   # deterministic deployment (CREATE2/CREATE3)
    Wire.s.sol                     # peers, DVNs/lanes, enforced options
  config/
    chains.json                    # chain IDs, endpoint IDs, RPC env var names, confirmations
    mainnet.json                   # pathways, DVN/verifier sets, rate limits
    testnet.json
  deployments/
    mainnet/<chain>.json           # deployed addresses + commit hash + constructor args
    testnet/<chain>.json
  test/
    unit/                          # pure logic, codec round trips
    integration/                   # multi-chain with protocol test helpers / mocks
    fork/                          # fork tests against real endpoints
    invariant/                     # supply and accounting invariants
  docs/
    pathways.md                    # which chains connect, trust assumptions, limits
```

## Layering Contracts

Separate business logic from transport so you can test logic in isolation and support or replace protocols.

```text
User -> Vault (core logic, accounting)
          |
          v  IMessenger interface
       LzVaultMessenger / CcipVaultMessenger (protocol-specific send/receive, auth checks)
          |
          v
       Protocol endpoint / router
```

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMessenger {
    function quote(uint64 dstChain, bytes calldata payload) external view returns (uint256 fee);
    function send(uint64 dstChain, bytes calldata payload) external payable returns (bytes32 messageId);
}

/// Called by messenger adapters after they authenticate the source
interface IMessageHandler {
    function handleMessage(uint64 srcChain, bytes32 srcSender, bytes calldata payload) external;
}
```

- Use one internal chain identifier type in core logic and map to protocol IDs (LayerZero EIDs, CCIP chain selectors, Wormhole chain IDs) inside adapters.
- Adapters enforce source authentication (endpoint/router is `msg.sender`, sender equals configured peer) before calling core logic. Core logic accepts calls only from registered adapters.
- Supporting two protocols for the same flow adds redundancy only if the core requires agreement from both (or uses one as a fallback with strict governance); otherwise it doubles the attack surface.

## Versioned Message Codec

```solidity
library MessageCodec {
    uint8 internal constant VERSION = 1;
    uint8 internal constant TYPE_DEPOSIT = 1;
    uint8 internal constant TYPE_WITHDRAW = 2;

    error UnsupportedVersion(uint8 version);

    function encodeDeposit(bytes32 user, uint256 amount) internal pure returns (bytes memory) {
        return abi.encode(VERSION, TYPE_DEPOSIT, user, amount);
    }

    function decodeHeader(bytes calldata payload) internal pure returns (uint8 version, uint8 msgType) {
        (version, msgType) = abi.decode(payload[:64], (uint8, uint8));
        if (version != VERSION) revert UnsupportedVersion(version);
    }
}
```

- A version byte lets you upgrade message formats while old in-flight messages are still delivered; support both versions during migrations.
- Use `bytes32` for addresses so non-EVM chains fit.
- Keep the codec in one library used by every adapter and by off-chain tooling (generate TypeScript encoders from the same spec or ABI).

## Per-Chain Configuration as Data

```json
{
  "arbitrum": { "chainId": 42161, "lzEid": 30110, "ccipSelector": "4949039107694359620",
                "rpcEnv": "ARBITRUM_RPC_URL", "confirmations": 20 },
  "base":     { "chainId": 8453,  "lzEid": 30184, "ccipSelector": "15971525489660198786",
                "rpcEnv": "BASE_RPC_URL", "confirmations": 10 }
}
```

Verify every ID against the protocol's official deployment lists before use; the values above illustrate format only. Rules:
- Configuration (peers, verifier sets, limits) lives in reviewed JSON/TypeScript files, not hardcoded in scripts.
- Scripts read config, compare with on-chain state, and apply only the diff (idempotent wiring).
- Separate mainnet and testnet configs completely; never share deployer keys.

## Deployment Scripts and Artifacts

```solidity
// script/Deploy.s.sol (excerpt)
contract Deploy is Script {
    function run() external {
        bytes32 salt = keccak256("cross-chain-app/vault/v1");
        vm.startBroadcast();
        Vault vault = new Vault{salt: salt}(vm.envAddress("OWNER"));
        vm.stopBroadcast();
        console2.log("Vault", address(vault));
    }
}
```

```bash
forge script script/Deploy.s.sol --rpc-url "$BASE_RPC_URL" --broadcast --verify --account deployer
```

- Deterministic addresses (CREATE2 with the same salt, bytecode and constructor args, or a CREATE3 factory) give the same address on every EVM chain, simplifying peer configuration and user verification. Constructor args that differ per chain (endpoint addresses) change the CREATE2 address; CREATE3 avoids that.
- Record each deployment: address, chain, commit hash, compiler settings, constructor args, transaction hash. Foundry's `broadcast/` output can be post-processed into `deployments/`.
- Verify source code on each chain's explorer as part of the deploy.
- Use hardware wallets or remote signers for deployer keys (`--ledger`, `--account` with an encrypted keystore); never raw private keys in environment variables on shared machines.

## Ownership and Governance

- Transfer ownership of every deployed contract to a multisig per chain (or a cross-chain governance system) immediately after wiring.
- Configuration changes (peers, verifier sets, rate limits) go through a timelock and are proposed from the same reviewed config files.
- Maintain a pathway registry (`docs/pathways.md`) listing for each connection: protocol, verifier set, confirmations, rate limit, owner, and emergency contacts.

## Testing Layout

| Suite | Purpose | Tooling |
|-------|---------|---------|
| Unit | Codec round trips, accounting math | Foundry tests |
| Integration | Multi-chain message flow with mock endpoints | LayerZero TestHelper, Chainlink Local (CCIP), Wormhole/Hyperlane test utilities |
| Fork | Real endpoint contracts and configs on forked chains | `vm.createSelectFork` per chain |
| Invariant | Global properties (supply conservation, no double-processing) | Foundry invariant tests with handlers |
| Config checks | On-chain state matches config files | Script that reads chain state and diffs |

Key invariants:
- Tokens minted on remote chains never exceed tokens locked on the home chain.
- Each message ID is processed at most once.
- Only configured peers can trigger state changes.

## CI Pipeline

```text
lint (solhint/forge fmt) -> build -> unit + integration + invariant tests
  -> static analysis (Slither, Aderyn) -> gas snapshot diff
  -> config validation (IDs exist, peers symmetric, verifier sets sorted and non-empty)
```

Mainnet deployments and wiring run from a controlled pipeline or a documented manual process with two-person review, never from developer laptops ad hoc.

## Checklist

- [ ] Business logic separated from protocol adapters
- [ ] Versioned, shared message codec with `bytes32` addresses
- [ ] Chain and pathway configuration as reviewed data files
- [ ] Deterministic deployments with recorded artifacts and verified sources
- [ ] Idempotent wiring scripts that diff config against chain state
- [ ] Ownership moved to multisig + timelock after wiring
- [ ] Multi-chain integration, fork and invariant tests in CI
