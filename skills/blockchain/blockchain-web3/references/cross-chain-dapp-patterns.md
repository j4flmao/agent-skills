# Cross-Chain dApp Patterns

## Overview

Cross-chain dApps operate across multiple blockchain networks, managing contract state, user assets, and data flows between heterogeneous execution environments. Unlike single-chain dApps, cross-chain applications must handle finality divergence, chain-specific address formats, asynchronous message delivery, and complex error recovery. This reference covers multi-chain architecture patterns, unified account models, cross-chain state synchronization, token representation strategies, and frontend patterns for multi-chain user experiences.

## Core Architecture Concepts

### Cross-Chain dApp Topology

```
                    ┌──────────────────────────────────────┐
                    │           User Frontend               │
                    │    (Multi-chain wallet detection)      │
                    └──────────┬───────────┬───────────────┘
                               │           │
                ┌──────────────┴────┐ ┌────┴──────────────┐
                │    Chain A        │ │     Chain B        │
                │  (e.g. Mainnet)   │ │  (e.g. Arbitrum)   │
                │                   │ │                    │
                │  ┌─────────────┐  │ │  ┌──────────────┐ │
                │  │ App Contract│  │ │  │ App Contract │ │
                │  │ on Mainnet  │  │ │  │ on Arbitrum  │ │
                │  └──────┬──────┘  │ │  └──────┬───────┘ │
                └─────────┼─────────┘ └─────────┼──────────┘
                          │                     │
                          └──────────┬──────────┘
                                     │
                         ┌───────────┴───────────┐
                         │    Cross-Chain Msg     │
                         │  (IBC / LayerZero /   │
                         │   Wormhole / CCIP)    │
                         └───────────────────────┘
```

### Chain Abstraction Models

| Model | Description | Complexity | User Experience |
|---|---|---|---|
| **Multi-chain deployment** | Same contract deployed on N chains, user switches networks | Low | Poor (user manages chains) |
| **Cross-chain composition** | Contracts on different chains communicate via bridge/ messaging | High | Good (one chain abstraction) |
| **Unified account (XCM / IBC)** | Single account controls assets across chains | Very High | Best (chain-agnostic UX) |
| **ERC-4337 + multi-chain bundler** | Smart account with cross-chain execution | High | Excellent (one signature, multi-chain) |

### Finality Divergence Handling

| Chain | Finality Type | Confirmations for Safety | Typical Wait |
|---|---|---|---|
| Ethereum (L1) | Probabilistic (~12.5% per epoch) | 12 blocks (~2 min) for bridge safety | 2-15 min |
| Polygon PoS | Probabilistic (checkpoint-based) | 128 blocks (~2 min) | 2-5 min |
| Arbitrum | Rollup (L1 finality dependent) | L1 confirmation + dispute window | ~15 min |
| Optimism | Rollup (L1 finality dependent) | L1 confirmation + fault proof window | ~7 days |
| Solana | Provable (PoH) | ~32 blocks (~2 sec) | Instant |
| Cosmos (IBC) | Instant (Tendermint) | 1 block (~3 sec) | Instant |
| Avalanche | Probabilistic (Snowman) | ~20 blocks (~4 sec) | 2-5 sec |

### Cross-Chain Token Representation

| Pattern | Example | Pros | Cons |
|---|---|---|---|
| Lock + Mint (canonical) | USDC.e on Arbitrum (bridged) | Simple, standard | Liquidity fragmentation |
| Burn + Mint (native) | USDC on Arbitrum (native USDC) | Unified liquidity | Requires CCTP / native integration |
| Liquidity Network | Synapse, Stargate | Capital efficient, fast | LP risk, slippage |
| Wrapped Token | wETH on Optimism | Universal | Additional wrapping step |
| Interchain Token (ICS-721) | Cosmos IBC tokens | Native IBC integration | Cosmos-only |

## Architecture Decision Trees

### Cross-Chain dApp Type Selection

