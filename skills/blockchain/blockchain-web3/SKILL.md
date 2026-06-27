---
name: blockchain-web3
description: >
  Use this skill when asked about web3 frontend development, ethers.js, viem, wagmi, web3.js, wallet integration (MetaMask, Phantom, WalletConnect), dApp architecture, RPC providers (Alchemy, Infura), and TypeScript blockchain SDKs. Language: TypeScript. Covers reading blockchain state, sending transactions, wallet connection flows, contract interaction patterns, event subscription, gas estimation, multicall patterns, and account abstraction (ERC-4337). Do NOT use for: smart contract development (use blockchain-application), core protocol (use blockchain-core), or blockchain testing (use blockchain-testing).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [blockchain, web3, typescript, dapp, wallet, phase-blockchain]
---

# Blockchain Web3

## Purpose
Guide web3 frontend and dApp development covering library selection, wallet integration, contract interaction, transaction management, event handling, and account abstraction. Focuses on TypeScript-based frontend patterns.

## Agent Protocol

### Trigger
"web3", "ethers.js", "viem", "wagmi", "web3.js", "metamask", "phantom wallet", "walletconnect", "dapp", "decentralized app", "react blockchain", "nextjs web3", "ethers contract", "contract interaction", "read contract", "write contract", "send transaction", "sign message", "eip-1193", "eip-4337", "account abstraction", "multicall", "rpc provider", "infura", "alchemy", "blockchain frontend", "typechain", "wagmi hooks", "viem client", "user operation", "sign typed data"

### Input Context
- Frontend framework (React/Next.js/Vanilla)
- Blockchain networks (Ethereum/L2/Solana/Multi-chain)
- Library preference (viem+wagmi/ethers.js/web3.js)
- Features needed (read/write/events/wallet/signing)
- Account abstraction requirements (ERC-4337)
- Performance requirements (RPC calls, caching, multicall)

### Output Artifact
Web3 frontend architecture: library selection, provider setup, wallet connection flow, contract interaction patterns, event handling, and transaction management.

### Response Format
1. **Library selection**: viem/wagmi vs ethers.js vs web3.js rationale
2. **Provider setup**: chain config, RPC endpoints, fallback providers
3. **Wallet connection**: injected providers (EIP-6963), WalletConnect, smart accounts (ERC-4337)
4. **Contract interaction**: read/write patterns, event listening, multicall
5. **Transaction flow**: gas estimation, simulation, submission, confirmation tracking
6. **Error handling**: revert reasons, user rejection, network errors, rate limiting

### Completion Criteria
- Library selection justified with comparison against alternatives
- Provider setup handles: multiple chains, fallback RPCs, rate limiting
- Wallet connection supports: EIP-1193, EIP-6963, WalletConnect
- Transaction management handles: gas estimation, simulation, confirmation, error states
- Event handling covers: subscription, polling, historical query, reorg handling

### Max Response Length
4000 tokens

## Decision Trees

### Library Selection
```
Web3 frontend stack:
├── Modern TypeScript dApp?
│   ├── React + TypeScript → viem + wagmi (default)
│   │   ├── viem: lightweight, tree-shakeable, type-safe
│   │   ├── wagmi: React hooks, auto-refetch, multicall
│   │   └── ConnectKit/RainbowKit: wallet UI components
│   └── Vanilla JS/Node → viem (no React dependency)
├── Legacy / broad compatibility?
│   ├── ethers.js v6 — stable, well-documented
│   ├── TypeChain for typed contracts
│   └── More boilerplate than viem
├── Solana dApp?
│   ├── @solana/web3.js v2
│   ├── @solana/wallet-adapter-react
│   └── Anchor TS client for Anchor programs
└── Cosmos dApp?
    ├── @cosmjs/stargate
    └── Cosmos Kit (React)
```

