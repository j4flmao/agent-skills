# Blockchain Patterns: Layer-2 Scaling Patterns

## Overview

Layer-2 scaling encompasses a family of architectural patterns that move computation and state off the base layer (L1) while inheriting its security guarantees. These patterns solve the blockchain trilemma by trading L1 execution for L2 throughput, latency, and cost, without sacrificing the security model of the underlying L1. For the blockchain architect, the choice of L2 pattern determines the protocol's transaction throughput (from ~15 TPS on Ethereum L1 to 100,000+ TPS on validiums), finality latency, data availability model, and developer experience.

The four canonical L2 patterns—rollups (optimistic and zero-knowledge), state channels, plasma chains, and validiums—each make different trade-offs between security, latency, and data availability. Rollups have emerged as the dominant pattern, with optimistic rollups (Arbitrum, Optimism) and ZK-rollups (ZKSync, StarkNet, Scroll) processing the majority of L2 transactions. Understanding the architectural differences, fraud/validity proof mechanisms, and sequencing strategies is essential for any blockchain application engineer targeting modern scaling solutions.

## Core Architecture Concepts

### Rollup State Machine Architecture

A rollup is a layer-2 execution environment that batches transactions, executes them off-chain, and submits a succinct state commitment to L1. The L1 contract acts as the canonical bridge that enforces the rollup's state transition rules:

```
L1 Layer (Ethereum):
┌─────────────────────────────────────────────┐
│ Rollup Contract                             │
│ ├── stateRoot: bytes32                      │
│ ├── batchIndex: uint256                     │
│ ├── sequencer: address                      │
│ ├── validatorManager: address               │
│ └── pendingBatches: mapping                 │
├── Bridge Contract                          │
│ ├── tokenEscrow: mapping                   │
│ └── messageQueue: bytes[]                  │
└─────────────────────────────────────────────┘

L2 Layer (Rollup):
┌─────────────────────────────────────────────┐
│ Block Production (Sequencer)                │
│ ├── Receive transactions                    │
│ ├── Execute in EVM instance                 │
│ ├── Build state diff + compression          │
│ └── Submit batch to L1                      │
├── State Verification                        │
│ ├── Optimistic: Fraud proof window (7d)     │
│ ├── ZK: Validity proof (SNARK/STARK)        │
│ └── Challenge: Interactive verification     │
└─────────────────────────────────────────────┘
```

#### Optimistic Rollup Architecture

Optimistic rollups assume batches are valid unless challenged during a dispute window (typically 7 days). The core components:

- **Sequencer**: Receives L2 transactions, orders them, builds blocks, and submits compressed batches to L1. The sequencer has privileged status—it can reorder or censor transactions (centralization vector). Decentralized sequencer sets are an active research area.
- **Verifier**: Watches L1 for batch submissions, checks state root correctness locally. If the sequencer submits an invalid state root, the verifier submits a fraud proof within the challenge window.
- **Bridge**: Locks L1 assets and mints L2 representations. Withdrawals require the challenge window to pass before L1 assets are released.

```solidity
// Simplified optimistic rollup fraud proof mechanism
contract OptimisticRollup {
    bytes32 public stateRoot;
    uint256 public constant CHALLENGE_WINDOW = 7 days;
    
    struct Batch {
        bytes32 assertedRoot;
        uint256 timestamp;
        address submitter;
        bool challenged;
    }
    
    mapping(uint256 => Batch) public batches;
    
    function submitBatch(bytes calldata transactions, bytes32 newStateRoot) external {
        uint256 batchIndex = batchCount++;
        Batches[batchIndex] = Batch(newStateRoot, block.timestamp, msg.sender, false);
        // Store compressed transaction data on L1 (calldata)
        emit BatchSubmitted(block.number, transactions, newStateRoot);
    }
    
    function challengeState(uint256 batchIndex, bytes calldata fraudProof) external {
        require(block.timestamp < batches[batchIndex].timestamp + CHALLENGE_WINDOW);
        // Execute fraud proof: show an invalid state transition
        require(executeFraudProof(fraudProof) == false);
        Batches[batchIndex].challenged = true;
        // Reward challenger, slash sequencer bond
    }
}
```