```
Building a multi-chain dApp?
├── Single contract deployed on multiple chains?
│   ├── Same logic per chain → Multi-chain deployment (same address via CREATE2)
│   ├── Different logic per chain → Chain-specific contracts + adapter layer
│   └── Shared state needed? → Cross-chain messaging for state sync
├── Multi-chain state management?
│   ├── Master/slave (one chain is source of truth) → Hub-and-spoke pattern
│   ├── Peer/peer (all chains equal) → Gossip-based sync or optimistic sync
│   └── Shared global state → L3 / shared sequencer / ZK coprocessor
└── Cross-chain asset management?
    ├── User moves assets → Bridge or liquidity network integration
    ├── dApp manages assets across chains → Multichain treasuries + rebalancing
    └── One asset usable everywhere → Interchain token standard / CCTP
```

### Message Delivery Guarantee Decision Tree

```
Cross-chain message delivery requirement?
├── Exactly-once delivery → IBC (Cosmos), LayerZero (with retries)
│   ├── Source chain has instant finality → IBC (proven, secure)
│   └── Source chain has probabilistic finality → Wait for finality + optimistic verification
├── At-least-once delivery (idempotent handlers) → LayerZero, CCIP
│   ├── Can tolerate duplicates? → Idempotent handler design
│   └── Cannot tolerate duplicates? → Dedup at destination (tx hash tracking)
└── At-most-once delivery → Custom relayer with timeout
    ├── Message TTL needed? → Expiry-based message handling
    └── No expiry? → Permanent message queue with manual replay
```

## Implementation Strategies

### Multi-Chain Provider Pattern

```typescript
// Multi-chain provider manager
import { createPublicClient, createWalletClient, http } from 'viem'
import { mainnet, optimism, arbitrum, polygon } from 'viem/chains'

interface ChainConfig {
  chain: typeof mainnet
  rpcUrl: string
  explorerUrl: string
  bridgeAddress: Address
  cctpAddress?: Address
  confirmations: number
}

const chainConfigs: Record<number, ChainConfig> = {
  [mainnet.id]: {
    chain: mainnet,
    rpcUrl: process.env.ETH_RPC_URL!,
    explorerUrl: 'https://etherscan.io',
    bridgeAddress: '0x...',
    confirmations: 12
  },
  [optimism.id]: {
    chain: optimism,
    rpcUrl: process.env.OPT_RPC_URL!,
    explorerUrl: 'https://optimistic.etherscan.io',
    bridgeAddress: '0x...',
    confirmations: 1  // OP has instant finality for L2->L2
  }
}

class MultiChainProvider {
  private clients: Map<number, ReturnType<typeof createPublicClient>> = new Map()

  getClient(chainId: number) {
    if (!this.clients.has(chainId)) {
      const config = chainConfigs[chainId]
      if (!config) throw new Error(`Unsupported chain: ${chainId}`)

      this.clients.set(chainId, createPublicClient({
        chain: config.chain,
        transport: http(config.rpcUrl)
      }))
    }
    return this.clients.get(chainId)!
  }

  async waitForCrossChainMessage(
    sourceChainId: number,
    destChainId: number,
    txHash: Hash,
    timeoutMs: number = 300000 // 5 minutes
  ): Promise<{ delivered: boolean; destTxHash?: Hash }> {
    // 1. Wait for source chain confirmation
    const sourceClient = this.getClient(sourceChainId)
    const receipt = await sourceClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: chainConfigs[sourceChainId].confirmations
    })

    // 2. Derive expected destination tx hash from event logs
    const messageEvent = parseLogs(receipt.logs,
      abiItem('MessageDispatched'))
    const destTxHash = computeDestinationTxHash(
      sourceChainId, destChainId, messageEvent.args.messageId
    )

    // 3. Wait for destination chain delivery
    const destClient = this.getClient(destChainId)
    const timeout = Date.now() + timeoutMs
    while (Date.now() < timeout) {
      try {
        const destReceipt = await destClient.getTransactionReceipt({
          hash: destTxHash
        })
        return { delivered: true, destTxHash }
      } catch {
        await sleep(2000) // Poll every 2 seconds
      }
    }

    return { delivered: false }
  }
}
```

### Hub-and-Spoke Architecture

