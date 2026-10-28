# Events, Logs and Off-Chain Indexing Design

Smart contracts expose history to the outside world through event logs. This reference covers how to design events, how logs are encoded, and how dApps and indexers consume them reliably (including reorg handling).

## Event Anatomy

```solidity
event Deposit(address indexed caller, address indexed owner, uint256 assets, uint256 shares);

emit Deposit(msg.sender, receiver, assets, shares);
```

| Part | Content |
|------|---------|
| `topics[0]` | `keccak256("Deposit(address,address,uint256,uint256)")` (omitted for `anonymous` events) |
| `topics[1..3]` | Up to 3 `indexed` parameters (4 for anonymous events) |
| `data` | ABI-encoded non-indexed parameters |

Indexed dynamic types (`string`, `bytes`, arrays, structs) are stored as their keccak256 hash, so the original value cannot be recovered from the topic. Index addresses and IDs you filter on; keep human-readable strings non-indexed.

## Design Guidelines

- Emit an event for every state change an off-chain system needs, including admin actions (`RoleGranted`, `FeeUpdated(old, new)`, `Paused`).
- Include both old and new values for configuration changes.
- Use standard events where a standard exists (ERC-20 `Transfer`/`Approval`, ERC-721 `Transfer`, ERC-4626 `Deposit`/`Withdraw`); wallets and explorers rely on them.
- Emit after the state change in checks-effects-interactions order.
- Events are not readable by contracts; do not use them as on-chain state.

## Cost

Each log costs 375 gas base + 375 per topic + 8 gas per data byte, plus memory expansion. Cheaper than storage, which is why history should live in events.

## Reading Events with viem

```typescript
import { createPublicClient, http, parseAbiItem } from 'viem';
import { mainnet } from 'viem/chains';

const client = createPublicClient({ chain: mainnet, transport: http(process.env.RPC_URL) });

const logs = await client.getLogs({
  address: '0xVault',
  event: parseAbiItem('event Deposit(address indexed caller, address indexed owner, uint256 assets, uint256 shares)'),
  args: { owner: '0xUser' },
  fromBlock: 21_000_000n,
  toBlock: 21_010_000n,
});
for (const log of logs) console.log(log.args.assets, log.blockNumber, log.logIndex);
```

RPC providers cap `eth_getLogs` ranges and result counts; page by block range and back off on errors.

## Live Subscriptions

```typescript
const unwatch = client.watchContractEvent({
  address: '0xVault',
  abi: vaultAbi,
  eventName: 'Deposit',
  onLogs: (logs) => handle(logs),
});
```

Subscriptions can drop events on reconnect. Treat them as a latency optimization and backfill from the last processed block on startup.

## Reorgs and Finality

| Chain type | Practical finality signal |
|------------|---------------------------|
| Ethereum PoS | `finalized` block tag (about two epochs, ~13 minutes) |
| Optimistic rollups | L2 `safe`/`finalized` tags; withdrawal finality is longer (challenge period) |
| Other L1s | Chain-specific confirmation depth |

Indexer approach:
1. Store `(blockNumber, blockHash, logIndex, txHash)` per processed log.
2. On each new head, compare the stored hash of recent blocks with the chain; on mismatch, delete rows from the fork point and re-process.
3. Mark records as `pending` until the block is finalized, and only trigger irreversible actions (sending fiat, emails) after finality.
4. Use `(txHash, logIndex)` as an idempotency key.

## Indexing Options

| Option | Notes |
|--------|-------|
| The Graph subgraphs | Declarative mappings (AssemblyScript); hosted network or self-hosted graph-node |
| Ponder | TypeScript indexer, local dev friendly, Postgres output |
| Envio, Goldsky, SubQuery | Managed/hosted indexing services |
| Custom (viem/ethers + Postgres) | Full control; you own reorg handling |
| Dune / Flipside | SQL analytics on decoded data, not app backends |

## Subgraph Mapping Example

```yaml
# subgraph.yaml (excerpt)
eventHandlers:
  - event: Deposit(indexed address,indexed address,uint256,uint256)
    handler: handleDeposit
```

```typescript
// src/vault.ts
export function handleDeposit(event: DepositEvent): void {
  const id = event.transaction.hash.concatI32(event.logIndex.toI32());
  const d = new DepositEntity(id);
  d.owner = event.params.owner;
  d.assets = event.params.assets;
  d.blockNumber = event.block.number;
  d.save();
}
```

## Decoding Unknown Logs

```bash
cast logs --from-block 21000000 --to-block 21000100 --address 0xVault "Deposit(address,address,uint256,uint256)" --rpc-url mainnet
cast 4byte-event 0xdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d7
```

## Testing Events in Foundry

```solidity
vm.expectEmit(true, true, false, true, address(vault));
emit Vault.Deposit(address(this), alice, 100e18, 100e18);
vault.deposit(100e18, alice);
```

The booleans select which topics and data to compare; the final argument checks the emitter.

## Pitfalls

- Indexing strings and expecting to read them back.
- Missing events on admin functions, making governance changes invisible.
- Assuming websocket subscriptions are complete.
- Treating "latest" block data as final.
- Emitting events before the state change and then reverting in later logic (reverted logs vanish, but ordering confusion remains in traces).

## Checklist

- [ ] Every user-visible and admin state change emits an event
- [ ] Filterable fields indexed (max 3)
- [ ] Standard events used for standard interfaces
- [ ] Indexer stores block hash and handles reorgs
- [ ] Irreversible off-chain actions wait for finality
- [ ] Events covered by `vm.expectEmit` tests