#### Zero-Knowledge Rollup Architecture

ZK-rollups submit a validity proof (SNARK or STARK) alongside each batch, eliminating the challenge window:

- **Prover**: Computationally intensive off-chain process that generates a proof of correct execution for the entire batch. For EVM-equivalent ZK-rollups, proving time is the dominant bottleneck (hours per block for ZK-EVMs).
- **Verifier contract**: L1 contract that efficiently verifies the SNARK/STARK proof. Gas cost: ~300k-500k gas for Groth16 on BN254, less than the cost of running the L2 computation on L1.
- **Data availability**: For ZK-rollups, only the state commitment and proof need to be on L1. Transaction data can be stored off-chain (validium mode) or on L1 (rollup mode).

```typescript
// ZK-rollup batch submission flow
interface ZKBatch {
    stateDiff: bytes;          // Updated state entries (compressed)
    newStateRoot: bytes32;     // Merkle root of post-state
    oldStateRoot: bytes32;     // Merkle root of pre-state
    proof: bytes;              // SNARK/STARK validity proof
    publicInputs: bytes[];     // Public inputs for proof verification
}

async function submitZKBatch(batch: ZKBatch): Promise<void> {
    // 1. Verify the proof against the public inputs
    const isValid = await verifier.verify(batch.proof, batch.publicInputs);
    require(isValid, "Invalid ZK proof");
    
    // 2. Update the on-chain state root
    stateRoot = batch.newStateRoot;
    
    // 3. If full rollup, store transaction data as calldata
    // If validium, only store state commitment
}
```

### Data Availability Patterns

Data availability—ensuring that L2 transaction data is accessible for verification—is the defining architectural concern for L2 design:

**Rollup (on-chain data)**: All transaction data is posted to L1 as calldata or blobs (EIP-4844). Anyone can reconstruct L2 state from L1 data, ensuring permissionless verification. Gas cost: ~16 gas per byte of calldata, ~1 gas per byte of blob data.

**Validium (off-chain data)**: Transaction data is stored off-chain (DAC—Data Availability Committee, or EigenDA/Celestia). L1 only stores the state commitment. Cheaper but introduces data availability risk—if data is lost, users cannot prove ownership.

**Volition (hybrid)**: Users choose per-asset or per-transaction whether data goes on-chain or off-chain. ERC-20 transfers might use off-chain data, while high-value DeFi operations use on-chain data.

## Architecture Decision Trees

```
Decide: L2 Scaling Pattern
├── Need general-purpose smart contract execution?
│   ├── YES → Rollup
│   │   ├── Optimistic vs ZK?
│   │   │   ├── EVM compatibility required?
│   │   │   │   ├── YES → Optimism/Arbitrum (optimistic, EVM-equivalent)
│   │   │   │   │   └── OR Scroll/Linea (ZK, EVM-equivalent)
│   │   │   │   └── NO → ZKSync Era/StarkNet (ZK, custom VM)
│   │   │   ├── Low latency (<1 hour finality)?
│   │   │   │   ├── YES → ZK-rollup (math finality)
│   │   │   │   └── NO → Optimistic (7d challenge window)
│   │   │   └── Development speed vs. security?
│   │   │       ├── Fast prototyping → Optimism (OP Stack)
│   │   │       └── Maximum security → ZK (validity proofs)
│   │   └── Data availability model?
│   │       ├── Full security → Rollup (EIP-4844 blobs)
│   │       │   └── Cost: ~$0.01-0.10 per tx
│   │       ├── Low cost → Validium (EigenDA/Celestia)
│   │       │   └── Cost: ~$0.001-0.01 per tx
│   │       └── Hybrid → Volition (per-user choice)
│   └── NO → Specialized scaling
│       ├── Payment only → State channels (Lightning)
│       ├── Identity/attestation → Plasma chain
│       └── Gaming → Validium / App-chain
├── Need instant finality (< 1 second)?
│   ├── State channels (pre-funded bidirectional)
│   └── Payment channel networks (Lightning, Raiden)
└── Need sovereign (own consensus)?
    └── App-chain (Polygon Edge, Cosmos SDK, RollOps)
        ├── Own validator set
        ├── Custom gas token
        └── IBC/ICS compatibility
```