### Wallet Connection
```
Wallet integration:
├── Desktop browser?
│   ├── MetaMask (EVM) — most users
│   ├── Phantom (Solana + EVM)
│   ├── Rabby (EVM, superior UX)
│   └── EIP-6963 multi-injected provider discovery
├── Mobile?
│   ├── WalletConnect v2 — universal mobile bridge
│   └── MetaMask SDK — native mobile support
├── Smart accounts (ERC-4337)?
│   ├── Privy, Dynamic, Web3Auth — social login + embedded wallets
│   └── ZeroDev, Biconomy, StackUp — ERC-4337 bundlers
└── Hardware wallet?
    ├── Ledger — Ledger Connect
    └── Trezor — Trezor Suite
```

## Viem + Wagmi Patterns

### Provider Setup
```typescript
import { createConfig, http } from 'wagmi'
import { mainnet, polygon, arbitrum } from 'wagmi/chains'
import { metaMask, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, polygon, arbitrum],
  connectors: [
    metaMask(),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID! }),
  ],
  transports: {
    [mainnet.id]: http(
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
      { batch: true } // Enable multicall batching
    ),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
  },
})
```

### Reading Contract State
```typescript
import { useReadContract } from 'wagmi'
import { abi } from './token-abi'
import { formatUnits } from 'viem'

// React hook — auto-refetches on account/chain change
function TokenBalance({ tokenAddress, userAddress }: Props) {
  const { data: balance, isLoading, isError } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi,
    functionName: 'balanceOf',
    args: [userAddress],
  })

  if (isLoading) return <div>Loading...</div>
  if (isError) return <div>Error loading balance</div>

  return <div>{formatUnits(balance ?? 0n, 18)} Tokens</div>
}
```

### Writing Transactions
```typescript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'

function TransferForm() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash })

  async function handleTransfer(amount: string) {
    writeContract({
      address: '0x...',
      abi,
      functionName: 'transfer',
      args: ['0x...recipient', parseEther(amount)],
    })
  }

  if (isPending) return <div>Check wallet...</div>
  if (isConfirming) return <div>Confirming transaction...</div>
  if (isConfirmed) return <div>Transfer complete!</div>

  return (
    <div>
      <input type="text" placeholder="Amount" />
      <button onClick={() => handleTransfer('10')}>Send</button>
      {error && <div>Error: {error.message}</div>}
    </div>
  )
}
```

### Sign Typed Data (EIP-712)
```typescript
import { useSignTypedData } from 'wagmi'
import { domain, types } from './eip712-types'

function SignOrder() {
  const { signTypedData, data: signature, isPending } = useSignTypedData()

  const handleSign = () => {
    signTypedData({
      domain: {
        name: 'Exchange',
        version: '1',
        chainId: 1,
        verifyingContract: '0x...',
      },
      types: {
        Order: [
          { name: 'maker', type: 'address' },
          { name: 'taker', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'Order',
      message: {
        maker: '0x...',
        taker: '0x...',
        amount: 1000n,
        nonce: 1n,
        deadline: 1700000000n,
      },
    })
  }

  return <button onClick={handleSign}>Sign Order</button>
}
```

### Multicall Pattern
```typescript
import { useMulticall } from 'wagmi'

// Batch multiple read calls into single RPC request
function useTokenBalances(tokens: `0x${string}`[], user: `0x${string}`) {
  const { data } = useMulticall({
    contracts: tokens.map(token => ({
      address: token,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [user],
    })),
  })

  return data?.map((result) =>
    result.status === 'success' ? formatUnits(result.result, 18) : '0'
  )
}
```

### Event Subscription
```typescript
import { useWatchContractEvent } from 'wagmi'

function TransferMonitor() {
  useWatchContractEvent({
    address: '0x...',
    abi,
    eventName: 'Transfer',
    onLogs(logs) {
      logs.forEach(log => {
        console.log(`Transfer: ${log.args.from} → ${log.args.to}: ${log.args.value}`)
        // Update UI in real-time
      })
    },
  })
  return <div>Monitoring transfers...</div>
}
```

