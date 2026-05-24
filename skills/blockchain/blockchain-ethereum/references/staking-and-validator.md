# Staking and Validators

## Validator Requirements

| Requirement | Value |
|-------------|-------|
| Minimum stake | 32 ETH |
| Activation queue | ~4–9 days (varies by queue size) |
| Churn limit | `max(4, active_validators // 16384)` per epoch |
| Exit queue | Same as activation |
| Withdrawal delay | ~27 hours after exit (Capella+) |

## Deposit Contract

```
Address: 0x00000000219ab540356cBB839Cbe05303d7705Fa
```

Deposit data:
```python
deposit_message = DepositMessage(
    pubkey=validator_pubkey,
    withdrawal_credentials=withdrawal_creds,
    amount=32_000_000_000  # in gwei
)
domain = compute_domain(DOMAIN_DEPOSIT)
signing_root = compute_signing_root(deposit_message, domain)
signature = bls.Sign(validator_privkey, signing_root)
```

## Key Hierarchy

```
┌─────────────────────────────┐
│   Mnemonic (BIP-39 / BIP-32)│
└──────────┬──────────────────┘
           │ derivation path: m/12381/3600/0/0/0
           ▼
┌─────────────────────────────┐
│   Withdrawal Private Key     │ ← controls withdrawal credentials
│   Withdrawal Public Key      │
└──────────┬──────────────────┘
           │
           │ signing key derivation: unstoppable
           ▼
┌─────────────────────────────┐
│   Validator Private Key      │ ← signs attestations & blocks
│   Validator Public Key       │
└─────────────────────────────┘
```

- **Withdrawal key**: derives from mnemonic, controls ETH withdrawals
- **Validator key**: hot key, derived from withdrawal key using `derive_withdrawal_from_seed` (unstoppable derivation)
- Both participate in BLS signature scheme (BLS12-381)

## Withdrawal Credentials

| Prefix | Format | Status |
|--------|--------|--------|
| `0x00` | `0x00` + `BLS_PUBKEY` (48 bytes) | Legacy — must be updated to 0x01 |
| `0x01` | `0x01` + `0x00*11` + `execution_address` (20 bytes) | Current — enables automatic withdrawals |

Upgrade: sign `BLSToExecutionChange` with withdrawal key.

## Effective Balance

- Rounded down to 1 ETH granularity
- `effective_balance = min(balance - (balance % 1_000_000_000), 32_000_000_000)`
- Updated only at epoch boundaries
- Max: 32 ETH (excess > 32 auto-withdrawn after Capella)

## Activation Queue

```python
def process_registry_updates(state: BeaconState) -> None:
    pending_validators = [
        v for v in state.validators
        if v.activation_eligibility_epoch != FAR_FUTURE_EPOCH
        and v.activation_epoch == FAR_FUTURE_EPOCH
    ]
    churn_limit = get_validator_churn_limit(state)
    for validator in pending_validators[:churn_limit]:
        validator.activation_epoch = compute_activation_exit_epoch(state.current_epoch)
```

## Attestation Rewards

Rewards calculated per epoch using `get_attestation_deltas`:

```python
def get_attestation_deltas(state: BeaconState) -> tuple:
    rewards = [0] * len(state.validators)
    penalties = [0] * len(state.validators)
    total_balance = get_total_active_balance(state)

    for validator_index, v in enumerate(state.validators):
        # Source vote
        if has_voted_correct_source(v, state):
            rewards[i] += get_base_reward(state, v) * timely_source_weight // weight_denominator
        else:
            penalties[i] += get_base_reward(state, v) * timely_source_weight // weight_denominator

        # Target vote
        if has_voted_correct_target(v, state):
            rewards[i] += get_base_reward(state, v) * timely_target_weight // weight_denominator
        else:
            penalties[i] += get_base_reward(state, v) * timely_target_weight // weight_denominator

        # Head vote
        if has_voted_correct_head(v, state):
            rewards[i] += get_base_reward(state, v) * timely_head_weight // weight_denominator

    return rewards, penalties
```

