# LayerZero V2 Token Bridging: OFT, OFT Adapter and Shared Decimals

Implementation reference for moving fungible tokens across chains with LayerZero's Omnichain Fungible Token (OFT) standard: burn/mint vs lock/unlock models, the `SendParam` API, decimal handling, rate limiting, composed transfers and operational safeguards. Messaging internals (DVNs, options, peers) are in `layerzero_messaging_protocol.md`.

Contracts come from `@layerzerolabs/oft-evm`; verify import paths and versions against the current package.

## Models

| Model | Contract | Source chain action | Destination action | Use |
|-------|----------|---------------------|--------------------|-----|
| Native OFT | `OFT` (is ERC-20) | Burn from sender | Mint to recipient | New tokens designed omnichain |
| Adapter | `OFTAdapter` | Lock existing ERC-20 in adapter | Mint/release OFT on other chains | Existing token on its home chain |
| Mint/burn adapter | Custom adapter with mint/burn rights | Burn via token's own function | Mint | Existing token with bridge-controlled mint |

Rules:
- Only **one** `OFTAdapter` per token mesh. Several lockboxes for the same token would let supply diverge between them.
- Total supply across chains = locked amount in adapter (or home-chain supply) and minted OFT elsewhere; reconcile continuously.
- Non-standard tokens (fee-on-transfer, rebasing) break the adapter's amount accounting unless explicitly handled.

## Native OFT

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OFT} from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is OFT {
    constructor(address lzEndpoint, address delegate)
        OFT("My Token", "MYT", lzEndpoint, delegate)
        Ownable(delegate)
    {}
}
```

Deploy on each chain, then `setPeer` between every pair of deployments you want connected and configure DVNs per pathway.

## OFT Adapter for an Existing Token

```solidity
import {OFTAdapter} from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";

contract MyTokenAdapter is OFTAdapter {
    constructor(address token, address lzEndpoint, address delegate)
        OFTAdapter(token, lzEndpoint, delegate)
        Ownable(delegate)
    {}
}
```

Users approve the adapter for the ERC-20 before sending. On the remote chains deploy a native `OFT` and set the adapter as peer.

## Sending Tokens

```solidity
struct SendParam {
    uint32 dstEid;          // destination endpoint ID
    bytes32 to;             // recipient as bytes32
    uint256 amountLD;       // amount in local decimals
    uint256 minAmountLD;    // slippage guard after dust removal / fees
    bytes extraOptions;     // executor options (gas), combined with enforced options
    bytes composeMsg;       // optional payload for a composed call on destination
    bytes oftCmd;           // unused by default OFT; reserved for extensions
}
```

```solidity
SendParam memory p = SendParam({
    dstEid: DST_EID,
    to: bytes32(uint256(uint160(recipient))),
    amountLD: amount,
    minAmountLD: amount * 995 / 1000,
    extraOptions: OptionsBuilder.newOptions().addExecutorLzReceiveOption(65_000, 0),
    composeMsg: "",
    oftCmd: ""
});

