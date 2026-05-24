# Integration & E2E Testing Reference

## Mainnet Fork Testing

### Hardhat Fork Config

```typescript
networks: {
  hardhat: {
    forking: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
      blockNumber: 19_500_000,
      enabled: true,
    },
  },
}
```

Dynamic fork reset:
```typescript
await network.provider.request({
  method: "hardhat_reset",
  params: [{ forking: { jsonRpcUrl: `https://...`, blockNumber: 19_600_000 } }],
});
```

### Foundry Fork Test

```solidity
contract ForkTest is Test {
    uint256 fork;

    function setUp() public {
        fork = vm.createFork(vm.envString("MAINNET_RPC_URL"), 19_500_000);
    }

    function testUniswapSwapOnFork() public {
        vm.selectFork(fork);
        address whale = 0x...;
        vm.startPrank(whale);
        deal(whale, 100 ether);

        IUniswapV2Router02 router = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        address[] memory path = new address[](2);
        path[0] = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // WETH
        path[1] = 0x6B175474E89094C44Da98b954EedeAC495271d0F; // DAI

        uint256[] memory amounts = router.swapExactTokensForTokens(
            10 ether, 0, path, whale, block.timestamp + 60
        );
        assertGt(amounts[1], 0);
        vm.stopPrank();
    }
}
```

### Impersonating Accounts

```solidity
vm.startPrank(whale);
vm.deal(whale, 100 ether);
IERC20(token).transfer(address(this), 1_000_000e18);
vm.stopPrank();
```

```typescript
await impersonateAccount(WHALE);
await setBalance(WHALE, ethers.parseEther("100"));
const whale = await ethers.getSigner(WHALE);
```

---

## Anvil

```bash
anvil --fork-url $MAINNET_RPC_URL --fork-block-number 19500000 --port 8545
```

```bash
cast rpc anvil_impersonateAccount 0x...
cast rpc anvil_setBalance 0x... 0xDE0B6B3A7640000
cast rpc anvil_setStorageAt 0x... 0x0 0x...
cast rpc anvil_mine 10
```

---

## Cross-Chain Testing

### Foundry Multi-Chain Fork

```solidity
function testL1toL2Messaging() public {
    uint256 l1 = vm.createFork(L1_RPC_URL, 19_500_000);
    uint256 l2 = vm.createFork(L2_RPC_URL, 110_000_000);

    vm.selectFork(l1);
    vm.startPrank(l1Bridge);
    l1Bridge.depositETH{value: 10 ether}();
    vm.stopPrank();

    vm.makePersistent(address(l1Bridge));
    vm.makePersistent(address(l2Bridge));

    vm.selectFork(l2);
    assertEq(l2WETH.balanceOf(address(this)), 10 ether);
}
```

### Bridge Test

```solidity
function testTokenBridge() public {
    uint256 l1 = vm.createFork(L1_RPC_URL);
    uint256 l2 = vm.createFork(L2_RPC_URL);

    vm.selectFork(l1);
    token.approve(address(l1Bridge), 1000e18);
    l1Bridge.deposit(address(token), 1000e18);

    vm.selectFork(l2);
    vm.mockCall(address(l2Bridge), abi.encodeWithSelector(l2Bridge.mint.selector), abi.encode());
    l2Bridge.mint(address(this), 1000e18);
    assertEq(l2Token.balanceOf(address(this)), 1000e18);
}
```

---

## Tenderly

```typescript
const result = await tenderly.simulator.simulateTransaction({
  networkId: "1", from: "0x...", to: "0x...",
  input: "0x...", gas: 1000000, gasPrice: "20000000000",
});
console.log("Status:", result.transaction.status);
console.log("Gas used:", result.transaction.gasUsed);
if (result.transaction.errorMessage) {
  console.log("Stack trace:", result.transaction.stackTrace);
}
```

```bash
tenderly devnet create --project my-project --network mainnet --block-number 19500000
```

---

## External Protocol Integration

### Uniswap V3 Swap

```solidity
ISwapRouter router = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
uint256 amountOut = router.exactInputSingle(ISwapRouter.ExactInputSingleParams({
    tokenIn: WETH, tokenOut: USDC, fee: 3000, recipient: whale,
    deadline: block.timestamp + 60, amountIn: 10 ether,
    amountOutMinimum: 0, sqrtPriceLimitX96: 0
}));
```

### Aave Deposit / Borrow

```solidity
IPool aave = IPool(0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2);
aave.supply(WETH, 10 ether, whale, 0);
aave.borrow(DAI, 5000e18, 2, 0, whale);
assertEq(IERC20(DAI).balanceOf(whale), 5000e18);
```

### Chainlink Mock

```solidity
MockV3Aggregator mock = new MockV3Aggregator(8, 2000e8);
vm.store(address(protocol), bytes32(uint256(1)), bytes32(uint256(uint160(address(mock)))));
mock.updateAnswer(2500e8);
(, int256 price,,,) = protocol.priceFeed().latestRoundData();
assertEq(uint256(price), 2500e8);
```

### Flash Loan

```solidity
IERC3156FlashLender lender = IERC3156FlashLender(0x...);
uint256 fee = lender.flashFee(address(token), 1_000_000e18);
deal(address(this), fee);
token.approve(address(lender), fee);
lender.flashLoan(address(this), address(token), 1_000_000e18, abi.encode(address(this)));
```

---

## E2E Testing with Synpress

### Config

```typescript
export default defineConfig({
  baseUrl: "http://localhost:3000",
  specPattern: "tests/e2e/**/*.cy.ts",
  synpress: {
    wallet: "metamask",
    version: "10.28.0",
    defaultTestAccount: { privateKey: "0x...", balance: 100 },
  },
});
```

### E2E Test

```typescript
describe("Vault dApp", () => {
  before(() => {
    cy.visit("/");
    cy.contains("Connect Wallet").click();
    cy.acceptMetamaskAccess();
  });

  it("deposits ETH into vault", () => {
    cy.visit("/vault");
    cy.contains("Deposit").click();
    cy.get('[data-testid="deposit-input"]').type("1.5");
    cy.contains("Confirm Deposit").click();
    cy.confirmMetamaskTransaction();
    cy.contains("Deposit Successful").should("be.visible");
  });

  it("handles rejection", () => {
    cy.get('[data-testid="deposit-input"]').type("100");
    cy.contains("Confirm Deposit").click();
    cy.rejectMetamaskTransaction();
    cy.contains("Transaction Rejected").should("be.visible");
  });
});
```

### Playwright + Wallet Connect

```typescript
test("connects wallet and displays address", async ({ page }) => {
  await page.goto("/");
  await page.click("text=Connect Wallet");
  await page.click("text=MetaMask");
  await metamask.connect();
  await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();
});
```