Base reward: `effective_balance * base_reward_factor // integer_sqrt(total_active_balance)`

### Reward Weights (Altair+)

| Component | Weight | Share |
|-----------|--------|-------|
| `TIMELY_SOURCE_WEIGHT` | 14 | ~14% |
| `TIMELY_TARGET_WEIGHT` | 26 | ~26% |
| `TIMELY_HEAD_WEIGHT` | 14 | ~14% |
| `SYNC_REWARD_WEIGHT` | 2 | ~2% |
| `PROPOSER_WEIGHT` | 8 | ~8% (attestation inclusion) |
| `WEIGHT_DENOMINATOR` | 64 | total |

### Annual Yield

- **Ideal** network: ~5–7% APR (32 validators running optimally)
- **Realistic**: ~3.5–5% (sub-optimal attestations, proposal luck, MEV)

## MEV-Boost

```
                    ┌──────────┐
  Proposer ────────►│  MEV-Boost│◄──────── Builder 1
                    │  (Relay)  │
                    │           │◄──────── Builder 2
                    │           │◄──────── Builder 3
                    └─────┬─────┘
                          │ blinded beacon block (execution payload header)
                          ▼
                     ┌──────────┐
                     │  Beacon  │
                     │  Chain   │
                     └──────────┘
```

### Flow

1. **Proposer** connects to MEV-Boost at slot start
2. **Builders** submit bundles (blocks including MEV extraction) to relays
3. **Relay** validates blocks, sends proposals to proposer
4. **Proposer** selects highest-paying execution payload header
5. Proposer signs blinded block (header + attestation)
6. **Relay** reveals full block body after proposer signature
7. Block included on-chain; proposer receives payment from builder

### Value Extraction Sources

| Source | Description |
|--------|-------------|
| DEX arbitrage | Triangular, cross-pool |
| Sandwich attacks | Front-run + back-run user trades |
| Liquidations | DeFi protocol liquidations |
| NFT mints/ trades | Priority gas auctions |
| L1→L2 transactions | Sequencer MEV |

## Distributed Validator Technology (DVT)

### Obol

- **DKG** (Distributed Key Generation): validators collaboratively generate BLS key shares
- **Charon**: middleware running QBFT consensus among validator nodes
- Multi-operator: 4+ nodes, each holding a key share
- `n` nodes needed for signature threshold: typically `3f+1` (fault-tolerant)

### SSV (Secret Shared Validator)

- **DKG**: shamir-secret-sharing based BLS keys
- **SSV network**: operators in a permissionless marketplace
- Pay-per-operator (SSV token)
- `threshold t` of `n` operators needed to sign

### QBFT Consensus (used by Charon)

```python
# Simplified QBFT for DVT:
def qbft_round(proposal, validators, threshold):
    # Round 1 (Pre-prepare): Leader proposes block + partial signature
    # Round 2 (Prepare): Each validator broadcasts prepared message
    #   Wait for 2f+1 "prepared" messages
    # Round 3 (Commit): Each validator broadcasts commit with partial sig
    #   Wait for 2f+1 "commit" messages
    # Aggregate: Combine 2f+1 partial signatures into full BLS signature
    return full_signature  # Can be used on-chain
```

## Slashing Penalties

| Offense | Immediate Penalty | Correlation Penalty |
|---------|------------------|---------------------|
| Double vote (proposer slashing) | `effective_balance // 512` | `min(effective_balance * 3, total_balance // 64)` |
| Surround vote (attester slashing) | Same | Same |
| Proposer equivocation | Same | Same |

### Correlation Penalty

- If few validators slashed same epoch: small correlation penalty
- If many validators slashed (e.g., cloud provider outage, same operator): `total_balance // 64` + 3x effective balance penalty
- Worst case: slashed validator loses ~1–32 ETH

### Exit Queue

After slashing:
1. Slashed flag set, forced exit after 8192 epochs (~36 days)
2. Withdrawable after `MIN_VALIDATOR_WITHDRAWABILITY_DELAY` (256 epochs, ~27 hours on Capella+)
3. Full withdrawal to execution address (0x01 creds only)
