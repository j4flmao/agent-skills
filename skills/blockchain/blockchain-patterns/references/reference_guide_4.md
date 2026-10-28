# Multicall and Transaction Batching Patterns

Batching reduces round-trips for reads and lets users perform several actions atomically. This reference covers read aggregation with Multicall3, self-multicall in contracts, wallet-level batching (EIP-5792, EIP-7702, ERC-4337), and the security pitfalls of `delegatecall`-based batching.

## Read Batching with Multicall3

Multicall3 is deployed at `0xcA11bde05977b3631167028862bE2a173976CA11` on most EVM chains. It aggregates many `eth_call`s into one.

```solidity
struct Call3 { address target; bool allowFailure; bytes callData; }
struct Result { bool success; bytes returnData; }
function aggregate3(Call3[] calldata calls) external payable returns (Result[] memory);
```

viem uses it automatically:

```typescript
const results = await client.multicall({
  contracts: [
    { address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [user] },
    { address: WETH, abi: erc20Abi, functionName: 'balanceOf', args: [user] },
    { address: VAULT, abi: vaultAbi, functionName: 'totalAssets' },
  ],
  allowFailure: true,
});
// results[i] = { status: 'success', result } | { status: 'failure', error }
```

Also enable `batch: { multicall: true }` on the client to coalesce concurrent `readContract` calls.

Do not send state-changing transactions through Multicall3: `msg.sender` at the target becomes the Multicall3 contract, not the user.

## Self-Multicall in Your Contract

Lets a user call several functions of the same contract atomically, with `msg.sender` preserved.

```solidity
import {Multicall} from "@openzeppelin/contracts/utils/Multicall.sol";

contract Router is Multicall {
    function deposit(uint256 amount) external { /* ... uses msg.sender */ }
    function stake(uint256 shares) external { /* ... */ }
}

// client: router.multicall([encode(deposit, 100), encode(stake, 100)])
```

OZ `Multicall` uses `delegatecall` to `address(this)`. Hazards:
- `msg.value` is reused across every sub-call: a payable function called twice in one multicall sees the same `msg.value` each time. Never combine `Multicall` with payable functions that credit `msg.value`, or track consumed value explicitly.
- Combining with ERC-2771 meta-transactions previously caused address spoofing; OZ 5.x `Multicall` is context-aware (appends the sender suffix). Keep OZ updated if you use both.

## Wallet-Level Batching

| Mechanism | Who batches | Notes |
|-----------|-------------|-------|
| EIP-5792 `wallet_sendCalls` | Wallet RPC | App asks wallet to send a bundle; wallet decides how (4337, 7702, sequential) |
| EIP-7702 (Pectra) | EOA delegates code to a contract | EOA can execute batched calls via delegated implementation |
| ERC-4337 smart accounts | Account contract `executeBatch` | UserOperations via bundlers and EntryPoint |
| Safe `MultiSendCallOnly` | Safe transaction | Batched admin operations |

wagmi exposes EIP-5792 through `useSendCalls` and `useCallsStatus`; check `useCapabilities` to see if the wallet supports atomic batching before relying on it.

## Approve-and-Call Alternatives

The classic two-transaction "approve then deposit" can be collapsed with:
- EIP-2612 `permit` inside a router `multicall` (`selfPermit` + `deposit`).
- Permit2 signature transfers.
- Wallet batching (5792/7702/4337).

## Batching Admin Operations

For governance or multisig changes, batch configuration in one transaction so the protocol never sits in a half-configured state. With a `TimelockController`, use `scheduleBatch`/`executeBatch`.

## Gas and Failure Semantics

| Mode | Behavior |
|------|----------|
| Atomic (revert all on any failure) | Use for dependent steps (approve + swap) |
| Allow failure per call | Use for independent reads or best-effort claims |

Large batches can exceed the block gas limit; chunk them. On L2s, calldata/blob costs dominate; batching amortizes fixed per-transaction overhead.

## Security Pitfalls

- Arbitrary-call batchers (`target.call(data)` for user-supplied targets) holding token approvals: anyone can call `token.transferFrom(victim, attacker, ...)` through them. Never let a contract with user approvals execute arbitrary calls.
- `delegatecall` into user-supplied targets: full storage takeover.
- `msg.value` reuse in delegatecall multicall.
- Returning partial success without the client checking each result.

## Testing

```solidity
function test_MulticallDepositAndStake() public {
    bytes[] memory calls = new bytes[](2);
    calls[0] = abi.encodeCall(Router.deposit, (100e18));
    calls[1] = abi.encodeCall(Router.stake, (100e18));
    vm.prank(alice);
    router.multicall(calls);
    assertEq(router.staked(alice), 100e18);
}

function test_RevertWhen_PayableReusedInMulticall() public { /* assert design prevents double credit */ }
```

## Checklist

- [ ] Reads aggregated via Multicall3/viem batching
- [ ] No state-changing user actions through Multicall3
- [ ] Self-multicall not combined with value-crediting payable functions
- [ ] No arbitrary-call capability in contracts holding approvals
- [ ] Wallet capability detection before using atomic batches
- [ ] Batch sizes bounded under block gas limit