## Implementation Strategies

### Bridging and Message Passing

Cross-chain bridges for L2↔L1 communication are the most security-critical component:

```solidity
// L2 → L1 message passing (canonical bridge pattern)
contract L2Bridge {
    address public immutable L1_BRIDGE;       // L1 bridge address
    uint256 public nonce;
    
    function sendMessage(address target, bytes calldata data, uint256 gasLimit) external {
        bytes32 messageHash = keccak256(abi.encodePacked(
            block.chainid, L1_BRIDGE, msg.sender, target, data, nonce, gasLimit
        ));
        L2ToL1Message[] storage messages = pendingMessages;
        messages.push(L2ToL1Message(target, msg.sender, data, nonce, gasLimit));
        nonce++;
    }
    
    // Sequencer proves inclusion of message on L1
    function proveMessage(bytes calldata proof, uint256 index) external {
        require(MerkleProve.verify(
            keccak256(abi.encode(l2Messages[index])),
            stateRoot,
            proof
        ));
        L1_BRIDGE.functionCall(abi.encodeWithSelector(
            L1Bridge.executeMessage.selector, pendingMessages[index]
        ));
    }
}
```

### Forced Transaction Inclusion

To prevent sequencer censorship, users can force-include transactions via L1:

1. User submits transaction directly to the L1 rollup contract
2. The contract enqueues the transaction in a forced inclusion queue
3. The sequencer must include the transaction within a deadline (e.g., 24 hours)
4. If the sequencer fails to include it, the user can withdraw their funds directly from L1

This mechanism ensures that even a malicious sequencer cannot permanently censor users—they can always escape back to L1.

## Integration Patterns

### ERC-20 Token Bridging

Tokens moving between L1 and L2 use the canonical bridge pattern:

```solidity
// L1 Token Bridge
function depositToken(address l1Token, uint256 amount) external {
    IERC20(l1Token).transferFrom(msg.sender, address(this), amount);
    // Mint L2 representation via cross-chain message
    L2_BRIDGE.sendMessage(
        abi.encodeWithSelector(IL2TokenBridge.mint.selector, msg.sender, l1Token, amount)
    );
}

// L2 Token Withdrawal
function withdrawToken(address l2Token, uint256 amount) external {
    // Burn L2 tokens
    L2Token(l2Token).burn(msg.sender, amount);
    // Queue withdrawal message for L1
    sendMessage(L1_BRIDGE, abi.encodeWithSignature(
        "finalizeWithdrawal(address,address,uint256)", msg.sender, l1Token, amount
    ));
}
```

### Account Abstraction Integration

L2s natively support account abstraction better than L1 due to their customizability:

- **Paymasters**: Sponsoring user gas fees in ERC-20 tokens
- **Batch transactions**: Multiple operations in a single UserOperation
- **Signature schemes**: Support Ed25519, secp256r1, or even passkeys (WebAuthn)
- **Social recovery**: Guardian-based key recovery without L1 complexity

```typescript
// L2 account abstraction: batch transaction
const userOp = {
    sender: userAddress,
    nonce: await entryPoint.getNonce(userAddress),
    initCode: '0x',  // Already deployed
    callData: walletInterface.encodeFunctionData('executeBatch', [
        [tokenAddress, nftMarketplace],
        [approveData, purchaseData]
    ]),
    callGasLimit: 200000,
    verificationGasLimit: 100000,
    preVerificationGas: 50000,
    maxFeePerGas: ethers.parseUnits('0.1', 'gwei'),
    maxPriorityFeePerGas: ethers.parseUnits('0.01', 'gwei'),
    paymasterAndData: paymasterAddress,  // Sponsor pays fees
    signature: await signUserOp(userOp, entryPoint.address, chainId)
};
```

## Performance Optimization

### Batch Compression Techniques

The cost of L2 transactions is dominated by L1 data publication. Compression strategies:

- **State diff compression**: Only post state changes, not full transactions. Used by Arbitrum (its compression achieves 10-30x ratio).
- **Signature aggregation**: For ERC-20 transfers, aggregate many transfer signatures into a single BLS aggregate.
- **Transaction type-specific compression**: ERC-20 transfers have a compact 8-byte representation (nonce, amount, destination) instead of the full 100+ byte EVM transaction.
- **Dictionary compression**: Off-chain agreed dictionary replaces common byte sequences (addresses, function selectors) with short indices.

