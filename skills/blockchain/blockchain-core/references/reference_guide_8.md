# Protocol Upgrades: Soft Forks, Hard Forks and Activation

How layer-1 protocols change their consensus rules safely: soft versus hard forks, activation mechanisms on Bitcoin and Ethereum, the specification process, and the release and operations playbook for client teams and node operators.

## Fork Types

| Type | Rule change | Old nodes | Example |
|------|-------------|-----------|---------|
| Soft fork | Tightens rules (valid set shrinks) | Still follow the chain; may accept blocks they cannot fully validate | SegWit (2017), Taproot (2021) |
| Hard fork | Loosens or changes rules | Reject new blocks; must upgrade or split | Ethereum network upgrades (London, Shanghai, Cancun, Prague) |
| Chain split | Contentious change with both sides continuing | Two networks | Ethereum/Ethereum Classic (2016), Bitcoin/Bitcoin Cash (2017) |

Soft forks are safe for non-upgraded nodes only if a majority of block producers enforce the new rules; otherwise old nodes can follow a chain the upgraded network rejects.

## Bitcoin Activation Mechanisms

| Mechanism | How it works | Notes |
|-----------|--------------|-------|
| Flag day | Rules activate at a fixed height/time | Simple; used for early upgrades |
| BIP9 version bits | Miners signal with a bit in `nVersion`; activates when a threshold of blocks in a 2016-block period signal before timeout | Miners could block activation by not signalling |
| BIP8 | Like BIP9 with an optional `lockinontimeout` forcing activation at timeout | Debated after SegWit |
| Speedy Trial | Short BIP9 window with height-based activation | Used for Taproot: locked in 2021, activated at block 709,632 |

Lifecycle of a version-bits deployment: `DEFINED → STARTED → LOCKED_IN → ACTIVE` (or `FAILED`). Inspect it with:

```bash
bitcoin-cli getdeploymentinfo
```

Soft-fork changes typically repurpose things old nodes treat as "anyone can spend" or no-op (e.g. new witness versions, `OP_NOP` opcodes), which is why old nodes stay in consensus.

## Ethereum Upgrade Process

1. **EIPs** describe changes (Core EIPs for consensus). Discussion in AllCoreDevs calls (execution and consensus).
2. **Scoping** into a named upgrade: execution-layer name (city) + consensus-layer name (star), combined names like Dencun (Deneb + Cancun), Pectra (Prague + Electra), Fusaka (Fulu + Osaka).
3. **Specs** updated: `ethereum/execution-specs`, `ethereum/consensus-specs`; tests generated (EEST, consensus spec tests).
4. **Devnets** for the upgrade, then **public testnets** fork (Sepolia, Hoodi).
5. **Mainnet** activation at a chosen timestamp / epoch; client releases ship weeks ahead.

Activation trigger:
- Before the Merge: block number.
- After the Merge: execution forks activate by **timestamp**; consensus forks by **epoch**, coordinated to the same moment.

Fork configuration lives in each client's chain config (genesis config / network presets); custom networks must set every fork time explicitly.

### Recent Ethereum upgrades
| Upgrade | Year | Headline changes |
|---------|------|------------------|
| Shanghai/Capella | 2023 | Staking withdrawals |
| Dencun | 2024 | EIP-4844 blob transactions |
| Pectra | 2025 | EIP-7702 EOA code delegation, EIP-7251 higher max effective balance, EIP-7002 EL-triggered exits, EIP-7623 calldata floor |
| Fusaka | 2025 | PeerDAS (EIP-7594) data availability sampling for blobs |

## Designing an Upgrade

| Question | Why |
|----------|-----|
| Can it be a soft fork? | Avoids forcing every node to upgrade at once |
| What breaks for existing users/contracts? | E.g. gas repricing breaks contracts with hard-coded gas stipends |
| Is there a replay or ambiguity risk across the fork boundary? | Transactions valid on both sides of a split need replay protection |
| How is activation observed by clients? | Height/timestamp/epoch must be unambiguous |
| How is it tested across all clients? | Shared vectors, devnets, shadow forks of mainnet state |

Shadow forks (forking a copy of mainnet state into a small test network) exercise upgrades against realistic state and traffic.

## Client Implementation Pattern

Gate every rule on fork activation, never on release version.

```go
type ChainConfig struct {
    CancunTime *uint64
    PragueTime *uint64
}

func (c *ChainConfig) IsPrague(timestamp uint64) bool {
    return c.PragueTime != nil && timestamp >= *c.PragueTime
}

func validateTxType(cfg *ChainConfig, header *Header, tx *Transaction) error {
    if tx.Type() == SetCodeTxType && !cfg.IsPrague(header.Time) {
        return fmt.Errorf("set-code tx %s before Prague at time %d", tx.Hash(), header.Time)
    }
    return nil
}
```

Keep pre-fork code paths: nodes must re-validate history from genesis using the rules in force at each height/time.

## Operator Playbook

| When | Action |
|------|--------|
| Release announced | Read release notes; confirm fork time; plan maintenance window |
| ≥ 1–2 weeks before | Upgrade testnet nodes first; then mainnet nodes (EL and CL together) |
| Before fork | Verify version via RPC (`web3_clientVersion`, CL `/eth/v1/node/version`, `bitcoin-cli getnetworkinfo`) |
| At fork | Watch head progression, peer count, finality, error logs |
| After fork | Confirm participation/finality recovered; check dependent services (indexers, signers) |
| Never | Run a pre-fork client after a hard fork (you will follow a dead chain) |

For validators, an outdated client after a hard fork means missed duties and inactivity penalties.

## Application Impact Checklist

- Gas cost changes: re-run gas estimates; remove hard-coded gas limits.
- New tx types: wallet/indexer decoders must handle them.
- Opcode/precompile changes: audit contracts that rely on old behaviour.
- RPC changes: new fields in blocks/receipts (e.g. blob gas fields, `requestsHash`).

## Checklist

- [ ] Fork type and activation mechanism explicit
- [ ] Rules gated by height/timestamp/epoch in code, old paths retained
- [ ] Cross-client vectors and devnet/shadow-fork testing done
- [ ] Operators upgraded both EL and CL before activation
- [ ] Downstream apps checked for gas, tx-type and RPC changes
