# ethers.js, viem & wagmi

## viem (Modern TypeScript Library)

### Setup & Client

```typescript
import { createPublicClient, createWalletClient, http } from 'viem'
import { mainnet, sepolia } from 'viem/chains'

// Read-only client
const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(process.env.MAINNET_RPC),
})

// Wallet client (signs transactions)
const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC),
})
```

### Reading Contract State

```typescript
import { getContract } from 'viem'
import { abi } from './MyTokenABI'

const contract = getContract({
    address: '0x...',
    abi,
    client: publicClient,
})

const balance = await contract.read.balanceOf(['0x...']) // returns bigint
const totalSupply = await contract.read.totalSupply()
```

### Writing Transactions

```typescript
const hash = await walletClient.writeContract({
    address: '0x...',
    abi,
    functionName: 'transfer',
    args: ['0x...', 100n],
    account: userAccount,
})

const receipt = await publicClient.waitForTransactionReceipt({ hash })
```

### Event Logs

```typescript
const logs = await publicClient.getLogs({
    address: '0x...',
    event: abi[/* Transfer event */],
    args: { from: '0x...' },
    fromBlock: 0n,
    toBlock: 'latest',
})
```

### Simulate + Write (Safe)

```typescript
import { simulateContract } from 'viem/actions'

// Simulate first (no gas cost)
const { request } = await simulateContract(publicClient, {
    address: '0x...',
    abi,
    functionName: 'transfer',
    args: ['0x...', 100n],
    account: userAccount,
})

// Execute only if simulation succeeded
const hash = await walletClient.writeContract(request)
```

## ethers.js v6

### Provider & Signer

```typescript
import { ethers } from 'ethers'

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
const signer = new ethers.Wallet(privateKey, provider)

// Browser
const browserProvider = new ethers.BrowserProvider(window.ethereum)
const browserSigner = await browserProvider.getSigner()
```

### Contract Interaction

```typescript
const contract = new ethers.Contract(address, abi, signer)

// Read
const balance = await contract.balanceOf(address) // returns bigint

// Write
const tx = await contract.transfer(to, amount)
await tx.wait() // wait for confirmation
```

### Event Listening

```typescript
contract.on('Transfer', (from, to, amount, event) => {
    console.log(`${from} → ${to}: ${amount}`)
})

// Filtered
const filter = contract.filters.Transfer(fromAddress)
contract.on(filter, (from, to, amount) => { /* ... */ })
```

## wagmi (React Hooks)

### Setup (Wagmi + Viem)

```typescript
import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
    chains: [mainnet, sepolia],
    connectors: [
        injected({ target: 'metaMask' }),
        walletConnect({ projectId: process.env.WC_PROJECT_ID }),
    ],
    transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(),
    },
})
```

### Account & Balance

```typescript
import { useAccount, useBalance } from 'wagmi'

function WalletInfo() {
    const { address, isConnected } = useAccount()
    const { data: balance } = useBalance({ address })

    return <div>
        {isConnected ? `${address} — ${balance?.formatted} ETH` : 'Disconnected'}
    </div>
}
```

### Contract Read

```typescript
import { useReadContract } from 'wagmi'

function TokenBalance({ address }) {
    const { data: balance, isLoading } = useReadContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
    })

    return <div>Balance: {balance?.toString()}</div>
}
```

### Contract Write

```typescript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'

function TransferForm() {
    const { data: hash, writeContract, isPending } = useWriteContract()
    const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })

    const send = () => writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [toAddress, amount],
    })

    return <button onClick={send} disabled={isPending || isConfirming}>
        {isConfirming ? 'Confirming...' : 'Send'}
    </button>
}
```

### Simulate Before Write

```typescript
import { useSimulateContract } from 'wagmi'

function SafeTransfer() {
    const { data: simulation } = useSimulateContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [toAddress, amount],
    })

    const { writeContract } = useWriteContract()

    return <button onClick={() => writeContract(simulation!.request)} disabled={!simulation}>
        Transfer
    </button>
}
```

## Library Comparison

| Feature | ethers.js v6 | viem | web3.js v4 |
|---------|------------|------|-----------|
| Bundle size | 370 KB | 60 KB | 250 KB |
| Tree-shakeable | Partial | Yes | Partial |
| TypeScript | Good | Excellent (inferred) | Good |
| EIP-1193 | Yes | Yes | Yes |
| Native bigint | Yes | Yes | Yes |
| WalletConnect | Via providers | Via connectors | Via providers |
| ENS resolution | Built-in | Built-in | Plugin |
| Actions pattern | No | Yes (composable) | No |
