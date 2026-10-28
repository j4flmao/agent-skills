# LayerZero V2 Messaging Protocol: OApp, DVNs, Executors and Message Lifecycle

Implementation reference for sending arbitrary messages with LayerZero V2 on EVM chains: the protocol components, the life of a message, the OApp contract API, execution options, security stack configuration, ordering and failure handling. Token transfers (OFT) are in `layerzero_bridge_logic.md`; a cross-protocol overview is in `layerzero-wormhole.md`.

Package and function names below follow the LayerZero V2 EVM packages (`@layerzerolabs/oapp-evm`, `@layerzerolabs/lz-evm-protocol-v2`). Endpoint addresses, endpoint IDs (EIDs) and DVN addresses differ per chain; take them from the official deployments list.

## Components

| Component | Role |
|-----------|------|
| Endpoint (`EndpointV2`) | Immutable entry point on each chain; assigns nonces, emits packets, stores verified payload hashes, delivers messages |
| Message libraries (`SendUln302`, `ReceiveUln302`) | Append-only libraries implementing the Ultra Light Node verification logic; selectable per OApp |
| DVNs (Decentralized Verifier Networks) | Independent verifiers that attest a packet's payload hash on the destination chain |
| Executor | Permissionless role that calls `lzReceive` on the destination after verification, paid on the source chain |
| OApp | Your contract: sends via the endpoint and implements `_lzReceive` |
| Delegate | Address allowed to change the OApp's endpoint configuration (libraries, DVNs, executor) |

Security is configured per OApp and per pathway (source EID to destination EID): the application chooses which DVNs must verify and how many block confirmations are required.

## Message Lifecycle

```text
Source chain                                   Destination chain
1. OApp._lzSend(dstEid, message, options, fee)
2. Endpoint assigns outbound nonce, builds packet,
   SendLib emits PacketSent; fees paid to DVNs/executor
3. DVNs wait for configured confirmations, then  -> 4. each DVN calls verify() on ReceiveUln302
                                                  5. once required (+ optional threshold) DVNs agree,
                                                     anyone calls commitVerification(); Endpoint stores
                                                     payload hash for (srcEid, sender, nonce)
                                                  6. Executor calls Endpoint.lzReceive(...)
                                                  7. Endpoint clears payload, calls OApp.lzReceive ->
                                                     _lzReceive(origin, guid, message, executor, extraData)
```

- **GUID**: a unique identifier per message derived from nonce, source, sender, destination and receiver.
- **Verification and execution are separate**: if execution fails, the message stays verified and can be retried (by anyone, via `lzReceive` on the endpoint) without re-verification.

## Minimal OApp

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OApp, Origin, MessagingFee, MessagingReceipt} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OptionsBuilder} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Greeter is OApp {
    using OptionsBuilder for bytes;

    string public lastMessage;
    event Received(uint32 srcEid, bytes32 sender, uint64 nonce, string message);

    constructor(address endpoint, address owner) OApp(endpoint, owner) Ownable(owner) {}

    function quote(uint32 dstEid, string calldata message, bytes calldata options)
        external view returns (MessagingFee memory)
    {
        return _quote(dstEid, abi.encode(message), options, false);
    }

    function send(uint32 dstEid, string calldata message, bytes calldata options)
        external payable returns (MessagingReceipt memory)
    {
        return _lzSend(dstEid, abi.encode(message), options, MessagingFee(msg.value, 0), payable(msg.sender));
    }

    function _lzReceive(
        Origin calldata origin,
        bytes32 /*guid*/,
        bytes calldata payload,
        address /*executor*/,
        bytes calldata /*extraData*/
    ) internal override {
        string memory message = abi.decode(payload, (string));
        lastMessage = message;
        emit Received(origin.srcEid, origin.sender, origin.nonce, message);
    }
}
```

The base `OApp.lzReceive` already checks that `msg.sender` is the endpoint and that `origin.sender` equals the configured peer for `origin.srcEid`. Do not override `lzReceive` without preserving those checks.

## Peers

```solidity
// On chain A, for the deployment on chain B (bytes32-padded address)
greeter.setPeer(EID_B, bytes32(uint256(uint160(address(greeterOnB)))));
```

- Peers must be set on both sides; a message from an unset or wrong peer reverts.
- `bytes32` addresses support non-EVM chains (Solana, Aptos) whose addresses are 32 bytes.
- `setPeer` is owner-only: protect the owner with a multisig and timelock, because changing a peer redirects trust.

## Execution Options

Options tell the executor how much gas (and optionally native value) to supply on the destination.

```solidity
bytes memory options = OptionsBuilder.newOptions()
    .addExecutorLzReceiveOption(200_000, 0);          // gas for _lzReceive, msg.value on destination

bytes memory withDrop = OptionsBuilder.newOptions()
    .addExecutorLzReceiveOption(200_000, 0)
    .addExecutorNativeDropOption(0.01 ether, bytes32(uint256(uint160(recipient))));
