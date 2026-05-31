# Gas Optimization & Management for Web3 dApps

## Overview

Gas optimization in web3 dApp development spans two domains: (1) optimizing smart contract code to minimize gas costs, and (2) managing gas from the frontend — estimating accurately, simulating before sending, and handling gas price spikes and failures. This reference covers gas estimation strategies, EIP-1559 fee management, gas simulation patterns, user-facing gas UX, and integration with gas oracles and relayers for meta-transactions.

## Core Architecture Concepts

### Gas Estimation Layers

```
User Action
  │
  ├─ 1. Simulation (eth_call) → Dry-run the transaction, catch reverts
  │
  ├─ 2. Gas Estimation (eth_estimateGas) → Get gas units from node
  │
  ├─ 3. Fee Estimation (eth_feeHistory / eth_maxPriorityFeePerGas)
  │     → EIP-1559: base fee + priority fee
  │     → Legacy: gas price oracle
  │
  ├─ 4. Gas Limit Calculation → estimated gas + buffer (10-20%)
  │
  └─ 5. Transaction Submission → with computed fee parameters
```

### Gas Units vs Gas Price vs Total Cost

| Term | Definition | Denomination |
|---|---|---|
| Gas units | Computational work required | integer (e.g., 21000 for ETH transfer) |
| Base fee | Protocol-set fee per gas unit (EIP-1559) | gwei (burned) |
| Priority fee (tip) | User tip to validator | gwei |
| Max fee | User's maximum willingness to pay | gwei (base + tip) |
| Max priority fee | User's max tip | gwei |
| Total cost | Gas units × (base fee + priority fee) | ETH |

### EIP-1559 Fee Market Dynamics

```
Block fullness → Base fee adjustment:
  - Gas used > 50% of block gas limit → base fee increases (max +12.5%)
  - Gas used < 50% → base fee decreases (max -12.5%)
  - Gas used = 50% → base fee unchanged

Priority fee (tip) dynamics:
  - Independent of base fee — set by user-market
  - Higher tip = faster inclusion (competitive during congestion)
  - Lower tip = slower inclusion (may wait multiple blocks)
```

## Architecture Decision Trees

### Gas Strategy Selection

```
dApp gas management approach?
├── User pays their own gas
│   ├── Simple UX acceptable? → Direct tx with viem/wagmi `sendTransaction`
│   ├── Complex UX need? → Account abstraction (ERC-4337) with paymaster
│   └── High-frequency txs? → Gas station network / pre-paid gas credits
├── dApp pays gas (meta-tx)
│   ├── EIP-2771 → Minimal forwarder-based meta-tx
│   ├── ERC-4337 → UserOperation with paymaster sponsorship
│   └── Custom relayer → Centralized relay with gas tank
└── Hybrid (user chooses)
    ├── Option A: User pays (current gas price shown)
    └── Option B: dApp pays (app earns via fees/subscription)
```

### Estimation Strategy Decision Tree

```
Transaction type?
├── ETH/ERC20 transfer → Known gas (21000 / 65000) → No estimation needed
├── Simple contract call → eth_estimateGas → +10% buffer
├── Complex contract call (multi-hop swap, lending)
│   ├── Contains dynamic loops? → Simulate with worst-case + 20% buffer
│   └── Contains nested calls? → Simulate entire call path
├── Batch transaction → Gas per sub-tx + overhead
└── Unknown new contract → Pre-flight simulation + 30% buffer
```

## Implementation Strategies

### Fee Estimation with viem

```typescript
import { createPublicClient, http, parseGwei } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
  chain: mainnet,
  transport: http()
})

// EIP-1559 fee estimation
async function estimateFees() {
  // Get current base fee from latest block
  const block = await client.getBlock({ blockTag: 'latest' })
  const baseFee = block.baseFeePerGas || 0n

  // Get fee history for priority fee estimation
  const feeHistory = await client.getFeeHistory({
    blockCount: 5,
    rewardPercentiles: [25, 50, 75, 95]
  })

  // Calculate recommended priority fee (p50 of recent blocks)
  const avgPriorityFee = feeHistory.reward
    .map(r => r[1]) // p50
    .reduce((a, b) => a + b, 0n) / BigInt(feeHistory.reward.length)

  // Max fee = 2 * base fee + avg priority (safe multiplier for base fee volatility)
  const maxFee = (baseFee * 2n) + avgPriorityFee

  return {
    baseFee: baseFee,
    priorityFee: avgPriorityFee,
    maxFeePerGas: maxFee,
    maxPriorityFeePerGas: avgPriorityFee
  }
}
```

