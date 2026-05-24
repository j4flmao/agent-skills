# Providers & RPC

## RPC Node Providers

| Provider | Free Tier | Chains | Features |
|----------|-----------|--------|----------|
| Infura | 100K req/day | ETH, L2s, IPFS | Archive data, WebSockets |
| Alchemy | 300M req/month | ETH, L2s, Polygon | Enhanced APIs, webhooks |
| QuickNode | 25 req/sec | 15+ chains | Dedicated nodes, add-ons |
| Ankr | 10 req/sec | 40+ chains | Public & premium |
| PublicNode | Unlimited | ETH, L2s | Rate-limited, free |
| Chainstack | 3M req/month | ETH, L2s | Enterprise SLAs |
| Drpc | Varies | 30+ chains | Multi-failover, no keys needed |

### Multi-RPC Fallback

```typescript
import { fallback, http, createPublicClient } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
    chain: mainnet,
    transport: fallback([
        http('https://eth-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_KEY),
        http('https://mainnet.infura.io/v3/' + process.env.INFURA_KEY),
        http('https://rpc.ankr.com/eth'),
        http('https://ethereum.publicnode.com'),
    ], {
        rank: true,            // track response times
        retryCount: 3,
        retryDelay: 500,
    }),
})
```

## JSON-RPC Methods

### Standard Methods

```typescript
// Block
const block = await client.request({
    method: 'eth_getBlockByNumber',
    params: ['0x' + blockNumber.toString(16), true], // true = full tx objects
})

// Transaction
const tx = await client.request({
    method: 'eth_getTransactionByHash',
    params: ['0x...'],
})

// Logs
const logs = await client.request({
    method: 'eth_getLogs',
    params: [{
        address: '0x...',
        fromBlock: '0x0',
        toBlock: 'latest',
        topics: [/* topic hashes */],
    }],
})
```

### Alchemy Enhanced APIs

```typescript
// Token balances (batch)
const balances = await alchemyClient.request({
    method: 'alchemy_getTokenBalances',
    params: ['0x...', ['0xTokenA', '0xTokenB']],
})

// Asset transfers
const transfers = await alchemyClient.request({
    method: 'alchemy_getAssetTransfers',
    params: [{
        fromBlock: '0x0',
        toBlock: 'latest',
        fromAddress: '0x...',
        category: ['erc20', 'erc721', 'external'],
    }],
})
```

## WebSocket Connections

```typescript
import { webSocket, createPublicClient } from 'viem'
import { mainnet } from 'viem/chains'

const wsClient = createPublicClient({
    chain: mainnet,
    transport: webSocket('wss://eth-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_KEY),
})

// Subscribe to pending transactions
const unsubscribe = wsClient.watchPendingTransactions({
    onTransactions: (hashes) => {
        console.log('Pending:', hashes)
    },
})

// Subscribe to logs
wsClient.watchContractEvent({
    address: '0x...',
    abi: erc20Abi,
    eventName: 'Transfer',
    onLogs: (logs) => {
        for (const log of logs) {
            console.log(`Transfer: ${log.args.from} → ${log.args.to}`)
        }
    },
})

// Reconnection strategy
class WebSocketManager {
    private ws: WebSocket | null = null
    private reconnectAttempts = 0
    private maxAttempts = 5

    connect(url: string) {
        this.ws = new WebSocket(url)
        this.ws.onclose = () => this.reconnect(url)
    }

    private reconnect(url: string) {
        if (this.reconnectAttempts >= this.maxAttempts) return
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000)
        setTimeout(() => {
            this.reconnectAttempts++
            this.connect(url)
        }, delay)
    }
}
```

## Local Dev Node

```bash
# Anvil (Foundry)
anvil --fork-url $MAINNET_RPC --fork-block-number 18000000

# Hardhat node
npx hardhat node --fork $MAINNET_RPC

# Ganache (legacy)
npx ganache --fork.url $MAINNET_RPC

# For local tx simulation
anvil --block-time 1  # 1-second block for real-time feels
```

## Gas Estimation

```typescript
async function estimateGasWithBuffer(
    client: PublicClient,
    tx: { to: `0x${string}`; data: `0x${string}`; value?: bigint }
): Promise<{ gas: bigint; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }> {
    // Base fee from latest block
    const block = await client.getBlock()
    const baseFee = block.baseFeePerGas!

    // Priority fee (use 75th percentile)
    const feeHistory = await client.getFeeHistory({
        blockCount: 4,
        rewardPercentiles: [75],
    })
    const priorityFee = feeHistory.reward[feeHistory.reward.length - 1][0]

    // Min priority fee
    const maxPriorityFeePerGas = priorityFee > 1n ? priorityFee : 1n
    const maxFeePerGas = baseFee * 2n + maxPriorityFeePerGas

    // Gas limit with 20% buffer
    const estimatedGas = await client.estimateGas(tx)
    const gas = (estimatedGas * 120n) / 100n

    return { gas, maxFeePerGas, maxPriorityFeePerGas }
}
```

## EIP-1559 Fee Market

```
Pre-London: gasPrice (single value)
Post-London: maxFeePerGas + maxPriorityFeePerGas
    maxFeePerGas = baseFee * 2 + tip
    maxPriorityFeePerGas = tip (to miner)

baseFee is burned. tip goes to miner.
baseFee adjusts per block (up to ±12.5%).
```

## Rate Limiting & Backoff

```typescript
async function rateLimitedRpc<T>(
    client: PublicClient,
    fn: () => Promise<T>,
    maxRetries = 3
): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn()
        } catch (error: any) {
            if (error.code === 429 || error.code === -32005) {
                const wait = Math.min(1000 * 2 ** i, 10000)
                await new Promise(r => setTimeout(r, wait))
                continue
            }
            throw error
        }
    }
    throw new Error('Max retries exceeded')
}
```

## Debug & Trace RPCs

```typescript
// Requires archive node with --http.api eth,debug,trace (Geth) or --tracing (OpenEthereum)

// Call trace
const trace = await gethClient.request({
    method: 'debug_traceCall',
    params: [{ to: '0x...', data: '0x...' }, 'latest', { tracer: 'callTracer' }],
})

// Transaction trace
const txTrace = await gethClient.request({
    method: 'debug_traceTransaction',
    params: ['0x...', { tracer: 'prestateTracer' }],
})
```