```

| Option | Purpose |
|--------|---------|
| `addExecutorLzReceiveOption(gas, value)` | Gas limit and value for `lzReceive` |
| `addExecutorNativeDropOption(amount, receiver)` | Deliver native gas token to an address on destination |
| `addExecutorLzComposeOption(index, gas, value)` | Gas for a composed call (`lzCompose`) |
| `addExecutorOrderedExecutionOption()` | Request ordered execution by the executor |

**Enforced options**: the owner can set minimum options per destination and message type with `setEnforcedOptions`, combined with caller-supplied options via `combineOptions`. Use them so users cannot send messages with too little gas, which would leave messages stuck until retried with more gas.

Always measure destination gas with tests including worst-case payload sizes; underestimating gas does not lose the message but delays it.

## Fees

`_quote` returns `MessagingFee{nativeFee, lzTokenFee}` covering DVN and executor costs. The caller sends `nativeFee` as `msg.value`; excess is refunded to the refund address. Quote immediately before sending: fees change with destination gas prices.

## Security Stack Configuration (DVNs and Confirmations)

Default configuration exists for each pathway but can change; production OApps should set an explicit configuration on both send and receive libraries.

```solidity
// UlnConfig used by SendUln302 / ReceiveUln302
struct UlnConfig {
    uint64 confirmations;           // source block confirmations before DVNs verify
    uint8 requiredDVNCount;
    uint8 optionalDVNCount;
    uint8 optionalDVNThreshold;
    address[] requiredDVNs;         // sorted ascending, no duplicates
    address[] optionalDVNs;         // sorted ascending, no duplicates
}
```

Applied through the endpoint by the OApp delegate:

```solidity
SetConfigParam[] memory params = new SetConfigParam[](1);
params[0] = SetConfigParam({eid: dstEid, configType: 2 /* ULN config */, config: abi.encode(ulnConfig)});
endpoint.setConfig(address(oapp), sendLib, params);
```

Guidelines:
- Use at least two independent required DVNs operated by different organizations, or required plus optional with a threshold (for example 2 required + 1-of-3 optional).
- Configure the same DVN set and confirmations on the send side (source chain) and receive side (destination) of each pathway; mismatches block verification.
- Choose confirmations per source chain finality characteristics.
- Pin send and receive library versions explicitly instead of following defaults.
- Most projects use the LayerZero CLI/hardhat tooling (`layerzero.config.ts` + `npx hardhat lz:oapp:wire`) to apply configuration consistently across chains.

## Ordering and Nonces

- Nonces are per pathway (srcEid, sender, receiver). Verification can complete out of order.
- **Unordered execution** (default): messages execute as soon as they are verified; a failing message does not block later ones.
- **Ordered execution**: override `nextNonce` in the OApp to return the next expected nonce and request ordered execution in options. A stuck message then blocks the pathway until it is executed, skipped, or cleared, so only use ordering when the application logic requires it.

## Failure Handling

| Situation | Effect | Recovery |
|-----------|--------|----------|
| `_lzReceive` reverts (bug, insufficient gas) | Message remains verified, not delivered | Retry by calling `endpoint.lzReceive` with more gas after fixing the cause |
| Message must never execute (malicious or obsolete) | Blocks ordered pathways | Delegate can `skip` (before verification), `clear` (verified, burn without execution), `nilify` or `burn` per endpoint API |
| DVN outage | Messages not verified | Wait or reconfigure DVNs via governance |

Design `_lzReceive` so it cannot revert on user-controlled data: validate and record failures internally (store failed payloads for later handling) rather than reverting, when appropriate.

## Composed Messages

`endpoint.sendCompose(to, guid, index, message)` inside `_lzReceive` queues a follow-up call executed by `lzCompose` in a separate transaction, used for example to receive tokens and then call a DEX. Compose receivers must check `msg.sender == endpoint` and the `_from` address.

## Testing

- Use LayerZero's TestHelper (Foundry) to deploy mock endpoints for multiple EIDs locally and deliver packets with `verifyPackets`.
- Test: wrong peer rejected, replay of the same packet rejected, insufficient gas behavior, enforced options applied, ordering behavior if used.
- Track messages on testnets and mainnet with LayerZero Scan by transaction hash or GUID.

## Checklist

- [ ] Peers set on every pathway; owner and delegate behind multisig + timelock
- [ ] Explicit DVN set (independent operators) and confirmations on both sides
- [ ] Send/receive libraries pinned, not relying on mutable defaults
- [ ] Enforced options cover worst-case destination gas
- [ ] `_lzReceive` validates payloads and cannot be blocked by user input
- [ ] Ordered execution only where required, with a clear-message procedure
- [ ] Multi-chain local tests with mock endpoints; monitoring of stuck messages