### Gas Estimation with Simulation

```typescript
// Pre-flight simulation to catch reverts and estimate gas accurately
async function simulateAndEstimate(
  client: PublicClient,
  tx: Partial<TransactionRequest>
): Promise<{ gasEstimate: bigint; willRevert: boolean; error?: string }> {
  try {
    const gas = await client.estimateGas(tx)
    // Add 20% buffer for dynamic gas consumption
    return {
      gasEstimate: (gas * 120n) / 100n,
      willRevert: false
    }
  } catch (error) {
    // eth_estimateGas reverts if the tx would revert
    const revertReason = extractRevertReason(error)
    return {
      gasEstimate: 0n,
      willRevert: true,
      error: revertReason
    }
  }
}
```

### Gas Price Oracle Pattern

```typescript
// Multi-source gas price oracle with fallback
interface GasPrice {
  slow: bigint    // ~5 min wait
  standard: bigint // ~1 min wait
  fast: bigint     // ~15 sec wait
  instant: bigint  // next block
}

async function getGasPrices(chainId: number): Promise<GasPrice> {
  const providers = [
    fetchFromEtherscan(chainId),
    fetchFromBlockNative(chainId),
    estimateFromChain(chainId)
  ]

  // Use first successful provider, fallback to chain estimation
  for (const provider of providers) {
    try {
      return await withTimeout(provider, 2000)
    } catch {
      continue
    }
  }

  // Fallback: estimate directly from chain
  return estimateFromChain(chainId)
}
```

### Gas Tank / Relayer Pattern

```typescript
// Backend relayer for meta-transactions
class GasRelayer {
  private signer: PrivateKeyAccount
  private gasTank: bigint

  constructor(privateKey: Hex, initialFunds: bigint) {
    this.signer = privateKeyToAccount(privateKey)
    this.gasTank = initialFunds
  }

  async relayTransaction(
    to: Address,
    data: Hex,
    value: bigint = 0n
  ): Promise<Hash> {
    // 1. Estimate gas
    const gasEstimate = await this.client.estimateGas({
      to, data, value,
      account: this.signer.address
    })

    // 2. Check gas tank balance
    const balance = await this.client.getBalance({
      address: this.signer.address
    })
    const estimatedCost = gasEstimate * (await this.getCurrentGasPrice())
    if (balance < estimatedCost) {
      throw new Error('Gas tank insufficient')
    }

    // 3. Send transaction
    const hash = await this.client.sendTransaction({
      to, data, value,
      account: this.signer,
      gas: gasEstimate * 120n / 100n
    })

    // 4. Track gas spent
    const receipt = await this.client.waitForTransactionReceipt({ hash })
    this.gasTank -= receipt.gasUsed * receipt.effectiveGasPrice

    return hash
  }

  // Refill gas tank via cron/scheduled job
  async refillGasTank(amount: bigint) {
    // Transfer ETH from treasury to relayer address
    const hash = await this.treasurySigner.sendTransaction({
      to: this.signer.address,
      value: amount
    })
    await this.client.waitForTransactionReceipt({ hash })
    this.gasTank += amount
  }
}
```

### ERC-4337 Paymaster Pattern

```typescript
// Sponsored transaction via ERC-4337 paymaster
async function sponsorUserOp(
    userOp: UserOperation,
    paymasterClient: PaymasterClient
): Promise<UserOperation> {
  // Request paymaster sponsorship
  const paymasterData = await paymasterClient.paymasterData({
    userOp,
    // Paymaster verifies the operation and agrees to pay
    // Usually requires the userOp to call a specific contract
  })

  return {
    ...userOp,
    paymasterAndData: paymasterData
  }
}
```

## Integration Patterns

### Gas UX Patterns

| UX Pattern | Description | When to Use |
|---|---|---|
| **Estimated gas cost display** | Show estimated cost in USD before confirmation | Always — users need to know cost |
| **Gas price selector** | Slow / standard / fast tiers | When user pays gas directly |
| **Gasless onboarding** | First 3-5 txs sponsored | User acquisition phase |
| **Gas station credits** | Pre-purchase gas credits | High-frequency dApp users |
| **Automatic gas bumping** | Cancel + retry with higher tip if stuck | DeFi transactions with time sensitivity |
| **Gas price alerts** | Notify user when gas drops below threshold | Users with pending operations |
| **Batch transactions** | Combine multiple operations | Multi-step workflows |

