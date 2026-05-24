# Web3 React Hooks

## Custom Hook Patterns

### useTokenBalance

```typescript
import { useQuery } from '@tanstack/react-query'
import { usePublicClient, useAccount } from 'wagmi'
import { erc20Abi } from 'viem'

export function useTokenBalance(token: `0x${string}`) {
    const { address } = useAccount()
    const publicClient = usePublicClient()

    return useQuery({
        queryKey: ['tokenBalance', address, token],
        queryFn: async () => {
            if (!address) return null

            const [balance, decimals, symbol] = await Promise.all([
                publicClient.readContract({
                    address: token,
                    abi: erc20Abi,
                    functionName: 'balanceOf',
                    args: [address],
                }),
                publicClient.readContract({
                    address: token,
                    abi: erc20Abi,
                    functionName: 'decimals',
                }),
                publicClient.readContract({
                    address: token,
                    abi: erc20Abi,
                    functionName: 'symbol',
                }),
            ])

            return {
                value: balance as bigint,
                decimals: decimals as number,
                symbol: symbol as string,
                formatted: formatUnits(balance as bigint, decimals as number),
            }
        },
        enabled: !!address,
        refetchInterval: 10_000, // 10s
    })
}
```

### useAllowance

```typescript
export function useAllowance(
    token: `0x${string}`,
    spender: `0x${string}`
) {
    const { address } = useAccount()
    const publicClient = usePublicClient()

    return useQuery({
        queryKey: ['allowance', address, token, spender],
        queryFn: async () => {
            if (!address) return 0n
            return publicClient.readContract({
                address: token,
                abi: erc20Abi,
                functionName: 'allowance',
                args: [address, spender],
            }) as Promise<bigint>
        },
        enabled: !!address,
        refetchInterval: 30_000,
    })
}
```

### useTransaction

```typescript
import { useState, useCallback } from 'react'
import { usePublicClient, useWalletClient } from 'wagmi'

type TxState = {
    status: 'idle' | 'pending' | 'confirming' | 'success' | 'error'
    hash?: `0x${string}`
    error?: string
}

export function useTransaction() {
    const [state, setState] = useState<TxState>({ status: 'idle' })
    const publicClient = usePublicClient()
    const { data: walletClient } = useWalletClient()

    const reset = useCallback(() => setState({ status: 'idle' }), [])

    const sendTransaction = useCallback(async (tx: any) => {
        if (!walletClient) throw new Error('Wallet not connected')

        setState({ status: 'pending' })
        try {
            const hash = await walletClient.sendTransaction(tx)
            setState({ status: 'confirming', hash })

            const receipt = await publicClient.waitForTransactionReceipt({ hash })
            setState({
                status: receipt.status === 'success' ? 'success' : 'error',
                hash,
            })
            return receipt
        } catch (error: any) {
            setState({ status: 'error', hash: state.hash, error: error.message })
            throw error
        }
    }, [walletClient, publicClient])

    return { ...state, sendTransaction, reset }
}
```

### useContractWrite (Gas-Optimized)

```typescript
import { useCallback } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useSimulateContract } from 'wagmi'

export function useContractWrite(params: {
    address: `0x${string}`
    abi: any
    functionName: string
    args: any[]
}) {
    const { data: simulation } = useSimulateContract(params)
    const { data: hash, writeContract, isPending } = useWriteContract()
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

    const write = useCallback(() => {
        if (!simulation) return
        writeContract(simulation.request)
    }, [simulation, writeContract])

    return {
        write,
        isPending,
        isConfirming,
        isSuccess,
        hash,
        ready: !!simulation,
    }
}
```

### useChainGuard

```typescript
export function useChainGuard(expectedChainId: number) {
    const { chain } = useAccount()

    const isCorrectChain = chain?.id === expectedChainId

    const switchChain = useCallback(async () => {
        try {
            await window.ethereum?.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${expectedChainId.toString(16)}` }],
            })
        } catch (e: any) {
            if (e.code === 4902) {
                // Chain not added — handle add
            }
        }
    }, [expectedChainId])

    return { isCorrectChain, currentChain: chain, switchChain }
}
```

### useDebouncedBalance

```typescript
export function useDebouncedBalance(token: `0x${string}`, delayMs = 500) {
    const publicClient = usePublicClient()
    const { address } = useAccount()
    const [balance, setBalance] = useState<bigint>()
    const [debouncedAddress] = useDebounce(address, delayMs)

    useEffect(() => {
        if (!debouncedAddress || !token) return

        const fetchBalance = async () => {
            const result = await publicClient.readContract({
                address: token,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [debouncedAddress],
            })
            setBalance(result as bigint)
        }

        fetchBalance()
        const interval = setInterval(fetchBalance, 30_000)
        return () => clearInterval(interval)
    }, [debouncedAddress, token])

    return balance
}
```

### useBlockNumber

```typescript
export function useBlockNumber() {
    const publicClient = usePublicClient()
    const [blockNumber, setBlockNumber] = useState<bigint>()

    useEffect(() => {
        const unwatch = publicClient.watchBlockNumber({
            onBlockNumber: (bn) => setBlockNumber(bn),
        })
        return () => unwatch()
    }, [publicClient])

    return blockNumber
}
```

## Hook Composition

```typescript
// Composed hooks for a swap feature
function useSwap() {
    const { address } = useAccount()
    const tokenInBalance = useTokenBalance(tokenInAddress)
    const tokenOutBalance = useTokenBalance(tokenOutAddress)
    const allowance = useAllowance(tokenInAddress, swapRouterAddress)
    const { write: approve } = useContractWrite({
        address: tokenInAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [swapRouterAddress, amount],
    })
    const { write: swap } = useContractWrite({
        address: swapRouterAddress,
        abi: swapRouterAbi,
        functionName: 'swapExactTokensForTokens',
        args: [amountIn, amountOutMin, path, address, deadline],
    })
    const needsApproval = allowance.data !== undefined && amount > allowance.data

    return {
        tokenInBalance,
        tokenOutBalance,
        needsApproval,
        approve,
        swap,
    }
}
```

## Error Handling Hooks

```typescript
export function useTransactionError() {
    return useCallback((error: unknown): string => {
        if (!error) return ''

        const msg = (error as any)?.shortMessage
            ?? (error as any)?.reason
            ?? (error as any)?.message
            ?? 'Transaction failed'

        // User-friendly mapping
        if (msg.includes('user rejected')) return 'Transaction cancelled'
        if (msg.includes('insufficient funds')) return 'Insufficient balance for gas'
        if (msg.includes('execution reverted')) return 'Contract rejected the transaction'

        return msg
    }, [])
}
```

## Query Key Management

```typescript
// Centralized query keys for cache invalidation
export const queryKeys = {
    balance: (address?: string, token?: string) =>
        ['balance', address, token] as const,
    allowance: (address?: string, token?: string, spender?: string) =>
        ['allowance', address, token, spender] as const,
    pool: (poolAddress?: string) =>
        ['pool', poolAddress] as const,
    price: (pair?: string) =>
        ['price', pair] as const,
    userPositions: (address?: string) =>
        ['positions', address] as const,
}

// Invalidation helper
export function useInvalidateQueries() {
    const queryClient = useQueryClient()

    return useCallback(async (txHash?: `0x${string}`) => {
        await queryClient.invalidateQueries({ queryKey: ['balance'] })
        await queryClient.invalidateQueries({ queryKey: ['allowance'] })
        await queryClient.invalidateQueries({ queryKey: ['positions'] })
        if (txHash) {
            await queryClient.setQueryData(['tx', txHash], { status: 'confirmed' })
        }
    }, [queryClient])
}
```
