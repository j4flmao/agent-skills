# MEV & Order Flow Patterns

## MEV Strategies

### Sandwich Attack

```
Before user tx:
  ── buy A tokens (pushes price up)
User tx:
  ── swap X → A (buys at inflated price)
After user tx:
  ── sell A tokens (profit = buy low, sell high)
```

### Liquidation

```solidity
// Aave-style liquidation
function liquidate(address user, address debtAsset, uint256 debtAmount, address collateralAsset) external {
    (bool healthFactor,) = pool.getUserAccountData(user);
    require(healthFactor < 1e18, "not liquidatable");

    pool.liquidate(debtAsset, user, debtAmount, collateralAsset);
    // Receive discounted collateral as reward
}
```

### MEV Protection Patterns

```solidity
// Commit-reveal: hide intent until inclusion
contract CommitReveal {
    struct Commitment {
        bytes32 commitment;
        uint256 block;
    }

    function commit(bytes32 commitment) external {
        commitments[msg.sender] = Commitment(commitment, block.number);
    }

    function reveal(bytes calldata data, bytes calldata salt) external {
        Commitment storage c = commitments[msg.sender];
        require(keccak256(abi.encodePacked(data, salt)) == c.commitment, "mismatch");
        require(block.number <= c.block + 10, "expired");
        // Execute revealed intent
    }
}
```

## Order Flow

### Private Mempool (Flashbots)

```go
// Flashbots bundle
type Bundle struct {
    Transactions []*Transaction  // ordered
    BlockNumber  uint64
    MinTimestamp uint64
    MaxTimestamp uint64
}

// Sent directly to miner/validator via relay
// Not visible in public mempool
```

### MEV-Share (MEV-Boost)

```
User tx ──> MEV-Share ──> Matchmaker ──> Searcher
             │                               │
         Reveal only                  Submit bundle with
         necessary parts              backrun opportunity
```

### Order Flow Auctions

| Type | Description | Example |
|------|-------------|---------|
| Public mempool | Broadcast to all, first-come | Standard |
| Private relay | Direct to validator/sequencer | Flashbots |
| Shutter | Encrypted until inclusion | Threshold network |
| CowSwap | Batch auction, coincident of wants | CoW Protocol |

## Proposer-Builder Separation (PBS)

```
Validators (proposers)
    │
    ▼
Relay (auction middleman)
    │
    ▼
Builders (construct blocks from mempool + bundles)
```

### MEV-Boost Flow

```go
// Builder creates block
block := BuildBlock(mempool, bundles)

// Builder submits to relay with bid
relay.SubmitBlock(block, bid)

// Relay validates and forwards best bid to proposer
proposer.SelectBlock(relay.GetHeader(blockNumber))

// Proposer signs and broadcasts, gets block + bid
```

## Anti-MEV Patterns

### Fair Sequencing

```solidity
contract FairExchange {
    // Commit-reveal prevents frontrunning
    mapping(address => bytes32) public pending;

    function submitOrder(bytes32 commitment) external {
        pending[msg.sender] = commitment;
    }

    function executeOrder(bytes memory data, bytes memory salt) external {
        // Verify commitment
        // Execute at fair price (TWAP, batch)
        // Prevent sandwich by using batch auction
    }
}
```

### Batch Auctions

```solidity
contract BatchAuction {
    Auction public currentAuction;

    struct Auction {
        uint256 clearingPrice;
        uint256 startTime;
        uint256 endTime;
        mapping(address => Order) orders;
    }

    function placeOrder(uint256 amount, uint256 limitPrice) external {
        require(block.timestamp < currentAuction.endTime, "auction over");
        currentAuction.orders[msg.sender] = Order(amount, limitPrice);
    }

    function settle() external {
        // All orders executed at clearing price
        // No individual order can be frontrun
    }
}
```

### COW Protocol (Coincident of Wants)

```
User A wants to sell ETH for USDC
User B wants to sell USDC for ETH
→ Settlement: A and B swap directly, no order book, no AMM
→ Zero slippage, no MEV
```