### Transaction Flow with Error Handling
```typescript
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'

function SendTransaction() {
  const {
    sendTransaction,
    data: hash,
    isPending,
    error: sendError,
  } = useSendTransaction()

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash })

  async function handleSend(amount: string) {
    try {
      sendTransaction({
        to: '0x...',
        value: parseEther(amount),
      })
    } catch (e) {
      // User rejected in wallet
      if ((e as any)?.code === 'ACTION_REJECTED' || (e as any)?.code === 4001) {
        console.log('User rejected transaction')
        return
      }
      // Insufficient funds
      if ((e as any)?.message?.includes('insufficient funds')) {
        console.log('Insufficient balance')
        return
      }
      console.error('Transaction error:', e)
    }
  }

  // Transaction states
  if (isPending) return <div>Please confirm in wallet...</div>
  if (isConfirming) return <div>Waiting for confirmation...</div>
  if (isConfirmed) return <div>Transaction confirmed! Hash: {hash}</div>

  return (
    <div>
      <button onClick={() => handleSend('0.1')}>Send 0.1 ETH</button>
      {sendError && <div>Error: {sendError.message}</div>}
    </div>
  )
}
```

### Viem Client (Non-React)
```typescript
import { createPublicClient, createWalletClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// Public client (reads)
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth-mainnet.g.alchemy.com/v2/...'),
})

// Wallet client (writes)
const account = privateKeyToAccount('0x...')
const walletClient = createWalletClient({
  account,
  chain: mainnet,
  transport: http(),
})

// Read example
const balance = await publicClient.readContract({
  address: '0x...',
  abi,
  functionName: 'balanceOf',
  args: ['0x...'],
})

// Write example
const hash = await walletClient.writeContract({
  address: '0x...',
  abi,
  functionName: 'transfer',
  args: ['0x...', 1000n],
})
const receipt = await publicClient.waitForTransactionReceipt({ hash })
```

## Account Abstraction (ERC-4337)

### User Operation Flow
```typescript
import { createSmartAccountClient } from 'permissionless'
import { signerToSimpleSmartAccount } from 'permissionless/accounts'

// UserOperation replaces regular eth_sendTransaction
// 1. User signs UserOperation off-chain
// 2. Bundler submits to EntryPoint contract
// 3. EntryPoint verifies signature and pays gas (via paymaster)

async function sendUserOp() {
  const smartAccount = await signerToSimpleSmartAccount(client, {
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    signer: walletClient,
    factoryAddress: SIMPLE_ACCOUNT_FACTORY,
  })

  const smartClient = createSmartAccountClient({
    account: smartAccount,
    client: publicClient,
    bundlerUrl: 'https://bundler.example.com',
    paymasterUrl: 'https://paymaster.example.com', // Optional: sponsored gas
  })

  const txHash = await smartClient.sendTransaction({
    to: '0x...',
    data: encodeFunctionData({ abi, functionName: 'mint', args: [] }),
  })
}
```

### Session Keys (Ephemeral Signing)
```typescript
// ERC-4337 supports session keys for automated transactions
// 1. Deploy smart account
// 2. Approve session key with specific permissions
// 3. Session key signs UserOps without main key

// Session key permissions:
interface SessionKeyPermission {
    target: string           // Allowed contract
    functionSelector: string // Allowed function (bytes4)
    valueLimit: bigint       // Max ETH value
    expiry: number           // Unix timestamp
}

// Use cases:
// - Gaming: auto-approve in-game transactions
// - DeFi: scheduled DCA without manual signing each time
// - Subscriptions: recurring payments
```

## Error Handling Patterns

