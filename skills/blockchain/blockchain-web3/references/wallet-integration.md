# Wallet Integration

## EIP-1193 Provider Interface

```typescript
interface EIP1193Provider {
    request(args: { method: string; params?: unknown[] }): Promise<unknown>
    on(event: string, listener: (...args: unknown[]) => void): void
    removeListener(event: string, listener: (...args: unknown[]) => void): void
}
```

### Connecting (EIP-1193)

```typescript
// EIP-6963: Multi-injected provider discovery
interface EIP6963ProviderInfo {
    uuid: string
    name: string
    icon: string
    rdns: string
}

interface EIP6963AnnounceProviderEvent extends CustomEvent {
    detail: { info: EIP6963ProviderInfo; provider: EIP1193Provider }
}

// Listen for wallet announcements
window.addEventListener('eip6963:announceProvider', (event: EIP6963AnnounceProviderEvent) => {
    const { provider, info } = event.detail
    wallets.push({ provider, info })
})

// Request wallet to announce
window.dispatchEvent(new Event('eip6963:requestProvider'))
```

### Connecting (Legacy)

```typescript
async function connectMetaMask(): Promise<string> {
    if (!window.ethereum) throw new Error('No wallet found')

    const accounts: string[] = await window.ethereum.request({
        method: 'eth_requestAccounts',
    })

    return accounts[0]
}

// Chain info
const chainId: string = await window.ethereum.request({
    method: 'eth_chainId',
})
```

## Phantom Wallet (Solana)

```typescript
// Connecting
async function connectPhantom(): Promise<string> {
    const provider = window.phantom?.solana
    if (!provider?.isPhantom) throw new Error('Phantom not installed')

    const { publicKey } = await provider.connect()
    return publicKey.toString()
}

// Sign and send transaction
async function sendSolTx(provider: any, transaction: Transaction): Promise<string> {
    const signed = await provider.signTransaction(transaction)
    const signature = await connection.sendRawTransaction(signed.serialize())
    return signature
}

// Sign message
async function signMessagePhantom(provider: any, message: string): Promise<Uint8Array> {
    const encoded = new TextEncoder().encode(message)
    const { signature } = await provider.signMessage(encoded, 'utf8')
    return signature
}
```

## WalletConnect

```typescript
import { WalletConnectModal } from '@walletconnect/modal'
import { createWalletClient, custom } from 'viem'

const modal = new WalletConnectModal({
    projectId: process.env.WC_PROJECT_ID!,
    chains: ['eip155:1', 'eip155:137'], // Ethereum, Polygon
})

// Open modal
await modal.open()

// Get provider
const provider = await walletConnectProvider.init({
    projectId: process.env.WC_PROJECT_ID!,
    chains: [1, 137],
})

const walletClient = createWalletClient({
    transport: custom(provider),
})

const [address] = await walletClient.requestAddresses()
```

## Account Abstraction (ERC-4337)

### Smart Account

```solidity
contract SimpleAccount is BaseAccount {
    address public owner;

    function execute(address dest, uint256 value, bytes calldata func) external {
        _requireFromEntryPoint();
        (bool success, bytes memory result) = dest.call{value: value}(func);
        require(success, string(result));
    }

    function _validateSignature(UserOperation calldata op) internal override returns (uint256) {
        bytes32 hash = _hashMessage(op);
        if (owner == ECDSA.recover(hash, op.signature)) return VALIDATION_SUCCESS;
        return SIG_VALIDATION_FAILED;
    }
}
```

### Bundler Integration

```typescript
import { createBundlerClient } from 'viem/account-abstraction'

const bundlerClient = createBundlerClient({
    chain: mainnet,
    transport: http('https://bundler.example.com/rpc'),
})

// Send UserOperation
const hash = await bundlerClient.sendUserOperation({
    userOperation: {
        sender: accountAddress,
        callData: encodeFunctionData({
            abi,
            functionName: 'transfer',
            args: [to, amount],
        }),
        maxFeePerGas: 1000000000n,
        maxPriorityFeePerGas: 1000000000n,
        preVerificationGas: 50000n,
        verificationGasLimit: 100000n,
        callGasLimit: 100000n,
    },
    account,
})

// Wait for inclusion
const receipt = await bundlerClient.waitForUserOperationReceipt({ hash })
```

## Multi-Chain Support

### Chain Switching

```typescript
async function switchChain(chainId: number) {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainId.toString(16)}` }],
        })
    } catch (e: any) {
        // Chain not added yet
        if (e.code === 4902) {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: `0x${chainId.toString(16)}`,
                    chainName: 'Polygon Mainnet',
                    rpcUrls: ['https://polygon-rpc.com'],
                    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                }],
            })
        }
    }
}
```

## Wallet SDKs

### MetaMask SDK

```typescript
import MetaMaskSDK from '@metamask/sdk'

const MMSDK = new MetaMaskSDK({
    dappMetadata: { name: 'My DApp', url: 'https://my-dapp.com' },
    infuraAPIKey: process.env.INFURA_KEY,
})

const provider = MMSDK.getProvider()
await provider?.request({ method: 'eth_requestAccounts' })
```

### Thirdweb SDK

```typescript
import { ThirdwebSDK } from '@thirdweb-dev/sdk'
import { MetaMaskWallet } from '@thirdweb-dev/wallets'

const wallet = new MetaMaskWallet()
await wallet.connect()

const sdk = new ThirdwebSDK(wallet)
const contract = await sdk.getContract('0x...')
```

## Error Handling

```typescript
async function handleTxError(error: unknown): string {
    if (error instanceof UserRejectedRequestError) {
        return 'User rejected the transaction'
    }
    if (error instanceof InsufficientFundsError) {
        return 'Insufficient funds for gas'
    }
    if (error instanceof ContractFunctionRevertedError) {
        return `Reverted: ${error.reason ?? error.data?.message ?? 'unknown'}`
    }
    if (error instanceof TransactionExecutionError) {
        return `Transaction failed: ${error.shortMessage}`
    }
    return `Unexpected error: ${error}`
}
```
