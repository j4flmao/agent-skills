# Blockchain Web3 Fundamentals

## Web3 Architecture

### Frontend ↔ Blockchain Communication
The dApp frontend does NOT connect directly to the blockchain. Instead, it connects to an RPC provider (Infura, Alchemy, QuickNode) which relays requests to a blockchain node. The wallet (MetaMask, Phantom) manages keys and signing.

### Provider Model (EIP-1193)
Standardized provider interface for Ethereum wallets. Methods: eth_requestAccounts (connect wallet), eth_chainId (get network), eth_sendTransaction (submit tx). MetaMask, WalletConnect, and other wallets inject an EIP-1193 provider into the browser.

### Library Abstraction
Libraries like viem, ethers.js, and web3.js abstract the raw JSON-RPC calls into developer-friendly APIs. They handle: ABI encoding/decoding, transaction construction, event parsing, error interpretation.

## Core Patterns

### Reading Blockchain State
```typescript
// viem
const balance = await publicClient.readContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [userAddress],
})
```

### Writing Transactions
```typescript
// wagmi + viem
const { writeContract } = useWriteContract()

await writeContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: 'transfer',
  args: [recipient, amount],
})
```

### Event Listening
```typescript
const unwatch = publicClient.watchContractEvent({
  address: tokenAddress,
  abi: erc20Abi,
  eventName: 'Transfer',
  onLogs: (logs) => console.log(logs),
})
```

## Wallet Integration

### Connection Flow
1. User clicks "Connect Wallet"
2. dApp requests accounts via provider
3. Wallet shows connection prompt
4. User approves in wallet extension
5. dApp receives account address(es)
6. dApp detects chain ID, prompts switch if wrong chain
7. dApp displays connected state

### Chain Switching
```typescript
await walletClient.switchChain({ id: polygon.id })
// Falls back to wallet_addEthereumChain if not configured
```

## Transaction Lifecycle

1. **Build**: Construct transaction with to, value, data
2. **Estimate**: eth_estimateGas to check if it will succeed
3. **Submit**: eth_sendRawTransaction returns tx hash
4. **Pending**: Transaction in mempool, waiting for inclusion
5. **Confirmed**: Included in a block (1 confirmation)
6. **Finalized**: Sufficient confirmations for finality

## Error Handling

Common errors: user rejected (ACTION_REJECTED), insufficient funds (INSUFFICIENT_FUNDS), gas too low, contract revert (execution reverted), network error (NETWORK_ERROR). Parse revert reasons from error data for user-friendly messages.