```typescript
// Hub-and-spoke cross-chain contract pattern
// Hub chain (e.g., Ethereum mainnet) stores canonical state
// Spoke chains (L2s) read/write state via cross-chain messaging

// Hub contract (Solidity)
contract CrossChainHub {
    mapping(uint256 => address) public spokeContracts;
    mapping(bytes32 => uint256) public globalState;

    event StateUpdate(bytes32 indexed key, uint256 value, uint256 indexed spokeChainId);

    // Called by spoke chain via cross-chain message
    function updateState(bytes32 key, uint256 value, uint256 spokeChainId) external {
        require(msg.sender == spokeContracts[spokeChainId], "Unauthorized spoke");
        globalState[key] = value;
        emit StateUpdate(key, value, spokeChainId);
    }

    // Called by spoke to read state
    function readGlobalState(bytes32 key) external view returns (uint256) {
        return globalState[key];
    }
}

// Spoke contract on L2
contract CrossChainSpoke {
    address public hubContract;
    address public bridgeEndpoint;
    uint256 public hubChainId;

    // Write to hub via cross-chain message
    function sendStateToHub(bytes32 key, uint256 value) external payable {
        bytes memory message = abi.encodeWithSelector(
            CrossChainHub.updateState.selector, key, value, block.chainid
        );

        // Send via bridge (LayerZero example)
        ILayerZeroEndpoint(bridgeEndpoint).send{value: msg.value}(
            hubChainId,
            abi.encodePacked(hubContract),
            message,
            address(this),
            bytes(""),
            ILayerZeroEndpoint.lzSendParam({
                dstGasLimit: 200000,
                dstNativeAmount: 0,
                dstNativeAddr: abi.encodePacked(hubContract)
            })
        );
    }
}
```

### Cross-Chain Account Pattern (ERC-4337 Multi-Chain)

```typescript
// Multi-chain smart account with cross-chain execution
// User signs once, bundlers execute on multiple chains

interface CrossChainUserOperation {
  operations: Array<{
    chainId: number
    to: Address
    value: bigint
    data: Hex
  }>
  // Single signature covers all operations
  signature: Hex
}

// Frontend: prepare multi-chain operation
async function prepareCrossChainUserOp(
  operations: CrossChainOperation[],
  account: SmartAccount
): Promise<CrossChainUserOperation> {
  // 1. Build user operations for each chain
  const userOps = await Promise.all(
    operations.map(op => buildUserOperation(account, op, chainId))
  )

  // 2. Aggregate into a single signed payload
  const digest = keccak256(
    encodeAbiParameters(
      [{ type: 'bytes32[]', name: 'userOpHashes' }],
      [userOps.map(uo => uo.hash)]
    )
  )
  const signature = await account.sign(digest)

  return {
    operations: operations.map((op, i) => ({
      ...op,
      // Include per-chain userOp hash in signature
      signature: concat([signature, userOps[i].hash])
    })),
    signature
  }
}
```

## Integration Patterns

### Chain-Agnostic Wallet Connection

```typescript
// Detect and connect to wallet across any supported chain
async function connectMultiChain(): Promise<{
  address: Address
  chainId: number
  supportedChains: number[]
}> {
  // EIP-6963 multi-injected provider discovery
  const provider = await requestProvider()

  // Detect all chains the wallet supports
  const chainId = Number(await provider.request({
    method: 'eth_chainId'
  }))

  // Switch chain if needed
  async function switchChain(targetChainId: number) {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }]
      })
    } catch (switchError: any) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        const chainConfig = getChainConfig(targetChainId)
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${targetChainId.toString(16)}`,
            chainName: chainConfig.name,
            nativeCurrency: chainConfig.nativeCurrency,
            rpcUrls: chainConfig.rpcUrls,
            blockExplorerUrls: [chainConfig.explorerUrl]
          }]
        })
      }
    }
  }

  return { address, chainId, supportedChains: Object.keys(chainConfigs).map(Number) }
}
```

### Cross-Chain State Synchronization

```typescript
// Frontend: reactively synchronize state across chains
function useCrossChainState(
  key: string,
  chains: number[]
): { state: Record<number, any>; isSyncing: boolean } {
  const [states, setStates] = useState<Record<number, any>>({})
  const [isSyncing, setIsSyncing] = useState(true)

  useEffect(() => {
    const loadStates = async () => {
      setIsSyncing(true)
      const results = await Promise.allSettled(
        chains.map(async (chainId) => {
          const client = multiChainProvider.getClient(chainId)
          const value = await client.readContract({
            address: contractAddresses[chainId],
            abi: contractAbi,
            functionName: 'getState',
            args: [key]
          })
          return { chainId, value }
        })
      )

      const newStates: Record<number, any> = {}
      for (const result of results) {
        if (result.status === 'fulfilled') {
          newStates[result.value.chainId] = result.value.value
        }
      }
      setStates(newStates)
      setIsSyncing(false)
    }

    loadStates()
    const interval = setInterval(loadStates, 15_000) // Poll every 15s
    return () => clearInterval(interval)
  }, [key, chains])

  return { state: states, isSyncing }
}
```

## Performance Optimization

### Cross-Chain Read Caching

```typescript
// Cache cross-chain reads with awareness of finality lag
class CrossChainCache {
  private cache = new Map<string, {
    value: any
    blockNumber: bigint
    timestamp: number
  }>()

