# Foundry Testing Reference

## Project Init

```bash
forge init my-project && cd my-project && forge build
```

## Test Verbosity

| Flag | Output |
|------|--------|
| `-vvv` | Stack traces for failures |
| `-vvvv` | + logs + setup |
| `-vvvvv` | + storage dumps |

```bash
forge test -vvvvv --match-path src/test/AMM.t.sol
```

## Cheatcode Reference Table

| Cheatcode | Signature | Purpose |
|-----------|-----------|---------|
| `vm.prank` | `(address)` | Set `msg.sender` for next call |
| `vm.startPrank`/`stopPrank` | `(address)` | Persistent sender override |
| `vm.deal` | `(address, uint256)` | Set ETH balance |
| `hoax` | `(address, uint256)` | `deal` + `startPrank` |
| `vm.expectRevert` | `(bytes)` | Assert next call reverts |
| `vm.expectEmit` | `(bool,bool,bool,bool)` | Assert event emission |
| `vm.roll` | `(uint256)` | Set block number |
| `vm.warp` | `(uint256)` | Set block timestamp |
| `vm.createFork` | `(string,uint256)` | Create a fork |
| `vm.selectFork` | `(uint256)` | Switch active fork |
| `vm.makePersistent` | `(address)` | Keep contract across forks |
| `vm.assume` | `(bool)` | Filter fuzz inputs |
| `vm.assumeNoRevert` | `()` | Skip reverting fuzz runs |
| `vm.ffi` | `(string[])` | Execute shell command |
| `vm.startBroadcast`/`stopBroadcast` | `(uint256)` | Sign & broadcast txs |

## Fuzz Testing

```solidity
function testSwapBounded(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public {
    vm.assume(amountIn > 0 && amountIn < 1e30);
    vm.assume(reserveIn > 0 && reserveIn < 1e30);
    vm.assume(reserveOut > 0 && reserveOut < 1e30);

    uint256 amountOut = amm.getAmountOut(amountIn, reserveIn, reserveOut);
    uint256 kBefore = reserveIn * reserveOut;
    uint256 kAfter = (reserveIn + amountIn) * (reserveOut - amountOut);

    assertGe(kAfter, kBefore);
    assertLt(amountOut, reserveOut);
    assertGt(amountOut, 0);
}
```

```solidity
function testWithdrawUnbounded(uint256 shares, uint256 totalSupply, uint256 totalAssets) public {
    vm.assume(shares <= totalSupply && totalSupply > 0 && totalAssets > 0);
    vm.assume(shares <= type(uint256).max / totalAssets);

    uint256 assets = vault.previewWithdraw(shares);
    assertApproxEqAbs(assets, (shares * totalAssets) / totalSupply, 1);
}
```

### Fuzz Config (`foundry.toml`)

```toml
[fuzz]
runs = 5000
max_test_rejects = 65536
seed = "0xdeadbeef"
dictionary_weight = 40
include_storage = true
include_push_bytes = true

[invariant]
runs = 256
depth = 128
fail_on_revert = false
call_override = false
```

## Gas Testing

```bash
# Generate snapshot
forge snapshot --match-path src/test/GasBench.t.sol --diff

# Compare against baseline
forge snapshot --snap .gas-snapshot-baseline
forge snapshot --diff .gas-snapshot-baseline
```

Gas snapshot output:
```
╭────────────────────────────┬─────────┬─────────┬──────────╮
│ Function                    │ Min     │ Avg     │ Median   │
├────────────────────────────┼─────────┼─────────┼──────────┤
│ swapExactTokensForTokens   │ 89234   │ 91245   │ 90782    │
│ addLiquidity               │ 124567  │ 128934  │ 127891   │
╰────────────────────────────┴─────────┴─────────┴──────────╯
```

Gas regression diff:
```
╭──────────────────────────────┬──────────┬──────────┬───────────────╮
│ src/AMM.sol:swap             │ +152     │ +0.17%   │ GAS INCREASE  │
│ src/Vault.sol:deposit        │ -234     │ -0.28%   │ gas decrease  │
╰──────────────────────────────┴──────────┴──────────┴───────────────╯
```

## AMM Math Fuzz Test

```solidity
contract AMMFuzzTest is Test {
    AMM public amm;
    uint256 public constant MAX_RESERVE = 1_000_000e18;
    uint256 public constant MIN_RESERVE = 1e6;

    function setUp() public {
        amm = new AMM(address(new ERC20Mock("A", "A", 18)), address(new ERC20Mock("B", "B", 18)));
        deal(address(amm.tokenA()), address(amm), 100_000e18);
        deal(address(amm.tokenB()), address(amm), 100_000e18);
    }

    function testFuzz_ConstantProductInvariant(
        uint256 amountIn, uint256 reserveIn, uint256 reserveOut
    ) public {
        vm.assume(amountIn > 0 && reserveIn > 0 && reserveOut > 0);
        vm.assume(amountIn < MAX_RESERVE && reserveIn < MAX_RESERVE && reserveOut < MAX_RESERVE);
        vm.assume(reserveIn >= MIN_RESERVE && reserveOut >= MIN_RESERVE);

        uint256 amountOut = amm.getAmountOut(amountIn, reserveIn, reserveOut);
        uint256 kBefore = reserveIn * reserveOut;
        uint256 kAfter = (reserveIn + amountIn) * (reserveOut - amountOut);
        assertGe(kAfter, kBefore);
        assertLt(amountOut, reserveOut);
    }
}
```

## Foundry Scripting (Deploy + Verify)

```solidity
// script/Deploy.s.sol
contract DeployScript is Script {
    function run() public {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);
        Token a = new Token("Token A", "TKA", 1e24);
        Token b = new Token("Token B", "TKB", 1e24);
        AMM amm = new AMM(address(a), address(b));
        vm.stopBroadcast();
        console2.log("TokenA:", address(a));
        console2.log("AMM:", address(amm));
    }
}
```

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url sepolia \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vvvv
```

## Coverage

```bash
forge coverage --report lcov --match-path src/test/*.t.sol
forge coverage --report summary
```

```
File                   | % Lines     | % Statements | % Branches    | % Funcs
AMM.sol                | 94.55%      | 96.30%       | 87.50%        | 100.00%
Token.sol              | 100.00%     | 100.00%      | 100.00%       | 100.00%
```

## FFI — External Tool Calling

```solidity
function testFFI() public {
    string[] memory args = new string[](3);
    args[0] = "python3"; args[1] = "-m"; args[2] = "slither";
    args[3] = "src/AMM.sol"; args[4] = "--print"; args[5] = "human-summary";
    bytes memory result = vm.ffi(args);
    assertFalse(strings.contains(string(result), "HIGH"));
}
```
