# IBC (Inter-Blockchain Communication) Deep Dive

## Overview

IBC is a protocol for authenticated, reliable, and ordered message passing between independent blockchains. Developed by the Cosmos ecosystem, it is a light-client-based bridge that does not rely on external validator sets.

## Transport Layer

### Light Clients

IBC uses on-chain light clients (often called "consensus clients") to verify the state of a counterparty chain. Each chain running IBC maintains a light client for every connected chain.

- A light client tracks the validator set and consensus state of the counterparty.
- On Cosmos SDK chains, the default light client uses Tendermint consensus verification — it checks that 2/3+ of the validator set by voting power signed a block header.
- The light client is updated by relayers submitting new headers. If the chain is live and validators are honest, the light client advances.
- **Light client misbehaviour** — if a relayer submits conflicting headers, the light client can detect a fork and freeze, preventing fraudulent packets from being relayed.

### Connections

- A **Connection** is an association between two chains verified by their light clients.
- Connection handshake: `init → try → ack → confirm`. This ensures both chains agree on the counterparty's client identifier and that the client is correctly tracking the other chain.
- One connection can host many channels.

### Channels

- A **Channel** is a uni- or bi-directional pipeline for a specific application (e.g., a token transfer channel).
- Channel handshake: `init → try → ack → confirm`.
- Channels are associated with a **Port**, which identifies the application (e.g., `transfer` for ICS-20).
- Packets sent on a channel are authenticated by the light client and the connection.

## Application Layer (ICS Standards)

ICS (Interchain Standards) define the application-level semantics on top of IBC transport.

| ICS | Name | Description |
|-----|------|-------------|
| ICS-20 | Fungible Token Transfer | The canonical token bridge. Escrows on source, mints vouchers on destination. Vouchers use `ibc/<hash>` denomination. |
| ICS-21 | Interchain Accounts (ICA) | Control an account on a remote chain via IBC. Enables app-chains to execute Cosmos messages on another chain. |
| ICS-27 | Interchain Queries (ICQ) | Query state from a remote chain via IBC. Useful for price feeds, staking data, etc. |
| ICS-721 | NFT Transfer | Cross-chain NFT bridge following ICS-20 pattern. |
| ICS-100 | Fungible Token Hooks | Execute a contract call atomically after an ICS-20 transfer on the destination chain. |

### ICS-20 Flow (Detailed)

1. User sends tokens to a module account on the source chain.
2. Source chain escrows the tokens.
3. Packet commits on source chain at a specific sequence number.
4. Relayer observes the packet commitment and submits it (with proof) to the destination chain.
5. Destination chain verifies the proof against the stored light client.
6. Destination chain mints voucher tokens (`ibc/<denom-hash>`).
7. To return: burn voucher on destination, relayer submits proof to source, source un-escrows original tokens.

## Relayer Mechanics

Relayers are off-chain processes that monitor IBC packets on one chain and submit proofs to the counterparty.

- **Permissionless** — anyone can run a relayer. No staking or whitelisting required.
- **Relayer operations**:
  1. Update light client on destination chain (submit new header + validator set).
  2. Submit `PacketAcknowledgement` (for ordered channels) or `PacketReceipt` (for unordered).
  3. Submit timeout proofs if a packet expires without acknowledgement.
- **Go relayer** — `github.com/cosmos/relayer` (`rly`). Supports path management, key management, and concurrent relaying.
- **Hermes** (Informal Systems) — Rust-based relayer with active monitoring, prometheus metrics, and automatic light client updates.
- **Cost** — relayers pay gas on both chains. On Cosmos, this includes `MsgUpdateClient`, `MsgRecvPacket`, `MsgAcknowledgement`. The IBC protocol does not pay relayers automatically; applications must include relayer incentives (ICS-29).

### Relayer Incentives (ICS-29)

- ICS-29 adds a fee module: the packet sender can attach a fee (native tokens) to reward the relayer.
- Relayers claim fees by submitting the `RecvPacket` or `Acknowledgement`.
- Without ICS-29, relayers are altruistic (run by ecosystem teams, exchanges, or infrastructure providers).

## Ordering: Ordered vs Unordered

| Property | Ordered Channel | Unordered Channel |
|----------|-----------------|-------------------|
| Packet sequence | Strictly increasing, no gaps allowed | Any sequence, gaps allowed |
| Delivery order | Exactly once, in order | Exactly once, out of order |
| Use case | ICS-20 token transfers | ICS-21 interchain accounts, general message passing |
| Timeout | If a packet times out, the channel closes | Only the timed-out packet is skipped; channel stays open |
| Acknowledgement | Required for every packet | Optional (receipt only) |

## Timeout Handling

- Every IBC packet has a timeout height and/or timeout timestamp.
- Source chain sets the timeout when sending the packet.
- If the destination chain does not receive the packet before the timeout:
  - For **ordered channels**: the channel closes. No further packets can be sent until the channel is re-opened via `ChanCloseConfirm` + `ChanOpenInit` handshake.
  - For **unordered channels**: only the timed-out packet is skipped. The relayer submits a `TimeoutPacket` message to the source chain, which refunds the escrowed tokens or reverses the state change.
- Timeout heights are relative to the destination chain's block height. The source chain maintains a trusted block height of the destination via the light client.

## Security Model

- **Trust-minimized**: security inherits from the consensus of each connected chain. No external validator set.
- **Attack surface**: relayer censorship (prevents packet relay but cannot forge packets), light client misbehaviour (frozen client prevents all IBC on that path until resolved).
- **Upgrade security**: if a chain's consensus rules change (e.g., validator set rotation, software upgrade), all light clients must be updated. Governance can coordinate this.
- **Fork detection**: Tendermint light clients detect duplicate votes (equivocation) and freeze.

## Limitations

- **Latency**: LCP (light client proof) requires waiting for source chain finality before relaying. For Tendermint chains this is ~2–3 seconds. For Ethereum, ~12 minutes (128 blocks for Casper FFG finality) unless an optimistic light client is used.
- **Generalizability**: IBC requires the destination chain to host a light client for the source. Non-Cosmos chains (Ethereum, Solana) can run IBC via custom light clients, but implementation complexity is high.
- **State growth**: each connected chain adds light client state (~a few KB per client). Hundreds of connections are manageable but not free.
