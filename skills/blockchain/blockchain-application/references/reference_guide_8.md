# dApp Frontend Integration: viem and wagmi

How a web frontend talks to contracts: wallet connection, reads, writes, transaction lifecycle, error decoding and chain handling, using viem (low-level client) and wagmi (React hooks on top of viem, with TanStack Query).

## Stack

| Layer | Library |
|-------|---------|
| Low-level RPC, ABI, encoding | viem |
| React hooks, connectors, caching | wagmi v2 (+ `@tanstack/react-query`) |
| Wallet modal | RainbowKit, ConnectKit, Reown AppKit (formerly Web3Modal) |
| Type-safe ABIs | `as const` ABIs or `@wagmi/cli` generating from Foundry artifacts |

## wagmi Configuration

```typescript
// wagmi.ts
import { http, createConfig } from 'wagmi';
import { mainnet, base } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

export const config = createConfig({
  chains: [mainnet, base],
  connectors: [
    injected(),
    walletConnect({ projectId: import.meta.env.VITE_WC_PROJECT_ID }),
    coinbaseWallet({ appName: 'My dApp' }),
  ],
  transports: {
    [mainnet.id]: http(import.meta.env.VITE_MAINNET_RPC),
    [base.id]: http(import.meta.env.VITE_BASE_RPC),
  },
  ssr: true,
});
```

```tsx
// providers.tsx
const queryClient = new QueryClient();
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
```

Use your own RPC endpoints; public defaults are rate-limited.

## Type-Safe ABI

```typescript
export const vaultAbi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'deposit', stateMutability: 'nonpayable', inputs: [{ name: 'assets', type: 'uint256' }, { name: 'receiver', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'error', name: 'InsufficientBalance', inputs: [{ name: 'available', type: 'uint256' }, { name: 'required', type: 'uint256' }] },
] as const;
```

`as const` lets viem infer argument and return types.

## Reads

```tsx
const { address } = useAccount();
const { data: shares, isLoading } = useReadContract({
  address: VAULT,
  abi: vaultAbi,
  functionName: 'balanceOf',
  args: address ? [address] : undefined,
  query: { enabled: !!address },
});
```

Batch many reads with `useReadContracts` (uses Multicall3 when available).

## Writes and Transaction Lifecycle

```tsx
const { writeContractAsync, isPending } = useWriteContract();
const [hash, setHash] = useState<`0x${string}`>();
const receipt = useWaitForTransactionReceipt({ hash });

async function onDeposit(amount: bigint) {
  // 1. simulate to surface reverts before the wallet prompt
  const { request } = await simulateContract(config, {
    address: VAULT, abi: vaultAbi, functionName: 'deposit', args: [amount, address!],
  });
  // 2. send
  const txHash = await writeContractAsync(request);
  setHash(txHash);
}
```

States to show the user: awaiting signature -> submitted (hash, explorer link) -> confirmed (receipt `status === 'success'`) or reverted. Invalidate related queries after confirmation (`queryClient.invalidateQueries`).

## Token Approvals

ERC-20 deposits need `approve` then `deposit`:
- Read `allowance` first; request approval only if insufficient.
- Approve the exact amount by default rather than unlimited; let users opt in to larger approvals.
- Consider EIP-2612 permit or Permit2 signatures to avoid the extra transaction.
- Some wallets support batching (EIP-5792 `wallet_sendCalls`, exposed by wagmi as `useSendCalls`) to combine approve + action.

## Decoding Errors

```typescript
import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem';

try {
  await onDeposit(amount);
} catch (err) {
  if (err instanceof BaseError) {
    const rejected = err.walk((e) => e instanceof UserRejectedRequestError);
    if (rejected) return toast('Transaction cancelled');
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;          // e.g. 'InsufficientBalance'
      return toast(messageFor(name, revert.data?.args));
    }
    return toast(err.shortMessage);
  }
  throw err;
}
```

Include custom errors in the ABI so viem can decode them.

## Units and Numbers

- Use `bigint` everywhere for on-chain amounts; never JavaScript `number` (precision loss above 2^53).
- `parseUnits('1.5', decimals)` and `formatUnits(value, decimals)`; read `decimals()` from the token instead of assuming 18.

## Chain Handling

```tsx
const chainId = useChainId();
const { switchChain } = useSwitchChain();
if (chainId !== base.id) return <button onClick={() => switchChain({ chainId: base.id })}>Switch to Base</button>;
```

Keep contract addresses in a per-chain map and derive from `chainId`.

## Security for Frontends

- Pin and audit dependencies; supply-chain compromises of wallet libraries have drained users.
- Serve with a strict CSP and subresource integrity where possible.
- Show human-readable details of what a transaction does before prompting.
- Never ask users for seed phrases or private keys.
- Sign-In with Ethereum (ERC-4361) for authentication; verify server-side including nonce and domain.

## Pitfalls

- Treating `writeContract` resolution as success (it only means submitted).
- Not handling replaced/sped-up transactions (wagmi's receipt waiting handles replacement via `onReplaced`).
- Hydration mismatches with SSR when reading wallet state; set `ssr: true` and use cookie storage if needed.
- Stale reads after writes because queries were not invalidated.

## Checklist

- [ ] Own RPC endpoints per chain
- [ ] ABIs typed with `as const` or generated
- [ ] Simulate before write; handle reject/revert/replace
- [ ] Amounts as `bigint` with token decimals
- [ ] Allowance check before approval; exact approvals by default
- [ ] Wrong-network UX and per-chain addresses
