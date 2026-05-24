# LayerZero, Wormhole, Axelar

## LayerZero

### Architecture

LayerZero is an omnichain interoperability protocol built on **UltraLightNode (ULN)** + **Oracle** + **Relayer**.

- **UltraLightNode (ULN)**: a set of on-chain contracts on each connected chain that verify and forward messages.
- **Oracle**: an off-chain service that reads a block header/transaction from the source chain and posts it on-chain to the destination chain. Default oracle is **Google Cloud**-operated, but can be any custom oracle.
- **Relayer**: an off-chain service that reads the transaction proof from the source chain and submits it to the destination chain's ULN.
- **Security model**: if the Oracle and Relayer collude, they can forge a message. This is the fundamental trust assumption — two independent parties must both be honest.

### Message Flow

1. User calls `send()` on the source chain ULN.
2. Oracle posts the block hash (or header) to the destination chain.
3. Relayer submits the transaction proof (Merkle proof) to the destination chain ULN.
4. ULN verifies the proof against the stored block hash and delivers the payload to the destination endpoint.

### Stargate

Stargate is a liquidity-layer built on LayerZero for native asset transfers. Instead of minting/burning synthetic tokens, it uses a **pool** model:

- Each chain hosts a pool of the asset (USDC, ETH, etc.).
- A transfer burns/destroys tokens on source, unlocks them on destination.
- Pools are rebalanced via **Delta** and **Epsilon** algorithms to maintain solvency.
- Stargate aggregates liquidity across chains, enabling instant guaranteed finality (the pool releases tokens before the destination confirmation in some cases).

### Endpoints & Configuration

- **Adapter Parameters**: specify the gas limit for the destination call, whether to use `send()` vs `call()`.
- **`lzReceive`**: destination contract must implement this to receive messages.
- **Versioning**: LayerZero V1 used immutable endpoints; V2 introduced **Executor** and **DVN (Decentralized Verifier Network)** to make the verification layer modular.
- **LayerZero V2** changes: the DVN replaces the fixed Oracle+Relayer pair. Users can select custom DVN configurations (e.g., Google DVN, LayerZero DVN, or a custom set of verifiers).

### Trust Model & Security

- **2-of-2 trust**: both Oracle and Relayer must be honest. If one is compromised but not the other, messages are safe.
- **Configurable security**: users can require multiple Oracle/Relayer pairs.
- **Cost**: `send()` costs gas on source chain (for the ULN call) + premium fees paid in native gas token (e.g., ETH on Ethereum). Oracle and Relayer fees are included in the premium.
- **Latency**: depends on oracle and relayer speed. Typically ~1–5 minutes on EVM chains.

---

## Wormhole

### Architecture

Wormhole is a generic message-passing protocol using a **Guardian** network (validator set).

- **Guardians**: a set of 19 permissioned validators that observe messages emitted on connected chains. Each Guardian runs a **Guardian node** that watches for `LogMessagePublished` events.
- **VAA (Verified Action Approval)**: when a message is emitted, each Guardian signs the observed data. Once 2/3+ signatures (13 of 19) are collected, they form a VAA — a signed attestation of the message.
- **Relayer**: separate from Guardians. Anyone can read VAAs from the Guardian network and submit them to the destination chain.
- **Core Bridge**: the on-chain contract that verifies VAA signatures and delivers the payload.

### Message Flow

1. Source contract emits `LogMessagePublished` (emitter, sequence, payload).
2. Each Guardian observes the log, signs the hash, and gossips the signature via libp2p.
3. Once 13/19 signatures are collected, the VAA is available.
4. A relayer (permissionless) submits the VAA to the destination chain's Core Bridge.
5. Core Bridge recovers secp256k1 public keys from the 13 signatures and verifies they match the current Guardian set.
6. The payload is delivered to the target contract.

### Token Bridge

- Wormhole's Token Bridge (built on top of Core Bridge) uses an **attest + mint/burn** model:
  1. Attest a token on source chain (lock in bridge contract).
  2. A VAA is emitted with the lock event.
  3. On destination, the VAA is consumed and wrapped tokens are minted.
  4. To return: burn wrapped tokens on destination → VAA emitted → unlock original on source.
- Wrapped tokens use a canonical `wormhole` address format.

### NFT Bridge

- Same pattern as Token Bridge but for ERC-721 / CW-721.
- Metadata (tokenURI) is included in the VAA.
- On destination, a new NFT is minted with the same metadata. When bridged back, the destination NFT is burned and the original is unlocked.

### Connect (formerly Portal)

