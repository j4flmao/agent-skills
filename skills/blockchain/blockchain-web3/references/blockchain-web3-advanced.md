# Blockchain Web3 Advanced Topics

## Advanced Viem Patterns

### Custom Public Actions
```typescript
import { createPublicClient, http, defineChain } from 'viem'

const client = createPublicClient({
  chain: defineChain({
    id: 1,
    name: 'Ethereum',
    network: 'mainnet',
    rpcUrls: { default: { http: ['https://eth-mainnet.g.alchemy.com/v2/...'] } },
  }),
  transport: http(),
  batch: { multicall: true }, // Batch multiple reads into one request
})
```

### EIP-1193 Provider Events
```typescript
window.ethereum.on('accountsChanged', (accounts: string[]) => {
  // User switched account → refresh UI
})

window.ethereum.on('chainChanged', (chainId: string) => {
  // User switched chain → reload or prompt switch back
})

window.ethereum.on('disconnect', (error: ProviderRpcError) => {
  // Wallet disconnected → show connect prompt
})
```

## ERC-4337 Account Abstraction

### UserOperation Anatomy
```typescript
interface UserOperation {
  sender: `0x${string}`
  nonce: bigint
  initCode: `0x${string}` // For deploying smart account
  callData: `0x${string}`
  callGasLimit: bigint
  verificationGasLimit: bigint
  preVerificationGas: bigint
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  paymasterAndData: `0x${string}`
  signature: `0x${string}`
}
```

### Paymaster Flow
User signs UserOp with signature. Bundler sends to EntryPoint. EntryPoint calls paymaster to validate payment. Paymaster pays gas (with pre-auth from user or sponsored). EntryPoint executes UserOp. Paymaster reimbursed from pre-funded deposit.

## Multi-Chain dApp Patterns

### Chain Aware State
Store chain-specific data separately. Detect chain via provider. Auto-switch to correct chain per action. Show cross-chain balances aggregated. Handle chain-specific address formats (EVM checksum, Solana base58).

### Cross-Chain Transactions
Using cross-chain messaging: execute action on chain A, send message to chain B for corresponding action. Progress tracking: source chain tx → message relay → destination chain tx.

## Performance Optimization

### Multicall Batching
Batch multiple read calls into single RPC request. Reduces latency from N round trips to 1. Viem's multicall uses multicall3 contract.

### Lazy Loading
Load heavy libraries (ethers.js, abi files) only when needed. Dynamic imports for route-specific web3 functionality. Code splitting for wallet connection flows.

### Caching
Cache: user balance (TTL: 15 seconds), token prices (TTL: 1 minute), contract state (TTL: 1 block). Invalidate on network changes or on-chain events.
