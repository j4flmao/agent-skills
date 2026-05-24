# Oracle & Bridge Patterns

## Oracle Patterns

### Pull Oracle (Chainlink)

```solidity
// Consumer contract requests data, oracle fulfills later
contract PriceConsumer {
    AggregatorV3Interface internal priceFeed;

    constructor() {
        // ETH/USD on mainnet
        priceFeed = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
    }

    function getLatestPrice() public view returns (int256) {
        // Multi-sig oracles provide signed price data
        // Decentralized aggregation via median
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return price;
    }
}
```

### Push Oracle (Pyth Network)

```solidity
// Data pushed on-chain by oracle, consumed immediately
contract PythConsumer {
    IPyth pyth = IPyth(0x...);

    function updateAndConsume(bytes[] calldata priceUpdates) external payable {
        // Pay fee to update price
        uint fee = pyth.getUpdateFee(priceUpdates);
        pyth.updatePriceFeeds{value: fee}(priceUpdates);

        // Read updated price
        PythPrice memory price = pyth.getPrice(priceFeedId);
        require(price.price > 0 && price.conf < maxConf, "stale price");
    }
}
```

### Oracle Security

```
Single oracle ──> centralization risk (admin key controls price)
Multi-oracle  ──> median of N sources (Chainlink)
TWAP oracle   ──> time-weighted average price (Uniswap V2/V3)
ZK oracle     ──> zero-knowledge proofs of off-chain data
```

```solidity
// TWAP Oracle (Uniswap V2)
contract TWAP {
    function consult(address token, uint256 amountIn) external view returns (uint256) {
        uint32[] memory secondsAgos = [60, 0]; // 60 second window
        int56[] memory tickCumulatives = pool.observe(secondsAgos);
        int56 tickDelta = tickCumulatives[1] - tickCumulatives[0];
        int24 avgTick = int24(tickDelta / 60);
        return UniV3Math.getQuoteAtTick(avgTick, amountIn, token, otherToken);
    }
}
```

## Bridge Patterns

### Lock-Mint (Native → Wrapped)

```
Chain A                          Chain B
─────────                        ─────────
User locks ETH                   User receives wETH
    │                                ▲
    ▼                                │
Bridge contract                 Bridge contract
    │           ┌──────────┐          │
    └──────────>│ Validator │──────────┘
                │ Network   │
                │ (3/5 sig) │
                └──────────┘
```

### Burn-Mint (Wrapped → Native)

```
Chain B                          Chain A
─────────                        ─────────
User burns wETH                  User receives ETH
    │                                ▲
    ▼                                │
Bridge contract                 Bridge contract
    │           ┌──────────┐          │
    └──────────>│ Validator │──────────┘
                │ Network   │
                └──────────┘
```

### Atomic Swap (HTLC)

```solidity
contract HashedTimelockContract {
    mapping(bytes32 => HTLC) private contracts;

    struct HTLC {
        address sender;
        address receiver;
        uint256 amount;
        bytes32 hashLock;
        uint256 timelock;
        bool withdrawn;
        bool refunded;
    }

    function newContract(address receiver, bytes32 hashLock, uint256 timelock) external payable {
        contracts[hashLock] = HTLC(msg.sender, receiver, msg.value, hashLock, timelock, false, false);
    }

    function withdraw(bytes32 preimage) external {
        HTLC storage c = contracts[keccak256(abi.encode(preimage))];
        require(c.receiver == msg.sender, "not receiver");
        require(block.timestamp < c.timelock, "expired");
        c.withdrawn = true;
        payable(msg.sender).transfer(c.amount);
    }
}
```

### Optimistic Bridge (Nomad, Across)

```solidity
contract OptimisticBridge {
    uint256 public constant DISPUTE_PERIOD = 7 days;
    mapping(bytes32 => RootProposal) public proposals;

    struct RootProposal {
        bytes32 stateRoot;
        uint256 proposedAt;
        bool disputed;
    }

    function proposeRoot(bytes32 stateRoot) external onlyRelayer {
        proposals[keccak256(abi.encode(stateRoot))] = RootProposal(stateRoot, block.timestamp, false);
    }

    function disputeRoot(bytes32 stateRoot, bytes calldata fraudProof) external {
        // Challenge the proposed root with fraud proof
        require(verifyFraudProof(fraudProof), "invalid proof");
        proposals[stateRoot].disputed = true;
    }

    function execute(bytes32 stateRoot, bytes calldata txData) external {
        RootProposal storage proposal = proposals[stateRoot];
        require(!proposal.disputed, "disputed");
        require(block.timestamp > proposal.proposedAt + DISPUTE_PERIOD, "still in dispute window");
        // Execute cross-chain message
        (address target, bytes memory data) = abi.decode(txData, (address, bytes));
        (bool success,) = target.call(data);
        require(success, "execution failed");
    }
}
```

### ZK Bridge (zkSync, Polygon zkEVM)

```
Validity proof (ZK-SNARK) sent to L1
Proof verified in milliseconds on chain
No dispute period needed
Instant finality for batched L2→L1 transactions
```

### Canonical vs Wrapped

| Type | Description | Trust Model | Example |
|------|-------------|-------------|---------|
| Canonical | Official bridge from L1 team | L1 validators | Arbitrum Bridge |
| Wrapped (3rd party) | External bridge | Bridge validators | WBTC, portal |
| Liquidity network | Stableswap pools | Liquidity providers | Stargate, Hop |
| Atomic swap | Hash timelock contracts | Counterparty | Thorchain |

## Layer 2 Patterns

### Rollup Architecture

```
L1 (Ethereum)
├── Rollup contract (bridge + proof verification)
│
L2 (Rollup)
├── Sequencer (order + batch transactions)
├── Prover (generate validity/fraud proofs)
└── Users (submit tx, withdraw via bridge)
```

### Optimistic Rollup (Arbitrum, Optimism)

```solidity
// Fraud proof window: 7 days
// Anyone can challenge a batch during this window
function challengeOutput(uint256 batchIndex, bytes calldata preState, bytes calldata txData) external {
    // Executes transaction in L1 EVM
    // If result doesn't match claimed state → batch invalidated
    bytes memory postState = executeInL1(preState, txData);
    require(postState != claimedPostState, "fraud proven");
}
```

### ZK Rollup (zkSync, StarkNet)

```solidity
// Validity proof submitted on-chain
// No challenge period — instant finality
function verifyBatch(bytes calldata proof, bytes calldata publicInputs) external {
    require(verifier.verify(proof, publicInputs), "invalid proof");
    // Apply state transition
    stateRoot = publicInputs.newStateRoot;
}
```

### State Channel

```solidity
contract SimplePaymentChannel {
    address public sender;
    address public receiver;
    uint256 public closingTime;

    function close(uint256 amount, bytes memory signature) external {
        require(msg.sender == receiver, "only receiver");
        // Verify signed state from sender
        bytes32 message = keccak256(abi.encodePacked(amount));
        require(recoverSigner(message, signature) == sender, "invalid sig");
        // Finalize on-chain state
        payable(receiver).transfer(amount);
        payable(sender).transfer(address(this).balance - amount);
    }
}
```