### Gas Monitoring Dashboard Pattern

```typescript
// Real-time gas monitoring for operations team
interface GasMetrics {
  chainId: number
  currentBaseFee: bigint
  currentPriorityFee: bigint
  estimatedCostByOperation: Record<string, bigint>
  gasTankBalance: bigint
  dailyGasSpend: bigint
  pendingRelayTxs: number
  failedRelayTxs: number
}

async function monitorGasMetrics(chainId: number): Promise<GasMetrics> {
  const [block, pendingTxCount, relayerBalance] = await Promise.all([
    client.getBlock({ blockTag: 'latest' }),
    client.getBlock({ blockTag: 'pending' }),
    client.getBalance({ address: relayerAddress })
  ])

  return {
    chainId,
    currentBaseFee: block.baseFeePerGas || 0n,
    currentPriorityFee: await estimatePriorityFee(client),
    estimatedCostByOperation: await calculateOperationCosts(client),
    gasTankBalance: relayerBalance,
    dailyGasSpend: await getDailyGasSpend(),
    pendingRelayTxs: parseInt(pendingTxCount.transactions.length.toString()),
    failedRelayTxs: await getFailedTxCount()
  }
}
```

## Performance Optimization

### Gas Estimation Caching

```typescript
// Cache gas estimates with TTL to reduce RPC calls
class GasEstimateCache {
  private cache = new Map<string, { estimate: bigint; timestamp: number }>()
  private ttlMs = 30_000 // 30 seconds

  async getOrEstimate(
    client: PublicClient,
    tx: Partial<TransactionRequest>
  ): Promise<bigint> {
    const key = this.makeKey(tx)
    const cached = this.cache.get(key)

    if (cached && Date.now() - cached.timestamp < this.ttlMs) {
      return cached.estimate
    }

    const estimate = await client.estimateGas(tx)
    this.cache.set(key, { estimate, timestamp: Date.now() })
    return estimate
  }

  private makeKey(tx: Partial<TransactionRequest>): string {
    return `${tx.to}-${tx.data?.slice(0, 10)}-${tx.value?.toString()}`
  }
}
```

### Batch Gas Estimation (Multicall)

```typescript
// Estimate gas for multiple operations at once
async function batchEstimateGas(
  client: PublicClient,
  operations: Array<{
    to: Address
    data: Hex
    value?: bigint
    from: Address
  }>
): Promise<bigint[]> {
  // Use eth_estimateGas in batch via multicall
  const batchCall = encodeMulticall(
    operations.map(op => ({
      target: op.to,
      callData: op.data,
      value: op.value || 0n
    }))
  )

  // Simulate the batch call to estimate total gas
  const totalGas = await client.estimateGas({
    to: multicallAddress,
    data: batchCall,
    account: operations[0].from
  })

  // Distribute proportionally (simple heuristic)
  const perOp = totalGas / BigInt(operations.length)
  return operations.map(() => perOp * 120n / 100n)
}
```

## Security Considerations

- **EIP-1559 fee underestimation**: If max fee is set too low relative to base fee spikes, transactions can get stuck for hours. Use `2 * current base fee` as minimum max fee.
- **Gas estimation manipulation**: Malicious contracts can return artificially high gas estimates during simulation but consume less during execution (or vice versa). Always add a buffer but cap the max.
- **Frontrunning gas estimation**: Observing a user's gas estimation can leak information about intended actions. Consider using private mempool (Flashbots) for high-value transactions.
- **Relayer gas tank draining**: Without proper access controls, a relayer can be drained by submitting expensive operations. Implement per-user gas limits and operation cost caps.
- **Paymaster insolvency**: ERC-4337 paymasters must maintain sufficient balance for all pending UserOperations. Monitor paymaster balance and implement a deposit threshold alert.
- **Meta-tx replay attacks**: Signed meta-transactions can be replayed on different chains. Include chain ID in the signed data (EIP-712 domain separator).

## Operational Excellence

### Gas Budget Management

```yaml
# gas-budget.yaml
chains:
  ethereum-mainnet:
    daily_budget_eth: 0.5
    alert_threshold_eth: 0.4
    max_tx_cost_eth: 0.01
    relayer_address: "0x..."
    treasury_address: "0x..."

  polygon-mainnet:
    daily_budget_matic: 1000
    alert_threshold_matic: 800
    max_tx_cost_matic: 10
    relayer_address: "0x..."
```

