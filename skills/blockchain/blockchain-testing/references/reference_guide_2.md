# Mainnet Fork Testing

Fork tests run your contracts against real deployed state (tokens, AMMs, oracles, lending markets) by lazily fetching chain state from an RPC endpoint. They catch integration bugs that mocks hide: non-standard tokens, real liquidity and price impact, proxy upgrades and access control on external protocols. This reference covers Foundry and Hardhat fork setup, determinism, state manipulation and CI.

## Foundry Fork Setup

```toml
# foundry.toml
[rpc_endpoints]
mainnet = "${MAINNET_RPC_URL}"
arbitrum = "${ARBITRUM_RPC_URL}"
base = "${BASE_RPC_URL}"
```

```solidity
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {UniswapAdapter} from "src/UniswapAdapter.sol";

contract UniswapAdapterForkTest is Test {
    uint256 constant FORK_BLOCK = 21_000_000;          // pin for determinism
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    UniswapAdapter adapter;                              // your contract under test

    function setUp() public {
        vm.createSelectFork("mainnet", FORK_BLOCK);
        adapter = new UniswapAdapter(UNISWAP_V3_ROUTER);
    }

    function testFork_SwapExactInput() public {
        deal(USDC, address(this), 10_000e6);           // forge-std deal handles token storage slots
        IERC20(USDC).approve(address(adapter), 10_000e6);
        uint256 out = adapter.swapExactInput(USDC, WETH, 10_000e6, 0);
        assertGt(out, 0);
        assertEq(IERC20(WETH).balanceOf(address(this)), out);
    }
}
```

- Pin a block number. Unpinned forks use "latest", which changes results between runs and defeats RPC caching.
- Foundry caches fetched state per chain and block in `~/.foundry/cache/rpc/`; pinned blocks make reruns fast and offline-capable.
- Address constants must be checksummed in Solidity source.

## Multiple Forks

```solidity
uint256 mainnetFork = vm.createFork("mainnet", 21_000_000);
uint256 arbFork = vm.createFork("arbitrum", 270_000_000);

vm.selectFork(mainnetFork);   // subsequent calls hit L1 state
vm.selectFork(arbFork);       // subsequent calls hit Arbitrum state

vm.makePersistent(address(myContract));   // keep a contract's state across fork switches
```

Each fork has independent state; only persistent accounts carry over.

## Manipulating Fork State

| Need | Cheatcode / helper |
|------|--------------------|
| Give ERC-20 balance | `deal(token, to, amount)`; `deal(token, to, amount, true)` also adjusts `totalSupply` |
| Give ETH | `vm.deal(addr, amount)` |
| Act as a whale/admin | `vm.prank(addr)` / `vm.startPrank(addr)` |
| Move time / blocks | `vm.warp(ts)`, `vm.roll(n)`, or `vm.rollFork(blockNumber)` |
| Override storage | `vm.store(addr, slot, value)`; find slots with `stdstore` |
| Replace contract code | `vm.etch(addr, code)` |
| Mock an oracle answer | `vm.mockCall(feed, abi.encodeWithSelector(...), abi.encode(...))` |
| Replay a historic tx | `vm.transact(txHash)` |

`deal` works by finding the balance slot; it can fail for tokens with unusual storage (rebasing tokens such as stETH, or tokens with packed balances). In those cases prank a known holder and transfer.

## Testing Against Real Token Behaviour

Include tokens that break naive assumptions:

| Token type | Example behaviour to test |
|------------|---------------------------|
| No return value on `transfer` | USDT on mainnet; use `SafeERC20` |
| Fee-on-transfer | Received amount < sent amount |
| Rebasing | Balance changes without transfers (stETH) |
| Blocklists / pausable | USDC/USDT can block addresses |
| Non-18 decimals | USDC/USDT 6, WBTC 8 |
| Upgradeable proxies | Behaviour may change after an upgrade; pin blocks and re-test periodically |

## Oracles on Forks

- Chainlink feeds on a fork return the price at the pinned block; after `vm.warp` into the future, staleness checks (`updatedAt`) start failing. Either mock the feed or warp only small amounts.
- To test depeg or crash scenarios, `vm.mockCall` the aggregator's `latestRoundData`.

## Hardhat Forking

```ts
// hardhat.config.ts (Hardhat 3 network config uses type: "edr-simulated")
networks: {
  hardhatMainnet: {
    type: "edr-simulated",
    forking: { url: process.env.MAINNET_RPC_URL!, blockNumber: 21_000_000 },
  },
},
```

Use `hardhat_impersonateAccount`, `hardhat_setBalance`, `hardhat_setStorageAt` (or `@nomicfoundation/hardhat-network-helpers`: `impersonateAccount`, `setBalance`, `time.increase`) for state changes.

Anvil standalone: `anvil --fork-url $MAINNET_RPC_URL --fork-block-number 21000000` exposes the same fork to scripts, frontends and other languages.

## RPC Considerations

- Archive access is required for historical blocks beyond what the provider keeps; most hosted providers offer it.
- Rate limits: fork tests make many `eth_getStorageAt` calls; use a dedicated key for CI and rely on the cache.
- Never commit RPC URLs with API keys; read from environment variables or CI secrets.

## CI Strategy

```yaml
- name: Fork tests
  env:
    MAINNET_RPC_URL: ${{ secrets.MAINNET_RPC_URL }}
  run: forge test --match-path 'test/fork/*' -vvv
- uses: actions/cache@v4
  with:
    path: ~/.foundry/cache/rpc
    key: foundry-rpc-${{ hashFiles('test/fork/**') }}
```

- Separate fork tests from unit tests; run unit tests on every push and fork tests on PRs/nightly.
- Bump pinned blocks deliberately (e.g. monthly) to catch upstream upgrades.

## Pitfalls

| Pitfall | Fix |
|---------|-----|
| Unpinned fork block | Pin; update deliberately |
| `deal` silently wrong for rebasing tokens | Transfer from a real holder |
| Stale oracle after `vm.warp` | Mock the feed or warp less |
| Tests depend on a specific whale still holding funds | Use `deal` or pin a block where it does |
| Treating fork success as audit-level assurance | Fork tests complement, not replace, invariants and review |

## Checklist

- [ ] Fork block pinned and documented
- [ ] RPC URLs from env; CI caches Foundry RPC cache
- [ ] Non-standard tokens covered
- [ ] Oracle staleness and extreme prices tested
- [ ] Fork suite isolated from fast unit runs
