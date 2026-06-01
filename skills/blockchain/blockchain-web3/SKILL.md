---
name: blockchain-web3
description: >
  Use this skill when asked about web3 frontend development, ethers.js, viem, wagmi, web3.js, wallet integration (MetaMask, Phantom, WalletConnect), dApp architecture, RPC providers (Alchemy, Infura), and TypeScript blockchain SDKs. Language: TypeScript. Covers reading blockchain state, sending transactions, wallet connection flows, contract interaction patterns, event subscription, gas estimation, multicall patterns, and account abstraction (ERC-4337). Do NOT use for: smart contract development (use blockchain-application), core protocol (use blockchain-core), or blockchain testing (use blockchain-testing).
version: "1.1.0"
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

## Phase
blockchain → blockchain-web3
