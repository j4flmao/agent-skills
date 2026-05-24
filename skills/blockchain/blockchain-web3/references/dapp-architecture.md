# dApp Architecture

## Architecture Layers

```
┌─────────────────────────────┐
│     Frontend (UI/UX)         │  Next.js, React, Vue
├─────────────────────────────┤
│     Web3 Layer (SDK)         │  wagmi, viem, ethers.js
├─────────────────────────────┤
│     Contract Abstraction     │  TypeChain, ABIs
├─────────────────────────────┤
│     Smart Contracts          │  Solidity, Vyper, Rust
├─────────────────────────────┤
│     RPC / Node Layer         │  Infura, Alchemy, QuickNode
├─────────────────────────────┤
│     Blockchain Network       │  Ethereum, L2s, Alt L1s
└─────────────────────────────┘
```

## Directory Structure

```
src/
├── app/                  # Next.js app router
│   ├── page.tsx
│   ├── layout.tsx
│   └── providers.tsx     # Wagmi config provider
├── components/
│   ├── ui/               # Shared UI (Button, Card, etc.)
│   ├── web3/             # Web3-specific components
│   │   ├── ConnectButton.tsx
│   │   ├── TokenBalance.tsx
│   │   ├── TransactionStatus.tsx
│   │   └── NetworkSwitcher.tsx
│   └── layout/
├── hooks/
│   ├── useTokenBalance.ts
│   ├── useAllowance.ts
│   ├── useSwap.ts
│   └── useTransaction.ts
├── lib/
│   ├── wagmi.ts          # Wagmi config
│   ├── contracts.ts      # Contract addresses & ABIs
│   └── utils.ts          # Formatting, parsing
├── abi/                  # ABI JSON files
│   ├── ERC20.json
│   └── MyProtocol.json
└── types/
    └── contracts.ts      # TypeChain generated types
```

## State Management

### Read State (Client-side)

```typescript
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
})

// Cache-aware reads
async function getCachedBalance(address: `0x${string}`): Promise<bigint> {
    const cacheKey = `balance:${address}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) return BigInt(cached)

    const balance = await publicClient.getBalance({ address })
    sessionStorage.setItem(cacheKey, balance.toString())
    return balance
}
```

### Write State (Transaction lifecycle)

```typescript
type TransactionState = {
    status: 'idle' | 'pending' | 'confirming' | 'success' | 'failed'
    hash?: `0x${string}`
    error?: string
}

function useTransactionState() {
    const [state, setState] = useState<TransactionState>({ status: 'idle' })
    const publicClient = usePublicClient()

    const execute = async (write: () => Promise<`0x${string}`>) => {
        setState({ status: 'pending' })
        try {
            const hash = await write()
            setState({ status: 'confirming', hash })

            const receipt = await publicClient.waitForTransactionReceipt({ hash })
            setState({
                status: receipt.status === 'success' ? 'success' : 'failed',
                hash,
            })
        } catch (error: any) {
            setState({ status: 'failed', error: error.message })
        }
    }

    return { state, execute }
}
```

## Caching Strategy

| Data Type | Cache Location | TTL | Strategy |
|-----------|---------------|-----|----------|
| Token balance | React Query | 10s | Poll or refetch on focus |
| Allowance | React Query | 30s | Refetch on approve |
| Price/TVL | React Query | 30s-1m | Background refresh |
| User preferences | localStorage | ∞ | Persist |
| Signed messages | sessionStorage | Session | In-memory cache |
| Transaction receipts | IndexedDB | 1 day | History |

## Event Indexing

### Event-Driven State

```typescript
type EventMap = Record<string, (...args: any[]) => void>

class EventIndexer {
    private contract: GetContractReturnType
    private processor: EventProcessor

    async start(fromBlock: bigint) {
        const events = await this.contract.getEvents.Transfer({
            fromBlock,
            toBlock: 'latest',
        })

        for (const event of events) {
            await this.processor.handleTransfer(event.args)
        }
    }

    subscribe() {
        this.contract.watchEvent.Transfer({
            onLogs: (logs) => {
                for (const log of logs) {
                    this.processor.handleTransfer(log.args)
                }
            },
        })
    }
}
```

### Log Processing Pipeline

```
Raw Log → Decode ABI → Validate → Transform → Index (SQLite/Postgres) → Invalidate cache → Notify UI
```

## IPFS / Decentralized Storage

```typescript
import { create } from 'ipfs-http-client'
import { ThirdwebStorage } from '@thirdweb-dev/storage'

// IPFS client
const ipfs = create({ url: 'https://ipfs.infura.io:5001' })

async function uploadMetadata(name: string, description: string, image: File) {
    // Upload image
    const imageResult = await ipfs.add(image)
    const imageURI = `ipfs://${imageResult.path}`

    // Upload metadata
    const metadata = { name, description, image: imageURI }
    const metadataResult = await ipfs.add(JSON.stringify(metadata))
    return `ipfs://${metadataResult.path}`
}

// Thirdweb Storage (auto-pin)
const storage = new ThirdwebStorage()
const uri = await storage.upload(metadata)
```

## Gas & Transaction Management

```typescript
// Priority fee estimation
async function estimatePriorityFee(publicClient: PublicClient): Promise<bigint> {
    const feeHistory = await publicClient.getFeeHistory({
        blockCount: 4,
        rewardPercentiles: [25, 50, 75],
    })

    const rewards = feeHistory.reward.flat()
    // Use 75th percentile
    return rewards[Math.floor(rewards.length * 0.75)]
}

// Nonce management
async function sendWithNonce(walletClient: WalletClient, txs: Transaction[]) {
    const nonce = await walletClient.getTransactionCount({ address: userAddress })
    const receipts = []

    for (let i = 0; i < txs.length; i++) {
        const hash = await walletClient.sendTransaction({
            ...txs[i],
            nonce: nonce + i,
        })
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        receipts.push(receipt)
    }

    return receipts
}
```

## ERC-2535 (Diamond) dApp Architecture

```
Proxy (Diamond) → Facets:
├── DiamondCutFacet (upgrade)
├── DiamondLoupeFacet (inspect)
├── ERC20Facet (token)
├── StakingFacet (staking)
└── GovernanceFacet (voting)

Frontend uses Loupe to discover facets
```

## Subgraph / The Graph Integration

```typescript
import { ApolloClient, InMemoryCache, gql } from '@apollo/client'

const client = new ApolloClient({
    uri: 'https://api.thegraph.com/subgraphs/name/...',
    cache: new InMemoryCache(),
})

const TRANSFERS = gql`
    query Transfers($user: String!) {
        transfers(where: { from: $user }, first: 10) {
            id
            value
            to
            blockNumber
        }
    }
`

const { data } = await client.query({
    query: TRANSFERS,
    variables: { user: '0x...' },
})
```
