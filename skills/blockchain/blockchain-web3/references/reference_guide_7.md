# Testing dApps: Local Chains, Test Clients and Wallet E2E

Testing strategy for web3 front ends and backends: forked local chains with Anvil, viem test actions for state manipulation, unit tests for hooks with a mock connector, and end-to-end tests that drive a real wallet extension.

## Layers

| Layer | Tools | What it proves |
|-------|-------|----------------|
| Pure logic | Vitest/Jest | Formatting, amount math (bigint), quote validation |
| Contract interaction | viem against Anvil (fresh or forked) | ABI correctness, reverts, events |
| React hooks/components | wagmi `mock` connector + Testing Library | UI states: connect, pending, success, error |
| End-to-end | Playwright + Synpress (MetaMask) or injected test wallet | Full flow including wallet prompts |
| Testnet smoke | Sepolia / chain-specific testnets | Deployed addresses, real infra |

## Anvil

```bash
# fresh chain, 10 funded accounts, 1-second blocks
anvil --block-time 1

# fork mainnet at a pinned block for deterministic state
anvil --fork-url "$MAINNET_RPC_URL" --fork-block-number 21000000 --chain-id 31337
```

Pinning `--fork-block-number` makes tests reproducible and lets RPC caches work. Anvil's default accounts are derived from a public test mnemonic: never use them on real networks.

## viem Test Client

```ts
import { createTestClient, createPublicClient, createWalletClient, http, publicActions, walletActions, parseEther, erc20Abi } from 'viem'
import { foundry } from 'viem/chains'

export const testClient = createTestClient({ chain: foundry, mode: 'anvil', transport: http('http://127.0.0.1:8545') })
  .extend(publicActions)
  .extend(walletActions)
```

Common test actions:

| Action | Use |
|--------|-----|
| `setBalance({ address, value })` | Fund any address with ETH |
| `impersonateAccount({ address })` / `stopImpersonatingAccount` | Send as a whale or protocol admin on a fork |
| `mine({ blocks })` | Advance blocks |
| `increaseTime({ seconds })` + `mine` | Pass deadlines/vesting |
| `snapshot()` / `revert({ id })` | Isolate tests without restarting Anvil |
| `setStorageAt` | Force contract state (e.g. token balances) |
| `setCode` | Replace contract code (mocks on a fork) |

Example: fund a test account with USDC on a mainnet fork by impersonating a holder.

```ts
import { describe, it, beforeEach, afterEach, expect } from 'vitest'

const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const HOLDER = process.env.USDC_HOLDER as `0x${string}` | undefined // an address holding USDC at the pinned block
if (!HOLDER) throw new Error('USDC_HOLDER must be set to a funded address at the fork block')
const USER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'  // anvil account 0

let snap: `0x${string}`
beforeEach(async () => { snap = await testClient.snapshot() })
afterEach(async () => { await testClient.revert({ id: snap }) })

describe('deposit flow', () => {
  it('transfers USDC to the user', async () => {
    // Arrange
    await testClient.impersonateAccount({ address: HOLDER })
    await testClient.setBalance({ address: HOLDER, value: parseEther('1') })

    // Act
    const hash = await testClient.writeContract({
      account: HOLDER, address: USDC, abi: erc20Abi, functionName: 'transfer', args: [USER, 1_000_000n],
    })
    await testClient.waitForTransactionReceipt({ hash })

    // Assert
    const bal = await testClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [USER] })
    expect(bal >= 1_000_000n).toBe(true)
  })
})
```

Verify that the chosen holder actually holds enough at the pinned block; pick one with `cast call` before committing the test.

## Testing Reverts

```ts
import { BaseError, ContractFunctionRevertedError } from 'viem'

it('rejects over-withdrawal with custom error', async () => {
  const err = await testClient
    .simulateContract({ account: USER, address: VAULT, abi: vaultAbi, functionName: 'withdraw', args: [10n ** 30n] })
    .catch((e) => e)

  expect(err).toBeInstanceOf(BaseError)
  const revert = (err as BaseError).walk((e) => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError
  expect(revert.data?.errorName).toBe('InsufficientShares')
})
```

## React Hooks with the wagmi Mock Connector

```tsx
import { createConfig, http, WagmiProvider } from 'wagmi'
import { mock } from 'wagmi/connectors'
import { foundry } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { connect } from '@wagmi/core'

const config = createConfig({
  chains: [foundry],
  connectors: [mock({ accounts: ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'] })],
  transports: { [foundry.id]: http('http://127.0.0.1:8545') },
})

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

it('shows the connected address', async () => {
  render(<AccountBadge />, { wrapper })
  await connect(config, { connector: config.connectors[0] })   // connect from '@wagmi/core'
  expect(await screen.findByText(/0xf39F/i)).toBeInTheDocument()
})
```

The mock connector signs with Anvil's unlocked accounts through the RPC, so writes hit the local chain. Its `features` option can simulate errors such as rejected connections or signatures for error-state tests.

## End-to-End with a Real Wallet

| Option | Notes |
|--------|-------|
| Synpress (Playwright + MetaMask) | Drives the real extension; caches a prepared wallet state; slowest, most realistic |
| Injected EIP-1193 test provider | Fast; bypasses wallet UI; good for most flows |
| Smart-account / embedded wallets | Use the vendor's test mode |

E2E rules:
- Point the app at Anvil via an env var (`NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545`) and chain ID 31337 for CI.
- Seed state with the test client before each spec (snapshot/revert).
- Assert on-chain results, not only UI text.
- Keep a small suite of real-wallet E2E for critical flows (connect, approve, main action); cover the rest with mock connector tests.

## CI Setup

```yaml
jobs:
  web3-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: foundry-rs/foundry-toolchain@v1
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: anvil --fork-url "${{ secrets.MAINNET_RPC_URL }}" --fork-block-number 21000000 &
      - run: npx wait-on tcp:127.0.0.1:8545
      - run: npm test
```

## Pitfalls

- Forking at `latest`: flaky tests as state changes.
- Using JavaScript `number` for token amounts; use `bigint`.
- Sharing one Anvil instance across parallel test files without snapshots.
- Testing only happy paths; cover rejection, wrong chain, insufficient allowance, reverts and pending states.

## Checklist

- [ ] Forked tests pinned to a block
- [ ] Snapshot/revert isolation per test
- [ ] Reverts asserted by custom error name
- [ ] Hooks tested with the mock connector, including error features
- [ ] Minimal real-wallet E2E for critical flows; CI runs Anvil
