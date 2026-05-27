# Web3 React Integration

## Wagmi Setup

```typescript
import { createConfig, http, WagmiProvider } from 'wagmi'
import { mainnet, sepolia, polygon } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

const config = createConfig({
  chains: [mainnet, sepolia, polygon],
  connectors: [
    injected(),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_ID! }),
    coinbaseWallet({ appName: 'My DApp' }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
  },
})

const queryClient = new QueryClient()

function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

## Contract Interaction

```typescript
import { useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { erc20Abi } from 'viem'

function TokenBalance({ tokenAddress, address }: { tokenAddress: `0x${string}`, address: `0x${string}` }) {
  const { data: balance, isLoading } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  })

  if (isLoading) return <div>Loading...</div>

  return <div>Balance: {formatEther(balance || 0n)}</div>
}

function TransferButton({ tokenAddress, to, amount }: {
  tokenAddress: `0x${string}`
  to: `0x${string}`
  amount: string
}) {
  const { writeContract, isPending, isSuccess } = useWriteContract()

  const handleTransfer = () => {
    writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [to, parseEther(amount)],
    })
  }

  return (
    <button onClick={handleTransfer} disabled={isPending}>
      {isPending ? 'Confirming...' : 'Transfer'}
    </button>
  )
}
```

## Event Listening

```typescript
function TransferWatcher({ tokenAddress }: { tokenAddress: `0x${string}` }) {
  const [transfers, setTransfers] = useState<Array<{ from: string; to: string; value: bigint }>>([])

  useWatchContractEvent({
    address: tokenAddress,
    abi: erc20Abi,
    eventName: 'Transfer',
    onLogs(logs) {
      logs.forEach(log => {
        setTransfers(prev => [...prev, {
          from: log.args.from!,
          to: log.args.to!,
          value: log.args.value!,
        }])
      })
    },
  })

  return (
    <div>
      <h3>Recent Transfers</h3>
      {transfers.map((t, i) => (
        <div key={i}>
          {t.from.slice(0, 6)} → {t.to.slice(0, 6)}: {formatEther(t.value)} ETH
        </div>
      ))}
    </div>
  )
}
```

## Key Points

- Use wagmi/viem for type-safe contract interactions
- Configure multiple chains with fallback RPCs
- Use `useReadContract` for read-only queries
- Use `useWriteContract` for state-changing transactions
- Handle transaction lifecycle (pending, confirmed, failed)
- Use `useWatchContractEvent` for real-time updates
- Implement multicall for batched reads
- Use `useAccount` for wallet connection state
- Handle chain switching gracefully
- Estimate gas before sending transactions
- Simulate transactions with `useSimulateContract`
- Use `usePublicClient` for direct RPC access
