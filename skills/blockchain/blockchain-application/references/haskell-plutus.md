# Haskell & Plutus (Cardano)

## eUTxO Model

```
Cardano uses Extended Unspent Transaction Outputs
Each UTxO carries:
- Value (ADA + native tokens)
- Datum (locked data, like contract state)
- Address (validator script hash)

Spending condition:
- Validator script runs on (Datum + Redeemer + Context)
- Must return True for spending to be allowed
```

### UTxO vs eUTxO vs Account

| Feature | Bitcoin UTxO | Cardano eUTxO | Ethereum Account |
|---------|-------------|---------------|-----------------|
| State location | Outputs | Outputs + Datum | Contract storage |
| Validation | Script | Script + Datum + Redeemer | Transaction execution |
| Parallelism | High | High | Low |
| Composability | Low | Medium | High |
| State size | UTxO set | UTxO set + datum | State trie |

## Plutus Validator

```haskell
-- Plutus Tx — on-chain validator
{-# INLINABLE mkValidator #-}
mkValidator :: BuiltinData -> BuiltinData -> BuiltinData -> ()
mkValidator datum redeemer ctx =
    -- Validate spending condition
    traceIfFalse "wrong redeemer" (checkRedeemer datum redeemer)
    `orElse`
    traceIfFalse "invalid context" (checkContext ctx)

  where
    checkRedeemer :: BuiltinData -> BuiltinData -> Bool
    checkRedeemer d r = d == r  -- simple equality check

    checkContext :: BuiltinData -> Bool
    checkContext ctx = True  -- additional checks

-- Compile to UPLC (Untyped Plutus Core)
validator :: Validator
validator = mkValidatorScript $$(compile [|| mkValidator ||])
```

### Parameterized Validator

```haskell
data MyDatum = MyDatum
    { beneficiary :: PubKeyHash
    , deadline    :: POSIXTime
    }

data MyRedeemer = Collect | Refund

{-# INLINABLE mkValidator #-}
mkValidator :: MyDatum -> MyRedeemer -> ScriptContext -> Bool
mkValidator datum redeemer ctx =
    case redeemer of
        Collect -> txSignedBy info (beneficiary datum)
                && from (txInfoValidRange info) <= deadline datum
        Refund  -> txSignedBy info (beneficiary datum)
                && from (txInfoValidRange info) > deadline datum
  where
    info = scriptContextTxInfo ctx
```

## Marlowe (DSL for Financial Contracts)

```haskell
-- Marlowe contract: simple escrow
let
    contract = When [
        (Case (Deposit alice alice ada 1000_000_000)
            (When [
                (Case (Choice (ChoiceId "action" alice) [0])
                    (Pay alice (Account bob) ada 1000_000_000 Close)),
                (Case (Choice (ChoiceId "action" alice) [1])
                    (Pay alice (Account alice) ada 1000_000_000 Close))
            ] 100 (Close)))
    ] 1000 Close
```

## Plutus Script Types

### Spending Script

```haskell
-- Controls spending of UTxO at script address
spendingValidator :: Validator
spendingValidator = mkValidatorScript $$(compile [|| typedValidator ||])
```

### Minting Script

```haskell
-- Controls minting/burning of native tokens
{-# INLINABLE mkPolicy #-}
mkPolicy :: PubKeyHash -> () -> ScriptContext -> Bool
mkPolicy pkh () ctx = txSignedBy (scriptContextTxInfo ctx) pkh

policy :: MintingPolicy
policy = mkMintingPolicyScript $$(compile [|| mkPolicy ||])
```

### Staking Script

```haskell
-- Controls reward withdrawals from staking address
stakingValidator :: StakeValidator
stakingValidator = mkStakeValidatorScript $$(compile [|| mkStakeValidator ||])
```

## Plutus Application Backend (PAB)

```haskell
-- Contract handler — off-chain code
type MySchema = Endpoint "initialize" Integer
             .\/ Endpoint "redeem" ()

myContract :: Contract () MySchema Text ()
myContract = do
    void $ awaitPromise $ endpoint @"initialize" $ \amount -> do
        let tx = mustPayToOtherScript validator (Datum $ toBuiltinData datum) value
        ledgerTx <- submitTx tx
        awaitTxConfirmed $ txId ledgerTx

    void $ awaitPromise $ endpoint @"redeem" $ \() -> do
        -- Find UTxO and spend
        utxos <- utxosAt scriptAddress
        let tx = collectFromScript utxos redeemer
            <> mustBeSignedBy walletPKH
        ledgerTx <- submitTx tx
        awaitTxConfirmed $ txId ledgerTx
```

## Aiken (Alternative to Plutus)

```rust
// Aiken — Rust-like syntax, compiles to UPLC
validator {
    fn spend(datum: Datum, redeemer: Redeemer, ctx: ScriptContext) -> Bool {
        let info = ctx.transaction;
        let signed = info.extra_signatories
            |> list.has(datum.owner);

        let deadline_ok = info.validity_range.lower_bound
            |> time.after_or_equal(datum.deadline);

        signed && deadline_ok
    }
}
```

## OpShin (Python → UPLC)

```python
# Python smart contracts on Cardano via OpShin
@dataclass
class MyDatum(PlutusData):
    beneficiary: PubKeyHash
    deadline: POSIXTime

def validator(datum: MyDatum, redeemer: None, ctx: ScriptContext) -> bool:
    return ctx.tx.is_signed_by(datum.beneficiary)
```

## Key Differences from EVM

| Aspect | EVM (Solidity) | eUTxO (Plutus) |
|--------|---------------|----------------|
| State | Global contract storage | UTxO-local datum |
| Parallelism | Sequential per contract | Natural parallelism |
| Composability | Synchronous calls | Async outputs |
| Upgrade | Proxy patterns | New script version, migrate UTxO |
| Data availability | On-chain | On-chain (datum) |
| Off-chain code | Read-only | Full PAB (off-chain agents) |