MessagingFee memory fee = oft.quoteSend(p, false);        // false = pay in native, not LZ token
oft.send{value: fee.nativeFee}(p, fee, payable(msg.sender));
```

`quoteOFT(sendParam)` returns limits, fee details and the `OFTReceipt` (amount sent and received in local decimals) for UI display.

## Shared Decimals and Dust

OFT transfers amounts in **shared decimals** (default 6) so that chains whose tokens use different local decimals (18 on EVM, often fewer on Solana and Aptos) can represent the same value, and so amounts fit in a `uint64` in the message.

```text
decimalConversionRate = 10 ** (localDecimals - sharedDecimals)     // 1e12 for 18 -> 6
amountSD  = amountLD / decimalConversionRate                       // sent in message
dust      = amountLD % decimalConversionRate                       // not sent; stays with sender
received  = amountSD * destination decimalConversionRate
```

Implications:
- Amounts are truncated to 6 decimals; `minAmountLD` must account for dust removal.
- Maximum transferable amount per message is `type(uint64).max` in shared units (about 1.8e13 tokens with 6 shared decimals); choose `sharedDecimals` (override `sharedDecimals()`) before deployment if you need a larger range. It cannot be changed afterward without redeploying the mesh.
- All deployments in a mesh must agree on shared decimals.

## Receiving

On the destination, the OFT's `_lzReceive` decodes recipient and `amountSD`, converts to local decimals, mints (OFT) or releases (adapter) via `_credit`, and if a compose message is present, queues `sendCompose` for the recipient. Emitted events: `OFTSent` (source) and `OFTReceived` (destination), keyed by GUID for reconciliation.

## Rate Limiting and Pausing

The standard OFT has no transfer limits. For bridges holding significant value, add:

- Per-destination rate limits (outflow per time window). LayerZero provides a `RateLimiter` helper contract; override `_debit` to check and consume the limit.
- A pause mechanism (OpenZeppelin `Pausable`) on `_debit`/`_credit`, controlled by a guardian multisig with a fast path, while unpausing requires the slower governance path.
- Optional allow/deny lists if required by compliance; document their trust implications.

```solidity
function _debit(address from, uint256 amountLD, uint256 minAmountLD, uint32 dstEid)
    internal override whenNotPaused returns (uint256 sent, uint256 received)
{
    _checkAndUpdateRateLimit(dstEid, amountLD);     // from RateLimiter
    return super._debit(from, amountLD, minAmountLD, dstEid);
}
```

## Composed Transfers

Set `composeMsg` to deliver tokens to a contract and trigger follow-up logic (swap, stake, deposit) on the destination. The receiver implements `ILayerZeroComposer.lzCompose` and must:

- Require `msg.sender == endpoint` and `_from == expected OFT`.
- Decode the compose message with `OFTComposeMsgCodec` (contains nonce, srcEid, amountLD and the original sender).
- Handle failure without losing funds: if the follow-up action fails, transfer tokens to the user or hold them for claim, rather than reverting forever.

Composed execution needs its own gas, set with `addExecutorLzComposeOption`.

## Security Considerations

| Risk | Mitigation |
|------|------------|
| Compromised owner sets malicious peer or DVN config | Owner/delegate as multisig with timelock; monitor `PeerSet` and config events |
| Single-DVN verification | Multiple independent required DVNs |
| Supply mismatch (bug, misconfigured mint rights) | Continuous reconciliation of locked vs minted; alert on deviation |
| Multiple adapters for one token | Exactly one lockbox per mesh |
| Fee-on-transfer / rebasing tokens through adapter | Measure balance deltas or reject such tokens |
| Stuck messages due to low gas | Enforced options; retry procedures |
| Unbounded outflow on exploit | Rate limits and pause |

## Operations

- Deploy with deterministic addresses where possible (CREATE2 / CREATE3 factories) to simplify peer configuration and user verification.
- Wire all pathways with the LayerZero tooling from a single config file reviewed in Git.
- Monitor per pathway: messages sent vs delivered, delivery latency, failed `lzReceive`, total supply reconciliation, rate limit utilization.
- Keep an incident runbook: pause, communicate, coordinate with DVN operators, plan for clearing or retrying messages.

## Testing

- Foundry with LayerZero TestHelper: deploy OFTs on mock EIDs, send, `verifyPackets`, assert balances on both sides.
- Fuzz amounts around dust boundaries and maximum `uint64` shared amounts.
- Test slippage (`minAmountLD`) failures, paused paths, rate limit exhaustion and recovery, and compose failure handling.
- Invariant: sum of supplies (minted on remotes) never exceeds locked amount on the home chain.

## Checklist

- [ ] Correct model chosen (OFT vs single adapter); unusual token mechanics handled
- [ ] Shared decimals decided before deployment and consistent across the mesh
- [ ] `minAmountLD` set from `quoteOFT` results in clients
- [ ] Enforced gas options for send and compose
- [ ] Rate limits and pause for high-value bridges
- [ ] Multisig + timelock for owner and delegate; DVN config explicit
- [ ] Supply reconciliation and stuck-message monitoring in place