- High-level SDK for cross-chain app development on Wormhole.
- Includes Token Bridge, NFT Bridge, and arbitrary message passing.
- Supports EVM, Solana, Terra, Sui, Aptos, Near, Algorand, and more.

### Trust Model & Security

- **19-of-19 (N-of-N) with 2/3 threshold**: security depends on the Guardian set being honest and available.
- **Guardian set updates**: governed by the Wormhole DAO (stake-based voting). Changing the Guardian set requires a governance VAA.
- **Past attacks**: February 2022 exploit — $326M. The attacker exploited a solana contract bug (invalid `ExecuteInstruction` signature verification), not a Guardian compromise. The bug allowed minting fake VAAs on Solana.
- **Cost**: gas on source + destination. No per-message protocol fee (unlike LayerZero). Relayer costs are off-chain (typically covered by the dApp or user).
- **Latency**: ~1 block confirmation + Guardian consensus (~seconds). Solana ~400ms, EVM ~12s.

---

## Axelar

### Architecture

Axelar is a decentralized cross-chain communication network with its own L1 blockchain (Cosmos SDK, Tendermint consensus).

- **Validators**: Axelar runs its own PoS validator set (50 validators). They run the Axelar node software and vote on the validity of cross-chain messages.
- **Gateway**: an on-chain contract on each connected chain. Validators observe Gateway events and sign off on them.
- **GasService**: a contract that handles gas payments for the destination chain execution. Users pay in a single token (AXL or any whitelisted asset) and GasService converts accordingly.
- **Amplifier**: Axelar's next-gen architecture. Instead of validators running full nodes for every connected chain, Amplifier uses **verifier networks** — specialised groups of validators that verify a specific chain's consensus. This reduces node requirements and enables faster chain onboarding.

### Message Flow (Classic)

1. User calls `callContract(destinationChain, destinationAddress, payload)` on source Gateway.
2. Axelar validators observe the event, vote on its validity via Tendermint consensus on the Axelar chain.
3. The Axelar chain produces a block containing the vote result.
4. Relayer submits the confirmed message to the destination Gateway contract.
5. Gateway verifies the Axelar chain's consensus proof and delivers the payload.

### Key Features

- **General Message Passing (GMP)**: arbitrary contract-to-contract calls. Payload is ABI-encoded function call data.
- **Token Transfer with GMP**: `callContractWithToken` sends a token + executes a contract call atomically on the destination chain. No separate approve + bridge step.
- **Interchain Token Service**: deploy a token natively on multiple chains. Tokens are minted/burned across chains via the Axelar network. Non-custodial — total supply is tracked on the Axelar chain.
- **GasService**: `payGasForContractCall` ensures the destination transaction has enough gas to execute. Gas is refunded if unused.

### Amplifier

- **Verifier Network**: each connected chain gets a subset of Axelar validators as its "verifier network." They run light clients or RPC watchers for that specific chain.
- **Benefits**: parallel verification, faster onboarding (no full node for every chain), modular security.
- **Status**: in development as of 2025.

### Trust Model & Security

- **External validator bridge**: security depends on the Axelar validator set (PoS, slashing for equivocation/downtime).
- **Cross-chain security**: if the Axelar chain is compromised, all connected bridges are compromised.
- **Slashing**: validators who sign invalid messages are slashed. This economic security replaces the "oracle honesty" assumption of LayerZero.
- **Cost**: Axelar-side gas (paid in AXL) + destination gas. The `callContract` fee is dynamic based on gas price on the destination chain.
- **Latency**: Axelar chain block time (~3s) + finality (~2/3 val signature). Total ~5–15s per message.

---

## Comparison Table

| Feature | LayerZero | Wormhole | Axelar |
|---------|-----------|----------|--------|
| Verification | ULN + Oracle/Relayer (2-of-2) | Guardian quorum (13/19) | PoS validator set (33/50) |
| Own blockchain | No | No | Yes (L1, Cosmos SDK) |
| Token bridge model | Pool-based (Stargate) | Mint/burn (wrapped) | Mint/burn (Interchain Token) |
| GMP support | Yes (V2) | Yes (Connect) | Yes (native callContract) |
| Permissionless relay | No (oracle+relayer permissioned) | Yes (anyone can submit VAA) | Yes (anyone can relay) |
| Finality guarantee | Depends on oracle | ~1 block + guardian sig | Axelar chain finality |
| Fee model | Protocol fee + gas | Gas only (no protocol fee) | Dynamic (gas + network fee) |
| Latency | 1–5 min | 1–30s | 5–15s |
| Connected chains | 50+ | 30+ | 60+ |