```typescript
// Gas budget enforcer
class GasBudgetEnforcer {
  async canProceed(
    chainId: number,
    estimatedCost: bigint
  ): Promise<{ allowed: boolean; reason?: string }> {
    const budget = await this.getRemainingBudget(chainId)
    const daily = await this.getDailyUsage(chainId)

    if (daily + estimatedCost > budget.dailyLimit) {
      return { allowed: false, reason: 'Daily gas budget exceeded' }
    }

    if (estimatedCost > budget.maxPerTx) {
      return { allowed: false, reason: 'Transaction exceeds max cost per tx' }
    }

    return { allowed: true }
  }
}
```

## Testing Strategy

### Gas Estimation Tests

```typescript
describe('Gas estimation', () => {
  it('should estimate with buffer within expected range', async () => {
    const tx = createSwapTransaction(usdc, weth, parseUnits('1000', 6))
    const estimate = await simulateAndEstimate(client, tx)

    expect(estimate.willRevert).toBe(false)
    expect(estimate.gasEstimate).toBeGreaterThan(50000n)  // min reasonable
    expect(estimate.gasEstimate).toBeLessThan(1000000n)   // max reasonable
  })

  it('should detect revert on invalid operation', async () => {
    const tx = createSwapTransaction(weth, usdc,
      parseUnits('1000000', 18)) // far too large

    const estimate = await simulateAndEstimate(client, tx)
    expect(estimate.willRevert).toBe(true)
    expect(estimate.error).toBeDefined()
  })
})
```

### Gas Benchmark Tests

```typescript
// Track gas costs in CI to detect regressions
describe('Gas benchmarks', () => {
  it('swap gas should not exceed baseline', async () => {
    const tx = await createAndSignSwap(usdc, weth, parseUnits('100', 6))
    const receipt = await sendAndWait(client, tx)
    const baseline = parseGwei('150000') // 150k gas units

    expect(receipt.gasUsed).toBeLessThanOrEqual(baseline)
  })

  it('batch approve + swap should be cheaper than individual', async () => {
    const batchGas = await estimateBatchSwap(usdc, weth, 5)
    const individualGasSum = await estimateIndividualSwaps(usdc, weth, 5)

    // Batch should be at least 20% cheaper
    expect(batchGas).toBeLessThan(individualGasSum * 80n / 100n)
  })
})
```

## Common Pitfalls

| Pitfall | Consequence | Prevention |
|---|---|---|
| Using `eth_estimateGas` without buffer | Out-of-gas failures in production | Always add 10-30% buffer |
| Hardcoding gas limits | Broken after contract upgrades | Estimate dynamically per call |
| Ignoring EIP-1559 base fee volatility | Transactions stuck for hours | Set max fee to 2-3x current base fee |
| Single gas price provider | Stale prices during provider outage | Use multi-provider oracle |
| No gas estimation caching | Excessive RPC calls, rate limiting | Cache estimates with 15-30s TTL |
| Frontend-only gas estimation | User can skip estimation and get stuck | Require estimation step in UX flow |
| Not handling `eth_estimateGas` revert | Silent failures, poor UX | Surface revert reason to user |
| Relayer with too little ETH buffer | Gas tank depleted mid-day | Maintain 2-3x daily budget as buffer |

## Key Takeaways

1. **Simulate before estimating** — `eth_estimateGas` reverts on simulation failure, which is your first line of defense against bad transactions.
2. **Always buffer gas estimates** — 10-20% above the estimate covers dynamic execution paths and state-dependent gas costs.
3. **Monitor gas prices from multiple sources** — single-provider gas oracles are a single point of failure and can provide stale data.
4. **ERC-4337 paymasters are the production pattern for gasless UX** — they offer the best user experience with programmable sponsorship rules.
5. **Cache gas estimates aggressively** — estimation requires state access and is one of the most expensive RPC operations.
6. **Track gas budget like any operational cost** — relayer gas spend should be monitored, budgeted, and alerted on in production.
7. **EIP-1559 requires adaptive fee setting** — the old `gasPrice` approach no longer works; use `maxFeePerGas` and `maxPriorityFeePerGas` correctly.
8. **Batch transactions when possible** — multicall-style batching can reduce total gas by 30-50% compared to individual transactions.