### Common Web3 Errors
```typescript
type Web3Error = {
  code: number | string
  message: string
  data?: string
}

const ErrorHandler = {
  // User rejected in wallet
  USER_REJECTED: (e: Web3Error) => e.code === 4001 || e.code === 'ACTION_REJECTED',

  // Insufficient funds
  INSUFFICIENT_FUNDS: (e: Web3Error) => e.message.includes('insufficient funds'),

  // Gas estimation failed
  GAS_ESTIMATION_FAILED: (e: Web3Error) => e.message.includes('gas required exceeds'),

  // Network error
  NETWORK_ERROR: (e: Web3Error) => e.message.includes('network error') || e.code === 'NETWORK_ERROR',

  // Rate limited
  RATE_LIMITED: (e: Web3Error) => e.message.includes('rate limit') || e.message.includes('429'),

  // Nonce too low
  NONCE_TOO_LOW: (e: Web3Error) => e.message.includes('nonce too low'),

  // Contract revert
  CONTRACT_REVERT: (e: Web3Error) => e.message.includes('revert') || e.data !== undefined,
}

// Usage
function handleError(error: unknown) {
  const e = error as Web3Error
  if (ErrorHandler.USER_REJECTED(e)) {
    return { type: 'warning', message: 'Transaction cancelled' }
  }
  if (ErrorHandler.INSUFFICIENT_FUNDS(e)) {
    return { type: 'error', message: 'Insufficient balance for gas' }
  }
  if (ErrorHandler.RATE_LIMITED(e)) {
    return { type: 'error', message: 'Too many requests, please wait' }
  }
  return { type: 'error', message: 'Transaction failed: ' + e.message }
}
```

## Rules
1. Use viem + wagmi as default TypeScript stack (modern, type-safe, lightweight)
2. Use ethers.js v6 for projects requiring broader ecosystem compatibility
3. Use TypeScript exclusively — generate types from ABIs with viem CLI or TypeChain
4. Always handle chain IDs for multi-chain dApps — detect and handle network changes
5. Implement proper error handling: revert reasons, user rejection, network issues, rate limiting
6. Use EIP-1193 provider interface via EIP-6963 (multi-injected provider discovery)
7. Prefer account abstraction (ERC-4337) for production dApps with complex UX needs
8. Never expose private keys in frontend code — always use wallet signatures
9. Use multicall for batched reads to reduce RPC calls
10. Implement proper loading/error/success states for all transaction flows
11. EIP-712 typed data should include chain ID to prevent cross-chain replay
12. WC v2 is required for mobile dApp compatibility (WC v1 deprecated)
13. Use batch HTTP transport in viem for automatic request batching
14. Transaction monitoring should track block confirmations, not just mempool acceptance
15. Gas estimation should include 10-20% buffer to prevent out-of-gas errors

## References
  - references/blockchain-web3-advanced.md — Blockchain Web3 Advanced Topics
  - references/blockchain-web3-fundamentals.md — Blockchain Web3 Fundamentals
  - references/cross-chain-dapp-patterns.md — Cross-Chain dApp Patterns
  - references/dapp-architecture.md — dApp Architecture
  - references/ethers-viem-wagmi.md — ethers.js, viem & wagmi
  - references/gas-optimization-management.md — Gas Optimization & Management
  - references/providers-rpc.md — Providers & RPC
  - references/wallet-integration.md — Wallet Integration
  - references/web3-hooks.md — Web3 React Hooks
  - references/web3-react-patterns.md — Web3 React Integration
  - references/account-abstraction-web3.md — Account Abstraction for Web3 Frontends
  - references/web3-error-handling.md — Web3 Error Handling Patterns
  - references/multicall-batching.md — Multicall & RPC Batching

## Architecture Decision Trees

```
Web3 Frontend Architecture
├── Wallet connection?
│   ├── Multi-wallet → Web3Modal / RainbowKit (wagmi-based)
│   ├── Single wallet → ConnectKit / Privy (embedded wallet)
│   └── Account abstraction → ZeroDev / Biconomy (ERC-4337)
├── Data fetching?
│   ├── Real-time → wagmi hooks + useQuery (TanStack Query)
│   ├── Indexed → The Graph subgraph (GraphQL)
│   └── Custom → ethers.js direct RPC calls
├── Transaction management?
│   ├── Simple → wagmi useSendTransaction
│   ├── Complex → viem + custom state machine
│   └── Gasless → Biconomy / OpenGSN (sponsored txs)
└── Chain selection?
    ├── Multi-chain → wagmi chain switching + EIP-6963
    ├── L2-only → Specific L2 (Optimism, Arbitrum)
    └── L1 + L2 fallback → Primary L2 with L1 fallback
```

