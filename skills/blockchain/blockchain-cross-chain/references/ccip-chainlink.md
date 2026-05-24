# Chainlink CCIP (Cross-Chain Interoperability Protocol)

## Overview

CCIP is a cross-chain messaging protocol built by Chainlink. It uses a **Decentralized Oracle Network (DON)** for message verification and an **ARM (Anti-Fraud Network)** for additional security. CCIP supports arbitrary messaging, token transfers, and programmable token transfers.

## Architecture

### Layers

1. **On-Chain Contracts** — deployed on every supported chain. Includes:
   - **Router**: entry point for sending messages. Routes to the correct lane.
   - **Lane**: a uni-directional channel from Chain A → Chain B. Two chains have two lanes.
   - **Commit DON (Decentralized Oracle Network)**: observes source-chain events and produces a Merkle root of committed messages.
   - **Execution DON**: executes messages on the destination chain.
   - **ARM Network**: monitors for fraudulent activity.

2. **Off-Chain Infrastructure** — Chainlink DON nodes running:
   - **Commit DON**: reads source-chain events, batch-merkleizes them, and signs a commitment.
   - **Execution DON**: reads commitments and executes messages on the destination.
   - **ARM (Anti-Fraud Network)**: a separate set of nodes that independently verify the correctness of committed messages.

### ARM Network

- The ARM is a **separate, independent set of nodes** (not the same as the DON) that provide an extra layer of security.
- ARM nodes independently simulate commitment verification and can **block** execution if they detect fraud.
- ARM uses a **Lane-specific key set** — different from the DON's key set.
- **2-phase security**: the DON produces a commitment; the ARM can veto it. This prevents a single DON compromise from bridging fraudulent messages.
- ARM nodes are operated by different entities than DON nodes, reducing collusion risk.

### Phases: Commit + Execution

#### Commit Phase

1. User calls `ccipSend()` on the Router with a message payload (gas limit, receiver, data, tokens).
2. Router forwards to the Lane contract, which emits `CCIPSendRequested`.
3. Commit DON nodes observe the emitted event.
4. Commit DON periodically builds a **Merkle tree** of all pending messages for the lane.
5. Commit DON signs the Merkle root (called a **commit report**) and posts it on-chain to the destination chain's CommitStore contract.
6. CommitStore stores the signed Merkle root.

#### Execution Phase

1. Execution DON nodes read the commit report from CommitStore.
2. Execution DON constructs a Merkle proof for individual messages.
3. Each message is delivered by calling `execute()` on the destination Lane.
4. Contract verifies: (a) the Merkle proof against the committed root, (b) DON signatures on the root, (c) ARM confirmation.
5. Destination `receiver` contract is called with the payload.

### Message Structure

```solidity
struct CCIPMessage {
    uint64 sourceChainSelector;
    address sender;
    address receiver;
    bytes data;
    EVMExtraArgsV1 extraArgs;  // gasLimit, allowOutOfOrderExecution
    bytes tokenAmounts;
}
```

- **`allowOutOfOrderExecution`**: CCIP supports both ordered and unordered delivery via this flag.
  - `false` (default) — messages are delivered in sequence. If a previous message fails, subsequent messages block.
  - `true` — messages can execute out of order. Failed messages do not block others.

## Token Transfers

CCIP supports three transfer modes:

### 1. Token Transfer Only

- User sends a token + metadata (chain, receiver).
- Tokens are burned/locked on source, minted on destination.
- Supports wBTC, LINK, USDC, etc.
- Fees paid in LINK (or native gas via billing).

### 2. Token Transfer with Message

- Bundle a token transfer with arbitrary calldata for the receiver.
- Receiver gets the tokens + the message executed.
- Example: bridge USDC to a lending contract and deposit into the pool in one call.

### 3. Programmable Token Transfers (PTT)

- CCIP-specific: only the **receiver's callback** — the tokens arrive first, then `ccipReceive` is called with the message and token payload.
- Enables atomic cross-chain flows: "lock on A → mint on B → supply to DeFi on B" in a single user operation.
- Tokens arrive as `ClientData` on the receiver, so the receiver must implement `CCIPReceiver` and handle `Any2EVMMessage` struct which includes native token amounts.

### Billing & Fees

- **LINK fee** or **native token fee** (ETH, MATIC, etc.).
- Fee covers:
  - DON execution costs (gas on destination chain).
  - ARM verification.
  - Premium paid in LINK.
- Fee is estimated off-chain via CCIP's fee estimation API.
- **Rate limits**: per-lane and per-token caps on both value and frequency. If a rate limit is hit, the message is queued until the rate recovers.

## Rate Limits

- CCIP enforces **token-bucket rate limits** at the lane level.
- Each token has: **capacity** (max amount in a window) and **refill rate** (amount restored per second).
- If the source chain tries to send tokens that exceed the destination chain's capacity, the transaction reverts.
- Rate limits prevent bridge drain attacks by limiting the exploitable value per unit time.
- Configurable by the Chainlink network (governed by LINK staker vote).

## Emergency Pause

- The **Emergency Pause** mechanism pauses all CCIP operations on a chain.
- Triggered by:
  - ARM detecting anomalous activity.
  - Chainlink governance.
- When paused:
  - No new messages can be sent.
  - Executing existing messages is also paused.
  - Messages remain in the queue; execution resumes after unpause.
- **Pause isolation** — each lane can be paused independently. A bug on Ethereum→Polygon lane does not affect Arbitrum→Optimism lane.

## Security Model

| Component | Trust Model |
|-----------|-------------|
| Commit DON | BFT assumption — DON must be <1/3 Byzantine |
| Execution DON | BFT assumption |
| ARM | Additional independent verifier; can veto any commit |
| Key management | Separate key sets per lane per DON |
| Rate limits | Economically bounds maximum potential loss per window |

- **CCIP is not trustless** — it relies on the honesty of the DON and ARM operators.
- **Defense in depth**: DON + ARM + rate limits + emergency pause.
- Chainlink has not suffered a major bridge exploit as of 2025, but the protocol is significantly more centralised than IBC.

## Supported Chains (as of 2025)

- Ethereum, Arbitrum, Optimism, Base, Avalanche, Polygon, BNB Chain, WEMIX, Kroma, and others.
- Chainlink expands CCIP to new chains via governance votes.

## Developer Integration

- **Router.sol**: `ccipSend()`.
- **CCIPReceiver.sol**: base contract for receiving.
- **CCIPClient.sol**: helper library.
- **Fee estimation**: `Router.getFee()`.
- **Chain Selectors**: each chain has a uint64 selector (e.g., Ethereum mainnet = `0xa8f5f1a0`).
- **Manual execution**: if the Execution DON does not deliver a message within the timeout, the sender can call `manuallyExecute()` to trigger delivery directly.