### Blob Data (EIP-4844) Integration

EIP-4844 introduces blob-carrying transactions that provide cheaper data availability:

```go
// Blob transaction for L2 data availability
type BlobTx struct {
    chainId    *uint256.Int
    nonce      uint64
    gasTipCap  *uint256.Int // Effective gas price for priority fee
    gasFeeCap  *uint256.Int // Effective gas price for base fee
    gas        uint64
    to         common.Address
    value      *uint256.Int
    data       []byte       // Regular calldata
    blobs      []kzg.Blob   // Maximum 6 blobs per transaction (pending)
    blobVersionedHashes []common.Hash
}
```

Each blob holds ~128 KB of data. L2s can batch transactions into blobs at ~1-2 gas per byte (vs ~16 gas for calldata), reducing data availability costs by 10-15x.

## Security Considerations

| Attack | Pattern | Mitigation |
|---|---|---|
| Sequencer censorship | All L2s | Forced transaction inclusion via L1 |
| Fraud proof timeout | Optimistic rollup | Sufficient challenge window (7 days) |
| Invalid bond attack | Optimistic rollup | Bond requirement proportional to value secured |
| Proof verification cost | ZK-rollups | Use Groth16 over BN254 (cheapest on EVM) |
| Data availability freeze | Validium | Data Availability Committee (DAC) with slashing |
| Bridge death by 1000 cuts | All bridged assets | Rate limits, tiered withdrawal (small=fast, large=slow) |
| Reorg after batch finality | L2 with fast finality | Additional confirmation blocks for high-value settlements |
| Prover monopoly | ZK-rollups | Multiple prover implementations, forced proving by users |

## Operational Excellence

### L2 Monitoring

- **Sequencer liveness**: Time since last batch submission, transaction queue depth
- **Challenge window**: Remaining time before optimistic batches become final
- **Data availability ratio**: Percentage of state accessible (for validiums)
- **Bridge TVL**: Total value locked in L1→L2 bridges
- **Proving time**: Time to generate ZK proof per batch (ZK-rollups)
- **Reorg depth**: Recent chain reorganizations on L2

### Disaster Recovery

- **Sequencer failure**: Fallback to L1-only mode, manual block production
- **Bridge hack**: Emergency pause on L1 bridge contract, coordinated social recovery
- **Fraud proof bug**: Increased challenge window, community monitoring, whitehat bounty
- **State divergence**: Hard fork coordination with L1 governance

## Common Pitfalls

### Weak L1 Finality Assumptions

Assuming L1 finality is instant leads to bridge exploits. Always wait for 2+ L1 epochs (64+ slots for Ethereum) before considering L2 batches final, even with ZK-rollups.

### Insufficient Challenge Window

A 1-day challenge window may seem sufficient, but coordinated attacks during holidays/weekends can exploit reduced monitoring. 7-day challenge window is the standard.

### Uncompressed Calldata

Posting raw transaction data without compression increases L1 fees by 10x+. Always implement state diff or transaction compression.

### Single Prover Dependency

ZK-rollups relying on a single prover implementation are vulnerable to implementation bugs. Multiple independent prover implementations (like Scroll's multi-prover) reduce this risk.

## Key Takeaways

- Rollups are the dominant L2 pattern: optimistic for EVM-compatibility, ZK for fast finality
- Data availability is the defining cost factor—EIP-4844 blobs reduce it 10-15x vs calldata
- Sequencer decentralization is the critical open problem for L2 design
- Forced transaction inclusion via L1 is the fundamental censorship resistance mechanism
- Bridge security is inversely related to novelty—use battle-tested canonical bridges
- Validium offers the lowest cost but introduces data availability risk
- State diff compression and signature aggregation are the highest-ROI optimization techniques
- Challenge windows must account for global monitoring coverage (weekends, holidays)
- ZK-proving time remains the bottleneck for ZK-rollup throughput—multi-prover and hardware acceleration mitigate this
- Account abstraction on L2 enables UX improvements impossible on L1