  async readWithCache(
    chainId: number,
    contract: Address,
    functionName: string,
    args: any[],
    ttlMs: number = 60_000
  ): Promise<any> {
    const key = `${chainId}:${contract}:${functionName}:${JSON.stringify(args)}`
    const cached = this.cache.get(key)

    if (cached && Date.now() - cached.timestamp < ttlMs) {
      return cached.value
    }

    const client = multiChainProvider.getClient(chainId)
    const blockNumber = await client.getBlockNumber()
    const value = await client.readContract({ address: contract, abi, functionName, args })

    this.cache.set(key, { value, blockNumber, timestamp: Date.now() })
    return value
  }

  // Invalidate cache for chains that may have reorged
  async checkReorg(chainId: number): Promise<void> {
    const client = multiChainProvider.getClient(chainId)
    const currentBlock = await client.getBlockNumber()

    for (const [key, entry] of this.cache) {
      if (key.startsWith(`${chainId}:`)) {
        // If the chain reorged deeper than our cached block, invalidate
        const finalizedBlock = currentBlock - BigInt(chainConfigs[chainId].confirmations)
        if (entry.blockNumber > finalizedBlock) {
          this.cache.delete(key)
        }
      }
    }
  }
}
```

### Lazy Chain Connection

```typescript
// Only connect to chains when needed — eager connection slows UX
class LazyChainConnector {
  private connections = new Map<number, Promise<{ client: any }>>()
  private connectionTimestamps = new Map<number, number>()
  private readonly maxConnections = 5
  private readonly connectionTtlMs = 300_000 // 5 min

  async getChain(chainId: number) {
    // Eagerly disconnect least recently used if over limit
    if (this.connections.size >= this.maxConnections) {
      const lru = [...this.connectionTimestamps.entries()]
        .sort(([, a], [, b]) => a - b)[0]
      this.connections.delete(lru[0])
      this.connectionTimestamps.delete(lru[0])
    }

    if (!this.connections.has(chainId)) {
      this.connections.set(chainId, this.connect(chainId))
    }

    this.connectionTimestamps.set(chainId, Date.now())
    return this.connections.get(chainId)!
  }

  private async connect(chainId: number) {
    const config = chainConfigs[chainId]
    if (!config) throw new Error(`Unsupported chain: ${chainId}`)
    // Establish connection
    return { client: createPublicClient({ chain: config.chain, transport: http(config.rpcUrl) }) }
  }
}
```

## Security Considerations

- **Cross-chain replay attacks**: A transaction signed for one chain can be replayed on another if the chain ID is not included in the signature domain separator. Always use EIP-712 with chain ID as part of the domain separator.
- **Finality race conditions**: Acting on a transaction before sufficient confirmations can lead to state inconsistency if a reorg occurs. Always wait for chain-specific finality before emitting cross-chain messages.
- **Bridge dependency risk**: Relying on a single cross-chain messaging protocol creates a single point of failure. Consider using multiple bridge providers for critical operations.
- **Token double-spend**: Without proper accounting, a user could bridge the same tokens to multiple chains simultaneously. Implement locking + confirmation pattern for cross-chain transfers.
- **Oracle manipulation on destination chain**: Cross-chain price oracles may report stale prices. Always validate oracle data against local chain state when possible.

## Operational Excellence

### Cross-Chain Monitoring

```typescript
// Monitor cross-chain message delivery
interface CrossChainMetrics {
  totalMessagesSent: number
  totalMessagesDelivered: number
  deliveryRate: number  // delivered / sent
  averageDeliveryTimeMs: number
  failedMessages: Array<{
    sourceChainId: number
    destChainId: number
    messageId: string
    failureReason: string
    timestamp: number
  }>
}

