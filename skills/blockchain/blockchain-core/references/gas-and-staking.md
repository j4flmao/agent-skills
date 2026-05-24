# Gas, Fees & Staking Mechanics

## Ethereum Gas Model

### Gas Accounting (EIP-1559)

```
Block Gas Limit: 30M gas
Base Fee: burned (adjusted per block, +/-12.5%)
Priority Fee (tip): goes to validator
Max Fee = Base Fee + Priority Fee (user specifies)
```

```go
// Go — EIP-1559 gas calculation
func CalculateEffectiveGasTip(baseFee *big.Int, maxFee, maxPriorityFee *big.Int) *big.Int {
    // maxFee = max total fee user is willing to pay
    // maxPriorityFee = max tip user is willing to pay
    if maxFee.Cmp(baseFee) < 0 {
        return nil // insufficient total fee
    }
    effectiveTip := new(big.Int).Sub(maxFee, baseFee)
    if effectiveTip.Cmp(maxPriorityFee) > 0 {
        effectiveTip = maxPriorityFee
    }
    return effectiveTip
}

func CalculateNextBaseFee(currentBaseFee *big.Int, gasUsed, gasLimit uint64) *big.Int {
    target := gasLimit / 2
    if gasUsed == target {
        return currentBaseFee // no change
    }
    // +12.5% if usage > target, -12.5% if usage < target
    delta := new(big.Int).Div(currentBaseFee, big.NewInt(8))
    if gasUsed > target {
        return new(big.Int).Add(currentBaseFee, delta)
    }
    return new(big.Int).Sub(currentBaseFee, delta)
}
```

### Gas Costs by Operation

| Operation | Gas | Description |
|-----------|-----|-------------|
| `ADD` | 3 | Arithmetic |
| `SLOAD` | 100 (warm) / 2100 (cold) | Storage read |
| `SSTORE` | 100 (set to nonzero) / 20000 (nonzero to zero) | Storage write |
| `BALANCE` | 100 (warm) / 2600 (cold) | Account balance |
| `CALL` | 100 (warm) / 2600 (cold) | External call |
| `SELFDESTRUCT` | 5000 | Contract destruction |
| `LOG0` | 375 | Event emission |
| `SHA3` | 30 + 6/word | Keccak256 hash |
| Calldata (nonzero) | 16 | Per byte |
| Calldata (zero) | 4 | Per byte |

### Solana Gas (Compute Units)

- **Compute Unit Limit**: 200K CU per transaction (default), 1.4M CU max
- **Compute Unit Price**: 0.000005 SOL per CU (minimum)
- **Account read**: 10-100 CU
- **Program execution**: depends on BPF instruction count

```rust
// Rust — Solana compute budget
use solana_sdk::compute_budget::ComputeBudgetInstruction;

let tx = Transaction::new_with_payer(
    &[
        ComputeBudgetInstruction::set_compute_unit_limit(500_000),
        ComputeBudgetInstruction::set_compute_unit_price(1_000), // micro-lamports/CU
        instruction,
    ],
    Some(&payer.pubkey()),
);
```

## Staking Mechanics

### Ethereum Staking

| Parameter | Value |
|-----------|-------|
| Minimum stake | 32 ETH |
| Validator activation | Queue + 4 epochs (~51 min) |
| Validator exit | Queue + 27 hours (max) |
| Base reward | Proportional to 1/sqrt(total_stake) |
| Max annual issuance | ~0.5-1% of total ETH |
| Slashing penalty | 1-32 ETH (up to full stake) |

```go
// Go — beacon chain reward calculation
func CalculateBaseReward(effectiveBalance uint64, totalStake *big.Int) uint64 {
    const BASE_REWARD_FACTOR = 64
    return effectiveBalance * BASE_REWARD_FACTOR /
        integer.Squareroot(totalStake)
}

func CalculateEpochReward(validator *Validator, state *BeaconState) uint64 {
    base := CalculateBaseReward(validator.EffectiveBalance, state.TotalActiveStake())
    // Apply inclusion delay modifier
    inclusionReward := base * (8 - min(8, validator.InclusionDelay())) / 8
    // Add attestation reward
    return base + inclusionReward
}
```

### Cosmos Staking (Tendermint)

- **Bonded ratio**: variable (inflation adjusts to target ~67% bonded)
- **Unbonding period**: 21 days
- **Slashing**: 5% for downtime, 5-10% for double sign
- **Commission**: Validator-set, typically 5-10%

### Solana Staking

- **Warm-up**: 2-4 epochs for activation
- **Cool-down**: 2-4 epochs for deactivation
- **Inflation**: Initial 8% → disinflation to 1.5% long-term
- **Stake pools**: Marinade, Jito, etc. (liquid staking derivatives)

### Cardano Staking

- **Non-custodial**: Delegation without transferring ADA
- **Pools**: Stake pool operators (SPOs) run nodes
- **Rewards**: Proportional to delegation + pool performance
- **No slashing**: No penalty for misbehavior (limited finality model)

## Fee Market Design

### Priority Fee Auction (pre-EIP-1559)

```
Users bid gas price → miners include highest bids
Problem: fee estimation is complex, overpayment common
```

### EIP-1559 (current Ethereum)

```
Base fee (algorithmic, burned) + Tip (optional, to validator)
Advantage: predictable fees, no bidding war, deflationary pressure
```

### Solana Fee Model

```
Set compute unit price (priority fee)
minimum fee = signature_fee + (compute_units × compute_unit_price)
base fee = 5000 lamports/signature
```

## MEV (Maximal Extractable Value)

### MEV Sources

```
DEX arbitrage  ──────────────> buy low on A, sell high on B
Liquidations  ──────────────> liquidate undercollateralized positions
Sandwich      ──────────────> front-run then back-run a trade
NFT sniping   ──────────────> buy underpriced NFTs before market
```

### MEV Mitigation

| Technique | Description | Example |
|-----------|-------------|---------|
| Commit-reveal | Submit hash, reveal later | Fair sequencing |
| Batch auctions | Process orders in batches | CowSwap, 1inch |
| Encrypted mempool | Encrypt txs until inclusion | Shutter, SUAVE |
| Threshold decryption | Threshold network decrypts | Flashbots MEV-share |

### PBS (Proposer-Builder Separation)

```go
type Builder struct {
    mempool *Mempool
    bundle  *MEVBundle
}

func (b *Builder) BuildBlock(header *ExecutionHeader) *BuiltBlock {
    // 1. Include MEV bundles from relays
    // 2. Fill remaining space with regular transactions
    // 3. Submit to relay for proposer selection
    return &BuiltBlock{
        Blocks: append(b.bundle.Txs, b.mempool.TopGas(remainingGas)...),
    }
}
```