**Decision criteria**: Evaluate target user (retail vs power), transaction complexity, data freshness needs, and wallet diversity.

## Implementation Patterns

### wagmi + React Query Integration
```typescript
// blockchain-web3/hooks/useTokenBalance.ts
import { useReadContract, useAccount } from 'wagmi';
import { erc20ABI } from 'wagmi-generate';

export function useTokenBalance(tokenAddress: `0x${string}`) {
  const { address } = useAccount();

  return useReadContract({
    address: tokenAddress,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });
}
```

### Transaction State Machine
```typescript
// blockchain-web3/hooks/useTransaction.ts
type TxState = 'idle' | 'approving' | 'pending' | 'confirmed' | 'failed';

interface TransactionState {
  status: TxState;
  txHash?: `0x${string}`;
  error?: string;
}

export function useTransaction() {
  const [state, setState] = useState<TransactionState>({ status: 'idle' });

  const send = useCallback(async (fn: () => Promise<`0x${string}`>) => {
    setState({ status: 'pending' });
    try {
      const txHash = await fn();
      setState({ status: 'pending', txHash });
      const receipt = await waitForTransaction({ hash: txHash });
      setState({ status: receipt.status === 'success' ? 'confirmed' : 'failed', txHash });
    } catch (err) {
      setState({ status: 'failed', error: (err as Error).message });
    }
  }, []);

  return { state, send };
}
```

## Production Considerations

- **RPC redundancy**: Configure multiple RPC endpoints per chain; fallback on rate limit or failure.
- **Transaction monitoring**: Track tx status via receipt polling; notify user on confirmation/failure.
- **Gas estimation**: Use `estimateGas` with 20% buffer; handle out-of-gas errors with user notification.
- **Error handling**: Categorize errors (user rejection, network, gas, contract revert) for user-friendly display.
- **Wallet disconnection**: Handle account change, chain change, and disconnection events.
- **Mobile support**: Test WalletConnect v2 for mobile browsers; responsive layouts for wallet UIs.

## Anti-Patterns

| Anti-Pattern | Consequence | Solution |
|---|---|---|
| Direct RPC calls for every read | Rate limiting, slow UI | Use subgraph + wagmi caching |
| No loading states | Poor UX during tx | Show tx progress with step indicators |
| Hardcoded gas limits | Failed txs on network congestion | Dynamic gas estimation with buffer |
| Ignoring chain switching | App breaks on wrong chain | Handle chainChanged event; prompt switch |
| No tx simulation | Failed txs waste user gas | Simulate txs before sending (eth_call) |

## Performance Optimization

- **Multicall**: Batch multiple read calls into single RPC request using Multicall3 contract.
- **Query caching**: Use TanStack Query with staleTime (30s) to reduce RPC calls.
- **Lazy loading**: Load web3 components only when wallet connected; code-split heavy libraries.
- **Bundle optimization**: Tree-shake wagmi/viem imports; use dynamic import for ethers as fallback.
- **Local state cache**: Cache token balances and prices in IndexedDB; invalidate on new block.

## Security Considerations

- **Wallet validation**: Verify connected wallet address matches expected chain; detect wallet spoofing.
- **Signature requests**: Never blindly sign messages; display decoded message content.
- **Transaction simulation**: Simulate txs via `eth_call` before sending; warn user on failure.
- **Domain validation**: Verify dApp domain in wallet requests; prevent phishing (EIP-4361).
- **Secure RPC**: Use private RPC endpoints with API key restrictions; never expose keys in frontend.
- **CORS policies**: Restrict API access to known domains; no public CORS on RPC endpoints.

## Phase
blockchain → blockchain-web3