async function getCrossChainMetrics(): Promise<CrossChainMetrics> {
  // Query all bridge contracts for events
  const sentEvents = await queryEvents(sentTopic)
  const deliveredEvents = await queryEvents(deliveredTopic)

  return {
    totalMessagesSent: sentEvents.length,
    totalMessagesDelivered: deliveredEvents.length,
    deliveryRate: deliveredEvents.length / sentEvents.length,
    averageDeliveryTimeMs: computeAvgDeliveryTime(sentEvents, deliveredEvents),
    failedMessages: await getFailedMessages(sentEvents, deliveredEvents)
  }
}
```

## Testing Strategy

### Cross-Chain Integration Tests

```typescript
describe('Cross-chain dApp', () => {
  it('should update state on hub via spoke chain message', async () => {
    // Deploy contracts on both chains
    const hub = await deployHub(hubAnvil)
    const spoke = await deploySpoke(spokeAnvil, hub.address)

    // Simulate cross-chain message
    const tx = await spoke.write.sendStateToHub([key, value])
    await simulateCrossChainMessage(hubAnvil, spokeAnvil, tx)

    // Verify hub state updated
    const state = await hub.read.readGlobalState([key])
    expect(state).toBe(value)
  })

  it('should handle reorg gracefully with stale cache invalidation', async () => {
    const cache = new CrossChainCache()

    // Read state
    const value1 = await cache.readWithCache(chainId, contract, 'getValue', [])
    expect(value1).toBeDefined()

    // Simulate reorg
    await simulateReorg(chainId, 5) // 5 block reorg

    // Cache should be invalidated for non-finalized blocks
    await cache.checkReorg(chainId)

    // Cache should be empty
    // ... assert cache invalidation
  })
})
```

## Common Pitfalls

| Pitfall | Consequence | Prevention |
|---|---|---|
| Not signing chain ID in meta-tx | Replay attack across chains | Always include chainId in EIP-712 domain |
| Assuming same address on all chains | Contract not found on destination | Use CREATE2 for deterministic deploy |
| Ignoring finality differences | State inconsistency after reorg | Wait for chain-specific confirmation count |
| Single bridge provider dependency | Downtime when bridge is congested | Implement multi-bridge fallback |
| Polling all chains aggressively | Excessive RPC costs, rate limiting | Use event-driven updates, cache aggressively |
| No handling of partial delivery | Some chains updated, others not | Implement idempotent retry with timeout |
| Token decimal mismatch across chains | Displayed value off by factor of 10 | Normalize to 18 decimals in frontend |
| Not accounting for L1->L2 delay | User sees stale L1 state on L2 | Show confirmation status indicator |

## Key Takeaways

1. **Chain abstraction is the end goal** — users should not need to understand which chain they are on. Design your dApp to abstract chain selection.
2. **Finality is the hardest cross-chain problem** — probabilistic finality (Ethereum) requires waiting; instant finality (Cosmos, Solana) enables faster cross-chain flows.
3. **Prefer CREATE2 for deterministic deployment** across chains — same address on every chain simplifies frontend logic and cross-chain referrals.
4. **ERC-4337 smart accounts** are the best foundation for cross-chain UX — one signature authorizes operations on multiple chains.
5. **Cache reads aggressively, invalidate on finality** — cross-chain reads are expensive and slow; caching with finality-aware invalidation is essential for good UX.
6. **Multi-bridge architecture improves reliability** — implement fallback bridge providers for critical cross-chain operations.
7. **Monitor message delivery rate as a core KPI** — undelivered messages are silent failures that compound over time.
8. **Every cross-chain interaction should be idempotent** — messages may be delivered more than once or retried after timeout.